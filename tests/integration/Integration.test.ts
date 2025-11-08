/**
 * AI Coordination Server Integration Tests
 *
 * Tests the integration of all coordination services working together
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { StateStoreMock } from '../../services/mock/StateStoreMock'
import { ClaudeCoordinationMock } from '../../services/mock/ClaudeCoordinationMock'
import { CopilotCoordinationMock } from '../../services/mock/CopilotCoordinationMock'
import { UserCoordinationMock } from '../../services/mock/UserCoordinationMock'
import { FileSystemCoordinationMock } from '../../services/mock/FileSystemCoordinationMock'
import {
  TaskStatus,
  TaskPriority,
  ClaudeTaskType,
  CopilotTaskType,
  UserRequestType,
} from '../../contracts'

describe('AI Coordination Server Integration', () => {
  let stateStore: StateStoreMock
  let claudeCoord: ClaudeCoordinationMock
  let copilotCoord: CopilotCoordinationMock
  let userCoord: UserCoordinationMock
  let fileSystem: FileSystemCoordinationMock

  beforeEach(() => {
    stateStore = new StateStoreMock()
    claudeCoord = new ClaudeCoordinationMock()
    copilotCoord = new CopilotCoordinationMock()
    userCoord = new UserCoordinationMock()
    fileSystem = new FileSystemCoordinationMock()
  })

  describe('Multi-Agent Workflow', () => {
    it('should coordinate a code review workflow', async () => {
      // 1. Create a file
      await fileSystem.createFile('/src/feature.ts', 'initial code', 'user')

      // 2. Copilot generates code
      const copilotTask = await copilotCoord.assignTask({
        taskType: CopilotTaskType.CODE_COMPLETION,
        prompt: 'Complete the function',
        filePath: '/src/feature.ts',
      })

      expect(copilotTask.success).toBe(true)

      // 3. Wait for Copilot to finish
      await new Promise(resolve => setTimeout(resolve, 150))

      const copilotResult = await copilotCoord.getTaskResult(copilotTask.data!.taskId)
      expect(copilotResult.success).toBe(true)

      // 4. Update file with Copilot's code
      await fileSystem.writeFile('/src/feature.ts', copilotResult.data!.content, 'copilot')

      // 5. Request user approval
      const userRequest = await userCoord.createRequest({
        type: UserRequestType.APPROVE_CHANGE,
        title: 'Review Copilot changes',
        description: 'Copilot has completed the code',
        requestedBy: 'copilot',
        context: { file: '/src/feature.ts' },
      })

      expect(userRequest.success).toBe(true)

      // 6. User approves
      await userCoord.respondToRequest({
        requestId: userRequest.data!.id,
        approved: true,
        respondedAt: new Date(),
      })

      // 7. Claude reviews the code
      const claudeTask = await claudeCoord.assignTask({
        taskType: ClaudeTaskType.CODE_REVIEW,
        prompt: 'Review the implementation',
        contextFiles: ['/src/feature.ts'],
      })

      await new Promise(resolve => setTimeout(resolve, 150))

      const claudeResult = await claudeCoord.getTaskResult(claudeTask.data!.taskId)
      expect(claudeResult.success).toBe(true)

      // 8. Send notification to user
      await userCoord.sendNotification({
        level: 'success',
        message: 'Code review complete',
        from: 'claude',
        data: { review: claudeResult.data!.content },
      })

      // Verify final state
      const fileHistory = await fileSystem.getFileHistory('/src/feature.ts')
      expect(fileHistory.data!.length).toBeGreaterThan(0)

      const notifications = await userCoord.getNotifications()
      expect(notifications.data!.length).toBeGreaterThan(0)
    })

    it('should handle file conflicts between agents', async () => {
      // 1. Create initial file
      await fileSystem.createFile('/src/shared.ts', 'original', 'user')

      // 2. Claude modifies the file
      await fileSystem.writeFile('/src/shared.ts', 'claude version', 'claude')

      // 3. Copilot also modifies the file
      await fileSystem.writeFile('/src/shared.ts', 'copilot version', 'copilot')

      // 4. Detect conflicts
      const conflicts = await fileSystem.detectConflicts()

      // 5. Create user request to resolve conflict
      const userRequest = await userCoord.createRequest({
        type: UserRequestType.RESOLVE_CONFLICT,
        title: 'Resolve file conflict',
        description: 'Claude and Copilot both modified /src/shared.ts',
        requestedBy: 'system' as 'claude', // System would be represented by one of the agents
      })

      expect(userRequest.success).toBe(true)

      // 6. User resolves
      await userCoord.respondToRequest({
        requestId: userRequest.data!.id,
        approved: true,
        value: 'merge',
        respondedAt: new Date(),
      })

      // 7. Apply resolution if conflict was detected
      if (conflicts.data && conflicts.data.length > 0) {
        await fileSystem.resolveConflict(conflicts.data[0].id, {
          resolvedBy: 'user',
          resolvedAt: new Date(),
          finalContent: 'merged version',
          strategy: 'merge',
        })
      }

      const fileContent = await fileSystem.readFile('/src/shared.ts', 'user')
      expect(fileContent.success).toBe(true)
    })
  })

  describe('Task Coordination', () => {
    it('should coordinate tasks between state store and agents', async () => {
      // 1. Add tasks to state store
      const task1 = await stateStore.enqueueTask({
        description: 'Generate documentation',
        priority: TaskPriority.HIGH,
        status: TaskStatus.PENDING,
      })

      const task2 = await stateStore.enqueueTask({
        description: 'Review code',
        priority: TaskPriority.MEDIUM,
        status: TaskStatus.PENDING,
      })

      // 2. Claude picks up highest priority task
      const claudeTask = await stateStore.dequeueTask('claude')
      expect(claudeTask?.id).toBe(task1.id)
      expect(claudeTask?.assignedAgent).toBe('claude')

      // 3. Assign to Claude coordination
      await claudeCoord.assignTask({
        taskType: ClaudeTaskType.DOCUMENTATION,
        prompt: claudeTask!.description,
      })

      // 4. Copilot picks up next task
      const copilotTask = await stateStore.dequeueTask('copilot')
      expect(copilotTask?.id).toBe(task2.id)

      // 5. Assign to Copilot coordination
      await copilotCoord.assignTask({
        taskType: CopilotTaskType.CODE_SUGGESTION,
        prompt: copilotTask!.description,
      })

      // 6. Wait for completion
      await new Promise(resolve => setTimeout(resolve, 150))

      // 7. Mark tasks as completed
      await stateStore.updateTaskStatus(task1.id, TaskStatus.COMPLETED)
      await stateStore.updateTaskStatus(task2.id, TaskStatus.COMPLETED)

      // Verify both agents are idle
      const claudeStatus = await claudeCoord.getStatus()
      const copilotStatus = await copilotCoord.getStatus()

      expect(claudeStatus.data?.completedTasks).toBeGreaterThan(0)
      expect(copilotStatus.data?.completedTasks).toBeGreaterThan(0)
    })

    it('should use file locks to prevent concurrent modifications', async () => {
      const filePath = '/src/critical.ts'
      await fileSystem.createFile(filePath, 'critical code', 'user')

      // 1. Claude acquires lock
      const claudeLock = await stateStore.acquireFileLock(filePath, 'claude')
      expect(claudeLock).toBe(true)

      // 2. Copilot tries to acquire lock (should fail)
      const copilotLock = await stateStore.acquireFileLock(filePath, 'copilot')
      expect(copilotLock).toBe(false)

      // 3. Claude modifies file
      await fileSystem.writeFile(filePath, 'modified by claude', 'claude')

      // 4. Claude releases lock
      await stateStore.releaseFileLock(filePath, 'claude')

      // 5. Now Copilot can acquire lock
      const copilotLock2 = await stateStore.acquireFileLock(filePath, 'copilot')
      expect(copilotLock2).toBe(true)

      // 6. Copilot modifies file
      await fileSystem.writeFile(filePath, 'modified by copilot', 'copilot')

      const history = await fileSystem.getFileHistory(filePath)
      expect(history.data!.length).toBe(3) // create, claude write, copilot write
    })
  })

  describe('Context Sharing', () => {
    it('should share context between agents via state store', async () => {
      // 1. Claude sets context about current work
      await stateStore.setContext(
        'current-feature',
        {
          name: 'user-authentication',
          status: 'in-progress',
          files: ['/src/auth.ts'],
        },
        'claude'
      )

      // 2. Copilot reads the context
      const context = await stateStore.getContext('current-feature')
      expect(context).toBeDefined()
      expect(context?.setBy).toBe('claude')

      // 3. Copilot can use this context
      const contextData = context!.value as { name: string; files: string[] }
      await copilotCoord.assignTask({
        taskType: CopilotTaskType.UNIT_TEST,
        prompt: `Generate tests for ${contextData.name}`,
        filePath: contextData.files[0],
      })

      await new Promise(resolve => setTimeout(resolve, 150))

      // 4. Copilot updates context
      await stateStore.setContext(
        'current-feature',
        {
          name: 'user-authentication',
          status: 'testing',
          files: ['/src/auth.ts', '/tests/auth.test.ts'],
        },
        'copilot'
      )

      const updatedContext = await stateStore.getContext('current-feature')
      expect(updatedContext?.setBy).toBe('copilot')
    })
  })

  describe('Error Handling', () => {
    it('should handle agent unavailability gracefully', async () => {
      // Check if agents are available
      const claudeAvailable = await claudeCoord.isAvailable()
      const copilotAvailable = await copilotCoord.isAvailable()

      expect(claudeAvailable).toBe(true)
      expect(copilotAvailable).toBe(true)

      // Assign tasks to make them busy
      await claudeCoord.assignTask({
        taskType: ClaudeTaskType.CODE_GENERATION,
        prompt: 'Generate code',
      })

      await copilotCoord.assignTask({
        taskType: CopilotTaskType.CODE_COMPLETION,
        prompt: 'Complete code',
      })

      // Now they should be unavailable
      const claudeBusy = await claudeCoord.isAvailable()
      const copilotBusy = await copilotCoord.isAvailable()

      expect(claudeBusy).toBe(false)
      expect(copilotBusy).toBe(false)
    })

    it('should handle task failures', async () => {
      const task = await stateStore.enqueueTask({
        description: 'Task that might fail',
        priority: TaskPriority.MEDIUM,
        status: TaskStatus.PENDING,
      })

      // Simulate task failure
      await stateStore.updateTaskStatus(task.id, TaskStatus.FAILED)

      // Send notification about failure
      await userCoord.sendNotification({
        level: 'error',
        message: 'Task failed',
        from: 'claude',
        data: { taskId: task.id },
      })

      const notifications = await userCoord.getNotifications()
      const errorNotif = notifications.data!.find(n => n.level === 'error')
      expect(errorNotif).toBeDefined()
    })
  })

  describe('Complete Workflow Scenario', () => {
    it('should complete a full feature development workflow', async () => {
      // Phase 1: Planning
      await stateStore.setContext('project-phase', 'planning', 'user', true)

      // Phase 2: File creation
      await fileSystem.createFile('/src/feature.ts', '// TODO: Implement feature', 'user')
      await fileSystem.createFile('/tests/feature.test.ts', '// TODO: Add tests', 'user')

      // Phase 3: Copilot implements feature
      await stateStore.acquireFileLock('/src/feature.ts', 'copilot')

      const copilotImpl = await copilotCoord.assignTask({
        taskType: CopilotTaskType.CODE_COMPLETION,
        prompt: 'Implement user authentication feature',
        filePath: '/src/feature.ts',
      })

      await new Promise(resolve => setTimeout(resolve, 150))

      const implResult = await copilotCoord.getTaskResult(copilotImpl.data!.taskId)
      await fileSystem.writeFile('/src/feature.ts', implResult.data!.content, 'copilot')
      await stateStore.releaseFileLock('/src/feature.ts', 'copilot')

      // Phase 4: Claude generates tests
      await stateStore.acquireFileLock('/tests/feature.test.ts', 'claude')

      const claudeTests = await claudeCoord.assignTask({
        taskType: ClaudeTaskType.TESTING,
        prompt: 'Generate comprehensive tests',
        contextFiles: ['/src/feature.ts', '/tests/feature.test.ts'],
      })

      await new Promise(resolve => setTimeout(resolve, 150))

      const testsResult = await claudeCoord.getTaskResult(claudeTests.data!.taskId)
      await fileSystem.writeFile('/tests/feature.test.ts', testsResult.data!.content, 'claude')
      await stateStore.releaseFileLock('/tests/feature.test.ts', 'claude')

      // Phase 5: Request user review
      const reviewRequest = await userCoord.createRequest({
        type: UserRequestType.REVIEW_OUTPUT,
        title: 'Review completed feature',
        description: 'Feature implementation and tests are ready',
        requestedBy: 'claude',
        context: {
          files: ['/src/feature.ts', '/tests/feature.test.ts'],
        },
      })

      // Phase 6: User approves
      await userCoord.respondToRequest({
        requestId: reviewRequest.data!.id,
        approved: true,
        comment: 'Looks good!',
        respondedAt: new Date(),
      })

      // Phase 7: Send completion notification
      await userCoord.sendNotification({
        level: 'success',
        message: 'Feature development complete',
        from: 'system' as 'claude',
        data: {
          feature: 'user-authentication',
          files: 2,
          status: 'approved',
        },
      })

      // Phase 8: Update project phase
      await stateStore.setContext('project-phase', 'completed', 'user', true)

      // Verify the entire workflow
      const fileHistory = await fileSystem.getAllChanges()
      expect(fileHistory.data!.length).toBeGreaterThan(0)

      const finalPhase = await stateStore.getContext('project-phase')
      expect(finalPhase?.value).toBe('completed')

      const notifications = await userCoord.getNotifications()
      expect(notifications.data!.some(n => n.level === 'success')).toBe(true)

      const claudeStatus = await claudeCoord.getStatus()
      const copilotStatus = await copilotCoord.getStatus()

      expect(claudeStatus.data?.completedTasks).toBeGreaterThan(0)
      expect(copilotStatus.data?.completedTasks).toBeGreaterThan(0)
    })
  })
})
