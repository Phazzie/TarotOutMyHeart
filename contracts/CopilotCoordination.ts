/**
 * Copilot Coordination Contract
 * 
 * @purpose: Interface for coordinating with GitHub Copilot agent
 * @requirement: AI-COORDINATION-003
 * @updated: 2025-11-08
 * 
 * This seam provides:
 * - Task assignment to Copilot
 * - Code generation requests
 * - Status monitoring
 */

import type { ServiceResponse } from './types/common'

/**
 * Types of tasks Copilot can perform
 */
export enum CopilotTaskType {
  CODE_COMPLETION = 'code_completion',
  CODE_SUGGESTION = 'code_suggestion',
  INLINE_CHAT = 'inline_chat',
  WORKSPACE_EDIT = 'workspace_edit',
  UNIT_TEST = 'unit_test'
}

/**
 * Copilot's current status
 */
export enum CopilotStatus {
  IDLE = 'idle',
  BUSY = 'busy',
  ERROR = 'error',
  OFFLINE = 'offline'
}

/**
 * Request to assign a task to Copilot
 */
export interface CopilotTaskRequest {
  /** Type of task */
  taskType: CopilotTaskType
  
  /** Task description/prompt */
  prompt: string
  
  /** File context */
  filePath?: string
  
  /** Code context */
  codeContext?: string
  
  /** Additional parameters */
  parameters?: Record<string, unknown>
  
  /** Priority level */
  priority?: number
}

/**
 * Copilot task result
 */
export interface CopilotTaskResult {
  /** Task ID */
  taskId: string
  
  /** Task type */
  taskType: CopilotTaskType
  
  /** Generated code/content */
  content: string
  
  /** Suggested file path (if applicable) */
  suggestedPath?: string
  
  /** Confidence score (0-1) */
  confidence?: number
  
  /** Task metadata */
  metadata?: Record<string, unknown>
  
  /** When the task completed */
  completedAt: Date
}

/**
 * Copilot agent status
 */
export interface CopilotAgentStatus {
  /** Current status */
  status: CopilotStatus
  
  /** Current task (if busy) */
  currentTask?: {
    taskId: string
    taskType: CopilotTaskType
    startedAt: Date
  }
  
  /** Number of completed tasks */
  completedTasks: number
  
  /** Number of failed tasks */
  failedTasks: number
  
  /** Last active time */
  lastActive: Date
}

/**
 * Copilot Coordination Contract
 * 
 * Interface for coordinating with GitHub Copilot agent
 */
export interface ICopilotCoordination {
  /**
   * Assign a task to Copilot
   */
  assignTask(request: CopilotTaskRequest): Promise<ServiceResponse<{ taskId: string }>>
  
  /**
   * Get Copilot's current status
   */
  getStatus(): Promise<ServiceResponse<CopilotAgentStatus>>
  
  /**
   * Get task result
   */
  getTaskResult(taskId: string): Promise<ServiceResponse<CopilotTaskResult>>
  
  /**
   * Cancel a task
   */
  cancelTask(taskId: string): Promise<ServiceResponse<void>>
  
  /**
   * Check if Copilot is available
   */
  isAvailable(): Promise<boolean>
  
  /**
   * Get all pending tasks
   */
  getPendingTasks(): Promise<ServiceResponse<CopilotTaskResult[]>>
}
