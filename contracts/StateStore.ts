/**
 * State Store Contract
 *
 * @purpose: Manages shared state for coordination between AI agents (Claude, Copilot)
 * @requirement: AI-COORDINATION-001
 * @updated: 2025-11-08
 *
 * This seam provides:
 * - Task queue management with priorities
 * - File lock coordination to prevent conflicts
 * - Shared context storage for agents
 */

/**
 * Task priority levels
 */
export enum TaskPriority {
  LOW = 0,
  MEDIUM = 1,
  HIGH = 2,
  URGENT = 3,
}

/**
 * Task status
 */
export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * A task in the coordination queue
 */
export interface Task {
  /** Unique task identifier */
  id: string

  /** Task description */
  description: string

  /** Task priority */
  priority: TaskPriority

  /** Current status */
  status: TaskStatus

  /** Agent assigned to this task */
  assignedAgent?: 'claude' | 'copilot' | 'user'

  /** When the task was created */
  createdAt: Date

  /** When the task was last updated */
  updatedAt: Date

  /** Task metadata */
  metadata?: Record<string, unknown>
}

/**
 * File lock information
 */
export interface FileLock {
  /** File path being locked */
  filePath: string

  /** Agent holding the lock */
  lockedBy: 'claude' | 'copilot' | 'user'

  /** When the lock was acquired */
  lockedAt: Date

  /** When the lock expires (optional) */
  expiresAt?: Date
}

/**
 * Shared context between agents
 */
export interface AgentContext {
  /** Context key */
  key: string

  /** Context value */
  value: unknown

  /** Agent that set this context */
  setBy: 'claude' | 'copilot' | 'user'

  /** When the context was set */
  timestamp: Date

  /** Whether this context is persistent */
  persistent: boolean
}

/**
 * State Store Contract
 *
 * Provides coordination primitives for multiple AI agents
 */
export interface IStateStore {
  /**
   * Add a task to the queue
   */
  enqueueTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task>

  /**
   * Get the next task from the queue (highest priority)
   * Returns undefined if queue is empty
   */
  dequeueTask(agent: 'claude' | 'copilot' | 'user'): Promise<Task | undefined>

  /**
   * Update task status
   */
  updateTaskStatus(taskId: string, status: TaskStatus): Promise<void>

  /**
   * Get all tasks
   */
  getAllTasks(): Promise<Task[]>

  /**
   * Get tasks by status
   */
  getTasksByStatus(status: TaskStatus): Promise<Task[]>

  /**
   * Acquire a file lock
   * Returns true if lock acquired, false if file is already locked
   */
  acquireFileLock(
    filePath: string,
    agent: 'claude' | 'copilot' | 'user',
    ttlMs?: number
  ): Promise<boolean>

  /**
   * Release a file lock
   * Returns true if lock released, false if no lock existed
   */
  releaseFileLock(filePath: string, agent: 'claude' | 'copilot' | 'user'): Promise<boolean>

  /**
   * Check if a file is locked
   */
  isFileLocked(filePath: string): Promise<boolean>

  /**
   * Get file lock information
   */
  getFileLock(filePath: string): Promise<FileLock | undefined>

  /**
   * Get all active file locks
   */
  getAllFileLocks(): Promise<FileLock[]>

  /**
   * Set context value
   */
  setContext(
    key: string,
    value: unknown,
    agent: 'claude' | 'copilot' | 'user',
    persistent?: boolean
  ): Promise<void>

  /**
   * Get context value
   */
  getContext(key: string): Promise<AgentContext | undefined>

  /**
   * Delete context
   */
  deleteContext(key: string): Promise<void>

  /**
   * Get all contexts
   */
  getAllContexts(): Promise<AgentContext[]>

  /**
   * Clear all non-persistent state
   */
  clearNonPersistentState(): Promise<void>
}
