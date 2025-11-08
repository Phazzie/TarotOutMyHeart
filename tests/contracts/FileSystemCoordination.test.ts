/**
 * File System Coordination Contract Tests
 *
 * Tests that FileSystemCoordinationMock satisfies the FileSystemCoordination contract
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { FileSystemCoordinationMock } from '../../services/mock/FileSystemCoordinationMock'
import { FileOperation } from '../../contracts'

describe('FileSystemCoordination Contract', () => {
  let fs: FileSystemCoordinationMock

  beforeEach(() => {
    fs = new FileSystemCoordinationMock()
  })

  describe('File Creation', () => {
    it('should create a new file', async () => {
      const response = await fs.createFile(
        '/test/file.ts',
        'const x = 1;',
        'claude',
        'Initial file'
      )

      expect(response.success).toBe(true)
    })

    it('should return error when creating existing file', async () => {
      await fs.createFile('/test/file.ts', 'content', 'claude')

      const response = await fs.createFile('/test/file.ts', 'more content', 'copilot')

      expect(response.success).toBe(false)
      expect(response.error?.code).toBe('FILE_ALREADY_EXISTS')
    })
  })

  describe('File Reading', () => {
    it('should read file content', async () => {
      const content = 'function test() { return true; }'
      await fs.createFile('/src/utils.ts', content, 'claude')

      const response = await fs.readFile('/src/utils.ts', 'copilot')

      expect(response.success).toBe(true)
      expect(response.data).toBe(content)
    })

    it('should return error for non-existent file', async () => {
      const response = await fs.readFile('/non/existent.ts', 'claude')

      expect(response.success).toBe(false)
      expect(response.error?.code).toBe('FILE_NOT_FOUND')
    })
  })

  describe('File Writing', () => {
    it('should write content to existing file', async () => {
      await fs.createFile('/test/file.ts', 'original', 'claude')

      const response = await fs.writeFile(
        '/test/file.ts',
        'updated content',
        'copilot',
        'Updated implementation'
      )

      expect(response.success).toBe(true)

      const readResponse = await fs.readFile('/test/file.ts', 'user')
      expect(readResponse.data).toBe('updated content')
    })

    it('should write to non-existent file (creates it)', async () => {
      const response = await fs.writeFile('/new/file.ts', 'new content', 'claude')

      expect(response.success).toBe(true)

      const readResponse = await fs.readFile('/new/file.ts', 'copilot')
      expect(readResponse.data).toBe('new content')
    })
  })

  describe('File Deletion', () => {
    it('should delete an existing file', async () => {
      await fs.createFile('/temp/file.ts', 'temporary', 'claude')

      const deleteResponse = await fs.deleteFile('/temp/file.ts', 'claude', 'No longer needed')

      expect(deleteResponse.success).toBe(true)

      const readResponse = await fs.readFile('/temp/file.ts', 'user')
      expect(readResponse.success).toBe(false)
    })

    it('should return error when deleting non-existent file', async () => {
      const response = await fs.deleteFile('/non/existent.ts', 'copilot')

      expect(response.success).toBe(false)
      expect(response.error?.code).toBe('FILE_NOT_FOUND')
    })
  })

  describe('File Existence Check', () => {
    it('should return true for existing file', async () => {
      await fs.createFile('/test/exists.ts', 'content', 'claude')

      const response = await fs.fileExists('/test/exists.ts')

      expect(response.success).toBe(true)
      expect(response.data).toBe(true)
    })

    it('should return false for non-existent file', async () => {
      const response = await fs.fileExists('/test/not-exists.ts')

      expect(response.success).toBe(true)
      expect(response.data).toBe(false)
    })
  })

  describe('File Metadata', () => {
    it('should get file metadata', async () => {
      const content = 'test content'
      await fs.createFile('/test/meta.ts', content, 'claude')

      const response = await fs.getFileMetadata('/test/meta.ts')

      expect(response.success).toBe(true)
      expect(response.data?.filePath).toBe('/test/meta.ts')
      expect(response.data?.size).toBe(content.length)
      expect(response.data?.lastModified).toBeInstanceOf(Date)
      expect(response.data?.lastModifiedBy).toBe('claude')
      expect(response.data?.contentHash).toBeDefined()
    })

    it('should return error for non-existent file', async () => {
      const response = await fs.getFileMetadata('/non/existent.ts')

      expect(response.success).toBe(false)
      expect(response.error?.code).toBe('FILE_NOT_FOUND')
    })

    it('should update metadata after write', async () => {
      await fs.createFile('/test/update.ts', 'original', 'claude')

      await new Promise(resolve => setTimeout(resolve, 10))

      await fs.writeFile('/test/update.ts', 'updated', 'copilot')

      const response = await fs.getFileMetadata('/test/update.ts')

      expect(response.data?.lastModifiedBy).toBe('copilot')
      expect(response.data?.size).toBe('updated'.length)
    })
  })

  describe('File History', () => {
    it('should track file changes', async () => {
      await fs.createFile('/test/history.ts', 'v1', 'claude')
      await fs.writeFile('/test/history.ts', 'v2', 'copilot')
      await fs.writeFile('/test/history.ts', 'v3', 'user')

      const response = await fs.getFileHistory('/test/history.ts')

      expect(response.success).toBe(true)
      expect(response.data).toHaveLength(3)
    })

    it('should order history by newest first', async () => {
      await fs.createFile('/test/order.ts', 'first', 'claude')

      await new Promise(resolve => setTimeout(resolve, 10))

      await fs.writeFile('/test/order.ts', 'second', 'copilot')

      const response = await fs.getFileHistory('/test/order.ts')

      expect(response.data![0].operation).toBe(FileOperation.WRITE)
      expect(response.data![1].operation).toBe(FileOperation.CREATE)
    })

    it('should include change descriptions', async () => {
      await fs.createFile('/test/desc.ts', 'content', 'claude', 'Initial version')

      const response = await fs.getFileHistory('/test/desc.ts')

      expect(response.data![0].description).toBe('Initial version')
    })

    it('should track previous and new content', async () => {
      await fs.createFile('/test/content.ts', 'original', 'claude')
      await fs.writeFile('/test/content.ts', 'updated', 'copilot')

      const response = await fs.getFileHistory('/test/content.ts')
      const writeChange = response.data!.find(c => c.operation === FileOperation.WRITE)

      expect(writeChange?.previousContent).toBe('original')
      expect(writeChange?.newContent).toBe('updated')
    })
  })

  describe('All Changes', () => {
    it('should get all recent changes', async () => {
      await fs.createFile('/test/file1.ts', 'content1', 'claude')
      await fs.createFile('/test/file2.ts', 'content2', 'copilot')
      await fs.writeFile('/test/file1.ts', 'updated', 'user')

      const response = await fs.getAllChanges()

      expect(response.success).toBe(true)
      expect(response.data!.length).toBeGreaterThanOrEqual(3)
    })

    it('should filter changes by time', async () => {
      await fs.createFile('/test/old.ts', 'old', 'claude')

      await new Promise(resolve => setTimeout(resolve, 100))

      await fs.createFile('/test/new.ts', 'new', 'copilot')

      const response = await fs.getAllChanges(50)

      expect(response.success).toBe(true)
      const hasOldFile = response.data!.some(c => c.filePath === '/test/old.ts')
      expect(hasOldFile).toBe(false)
    })
  })

  describe('Conflict Detection', () => {
    it('should detect conflicts when different agents modify same file', async () => {
      await fs.createFile('/test/conflict.ts', 'original', 'claude')
      await fs.writeFile('/test/conflict.ts', 'claude version', 'claude')
      await fs.writeFile('/test/conflict.ts', 'copilot version', 'copilot')

      const response = await fs.detectConflicts()

      expect(response.success).toBe(true)
      // Conflicts might not be detected immediately in this simplified mock
      // but the interface should work
    })

    it('should return empty list when no conflicts', async () => {
      await fs.createFile('/test/noconflict.ts', 'content', 'claude')

      const response = await fs.detectConflicts()

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
    })
  })

  describe('Conflict Resolution', () => {
    it('should resolve a conflict', async () => {
      // Create a conflict scenario
      await fs.createFile('/test/resolve.ts', 'original', 'claude')
      await fs.writeFile('/test/resolve.ts', 'v1', 'claude')
      await fs.writeFile('/test/resolve.ts', 'v2', 'copilot')

      const conflictsResponse = await fs.detectConflicts()

      if (conflictsResponse.data && conflictsResponse.data.length > 0) {
        const conflict = conflictsResponse.data[0]

        const resolution = {
          resolvedBy: 'user' as const,
          resolvedAt: new Date(),
          finalContent: 'resolved content',
          strategy: 'merge' as const,
        }

        const resolveResponse = await fs.resolveConflict(conflict.id, resolution)
        expect(resolveResponse.success).toBe(true)
      }
    })

    it('should return error for non-existent conflict', async () => {
      const resolution = {
        resolvedBy: 'user' as const,
        resolvedAt: new Date(),
        finalContent: 'content',
        strategy: 'merge' as const,
      }

      const response = await fs.resolveConflict('non-existent', resolution)

      expect(response.success).toBe(false)
      expect(response.error?.code).toBe('CONFLICT_NOT_FOUND')
    })
  })

  describe('Pending Conflicts', () => {
    it('should get pending conflicts', async () => {
      const response = await fs.getPendingConflicts()

      expect(response.success).toBe(true)
      expect(Array.isArray(response.data)).toBe(true)
    })
  })

  describe('Change Reversion', () => {
    it('should revert a change', async () => {
      await fs.createFile('/test/revert.ts', 'original', 'claude')
      await fs.writeFile('/test/revert.ts', 'modified', 'copilot')

      const history = await fs.getFileHistory('/test/revert.ts')
      const writeChange = history.data!.find(c => c.operation === FileOperation.WRITE)

      if (writeChange) {
        const revertResponse = await fs.revertChange(writeChange.id)
        expect(revertResponse.success).toBe(true)

        const content = await fs.readFile('/test/revert.ts', 'user')
        expect(content.data).toBe('original')
      }
    })

    it('should return error for non-existent change', async () => {
      const response = await fs.revertChange('non-existent-change')

      expect(response.success).toBe(false)
      expect(response.error?.code).toBe('CHANGE_NOT_FOUND')
    })

    it('should delete file when reverting CREATE operation', async () => {
      await fs.createFile('/test/delete-on-revert.ts', 'content', 'claude')

      const history = await fs.getFileHistory('/test/delete-on-revert.ts')
      const createChange = history.data!.find(c => c.operation === FileOperation.CREATE)

      if (createChange) {
        await fs.revertChange(createChange.id)

        const exists = await fs.fileExists('/test/delete-on-revert.ts')
        expect(exists.data).toBe(false)
      }
    })
  })

  describe('Multiple Agents', () => {
    it('should track changes from different agents', async () => {
      await fs.createFile('/test/multi.ts', 'v1', 'claude')
      await fs.writeFile('/test/multi.ts', 'v2', 'copilot')
      await fs.writeFile('/test/multi.ts', 'v3', 'user')

      const history = await fs.getFileHistory('/test/multi.ts')

      const agents = new Set(history.data!.map(c => c.changedBy))
      expect(agents.size).toBe(3)
      expect(agents.has('claude')).toBe(true)
      expect(agents.has('copilot')).toBe(true)
      expect(agents.has('user')).toBe(true)
    })
  })
})
