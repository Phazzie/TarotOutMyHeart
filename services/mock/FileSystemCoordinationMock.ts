/**
 * File System Coordination Mock Implementation
 * 
 * Mock implementation of IFileSystemCoordination for testing and development
 */

import type {
  IFileSystemCoordination,
  FileChange,
  FileConflict,
  FileMetadata,
  ServiceResponse
} from '../../contracts'

import { FileOperation } from '../../contracts'

export class FileSystemCoordinationMock implements IFileSystemCoordination {
  private files: Map<string, string> = new Map()
  private changes: FileChange[] = []
  private conflicts: Map<string, FileConflict> = new Map()
  private changeIdCounter = 1
  private conflictIdCounter = 1

  async readFile(filePath: string, agent: 'claude' | 'copilot' | 'user'): Promise<ServiceResponse<string>> {
    const content = this.files.get(filePath)
    
    if (content === undefined) {
      return {
        success: false,
        error: {
          code: 'FILE_NOT_FOUND',
          message: `File ${filePath} not found`,
          retryable: false
        }
      }
    }

    // Record read operation
    this.recordChange(filePath, FileOperation.READ, agent, undefined, content)

    return {
      success: true,
      data: content
    }
  }

  async writeFile(
    filePath: string,
    content: string,
    agent: 'claude' | 'copilot' | 'user',
    description?: string
  ): Promise<ServiceResponse<void>> {
    const previousContent = this.files.get(filePath)
    this.files.set(filePath, content)
    
    this.recordChange(filePath, FileOperation.WRITE, agent, previousContent, content, description)

    return { success: true }
  }

  async createFile(
    filePath: string,
    content: string,
    agent: 'claude' | 'copilot' | 'user',
    description?: string
  ): Promise<ServiceResponse<void>> {
    if (this.files.has(filePath)) {
      return {
        success: false,
        error: {
          code: 'FILE_ALREADY_EXISTS',
          message: `File ${filePath} already exists`,
          retryable: false
        }
      }
    }

    this.files.set(filePath, content)
    this.recordChange(filePath, FileOperation.CREATE, agent, undefined, content, description)

    return { success: true }
  }

  async deleteFile(
    filePath: string,
    agent: 'claude' | 'copilot' | 'user',
    description?: string
  ): Promise<ServiceResponse<void>> {
    const previousContent = this.files.get(filePath)
    
    if (!previousContent) {
      return {
        success: false,
        error: {
          code: 'FILE_NOT_FOUND',
          message: `File ${filePath} not found`,
          retryable: false
        }
      }
    }

    this.files.delete(filePath)
    this.recordChange(filePath, FileOperation.DELETE, agent, previousContent, undefined, description)

    return { success: true }
  }

  async fileExists(filePath: string): Promise<ServiceResponse<boolean>> {
    return {
      success: true,
      data: this.files.has(filePath)
    }
  }

  async getFileMetadata(filePath: string): Promise<ServiceResponse<FileMetadata>> {
    const content = this.files.get(filePath)
    
    if (content === undefined) {
      return {
        success: false,
        error: {
          code: 'FILE_NOT_FOUND',
          message: `File ${filePath} not found`,
          retryable: false
        }
      }
    }

    // Find last modification
    const lastChange = this.changes
      .filter(c => c.filePath === filePath)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0]

    const metadata: FileMetadata = {
      filePath,
      size: content.length,
      lastModified: lastChange?.timestamp || new Date(),
      lastModifiedBy: lastChange?.changedBy,
      locked: false, // Mock doesn't track locks here
      contentHash: this.simpleHash(content)
    }

    return {
      success: true,
      data: metadata
    }
  }

  async getFileHistory(filePath: string): Promise<ServiceResponse<FileChange[]>> {
    const history = this.changes
      .filter(c => c.filePath === filePath)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

    return {
      success: true,
      data: history
    }
  }

  async getAllChanges(sinceMs?: number): Promise<ServiceResponse<FileChange[]>> {
    let changes = [...this.changes]
    
    if (sinceMs) {
      const cutoff = new Date(Date.now() - sinceMs)
      changes = changes.filter(c => c.timestamp >= cutoff)
    }
    
    changes.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

    return {
      success: true,
      data: changes
    }
  }

  async detectConflicts(): Promise<ServiceResponse<FileConflict[]>> {
    // Simple conflict detection: find files modified by different agents within 1 minute
    const recentChanges = this.changes.filter(
      c => Date.now() - c.timestamp.getTime() < 60000
    )

    const fileChanges = new Map<string, FileChange[]>()
    for (const change of recentChanges) {
      if (!fileChanges.has(change.filePath)) {
        fileChanges.set(change.filePath, [])
      }
      fileChanges.get(change.filePath)!.push(change)
    }

    // Check for conflicts
    for (const [filePath, changes] of fileChanges.entries()) {
      if (changes.length >= 2 && changes[0] && changes[1]) {
        const agents = new Set(changes.map(c => c.changedBy))
        if (agents.size > 1) {
          // Conflict detected
          const conflictId = `conflict-${this.conflictIdCounter++}`
          const conflict: FileConflict = {
            id: conflictId,
            filePath,
            change1: changes[0],
            change2: changes[1],
            resolved: false
          }
          this.conflicts.set(conflictId, conflict)
        }
      }
    }

    return {
      success: true,
      data: Array.from(this.conflicts.values())
    }
  }

  async resolveConflict(
    conflictId: string,
    resolution: FileConflict['resolution']
  ): Promise<ServiceResponse<void>> {
    const conflict = this.conflicts.get(conflictId)
    
    if (!conflict) {
      return {
        success: false,
        error: {
          code: 'CONFLICT_NOT_FOUND',
          message: `Conflict ${conflictId} not found`,
          retryable: false
        }
      }
    }

    conflict.resolved = true
    conflict.resolution = resolution

    // Apply resolution
    if (resolution) {
      this.files.set(conflict.filePath, resolution.finalContent)
    }

    return { success: true }
  }

  async getPendingConflicts(): Promise<ServiceResponse<FileConflict[]>> {
    const pending = Array.from(this.conflicts.values()).filter(c => !c.resolved)

    return {
      success: true,
      data: pending
    }
  }

  async revertChange(changeId: string): Promise<ServiceResponse<void>> {
    const change = this.changes.find(c => c.id === changeId)
    
    if (!change) {
      return {
        success: false,
        error: {
          code: 'CHANGE_NOT_FOUND',
          message: `Change ${changeId} not found`,
          retryable: false
        }
      }
    }

    // Revert to previous content
    if (change.previousContent !== undefined) {
      this.files.set(change.filePath, change.previousContent)
    } else if (change.operation === FileOperation.CREATE) {
      this.files.delete(change.filePath)
    }

    return { success: true }
  }

  private recordChange(
    filePath: string,
    operation: FileOperation,
    changedBy: 'claude' | 'copilot' | 'user',
    previousContent?: string,
    newContent?: string,
    description?: string
  ): void {
    const change: FileChange = {
      id: `change-${this.changeIdCounter++}`,
      filePath,
      operation,
      changedBy,
      timestamp: new Date(),
      previousContent,
      newContent,
      description
    }
    this.changes.push(change)
  }

  private simpleHash(content: string): string {
    // Simple hash for testing purposes
    let hash = 0
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    return hash.toString(16)
  }
}
