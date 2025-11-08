/**
 * StateStore Mock Behavior Tests
 *
 * Tests specific internal behaviors of StateStoreMock that go beyond
 * the contract requirements
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { StateStoreMock } from '../../services/mock/StateStoreMock'
import { TaskStatus, TaskPriority } from '../../contracts'

describe('StateStore Mock Behavior', () => {
  let stateStore: StateStoreMock

  beforeEach(() => {
    stateStore = new StateStoreMock()
  })

  describe('Task Priority Ordering', () => {
    it('should dequeue URGENT tasks before HIGH priority', async () => {
      await stateStore.enqueueTask({
        description: 'High priority',
        priority: TaskPriority.HIGH,
        status: TaskStatus.PENDING,
      })

      await stateStore.enqueueTask({
        description: 'Urgent priority',
        priority: TaskPriority.URGENT,
        status: TaskStatus.PENDING,
      })

      const task = await stateStore.dequeueTask('claude')
      expect(task?.description).toBe('Urgent priority')
      expect(task?.priority).toBe(TaskPriority.URGENT)
    })

    it('should maintain stable queue order for same priority', async () => {
      await stateStore.enqueueTask({
        description: 'First medium',
        priority: TaskPriority.MEDIUM,
        status: TaskStatus.PENDING,
      })

      await stateStore.enqueueTask({
        description: 'Second medium',
        priority: TaskPriority.MEDIUM,
        status: TaskStatus.PENDING,
      })

      const first = await stateStore.dequeueTask('claude')
      const second = await stateStore.dequeueTask('copilot')

      expect(first?.description).toBe('First medium')
      expect(second?.description).toBe('Second medium')
    })

    it('should handle all priority levels correctly', async () => {
      await stateStore.enqueueTask({
        description: 'Low',
        priority: TaskPriority.LOW,
        status: TaskStatus.PENDING,
      })

      await stateStore.enqueueTask({
        description: 'Medium',
        priority: TaskPriority.MEDIUM,
        status: TaskStatus.PENDING,
      })

      await stateStore.enqueueTask({
        description: 'High',
        priority: TaskPriority.HIGH,
        status: TaskStatus.PENDING,
      })

      await stateStore.enqueueTask({
        description: 'Urgent',
        priority: TaskPriority.URGENT,
        status: TaskStatus.PENDING,
      })

      const tasks = []
      for (let i = 0; i < 4; i++) {
        const task = await stateStore.dequeueTask('claude')
        if (task) tasks.push(task)
      }

      expect(tasks[0].priority).toBe(TaskPriority.URGENT)
      expect(tasks[1].priority).toBe(TaskPriority.HIGH)
      expect(tasks[2].priority).toBe(TaskPriority.MEDIUM)
      expect(tasks[3].priority).toBe(TaskPriority.LOW)
    })
  })

  describe('Lock Expiration Timing', () => {
    it('should allow re-acquisition after lock expires', async () => {
      await stateStore.acquireFileLock('/test/file.ts', 'claude', 50)

      // Immediately should be locked
      let locked = await stateStore.isFileLocked('/test/file.ts')
      expect(locked).toBe(true)

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 60))

      // Should be unlocked
      locked = await stateStore.isFileLocked('/test/file.ts')
      expect(locked).toBe(false)

      // Should be able to acquire again
      const acquired = await stateStore.acquireFileLock('/test/file.ts', 'copilot')
      expect(acquired).toBe(true)
    })

    it('should clean up expired locks from getAllFileLocks', async () => {
      await stateStore.acquireFileLock('/test/file1.ts', 'claude', 50)
      await stateStore.acquireFileLock('/test/file2.ts', 'copilot') // No expiration

      let locks = await stateStore.getAllFileLocks()
      expect(locks).toHaveLength(2)

      await new Promise(resolve => setTimeout(resolve, 60))

      locks = await stateStore.getAllFileLocks()
      expect(locks).toHaveLength(1)
      expect(locks[0].filePath).toBe('/test/file2.ts')
    })

    it('should handle concurrent lock attempts correctly', async () => {
      await stateStore.acquireFileLock('/test/file.ts', 'claude', 100)

      const attemptByCopilotat50ms = new Promise<boolean>(resolve => {
        setTimeout(async () => {
          const result = await stateStore.acquireFileLock('/test/file.ts', 'copilot')
          resolve(result)
        }, 50)
      })

      const attemptByCopilotat120ms = new Promise<boolean>(resolve => {
        setTimeout(async () => {
          const result = await stateStore.acquireFileLock('/test/file.ts', 'copilot')
          resolve(result)
        }, 120)
      })

      const result1 = await attemptByCopilotat50ms
      const result2 = await attemptByCopilotat120ms

      expect(result1).toBe(false) // Still locked
      expect(result2).toBe(true) // Expired, can acquire
    })
  })

  describe('Task Metadata Handling', () => {
    it('should preserve task metadata', async () => {
      const metadata = {
        priority: 'high',
        tags: ['urgent', 'bug-fix'],
        assignee: 'team-alpha',
      }

      const task = await stateStore.enqueueTask({
        description: 'Task with metadata',
        priority: TaskPriority.HIGH,
        status: TaskStatus.PENDING,
        metadata,
      })

      expect(task.metadata).toEqual(metadata)

      const retrieved = await stateStore.getAllTasks()
      const foundTask = retrieved.find(t => t.id === task.id)
      expect(foundTask?.metadata).toEqual(metadata)
    })

    it('should handle complex metadata objects', async () => {
      const metadata = {
        nested: {
          data: {
            value: 42,
          },
        },
        array: [1, 2, 3],
        mixed: {
          string: 'text',
          number: 123,
          boolean: true,
        },
      }

      const task = await stateStore.enqueueTask({
        description: 'Complex metadata',
        priority: TaskPriority.MEDIUM,
        status: TaskStatus.PENDING,
        metadata,
      })

      expect(task.metadata).toEqual(metadata)
    })
  })

  describe('Context Persistence', () => {
    it('should preserve persistent contexts during cleanup', async () => {
      await stateStore.setContext('temp1', 'value1', 'claude', false)
      await stateStore.setContext('perm1', 'value1', 'claude', true)
      await stateStore.setContext('temp2', 'value2', 'copilot', false)
      await stateStore.setContext('perm2', 'value2', 'copilot', true)

      await stateStore.clearNonPersistentState()

      const allContexts = await stateStore.getAllContexts()
      expect(allContexts).toHaveLength(2)

      const keys = allContexts.map(c => c.key)
      expect(keys).toContain('perm1')
      expect(keys).toContain('perm2')
      expect(keys).not.toContain('temp1')
      expect(keys).not.toContain('temp2')
    })

    it('should handle mixed persistent and non-persistent contexts', async () => {
      const persistentKeys = ['perm1', 'perm2', 'perm3']
      const temporaryKeys = ['temp1', 'temp2', 'temp3']

      for (const key of persistentKeys) {
        await stateStore.setContext(key, `value-${key}`, 'claude', true)
      }

      for (const key of temporaryKeys) {
        await stateStore.setContext(key, `value-${key}`, 'copilot', false)
      }

      let contexts = await stateStore.getAllContexts()
      expect(contexts).toHaveLength(6)

      await stateStore.clearNonPersistentState()

      contexts = await stateStore.getAllContexts()
      expect(contexts).toHaveLength(3)

      const remainingKeys = contexts.map(c => c.key)
      persistentKeys.forEach(key => {
        expect(remainingKeys).toContain(key)
      })
    })
  })

  describe('Task Status Lifecycle', () => {
    it('should maintain task through status transitions', async () => {
      const task = await stateStore.enqueueTask({
        description: 'Lifecycle task',
        priority: TaskPriority.MEDIUM,
        status: TaskStatus.PENDING,
      })

      expect(task.status).toBe(TaskStatus.PENDING)

      await stateStore.dequeueTask('claude')
      let allTasks = await stateStore.getAllTasks()
      let currentTask = allTasks.find(t => t.id === task.id)
      expect(currentTask?.status).toBe(TaskStatus.IN_PROGRESS)

      await stateStore.updateTaskStatus(task.id, TaskStatus.COMPLETED)
      allTasks = await stateStore.getAllTasks()
      currentTask = allTasks.find(t => t.id === task.id)
      expect(currentTask?.status).toBe(TaskStatus.COMPLETED)
    })

    it('should keep in-progress tasks during cleanup', async () => {
      const task1 = await stateStore.enqueueTask({
        description: 'In progress',
        priority: TaskPriority.HIGH,
        status: TaskStatus.PENDING,
      })

      const task2 = await stateStore.enqueueTask({
        description: 'Completed',
        priority: TaskPriority.LOW,
        status: TaskStatus.PENDING,
      })

      await stateStore.dequeueTask('claude')
      await stateStore.updateTaskStatus(task2.id, TaskStatus.COMPLETED)

      await stateStore.clearNonPersistentState()

      const remaining = await stateStore.getAllTasks()
      expect(remaining).toHaveLength(1)
      expect(remaining[0].id).toBe(task1.id)
      expect(remaining[0].status).toBe(TaskStatus.IN_PROGRESS)
    })
  })

  describe('Timestamp Accuracy', () => {
    it('should set createdAt and updatedAt on task creation', async () => {
      const beforeCreate = new Date()

      const task = await stateStore.enqueueTask({
        description: 'Time test',
        priority: TaskPriority.MEDIUM,
        status: TaskStatus.PENDING,
      })

      const afterCreate = new Date()

      expect(task.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime())
      expect(task.createdAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime())
      expect(task.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime())
      expect(task.updatedAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime())
    })

    it('should update updatedAt on status change', async () => {
      const task = await stateStore.enqueueTask({
        description: 'Update test',
        priority: TaskPriority.LOW,
        status: TaskStatus.PENDING,
      })

      const originalUpdatedAt = task.updatedAt

      await new Promise(resolve => setTimeout(resolve, 10))

      await stateStore.updateTaskStatus(task.id, TaskStatus.COMPLETED)

      const tasks = await stateStore.getAllTasks()
      const updatedTask = tasks.find(t => t.id === task.id)

      expect(updatedTask?.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime())
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty description', async () => {
      const task = await stateStore.enqueueTask({
        description: '',
        priority: TaskPriority.LOW,
        status: TaskStatus.PENDING,
      })

      expect(task.description).toBe('')
    })

    it('should handle very long descriptions', async () => {
      const longDescription = 'x'.repeat(10000)

      const task = await stateStore.enqueueTask({
        description: longDescription,
        priority: TaskPriority.MEDIUM,
        status: TaskStatus.PENDING,
      })

      expect(task.description.length).toBe(10000)
    })

    it('should handle special characters in file paths', async () => {
      const specialPaths = [
        '/test/file with spaces.ts',
        '/test/file-with-dashes.ts',
        '/test/file_with_underscores.ts',
        '/test/file.multiple.dots.ts',
      ]

      for (const path of specialPaths) {
        const acquired = await stateStore.acquireFileLock(path, 'claude')
        expect(acquired).toBe(true)

        const isLocked = await stateStore.isFileLocked(path)
        expect(isLocked).toBe(true)
      }
    })

    it('should handle rapid sequential operations', async () => {
      const tasks = []

      for (let i = 0; i < 100; i++) {
        const task = await stateStore.enqueueTask({
          description: `Task ${i}`,
          priority: TaskPriority.MEDIUM,
          status: TaskStatus.PENDING,
        })
        tasks.push(task)
      }

      const allTasks = await stateStore.getAllTasks()
      expect(allTasks).toHaveLength(100)

      // All IDs should be unique
      const ids = new Set(allTasks.map(t => t.id))
      expect(ids.size).toBe(100)
    })
  })
})
