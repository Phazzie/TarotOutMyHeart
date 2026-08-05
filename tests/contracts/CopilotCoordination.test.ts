/**
 * Copilot Coordination Contract Tests
 *
 * Tests that CopilotCoordinationMock satisfies the CopilotCoordination contract
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { CopilotCoordinationMock } from '../../services/mock/CopilotCoordinationMock'
import { CopilotTaskType, CopilotStatus } from '../../contracts'

describe('CopilotCoordination Contract', () => {
  let coordination: CopilotCoordinationMock

  beforeEach(() => {
    coordination = new CopilotCoordinationMock()
  })

  describe('Task Assignment', () => {
    it('should assign a task and return task ID', async () => {
      const response = await coordination.assignTask({
        taskType: CopilotTaskType.CODE_COMPLETION,
        prompt: 'Complete this function',
        filePath: '/test/file.ts',
      })

      expect(response.success).toBe(true)
      expect(response.data?.taskId).toBeDefined()
      expect(response.data?.taskId).toMatch(/^copilot-task-/)
    })

    it('should accept different task types', async () => {
      const taskTypes = [
        CopilotTaskType.CODE_COMPLETION,
        CopilotTaskType.CODE_SUGGESTION,
        CopilotTaskType.INLINE_CHAT,
        CopilotTaskType.WORKSPACE_EDIT,
        CopilotTaskType.UNIT_TEST,
      ]

      for (const taskType of taskTypes) {
        const response = await coordination.assignTask({
          taskType,
          prompt: `Test ${taskType}`,
        })

        expect(response.success).toBe(true)
      }
    })

    it('should accept code context', async () => {
      const response = await coordination.assignTask({
        taskType: CopilotTaskType.CODE_COMPLETION,
        prompt: 'Complete',
        codeContext: 'function example() {',
        filePath: '/src/utils.ts',
      })

      expect(response.success).toBe(true)
    })
  })

  describe('Status Monitoring', () => {
    it('should return IDLE status initially', async () => {
      const response = await coordination.getStatus()

      expect(response.success).toBe(true)
      expect(response.data?.status).toBe(CopilotStatus.IDLE)
      expect(response.data?.completedTasks).toBe(0)
      expect(response.data?.failedTasks).toBe(0)
    })

    it('should return BUSY status when task is assigned', async () => {
      await coordination.assignTask({
        taskType: CopilotTaskType.CODE_SUGGESTION,
        prompt: 'Suggest improvements',
      })

      const response = await coordination.getStatus()

      expect(response.success).toBe(true)
      expect(response.data?.status).toBe(CopilotStatus.BUSY)
      expect(response.data?.currentTask).toBeDefined()
    })

    it('should return to IDLE after task completion', async () => {
      await coordination.assignTask({
        taskType: CopilotTaskType.UNIT_TEST,
        prompt: 'Generate unit test',
      })

      await new Promise(resolve => setTimeout(resolve, 150))

      const response = await coordination.getStatus()
      expect(response.data?.status).toBe(CopilotStatus.IDLE)
    })
  })

  describe('Task Results', () => {
    it('should retrieve task result with content', async () => {
      const assignResponse = await coordination.assignTask({
        taskType: CopilotTaskType.CODE_COMPLETION,
        prompt: 'Complete this',
        codeContext: 'const x = ',
      })

      await new Promise(resolve => setTimeout(resolve, 150))

      const resultResponse = await coordination.getTaskResult(assignResponse.data!.taskId)

      expect(resultResponse.success).toBe(true)
      expect(resultResponse.data?.content).toBeDefined()
      expect(resultResponse.data?.taskType).toBe(CopilotTaskType.CODE_COMPLETION)
    })

    it('should include confidence score', async () => {
      const assignResponse = await coordination.assignTask({
        taskType: CopilotTaskType.CODE_SUGGESTION,
        prompt: 'Suggest code',
      })

      await new Promise(resolve => setTimeout(resolve, 150))

      const result = await coordination.getTaskResult(assignResponse.data!.taskId)
      expect(result.data?.confidence).toBeDefined()
      expect(result.data?.confidence).toBeGreaterThan(0)
      expect(result.data?.confidence).toBeLessThanOrEqual(1)
    })

    it('should include suggested path when applicable', async () => {
      const filePath = '/src/test.ts'
      const assignResponse = await coordination.assignTask({
        taskType: CopilotTaskType.WORKSPACE_EDIT,
        prompt: 'Edit workspace',
        filePath,
      })

      await new Promise(resolve => setTimeout(resolve, 150))

      const result = await coordination.getTaskResult(assignResponse.data!.taskId)
      expect(result.data?.suggestedPath).toBe(filePath)
    })

    it('should return error for non-existent task', async () => {
      const response = await coordination.getTaskResult('invalid-task-id')

      expect(response.success).toBe(false)
      expect(response.error?.code).toBe('TASK_NOT_FOUND')
    })
  })

  describe('Task Cancellation', () => {
    it('should cancel a pending task', async () => {
      const assignResponse = await coordination.assignTask({
        taskType: CopilotTaskType.CODE_COMPLETION,
        prompt: 'Complete code',
      })

      const cancelResponse = await coordination.cancelTask(assignResponse.data!.taskId)
      expect(cancelResponse.success).toBe(true)
    })

    it('should update status after cancellation', async () => {
      const assignResponse = await coordination.assignTask({
        taskType: CopilotTaskType.INLINE_CHAT,
        prompt: 'Chat request',
      })

      await coordination.cancelTask(assignResponse.data!.taskId)

      const status = await coordination.getStatus()
      expect(status.data?.status).toBe(CopilotStatus.IDLE)
    })

    it('should return error for non-existent task', async () => {
      const response = await coordination.cancelTask('non-existent')

      expect(response.success).toBe(false)
      expect(response.error?.code).toBe('TASK_NOT_FOUND')
    })
  })

  describe('Availability', () => {
    it('should be available when idle', async () => {
      const available = await coordination.isAvailable()
      expect(available).toBe(true)
    })

    it('should not be available when busy', async () => {
      await coordination.assignTask({
        taskType: CopilotTaskType.CODE_COMPLETION,
        prompt: 'Complete',
      })

      const available = await coordination.isAvailable()
      expect(available).toBe(false)
    })
  })

  describe('Pending Tasks', () => {
    it('should return empty list when no pending tasks', async () => {
      const response = await coordination.getPendingTasks()

      expect(response.success).toBe(true)
      expect(response.data).toEqual([])
    })

    it('should not include completed tasks', async () => {
      await coordination.assignTask({
        taskType: CopilotTaskType.UNIT_TEST,
        prompt: 'Generate test',
      })

      await new Promise(resolve => setTimeout(resolve, 150))

      const response = await coordination.getPendingTasks()
      expect(response.data).toHaveLength(0)
    })
  })

  describe('Content Generation', () => {
    it('should generate code completion', async () => {
      const assignResponse = await coordination.assignTask({
        taskType: CopilotTaskType.CODE_COMPLETION,
        prompt: 'Complete function',
        codeContext: 'function test() {',
      })

      await new Promise(resolve => setTimeout(resolve, 150))

      const result = await coordination.getTaskResult(assignResponse.data!.taskId)
      expect(result.data?.content).toContain('completion')
    })

    it('should generate code suggestions', async () => {
      const assignResponse = await coordination.assignTask({
        taskType: CopilotTaskType.CODE_SUGGESTION,
        prompt: 'Suggest improvements',
      })

      await new Promise(resolve => setTimeout(resolve, 150))

      const result = await coordination.getTaskResult(assignResponse.data!.taskId)
      expect(result.data?.content).toContain('Suggested')
    })

    it('should generate unit tests', async () => {
      const assignResponse = await coordination.assignTask({
        taskType: CopilotTaskType.UNIT_TEST,
        prompt: 'Test user authentication',
      })

      await new Promise(resolve => setTimeout(resolve, 150))

      const result = await coordination.getTaskResult(assignResponse.data!.taskId)
      expect(result.data?.content).toContain('test')
    })
  })
})
