/**
 * @fileoverview Mock implementation of GitHub Copilot coordination service
 * @purpose Exposes coordination capabilities as MCP tools for Copilot integration
 * @dataFlow GitHub Copilot → MCP Tools → CopilotCoordination → StateStore
 * @boundary Implements CopilotCoordinationContract seam (Seam #2)
 * @example
 * const service = new CopilotCoordinationMock(stateStore, fileCoordination)
 * const tasks = await service.checkForTasks({ agentId: 'github-copilot', capabilities: [...] })
 * const result = await service.claimTaskTool({ taskId, agentId: 'github-copilot' })
 */

import type {
  CopilotCoordinationContract,
  StateStoreContract,
  FileSystemCoordinationContract,
  Task,
  TaskId,
  AgentId,
  AgentCapability,
  FileAccessGrant,
  LockToken,
  CollaborationStatus,
  CollaborationSession,
  FileLock,
  FileConflict,
  SessionId,
  ServiceResponse,
  ServiceError
} from '@contracts'

/**
 * Mock implementation of Copilot coordination service
 * Designed for autonomous MCP tool invocation
 */
export class CopilotCoordinationMock implements CopilotCoordinationContract {
  private stateStore: StateStoreContract
  private fileCoordination: FileSystemCoordinationContract | null
  private activeSessions: Map<SessionId, CollaborationSession> = new Map()

  // Track Copilot's state
  private copilotTasks: Map<TaskId, Task> = new Map()
  private copilotLocks: Map<string, LockToken> = new Map()

  // Configuration
  private readonly SIMULATED_DELAY_MS = 75 // Slightly faster than Claude

  constructor(
    stateStore: StateStoreContract,
    fileCoordination: FileSystemCoordinationContract | null = null
  ) {
    this.stateStore = stateStore
    this.fileCoordination = fileCoordination
  }

  /**
   * Simulates network/processing delay
   */
  private async simulateDelay(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, this.SIMULATED_DELAY_MS))
  }

  /**
   * MCP Tool: Check for available tasks
   * Copilot autonomously calls this to find work
   */
  async checkForTasks(params: {
    agentId: AgentId
    capabilities: AgentCapability[]
  }): Promise<ServiceResponse<Task[]>> {
    await this.simulateDelay()

    // Validate agent ID
    if (params.agentId !== 'github-copilot') {
      return {
        success: false,
        error: {
          code: 'INVALID_AGENT',
          message: 'This service is only for GitHub Copilot',
          retryable: false
        }
      }
    }

    // Get available tasks from state store
    const availableTasks: Task[] = []

    // Query for up to 3 tasks (Copilot works on fewer tasks at once)
    for (let i = 0; i < 3; i++) {
      const result = await this.stateStore.dequeueTask(params.capabilities)
      if (result.success && result.data) {
        availableTasks.push(result.data)
        // Put it back as queued since we're just checking
        await this.stateStore.updateTaskStatus(result.data.id, 'queued')
      } else {
        break
      }
    }

    console.log(`[CopilotCoordination] Found ${availableTasks.length} available tasks for capabilities:`, params.capabilities)

    return {
      success: true,
      data: availableTasks
    }
  }

  /**
   * MCP Tool: Claim a task
   * Copilot uses this to take ownership of a task
   */
  async claimTaskTool(params: {
    taskId: TaskId
    agentId: AgentId
  }): Promise<ServiceResponse<Task>> {
    await this.simulateDelay()

    // Validate agent ID
    if (params.agentId !== 'github-copilot') {
      return {
        success: false,
        error: {
          code: 'INVALID_AGENT',
          message: 'This service is only for GitHub Copilot',
          retryable: false
        }
      }
    }

    // Get task from state store
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

    // Check if already claimed
    if (task.status !== 'queued' && task.status !== 'handed-off') {
      return {
        success: false,
        error: {
          code: 'TASK_ALREADY_CLAIMED',
          message: `Task ${params.taskId} is ${task.status}`,
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
    task.assignedTo = 'github-copilot'
    await this.stateStore.updateTaskStatus(params.taskId, 'claimed')

    // Track in Copilot's tasks
    this.copilotTasks.set(params.taskId, task)

    console.log(`[CopilotCoordination] Task claimed by Copilot: ${params.taskId} - ${task.description}`)

    return {
      success: true,
      data: task
    }
  }

  /**
   * MCP Tool: Submit task result
   * Copilot uses this to report task completion
   */
  async submitTaskResult(params: {
    taskId: TaskId
    agentId: AgentId
    success: boolean
    output: string
    filesModified?: string[]
    error?: string
  }): Promise<ServiceResponse<void>> {
    await this.simulateDelay()

    // Validate agent ID
    if (params.agentId !== 'github-copilot') {
      return {
        success: false,
        error: {
          code: 'INVALID_AGENT',
          message: 'This service is only for GitHub Copilot',
          retryable: false
        }
      }
    }

    // Verify task is assigned to Copilot
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
    if (task.assignedTo !== 'github-copilot') {
      return {
        success: false,
        error: {
          code: 'TASK_NOT_ASSIGNED',
          message: `Task ${params.taskId} is not assigned to GitHub Copilot`,
          retryable: false
        }
      }
    }

    // Create task result
    const taskResult2 = {
      success: params.success,
      output: params.output,
      filesModified: params.filesModified || [],
      error: params.error ? {
        code: 'COPILOT_EXECUTION_ERROR',
        message: params.error,
        stack: undefined,
        retryable: false
      } : undefined
    }

    // Update task with result
    await this.stateStore.updateTaskResult(params.taskId, taskResult2)

    // Clean up Copilot's task tracking
    this.copilotTasks.delete(params.taskId)

    console.log(`[CopilotCoordination] Task ${params.success ? 'completed' : 'failed'}: ${params.taskId}`)
    if (params.filesModified && params.filesModified.length > 0) {
      console.log(`[CopilotCoordination] Files modified:`, params.filesModified)
    }

    return { success: true }
  }

  /**
   * MCP Tool: Request file access
   * Copilot uses this before modifying files
   */
  async requestFileAccess(params: {
    path: string
    operation: 'read' | 'write' | 'delete'
    agentId: AgentId
  }): Promise<ServiceResponse<FileAccessGrant>> {
    await this.simulateDelay()

    // Validate agent ID
    if (params.agentId !== 'github-copilot') {
      return {
        success: false,
        error: {
          code: 'INVALID_AGENT',
          message: 'This service is only for GitHub Copilot',
          retryable: false
        }
      }
    }

    // If no file coordination service, always grant access
    if (!this.fileCoordination) {
      console.log(`[CopilotCoordination] File access granted (no coordination): ${params.path} for ${params.operation}`)
      return {
        success: true,
        data: {
          path: params.path,
          operation: params.operation,
          granted: true
        }
      }
    }

    // Request access through file coordination
    const result = await this.fileCoordination.requestFileAccess(params)
    if (result.success && result.data?.lockToken) {
      // Track the lock for later release
      this.copilotLocks.set(params.path, result.data.lockToken)
    }

    console.log(`[CopilotCoordination] File access ${result.success ? 'granted' : 'denied'}: ${params.path} for ${params.operation}`)

    return result
  }

  /**
   * MCP Tool: Release file access
   * Copilot uses this after completing file operations
   */
  async releaseFileAccess(params: {
    lockToken: LockToken
    agentId: AgentId
  }): Promise<ServiceResponse<void>> {
    await this.simulateDelay()

    // Validate agent ID
    if (params.agentId !== 'github-copilot') {
      return {
        success: false,
        error: {
          code: 'INVALID_AGENT',
          message: 'This service is only for GitHub Copilot',
          retryable: false
        }
      }
    }

    // If no file coordination service, nothing to release
    if (!this.fileCoordination) {
      return { success: true }
    }

    // Find and remove from tracked locks
    let pathToRemove: string | undefined
    for (const [path, token] of this.copilotLocks.entries()) {
      if (token === params.lockToken) {
        pathToRemove = path
        break
      }
    }

    if (pathToRemove) {
      this.copilotLocks.delete(pathToRemove)
    }

    // Release through state store
    const result = await this.stateStore.releaseLock(params.lockToken)

    console.log(`[CopilotCoordination] Lock released: ${params.lockToken}`)

    return result
  }

  /**
   * MCP Tool: Get collaboration status
   * Copilot uses this to understand current session state
   */
  async getCollaborationStatus(params: {
    sessionId?: SessionId
  }): Promise<ServiceResponse<CollaborationStatus>> {
    await this.simulateDelay()

    // Get default session if not specified
    let sessionId = params.sessionId
    if (!sessionId && this.activeSessions.size > 0) {
      sessionId = Array.from(this.activeSessions.keys())[0]
    }

    if (!sessionId) {
      return {
        success: false,
        error: {
          code: 'NO_ACTIVE_SESSION',
          message: 'No active collaboration session',
          retryable: false
        }
      }
    }

    const session = this.activeSessions.get(sessionId)
    if (!session) {
      return {
        success: false,
        error: {
          code: 'SESSION_NOT_FOUND',
          message: `Session ${sessionId} not found`,
          retryable: false
        }
      }
    }

    // Get all tasks for session
    const tasksResult = await this.stateStore.getSessionTasks(sessionId)
    const allTasks = tasksResult.success ? (tasksResult.data || []) : []

    // Categorize tasks
    const activeTasks = allTasks.filter(t =>
      ['queued', 'claimed', 'in-progress', 'handed-off', 'blocked'].includes(t.status)
    )
    const completedTasks = allTasks.filter(t => t.status === 'completed')

    // Get current locks
    const locksResult = await this.stateStore.getAllLocks()
    const currentLocks = locksResult.success ? (locksResult.data || []) : []

    // Calculate progress
    const tasksTotal = allTasks.length
    const tasksCompleted = completedTasks.length
    const percentComplete = tasksTotal > 0
      ? Math.round((tasksCompleted / tasksTotal) * 100)
      : 0

    const status: CollaborationStatus = {
      session,
      activeTasks,
      completedTasks,
      currentLocks,
      conflicts: [], // No conflicts in mock
      progress: {
        tasksTotal,
        tasksCompleted,
        percentComplete
      }
    }

    console.log(`[CopilotCoordination] Status for session ${sessionId}: ${percentComplete}% complete (${tasksCompleted}/${tasksTotal})`)

    return {
      success: true,
      data: status
    }
  }

  // ========== Testing Helpers ==========

  /**
   * Sets an active session (for testing)
   */
  setActiveSession(session: CollaborationSession): void {
    this.activeSessions.set(session.id, session)
  }

  /**
   * Gets Copilot's current tasks (for testing)
   */
  getCopilotTasks(): Task[] {
    return Array.from(this.copilotTasks.values())
  }

  /**
   * Gets Copilot's current file locks (for testing)
   */
  getCopilotLocks(): Array<{ path: string, token: LockToken }> {
    return Array.from(this.copilotLocks.entries()).map(([path, token]) => ({
      path,
      token
    }))
  }

  /**
   * Releases all Copilot's locks (for emergency cleanup)
   */
  async releaseAllCopilotLocks(): Promise<void> {
    for (const [path, token] of this.copilotLocks.entries()) {
      await this.stateStore.releaseLock(token)
    }
    this.copilotLocks.clear()
    console.log('[CopilotCoordination] All Copilot locks released')
  }

  /**
   * Resets all state (for testing)
   */
  async reset(): Promise<void> {
    this.activeSessions.clear()
    this.copilotTasks.clear()
    this.copilotLocks.clear()
  }
}