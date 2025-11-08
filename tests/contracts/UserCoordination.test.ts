/**
 * User Coordination Contract Tests
 *
 * Tests that UserCoordinationMock satisfies the UserCoordination contract
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { UserCoordinationMock } from '../../services/mock/UserCoordinationMock'
import { UserRequestType, UserRequestStatus } from '../../contracts'

describe('UserCoordination Contract', () => {
  let coordination: UserCoordinationMock

  beforeEach(() => {
    coordination = new UserCoordinationMock()
  })

  describe('Request Creation', () => {
    it('should create a user request', async () => {
      const response = await coordination.createRequest({
        type: UserRequestType.APPROVE_CHANGE,
        title: 'Approve code changes',
        description: 'Please review and approve these changes',
        requestedBy: 'claude',
      })

      expect(response.success).toBe(true)
      expect(response.data?.id).toBeDefined()
      expect(response.data?.status).toBe(UserRequestStatus.PENDING)
      expect(response.data?.createdAt).toBeInstanceOf(Date)
    })

    it('should create requests of different types', async () => {
      const types = [
        UserRequestType.APPROVE_CHANGE,
        UserRequestType.PROVIDE_INPUT,
        UserRequestType.RESOLVE_CONFLICT,
        UserRequestType.SELECT_OPTION,
        UserRequestType.REVIEW_OUTPUT,
      ]

      for (const type of types) {
        const response = await coordination.createRequest({
          type,
          title: `Request ${type}`,
          description: 'Test request',
          requestedBy: 'copilot',
        })

        expect(response.success).toBe(true)
        expect(response.data?.type).toBe(type)
      }
    })

    it('should accept options for SELECT_OPTION requests', async () => {
      const options = ['Option A', 'Option B', 'Option C']
      const response = await coordination.createRequest({
        type: UserRequestType.SELECT_OPTION,
        title: 'Choose an option',
        description: 'Please select one',
        options,
        requestedBy: 'claude',
      })

      expect(response.data?.options).toEqual(options)
    })

    it('should accept expiration time', async () => {
      const expiresAt = new Date(Date.now() + 60000)
      const response = await coordination.createRequest({
        type: UserRequestType.PROVIDE_INPUT,
        title: 'Input needed',
        description: 'Please provide input',
        expiresAt,
        requestedBy: 'copilot',
      })

      expect(response.data?.expiresAt).toEqual(expiresAt)
    })

    it('should accept context data', async () => {
      const context = { file: 'test.ts', line: 42 }
      const response = await coordination.createRequest({
        type: UserRequestType.REVIEW_OUTPUT,
        title: 'Review output',
        description: 'Check this',
        context,
        requestedBy: 'claude',
      })

      expect(response.data?.context).toEqual(context)
    })
  })

  describe('Request Retrieval', () => {
    it('should get request by ID', async () => {
      const createResponse = await coordination.createRequest({
        type: UserRequestType.APPROVE_CHANGE,
        title: 'Test request',
        description: 'Test description',
        requestedBy: 'claude',
      })

      const requestId = createResponse.data!.id
      const getResponse = await coordination.getRequest(requestId)

      expect(getResponse.success).toBe(true)
      expect(getResponse.data?.id).toBe(requestId)
    })

    it('should return error for non-existent request', async () => {
      const response = await coordination.getRequest('non-existent-id')

      expect(response.success).toBe(false)
      expect(response.error?.code).toBe('REQUEST_NOT_FOUND')
    })

    it('should get all pending requests', async () => {
      await coordination.createRequest({
        type: UserRequestType.APPROVE_CHANGE,
        title: 'Request 1',
        description: 'Description 1',
        requestedBy: 'claude',
      })

      await coordination.createRequest({
        type: UserRequestType.PROVIDE_INPUT,
        title: 'Request 2',
        description: 'Description 2',
        requestedBy: 'copilot',
      })

      const response = await coordination.getPendingRequests()

      expect(response.success).toBe(true)
      expect(response.data).toHaveLength(2)
    })

    it('should exclude expired requests from pending', async () => {
      const pastDate = new Date(Date.now() - 1000)

      await coordination.createRequest({
        type: UserRequestType.APPROVE_CHANGE,
        title: 'Expired request',
        description: 'This expired',
        expiresAt: pastDate,
        requestedBy: 'claude',
      })

      const response = await coordination.getPendingRequests()
      expect(response.data).toHaveLength(0)
    })
  })

  describe('Request Response', () => {
    it('should respond to a request with approval', async () => {
      const createResponse = await coordination.createRequest({
        type: UserRequestType.APPROVE_CHANGE,
        title: 'Approve this',
        description: 'Please approve',
        requestedBy: 'claude',
      })

      const requestId = createResponse.data!.id

      const respondResponse = await coordination.respondToRequest({
        requestId,
        approved: true,
        respondedAt: new Date(),
      })

      expect(respondResponse.success).toBe(true)

      const getResponse = await coordination.getRequest(requestId)
      expect(getResponse.data?.status).toBe(UserRequestStatus.APPROVED)
    })

    it('should respond to a request with rejection', async () => {
      const createResponse = await coordination.createRequest({
        type: UserRequestType.APPROVE_CHANGE,
        title: 'Reject this',
        description: 'Please reject',
        requestedBy: 'copilot',
      })

      const requestId = createResponse.data!.id

      const respondResponse = await coordination.respondToRequest({
        requestId,
        approved: false,
        comment: 'Not ready yet',
        respondedAt: new Date(),
      })

      expect(respondResponse.success).toBe(true)

      const getResponse = await coordination.getRequest(requestId)
      expect(getResponse.data?.status).toBe(UserRequestStatus.REJECTED)
    })

    it('should accept value and comment', async () => {
      const createResponse = await coordination.createRequest({
        type: UserRequestType.SELECT_OPTION,
        title: 'Select option',
        description: 'Choose one',
        options: ['A', 'B', 'C'],
        requestedBy: 'claude',
      })

      const respondResponse = await coordination.respondToRequest({
        requestId: createResponse.data!.id,
        approved: true,
        value: 'B',
        comment: 'Option B looks best',
        respondedAt: new Date(),
      })

      expect(respondResponse.success).toBe(true)
    })

    it('should return error for non-existent request', async () => {
      const response = await coordination.respondToRequest({
        requestId: 'non-existent',
        approved: true,
        respondedAt: new Date(),
      })

      expect(response.success).toBe(false)
      expect(response.error?.code).toBe('REQUEST_NOT_FOUND')
    })

    it('should prevent responding to already-responded request', async () => {
      const createResponse = await coordination.createRequest({
        type: UserRequestType.APPROVE_CHANGE,
        title: 'Test',
        description: 'Test',
        requestedBy: 'claude',
      })

      const requestId = createResponse.data!.id

      // First response
      await coordination.respondToRequest({
        requestId,
        approved: true,
        respondedAt: new Date(),
      })

      // Second response should fail
      const secondResponse = await coordination.respondToRequest({
        requestId,
        approved: false,
        respondedAt: new Date(),
      })

      expect(secondResponse.success).toBe(false)
      expect(secondResponse.error?.code).toBe('REQUEST_ALREADY_RESPONDED')
    })
  })

  describe('Notifications', () => {
    it('should send a notification', async () => {
      const response = await coordination.sendNotification({
        level: 'info',
        message: 'Task completed',
        from: 'claude',
      })

      expect(response.success).toBe(true)
      expect(response.data?.id).toBeDefined()
      expect(response.data?.read).toBe(false)
      expect(response.data?.createdAt).toBeInstanceOf(Date)
    })

    it('should send notifications of different levels', async () => {
      const levels: Array<'info' | 'warning' | 'error' | 'success'> = [
        'info',
        'warning',
        'error',
        'success',
      ]

      for (const level of levels) {
        const response = await coordination.sendNotification({
          level,
          message: `${level} message`,
          from: 'copilot',
        })

        expect(response.success).toBe(true)
        expect(response.data?.level).toBe(level)
      }
    })

    it('should include notification data', async () => {
      const data = { taskId: 'task-123', progress: 75 }
      const response = await coordination.sendNotification({
        level: 'info',
        message: 'Progress update',
        from: 'claude',
        data,
      })

      expect(response.data?.data).toEqual(data)
    })

    it('should get all notifications', async () => {
      await coordination.sendNotification({
        level: 'info',
        message: 'Notification 1',
        from: 'claude',
      })

      await coordination.sendNotification({
        level: 'warning',
        message: 'Notification 2',
        from: 'copilot',
      })

      const response = await coordination.getNotifications()

      expect(response.success).toBe(true)
      expect(response.data).toHaveLength(2)
    })

    it('should get only unread notifications', async () => {
      const notif1 = await coordination.sendNotification({
        level: 'info',
        message: 'Unread notification',
        from: 'claude',
      })

      const notif2 = await coordination.sendNotification({
        level: 'info',
        message: 'Read notification',
        from: 'copilot',
      })

      await coordination.markNotificationRead(notif2.data!.id)

      const response = await coordination.getNotifications(true)

      expect(response.data).toBeDefined()
      expect(response.data).toHaveLength(1)
      expect(response.data![0]!.id).toBe(notif1.data!.id)
    })

    it('should sort notifications by newest first', async () => {
      const notif1 = await coordination.sendNotification({
        level: 'info',
        message: 'First',
        from: 'claude',
      })

      await new Promise(resolve => setTimeout(resolve, 10))

      const notif2 = await coordination.sendNotification({
        level: 'info',
        message: 'Second',
        from: 'copilot',
      })

      const response = await coordination.getNotifications()

      expect(response.data).toBeDefined()
      expect(response.data!.length).toBeGreaterThanOrEqual(2)
      expect(response.data![0]!.id).toBe(notif2.data!.id)
      expect(response.data![1]!.id).toBe(notif1.data!.id)
    })
  })

  describe('Notification Management', () => {
    it('should mark notification as read', async () => {
      const notifResponse = await coordination.sendNotification({
        level: 'info',
        message: 'Test notification',
        from: 'claude',
      })

      const notifId = notifResponse.data!.id

      const markResponse = await coordination.markNotificationRead(notifId)
      expect(markResponse.success).toBe(true)

      const getResponse = await coordination.getNotifications()
      const notification = getResponse.data!.find(n => n.id === notifId)
      expect(notification?.read).toBe(true)
    })

    it('should return error for non-existent notification', async () => {
      const response = await coordination.markNotificationRead('non-existent')

      expect(response.success).toBe(false)
      expect(response.error?.code).toBe('NOTIFICATION_NOT_FOUND')
    })

    it('should clear old notifications', async () => {
      await coordination.sendNotification({
        level: 'info',
        message: 'Old notification',
        from: 'claude',
      })

      await new Promise(resolve => setTimeout(resolve, 50))

      await coordination.sendNotification({
        level: 'info',
        message: 'Recent notification',
        from: 'copilot',
      })

      const response = await coordination.clearOldNotifications(30)

      expect(response.success).toBe(true)
      expect(response.data).toBeGreaterThan(0)

      const remaining = await coordination.getNotifications()
      expect(remaining.data!.length).toBeLessThan(2)
    })

    it('should return count of cleared notifications', async () => {
      await coordination.sendNotification({
        level: 'info',
        message: 'Notification 1',
        from: 'claude',
      })

      await coordination.sendNotification({
        level: 'info',
        message: 'Notification 2',
        from: 'copilot',
      })

      await new Promise(resolve => setTimeout(resolve, 50))

      const response = await coordination.clearOldNotifications(30)

      expect(response.data).toBe(2)
    })
  })
})
