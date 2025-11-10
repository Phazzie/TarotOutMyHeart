/**
 * @fileoverview Integration tests for real services with SQLite
 * @purpose Verify real service implementations work end-to-end
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { StateStoreSQLite } from '../../services/real/StateStoreSQLite'
import { ClaudeCoordinationService } from '../../services/real/ClaudeCoordinationService'
import { FileSystemCoordinationService } from '../../services/real/FileSystemCoordinationService'
import type { TaskId, AgentCapability } from '@contracts'
import { unlinkSync } from 'fs'

describe('Real Services Integration', () => {
  const TEST_DB = './test-coordination.db'
  let stateStore: StateStoreSQLite
  let claudeService: ClaudeCoordinationService
  let fileSystemService: FileSystemCoordinationService

  beforeEach(async () => {
    // Create fresh services for each test
    stateStore = new StateStoreSQLite(TEST_DB)
    await stateStore.initialize()

    claudeService = new ClaudeCoordinationService(stateStore)
    fileSystemService = new FileSystemCoordinationService(stateStore)
  })

  afterEach(async () => {
    // Cleanup
    await stateStore.close()
    try {
      unlinkSync(TEST_DB)
    } catch (e) {
      // File may not exist, ignore
    }
  })

  describe('StateStoreSQLite', () => {
    it('should initialize and create database file', async () => {
      expect(stateStore).toBeDefined()
    })

    it('should enqueue and dequeue tasks', async () => {
      const taskInput = {
        type: 'implement-feature' as const,
        description: 'Test task',
        status: 'queued' as const,
        priority: 'high' as const,
        context: {
          files: [],
          conversationHistory: [],
          requirements: 'Test requirements'
        },
        sessionId: 'test-session' as any,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      // Enqueue task
      const enqueueResult = await stateStore.enqueueTask(taskInput)
      expect(enqueueResult.success).toBe(true)
      expect(enqueueResult.data).toBeDefined()

      const taskId = enqueueResult.data!

      // Dequeue task
      const dequeueResult = await stateStore.dequeueTask(['typescript-development'] as AgentCapability[])
      expect(dequeueResult.success).toBe(true)
      expect(dequeueResult.data).toBeDefined()
      expect(dequeueResult.data!.id).toBe(taskId)
      expect(dequeueResult.data!.description).toBe('Test task')
    })

    it('should handle file locks', async () => {
      const testPath = '/src/test.ts'
      const agentId = 'claude-code' as const

      // Acquire lock
      const lockResult = await stateStore.acquireLock(testPath, agentId)
      expect(lockResult.success).toBe(true)
      expect(lockResult.data).toBeDefined()

      const lockToken = lockResult.data!

      // Try to acquire same lock (should fail)
      const secondLockResult = await stateStore.acquireLock(testPath, agentId)
      expect(secondLockResult.success).toBe(false)
      expect(secondLockResult.error?.code).toBe('FILE_ALREADY_LOCKED')

      // Release lock
      const releaseResult = await stateStore.releaseLock(lockToken)
      expect(releaseResult.success).toBe(true)

      // Now lock should be available
      const thirdLockResult = await stateStore.acquireLock(testPath, agentId)
      expect(thirdLockResult.success).toBe(true)
    })

    it('should save and load context', async () => {
      const contextId = 'test-context' as any
      const context = {
        id: contextId,
        messages: [
          {
            role: 'user' as const,
            content: 'Test message',
            timestamp: new Date()
          }
        ],
        sharedState: { testKey: 'testValue' },
        lastUpdated: new Date()
      }

      // Save context
      const saveResult = await stateStore.saveContext(contextId, context)
      expect(saveResult.success).toBe(true)

      // Load context
      const loadResult = await stateStore.loadContext(contextId)
      expect(loadResult.success).toBe(true)
      expect(loadResult.data).toBeDefined()
      expect(loadResult.data!.messages).toHaveLength(1)
      expect(loadResult.data!.messages[0].content).toBe('Test message')
    })
  })

  describe('ClaudeCoordinationService', () => {
    it('should register agent', async () => {
      const result = await claudeService.registerAgent({
        agentId: 'claude-code',
        capabilities: ['typescript-development', 'testing'],
        version: '1.0.0'
      })

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
    })

    it('should handle task workflow', async () => {
      // Register agent
      await claudeService.registerAgent({
        agentId: 'claude-code',
        capabilities: ['typescript-development'],
        version: '1.0.0'
      })

      // Enqueue a task
      const taskInput = {
        type: 'implement-feature' as const,
        description: 'Build feature X',
        status: 'queued' as const,
        priority: 'high' as const,
        context: {
          files: [],
          conversationHistory: [],
          requirements: 'Feature requirements'
        },
        sessionId: 'test-session' as any,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const enqueueResult = await stateStore.enqueueTask(taskInput)
      const taskId = enqueueResult.data!

      // Get available tasks
      const tasksResult = await claudeService.getAvailableTasks(['typescript-development'])
      expect(tasksResult.success).toBe(true)
      expect(tasksResult.data).toHaveLength(1)

      // Claim task
      const claimResult = await claudeService.claimTask(taskId)
      expect(claimResult.success).toBe(true)
      expect(claimResult.data!.status).toBe('claimed')

      // Report progress
      const progressResult = await claudeService.reportProgress(taskId, {
        percentComplete: 50,
        currentStep: 'Implementing',
        filesModified: ['src/feature.ts']
      })
      expect(progressResult.success).toBe(true)

      // Complete task
      const completeResult = await claudeService.completeTask(taskId, {
        success: true,
        output: 'Feature implemented',
        filesModified: ['src/feature.ts']
      })
      expect(completeResult.success).toBe(true)

      // Verify task is completed
      const taskResult = await stateStore.getTask(taskId)
      expect(taskResult.data!.status).toBe('completed')
    })
  })

  describe('FileSystemCoordinationService', () => {
    it('should grant file access', async () => {
      const result = await fileSystemService.requestFileAccess({
        path: '/src/App.tsx',
        operation: 'write',
        agentId: 'claude-code'
      })

      expect(result.success).toBe(true)
      expect(result.data!.granted).toBe(true)
      expect(result.data!.lockToken).toBeDefined()
    })

    it('should detect conflicts', async () => {
      const path = '/src/Config.ts'

      // Acquire lock
      const grant1 = await fileSystemService.requestFileAccess({
        path,
        operation: 'write',
        agentId: 'claude-code'
      })
      expect(grant1.data!.granted).toBe(true)

      // Try to acquire again
      const grant2 = await fileSystemService.requestFileAccess({
        path,
        operation: 'write',
        agentId: 'github-copilot'
      })
      expect(grant2.data!.granted).toBe(false)
      expect(grant2.data!.reason).toContain('locked')

      // Detect conflicts
      const conflicts = await fileSystemService.detectConflicts(path)
      expect(conflicts.success).toBe(true)
      expect(conflicts.data).toHaveLength(1)
    })
  })

  describe('End-to-End Workflow', () => {
    it('should complete full collaboration cycle', async () => {
      // 1. Register Claude
      const regResult = await claudeService.registerAgent({
        agentId: 'claude-code',
        capabilities: ['typescript-development'],
        version: '1.0.0'
      })
      expect(regResult.success).toBe(true)

      // 2. Enqueue task
      const taskResult = await stateStore.enqueueTask({
        type: 'implement-feature',
        description: 'Add authentication',
        status: 'queued',
        priority: 'high',
        context: {
          files: [],
          conversationHistory: [],
          requirements: 'OAuth2 authentication'
        },
        sessionId: 'collab-session' as any,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      const taskId = taskResult.data!

      // 3. Claim task
      const claimResult = await claudeService.claimTask(taskId)
      expect(claimResult.success).toBe(true)

      // 4. Request file access
      const fileAccess = await fileSystemService.requestFileAccess({
        path: '/src/auth/Login.ts',
        operation: 'write',
        agentId: 'claude-code'
      })
      expect(fileAccess.data!.granted).toBe(true)

      // 5. Report progress
      await claudeService.reportProgress(taskId, {
        percentComplete: 75,
        currentStep: 'Writing tests',
        filesModified: ['/src/auth/Login.ts', '/src/auth/Login.test.ts']
      })

      // 6. Complete task
      const completeResult = await claudeService.completeTask(taskId, {
        success: true,
        output: 'Authentication implemented with OAuth2',
        filesModified: ['/src/auth/Login.ts', '/src/auth/Login.test.ts']
      })
      expect(completeResult.success).toBe(true)

      // 7. Release file lock
      await fileSystemService.releaseFileAccess(fileAccess.data!)

      // 8. Verify final state
      const finalTask = await stateStore.getTask(taskId)
      expect(finalTask.data!.status).toBe('completed')
      expect(finalTask.data!.result?.success).toBe(true)
    })
  })
})
