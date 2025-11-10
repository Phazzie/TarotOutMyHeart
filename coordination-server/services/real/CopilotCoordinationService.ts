/**
 * @fileoverview Real implementation of GitHub Copilot coordination service (MCP tools)
 * @purpose Exposes coordination capabilities as MCP tools for GitHub Copilot
 * @dataFlow GitHub Copilot → MCP Tools → CopilotCoordination → StateStore → SQLite
 * @boundary Implements CopilotCoordinationContract seam (Seam #2)
 * @example
 * const service = new CopilotCoordinationService(stateStore, fileSystem)
 * const tasks = await service.checkForTasks({ agentId: 'github-copilot', capabilities: ['svelte-development'] })
 */

import type {
  CopilotCoordinationContract,
  StateStoreContract,
  FileSystemCoordinationContract,
  AgentId,
  AgentCapability,
  Task,
  TaskId,
  FileAccessGrant,
  LockToken,
  CollaborationStatus,
  SessionId,
  ContextId,
  ServiceResponse
} from '@contracts'

/**
 * Real implementation of GitHub Copilot coordination (MCP tools)
 * Simpler interface than Claude (Copilot is executor, not orchestrator)
 */
export class CopilotCoordinationService implements CopilotCoordinationContract {
  private stateStore: StateStoreContract
  private fileSystem: FileSystemCoordinationContract

  constructor(stateStore: StateStoreContract, fileSystem: FileSystemCoordinationContract) {
    this.stateStore = stateStore
    this.fileSystem = fileSystem
  }

  /**
   * MCP Tool: Check for available tasks
   */
  async checkForTasks(params: {
    agentId: AgentId
    capabilities: AgentCapability[]
  }): Promise<ServiceResponse<Task[]>> {
    try {
      const tasks: Task[] = []

      // Get next available task
      const result = await this.stateStore.dequeueTask(params.capabilities)
      if (!result.success) {
        return {
          success: false,
          error: result.error!
        }
      }

      if (result.data) {
        tasks.push(result.data)
      }

      return {
        success: true,
        data: tasks
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CHECK_TASKS_ERROR',
          message: `Failed to check for tasks: ${error instanceof Error ? error.message : 'Unknown error'}`,
          retryable: true
        }
      }
    }
  }

  /**
   * MCP Tool: Claim a task
   */
  async claimTaskTool(params: {
    taskId: TaskId
    agentId: AgentId
  }): Promise<ServiceResponse<Task>> {
    try {
      // Get the task
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

      // Check if task is available
      if (task.status !== 'queued') {
        return {
          success: false,
          error: {
            code: 'TASK_ALREADY_CLAIMED',
            message: `Task ${params.taskId} is already ${task.status}`,
            retryable: false
          }
        }
      }

      // Update task status
      await this.stateStore.updateTaskStatus(params.taskId, 'in-progress')

      console.log(`[CopilotCoordination] Task ${params.taskId} claimed by ${params.agentId}`)

      return {
        success: true,
        data: {
          ...task,
          status: 'in-progress',
          assignedTo: params.agentId
        }
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CLAIM_TASK_ERROR',
          message: `Failed to claim task: ${error instanceof Error ? error.message : 'Unknown error'}`,
          retryable: true
        }
      }
    }
  }

  /**
   * MCP Tool: Submit task result
   */
  async submitTaskResult(params: {
    taskId: TaskId
    agentId: AgentId
    success: boolean
    output: string
    filesModified?: string[]
    error?: string
  }): Promise<ServiceResponse<void>> {
    try {
      const result = {
        success: params.success,
        output: params.output,
        error: params.error ? {
          code: 'TASK_FAILED',
          message: params.error,
          retryable: true
        } : undefined,
        filesModified: params.filesModified || []
      }

      const updateResult = await this.stateStore.updateTaskResult(params.taskId, result)

      if (updateResult.success) {
        console.log(`[CopilotCoordination] Task ${params.taskId} completed by ${params.agentId}: ${params.success ? 'success' : 'failed'}`)
      }

      return updateResult
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SUBMIT_RESULT_ERROR',
          message: `Failed to submit task result: ${error instanceof Error ? error.message : 'Unknown error'}`,
          retryable: true
        }
      }
    }
  }

  /**
   * MCP Tool: Request file access
   */
  async requestFileAccess(params: {
    path: string
    operation: 'read' | 'write' | 'delete'
    agentId: AgentId
  }): Promise<ServiceResponse<FileAccessGrant>> {
    try {
      return await this.fileSystem.requestFileAccess(params)
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'FILE_ACCESS_ERROR',
          message: `Failed to request file access: ${error instanceof Error ? error.message : 'Unknown error'}`,
          retryable: true
        }
      }
    }
  }

  /**
   * MCP Tool: Release file access
   */
  async releaseFileAccess(params: {
    lockToken: LockToken
    agentId: AgentId
  }): Promise<ServiceResponse<void>> {
    try {
      const grant: FileAccessGrant = {
        path: '',
        operation: 'write',
        lockToken: params.lockToken,
        granted: true
      }

      return await this.fileSystem.releaseFileAccess(grant)
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'RELEASE_ACCESS_ERROR',
          message: `Failed to release file access: ${error instanceof Error ? error.message : 'Unknown error'}`,
          retryable: true
        }
      }
    }
  }

  /**
   * MCP Tool: Get collaboration status
   */
  async getCollaborationStatus(params: {
    sessionId?: SessionId
  }): Promise<ServiceResponse<CollaborationStatus>> {
    try {
      // Get tasks for session (if provided)
      const tasks: Task[] = []
      if (params.sessionId) {
        const tasksResult = await this.stateStore.getSessionTasks(params.sessionId)
        if (tasksResult.success && tasksResult.data) {
          tasks.push(...tasksResult.data)
        }
      }

      // Get all active file locks
      const locksResult = await this.stateStore.getAllLocks()
      const locks = locksResult.success ? locksResult.data || [] : []

      // Build status
      const status: CollaborationStatus = {
        session: {
          id: params.sessionId || ('' as SessionId),
          task: 'Unknown',
          mode: 'orchestrator-worker',
          leadAgent: undefined,
          participants: [],
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
          contextId: '' as ContextId
        },
        activeTasks: tasks.filter(t => t.status === 'in-progress' || t.status === 'claimed'),
        completedTasks: tasks.filter(t => t.status === 'completed'),
        currentLocks: locks,
        conflicts: [],
        progress: {
          tasksTotal: tasks.length,
          tasksCompleted: tasks.filter(t => t.status === 'completed').length,
          percentComplete: tasks.length > 0 ? Math.round((tasks.filter(t => t.status === 'completed').length / tasks.length) * 100) : 0
        }
      }

      return {
        success: true,
        data: status
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GET_STATUS_ERROR',
          message: `Failed to get collaboration status: ${error instanceof Error ? error.message : 'Unknown error'}`,
          retryable: true
        }
      }
    }
  }
}
