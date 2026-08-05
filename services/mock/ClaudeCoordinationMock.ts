/**
 * Claude Coordination Mock Implementation
 *
 * Mock implementation of IClaudeCoordination for testing and development
 */

import type {
  IClaudeCoordination,
  ClaudeTaskRequest,
  ClaudeTaskResult,
  ClaudeAgentStatus,
  ServiceResponse,
} from '../../contracts'

import { ClaudeStatus, ClaudeTaskType } from '../../contracts'

export class ClaudeCoordinationMock implements IClaudeCoordination {
  private tasks: Map<string, ClaudeTaskResult> = new Map()
  private pendingTasks: Set<string> = new Set()
  private taskIdCounter = 1
  private completedCount = 0
  private failedCount = 0
  private currentStatus: ClaudeStatus = ClaudeStatus.IDLE
  private currentTaskInfo?: { taskId: string; taskType: ClaudeTaskType; startedAt: Date }

  async assignTask(request: ClaudeTaskRequest): Promise<ServiceResponse<{ taskId: string }>> {
    const taskId = `claude-task-${this.taskIdCounter++}`

    this.pendingTasks.add(taskId)
    this.currentStatus = ClaudeStatus.BUSY
    this.currentTaskInfo = {
      taskId,
      taskType: request.taskType,
      startedAt: new Date(),
    }

    // Simulate async task completion
    setTimeout(() => {
      const result: ClaudeTaskResult = {
        taskId,
        taskType: request.taskType,
        content: this.generateMockContent(request),
        modifiedFiles: request.contextFiles,
        metadata: { originalPrompt: request.prompt },
        completedAt: new Date(),
      }

      this.tasks.set(taskId, result)
      this.pendingTasks.delete(taskId)
      this.completedCount++

      if (this.pendingTasks.size === 0) {
        this.currentStatus = ClaudeStatus.IDLE
        this.currentTaskInfo = undefined
      }
    }, 100)

    return {
      success: true,
      data: { taskId },
    }
  }

  async getStatus(): Promise<ServiceResponse<ClaudeAgentStatus>> {
    const status: ClaudeAgentStatus = {
      status: this.currentStatus,
      currentTask: this.currentTaskInfo,
      completedTasks: this.completedCount,
      failedTasks: this.failedCount,
      lastActive: new Date(),
    }

    return {
      success: true,
      data: status,
    }
  }

  async getTaskResult(taskId: string): Promise<ServiceResponse<ClaudeTaskResult>> {
    const result = this.tasks.get(taskId)

    if (!result) {
      return {
        success: false,
        error: {
          code: 'TASK_NOT_FOUND',
          message: `Task ${taskId} not found`,
          retryable: false,
        },
      }
    }

    return {
      success: true,
      data: result,
    }
  }

  async cancelTask(taskId: string): Promise<ServiceResponse<void>> {
    if (this.pendingTasks.has(taskId)) {
      this.pendingTasks.delete(taskId)

      if (this.currentTaskInfo?.taskId === taskId) {
        this.currentTaskInfo = undefined
        this.currentStatus = ClaudeStatus.IDLE
      }

      return { success: true }
    }

    return {
      success: false,
      error: {
        code: 'TASK_NOT_FOUND',
        message: `Task ${taskId} not found or already completed`,
        retryable: false,
      },
    }
  }

  async isAvailable(): Promise<boolean> {
    return this.currentStatus === ClaudeStatus.IDLE
  }

  async getPendingTasks(): Promise<ServiceResponse<ClaudeTaskResult[]>> {
    const pending = Array.from(this.pendingTasks)
      .map(taskId => this.tasks.get(taskId))
      .filter((task): task is ClaudeTaskResult => task !== undefined)

    return {
      success: true,
      data: pending,
    }
  }

  private generateMockContent(request: ClaudeTaskRequest): string {
    switch (request.taskType) {
      case ClaudeTaskType.CODE_REVIEW:
        return `Code review complete. The code looks good with minor suggestions:\n- Consider adding error handling\n- Add unit tests`
      case ClaudeTaskType.CODE_GENERATION:
        return `// Generated code based on: ${request.prompt}\nfunction example() {\n  return "mock implementation";\n}`
      case ClaudeTaskType.DOCUMENTATION:
        return `# Documentation\n\n${request.prompt}\n\nThis is mock documentation content.`
      case ClaudeTaskType.REFACTORING:
        return `Refactoring suggestions:\n1. Extract method\n2. Simplify conditionals\n3. Remove duplication`
      case ClaudeTaskType.TESTING:
        return `describe('${request.prompt}', () => {\n  it('should work', () => {\n    expect(true).toBe(true);\n  });\n});`
      case ClaudeTaskType.ANALYSIS:
        return `Analysis complete:\n- Complexity: Medium\n- Maintainability: Good\n- Test coverage: 85%`
      default:
        return `Mock result for ${request.prompt}`
    }
  }
}
