/**
 * @fileoverview Mock implementation of file system coordination service
 * @purpose Prevents race conditions and conflicts between AI agents accessing files
 * @dataFlow AI Agents → FileSystemCoordination → StateStore → File Lock Registry
 * @boundary Implements FileSystemCoordinationContract seam (Seam #5)
 * @example
 * const service = new FileSystemCoordinationMock(stateStore)
 * const grant = await service.requestFileAccess({ path: '/src/App.tsx', operation: 'write', agentId: 'claude-code' })
 * await service.releaseFileAccess(grant.data)
 */

import type {
  FileSystemCoordinationContract,
  StateStoreContract,
  FileAccessGrant,
  FileAccessRequest,
  FileConflict,
  AgentId,
  LockToken,
  ServiceResponse,
  ServiceError,
} from '@contracts'

/**
 * File access rules for coordinating between agents
 */
interface AccessRules {
  allowMultipleReaders: boolean
  exclusiveWrite: boolean
  lockTimeout: number // milliseconds
}

/**
 * Active file access tracking
 */
interface ActiveAccess {
  path: string
  agentId: AgentId
  operation: 'read' | 'write' | 'delete'
  lockToken?: LockToken
  grantedAt: Date
  expiresAt: Date
}

/**
 * Mock implementation of file system coordination
 * Provides advisory locking to prevent conflicts
 */
export class FileSystemCoordinationMock implements FileSystemCoordinationContract {
  private stateStore: StateStoreContract
  private activeAccess: Map<string, ActiveAccess[]> = new Map()
  private conflicts: Map<string, FileConflict[]> = new Map()

  // Configuration
  private readonly rules: AccessRules = {
    allowMultipleReaders: true,
    exclusiveWrite: true,
    lockTimeout: 5 * 60 * 1000, // 5 minutes
  }
  private readonly SIMULATED_DELAY_MS = 25 // Fast file system checks

  constructor(stateStore: StateStoreContract) {
    this.stateStore = stateStore
  }

  /**
   * Simulates file system check delay
   */
  private async simulateDelay(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, this.SIMULATED_DELAY_MS))
  }

  /**
   * Checks if a file access request would conflict with existing access
   */
  private hasConflict(
    path: string,
    operation: 'read' | 'write' | 'delete',
    agentId: AgentId
  ): { hasConflict: boolean; reason?: string; conflictingAgent?: AgentId } {
    const currentAccess = this.activeAccess.get(path) || []

    // Remove expired access
    const now = Date.now()
    const validAccess = currentAccess.filter(a => a.expiresAt.getTime() > now)

    if (validAccess.length === 0) {
      return { hasConflict: false }
    }

    // Check for conflicts based on operation
    if (operation === 'read') {
      // Multiple readers allowed, but not if someone is writing/deleting
      const hasWriter = validAccess.some(a => a.operation !== 'read')
      if (hasWriter) {
        const writer = validAccess.find(a => a.operation !== 'read')
        return {
          hasConflict: true,
          reason: `File is being ${writer?.operation || 'modified'} by another agent`,
          conflictingAgent: writer?.agentId,
        }
      }
      return { hasConflict: false }
    } else {
      // Write/delete requires exclusive access
      if (validAccess.length > 0) {
        const blocker = validAccess[0]
        return {
          hasConflict: true,
          reason: `File is locked for ${blocker.operation} by ${blocker.agentId}`,
          conflictingAgent: blocker.agentId,
        }
      }
      return { hasConflict: false }
    }
  }

  async requestFileAccess(params: {
    path: string
    operation: 'read' | 'write' | 'delete'
    agentId: AgentId
  }): Promise<ServiceResponse<FileAccessGrant>> {
    await this.simulateDelay()

    // Normalize path (remove trailing slashes, etc.)
    const normalizedPath = params.path.replace(/\/+$/, '')

    // Check for conflicts
    const conflictCheck = this.hasConflict(normalizedPath, params.operation, params.agentId)

    if (conflictCheck.hasConflict) {
      // Record conflict
      const conflict: FileConflict = {
        path: normalizedPath,
        agents: [params.agentId, conflictCheck.conflictingAgent!],
        conflictType:
          params.operation === 'delete' && conflictCheck.conflictingAgent
            ? 'edit-deleted'
            : 'simultaneous-write',
        detectedAt: new Date(),
      }

      const pathConflicts = this.conflicts.get(normalizedPath) || []
      pathConflicts.push(conflict)
      this.conflicts.set(normalizedPath, pathConflicts)

      console.log(
        `[FileSystemCoordination] Access denied for ${params.agentId}: ${conflictCheck.reason}`
      )

      return {
        success: false,
        error: {
          code: 'FILE_LOCKED',
          message: conflictCheck.reason || 'File is locked by another agent',
          retryable: true,
          details: {
            path: normalizedPath,
            requestedOperation: params.operation,
            lockedBy: conflictCheck.conflictingAgent,
          },
        },
      }
    }

    // No conflict - grant access
    let lockToken: LockToken | undefined

    // For write/delete operations, acquire a lock from state store
    if (params.operation !== 'read') {
      const lockResult = await this.stateStore.acquireLock(normalizedPath, params.agentId)
      if (!lockResult.success) {
        return {
          success: false,
          error: lockResult.error,
        }
      }
      lockToken = lockResult.data
    }

    // Record active access
    const access: ActiveAccess = {
      path: normalizedPath,
      agentId: params.agentId,
      operation: params.operation,
      lockToken,
      grantedAt: new Date(),
      expiresAt: new Date(Date.now() + this.rules.lockTimeout),
    }

    const pathAccess = this.activeAccess.get(normalizedPath) || []
    pathAccess.push(access)
    this.activeAccess.set(normalizedPath, pathAccess)

    const grant: FileAccessGrant = {
      path: normalizedPath,
      operation: params.operation,
      lockToken,
      granted: true,
      expiresAt: access.expiresAt,
    }

    console.log(
      `[FileSystemCoordination] Access granted to ${params.agentId} for ${params.operation} on ${normalizedPath}`
    )
    if (lockToken) {
      console.log(`[FileSystemCoordination] Lock token: ${lockToken}`)
    }

    return {
      success: true,
      data: grant,
    }
  }

  async releaseFileAccess(grant: FileAccessGrant): Promise<ServiceResponse<void>> {
    await this.simulateDelay()

    // Remove from active access
    const pathAccess = this.activeAccess.get(grant.path) || []
    const updatedAccess = pathAccess.filter(
      a => a.lockToken !== grant.lockToken && a.operation !== grant.operation
    )

    if (updatedAccess.length === 0) {
      this.activeAccess.delete(grant.path)
    } else {
      this.activeAccess.set(grant.path, updatedAccess)
    }

    // Release lock if present
    if (grant.lockToken) {
      const releaseResult = await this.stateStore.releaseLock(grant.lockToken)
      if (!releaseResult.success) {
        console.warn(`[FileSystemCoordination] Failed to release lock: ${grant.lockToken}`)
      }
    }

    console.log(`[FileSystemCoordination] Access released for ${grant.operation} on ${grant.path}`)

    return { success: true }
  }

  async detectConflicts(path: string): Promise<ServiceResponse<FileConflict[]>> {
    await this.simulateDelay()

    const normalizedPath = path.replace(/\/+$/, '')
    const pathConflicts = this.conflicts.get(normalizedPath) || []

    // Filter to recent conflicts (last hour)
    const recentConflicts = pathConflicts.filter(
      c => c.detectedAt.getTime() > Date.now() - 60 * 60 * 1000
    )

    return {
      success: true,
      data: recentConflicts,
    }
  }

  async requestBatchFileAccess(
    requests: FileAccessRequest[]
  ): Promise<ServiceResponse<FileAccessGrant[]>> {
    await this.simulateDelay()

    // Atomic operation - check all first, then grant all or none
    const grants: FileAccessGrant[] = []
    const conflicts: Array<{ request: FileAccessRequest; reason: string }> = []

    // First pass: check for conflicts
    for (const request of requests) {
      const conflictCheck = this.hasConflict(request.path, request.operation, request.agentId)
      if (conflictCheck.hasConflict) {
        conflicts.push({
          request,
          reason: conflictCheck.reason || 'File is locked',
        })
      }
    }

    // If any conflicts, reject the entire batch
    if (conflicts.length > 0) {
      console.log(
        `[FileSystemCoordination] Batch access denied: ${conflicts.length} conflicts found`
      )

      return {
        success: false,
        error: {
          code: 'PARTIAL_GRANT',
          message: `Cannot grant batch access: ${conflicts.length} files have conflicts`,
          retryable: true,
          details: {
            conflicts: conflicts.map(c => ({
              path: c.request.path,
              operation: c.request.operation,
              reason: c.reason,
            })),
          },
        },
      }
    }

    // Second pass: grant all access
    for (const request of requests) {
      const result = await this.requestFileAccess(request)
      if (result.success && result.data) {
        grants.push(result.data)
      } else {
        // Rollback on failure
        console.error(
          `[FileSystemCoordination] Batch grant failed, rolling back ${grants.length} grants`
        )
        for (const grant of grants) {
          await this.releaseFileAccess(grant)
        }

        return {
          success: false,
          error: result.error || {
            code: 'BATCH_GRANT_FAILED',
            message: 'Failed to grant batch access',
            retryable: true,
          },
        }
      }
    }

    console.log(`[FileSystemCoordination] Batch access granted: ${grants.length} files`)

    return {
      success: true,
      data: grants,
    }
  }

  // ========== Testing Helpers ==========

  /**
   * Gets current active access (for testing)
   */
  getActiveAccess(): Map<string, ActiveAccess[]> {
    // Clean up expired access first
    const now = Date.now()
    for (const [path, accesses] of this.activeAccess.entries()) {
      const valid = accesses.filter(a => a.expiresAt.getTime() > now)
      if (valid.length === 0) {
        this.activeAccess.delete(path)
      } else {
        this.activeAccess.set(path, valid)
      }
    }
    return this.activeAccess
  }

  /**
   * Gets all recorded conflicts (for testing)
   */
  getAllConflicts(): FileConflict[] {
    const allConflicts: FileConflict[] = []
    for (const conflicts of this.conflicts.values()) {
      allConflicts.push(...conflicts)
    }
    return allConflicts
  }

  /**
   * Force release all access for an agent (emergency cleanup)
   */
  async forceReleaseAgent(agentId: AgentId): Promise<number> {
    let released = 0

    for (const [path, accesses] of this.activeAccess.entries()) {
      const agentAccesses = accesses.filter(a => a.agentId === agentId)

      for (const access of agentAccesses) {
        if (access.lockToken) {
          await this.stateStore.releaseLock(access.lockToken)
        }
        released++
      }

      // Remove agent's accesses
      const remaining = accesses.filter(a => a.agentId !== agentId)
      if (remaining.length === 0) {
        this.activeAccess.delete(path)
      } else {
        this.activeAccess.set(path, remaining)
      }
    }

    console.log(`[FileSystemCoordination] Force released ${released} file accesses for ${agentId}`)
    return released
  }

  /**
   * Resets all state (for testing)
   */
  async reset(): Promise<void> {
    // Release all locks
    for (const accesses of this.activeAccess.values()) {
      for (const access of accesses) {
        if (access.lockToken) {
          await this.stateStore.releaseLock(access.lockToken)
        }
      }
    }

    this.activeAccess.clear()
    this.conflicts.clear()
  }
}
