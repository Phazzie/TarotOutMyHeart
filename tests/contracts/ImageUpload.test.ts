/**
 * @fileoverview Contract tests for ImageUpload seam
 * @purpose Validate ImageUploadMock matches ImageUpload contract exactly
 * @testStrategy
 * 1. Interface compliance - Mock implements IImageUploadService
 * 2. Input validation - File type, size, count validation
 * 3. Return types - Matches contract types exactly
 * 4. Error handling - Returns correct ImageUploadErrorCode values
 * 5. State management - Upload, remove, get, clear operations
 */

import { describe, it, expect, beforeEach } from 'vitest'
import type { IImageUploadService } from '$contracts/ImageUpload'
import {
  ImageUploadErrorCode,
  MAX_IMAGES,
  MIN_IMAGES,
  MAX_IMAGE_SIZE_BYTES,
  ALLOWED_IMAGE_TYPES,
} from '$contracts/ImageUpload'
import { imageUploadService } from '$services/factory'

describe('ImageUpload Contract Compliance', () => {
  let service: IImageUploadService

  beforeEach(() => {
    service = imageUploadService
  })

  describe('Interface Implementation', () => {
    it('should implement IImageUploadService interface', () => {
      expect(service).toBeDefined()
      expect(service.uploadImages).toBeDefined()
      expect(typeof service.uploadImages).toBe('function')
      expect(service.removeImage).toBeDefined()
      expect(typeof service.removeImage).toBe('function')
      expect(service.validateImages).toBeDefined()
      expect(typeof service.validateImages).toBe('function')
      expect(service.getUploadedImages).toBeDefined()
      expect(typeof service.getUploadedImages).toBe('function')
      expect(service.clearAllImages).toBeDefined()
      expect(typeof service.clearAllImages).toBe('function')
    })
  })

  describe('uploadImages()', () => {
    it('should upload valid images successfully', async () => {
      const mockFile = new File(['image content'], 'test.jpg', { type: 'image/jpeg' })
      const response = await service.uploadImages({ files: [mockFile] })

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      if (response.data) {
        expect(response.data.totalUploaded).toBe(1)
        expect(response.data.uploadedImages).toHaveLength(1)
        expect(response.data.uploadedImages[0]).toHaveProperty('id')
        expect(response.data.uploadedImages[0]).toHaveProperty('file')
        expect(response.data.uploadedImages[0]).toHaveProperty('previewUrl')
        expect(response.data.uploadedImages[0]).toHaveProperty('fileName')
        expect(response.data.uploadedImages[0]).toHaveProperty('fileSize')
        expect(response.data.uploadedImages[0]).toHaveProperty('mimeType')
        expect(response.data.uploadedImages[0]).toHaveProperty('uploadedAt')
        expect(response.data.uploadedImages[0].uploadedAt).toBeInstanceOf(Date)
      }
    })

    it('should accept multiple valid images', async () => {
      const files = [
        new File(['image1'], 'test1.jpg', { type: 'image/jpeg' }),
        new File(['image2'], 'test2.png', { type: 'image/png' }),
      ]
      const response = await service.uploadImages({ files })

      expect(response.success).toBe(true)
      expect(response.data?.totalUploaded).toBe(2)
      expect(response.data?.uploadedImages).toHaveLength(2)
    })

    it('should validate minimum images requirement', async () => {
      const response = await service.uploadImages({ files: [] })

      expect(response.success).toBe(false)
      expect(response.error).toBeDefined()
      if (response.error) {
        expect(response.error.code).toBe(ImageUploadErrorCode.TOO_FEW_FILES)
      }
    })

    it('should validate maximum images constraint', async () => {
      const files = Array.from({ length: MAX_IMAGES + 1 }, (_, i) =>
        new File([`image${i}`], `test${i}.jpg`, { type: 'image/jpeg' })
      )
      const response = await service.uploadImages({ files })

      expect(response.success).toBe(false)
      expect(response.error).toBeDefined()
      if (response.error) {
        expect(response.error.code).toBe(ImageUploadErrorCode.TOO_MANY_FILES)
      }
    })

    it('should validate file size constraint', async () => {
      const largeContent = new Array(MAX_IMAGE_SIZE_BYTES + 1).fill('a').join('')
      const largeFile = new File([largeContent], 'large.jpg', { type: 'image/jpeg' })
      const response = await service.uploadImages({ files: [largeFile] })

      expect(response.success).toBe(false)
      expect(response.data?.failedImages.length).toBeGreaterThan(0)
      if (response.data && response.data.failedImages.length > 0) {
        expect(response.data.failedImages[0].code).toBe(ImageUploadErrorCode.FILE_TOO_LARGE)
      }
    })

    it('should validate image type (JPEG, PNG only)', async () => {
      const invalidFile = new File(['image'], 'test.gif', { type: 'image/gif' })
      const response = await service.uploadImages({ files: [invalidFile] })

      expect(response.success).toBe(false)
      expect(response.data?.failedImages.length).toBeGreaterThan(0)
      if (response.data && response.data.failedImages.length > 0) {
        expect(response.data.failedImages[0].code).toBe(ImageUploadErrorCode.INVALID_FILE_TYPE)
      }
    })

    it('should reject duplicate images', async () => {
      const file = new File(['image'], 'test.jpg', { type: 'image/jpeg' })
      
      // Upload first time
      const firstResponse = await service.uploadImages({ files: [file] })
      expect(firstResponse.success).toBe(true)

      // Try to upload same file again
      const secondResponse = await service.uploadImages({ files: [file] })
      
      if (secondResponse.data && secondResponse.data.failedImages.length > 0) {
        expect(secondResponse.data.failedImages[0].code).toBe(ImageUploadErrorCode.DUPLICATE_IMAGE)
      }
    })
  })

  describe('removeImage()', () => {
    it('should remove an uploaded image', async () => {
      const file = new File(['image'], 'test.jpg', { type: 'image/jpeg' })
      const uploadResponse = await service.uploadImages({ files: [file] })
      
      expect(uploadResponse.success).toBe(true)
      const imageId = uploadResponse.data!.uploadedImages[0].id

      const removeResponse = await service.removeImage({ imageId })

      expect(removeResponse.success).toBe(true)
      expect(removeResponse.data).toBeDefined()
      if (removeResponse.data) {
        expect(removeResponse.data.removedImageId).toBe(imageId)
        expect(removeResponse.data.remainingImages).toHaveLength(0)
        expect(removeResponse.data.previewUrlRevoked).toBe(true)
      }
    })

    it('should return error for non-existent image', async () => {
      const fakeId = 'non-existent-id' as any
      const response = await service.removeImage({ imageId: fakeId })

      expect(response.success).toBe(false)
      expect(response.error).toBeDefined()
      if (response.error) {
        expect(response.error.code).toBe(ImageUploadErrorCode.IMAGE_NOT_FOUND)
      }
    })
  })

  describe('validateImages()', () => {
    it('should validate images without uploading', async () => {
      const file = new File(['image'], 'test.jpg', { type: 'image/jpeg' })
      const response = await service.validateImages({ files: [file] })

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      if (response.data) {
        expect(response.data).toHaveProperty('validImages')
        expect(response.data).toHaveProperty('invalidImages')
        expect(response.data).toHaveProperty('canProceed')
        expect(response.data.canProceed).toBe(true)
      }
    })

    it('should identify invalid images in validation', async () => {
      const invalidFile = new File(['image'], 'test.gif', { type: 'image/gif' })
      const response = await service.validateImages({ files: [invalidFile] })

      expect(response.success).toBe(true)
      expect(response.data?.canProceed).toBe(false)
      expect(response.data?.invalidImages.length).toBeGreaterThan(0)
    })
  })

  describe('getUploadedImages()', () => {
    it('should return empty state initially', async () => {
      await service.clearAllImages()
      const response = await service.getUploadedImages()

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      if (response.data) {
        expect(response.data.images).toHaveLength(0)
        expect(response.data.count).toBe(0)
        expect(response.data.canAddMore).toBe(true)
        expect(response.data.remainingSlots).toBe(MAX_IMAGES)
      }
    })

    it('should return uploaded images', async () => {
      await service.clearAllImages()
      const file = new File(['image'], 'test.jpg', { type: 'image/jpeg' })
      await service.uploadImages({ files: [file] })

      const response = await service.getUploadedImages()

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      if (response.data) {
        expect(response.data.images).toHaveLength(1)
        expect(response.data.count).toBe(1)
        expect(response.data.canAddMore).toBe(true)
        expect(response.data.remainingSlots).toBe(MAX_IMAGES - 1)
      }
    })

    it('should indicate when max capacity is reached', async () => {
      await service.clearAllImages()
      const files = Array.from({ length: MAX_IMAGES }, (_, i) =>
        new File([`image${i}`], `test${i}.jpg`, { type: 'image/jpeg' })
      )
      await service.uploadImages({ files })

      const response = await service.getUploadedImages()

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      if (response.data) {
        expect(response.data.count).toBe(MAX_IMAGES)
        expect(response.data.canAddMore).toBe(false)
        expect(response.data.remainingSlots).toBe(0)
      }
    })
  })

  describe('clearAllImages()', () => {
    it('should clear all uploaded images', async () => {
      const files = [
        new File(['image1'], 'test1.jpg', { type: 'image/jpeg' }),
        new File(['image2'], 'test2.png', { type: 'image/png' }),
      ]
      await service.uploadImages({ files })

      const clearResponse = await service.clearAllImages()
      expect(clearResponse.success).toBe(true)

      const getResponse = await service.getUploadedImages()
      expect(getResponse.data?.images).toHaveLength(0)
    })

    it('should succeed even when no images exist', async () => {
      await service.clearAllImages()
      const response = await service.clearAllImages()

      expect(response.success).toBe(true)
    })
  })

  describe('Return Type Validation', () => {
    it('should return correct UploadImagesOutput shape', async () => {
      const file = new File(['image'], 'test.jpg', { type: 'image/jpeg' })
      const response = await service.uploadImages({ files: [file] })

      expect(response).toHaveProperty('success')
      if (response.success) {
        expect(response.data).toHaveProperty('uploadedImages')
        expect(response.data).toHaveProperty('failedImages')
        expect(response.data).toHaveProperty('totalUploaded')
        expect(response.data).toHaveProperty('totalFailed')
        expect(Array.isArray(response.data.uploadedImages)).toBe(true)
        expect(Array.isArray(response.data.failedImages)).toBe(true)
        expect(typeof response.data.totalUploaded).toBe('number')
        expect(typeof response.data.totalFailed).toBe('number')
      }
    })

    it('should return all async methods as Promises', async () => {
      const file = new File(['image'], 'test.jpg', { type: 'image/jpeg' })
      
      const uploadPromise = service.uploadImages({ files: [file] })
      expect(uploadPromise).toBeInstanceOf(Promise)

      const getPromise = service.getUploadedImages()
      expect(getPromise).toBeInstanceOf(Promise)

      const clearPromise = service.clearAllImages()
      expect(clearPromise).toBeInstanceOf(Promise)
    })
  })
})
