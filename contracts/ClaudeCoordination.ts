/**
 * Claude Coordination Contract
 *
 * @purpose: Interface for coordinating with Claude AI agent
 * @requirement: AI-COORDINATION-002
 * @updated: 2025-11-08
 *
 * This seam provides:
 * - Task assignment to Claude
 * - Status monitoring
 * - Result retrieval
 */

import type { ServiceResponse } from './types/common'

/**
 * Types of tasks Claude can perform
 */
export enum ClaudeTaskType {
  CODE_REVIEW = 'code_review',
  CODE_GENERATION = 'code_generation',
  DOCUMENTATION = 'documentation',
  REFACTORING = 'refactoring',
  TESTING = 'testing',
  ANALYSIS = 'analysis',
}

/**
 * Claude's current status
 */
export enum ClaudeStatus {
  IDLE = 'idle',
  BUSY = 'busy',
  ERROR = 'error',
  OFFLINE = 'offline',
}

/**
 * Request to assign a task to Claude
 */
export interface ClaudeTaskRequest {
  /** Type of task */
  taskType: ClaudeTaskType

  /** Task description/prompt */
  prompt: string

  /** Context files for the task */
  contextFiles?: string[]

  /** Additional parameters */
  parameters?: Record<string, unknown>

  /** Priority level */
  priority?: number
}

/**
 * Claude task result
 */
export interface ClaudeTaskResult {
  /** Task ID */
  taskId: string

  /** Task type */
  taskType: ClaudeTaskType

  /** Generated content/response */
  content: string

  /** Modified files (if any) */
  modifiedFiles?: string[]

  /** Task metadata */
  metadata?: Record<string, unknown>

  /** When the task completed */
  completedAt: Date
}

/**
 * Claude agent status
 */
export interface ClaudeAgentStatus {
  /** Current status */
  status: ClaudeStatus

  /** Current task (if busy) */
  currentTask?: {
    taskId: string
    taskType: ClaudeTaskType
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
 * Claude Coordination Contract
 *
 * Interface for coordinating with Claude AI agent
 */
export interface IClaudeCoordination {
  /**
   * Assign a task to Claude
   */
  assignTask(request: ClaudeTaskRequest): Promise<ServiceResponse<{ taskId: string }>>

  /**
   * Get Claude's current status
   */
  getStatus(): Promise<ServiceResponse<ClaudeAgentStatus>>

  /**
   * Get task result
   */
  getTaskResult(taskId: string): Promise<ServiceResponse<ClaudeTaskResult>>

  /**
   * Cancel a task
   */
  cancelTask(taskId: string): Promise<ServiceResponse<void>>

  /**
   * Check if Claude is available
   */
  isAvailable(): Promise<boolean>

  /**
   * Get all pending tasks
   */
  getPendingTasks(): Promise<ServiceResponse<ClaudeTaskResult[]>>
}
