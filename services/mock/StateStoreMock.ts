/**
 * State Store Mock Implementation
 * 
 * Mock implementation of IStateStore for testing and development
 */

import type {
  IStateStore,
  Task,
  FileLock,
  AgentContext
} from '../../contracts'

import { TaskStatus } from '../../contracts'

export class StateStoreMock implements IStateStore {
  private tasks: Task[] = []
  private fileLocks: Map<string, FileLock> = new Map()
  private contexts: Map<string, AgentContext> = new Map()
  private taskIdCounter = 1

  async enqueueTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    const now = new Date()
    const newTask: Task = {
      ...task,
      id: `task-${this.taskIdCounter++}`,
      createdAt: now,
      updatedAt: now
    }
    this.tasks.push(newTask)
    return newTask
  }

  async dequeueTask(agent: 'claude' | 'copilot' | 'user'): Promise<Task | undefined> {
    // Find highest priority pending task
    const pendingTasks = this.tasks
      .filter(t => t.status === TaskStatus.PENDING)
      .sort((a, b) => b.priority - a.priority)

    const task = pendingTasks[0]
    if (task) {
      task.status = TaskStatus.IN_PROGRESS
      task.assignedAgent = agent
      task.updatedAt = new Date()
    }
    return task
  }

  async updateTaskStatus(taskId: string, status: TaskStatus): Promise<void> {
    const task = this.tasks.find(t => t.id === taskId)
    if (task) {
      task.status = status
      task.updatedAt = new Date()
    }
  }

  async getAllTasks(): Promise<Task[]> {
    return [...this.tasks]
  }

  async getTasksByStatus(status: TaskStatus): Promise<Task[]> {
    return this.tasks.filter(t => t.status === status)
  }

  async acquireFileLock(
    filePath: string,
    agent: 'claude' | 'copilot' | 'user',
    ttlMs?: number
  ): Promise<boolean> {
    const existing = this.fileLocks.get(filePath)
    
    // Check if lock exists and hasn't expired
    if (existing) {
      if (!existing.expiresAt || existing.expiresAt > new Date()) {
        return false
      }
    }

    const lock: FileLock = {
      filePath,
      lockedBy: agent,
      lockedAt: new Date(),
      expiresAt: ttlMs ? new Date(Date.now() + ttlMs) : undefined
    }
    
    this.fileLocks.set(filePath, lock)
    return true
  }

  async releaseFileLock(filePath: string, agent: 'claude' | 'copilot' | 'user'): Promise<boolean> {
    const lock = this.fileLocks.get(filePath)
    if (lock && lock.lockedBy === agent) {
      this.fileLocks.delete(filePath)
      return true
    }
    return false
  }

  async isFileLocked(filePath: string): Promise<boolean> {
    const lock = this.fileLocks.get(filePath)
    if (!lock) return false
    
    // Check if expired
    if (lock.expiresAt && lock.expiresAt <= new Date()) {
      this.fileLocks.delete(filePath)
      return false
    }
    
    return true
  }

  async getFileLock(filePath: string): Promise<FileLock | undefined> {
    const lock = this.fileLocks.get(filePath)
    if (!lock) return undefined
    
    // Check if expired
    if (lock.expiresAt && lock.expiresAt <= new Date()) {
      this.fileLocks.delete(filePath)
      return undefined
    }
    
    return lock
  }

  async getAllFileLocks(): Promise<FileLock[]> {
    // Filter out expired locks
    const now = new Date()
    const activeLocks: FileLock[] = []
    
    for (const [filePath, lock] of this.fileLocks.entries()) {
      if (!lock.expiresAt || lock.expiresAt > now) {
        activeLocks.push(lock)
      } else {
        this.fileLocks.delete(filePath)
      }
    }
    
    return activeLocks
  }

  async setContext(
    key: string,
    value: unknown,
    agent: 'claude' | 'copilot' | 'user',
    persistent = false
  ): Promise<void> {
    const context: AgentContext = {
      key,
      value,
      setBy: agent,
      timestamp: new Date(),
      persistent
    }
    this.contexts.set(key, context)
  }

  async getContext(key: string): Promise<AgentContext | undefined> {
    return this.contexts.get(key)
  }

  async deleteContext(key: string): Promise<void> {
    this.contexts.delete(key)
  }

  async getAllContexts(): Promise<AgentContext[]> {
    return Array.from(this.contexts.values())
  }

  async clearNonPersistentState(): Promise<void> {
    // Clear non-persistent contexts
    for (const [key, context] of this.contexts.entries()) {
      if (!context.persistent) {
        this.contexts.delete(key)
      }
    }
    
    // Clear completed and failed tasks
    this.tasks = this.tasks.filter(
      t => t.status === TaskStatus.PENDING || t.status === TaskStatus.IN_PROGRESS
    )
    
    // Clear expired locks
    const now = new Date()
    for (const [filePath, lock] of this.fileLocks.entries()) {
      if (lock.expiresAt && lock.expiresAt <= now) {
        this.fileLocks.delete(filePath)
      }
    }
  }
}
