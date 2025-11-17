/**
 * @fileoverview Mock implementation of StateStore for in-memory persistence
 * @purpose Provides realistic task queue, file locking, and context storage for testing
 * @dataFlow Coordination Server → StateStore → In-memory Maps
 * @boundary Implements StateStoreContract seam (Seam #3)
 * @example
 * const store = new StateStoreMock()
 * const taskId = await store.enqueueTask(task)
 * const task = await store.dequeueTask(['typescript-development'])
 */

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
 * In-memory mock implementation of StateStore
 * Simulates realistic persistence with delays and error cases
 */
export class StateStoreMock implements StateStoreContract {
  // In-memory storage
  private tasks: Map<TaskId, Task> = new Map()
  private fileLocks: Map<string, FileLock> = new Map()
  private lockTokens: Map<LockToken, FileLock> = new Map()
  private contexts: Map<ContextId, ConversationContext> = new Map()

  // Configuration
  private readonly LOCK_EXPIRY_MS = 5 * 60 * 1000 // 5 minutes
  private readonly SIMULATED_DELAY_MS = 50 // Simulate DB latency

  /**
   * Simulates database operation delay
   */
  private async simulateDelay(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, this.SIMULATED_DELAY_MS))
  }

  /**
   * Generates a new TaskId
   */
  private generateTaskId(): TaskId {
    return `task_${uuidv4()}` as TaskId
  }

  /**
   * Generates a new LockToken
   */
  private generateLockToken(): LockToken {
    return `lock_${uuidv4()}` as LockToken
  }

  // ========== Task Queue Operations ==========

  async enqueueTask(task: Omit<Task, 'id'>): Promise<ServiceResponse<TaskId>> {
    await this.simulateDelay()

    try {
      const taskId = this.generateTaskId()
      const fullTask: Task = {
        ...task,
        id: taskId,
        status: task.status || 'queued',
        createdAt: task.createdAt || new Date(),
        updatedAt: task.updatedAt || new Date()
      }

      this.tasks.set(taskId, fullTask)

      return {
        success: true,
        data: taskId
      }
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
    await this.simulateDelay()

    try {
      // Find highest priority unclaimed task matching capabilities
      let bestTask: Task | null = null
      let bestPriority = -1

      const priorityMap = { low: 1, medium: 2, high: 3 }

      for (const task of this.tasks.values()) {
        if (task.status !== 'queued') continue

        // Check if task type maps to required capabilities
        const requiredCapabilities = this.getRequiredCapabilities(task.type)
        const hasCapability = requiredCapabilities.some(cap => capabilities.includes(cap))

        if (!hasCapability) continue

        const taskPriority = priorityMap[task.priority]
        if (taskPriority > bestPriority) {
          bestPriority = taskPriority
          bestTask = task
        }
      }

      return {
        success: true,
        data: bestTask
      }
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
    await this.simulateDelay()

    const task = this.tasks.get(taskId)
    return {
      success: true,
      data: task || null
    }
  }

  async updateTaskStatus(taskId: TaskId, status: TaskStatus): Promise<ServiceResponse<void>> {
    await this.simulateDelay()

    const task = this.tasks.get(taskId)
    if (!task) {
      return {
        success: false,
        error: {
          code: 'TASK_NOT_FOUND',
          message: `Task ${taskId} not found`,
          retryable: false
        }
      }
    }

    task.status = status
    task.updatedAt = new Date()
    this.tasks.set(taskId, task)

    return { success: true }
  }

  async updateTaskResult(taskId: TaskId, result: TaskResult): Promise<ServiceResponse<void>> {
    await this.simulateDelay()

    const task = this.tasks.get(taskId)
    if (!task) {
      return {
        success: false,
        error: {
          code: 'TASK_NOT_FOUND',
          message: `Task ${taskId} not found`,
          retryable: false
        }
      }
    }

    task.result = result
    task.status = result.success ? 'completed' : 'failed'
    task.updatedAt = new Date()
    this.tasks.set(taskId, task)

    return { success: true }
  }

  async getSessionTasks(sessionId: SessionId): Promise<ServiceResponse<Task[]>> {
    await this.simulateDelay()

    const sessionTasks: Task[] = []
    for (const task of this.tasks.values()) {
      if (task.sessionId === sessionId) {
        sessionTasks.push(task)
      }
    }

    // Sort by creation time
    sessionTasks.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())

    return {
      success: true,
      data: sessionTasks
    }
  }

  // ========== File Lock Operations ==========

  async acquireLock(path: string, owner: AgentId): Promise<ServiceResponse<LockToken>> {
    await this.simulateDelay()

    // Check if file is already locked
    const existingLock = this.fileLocks.get(path)
    if (existingLock && this.isLockValid(existingLock)) {
      return {
        success: false,
        error: {
          code: 'FILE_ALREADY_LOCKED',
          message: `File ${path} is already locked by ${existingLock.owner}`,
          retryable: true,
          details: {
            lockedBy: existingLock.owner,
            expiresAt: existingLock.expiresAt.toISOString()
          }
        }
      }
    }

    // Remove expired lock if exists
    if (existingLock && !this.isLockValid(existingLock)) {
      this.fileLocks.delete(path)
      this.lockTokens.delete(existingLock.lockToken)
    }

    // Create new lock
    const lockToken = this.generateLockToken()
    const lock: FileLock = {
      path,
      owner,
      lockToken,
      acquiredAt: new Date(),
      expiresAt: new Date(Date.now() + this.LOCK_EXPIRY_MS),
      operation: 'write' // Default to write for simplicity
    }

    this.fileLocks.set(path, lock)
    this.lockTokens.set(lockToken, lock)

    return {
      success: true,
      data: lockToken
    }
  }

  async releaseLock(lockToken: LockToken): Promise<ServiceResponse<void>> {
    await this.simulateDelay()

    const lock = this.lockTokens.get(lockToken)
    if (!lock) {
      return {
        success: false,
        error: {
          code: 'LOCK_NOT_FOUND',
          message: `Lock token ${lockToken} not found`,
          retryable: false
        }
      }
    }

    this.fileLocks.delete(lock.path)
    this.lockTokens.delete(lockToken)

    return { success: true }
  }

  async isLocked(path: string): Promise<ServiceResponse<FileLock | null>> {
    await this.simulateDelay()

    const lock = this.fileLocks.get(path)

    // Check if lock is still valid
    if (lock && !this.isLockValid(lock)) {
      // Clean up expired lock
      this.fileLocks.delete(path)
      this.lockTokens.delete(lock.lockToken)
      return {
        success: true,
        data: null
      }
    }

    return {
      success: true,
      data: lock || null
    }
  }

  async getAllLocks(): Promise<ServiceResponse<FileLock[]>> {
    await this.simulateDelay()

    const validLocks: FileLock[] = []
    const expiredPaths: string[] = []

    // Filter out expired locks
    for (const [path, lock] of this.fileLocks.entries()) {
      if (this.isLockValid(lock)) {
        validLocks.push(lock)
      } else {
        expiredPaths.push(path)
      }
    }

    // Clean up expired locks
    for (const path of expiredPaths) {
      const lock = this.fileLocks.get(path)
      if (lock) {
        this.fileLocks.delete(path)
        this.lockTokens.delete(lock.lockToken)
      }
    }

    return {
      success: true,
      data: validLocks
    }
  }

  async releaseAllLocksForAgent(owner: AgentId): Promise<ServiceResponse<number>> {
    await this.simulateDelay()

    let releasedCount = 0
    const toDelete: string[] = []

    for (const [path, lock] of this.fileLocks.entries()) {
      if (lock.owner === owner) {
        toDelete.push(path)
        this.lockTokens.delete(lock.lockToken)
        releasedCount++
      }
    }

    for (const path of toDelete) {
      this.fileLocks.delete(path)
    }

    return {
      success: true,
      data: releasedCount
    }
  }

  // ========== Context Operations ==========

  async saveContext(contextId: ContextId, context: ConversationContext): Promise<ServiceResponse<void>> {
    await this.simulateDelay()

    try {
      this.contexts.set(contextId, {
        ...context,
        lastUpdated: new Date()
      })

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
    await this.simulateDelay()

    const context = this.contexts.get(contextId)
    return {
      success: true,
      data: context || null
    }
  }

  async appendMessage(contextId: ContextId, message: Message): Promise<ServiceResponse<void>> {
    await this.simulateDelay()

    const context = this.contexts.get(contextId)
    if (!context) {
      return {
        success: false,
        error: {
          code: 'CONTEXT_NOT_FOUND',
          message: `Context ${contextId} not found`,
          retryable: false
        }
      }
    }

    context.messages.push(message)
    context.lastUpdated = new Date()
    this.contexts.set(contextId, context)

    return { success: true }
  }

  // ========== Helper Methods ==========

  /**
   * Checks if a lock is still valid (not expired)
   */
  private isLockValid(lock: FileLock): boolean {
    return lock.expiresAt.getTime() > Date.now()
  }

  /**
   * Maps task types to required agent capabilities
   */
  private getRequiredCapabilities(taskType: string): AgentCapability[] {
    const capabilityMap: Record<string, AgentCapability[]> = {
      'implement-feature': ['typescript-development', 'svelte-development'],
      'write-tests': ['testing'],
      'refactor-code': ['refactoring', 'typescript-development'],
      'fix-bug': ['debugging', 'typescript-development'],
      'review-code': ['code-review'],
      'update-docs': ['documentation'],
      'define-contract': ['contract-definition'],
      'implement-mock': ['mock-implementation', 'typescript-development']
    }

    return capabilityMap[taskType] || ['typescript-development']
  }

  // ========== Testing Helpers ==========

  /**
   * Clears all data (for testing)
   */
  async reset(): Promise<void> {
    this.tasks.clear()
    this.fileLocks.clear()
    this.lockTokens.clear()
    this.contexts.clear()
  }

  /**
   * Seeds with test data (for testing)
   */
  async seed(data: {
    tasks?: Task[],
    contexts?: Array<[ContextId, ConversationContext]>
  }): Promise<void> {
    if (data.tasks) {
      for (const task of data.tasks) {
        this.tasks.set(task.id, task)
      }
    }

    if (data.contexts) {
      for (const [id, context] of data.contexts) {
        this.contexts.set(id, context)
      }
    }
  }
}