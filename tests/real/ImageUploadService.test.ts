/**
 * @fileoverview TDD tests for ImageUploadService (real implementation).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ImageUploadService } from '../../services/real/ImageUploadService'

const makeFile = (name: string, type: string, sizeBytes: number, lastModified?: number): File => {
  const buffer = new ArrayBuffer(sizeBytes)
  return new File([buffer], name, { type, lastModified: lastModified ?? 1700000000000 })
}

describe('ImageUploadService', () => {
  let svc: ImageUploadService

  beforeEach(() => {
    svc = new ImageUploadService()
    vi.restoreAllMocks()
  })

  describe('uploadImages', () => {
    it('accepts valid JPEG files', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          json: () =>
            Promise.resolve({ success: true, data: { url: 'https://blob.vercel.com/test.jpg' } }),
        })
      )
      const file = makeFile('photo.jpg', 'image/jpeg', 1024)
      const result = await svc.uploadImages({ files: [file] })
      expect(result.success).toBe(true)
      if (result.success && result.data) {
        expect(result.data.uploadedImages).toHaveLength(1)
      }
    })

    it('flags duplicate files with identical name, size, and timestamp', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          json: () =>
            Promise.resolve({ success: true, data: { url: 'https://blob.vercel.com/test.jpg' } }),
        })
      )
      const timestamp = 1700000000000
      const file1 = makeFile('photo.jpg', 'image/jpeg', 1024, timestamp)
      const file2 = makeFile('photo.jpg', 'image/jpeg', 1024, timestamp)

      const result1 = await svc.uploadImages({ files: [file1] })
      expect(result1.success).toBe(true)
      expect(result1.data?.uploadedImages).toHaveLength(1)

      const result2 = await svc.uploadImages({ files: [file2] })
      expect(result2.success).toBe(true)
      expect(result2.data?.failedImages).toHaveLength(1)
      expect(result2.data?.failedImages[0]?.code).toBe('DUPLICATE_IMAGE')
    })

    it('allows files with same name but different sizes', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          json: () =>
            Promise.resolve({ success: true, data: { url: 'https://blob.vercel.com/test.jpg' } }),
        })
      )
      const file1 = makeFile('photo.jpg', 'image/jpeg', 1024)
      const file2 = makeFile('photo.jpg', 'image/jpeg', 2048)

      const result1 = await svc.uploadImages({ files: [file1] })
      expect(result1.success).toBe(true)

      const result2 = await svc.uploadImages({ files: [file2] })
      expect(result2.success).toBe(true)
      expect(result2.data?.uploadedImages).toHaveLength(1)
    })

    it('returns error when files array is empty', async () => {
      const result = await svc.uploadImages({ files: [] })
      expect(result.success).toBe(false)
    })
  })

  describe('getUploadedImages', () => {
    it('returns currently uploaded images', async () => {
      const result = await svc.getUploadedImages()
      expect(result.success).toBe(true)
      if (result.success && result.data) {
        expect(result.data.images).toEqual([])
      }
    })
  })
})
