/**
 * @fileoverview SQLite implementation of StateStore for persistent storage
 * @purpose Provides production-ready task queue, file locking, and context storage
 * @dataFlow Coordination Server → StateStore → SQLite Database
 * @boundary Implements StateStoreContract seam (Seam #3) with SQLite persistence
 * @example
 * const store = new StateStoreSQLite('./coordination.db')
 * await store.initialize()
 * const taskId = await store.enqueueTask(task)
 */

import sqlite3 from 'sqlite3'
import { v4 as uuidv4 } from 'uuid'
import type {
  StateStoreContract,
  Task,
  TaskId,
  TaskStatus,
  TaskResult,
  AgentCapability,
  AgentId,
  FileLock,
  LockToken,
  ConversationContext,
  ContextId,
  Message,
  SessionId,
  ServiceResponse
} from '@contracts'

/**
 * SQLite-backed implementation of StateStore
 * Thread-safe, persistent, suitable for production use
 */
export class StateStoreSQLite implements StateStoreContract {
  private db: sqlite3.Database | null = null
  private readonly dbPath: string
  private readonly LOCK_EXPIRY_MS = 5 * 60 * 1000 // 5 minutes
  private initialized = false

  constructor(dbPath: string = './coordination.db') {
    this.dbPath = dbPath
  }

  /**
   * Initialize database connection and create tables
   * Must be called before using any other methods
   */
  async initialize(): Promise<void> {
    if (this.initialized) return

    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          reject(new Error(`Failed to open database: ${err.message}`))
          return
        }

        // Create tables
        this.createTables()
          .then(() => {
            this.initialized = true
            console.log(`[StateStoreSQLite] Initialized with database: ${this.dbPath}`)
            resolve()
          })
          .catch(reject)
      })
    })
  }

  /**
   * Create database schema
   */
  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      this.db!.serialize(() => {
        // Tasks table
        this.db!.run(
          `CREATE TABLE IF NOT EXISTS tasks (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL,
            description TEXT NOT NULL,
            status TEXT NOT NULL,
            priority TEXT NOT NULL,
            context TEXT NOT NULL,
            result TEXT,
            session_id TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
          )`,
          (err) => {
            if (err) {
              reject(new Error(`Failed to create tasks table: ${err.message}`))
              return
            }
          }
        )

        // File locks table
        this.db!.run(
          `CREATE TABLE IF NOT EXISTS file_locks (
            path TEXT PRIMARY KEY,
            owner TEXT NOT NULL,
            lock_token TEXT UNIQUE NOT NULL,
            operation TEXT NOT NULL,
            acquired_at INTEGER NOT NULL,
            expires_at INTEGER NOT NULL
          )`,
          (err) => {
            if (err) {
              reject(new Error(`Failed to create file_locks table: ${err.message}`))
              return
            }
          }
        )

        // Contexts table
        this.db!.run(
          `CREATE TABLE IF NOT EXISTS contexts (
            id TEXT PRIMARY KEY,
            messages TEXT NOT NULL,
            shared_state TEXT NOT NULL,
            last_updated INTEGER NOT NULL
          )`,
          (err) => {
            if (err) {
              reject(new Error(`Failed to create contexts table: ${err.message}`))
            } else {
              resolve()
            }
          }
        )
      })
    })
  }

  /**
   * Helper: Run SQL query
   */
  private async run(sql: string, params: any[] = []): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      this.db!.run(sql, params, (err) => {
        if (err) reject(err)
        else resolve()
      })
    })
  }

  /**
   * Helper: Get single row
   */
  private async get<T>(sql: string, params: any[] = []): Promise<T | undefined> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      this.db!.get(sql, params, (err, row) => {
        if (err) reject(err)
        else resolve(row as T | undefined)
      })
    })
  }

  /**
   * Helper: Get multiple rows
   */
  private async all<T>(sql: string, params: any[] = []): Promise<T[]> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      this.db!.all(sql, params, (err, rows) => {
        if (err) reject(err)
        else resolve(rows as T[])
      })
    })
  }

  /**
   * Helper: Map capability to task types
   */
  private getTaskTypesForCapability(capability: AgentCapability): string[] {
    const mapping: Record<AgentCapability, string[]> = {
      'typescript-development': ['implement-feature', 'refactor-code', 'fix-bug'],
      'svelte-development': ['implement-feature', 'refactor-code'],
      'testing': ['write-tests'],
      'code-review': ['review-code'],
      'refactoring': ['refactor-code'],
      'documentation': ['update-docs'],
      'debugging': ['fix-bug'],
      'contract-definition': ['define-contract'],
      'mock-implementation': ['implement-mock']
    }
    return mapping[capability] || []
  }

  // ========== Task Queue Operations ==========

  async enqueueTask(task: Omit<Task, 'id'>): Promise<ServiceResponse<TaskId>> {
    try {
      const taskId = `task_${uuidv4()}` as TaskId
      const now = Date.now()

      await this.run(
        `INSERT INTO tasks (id, type, description, status, priority, context, result, session_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          taskId,
          task.type,
          task.description,
          task.status || 'queued',
          task.priority,
          JSON.stringify(task.context),
          task.result ? JSON.stringify(task.result) : null,
          task.sessionId,
          task.createdAt?.getTime() || now,
          task.updatedAt?.getTime() || now
        ]
      )

      return { success: true, data: taskId }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'ENQUEUE_ERROR',
          message: `Failed to enqueue task: ${error instanceof Error ? error.message : 'Unknown error'}`,
          retryable: true
        }
      }
    }
  }

  async dequeueTask(capabilities: AgentCapability[]): Promise<ServiceResponse<Task | null>> {
    try {
      // Build list of task types from capabilities
      const taskTypes = new Set<string>()
      for (const capability of capabilities) {
        const types = this.getTaskTypesForCapability(capability)
        types.forEach(type => taskTypes.add(type))
      }

      if (taskTypes.size === 0) {
        return { success: true, data: null }
      }

      // Find highest priority queued task
      const placeholders = Array.from(taskTypes).map(() => '?').join(',')
      const row = await this.get<any>(
        `SELECT * FROM tasks
         WHERE status = 'queued' AND type IN (${placeholders})
         ORDER BY
           CASE priority
             WHEN 'high' THEN 3
             WHEN 'medium' THEN 2
             WHEN 'low' THEN 1
           END DESC,
           created_at ASC
         LIMIT 1`,
        Array.from(taskTypes)
      )

      if (!row) {
        return { success: true, data: null }
      }

      // Parse task from row
      const task: Task = {
        id: row.id as TaskId,
        type: row.type,
        description: row.description,
        status: row.status as TaskStatus,
        priority: row.priority,
        context: JSON.parse(row.context),
        result: row.result ? JSON.parse(row.result) : undefined,
        sessionId: row.session_id as SessionId,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      }

      return { success: true, data: task }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DEQUEUE_ERROR',
          message: `Failed to dequeue task: ${error instanceof Error ? error.message : 'Unknown error'}`,
          retryable: true
        }
      }
    }
  }

  async getTask(taskId: TaskId): Promise<ServiceResponse<Task | null>> {
    try {
      const row = await this.get<any>(
        `SELECT * FROM tasks WHERE id = ?`,
        [taskId]
      )

      if (!row) {
        return { success: true, data: null }
      }

      const task: Task = {
        id: row.id as TaskId,
        type: row.type,
        description: row.description,
        status: row.status as TaskStatus,
        priority: row.priority,
        context: JSON.parse(row.context),
        result: row.result ? JSON.parse(row.result) : undefined,
        sessionId: row.session_id as SessionId,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      }

      return { success: true, data: task }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GET_TASK_ERROR',
          message: `Failed to get task: ${error instanceof Error ? error.message : 'Unknown error'}`,
          retryable: true
        }
      }
    }
  }

  async updateTaskStatus(taskId: TaskId, status: TaskStatus): Promise<ServiceResponse<void>> {
    try {
      await this.run(
        `UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?`,
        [status, Date.now(), taskId]
      )

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'UPDATE_TASK_ERROR',
          message: `Failed to update task status: ${error instanceof Error ? error.message : 'Unknown error'}`,
          retryable: true
        }
      }
    }
  }

  async updateTaskResult(taskId: TaskId, result: TaskResult): Promise<ServiceResponse<void>> {
    try {
      await this.run(
        `UPDATE tasks SET result = ?, status = ?, updated_at = ? WHERE id = ?`,
        [JSON.stringify(result), result.success ? 'completed' : 'failed', Date.now(), taskId]
      )

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'UPDATE_RESULT_ERROR',
          message: `Failed to update task result: ${error instanceof Error ? error.message : 'Unknown error'}`,
          retryable: true
        }
      }
    }
  }

  async getSessionTasks(sessionId: SessionId): Promise<ServiceResponse<Task[]>> {
    try {
      const rows = await this.all<any>(
        `SELECT * FROM tasks WHERE session_id = ? ORDER BY created_at ASC`,
        [sessionId]
      )

      const tasks: Task[] = rows.map(row => ({
        id: row.id as TaskId,
        type: row.type,
        description: row.description,
        status: row.status as TaskStatus,
        priority: row.priority,
        context: JSON.parse(row.context),
        result: row.result ? JSON.parse(row.result) : undefined,
        sessionId: row.session_id as SessionId,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      }))

      return { success: true, data: tasks }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GET_SESSION_TASKS_ERROR',
          message: `Failed to get session tasks: ${error instanceof Error ? error.message : 'Unknown error'}`,
          retryable: true
        }
      }
    }
  }

  // ========== File Lock Operations ==========

  async acquireLock(path: string, owner: AgentId): Promise<ServiceResponse<LockToken>> {
    try {
      // Clean up expired locks first
      await this.run(
        `DELETE FROM file_locks WHERE expires_at < ?`,
        [Date.now()]
      )

      // Check if file is already locked
      const existing = await this.get<any>(
        `SELECT * FROM file_locks WHERE path = ? AND expires_at > ?`,
        [path, Date.now()]
      )

      if (existing) {
        return {
          success: false,
          error: {
            code: 'FILE_ALREADY_LOCKED',
            message: `File ${path} is already locked by ${existing.owner}`,
            retryable: true,
            details: {
              lockedBy: existing.owner,
              expiresAt: new Date(existing.expires_at).toISOString()
            }
          }
        }
      }

      // Create new lock
      const lockToken = `lock_${uuidv4()}` as LockToken
      const now = Date.now()
      const expiresAt = now + this.LOCK_EXPIRY_MS

      await this.run(
        `INSERT OR REPLACE INTO file_locks (path, owner, lock_token, operation, acquired_at, expires_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [path, owner, lockToken, 'write', now, expiresAt]
      )

      return { success: true, data: lockToken }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'ACQUIRE_LOCK_ERROR',
          message: `Failed to acquire lock: ${error instanceof Error ? error.message : 'Unknown error'}`,
          retryable: true
        }
      }
    }
  }

  async releaseLock(lockToken: LockToken): Promise<ServiceResponse<void>> {
    try {
      await this.run(
        `DELETE FROM file_locks WHERE lock_token = ?`,
        [lockToken]
      )

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'RELEASE_LOCK_ERROR',
          message: `Failed to release lock: ${error instanceof Error ? error.message : 'Unknown error'}`,
          retryable: true
        }
      }
    }
  }

  async isLocked(path: string): Promise<ServiceResponse<FileLock | null>> {
    try {
      // Clean up expired locks first
      await this.run(
        `DELETE FROM file_locks WHERE expires_at < ?`,
        [Date.now()]
      )

      const row = await this.get<any>(
        `SELECT * FROM file_locks WHERE path = ?`,
        [path]
      )

      if (!row) {
        return { success: true, data: null }
      }

      const lock: FileLock = {
        path: row.path,
        owner: row.owner as AgentId,
        lockToken: row.lock_token as LockToken,
        operation: row.operation,
        acquiredAt: new Date(row.acquired_at),
        expiresAt: new Date(row.expires_at)
      }

      return { success: true, data: lock }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'IS_LOCKED_ERROR',
          message: `Failed to check lock: ${error instanceof Error ? error.message : 'Unknown error'}`,
          retryable: true
        }
      }
    }
  }

  async getAllLocks(): Promise<ServiceResponse<FileLock[]>> {
    try {
      // Clean up expired locks first
      await this.run(
        `DELETE FROM file_locks WHERE expires_at < ?`,
        [Date.now()]
      )

      const rows = await this.all<any>(
        `SELECT * FROM file_locks ORDER BY acquired_at ASC`
      )

      const locks: FileLock[] = rows.map(row => ({
        path: row.path,
        owner: row.owner as AgentId,
        lockToken: row.lock_token as LockToken,
        operation: row.operation,
        acquiredAt: new Date(row.acquired_at),
        expiresAt: new Date(row.expires_at)
      }))

      return { success: true, data: locks }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GET_ALL_LOCKS_ERROR',
          message: `Failed to get all locks: ${error instanceof Error ? error.message : 'Unknown error'}`,
          retryable: true
        }
      }
    }
  }

  async releaseAllLocksForAgent(owner: AgentId): Promise<ServiceResponse<number>> {
    try {
      const result = await new Promise<number>((resolve, reject) => {
        this.db!.run(
          `DELETE FROM file_locks WHERE owner = ?`,
          [owner],
          function(err) {
            if (err) reject(err)
            else resolve(this.changes)
          }
        )
      })

      return { success: true, data: result }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'RELEASE_ALL_LOCKS_ERROR',
          message: `Failed to release all locks: ${error instanceof Error ? error.message : 'Unknown error'}`,
          retryable: true
        }
      }
    }
  }

  // ========== Context Operations ==========

  async saveContext(contextId: ContextId, context: ConversationContext): Promise<ServiceResponse<void>> {
    try {
      await this.run(
        `INSERT OR REPLACE INTO contexts (id, messages, shared_state, last_updated)
         VALUES (?, ?, ?, ?)`,
        [
          contextId,
          JSON.stringify(context.messages),
          JSON.stringify(context.sharedState),
          Date.now()
        ]
      )

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CONTEXT_SAVE_ERROR',
          message: `Failed to save context: ${error instanceof Error ? error.message : 'Unknown error'}`,
          retryable: true
        }
      }
    }
  }

  async loadContext(contextId: ContextId): Promise<ServiceResponse<ConversationContext | null>> {
    try {
      const row = await this.get<any>(
        `SELECT * FROM contexts WHERE id = ?`,
        [contextId]
      )

      if (!row) {
        return { success: true, data: null }
      }

      const context: ConversationContext = {
        id: contextId,
        messages: JSON.parse(row.messages),
        sharedState: JSON.parse(row.shared_state),
        lastUpdated: new Date(row.last_updated)
      }

      return { success: true, data: context }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CONTEXT_LOAD_ERROR',
          message: `Failed to load context: ${error instanceof Error ? error.message : 'Unknown error'}`,
          retryable: true
        }
      }
    }
  }

  async appendMessage(contextId: ContextId, message: Message): Promise<ServiceResponse<void>> {
    try {
      // Load existing context
      const contextResult = await this.loadContext(contextId)
      if (!contextResult.success) {
        return {
          success: false,
          error: contextResult.error!
        }
      }

      if (!contextResult.data) {
        return {
          success: false,
          error: {
            code: 'CONTEXT_NOT_FOUND',
            message: `Context ${contextId} not found`,
            retryable: false
          }
        }
      }

      // Append message
      const updatedContext = {
        ...contextResult.data,
        messages: [...contextResult.data.messages, message],
        lastUpdated: new Date()
      }

      return await this.saveContext(contextId, updatedContext)
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'APPEND_MESSAGE_ERROR',
          message: `Failed to append message: ${error instanceof Error ? error.message : 'Unknown error'}`,
          retryable: true
        }
      }
    }
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    if (!this.db) return

    return new Promise((resolve, reject) => {
      this.db!.close((err) => {
        if (err) {
          reject(new Error(`Failed to close database: ${err.message}`))
        } else {
          this.initialized = false
          console.log('[StateStoreSQLite] Database closed')
          resolve()
        }
      })
    })
  }

  /**
   * Reset database (delete all data) - for testing
   */
  async reset(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    await this.run(`DELETE FROM tasks`)
    await this.run(`DELETE FROM file_locks`)
    await this.run(`DELETE FROM contexts`)

    console.log('[StateStoreSQLite] Database reset')
  }
}
