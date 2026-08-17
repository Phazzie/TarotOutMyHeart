/**
 * @fileoverview TDD tests for ImageUploadService (real implementation).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ImageUploadService } from '../../services/real/ImageUploadService'

const makeFile = (name: string, type: string, sizeBytes: number): File => {
  const buffer = new ArrayBuffer(sizeBytes)
  return new File([buffer], name, { type })
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
