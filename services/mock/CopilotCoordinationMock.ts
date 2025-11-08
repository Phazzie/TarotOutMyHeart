/**
 * Copilot Coordination Mock Implementation
 * 
 * Mock implementation of ICopilotCoordination for testing and development
 */

import type {
  ICopilotCoordination,
  CopilotTaskRequest,
  CopilotTaskResult,
  CopilotAgentStatus,
  ServiceResponse
} from '../../contracts'

import { CopilotStatus, CopilotTaskType } from '../../contracts'

export class CopilotCoordinationMock implements ICopilotCoordination {
  private tasks: Map<string, CopilotTaskResult> = new Map()
  private pendingTasks: Set<string> = new Set()
  private taskIdCounter = 1
  private completedCount = 0
  private failedCount = 0
  private currentStatus: CopilotStatus = CopilotStatus.IDLE
  private currentTaskInfo?: { taskId: string; taskType: CopilotTaskType; startedAt: Date }

  async assignTask(request: CopilotTaskRequest): Promise<ServiceResponse<{ taskId: string }>> {
    const taskId = `copilot-task-${this.taskIdCounter++}`
    
    this.pendingTasks.add(taskId)
    this.currentStatus = CopilotStatus.BUSY
    this.currentTaskInfo = {
      taskId,
      taskType: request.taskType,
      startedAt: new Date()
    }

    // Simulate async task completion
    setTimeout(() => {
      const result: CopilotTaskResult = {
        taskId,
        taskType: request.taskType,
        content: this.generateMockContent(request),
        suggestedPath: request.filePath,
        confidence: 0.85,
        metadata: { originalPrompt: request.prompt },
        completedAt: new Date()
      }
      
      this.tasks.set(taskId, result)
      this.pendingTasks.delete(taskId)
      this.completedCount++
      
      if (this.pendingTasks.size === 0) {
        this.currentStatus = CopilotStatus.IDLE
        this.currentTaskInfo = undefined
      }
    }, 100)

    return {
      success: true,
      data: { taskId }
    }
  }

  async getStatus(): Promise<ServiceResponse<CopilotAgentStatus>> {
    const status: CopilotAgentStatus = {
      status: this.currentStatus,
      currentTask: this.currentTaskInfo,
      completedTasks: this.completedCount,
      failedTasks: this.failedCount,
      lastActive: new Date()
    }

    return {
      success: true,
      data: status
    }
  }

  async getTaskResult(taskId: string): Promise<ServiceResponse<CopilotTaskResult>> {
    const result = this.tasks.get(taskId)
    
    if (!result) {
      return {
        success: false,
        error: {
          code: 'TASK_NOT_FOUND',
          message: `Task ${taskId} not found`,
          retryable: false
        }
      }
    }

    return {
      success: true,
      data: result
    }
  }

  async cancelTask(taskId: string): Promise<ServiceResponse<void>> {
    if (this.pendingTasks.has(taskId)) {
      this.pendingTasks.delete(taskId)
      
      if (this.currentTaskInfo?.taskId === taskId) {
        this.currentTaskInfo = undefined
        this.currentStatus = CopilotStatus.IDLE
      }
      
      return { success: true }
    }

    return {
      success: false,
      error: {
        code: 'TASK_NOT_FOUND',
        message: `Task ${taskId} not found or already completed`,
        retryable: false
      }
    }
  }

  async isAvailable(): Promise<boolean> {
    return this.currentStatus === CopilotStatus.IDLE
  }

  async getPendingTasks(): Promise<ServiceResponse<CopilotTaskResult[]>> {
    const pending = Array.from(this.pendingTasks)
      .map(taskId => this.tasks.get(taskId))
      .filter((task): task is CopilotTaskResult => task !== undefined)

    return {
      success: true,
      data: pending
    }
  }

  private generateMockContent(request: CopilotTaskRequest): string {
    switch (request.taskType) {
      case CopilotTaskType.CODE_COMPLETION:
        return `${request.codeContext || ''}// Copilot completion\nconst result = "completed";`
      case CopilotTaskType.CODE_SUGGESTION:
        return `// Suggested improvement:\n${request.prompt}\nfunction improved() {\n  // Better implementation\n}`
      case CopilotTaskType.INLINE_CHAT:
        return `Response to: ${request.prompt}\n\nHere's what I suggest...`
      case CopilotTaskType.WORKSPACE_EDIT:
        return `// Workspace edit for: ${request.filePath}\n// Changes applied based on: ${request.prompt}`
      case CopilotTaskType.UNIT_TEST:
        return `test('${request.prompt}', () => {\n  // Test implementation\n  expect(true).toBe(true);\n});`
      default:
        return `Mock result for ${request.prompt}`
    }
  }
}
