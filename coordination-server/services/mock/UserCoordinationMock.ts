/**
 * @fileoverview Mock implementation of user coordination service
 * @purpose Allows users to control and monitor AI collaboration sessions
 * @dataFlow User (CLI/Web) → UserCoordination → StateStore → Session Management
 * @boundary Implements UserCoordinationContract seam (Seam #4)
 * @example
 * const service = new UserCoordinationMock(stateStore)
 * const session = await service.startCollaboration({ task: 'Build feature', mode: 'orchestrator-worker' })
 * const status = await service.getCollaborationStatus(session.data.id)
 */

import { v4 as uuidv4 } from 'uuid'
import type {
  UserCoordinationContract,
  StateStoreContract,
  CollaborationSession,
  CollaborationStatus,
  CollaborationEvent,
  CollaborationMode,
  ConflictResolution,
  ConversationContext,
  Task,
  TaskType,
  FileLock,
  FileConflict,
  AgentId,
  SessionId,
  ContextId,
  ConflictId,
  ServiceResponse,
  ServiceError,
} from '@contracts'

/**
 * Internal conflict tracking
 */
interface TrackedConflict {
  id: ConflictId
  conflict: FileConflict
  session: SessionId
  status: 'pending' | 'resolved'
  resolution?: ConflictResolution
}

/**
 * Mock implementation of user coordination service
 * Provides session management and monitoring capabilities
 */
export class UserCoordinationMock implements UserCoordinationContract {
  private stateStore: StateStoreContract
  private sessions: Map<SessionId, CollaborationSession> = new Map()
  private conflicts: Map<ConflictId, TrackedConflict> = new Map()
  private eventListeners: Map<SessionId, Array<(event: CollaborationEvent) => void>> = new Map()

  // Configuration
  private readonly SIMULATED_DELAY_MS = 50

  constructor(stateStore: StateStoreContract) {
    this.stateStore = stateStore
  }

  /**
   * Simulates operation delay
   */
  private async simulateDelay(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, this.SIMULATED_DELAY_MS))
  }

  /**
   * Generates a session ID
   */
  private generateSessionId(): SessionId {
    return `session_${uuidv4()}` as SessionId
  }

  /**
   * Generates a context ID
   */
  private generateContextId(): ContextId {
    return `context_${uuidv4()}` as ContextId
  }

  /**
   * Generates a conflict ID
   */
  private generateConflictId(): ConflictId {
    return `conflict_${uuidv4()}` as ConflictId
  }

  /**
   * Emits an event to all listeners for a session
   */
  private emitEvent(sessionId: SessionId, event: CollaborationEvent): void {
    const listeners = this.eventListeners.get(sessionId) || []
    for (const listener of listeners) {
      // Emit asynchronously to avoid blocking
      setTimeout(() => listener(event), 0)
    }
  }

  /**
   * Creates initial tasks for a collaboration session
   */
  private async createInitialTasks(
    sessionId: SessionId,
    taskDescription: string,
    mode: CollaborationMode
  ): Promise<Task[]> {
    const tasks: Task[] = []

    // Parse task description to determine what needs to be done
    const isComplexTask =
      taskDescription.length > 50 ||
      taskDescription.toLowerCase().includes('and') ||
      taskDescription.toLowerCase().includes('with')

    if (mode === 'orchestrator-worker') {
      // Create orchestration task for Claude
      const orchestrationTask: Omit<Task, 'id'> = {
        type: 'implement-feature',
        description: `[Orchestrator] Plan and coordinate: ${taskDescription}`,
        assignedTo: 'claude-code',
        status: 'queued',
        priority: 'high',
        context: {
          files: [],
          conversationHistory: [],
          requirements: taskDescription,
          constraints: [
            'Act as orchestrator',
            'Break down into subtasks',
            'Assign to Copilot as needed',
          ],
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        sessionId,
      }

      const result = await this.stateStore.enqueueTask(orchestrationTask)
      if (result.success && result.data) {
        const task = await this.stateStore.getTask(result.data)
        if (task.success && task.data) {
          tasks.push(task.data)
        }
      }
    } else if (mode === 'peer-to-peer') {
      // Split work between both agents
      const claudeTask: Omit<Task, 'id'> = {
        type: 'define-contract',
        description: `[Claude] Define contracts and architecture for: ${taskDescription}`,
        status: 'queued',
        priority: 'high',
        context: {
          files: [],
          conversationHistory: [],
          requirements: taskDescription,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        sessionId,
      }

      const copilotTask: Omit<Task, 'id'> = {
        type: 'implement-feature',
        description: `[Copilot] Implement UI components for: ${taskDescription}`,
        status: 'queued',
        priority: 'high',
        context: {
          files: [],
          conversationHistory: [],
          requirements: taskDescription,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        sessionId,
      }

      // Enqueue both tasks
      for (const taskDef of [claudeTask, copilotTask]) {
        const result = await this.stateStore.enqueueTask(taskDef)
        if (result.success && result.data) {
          const task = await this.stateStore.getTask(result.data)
          if (task.success && task.data) {
            tasks.push(task.data)
          }
        }
      }
    } else if (mode === 'parallel') {
      // Both work on the same task simultaneously
      const parallelTask: Omit<Task, 'id'> = {
        type: 'implement-feature',
        description: `[Parallel] ${taskDescription}`,
        status: 'queued',
        priority: 'high',
        context: {
          files: [],
          conversationHistory: [],
          requirements: taskDescription,
          constraints: ['Both agents work simultaneously', 'Coordinate file access'],
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        sessionId,
      }

      const result = await this.stateStore.enqueueTask(parallelTask)
      if (result.success && result.data) {
        const task = await this.stateStore.getTask(result.data)
        if (task.success && task.data) {
          tasks.push(task.data)
        }
      }
    }

    return tasks
  }

  async startCollaboration(params: {
    task: string
    preferredLead?: AgentId | 'auto'
    mode: CollaborationMode
    contextId?: ContextId
  }): Promise<ServiceResponse<CollaborationSession>> {
    await this.simulateDelay()

    // Create or use existing context
    const contextId = params.contextId || this.generateContextId()

    // Initialize context if new
    if (!params.contextId) {
      const context: ConversationContext = {
        id: contextId,
        messages: [
          {
            role: 'system',
            content: `Starting collaboration session for task: ${params.task}`,
            timestamp: new Date(),
            metadata: { mode: params.mode },
          },
        ],
        sharedState: {
          task: params.task,
          mode: params.mode,
        },
        lastUpdated: new Date(),
      }

      await this.stateStore.saveContext(contextId, context)
    }

    // Determine lead agent
    let leadAgent: AgentId | undefined
    if (params.preferredLead === 'auto') {
      // Auto-select based on mode and task
      if (params.mode === 'orchestrator-worker') {
        leadAgent = 'claude-code' // Claude is better at orchestration
      } else if (
        params.task.toLowerCase().includes('ui') ||
        params.task.toLowerCase().includes('component')
      ) {
        leadAgent = 'github-copilot' // Copilot for UI work
      } else {
        leadAgent = 'claude-code' // Default to Claude
      }
    } else if (params.preferredLead) {
      leadAgent = params.preferredLead as AgentId
    }

    // Create session
    const sessionId = this.generateSessionId()
    const session: CollaborationSession = {
      id: sessionId,
      task: params.task,
      mode: params.mode,
      leadAgent,
      participants: leadAgent
        ? [leadAgent, leadAgent === 'claude-code' ? 'github-copilot' : 'claude-code']
        : ['claude-code', 'github-copilot'],
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      contextId,
    }

    this.sessions.set(sessionId, session)

    // Create initial tasks
    const tasks = await this.createInitialTasks(sessionId, params.task, params.mode)

    console.log(`[UserCoordination] Started collaboration session: ${sessionId}`)
    console.log(`  Task: ${params.task}`)
    console.log(`  Mode: ${params.mode}`)
    console.log(`  Lead: ${leadAgent || 'none'}`)
    console.log(`  Initial tasks created: ${tasks.length}`)

    // Emit session started event
    this.emitEvent(sessionId, {
      type: 'session-resumed',
      timestamp: new Date(),
      data: session,
    })

    return {
      success: true,
      data: session,
    }
  }

  async pauseCollaboration(sessionId: SessionId): Promise<ServiceResponse<void>> {
    await this.simulateDelay()

    const session = this.sessions.get(sessionId)
    if (!session) {
      return {
        success: false,
        error: {
          code: 'SESSION_NOT_FOUND',
          message: `Session ${sessionId} not found`,
          retryable: false,
        },
      }
    }

    if (session.status !== 'active') {
      return {
        success: false,
        error: {
          code: 'SESSION_NOT_ACTIVE',
          message: `Session ${sessionId} is ${session.status}`,
          retryable: false,
        },
      }
    }

    session.status = 'paused'
    session.updatedAt = new Date()

    console.log(`[UserCoordination] Paused collaboration session: ${sessionId}`)

    // Emit pause event
    this.emitEvent(sessionId, {
      type: 'session-paused',
      timestamp: new Date(),
      data: { sessionId },
    })

    return { success: true }
  }

  async resumeCollaboration(sessionId: SessionId): Promise<ServiceResponse<void>> {
    await this.simulateDelay()

    const session = this.sessions.get(sessionId)
    if (!session) {
      return {
        success: false,
        error: {
          code: 'SESSION_NOT_FOUND',
          message: `Session ${sessionId} not found`,
          retryable: false,
        },
      }
    }

    if (session.status !== 'paused') {
      return {
        success: false,
        error: {
          code: 'SESSION_NOT_PAUSED',
          message: `Session ${sessionId} is ${session.status}`,
          retryable: false,
        },
      }
    }

    session.status = 'active'
    session.updatedAt = new Date()

    console.log(`[UserCoordination] Resumed collaboration session: ${sessionId}`)

    // Emit resume event
    this.emitEvent(sessionId, {
      type: 'session-resumed',
      timestamp: new Date(),
      data: { sessionId },
    })

    return { success: true }
  }

  async cancelCollaboration(sessionId: SessionId): Promise<ServiceResponse<void>> {
    await this.simulateDelay()

    const session = this.sessions.get(sessionId)
    if (!session) {
      return {
        success: false,
        error: {
          code: 'SESSION_NOT_FOUND',
          message: `Session ${sessionId} not found`,
          retryable: false,
        },
      }
    }

    session.status = 'cancelled'
    session.updatedAt = new Date()

    // Clean up event listeners
    this.eventListeners.delete(sessionId)

    console.log(`[UserCoordination] Cancelled collaboration session: ${sessionId}`)

    return { success: true }
  }

  async getCollaborationStatus(
    sessionId: SessionId
  ): Promise<ServiceResponse<CollaborationStatus>> {
    await this.simulateDelay()

    const session = this.sessions.get(sessionId)
    if (!session) {
      return {
        success: false,
        error: {
          code: 'SESSION_NOT_FOUND',
          message: `Session ${sessionId} not found`,
          retryable: false,
        },
      }
    }

    // Get all tasks for session
    const tasksResult = await this.stateStore.getSessionTasks(sessionId)
    const allTasks = tasksResult.success ? tasksResult.data || [] : []

    // Categorize tasks
    const activeTasks = allTasks.filter(t =>
      ['queued', 'claimed', 'in-progress', 'handed-off', 'blocked'].includes(t.status)
    )
    const completedTasks = allTasks.filter(t => t.status === 'completed')

    // Get current locks
    const locksResult = await this.stateStore.getAllLocks()
    const currentLocks = locksResult.success ? locksResult.data || [] : []

    // Get conflicts for this session
    const sessionConflicts: FileConflict[] = []
    for (const tracked of this.conflicts.values()) {
      if (tracked.session === sessionId && tracked.status === 'pending') {
        sessionConflicts.push(tracked.conflict)
      }
    }

    // Calculate progress
    const tasksTotal = allTasks.length
    const tasksCompleted = completedTasks.length
    const percentComplete = tasksTotal > 0 ? Math.round((tasksCompleted / tasksTotal) * 100) : 0

    const status: CollaborationStatus = {
      session,
      activeTasks,
      completedTasks,
      currentLocks,
      conflicts: sessionConflicts,
      progress: {
        tasksTotal,
        tasksCompleted,
        percentComplete,
      },
    }

    return {
      success: true,
      data: status,
    }
  }

  async resolveConflict(
    conflictId: ConflictId,
    resolution: ConflictResolution
  ): Promise<ServiceResponse<void>> {
    await this.simulateDelay()

    const tracked = this.conflicts.get(conflictId)
    if (!tracked) {
      return {
        success: false,
        error: {
          code: 'CONFLICT_NOT_FOUND',
          message: `Conflict ${conflictId} not found`,
          retryable: false,
        },
      }
    }

    tracked.status = 'resolved'
    tracked.resolution = resolution

    console.log(`[UserCoordination] Resolved conflict: ${conflictId}`)
    console.log(`  Strategy: ${resolution.strategy}`)

    // Emit conflict resolved event
    this.emitEvent(tracked.session, {
      type: 'conflict-detected',
      timestamp: new Date(),
      data: {
        conflictId,
        resolution,
        conflict: tracked.conflict,
      },
    })

    return { success: true }
  }

  async *subscribeToUpdates(sessionId: SessionId): AsyncIterable<CollaborationEvent> {
    // Create event queue for this subscription
    const eventQueue: CollaborationEvent[] = []
    let isActive = true

    // Register listener
    const listener = (event: CollaborationEvent) => {
      eventQueue.push(event)
    }

    const listeners = this.eventListeners.get(sessionId) || []
    listeners.push(listener)
    this.eventListeners.set(sessionId, listeners)

    // Yield events as they arrive
    while (isActive) {
      if (eventQueue.length > 0) {
        const event = eventQueue.shift()!
        yield event
      } else {
        // Wait a bit before checking again
        await new Promise(resolve => setTimeout(resolve, 100))

        // Check if session still exists
        const session = this.sessions.get(sessionId)
        if (!session || session.status === 'cancelled' || session.status === 'completed') {
          isActive = false
        }
      }
    }

    // Cleanup listener
    const updatedListeners = (this.eventListeners.get(sessionId) || []).filter(l => l !== listener)
    if (updatedListeners.length === 0) {
      this.eventListeners.delete(sessionId)
    } else {
      this.eventListeners.set(sessionId, updatedListeners)
    }
  }

  // ========== Testing Helpers ==========

  /**
   * Adds a conflict for testing
   */
  addConflict(sessionId: SessionId, conflict: FileConflict): ConflictId {
    const conflictId = this.generateConflictId()
    this.conflicts.set(conflictId, {
      id: conflictId,
      conflict,
      session: sessionId,
      status: 'pending',
    })

    // Emit conflict event
    this.emitEvent(sessionId, {
      type: 'conflict-detected',
      timestamp: new Date(),
      data: { conflictId, conflict },
    })

    return conflictId
  }

  /**
   * Simulates task progress (for testing)
   */
  async simulateTaskProgress(sessionId: SessionId): Promise<void> {
    const tasksResult = await this.stateStore.getSessionTasks(sessionId)
    if (!tasksResult.success || !tasksResult.data) return

    for (const task of tasksResult.data) {
      if (task.status === 'queued') {
        await this.stateStore.updateTaskStatus(task.id, 'in-progress')

        this.emitEvent(sessionId, {
          type: 'task-claimed',
          timestamp: new Date(),
          data: { taskId: task.id, agentId: task.assignedTo },
        })

        // Simulate completion after delay
        setTimeout(async () => {
          await this.stateStore.updateTaskResult(task.id, {
            success: true,
            output: 'Task completed successfully (simulated)',
            filesModified: [],
          })

          this.emitEvent(sessionId, {
            type: 'task-completed',
            timestamp: new Date(),
            data: { taskId: task.id },
          })
        }, 2000)
      }
    }
  }

  /**
   * Gets all active sessions (for testing)
   */
  getActiveSessions(): CollaborationSession[] {
    return Array.from(this.sessions.values()).filter(s => s.status === 'active')
  }

  /**
   * Resets all state (for testing)
   */
  async reset(): Promise<void> {
    this.sessions.clear()
    this.conflicts.clear()
    this.eventListeners.clear()
  }
}
