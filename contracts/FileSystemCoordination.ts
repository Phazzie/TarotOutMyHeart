/**
 * File System Coordination Contract
 * 
 * @purpose: Coordinated file system operations for multiple agents
 * @requirement: AI-COORDINATION-005
 * @updated: 2025-11-08
 * 
 * This seam provides:
 * - Safe file read/write operations
 * - File change tracking
 * - Conflict detection and resolution
 */

import type { ServiceResponse } from './types/common'

/**
 * File operation type
 */
export enum FileOperation {
  READ = 'read',
  WRITE = 'write',
  DELETE = 'delete',
  CREATE = 'create',
  MODIFY = 'modify'
}

/**
 * File change record
 */
export interface FileChange {
  /** Change ID */
  id: string
  
  /** File path */
  filePath: string
  
  /** Operation performed */
  operation: FileOperation
  
  /** Agent that made the change */
  changedBy: 'claude' | 'copilot' | 'user'
  
  /** When the change occurred */
  timestamp: Date
  
  /** Content before change (for WRITE, MODIFY, DELETE) */
  previousContent?: string
  
  /** Content after change (for WRITE, MODIFY, CREATE) */
  newContent?: string
  
  /** Change description */
  description?: string
}

/**
 * File conflict information
 */
export interface FileConflict {
  /** Conflict ID */
  id: string
  
  /** File path */
  filePath: string
  
  /** First conflicting change */
  change1: FileChange
  
  /** Second conflicting change */
  change2: FileChange
  
  /** Whether the conflict is resolved */
  resolved: boolean
  
  /** Resolution details (if resolved) */
  resolution?: {
    resolvedBy: 'claude' | 'copilot' | 'user'
    resolvedAt: Date
    finalContent: string
    strategy: 'accept_change1' | 'accept_change2' | 'merge' | 'manual'
  }
}

/**
 * File metadata
 */
export interface FileMetadata {
  /** File path */
  filePath: string
  
  /** File size in bytes */
  size: number
  
  /** Last modified time */
  lastModified: Date
  
  /** Last modified by */
  lastModifiedBy?: 'claude' | 'copilot' | 'user'
  
  /** Whether file is currently locked */
  locked: boolean
  
  /** File content hash (for change detection) */
  contentHash: string
}

/**
 * File System Coordination Contract
 * 
 * Provides safe, coordinated file system operations for multiple agents
 */
export interface IFileSystemCoordination {
  /**
   * Read file content
   */
  readFile(filePath: string, agent: 'claude' | 'copilot' | 'user'): Promise<ServiceResponse<string>>
  
  /**
   * Write file content
   */
  writeFile(filePath: string, content: string, agent: 'claude' | 'copilot' | 'user', description?: string): Promise<ServiceResponse<void>>
  
  /**
   * Create a new file
   */
  createFile(filePath: string, content: string, agent: 'claude' | 'copilot' | 'user', description?: string): Promise<ServiceResponse<void>>
  
  /**
   * Delete a file
   */
  deleteFile(filePath: string, agent: 'claude' | 'copilot' | 'user', description?: string): Promise<ServiceResponse<void>>
  
  /**
   * Check if file exists
   */
  fileExists(filePath: string): Promise<ServiceResponse<boolean>>
  
  /**
   * Get file metadata
   */
  getFileMetadata(filePath: string): Promise<ServiceResponse<FileMetadata>>
  
  /**
   * Get file change history
   */
  getFileHistory(filePath: string): Promise<ServiceResponse<FileChange[]>>
  
  /**
   * Get all recent changes
   */
  getAllChanges(sinceMs?: number): Promise<ServiceResponse<FileChange[]>>
  
  /**
   * Detect conflicts
   */
  detectConflicts(): Promise<ServiceResponse<FileConflict[]>>
  
  /**
   * Resolve a conflict
   */
  resolveConflict(conflictId: string, resolution: FileConflict['resolution']): Promise<ServiceResponse<void>>
  
  /**
   * Get pending conflicts
   */
  getPendingConflicts(): Promise<ServiceResponse<FileConflict[]>>
  
  /**
   * Revert a file change
   */
  revertChange(changeId: string): Promise<ServiceResponse<void>>
}
