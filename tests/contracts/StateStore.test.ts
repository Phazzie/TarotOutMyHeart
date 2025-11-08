/**
 * StateStore Contract Tests
 *
 * Tests that StateStoreMock satisfies the StateStore contract
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { StateStoreMock } from '../../services/mock/StateStoreMock'
import { TaskStatus, TaskPriority } from '../../contracts'

describe('StateStore Contract', () => {
  let stateStore: StateStoreMock

  beforeEach(() => {
    stateStore = new StateStoreMock()
  })

  describe('Task Queue Operations', () => {
    it('should enqueue a task and assign it an ID', async () => {
      const task = await stateStore.enqueueTask({
        description: 'Test task',
        priority: TaskPriority.HIGH,
        status: TaskStatus.PENDING,
      })

      expect(task).toBeDefined()
      expect(task.id).toBeDefined()
      expect(task.description).toBe('Test task')
      expect(task.priority).toBe(TaskPriority.HIGH)
      expect(task.status).toBe(TaskStatus.PENDING)
      expect(task.createdAt).toBeInstanceOf(Date)
      expect(task.updatedAt).toBeInstanceOf(Date)
    })

    it('should dequeue tasks by priority (highest first)', async () => {
      await stateStore.enqueueTask({
        description: 'Low priority',
        priority: TaskPriority.LOW,
        status: TaskStatus.PENDING,
      })

      await stateStore.enqueueTask({
        description: 'High priority',
        priority: TaskPriority.HIGH,
        status: TaskStatus.PENDING,
      })

      await stateStore.enqueueTask({
        description: 'Medium priority',
        priority: TaskPriority.MEDIUM,
        status: TaskStatus.PENDING,
      })

      const firstTask = await stateStore.dequeueTask('claude')
      expect(firstTask).toBeDefined()
      expect(firstTask?.description).toBe('High priority')
      expect(firstTask?.status).toBe(TaskStatus.IN_PROGRESS)
      expect(firstTask?.assignedAgent).toBe('claude')
    })

    it('should return undefined when dequeuing from empty queue', async () => {
      const task = await stateStore.dequeueTask('copilot')
      expect(task).toBeUndefined()
    })

    it('should update task status', async () => {
      const task = await stateStore.enqueueTask({
        description: 'Task to update',
        priority: TaskPriority.MEDIUM,
        status: TaskStatus.PENDING,
      })

      await stateStore.updateTaskStatus(task.id, TaskStatus.COMPLETED)

      const allTasks = await stateStore.getAllTasks()
      const updatedTask = allTasks.find(t => t.id === task.id)
      expect(updatedTask?.status).toBe(TaskStatus.COMPLETED)
    })

    it('should get tasks by status', async () => {
      await stateStore.enqueueTask({
        description: 'Pending 1',
        priority: TaskPriority.LOW,
        status: TaskStatus.PENDING,
      })

      const task2 = await stateStore.enqueueTask({
        description: 'Pending 2',
        priority: TaskPriority.MEDIUM,
        status: TaskStatus.PENDING,
      })

      await stateStore.updateTaskStatus(task2.id, TaskStatus.COMPLETED)

      const pendingTasks = await stateStore.getTasksByStatus(TaskStatus.PENDING)
      const completedTasks = await stateStore.getTasksByStatus(TaskStatus.COMPLETED)

      expect(pendingTasks).toHaveLength(1)
      expect(completedTasks).toHaveLength(1)
    })

    it('should get all tasks', async () => {
      await stateStore.enqueueTask({
        description: 'Task 1',
        priority: TaskPriority.LOW,
        status: TaskStatus.PENDING,
      })

      await stateStore.enqueueTask({
        description: 'Task 2',
        priority: TaskPriority.HIGH,
        status: TaskStatus.PENDING,
      })

      const allTasks = await stateStore.getAllTasks()
      expect(allTasks).toHaveLength(2)
    })
  })

  describe('File Lock Operations', () => {
    it('should acquire a file lock successfully', async () => {
      const acquired = await stateStore.acquireFileLock('/test/file.ts', 'claude')
      expect(acquired).toBe(true)

      const isLocked = await stateStore.isFileLocked('/test/file.ts')
      expect(isLocked).toBe(true)
    })

    it('should fail to acquire lock when file is already locked', async () => {
      await stateStore.acquireFileLock('/test/file.ts', 'claude')
      const secondAcquire = await stateStore.acquireFileLock('/test/file.ts', 'copilot')

      expect(secondAcquire).toBe(false)
    })

    it('should release a file lock', async () => {
      await stateStore.acquireFileLock('/test/file.ts', 'claude')
      const released = await stateStore.releaseFileLock('/test/file.ts', 'claude')

      expect(released).toBe(true)

      const isLocked = await stateStore.isFileLocked('/test/file.ts')
      expect(isLocked).toBe(false)
    })

    it('should fail to release lock held by different agent', async () => {
      await stateStore.acquireFileLock('/test/file.ts', 'claude')
      const released = await stateStore.releaseFileLock('/test/file.ts', 'copilot')

      expect(released).toBe(false)
    })

    it('should get file lock information', async () => {
      await stateStore.acquireFileLock('/test/file.ts', 'claude')
      const lock = await stateStore.getFileLock('/test/file.ts')

      expect(lock).toBeDefined()
      expect(lock?.filePath).toBe('/test/file.ts')
      expect(lock?.lockedBy).toBe('claude')
      expect(lock?.lockedAt).toBeInstanceOf(Date)
    })

    it('should return undefined for non-existent lock', async () => {
      const lock = await stateStore.getFileLock('/non/existent.ts')
      expect(lock).toBeUndefined()
    })

    it('should get all active file locks', async () => {
      await stateStore.acquireFileLock('/test/file1.ts', 'claude')
      await stateStore.acquireFileLock('/test/file2.ts', 'copilot')

      const locks = await stateStore.getAllFileLocks()
      expect(locks).toHaveLength(2)
    })

    it('should handle lock expiration with TTL', async () => {
      // Acquire lock with 100ms TTL
      await stateStore.acquireFileLock('/test/file.ts', 'claude', 100)

      // Immediately should be locked
      let isLocked = await stateStore.isFileLocked('/test/file.ts')
      expect(isLocked).toBe(true)

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150))

      // Should be unlocked now
      isLocked = await stateStore.isFileLocked('/test/file.ts')
      expect(isLocked).toBe(false)
    })
  })

  describe('Context Operations', () => {
    it('should set and get context', async () => {
      await stateStore.setContext('testKey', { data: 'test value' }, 'claude')
      const context = await stateStore.getContext('testKey')

      expect(context).toBeDefined()
      expect(context?.key).toBe('testKey')
      expect(context?.value).toEqual({ data: 'test value' })
      expect(context?.setBy).toBe('claude')
      expect(context?.timestamp).toBeInstanceOf(Date)
      expect(context?.persistent).toBe(false)
    })

    it('should set persistent context', async () => {
      await stateStore.setContext('persistentKey', 'persistent value', 'copilot', true)
      const context = await stateStore.getContext('persistentKey')

      expect(context?.persistent).toBe(true)
    })

    it('should delete context', async () => {
      await stateStore.setContext('keyToDelete', 'value', 'user')
      await stateStore.deleteContext('keyToDelete')

      const context = await stateStore.getContext('keyToDelete')
      expect(context).toBeUndefined()
    })

    it('should get all contexts', async () => {
      await stateStore.setContext('key1', 'value1', 'claude')
      await stateStore.setContext('key2', 'value2', 'copilot')

      const contexts = await stateStore.getAllContexts()
      expect(contexts).toHaveLength(2)
    })
  })

  describe('State Cleanup', () => {
    it('should clear non-persistent contexts', async () => {
      await stateStore.setContext('temp', 'temporary', 'claude', false)
      await stateStore.setContext('perm', 'permanent', 'copilot', true)

      await stateStore.clearNonPersistentState()

      const tempContext = await stateStore.getContext('temp')
      const permContext = await stateStore.getContext('perm')

      expect(tempContext).toBeUndefined()
      expect(permContext).toBeDefined()
    })

    it('should clear completed and failed tasks', async () => {
      const task1 = await stateStore.enqueueTask({
        description: 'Task 1',
        priority: TaskPriority.LOW,
        status: TaskStatus.PENDING,
      })

      const task2 = await stateStore.enqueueTask({
        description: 'Task 2',
        priority: TaskPriority.LOW,
        status: TaskStatus.PENDING,
      })

      await stateStore.updateTaskStatus(task1.id, TaskStatus.COMPLETED)
      await stateStore.updateTaskStatus(task2.id, TaskStatus.FAILED)

      await stateStore.clearNonPersistentState()

      const allTasks = await stateStore.getAllTasks()
      expect(allTasks).toHaveLength(0)
    })

    it('should keep pending and in-progress tasks', async () => {
      await stateStore.enqueueTask({
        description: 'Pending task',
        priority: TaskPriority.LOW,
        status: TaskStatus.PENDING,
      })

      await stateStore.dequeueTask('claude')

      await stateStore.clearNonPersistentState()

      const allTasks = await stateStore.getAllTasks()
      expect(allTasks).toHaveLength(1)
    })
  })

  describe('Error Cases', () => {
    it('should handle updating non-existent task gracefully', async () => {
      await expect(
        stateStore.updateTaskStatus('non-existent-id', TaskStatus.COMPLETED)
      ).resolves.not.toThrow()
    })

    it('should handle releasing non-existent lock gracefully', async () => {
      const released = await stateStore.releaseFileLock('/non/existent.ts', 'claude')
      expect(released).toBe(false)
    })

    it('should handle deleting non-existent context gracefully', async () => {
      await expect(stateStore.deleteContext('non-existent-key')).resolves.not.toThrow()
    })
  })
})
