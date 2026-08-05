/**
 * @fileoverview Real implementation of Claude Code coordination service
 * @purpose Enables Claude Code to orchestrate tasks via HTTP API
 * @dataFlow Claude Code → ClaudeCoordination → StateStore → SQLite
 * @boundary Implements ClaudeCoordinationContract seam (Seam #1)
 * @example
 * const service = new ClaudeCoordinationService(stateStore)
 * const token = await service.registerAgent({ agentId: 'claude-code', capabilities: ['typescript-development'], version: '1.0.0' })
 */

import { v4 as uuidv4 } from 'uuid'
import type {
  ClaudeCoordinationContract,
  StateStoreContract,
  AgentId,
  AgentCapability,
  Task,
  TaskId,
  TaskProgress,
  TaskResult,
  ConversationContext,
  ContextId,
  RegistrationToken,
  HandoffId,
  ServiceResponse,
} from '@contracts'

/**
 * Registered agent information
 */
interface RegisteredAgent {
  agentId: AgentId
  capabilities: AgentCapability[]
  version: string
  registeredAt: Date
  token: RegistrationToken
}

/**
 * Real implementation of Claude Code coordination
 * Provides full orchestration API for Claude Code
 */
export class ClaudeCoordinationService implements ClaudeCoordinationContract {
  private stateStore: StateStoreContract
  private registeredAgents: Map<AgentId, RegisteredAgent> = new Map()

  constructor(stateStore: StateStoreContract) {
    this.stateStore = stateStore
  }

  /**
   * Register Claude Code agent
   */
  async registerAgent(params: {
    agentId: AgentId
    capabilities: AgentCapability[]
    version: string
  }): Promise<ServiceResponse<RegistrationToken>> {
    try {
      // Check if already registered
      if (this.registeredAgents.has(params.agentId)) {
        const existing = this.registeredAgents.get(params.agentId)!
        return {
          success: true,
          data: existing.token,
        }
      }

      // Create new registration
      const token = `reg_${uuidv4()}` as RegistrationToken
      const agent: RegisteredAgent = {
        ...params,
        registeredAt: new Date(),
        token,
      }

      this.registeredAgents.set(params.agentId, agent)

      console.log(
        `[ClaudeCoordination] Agent ${params.agentId} registered with capabilities: ${params.capabilities.join(', ')}`
      )

      return {
        success: true,
        data: token,
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'REGISTRATION_ERROR',
          message: `Failed to register agent: ${error instanceof Error ? error.message : 'Unknown error'}`,
          retryable: true,
        },
      }
    }
  }

  /**
   * Get available tasks matching capabilities
   */
  async getAvailableTasks(capabilities: AgentCapability[]): Promise<ServiceResponse<Task[]>> {
    try {
      const tasks: Task[] = []

      // Try to get next available task
      const result = await this.stateStore.dequeueTask(capabilities)
      if (!result.success) {
        return {
          success: false,
          error: result.error!,
        }
      }

      if (result.data) {
        tasks.push(result.data)
      }

      return {
        success: true,
        data: tasks,
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GET_TASKS_ERROR',
          message: `Failed to get available tasks: ${error instanceof Error ? error.message : 'Unknown error'}`,
          retryable: true,
        },
      }
    }
  }

  /**
   * Claim a specific task
   */
  async claimTask(taskId: TaskId): Promise<ServiceResponse<Task>> {
    try {
      // Get the task
      const taskResult = await this.stateStore.getTask(taskId)
      if (!taskResult.success) {
        return {
          success: false,
          error: taskResult.error!,
        }
      }

      if (!taskResult.data) {
        return {
          success: false,
          error: {
            code: 'TASK_NOT_FOUND',
            message: `Task ${taskId} not found`,
            retryable: false,
          },
        }
      }

      const task = taskResult.data

      // Check if task is available
      if (task.status !== 'queued') {
        return {
          success: false,
          error: {
            code: 'TASK_ALREADY_CLAIMED',
            message: `Task ${taskId} is already ${task.status}`,
            retryable: false,
          },
        }
      }

      // Update task status to claimed
      const updateResult = await this.stateStore.updateTaskStatus(taskId, 'claimed')
      if (!updateResult.success) {
        return {
          success: false,
          error: updateResult.error!,
        }
      }

      return {
        success: true,
        data: {
          ...task,
          status: 'claimed',
        },
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CLAIM_TASK_ERROR',
          message: `Failed to claim task: ${error instanceof Error ? error.message : 'Unknown error'}`,
          retryable: true,
        },
      }
    }
  }

  /**
   * Report progress on a task
   */
  async reportProgress(taskId: TaskId, progress: TaskProgress): Promise<ServiceResponse<void>> {
    try {
      // Update task status to in-progress if not already
      const taskResult = await this.stateStore.getTask(taskId)
      if (!taskResult.success || !taskResult.data) {
        return {
          success: false,
          error: {
            code: 'TASK_NOT_FOUND',
            message: `Task ${taskId} not found`,
            retryable: false,
          },
        }
      }

      if (taskResult.data.status === 'claimed' || taskResult.data.status === 'queued') {
        await this.stateStore.updateTaskStatus(taskId, 'in-progress')
      }

      console.log(
        `[ClaudeCoordination] Task ${taskId} progress: ${progress.percentComplete}% - ${progress.currentStep}`
      )

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'REPORT_PROGRESS_ERROR',
          message: `Failed to report progress: ${error instanceof Error ? error.message : 'Unknown error'}`,
          retryable: true,
        },
      }
    }
  }

  /**
   * Complete a task
   */
  async completeTask(taskId: TaskId, result: TaskResult): Promise<ServiceResponse<void>> {
    try {
      const updateResult = await this.stateStore.updateTaskResult(taskId, result)

      if (updateResult.success) {
        console.log(
          `[ClaudeCoordination] Task ${taskId} completed: ${result.success ? 'success' : 'failed'}`
        )
      }

      return updateResult
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'COMPLETE_TASK_ERROR',
          message: `Failed to complete task: ${error instanceof Error ? error.message : 'Unknown error'}`,
          retryable: true,
        },
      }
    }
  }

  /**
   * Retrieve conversation context
   */
  async retrieveContext(contextId: ContextId): Promise<ServiceResponse<ConversationContext>> {
    try {
      const result = await this.stateStore.loadContext(contextId)

      if (!result.success) {
        return {
          success: false,
          error: result.error!,
        }
      }

      if (!result.data) {
        return {
          success: false,
          error: {
            code: 'CONTEXT_NOT_FOUND',
            message: `Context ${contextId} not found`,
            retryable: false,
          },
        }
      }

      return {
        success: true,
        data: result.data,
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'RETRIEVE_CONTEXT_ERROR',
          message: `Failed to retrieve context: ${error instanceof Error ? error.message : 'Unknown error'}`,
          retryable: true,
        },
      }
    }
  }

  /**
   * Save conversation context
   */
  async saveContext(
    contextId: ContextId,
    context: ConversationContext
  ): Promise<ServiceResponse<void>> {
    try {
      return await this.stateStore.saveContext(contextId, context)
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SAVE_CONTEXT_ERROR',
          message: `Failed to save context: ${error instanceof Error ? error.message : 'Unknown error'}`,
          retryable: true,
        },
      }
    }
  }

  /**
   * Request handoff to another agent
   */
  async requestHandoff(params: {
    taskId: TaskId
    toAgent: AgentId
    reason: string
    currentState: string
    nextSteps: string[]
  }): Promise<ServiceResponse<HandoffId>> {
    try {
      // Update task status to handed-off
      await this.stateStore.updateTaskStatus(params.taskId, 'handed-off')

      // Generate handoff ID
      const handoffId = `handoff_${uuidv4()}` as HandoffId

      console.log(
        `[ClaudeCoordination] Task ${params.taskId} handed off to ${params.toAgent}: ${params.reason}`
      )

      return {
        success: true,
        data: handoffId,
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'HANDOFF_ERROR',
          message: `Failed to request handoff: ${error instanceof Error ? error.message : 'Unknown error'}`,
          retryable: true,
        },
      }
    }
  }
}
