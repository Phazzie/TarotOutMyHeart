/**
 * User Coordination Mock Implementation
 *
 * Mock implementation of IUserCoordination for testing and development
 */

import type {
  IUserCoordination,
  UserRequest,
  UserResponse,
  UserNotification,
  ServiceResponse,
} from '../../contracts'

import { UserRequestStatus } from '../../contracts'

export class UserCoordinationMock implements IUserCoordination {
  private requests: Map<string, UserRequest> = new Map()
  private notifications: Map<string, UserNotification> = new Map()
  private requestIdCounter = 1
  private notificationIdCounter = 1

  async createRequest(
    request: Omit<UserRequest, 'id' | 'status' | 'createdAt'>
  ): Promise<ServiceResponse<UserRequest>> {
    const newRequest: UserRequest = {
      ...request,
      id: `request-${this.requestIdCounter++}`,
      status: UserRequestStatus.PENDING,
      createdAt: new Date(),
    }

    this.requests.set(newRequest.id, newRequest)

    return {
      success: true,
      data: newRequest,
    }
  }

  async getRequest(requestId: string): Promise<ServiceResponse<UserRequest>> {
    const request = this.requests.get(requestId)

    if (!request) {
      return {
        success: false,
        error: {
          code: 'REQUEST_NOT_FOUND',
          message: `Request ${requestId} not found`,
          retryable: false,
        },
      }
    }

    return {
      success: true,
      data: request,
    }
  }

  async getPendingRequests(): Promise<ServiceResponse<UserRequest[]>> {
    const pending = Array.from(this.requests.values())
      .filter(r => r.status === UserRequestStatus.PENDING)
      .filter(r => !r.expiresAt || r.expiresAt > new Date())

    return {
      success: true,
      data: pending,
    }
  }

  async respondToRequest(response: UserResponse): Promise<ServiceResponse<void>> {
    const request = this.requests.get(response.requestId)

    if (!request) {
      return {
        success: false,
        error: {
          code: 'REQUEST_NOT_FOUND',
          message: `Request ${response.requestId} not found`,
          retryable: false,
        },
      }
    }

    if (request.status !== UserRequestStatus.PENDING) {
      return {
        success: false,
        error: {
          code: 'REQUEST_ALREADY_RESPONDED',
          message: `Request ${response.requestId} has already been responded to`,
          retryable: false,
        },
      }
    }

    request.status = response.approved ? UserRequestStatus.APPROVED : UserRequestStatus.REJECTED

    return { success: true }
  }

  async sendNotification(
    notification: Omit<UserNotification, 'id' | 'read' | 'createdAt'>
  ): Promise<ServiceResponse<UserNotification>> {
    const newNotification: UserNotification = {
      ...notification,
      id: `notification-${this.notificationIdCounter++}`,
      read: false,
      createdAt: new Date(),
    }

    this.notifications.set(newNotification.id, newNotification)

    return {
      success: true,
      data: newNotification,
    }
  }

  async getNotifications(unreadOnly = false): Promise<ServiceResponse<UserNotification[]>> {
    let notifications = Array.from(this.notifications.values())

    if (unreadOnly) {
      notifications = notifications.filter(n => !n.read)
    }

    // Sort by newest first
    notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    return {
      success: true,
      data: notifications,
    }
  }

  async markNotificationRead(notificationId: string): Promise<ServiceResponse<void>> {
    const notification = this.notifications.get(notificationId)

    if (!notification) {
      return {
        success: false,
        error: {
          code: 'NOTIFICATION_NOT_FOUND',
          message: `Notification ${notificationId} not found`,
          retryable: false,
        },
      }
    }

    notification.read = true

    return { success: true }
  }

  async clearOldNotifications(olderThanMs: number): Promise<ServiceResponse<number>> {
    const cutoffTime = new Date(Date.now() - olderThanMs)
    let cleared = 0

    for (const [id, notification] of this.notifications.entries()) {
      if (notification.createdAt < cutoffTime) {
        this.notifications.delete(id)
        cleared++
      }
    }

    return {
      success: true,
      data: cleared,
    }
  }
}
