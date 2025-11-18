/**
 * @fileoverview AI Coordination Server Contracts
 * @purpose Define seams for Claude Code ↔ GitHub Copilot collaboration
 * @updated 2025-11-07
 *
 * This file defines contracts for 5 critical seams:
 * 1. Coordination Server ↔ Claude Code
 * 2. Coordination Server ↔ GitHub Copilot
 * 3. State Store ↔ Coordination Server
 * 4. User Interface ↔ Coordination Server
 * 5. File System ↔ Both AIs
 */

// ============================================================================
// CORE TYPES - Foundation for all coordination
// ============================================================================

/**
 * Unique identifier for AI agents in the system
 */
export type AgentId = 'claude-code' | 'github-copilot'

/**
 * Capabilities an AI agent can declare
 * Used for intelligent task routing
 */
export type AgentCapability =
  | 'typescript-development'
  | 'svelte-development'
  | 'testing'
  | 'code-review'
  | 'refactoring'
  | 'documentation'
  | 'debugging'
  | 'contract-definition'
  | 'mock-implementation'

/**
 * Types of tasks that can be assigned to AI agents
 */
export type TaskType =
  | 'implement-feature'
  | 'write-tests'
  | 'refactor-code'
  | 'fix-bug'
  | 'review-code'
  | 'update-docs'
  | 'define-contract'
  | 'implement-mock'

/**
 * Task lifecycle states
 */
export type TaskStatus =
  | 'queued' // Created but not claimed
  | 'claimed' // Agent has claimed but not started
  | 'in-progress' // Agent actively working
  | 'completed' // Successfully finished
  | 'failed' // Failed with error
  | 'handed-off' // Transferred to another agent
  | 'blocked' // Waiting on dependency

/**
 * Collaboration modes supported by the system
 */
export type CollaborationMode =
  | 'orchestrator-worker' // One lead agent coordinates
  | 'peer-to-peer' // Equal partners, handoffs
  | 'parallel' // Both work simultaneously

/**
 * Branded type for task identifiers
 * Prevents mixing up with other string IDs
 */
export type TaskId = string & { readonly __brand: 'TaskId' }

/**
 * Branded type for file lock tokens
 */
export type LockToken = string & { readonly __brand: 'LockToken' }

/**
 * Branded type for conversation context identifiers
 */
export type ContextId = string & { readonly __brand: 'ContextId' }

/**
 * Branded type for collaboration session identifiers
 */
export type SessionId = string & { readonly __brand: 'SessionId' }

/**
 * Branded type for conflict identifiers
 */
export type ConflictId = string & { readonly __brand: 'ConflictId' }

/**
 * Branded type for agent registration tokens
 */
export type RegistrationToken = string & { readonly __brand: 'RegistrationToken' }

// ============================================================================
// SEAM 1: Coordination Server ↔ Claude Code
// ============================================================================

/**
 * @seam coordination-claude
 * @purpose Enable Claude Code to participate in coordinated AI collaboration
 * @boundary Task assignment, status updates, context sharing
 * @updated 2025-11-07
 *
 * This seam allows Claude Code to:
 * - Register as an available agent
 * - Claim and execute tasks
 * - Report progress and completion
 * - Share conversation context
 * - Request handoffs to other agents
 */
export interface ClaudeCoordinationContract {
  /**
   * Register Claude Code agent with coordination server
   *
   * @param params - Agent capabilities and version info
   * @returns Registration token for subsequent requests
   *
   * @throws {RegistrationError} If agent already registered or invalid capabilities
   */
  registerAgent(params: {
    agentId: AgentId
    capabilities: AgentCapability[]
    version: string
  }): Promise<ServiceResponse<RegistrationToken>>

  /**
   * Retrieve available tasks matching agent's capabilities
   *
   * @param capabilities - What this agent can do
   * @returns Array of tasks sorted by priority
   */
  getAvailableTasks(capabilities: AgentCapability[]): Promise<ServiceResponse<Task[]>>

  /**
   * Claim a specific task for execution
   *
   * @param taskId - Task to claim
   * @returns Full task details with context
   *
   * @throws {TaskClaimError} If task already claimed or doesn't exist
   */
  claimTask(taskId: TaskId): Promise<ServiceResponse<Task>>

  /**
   * Report progress on an in-progress task
   *
   * @param taskId - Task being worked on
   * @param progress - Current state
   */
  reportProgress(taskId: TaskId, progress: TaskProgress): Promise<ServiceResponse<void>>

  /**
   * Mark task as completed with results
   *
   * @param taskId - Task that was completed
   * @param result - Outcome and artifacts
   */
  completeTask(taskId: TaskId, result: TaskResult): Promise<ServiceResponse<void>>

  /**
   * Retrieve shared conversation context
   *
   * @param contextId - Context to load
   * @returns Full conversation history and state
   */
  retrieveContext(contextId: ContextId): Promise<ServiceResponse<ConversationContext>>

  /**
   * Save updated conversation context
   *
   * @param contextId - Context to update
   * @param context - New context data
   */
  saveContext(contextId: ContextId, context: ConversationContext): Promise<ServiceResponse<void>>

  /**
   * Request handoff to another agent
   *
   * @param params - Handoff details
   * @returns Handoff ID for tracking
   */
  requestHandoff(params: {
    taskId: TaskId
    toAgent: AgentId
    reason: string
    currentState: string
    nextSteps: string[]
  }): Promise<ServiceResponse<HandoffId>>
}

// ============================================================================
// SEAM 2: Coordination Server ↔ GitHub Copilot
// ============================================================================

/**
 * @seam coordination-copilot
 * @purpose Enable GitHub Copilot to participate via MCP tools
 * @boundary Tool invocation, task execution, conflict resolution
 * @updated 2025-11-07
 *
 * This seam exposes coordination capabilities as MCP tools that
 * GitHub Copilot can autonomously invoke. Tools are designed to
 * match Copilot's natural workflow patterns.
 */
export interface CopilotCoordinationContract {
  /**
   * MCP Tool: Check for available tasks
   *
   * Copilot autonomously calls this to find work
   *
   * @tool checkForTasks
   */
  checkForTasks(params: {
    agentId: AgentId
    capabilities: AgentCapability[]
  }): Promise<ServiceResponse<Task[]>>

  /**
   * MCP Tool: Claim a task
   *
   * @tool claimTask
   */
  claimTaskTool(params: { taskId: TaskId; agentId: AgentId }): Promise<ServiceResponse<Task>>

  /**
   * MCP Tool: Submit task result
   *
   * @tool submitTaskResult
   */
  submitTaskResult(params: {
    taskId: TaskId
    agentId: AgentId
    success: boolean
    output: string
    filesModified?: string[]
    error?: string
  }): Promise<ServiceResponse<void>>

  /**
   * MCP Tool: Request file access
   *
   * @tool requestFileAccess
   */
  requestFileAccess(params: {
    path: string
    operation: 'read' | 'write' | 'delete'
    agentId: AgentId
  }): Promise<ServiceResponse<FileAccessGrant>>

  /**
   * MCP Tool: Release file access
   *
   * @tool releaseFileAccess
   */
  releaseFileAccess(params: {
    lockToken: LockToken
    agentId: AgentId
  }): Promise<ServiceResponse<void>>

  /**
   * MCP Tool: Get collaboration status
   *
   * @tool getCollaborationStatus
   */
  getCollaborationStatus(params: {
    sessionId?: SessionId
  }): Promise<ServiceResponse<CollaborationStatus>>
}

// ============================================================================
// SEAM 3: State Store ↔ Coordination Server
// ============================================================================

/**
 * @seam state-coordination
 * @purpose Persist coordination state across sessions
 * @boundary Task queue, file locks, conversation context
 * @updated 2025-11-07
 *
 * This seam abstracts persistence, allowing swap between:
 * - SQLite (simple, local)
 * - Redis (distributed, fast)
 * - In-memory (testing)
 */
export interface StateStoreContract {
  // ========== Task Queue Operations ==========

  /**
   * Add task to queue
   *
   * @param task - Task to enqueue
   * @returns Generated task ID
   */
  enqueueTask(task: Omit<Task, 'id'>): Promise<ServiceResponse<TaskId>>

  /**
   * Retrieve next task matching capabilities
   *
   * @param capabilities - Required agent capabilities
   * @returns Highest priority available task or null
   */
  dequeueTask(capabilities: AgentCapability[]): Promise<ServiceResponse<Task | null>>

  /**
   * Get task by ID
   *
   * @param taskId - Task to retrieve
   */
  getTask(taskId: TaskId): Promise<ServiceResponse<Task | null>>

  /**
   * Update task status
   *
   * @param taskId - Task to update
   * @param status - New status
   */
  updateTaskStatus(taskId: TaskId, status: TaskStatus): Promise<ServiceResponse<void>>

  /**
   * Update task with result
   *
   * @param taskId - Task to update
   * @param result - Execution result
   */
  updateTaskResult(taskId: TaskId, result: TaskResult): Promise<ServiceResponse<void>>

  /**
   * Get all tasks for a session
   *
   * @param sessionId - Session to query
   */
  getSessionTasks(sessionId: SessionId): Promise<ServiceResponse<Task[]>>

  // ========== File Lock Operations ==========

  /**
   * Acquire lock on file
   *
   * @param path - File path to lock
   * @param owner - Agent acquiring lock
   * @returns Lock token for release
   *
   * @throws {LockError} If file already locked
   */
  acquireLock(path: string, owner: AgentId): Promise<ServiceResponse<LockToken>>

  /**
   * Release lock on file
   *
   * @param lockToken - Token from acquireLock
   */
  releaseLock(lockToken: LockToken): Promise<ServiceResponse<void>>

  /**
   * Check if file is locked
   *
   * @param path - File path to check
   * @returns Lock details or null
   */
  isLocked(path: string): Promise<ServiceResponse<FileLock | null>>

  /**
   * Get all current locks
   *
   * @returns Array of active file locks
   */
  getAllLocks(): Promise<ServiceResponse<FileLock[]>>

  /**
   * Force release all locks owned by agent
   * Emergency operation for crashed agents
   *
   * @param owner - Agent whose locks to release
   */
  releaseAllLocksForAgent(owner: AgentId): Promise<ServiceResponse<number>>

  // ========== Context Operations ==========

  /**
   * Save conversation context
   *
   * @param contextId - Context identifier
   * @param context - Full context data
   */
  saveContext(contextId: ContextId, context: ConversationContext): Promise<ServiceResponse<void>>

  /**
   * Load conversation context
   *
   * @param contextId - Context to load
   */
  loadContext(contextId: ContextId): Promise<ServiceResponse<ConversationContext | null>>

  /**
   * Append message to context
   * More efficient than loading, modifying, saving
   *
   * @param contextId - Context to update
   * @param message - Message to append
   */
  appendMessage(contextId: ContextId, message: Message): Promise<ServiceResponse<void>>
}

// ============================================================================
// SEAM 4: User Interface ↔ Coordination Server
// ============================================================================

/**
 * @seam ui-coordination
 * @purpose User controls and monitors AI collaboration
 * @boundary Session management, conflict resolution, progress monitoring
 * @updated 2025-11-07
 *
 * This seam allows users to:
 * - Start collaboration sessions
 * - Monitor progress
 * - Resolve conflicts
 * - Pause/resume/cancel
 */
export interface UserCoordinationContract {
  /**
   * Start new collaboration session
   *
   * @param params - Session configuration
   * @returns Active session details
   */
  startCollaboration(params: {
    task: string
    preferredLead?: AgentId | 'auto'
    mode: CollaborationMode
    contextId?: ContextId
  }): Promise<ServiceResponse<CollaborationSession>>

  /**
   * Pause active collaboration
   *
   * @param sessionId - Session to pause
   */
  pauseCollaboration(sessionId: SessionId): Promise<ServiceResponse<void>>

  /**
   * Resume paused collaboration
   *
   * @param sessionId - Session to resume
   */
  resumeCollaboration(sessionId: SessionId): Promise<ServiceResponse<void>>

  /**
   * Cancel collaboration session
   *
   * @param sessionId - Session to cancel
   */
  cancelCollaboration(sessionId: SessionId): Promise<ServiceResponse<void>>

  /**
   * Get current collaboration status
   *
   * @param sessionId - Session to query
   */
  getCollaborationStatus(sessionId: SessionId): Promise<ServiceResponse<CollaborationStatus>>

  /**
   * Resolve conflict between AIs
   *
   * @param conflictId - Conflict to resolve
   * @param resolution - How to resolve
   */
  resolveConflict(
    conflictId: ConflictId,
    resolution: ConflictResolution
  ): Promise<ServiceResponse<void>>

  /**
   * Subscribe to collaboration events
   * Returns async iterator for real-time updates
   *
   * @param sessionId - Session to monitor
   */
  subscribeToUpdates(sessionId: SessionId): AsyncIterable<CollaborationEvent>
}

// ============================================================================
// SEAM 5: File System ↔ Both AIs
// ============================================================================

/**
 * @seam filesystem-agents
 * @purpose Coordinate file access between multiple AI agents
 * @boundary Read/write operations with conflict prevention
 * @updated 2025-11-07
 *
 * This seam prevents race conditions and conflicts when multiple
 * AIs work on the same codebase simultaneously.
 */
export interface FileSystemCoordinationContract {
  /**
   * Request permission to access file
   *
   * @param params - Access request details
   * @returns Grant with lock token if approved
   *
   * @throws {FileAccessError} If access denied or file locked
   */
  requestFileAccess(params: {
    path: string
    operation: 'read' | 'write' | 'delete'
    agentId: AgentId
  }): Promise<ServiceResponse<FileAccessGrant>>

  /**
   * Release file access grant
   *
   * @param grant - Grant to release
   */
  releaseFileAccess(grant: FileAccessGrant): Promise<ServiceResponse<void>>

  /**
   * Detect conflicts for file
   *
   * @param path - File to check
   * @returns Array of conflicts (empty if none)
   */
  detectConflicts(path: string): Promise<ServiceResponse<FileConflict[]>>

  /**
   * Batch request multiple files
   * Atomic operation - either all granted or none
   *
   * @param requests - Multiple file access requests
   * @returns Grants for all files or error
   */
  requestBatchFileAccess(requests: FileAccessRequest[]): Promise<ServiceResponse<FileAccessGrant[]>>
}

// ============================================================================
// DATA MODELS - Supporting types for contracts
// ============================================================================

/**
 * Complete task definition
 */
export interface Task {
  id: TaskId
  type: TaskType
  description: string
  assignedTo?: AgentId
  status: TaskStatus
  priority: 'low' | 'medium' | 'high'
  context: TaskContext
  createdAt: Date
  updatedAt: Date
  sessionId: SessionId
  dependencies?: TaskId[]
  result?: TaskResult
}

/**
 * Context required to execute a task
 */
export interface TaskContext {
  files: string[]
  conversationHistory: Message[]
  requirements: string
  constraints?: string[]
  relatedTasks?: TaskId[]
}

/**
 * Progress update for in-progress task
 */
export interface TaskProgress {
  percentComplete: number
  currentStep: string
  filesModified: string[]
  estimatedTimeRemaining?: number
}

/**
 * Result of task execution
 */
export interface TaskResult {
  success: boolean
  output: string
  filesModified: string[]
  testsRun?: TestResults
  error?: TaskError
}

/**
 * Error information for failed tasks
 */
export interface TaskError {
  code: string
  message: string
  stack?: string
  retryable: boolean
}

/**
 * Test execution results
 */
export interface TestResults {
  total: number
  passed: number
  failed: number
  skipped: number
  duration: number
  failures?: TestFailure[]
}

/**
 * Individual test failure details
 */
export interface TestFailure {
  testName: string
  error: string
  stack?: string
}

/**
 * File lock information
 */
export interface FileLock {
  path: string
  owner: AgentId
  lockToken: LockToken
  acquiredAt: Date
  expiresAt: Date
  operation: 'read' | 'write' | 'delete'
}

/**
 * File access grant
 */
export interface FileAccessGrant {
  path: string
  operation: 'read' | 'write' | 'delete'
  lockToken?: LockToken
  granted: boolean
  expiresAt?: Date
  reason?: string
}

/**
 * File access request
 */
export interface FileAccessRequest {
  path: string
  operation: 'read' | 'write' | 'delete'
  agentId: AgentId
}

/**
 * File conflict information
 */
export interface FileConflict {
  path: string
  agents: AgentId[]
  conflictType: 'simultaneous-write' | 'edit-deleted' | 'version-mismatch'
  detectedAt: Date
}

/**
 * Conversation context shared between AIs
 */
export interface ConversationContext {
  id: ContextId
  messages: Message[]
  sharedState: Record<string, unknown>
  lastUpdated: Date
}

/**
 * Individual message in conversation
 */
export interface Message {
  role: 'user' | 'claude' | 'copilot' | 'system'
  content: string
  timestamp: Date
  metadata?: Record<string, unknown>
}

/**
 * Active collaboration session
 */
export interface CollaborationSession {
  id: SessionId
  task: string
  mode: CollaborationMode
  leadAgent?: AgentId
  participants: AgentId[]
  status: 'active' | 'paused' | 'completed' | 'cancelled'
  createdAt: Date
  updatedAt: Date
  contextId: ContextId
}

/**
 * Current collaboration status
 */
export interface CollaborationStatus {
  session: CollaborationSession
  activeTasks: Task[]
  completedTasks: Task[]
  currentLocks: FileLock[]
  conflicts: FileConflict[]
  progress: {
    tasksTotal: number
    tasksCompleted: number
    percentComplete: number
  }
}

/**
 * Collaboration event for real-time updates
 */
export interface CollaborationEvent {
  type:
    | 'task-created'
    | 'task-claimed'
    | 'task-completed'
    | 'task-failed'
    | 'handoff-requested'
    | 'conflict-detected'
    | 'session-paused'
    | 'session-resumed'
  timestamp: Date
  data: unknown
}

/**
 * Conflict resolution strategy
 */
export interface ConflictResolution {
  strategy: 'claude-wins' | 'copilot-wins' | 'merge' | 'manual'
  mergeInstructions?: string
}

/**
 * Handoff identifier
 */
export type HandoffId = string & { readonly __brand: 'HandoffId' }

// ============================================================================
// SERVICE RESPONSE PATTERN (SDD Standard)
// ============================================================================

/**
 * Standard service response envelope
 * Used across all seams for consistency
 *
 * @template T - Type of success data
 */
export interface ServiceResponse<T> {
  success: boolean
  data?: T
  error?: ServiceError
}

/**
 * Standard error structure
 */
export interface ServiceError {
  code: string
  message: string
  retryable: boolean
  details?: Record<string, unknown>
}

// ============================================================================
// MCP TOOL DEFINITIONS
// ============================================================================

/**
 * MCP tool definition structure
 * Used to expose coordination capabilities to Copilot
 */
export interface MCPToolDefinition {
  name: string
  description: string
  inputSchema: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
}

/**
 * Generate MCP tool definitions from contract
 * Helper for server implementation
 */
export function generateMCPToolDefinitions(): MCPToolDefinition[] {
  return [
    {
      name: 'checkForTasks',
      description: 'Check for available tasks matching agent capabilities',
      inputSchema: {
        type: 'object',
        properties: {
          agentId: { type: 'string', enum: ['claude-code', 'github-copilot'] },
          capabilities: { type: 'array', items: { type: 'string' } },
        },
        required: ['agentId', 'capabilities'],
      },
    },
    {
      name: 'claimTask',
      description: 'Claim a task for execution',
      inputSchema: {
        type: 'object',
        properties: {
          taskId: { type: 'string' },
          agentId: { type: 'string' },
        },
        required: ['taskId', 'agentId'],
      },
    },
    {
      name: 'submitTaskResult',
      description: 'Submit task execution result',
      inputSchema: {
        type: 'object',
        properties: {
          taskId: { type: 'string' },
          agentId: { type: 'string' },
          success: { type: 'boolean' },
          output: { type: 'string' },
          filesModified: { type: 'array', items: { type: 'string' } },
          error: { type: 'string' },
        },
        required: ['taskId', 'agentId', 'success', 'output'],
      },
    },
    {
      name: 'requestFileAccess',
      description: 'Request permission to access a file',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          operation: { type: 'string', enum: ['read', 'write', 'delete'] },
          agentId: { type: 'string' },
        },
        required: ['path', 'operation', 'agentId'],
      },
    },
    {
      name: 'releaseFileAccess',
      description: 'Release file access lock',
      inputSchema: {
        type: 'object',
        properties: {
          lockToken: { type: 'string' },
          agentId: { type: 'string' },
        },
        required: ['lockToken', 'agentId'],
      },
    },
    {
      name: 'getCollaborationStatus',
      description: 'Get current collaboration session status',
      inputSchema: {
        type: 'object',
        properties: {
          sessionId: { type: 'string' },
        },
      },
    },
  ]
}
