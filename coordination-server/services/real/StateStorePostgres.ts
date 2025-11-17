/**
 * @fileoverview PostgreSQL implementation of StateStore for distributed persistence
 * @purpose Provides production-ready task queue, file locking, and context storage with PostgreSQL
 * @dataFlow Coordination Server → StateStore → PostgreSQL Database
 * @boundary Implements StateStoreContract seam (Seam #3) with PostgreSQL persistence
 * @example
 * const store = new StateStorePostgres('postgresql://user:pass@localhost:5432/coordination')
 * await store.initialize()
 * const taskId = await store.enqueueTask(task)
 */

import { Pool, PoolClient, PoolConfig } from 'pg'
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
 * PostgreSQL-backed implementation of StateStore
 * Thread-safe, distributed, suitable for production use at scale
 */
export class StateStorePostgres implements StateStoreContract {
  private pool: Pool | null = null
  private readonly connectionString: string
  private readonly poolConfig?: PoolConfig
  private readonly LOCK_EXPIRY_MS = 5 * 60 * 1000 // 5 minutes
  private initialized = false

  constructor(connectionString: string, poolConfig?: PoolConfig) {
    this.connectionString = connectionString
    this.poolConfig = poolConfig
  }

  /**
   * Initialize database connection pool and create tables
   * Must be called before using any other methods
   */
  async initialize(): Promise<void> {
    if (this.initialized) return

    // Create connection pool
    this.pool = new Pool({
      connectionString: this.connectionString,
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      ...this.poolConfig
    })

    // Test connection
    try {
      const client = await this.pool.connect()
      console.log('[StateStorePostgres] Database connection established')
      client.release()
    } catch (error) {
      throw new Error(`Failed to connect to database: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    // Create tables and indexes
    await this.createTables()
    this.initialized = true
    console.log('[StateStorePostgres] Initialized successfully')
  }

  /**
   * Create database schema with optimizations
   */
  private async createTables(): Promise<void> {
    if (!this.pool) throw new Error('Database not initialized')

    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')

      // Tasks table
      await client.query(`
        CREATE TABLE IF NOT EXISTS tasks (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          description TEXT NOT NULL,
          status TEXT NOT NULL,
          priority TEXT NOT NULL,
          context JSONB NOT NULL,
          result JSONB,
          session_id TEXT NOT NULL,
          created_at BIGINT NOT NULL,
          updated_at BIGINT NOT NULL
        )
      `)

      // Create indexes on tasks table for frequently queried fields
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)
      `)
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority)
      `)
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_tasks_type ON tasks(type)
      `)
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_tasks_session_id ON tasks(session_id)
      `)
      // Composite index for dequeue optimization
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_tasks_status_type ON tasks(status, type)
      `)

      // File locks table
      await client.query(`
        CREATE TABLE IF NOT EXISTS file_locks (
          path TEXT PRIMARY KEY,
          owner TEXT NOT NULL,
          lock_token TEXT UNIQUE NOT NULL,
          operation TEXT NOT NULL,
          acquired_at BIGINT NOT NULL,
          expires_at BIGINT NOT NULL
        )
      `)

      // Create indexes on file_locks table
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_file_locks_owner ON file_locks(owner)
      `)
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_file_locks_expires_at ON file_locks(expires_at)
      `)

      // Contexts table
      await client.query(`
        CREATE TABLE IF NOT EXISTS contexts (
          id TEXT PRIMARY KEY,
          messages JSONB NOT NULL,
          shared_state JSONB NOT NULL,
          last_updated BIGINT NOT NULL
        )
      `)

      // Create index on contexts table
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_contexts_last_updated ON contexts(last_updated)
      `)

      await client.query('COMMIT')
      console.log('[StateStorePostgres] Schema created successfully')
    } catch (error) {
      await client.query('ROLLBACK')
      throw new Error(`Failed to create schema: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      client.release()
    }
  }

  /**
   * Helper: Execute query in a transaction
   * Ensures atomicity - either all operations succeed or all are rolled back
   */
  private async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    if (!this.pool) throw new Error('Database not initialized')

    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')
      const result = await callback(client)
      await client.query('COMMIT')
      return result
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
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

      if (!this.pool) throw new Error('Database not initialized')

      await this.pool.query(
        `INSERT INTO tasks (id, type, description, status, priority, context, result, session_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
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
      if (!this.pool) throw new Error('Database not initialized')

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
      const result = await this.pool.query(
        `SELECT * FROM tasks
         WHERE status = 'queued' AND type = ANY($1::text[])
         ORDER BY
           CASE priority
             WHEN 'high' THEN 3
             WHEN 'medium' THEN 2
             WHEN 'low' THEN 1
           END DESC,
           created_at ASC
         LIMIT 1`,
        [Array.from(taskTypes)]
      )

      if (result.rows.length === 0) {
        return { success: true, data: null }
      }

      const row = result.rows[0]
      const task: Task = {
        id: row.id as TaskId,
        type: row.type,
        description: row.description,
        status: row.status as TaskStatus,
        priority: row.priority,
        context: typeof row.context === 'string' ? JSON.parse(row.context) : row.context,
        result: row.result ? (typeof row.result === 'string' ? JSON.parse(row.result) : row.result) : undefined,
        sessionId: row.session_id as SessionId,
        createdAt: new Date(parseInt(row.created_at)),
        updatedAt: new Date(parseInt(row.updated_at))
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
      if (!this.pool) throw new Error('Database not initialized')

      const result = await this.pool.query(
        `SELECT * FROM tasks WHERE id = $1`,
        [taskId]
      )

      if (result.rows.length === 0) {
        return { success: true, data: null }
      }

      const row = result.rows[0]
      const task: Task = {
        id: row.id as TaskId,
        type: row.type,
        description: row.description,
        status: row.status as TaskStatus,
        priority: row.priority,
        context: typeof row.context === 'string' ? JSON.parse(row.context) : row.context,
        result: row.result ? (typeof row.result === 'string' ? JSON.parse(row.result) : row.result) : undefined,
        sessionId: row.session_id as SessionId,
        createdAt: new Date(parseInt(row.created_at)),
        updatedAt: new Date(parseInt(row.updated_at))
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
      if (!this.pool) throw new Error('Database not initialized')

      await this.pool.query(
        `UPDATE tasks SET status = $1, updated_at = $2 WHERE id = $3`,
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
      if (!this.pool) throw new Error('Database not initialized')

      await this.pool.query(
        `UPDATE tasks SET result = $1, status = $2, updated_at = $3 WHERE id = $4`,
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
      if (!this.pool) throw new Error('Database not initialized')

      const result = await this.pool.query(
        `SELECT * FROM tasks WHERE session_id = $1 ORDER BY created_at ASC`,
        [sessionId]
      )

      const tasks: Task[] = result.rows.map(row => ({
        id: row.id as TaskId,
        type: row.type,
        description: row.description,
        status: row.status as TaskStatus,
        priority: row.priority,
        context: typeof row.context === 'string' ? JSON.parse(row.context) : row.context,
        result: row.result ? (typeof row.result === 'string' ? JSON.parse(row.result) : row.result) : undefined,
        sessionId: row.session_id as SessionId,
        createdAt: new Date(parseInt(row.created_at)),
        updatedAt: new Date(parseInt(row.updated_at))
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
      if (!this.pool) throw new Error('Database not initialized')

      return await this.transaction(async (client) => {
        // Clean up expired locks first
        await client.query(
          `DELETE FROM file_locks WHERE expires_at < $1`,
          [Date.now()]
        )

        // Check if file is already locked
        const existing = await client.query(
          `SELECT * FROM file_locks WHERE path = $1 AND expires_at > $2`,
          [path, Date.now()]
        )

        if (existing.rows.length > 0) {
          const row = existing.rows[0]
          return {
            success: false,
            error: {
              code: 'FILE_ALREADY_LOCKED',
              message: `File ${path} is already locked by ${row.owner}`,
              retryable: true,
              details: {
                lockedBy: row.owner,
                expiresAt: new Date(parseInt(row.expires_at)).toISOString()
              }
            }
          }
        }

        // Create new lock
        const lockToken = `lock_${uuidv4()}` as LockToken
        const now = Date.now()
        const expiresAt = now + this.LOCK_EXPIRY_MS

        await client.query(
          `INSERT INTO file_locks (path, owner, lock_token, operation, acquired_at, expires_at)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (path) DO UPDATE SET
             owner = EXCLUDED.owner,
             lock_token = EXCLUDED.lock_token,
             operation = EXCLUDED.operation,
             acquired_at = EXCLUDED.acquired_at,
             expires_at = EXCLUDED.expires_at`,
          [path, owner, lockToken, 'write', now, expiresAt]
        )

        return { success: true, data: lockToken }
      })
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
      if (!this.pool) throw new Error('Database not initialized')

      await this.pool.query(
        `DELETE FROM file_locks WHERE lock_token = $1`,
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
      if (!this.pool) throw new Error('Database not initialized')

      // Clean up expired locks first
      await this.pool.query(
        `DELETE FROM file_locks WHERE expires_at < $1`,
        [Date.now()]
      )

      const result = await this.pool.query(
        `SELECT * FROM file_locks WHERE path = $1`,
        [path]
      )

      if (result.rows.length === 0) {
        return { success: true, data: null }
      }

      const row = result.rows[0]
      const lock: FileLock = {
        path: row.path,
        owner: row.owner as AgentId,
        lockToken: row.lock_token as LockToken,
        operation: row.operation,
        acquiredAt: new Date(parseInt(row.acquired_at)),
        expiresAt: new Date(parseInt(row.expires_at))
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
      if (!this.pool) throw new Error('Database not initialized')

      // Clean up expired locks first
      await this.pool.query(
        `DELETE FROM file_locks WHERE expires_at < $1`,
        [Date.now()]
      )

      const result = await this.pool.query(
        `SELECT * FROM file_locks ORDER BY acquired_at ASC`
      )

      const locks: FileLock[] = result.rows.map(row => ({
        path: row.path,
        owner: row.owner as AgentId,
        lockToken: row.lock_token as LockToken,
        operation: row.operation,
        acquiredAt: new Date(parseInt(row.acquired_at)),
        expiresAt: new Date(parseInt(row.expires_at))
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
      if (!this.pool) throw new Error('Database not initialized')

      const result = await this.pool.query(
        `DELETE FROM file_locks WHERE owner = $1`,
        [owner]
      )

      return { success: true, data: result.rowCount || 0 }
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
      if (!this.pool) throw new Error('Database not initialized')

      await this.pool.query(
        `INSERT INTO contexts (id, messages, shared_state, last_updated)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO UPDATE SET
           messages = EXCLUDED.messages,
           shared_state = EXCLUDED.shared_state,
           last_updated = EXCLUDED.last_updated`,
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
      if (!this.pool) throw new Error('Database not initialized')

      const result = await this.pool.query(
        `SELECT * FROM contexts WHERE id = $1`,
        [contextId]
      )

      if (result.rows.length === 0) {
        return { success: true, data: null }
      }

      const row = result.rows[0]
      const context: ConversationContext = {
        id: contextId,
        messages: typeof row.messages === 'string' ? JSON.parse(row.messages) : row.messages,
        sharedState: typeof row.shared_state === 'string' ? JSON.parse(row.shared_state) : row.shared_state,
        lastUpdated: new Date(parseInt(row.last_updated))
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
      if (!this.pool) throw new Error('Database not initialized')

      return await this.transaction(async (client) => {
        // Load existing context
        const result = await client.query(
          `SELECT * FROM contexts WHERE id = $1`,
          [contextId]
        )

        if (result.rows.length === 0) {
          return {
            success: false,
            error: {
              code: 'CONTEXT_NOT_FOUND',
              message: `Context ${contextId} not found`,
              retryable: false
            }
          }
        }

        const row = result.rows[0]
        const messages = typeof row.messages === 'string' ? JSON.parse(row.messages) : row.messages

        // Append message
        messages.push(message)

        // Update context
        await client.query(
          `UPDATE contexts SET messages = $1, last_updated = $2 WHERE id = $3`,
          [JSON.stringify(messages), Date.now(), contextId]
        )

        return { success: true }
      })
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
   * Close database connection pool
   */
  async close(): Promise<void> {
    if (!this.pool) return

    await this.pool.end()
    this.initialized = false
    console.log('[StateStorePostgres] Connection pool closed')
  }

  /**
   * Reset database (delete all data) - for testing
   */
  async reset(): Promise<void> {
    if (!this.pool) throw new Error('Database not initialized')

    await this.pool.query(`DELETE FROM tasks`)
    await this.pool.query(`DELETE FROM file_locks`)
    await this.pool.query(`DELETE FROM contexts`)

    console.log('[StateStorePostgres] Database reset')
  }
}
