/**
 * @fileoverview Real implementation of file system coordination service
 * @purpose Prevents race conditions and conflicts between AI agents accessing files
 * @dataFlow AI Agents → FileSystemCoordination → StateStore → SQLite File Locks
 * @boundary Implements FileSystemCoordinationContract seam (Seam #5)
 * @example
 * const service = new FileSystemCoordinationService(stateStore)
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
  ServiceResponse
} from '@contracts'

/**
 * Real implementation of file system coordination
 * Uses StateStore for persistent file locking
 */
export class FileSystemCoordinationService implements FileSystemCoordinationContract {
  private stateStore: StateStoreContract

  // Configuration
  private readonly ALLOW_MULTIPLE_READERS = true

  constructor(stateStore: StateStoreContract) {
    this.stateStore = stateStore
  }

  /**
   * Request permission to access a file
   */
  async requestFileAccess(params: {
    path: string
    operation: 'read' | 'write' | 'delete'
    agentId: AgentId
  }): Promise<ServiceResponse<FileAccessGrant>> {
    const { path, operation, agentId } = params

    try {
      // Check if file is currently locked
      const lockCheckResult = await this.stateStore.isLocked(path)
      if (!lockCheckResult.success) {
        return {
          success: false,
          error: lockCheckResult.error!
        }
      }

      const existingLock = lockCheckResult.data

      // Determine if access can be granted
      if (operation === 'read' && this.ALLOW_MULTIPLE_READERS) {
        // Allow read if no write/delete lock exists
        if (existingLock && existingLock.operation !== 'read') {
          const grant: FileAccessGrant = {
            granted: false,
            path,
            operation,
            reason: `File is being ${existingLock.operation} by ${existingLock.owner}`,
            lockToken: undefined
          }
          return { success: true, data: grant }
        }

        // Grant read access (no lock needed for reads)
        const grant: FileAccessGrant = {
          granted: true,
          path,
          operation,
          lockToken: undefined // Reads don't need locks
        }
        return { success: true, data: grant }
      }

      // For write/delete operations, need exclusive lock
      if (operation === 'write' || operation === 'delete') {
        if (existingLock) {
          // File is locked by someone else
          const grant: FileAccessGrant = {
            granted: false,
            path,
            operation,
            reason: `File is locked for ${existingLock.operation} by ${existingLock.owner}`,
            lockToken: undefined
          }
          return { success: true, data: grant }
        }

        // Acquire exclusive lock
        const lockResult = await this.stateStore.acquireLock(path, agentId)
        if (!lockResult.success) {
          // Lock acquisition failed
          const grant: FileAccessGrant = {
            granted: false,
            path,
            operation,
            reason: lockResult.error?.message || 'Failed to acquire lock',
            lockToken: undefined
          }
          return { success: true, data: grant }
        }

        // Lock acquired successfully
        const grant: FileAccessGrant = {
          granted: true,
          path,
          operation,
          lockToken: lockResult.data
        }
        return { success: true, data: grant }
      }

      // Should not reach here
      return {
        success: false,
        error: {
          code: 'INVALID_OPERATION',
          message: `Invalid operation: ${operation}`,
          retryable: false
        }
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'FILE_ACCESS_ERROR',
          message: `Failed to request file access: ${error instanceof Error ? error.message : 'Unknown error'}`,
          retryable: true
        }
      }
    }
  }

  /**
   * Release file access grant
   */
  async releaseFileAccess(grant: FileAccessGrant): Promise<ServiceResponse<void>> {
    try {
      // Only release lock if one was granted
      if (!grant.granted || !grant.lockToken) {
        return { success: true }
      }

      // Release the lock
      const result = await this.stateStore.releaseLock(grant.lockToken)
      return result
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'RELEASE_ACCESS_ERROR',
          message: `Failed to release file access: ${error instanceof Error ? error.message : 'Unknown error'}`,
          retryable: true
        }
      }
    }
  }

  /**
   * Detect conflicts for a file
   */
  async detectConflicts(path: string): Promise<ServiceResponse<FileConflict[]>> {
    try {
      // Check if file is locked
      const lockCheckResult = await this.stateStore.isLocked(path)
      if (!lockCheckResult.success) {
        return {
          success: false,
          error: lockCheckResult.error!
        }
      }

      const lock = lockCheckResult.data
      if (!lock) {
        // No lock, no conflicts
        return { success: true, data: [] }
      }

      // File is locked - create conflict entry
      const conflict: FileConflict = {
        path,
        agents: [lock.owner],
        conflictType: 'simultaneous-write',
        detectedAt: new Date()
      }

      return { success: true, data: [conflict] }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DETECT_CONFLICTS_ERROR',
          message: `Failed to detect conflicts: ${error instanceof Error ? error.message : 'Unknown error'}`,
          retryable: true
        }
      }
    }
  }

  /**
   * Batch request multiple files
   * Atomic operation - either all granted or none
   */
  async requestBatchFileAccess(
    requests: FileAccessRequest[]
  ): Promise<ServiceResponse<FileAccessGrant[]>> {
    try {
      const grants: FileAccessGrant[] = []
      const locksAcquired: LockToken[] = []

      // Try to acquire all locks
      for (const request of requests) {
        const grantResult = await this.requestFileAccess({
          path: request.path,
          operation: request.operation,
          agentId: request.agentId
        })

        if (!grantResult.success) {
          // Rollback all previously acquired locks
          for (const lockToken of locksAcquired) {
            await this.stateStore.releaseLock(lockToken)
          }

          return {
            success: false,
            error: grantResult.error!
          }
        }

        const grant = grantResult.data!
        grants.push(grant)

        // If granted and has lock, track it
        if (grant.granted && grant.lockToken) {
          locksAcquired.push(grant.lockToken)
        }

        // If any grant was denied, rollback
        if (!grant.granted) {
          // Rollback all previously acquired locks
          for (const lockToken of locksAcquired) {
            await this.stateStore.releaseLock(lockToken)
          }

          return {
            success: false,
            error: {
              code: 'BATCH_ACCESS_DENIED',
              message: `Batch file access denied: ${grant.reason}`,
              retryable: true,
              details: {
                failedPath: grant.path
              }
            }
          }
        }
      }

      // All grants successful
      return { success: true, data: grants }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'BATCH_ACCESS_ERROR',
          message: `Failed to request batch file access: ${error instanceof Error ? error.message : 'Unknown error'}`,
          retryable: true
        }
      }
    }
  }
}
