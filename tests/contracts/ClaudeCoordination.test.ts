/**
 * Claude Coordination Contract Tests
 *
 * Tests that ClaudeCoordinationMock satisfies the ClaudeCoordination contract
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { ClaudeCoordinationMock } from '../../services/mock/ClaudeCoordinationMock'
import { ClaudeTaskType, ClaudeStatus } from '../../contracts'

describe('ClaudeCoordination Contract', () => {
  let coordination: ClaudeCoordinationMock

  beforeEach(() => {
    coordination = new ClaudeCoordinationMock()
  })

  describe('Task Assignment', () => {
    it('should assign a task and return task ID', async () => {
      const response = await coordination.assignTask({
        taskType: ClaudeTaskType.CODE_REVIEW,
        prompt: 'Review this code',
        contextFiles: ['/test/file.ts'],
      })

      expect(response.success).toBe(true)
      expect(response.data?.taskId).toBeDefined()
      expect(response.data?.taskId).toMatch(/^claude-task-/)
    })

    it('should accept different task types', async () => {
      const taskTypes = [
        ClaudeTaskType.CODE_REVIEW,
        ClaudeTaskType.CODE_GENERATION,
        ClaudeTaskType.DOCUMENTATION,
        ClaudeTaskType.REFACTORING,
        ClaudeTaskType.TESTING,
        ClaudeTaskType.ANALYSIS,
      ]

      for (const taskType of taskTypes) {
        const response = await coordination.assignTask({
          taskType,
          prompt: `Test ${taskType}`,
          priority: 1,
        })

        expect(response.success).toBe(true)
      }
    })

    it('should accept optional parameters', async () => {
      const response = await coordination.assignTask({
        taskType: ClaudeTaskType.CODE_GENERATION,
        prompt: 'Generate code',
        contextFiles: ['/src/main.ts'],
        parameters: { style: 'functional' },
        priority: 2,
      })

      expect(response.success).toBe(true)
    })
  })

  describe('Status Monitoring', () => {
    it('should return IDLE status initially', async () => {
      const response = await coordination.getStatus()

      expect(response.success).toBe(true)
      expect(response.data?.status).toBe(ClaudeStatus.IDLE)
      expect(response.data?.completedTasks).toBe(0)
      expect(response.data?.failedTasks).toBe(0)
      expect(response.data?.lastActive).toBeInstanceOf(Date)
    })

    it('should return BUSY status when task is assigned', async () => {
      await coordination.assignTask({
        taskType: ClaudeTaskType.CODE_REVIEW,
        prompt: 'Review code',
      })

      const response = await coordination.getStatus()

      expect(response.success).toBe(true)
      expect(response.data?.status).toBe(ClaudeStatus.BUSY)
      expect(response.data?.currentTask).toBeDefined()
      expect(response.data?.currentTask?.taskType).toBe(ClaudeTaskType.CODE_REVIEW)
    })

    it('should return to IDLE after task completion', async () => {
      await coordination.assignTask({
        taskType: ClaudeTaskType.DOCUMENTATION,
        prompt: 'Write docs',
      })

      // Wait for async task completion
      await new Promise(resolve => setTimeout(resolve, 150))

      const statusResponse = await coordination.getStatus()
      expect(statusResponse.data?.status).toBe(ClaudeStatus.IDLE)
      expect(statusResponse.data?.currentTask).toBeUndefined()
    })

    it('should increment completed tasks counter', async () => {
      await coordination.assignTask({
        taskType: ClaudeTaskType.CODE_GENERATION,
        prompt: 'Generate code',
      })

      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 150))

      const response = await coordination.getStatus()
      expect(response.data?.completedTasks).toBe(1)
    })
  })

  describe('Task Results', () => {
    it('should retrieve task result after completion', async () => {
      const assignResponse = await coordination.assignTask({
        taskType: ClaudeTaskType.CODE_REVIEW,
        prompt: 'Review this code',
        contextFiles: ['/test/file.ts'],
      })

      const taskId = assignResponse.data!.taskId

      // Wait for task completion
      await new Promise(resolve => setTimeout(resolve, 150))

      const resultResponse = await coordination.getTaskResult(taskId)

      expect(resultResponse.success).toBe(true)
      expect(resultResponse.data?.taskId).toBe(taskId)
      expect(resultResponse.data?.taskType).toBe(ClaudeTaskType.CODE_REVIEW)
      expect(resultResponse.data?.content).toBeDefined()
      expect(resultResponse.data?.completedAt).toBeInstanceOf(Date)
    })

    it('should return error for non-existent task', async () => {
      const response = await coordination.getTaskResult('non-existent-task')

      expect(response.success).toBe(false)
      expect(response.error?.code).toBe('TASK_NOT_FOUND')
      expect(response.error?.retryable).toBe(false)
    })

    it('should include context files in result', async () => {
      const files = ['/src/main.ts', '/src/utils.ts']
      const assignResponse = await coordination.assignTask({
        taskType: ClaudeTaskType.REFACTORING,
        prompt: 'Refactor code',
        contextFiles: files,
      })

      await new Promise(resolve => setTimeout(resolve, 150))

      const resultResponse = await coordination.getTaskResult(assignResponse.data!.taskId)
      expect(resultResponse.data?.modifiedFiles).toEqual(files)
    })
  })

  describe('Task Cancellation', () => {
    it('should cancel a pending task', async () => {
      const assignResponse = await coordination.assignTask({
        taskType: ClaudeTaskType.ANALYSIS,
        prompt: 'Analyze code',
      })

      const cancelResponse = await coordination.cancelTask(assignResponse.data!.taskId)

      expect(cancelResponse.success).toBe(true)
    })

    it('should return error when cancelling non-existent task', async () => {
      const response = await coordination.cancelTask('non-existent-task')

      expect(response.success).toBe(false)
      expect(response.error?.code).toBe('TASK_NOT_FOUND')
    })

    it('should return to IDLE status after cancellation', async () => {
      const assignResponse = await coordination.assignTask({
        taskType: ClaudeTaskType.TESTING,
        prompt: 'Write tests',
      })

      await coordination.cancelTask(assignResponse.data!.taskId)

      const statusResponse = await coordination.getStatus()
      expect(statusResponse.data?.status).toBe(ClaudeStatus.IDLE)
    })
  })

  describe('Availability Check', () => {
    it('should be available initially', async () => {
      const available = await coordination.isAvailable()
      expect(available).toBe(true)
    })

    it('should not be available when busy', async () => {
      await coordination.assignTask({
        taskType: ClaudeTaskType.CODE_GENERATION,
        prompt: 'Generate code',
      })

      const available = await coordination.isAvailable()
      expect(available).toBe(false)
    })

    it('should be available after task completion', async () => {
      await coordination.assignTask({
        taskType: ClaudeTaskType.DOCUMENTATION,
        prompt: 'Write docs',
      })

      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 150))

      const available = await coordination.isAvailable()
      expect(available).toBe(true)
    })
  })

  describe('Pending Tasks', () => {
    it('should return empty list initially', async () => {
      const response = await coordination.getPendingTasks()

      expect(response.success).toBe(true)
      expect(response.data).toHaveLength(0)
    })

    it('should not include completed tasks in pending list', async () => {
      await coordination.assignTask({
        taskType: ClaudeTaskType.CODE_REVIEW,
        prompt: 'Review code',
      })

      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 150))

      const response = await coordination.getPendingTasks()
      expect(response.data).toHaveLength(0)
    })
  })

  describe('Content Generation', () => {
    it('should generate appropriate content for code review', async () => {
      const assignResponse = await coordination.assignTask({
        taskType: ClaudeTaskType.CODE_REVIEW,
        prompt: 'Review this function',
      })

      await new Promise(resolve => setTimeout(resolve, 150))

      const result = await coordination.getTaskResult(assignResponse.data!.taskId)
      expect(result.data?.content).toContain('Code review')
    })

    it('should generate code for code generation tasks', async () => {
      const assignResponse = await coordination.assignTask({
        taskType: ClaudeTaskType.CODE_GENERATION,
        prompt: 'Create a helper function',
      })

      await new Promise(resolve => setTimeout(resolve, 150))

      const result = await coordination.getTaskResult(assignResponse.data!.taskId)
      expect(result.data?.content).toContain('function')
    })

    it('should generate documentation for documentation tasks', async () => {
      const assignResponse = await coordination.assignTask({
        taskType: ClaudeTaskType.DOCUMENTATION,
        prompt: 'Document this API',
      })

      await new Promise(resolve => setTimeout(resolve, 150))

      const result = await coordination.getTaskResult(assignResponse.data!.taskId)
      expect(result.data?.content).toContain('Documentation')
    })
  })
})
