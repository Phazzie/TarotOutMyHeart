/**
 * @fileoverview Mock implementation of Claude Code coordination service
 * @purpose Enables Claude Code to participate in coordinated AI collaboration
 * @dataFlow Claude Code → ClaudeCoordination → StateStore → Task Queue/Context
 * @boundary Implements ClaudeCoordinationContract seam (Seam #1)
 * @example
 * const service = new ClaudeCoordinationMock(stateStore)
 * const token = await service.registerAgent({ agentId: 'claude-code', capabilities: [...] })
 * const tasks = await service.getAvailableTasks(['typescript-development'])
 */

import { v4 as uuidv4 } from 'uuid'
import { logInfo, logError } from '../../src/observability/logger'
import type {
  ClaudeCoordinationContract,
  StateStoreContract,
  Task,
  TaskId,
  TaskProgress,
  TaskResult,
  AgentId,
  AgentCapability,
  ConversationContext,
  ContextId,
  ServiceResponse,
  RegistrationToken,
  HandoffId
} from '@contracts'

/**
 * Registration info for active agents
 */
interface AgentRegistration {
  agentId: AgentId
  capabilities: AgentCapability[]
  version: string
  token: RegistrationToken
  registeredAt: Date
  lastSeen: Date
}

/**
 * Handoff request details
 */
interface HandoffRequest {
  id: HandoffId
  taskId: TaskId
  fromAgent: AgentId
  toAgent: AgentId
  reason: string
  currentState: string
  nextSteps: string[]
  requestedAt: Date
  status: 'pending' | 'accepted' | 'rejected'
}

/**
 * Mock implementation of Claude Code coordination service
 * Provides realistic task management and context sharing
 */
export class ClaudeCoordinationMock implements ClaudeCoordinationContract {
  private stateStore: StateStoreContract
  private registrations: Map<AgentId, AgentRegistration> = new Map()
  private tokenToAgent: Map<RegistrationToken, AgentId> = new Map()
  private handoffs: Map<HandoffId, HandoffRequest> = new Map()
  private claimedTasks: Map<TaskId, AgentId> = new Map()

  // Configuration
  private readonly SIMULATED_DELAY_MS = 100

  constructor(stateStore: StateStoreContract) {
    this.stateStore = stateStore
  }

  /**
   * Simulates network/processing delay
   */
  private async simulateDelay(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, this.SIMULATED_DELAY_MS))
  }

  /**
   * Generates a registration token
   */
  private generateToken(): RegistrationToken {
    return `reg_${uuidv4()}` as RegistrationToken
  }

  /**
   * Generates a handoff ID
   */
  private generateHandoffId(): HandoffId {
    return `handoff_${uuidv4()}` as HandoffId
  }

  async registerAgent(params: {
    agentId: AgentId
    capabilities: AgentCapability[]
    version: string
  }): Promise<ServiceResponse<RegistrationToken>> {
    await this.simulateDelay()

    // Check if already registered
    const existing = this.registrations.get(params.agentId)
    if (existing) {
      // Update registration
      existing.capabilities = params.capabilities
      existing.version = params.version
      existing.lastSeen = new Date()
      return {
        success: true,
        data: existing.token
      }
    }

    // Validate capabilities
    if (params.capabilities.length === 0) {
      return {
        success: false,
        error: {
          code: 'INVALID_CAPABILITIES',
          message: 'Agent must declare at least one capability',
          retryable: false
        }
      }
    }

    // Create new registration
    const token = this.generateToken()
    const registration: AgentRegistration = {
      agentId: params.agentId,
      capabilities: params.capabilities,
      version: params.version,
      token,
      registeredAt: new Date(),
      lastSeen: new Date()
    }

    this.registrations.set(params.agentId, registration)
    this.tokenToAgent.set(token, params.agentId)

    logInfo('Agent registered', {
      service: 'ClaudeCoordinationMock',
      agentId: params.agentId,
      capabilities: params.capabilities,
      version: params.version
    })

    return {
      success: true,
      data: token
    }
  }

  async getAvailableTasks(capabilities: AgentCapability[]): Promise<ServiceResponse<Task[]>> {
    await this.simulateDelay()

    // Get next available task from state store
    const availableTasks: Task[] = []

    // In a real implementation, we'd query all queued tasks
    // For mock, we'll dequeue up to 5 tasks to show
    for (let i = 0; i < 5; i++) {
      const result = await this.stateStore.dequeueTask(capabilities)
      if (result.success && result.data) {
        availableTasks.push(result.data)
        // Put it back as queued since we're just checking
        await this.stateStore.updateTaskStatus(result.data.id, 'queued')
      } else {
        break
      }
    }

    // Sort by priority (high → medium → low) and creation time
    const priorityOrder = { high: 3, medium: 2, low: 1 }
    availableTasks.sort((a, b) => {
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
      if (priorityDiff !== 0) return priorityDiff
      return a.createdAt.getTime() - b.createdAt.getTime()
    })

    return {
      success: true,
      data: availableTasks
    }
  }

  async claimTask(taskId: TaskId): Promise<ServiceResponse<Task>> {
    await this.simulateDelay()

    // Get task from state store
    const taskResult = await this.stateStore.getTask(taskId)
    if (!taskResult.success || !taskResult.data) {
      return {
        success: false,
        error: {
          code: 'TASK_NOT_FOUND',
          message: `Task ${taskId} not found`,
          retryable: false
        }
      }
    }

    const task = taskResult.data

    // Check if already claimed
    if (task.status !== 'queued') {
      return {
        success: false,
        error: {
          code: 'TASK_ALREADY_CLAIMED',
          message: `Task ${taskId} is already ${task.status}`,
          retryable: false,
          details: {
            currentStatus: task.status,
            assignedTo: task.assignedTo
          }
        }
      }
    }

    // Claim the task
    task.status = 'claimed'
    task.assignedTo = 'claude-code' // In real impl, would get from auth context
    await this.stateStore.updateTaskStatus(taskId, 'claimed')

    this.claimedTasks.set(taskId, 'claude-code')

    logInfo('Task claimed', {
      service: 'ClaudeCoordinationMock',
      taskId,
      description: task.description,
      type: task.type,
      priority: task.priority
    })

    return {
      success: true,
      data: task
    }
  }

  async reportProgress(taskId: TaskId, progress: TaskProgress): Promise<ServiceResponse<void>> {
    await this.simulateDelay()

    // Verify task exists and is assigned to Claude
    const taskResult = await this.stateStore.getTask(taskId)
    if (!taskResult.success || !taskResult.data) {
      return {
        success: false,
        error: {
          code: 'TASK_NOT_FOUND',
          message: `Task ${taskId} not found`,
          retryable: false
        }
      }
    }

    const task = taskResult.data
    if (task.assignedTo !== 'claude-code') {
      return {
        success: false,
        error: {
          code: 'TASK_NOT_ASSIGNED',
          message: `Task ${taskId} is not assigned to Claude Code`,
          retryable: false
        }
      }
    }

    // Update task status to in-progress if needed
    if (task.status === 'claimed') {
      await this.stateStore.updateTaskStatus(taskId, 'in-progress')
    }

    // In a real implementation, we'd store progress details
    logInfo('Task progress reported', {
      service: 'ClaudeCoordinationMock',
      taskId,
      percentComplete: progress.percentComplete,
      currentStep: progress.currentStep,
      filesModified: progress.filesModified?.length || 0
    })

    return { success: true }
  }

  async completeTask(taskId: TaskId, result: TaskResult): Promise<ServiceResponse<void>> {
    await this.simulateDelay()

    // Verify task exists and is assigned to Claude
    const taskResult = await this.stateStore.getTask(taskId)
    if (!taskResult.success || !taskResult.data) {
      return {
        success: false,
        error: {
          code: 'TASK_NOT_FOUND',
          message: `Task ${taskId} not found`,
          retryable: false
        }
      }
    }

    const task = taskResult.data
    if (task.assignedTo !== 'claude-code') {
      return {
        success: false,
        error: {
          code: 'TASK_NOT_ASSIGNED',
          message: `Task ${taskId} is not assigned to Claude Code`,
          retryable: false
        }
      }
    }

    // Update task with result
    await this.stateStore.updateTaskResult(taskId, result)

    // Clean up claimed task
    this.claimedTasks.delete(taskId)

    if (result.success) {
      logInfo('Task completed successfully', {
        service: 'ClaudeCoordinationMock',
        taskId,
        output: result.output?.substring(0, 100), // Truncate for logging
        filesModified: result.filesModified?.length || 0
      })
    } else {
      logError('Task completed with failure', result.error?.message, {
        service: 'ClaudeCoordinationMock',
        taskId,
        errorCode: result.error?.code
      })
    }

    return { success: true }
  }

  async retrieveContext(contextId: ContextId): Promise<ServiceResponse<ConversationContext>> {
    await this.simulateDelay()

    const result = await this.stateStore.loadContext(contextId)
    if (!result.success || !result.data) {
      return {
        success: false,
        error: {
          code: 'CONTEXT_NOT_FOUND',
          message: `Context ${contextId} not found`,
          retryable: false
        }
      }
    }

    logInfo('Context retrieved', {
      service: 'ClaudeCoordinationMock',
      contextId,
      messageCount: result.data.messages.length
    })

    return {
      success: true,
      data: result.data
    }
  }

  async saveContext(contextId: ContextId, context: ConversationContext): Promise<ServiceResponse<void>> {
    await this.simulateDelay()

    const result = await this.stateStore.saveContext(contextId, context)
    if (!result.success) {
      return result
    }

    logInfo('Context saved', {
      service: 'ClaudeCoordinationMock',
      contextId,
      messageCount: context.messages.length
    })

    return { success: true }
  }

  async requestHandoff(params: {
    taskId: TaskId
    toAgent: AgentId
    reason: string
    currentState: string
    nextSteps: string[]
  }): Promise<ServiceResponse<HandoffId>> {
    await this.simulateDelay()

    // Verify task exists and is assigned to Claude
    const taskResult = await this.stateStore.getTask(params.taskId)
    if (!taskResult.success || !taskResult.data) {
      return {
        success: false,
        error: {
          code: 'TASK_NOT_FOUND',
          message: `Task ${params.taskId} not found`,
          retryable: false
        }
      }
    }

    const task = taskResult.data
    if (task.assignedTo !== 'claude-code') {
      return {
        success: false,
        error: {
          code: 'TASK_NOT_ASSIGNED',
          message: `Task ${params.taskId} is not assigned to Claude Code`,
          retryable: false
        }
      }
    }

    // Create handoff request
    const handoffId = this.generateHandoffId()
    const handoff: HandoffRequest = {
      id: handoffId,
      taskId: params.taskId,
      fromAgent: 'claude-code',
      toAgent: params.toAgent,
      reason: params.reason,
      currentState: params.currentState,
      nextSteps: params.nextSteps,
      requestedAt: new Date(),
      status: 'pending'
    }

    this.handoffs.set(handoffId, handoff)

    // Update task status
    await this.stateStore.updateTaskStatus(params.taskId, 'handed-off')

    logInfo('Handoff requested', {
      service: 'ClaudeCoordinationMock',
      handoffId,
      taskId: params.taskId,
      fromAgent: 'claude-code',
      toAgent: params.toAgent,
      reason: params.reason
    })

    return {
      success: true,
      data: handoffId
    }
  }

  // ========== Testing Helpers ==========

  /**
   * Gets current registrations (for testing)
   */
  getRegistrations(): AgentRegistration[] {
    return Array.from(this.registrations.values())
  }

  /**
   * Gets pending handoffs (for testing)
   */
  getPendingHandoffs(): HandoffRequest[] {
    return Array.from(this.handoffs.values()).filter(h => h.status === 'pending')
  }

  /**
   * Accepts a handoff (for testing Copilot's perspective)
   */
  async acceptHandoff(handoffId: HandoffId, byAgent: AgentId): Promise<ServiceResponse<Task>> {
    const handoff = this.handoffs.get(handoffId)
    if (!handoff) {
      return {
        success: false,
        error: {
          code: 'HANDOFF_NOT_FOUND',
          message: `Handoff ${handoffId} not found`,
          retryable: false
        }
      }
    }

    if (handoff.toAgent !== byAgent) {
      return {
        success: false,
        error: {
          code: 'HANDOFF_NOT_FOR_AGENT',
          message: `Handoff is for ${handoff.toAgent}, not ${byAgent}`,
          retryable: false
        }
      }
    }

    // Get task and reassign
    const taskResult = await this.stateStore.getTask(handoff.taskId)
    if (!taskResult.success || !taskResult.data) {
      return {
        success: false,
        error: {
          code: 'TASK_NOT_FOUND',
          message: `Task ${handoff.taskId} not found`,
          retryable: false
        }
      }
    }

    const task = taskResult.data
    task.assignedTo = byAgent
    await this.stateStore.updateTaskStatus(handoff.taskId, 'in-progress')

    handoff.status = 'accepted'

    this.claimedTasks.set(handoff.taskId, byAgent)

    logInfo('Handoff accepted', {
      service: 'ClaudeCoordinationMock',
      handoffId,
      taskId: handoff.taskId,
      acceptedBy: byAgent
    })

    return {
      success: true,
      data: task
    }
  }

  /**
   * Resets all state (for testing)
   */
  async reset(): Promise<void> {
    this.registrations.clear()
    this.tokenToAgent.clear()
    this.handoffs.clear()
    this.claimedTasks.clear()
  }
}