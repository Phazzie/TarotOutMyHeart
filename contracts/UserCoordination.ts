/**
 * User Coordination Contract
 * 
 * @purpose: Interface for user interaction in the AI coordination system
 * @requirement: AI-COORDINATION-004
 * @updated: 2025-11-08
 * 
 * This seam provides:
 * - User request handling
 * - Decision points requiring user input
 * - User notification system
 */

import type { ServiceResponse } from './types/common'

/**
 * Types of user requests
 */
export enum UserRequestType {
  APPROVE_CHANGE = 'approve_change',
  PROVIDE_INPUT = 'provide_input',
  RESOLVE_CONFLICT = 'resolve_conflict',
  SELECT_OPTION = 'select_option',
  REVIEW_OUTPUT = 'review_output'
}

/**
 * User request status
 */
export enum UserRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  TIMEOUT = 'timeout'
}

/**
 * A request requiring user interaction
 */
export interface UserRequest {
  /** Request ID */
  id: string
  
  /** Type of request */
  type: UserRequestType
  
  /** Request title */
  title: string
  
  /** Request description */
  description: string
  
  /** Available options (for SELECT_OPTION type) */
  options?: string[]
  
  /** Current status */
  status: UserRequestStatus
  
  /** Agent that created the request */
  requestedBy: 'claude' | 'copilot'
  
  /** When the request was created */
  createdAt: Date
  
  /** When the request expires */
  expiresAt?: Date
  
  /** Additional context */
  context?: Record<string, unknown>
}

/**
 * User response to a request
 */
export interface UserResponse {
  /** Request ID */
  requestId: string
  
  /** User's decision */
  approved: boolean
  
  /** User's input/selection */
  value?: string
  
  /** User's comment */
  comment?: string
  
  /** When the response was given */
  respondedAt: Date
}

/**
 * User notification
 */
export interface UserNotification {
  /** Notification ID */
  id: string
  
  /** Notification level */
  level: 'info' | 'warning' | 'error' | 'success'
  
  /** Notification message */
  message: string
  
  /** Agent that sent the notification */
  from: 'claude' | 'copilot' | 'system'
  
  /** Whether the notification has been read */
  read: boolean
  
  /** When the notification was created */
  createdAt: Date
  
  /** Additional data */
  data?: Record<string, unknown>
}

/**
 * User Coordination Contract
 * 
 * Interface for user interaction in the AI coordination system
 */
export interface IUserCoordination {
  /**
   * Create a new user request
   */
  createRequest(request: Omit<UserRequest, 'id' | 'status' | 'createdAt'>): Promise<ServiceResponse<UserRequest>>
  
  /**
   * Get a user request by ID
   */
  getRequest(requestId: string): Promise<ServiceResponse<UserRequest>>
  
  /**
   * Get all pending user requests
   */
  getPendingRequests(): Promise<ServiceResponse<UserRequest[]>>
  
  /**
   * Respond to a user request
   */
  respondToRequest(response: UserResponse): Promise<ServiceResponse<void>>
  
  /**
   * Send a notification to the user
   */
  sendNotification(notification: Omit<UserNotification, 'id' | 'read' | 'createdAt'>): Promise<ServiceResponse<UserNotification>>
  
  /**
   * Get all notifications
   */
  getNotifications(unreadOnly?: boolean): Promise<ServiceResponse<UserNotification[]>>
  
  /**
   * Mark notification as read
   */
  markNotificationRead(notificationId: string): Promise<ServiceResponse<void>>
  
  /**
   * Clear old notifications
   */
  clearOldNotifications(olderThanMs: number): Promise<ServiceResponse<number>>
}
