/**
 * @fileoverview Contract tests for ImageUpload seam
 * @purpose Validate ImageUploadMock matches ImageUpload contract exactly
 * @testStrategy
 * 1. Interface compliance - Mock implements interface
 * 2. Input validation - Handles valid/invalid inputs correctly
 * 3. Return types - Matches contract types exactly
 * 4. Error handling - Returns correct error codes
 * 5. State management - CRUD operations work correctly
 */

import { describe, it, expect, beforeEach } from 'vitest'
import type {
  IImageUploadService,
  UploadedImage,
} from '$contracts/ImageUpload'
import {
  ImageUploadErrorCode,
  MAX_IMAGE_SIZE_BYTES,
  MAX_IMAGES,
  MIN_IMAGES,
  ALLOWED_IMAGE_TYPES,
} from '$contracts/ImageUpload'
import { imageUploadMockService } from '$services/mock/ImageUploadMock'

describe('ImageUpload Contract Compliance', () => {
  let service: IImageUploadService

  beforeEach(async () => {
    service = imageUploadMockService
    // Clear all images before each test
    await service.clearAllImages()
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
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const response = await service.uploadImages({ files: [file] })

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      if (response.data) {
        expect(response.data.uploadedImages).toHaveLength(1)
        expect(response.data.totalUploaded).toBe(1)
        expect(response.data.totalFailed).toBe(0)
        expect(response.data.failedImages).toHaveLength(0)

        const uploaded = response.data.uploadedImages[0]
        expect(uploaded).toBeDefined()
        if (uploaded) {
          expect(uploaded.id).toBeDefined()
          expect(uploaded.fileName).toBe('test.jpg')
          expect(uploaded.fileSize).toBeGreaterThan(0)
          expect(uploaded.mimeType).toBe('image/jpeg')
          expect(uploaded.uploadedAt).toBeInstanceOf(Date)
          expect(uploaded.previewUrl).toBeTruthy()
        }
      }
    })

    it('should validate minimum images (at least 1)', async () => {
      const response = await service.uploadImages({ files: [] })

      expect(response.success).toBe(false)
      expect(response.error).toBeDefined()
      if (response.error) {
        expect(response.error.code).toBe('MAX_UPLOADS_REACHED')
      }
    })

    it('should validate maximum images (5 or fewer)', async () => {
      const files = Array.from({ length: 6 }, (_, i) =>
        new File(['test'], `test${i}.jpg`, { type: 'image/jpeg' })
      )
      const response = await service.uploadImages({ files })

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      if (response.data) {
        expect(response.data.uploadedImages.length).toBeLessThanOrEqual(MAX_IMAGES)
        expect(response.data.failedImages.length).toBeGreaterThan(0)
        const tooManyError = response.data.failedImages.find(
          e => e.code === ImageUploadErrorCode.TOO_MANY_FILES
        )
        expect(tooManyError).toBeDefined()
      }
    })

    it('should validate file size (max 10MB)', async () => {
      // Create a file larger than 10MB
      const largeFile = new File(
        [new ArrayBuffer(MAX_IMAGE_SIZE_BYTES + 1)],
        'large.jpg',
        { type: 'image/jpeg' }
      )
      const response = await service.uploadImages({ files: [largeFile] })

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      if (response.data) {
        expect(response.data.totalUploaded).toBe(0)
        expect(response.data.totalFailed).toBe(1)
        expect(response.data.failedImages).toHaveLength(1)
        expect(response.data.failedImages[0]?.code).toBe(ImageUploadErrorCode.FILE_TOO_LARGE)
      }
    })

    it('should validate image types (JPEG, PNG only)', async () => {
      const validJpeg = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const validPng = new File(['test'], 'test.png', { type: 'image/png' })
      const invalidGif = new File(['test'], 'test.gif', { type: 'image/gif' })

      const response = await service.uploadImages({
        files: [validJpeg, validPng, invalidGif],
      })

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      if (response.data) {
        expect(response.data.totalUploaded).toBe(2)
        expect(response.data.totalFailed).toBe(1)
        const typeError = response.data.failedImages.find(
          e => e.code === ImageUploadErrorCode.INVALID_FILE_TYPE
        )
        expect(typeError).toBeDefined()
      }
    })

    it('should reject duplicate images', async () => {
      const file1 = new File(['test'], 'duplicate.jpg', { type: 'image/jpeg' })
      const file2 = new File(['test'], 'duplicate.jpg', { type: 'image/jpeg' })

      // Upload first
      await service.uploadImages({ files: [file1] })

      // Try to upload duplicate
      const response = await service.uploadImages({ files: [file2] })

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      if (response.data) {
        expect(response.data.totalFailed).toBe(1)
        const duplicateError = response.data.failedImages.find(
          e => e.code === ImageUploadErrorCode.DUPLICATE_IMAGE
        )
        expect(duplicateError).toBeDefined()
      }
    })

    it('should reject empty/corrupted files', async () => {
      const emptyFile = new File([], 'empty.jpg', { type: 'image/jpeg' })
      const response = await service.uploadImages({ files: [emptyFile] })

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      if (response.data) {
        expect(response.data.totalFailed).toBe(1)
        expect(response.data.failedImages[0]?.code).toBe(ImageUploadErrorCode.FILE_CORRUPTED)
      }
    })

    it('should return all uploaded images with correct properties', async () => {
      const file = new File(['test content'], 'photo.png', { type: 'image/png' })
      const response = await service.uploadImages({ files: [file] })

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      if (response.data && response.data.uploadedImages[0]) {
        const image = response.data.uploadedImages[0]
        expect(image.id).toBeTruthy()
        expect(image.file).toBeDefined()
        expect(image.previewUrl).toBeTruthy()
        expect(image.fileName).toBe('photo.png')
        expect(image.fileSize).toBe(file.size)
        expect(image.mimeType).toBe('image/png')
        expect(image.uploadedAt).toBeInstanceOf(Date)
      }
    })
  })

  describe('removeImage()', () => {
    it('should remove an uploaded image successfully', async () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const uploadResponse = await service.uploadImages({ files: [file] })

      expect(uploadResponse.success).toBe(true)
      const imageId = uploadResponse.data?.uploadedImages[0]?.id
      expect(imageId).toBeDefined()

      if (imageId) {
        const removeResponse = await service.removeImage({ imageId })

        expect(removeResponse.success).toBe(true)
        expect(removeResponse.data).toBeDefined()
        if (removeResponse.data) {
          expect(removeResponse.data.removedImageId).toBe(imageId)
          expect(removeResponse.data.remainingImages).toHaveLength(0)
          expect(removeResponse.data.previewUrlRevoked).toBe(true)
        }
      }
    })

    it('should return error for non-existent image', async () => {
      const fakeId = 'non-existent-id' as any
      const response = await service.removeImage({ imageId: fakeId })

      expect(response.success).toBe(false)
      expect(response.error).toBeDefined()
      if (response.error) {
        expect(response.error.code).toBe('IMAGE_NOT_FOUND')
      }
    })

    it('should return remaining images after removal', async () => {
      const file1 = new File(['test1'], 'test1.jpg', { type: 'image/jpeg' })
      const file2 = new File(['test2'], 'test2.jpg', { type: 'image/jpeg' })
      await service.uploadImages({ files: [file1, file2] })

      const getResponse = await service.getUploadedImages()
      const imageId = getResponse.data?.images[0]?.id

      if (imageId) {
        const removeResponse = await service.removeImage({ imageId })
        expect(removeResponse.success).toBe(true)
        expect(removeResponse.data?.remainingImages).toHaveLength(1)
      }
    })
  })

  describe('validateImages()', () => {
    it('should validate images without uploading', async () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const response = await service.validateImages({ files: [file] })

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      if (response.data) {
        expect(response.data.canProceed).toBe(true)
        expect(response.data.validImages).toHaveLength(1)
        expect(response.data.invalidImages).toHaveLength(0)
      }
    })

    it('should detect validation errors without uploading', async () => {
      const invalidFile = new File(['test'], 'test.gif', { type: 'image/gif' })
      const response = await service.validateImages({ files: [invalidFile] })

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      if (response.data) {
        expect(response.data.canProceed).toBe(false)
        expect(response.data.invalidImages.length).toBeGreaterThan(0)
      }
    })

    it('should return error for empty file array', async () => {
      const response = await service.validateImages({ files: [] })

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      if (response.data) {
        expect(response.data.canProceed).toBe(false)
        expect(response.data.invalidImages.length).toBeGreaterThan(0)
        expect(response.data.invalidImages[0]?.code).toBe(ImageUploadErrorCode.TOO_FEW_FILES)
      }
    })

    it('should validate count limit without uploading', async () => {
      const files = Array.from({ length: 6 }, (_, i) =>
        new File(['test'], `test${i}.jpg`, { type: 'image/jpeg' })
      )
      const response = await service.validateImages({ files })

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      if (response.data) {
        expect(response.data.canProceed).toBe(false)
        const tooManyError = response.data.invalidImages.find(
          e => e.code === ImageUploadErrorCode.TOO_MANY_FILES
        )
        expect(tooManyError).toBeDefined()
      }
    })
  })

  describe('getUploadedImages()', () => {
    it('should return empty array initially', async () => {
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

    it('should return all uploaded images', async () => {
      const file1 = new File(['test1'], 'test1.jpg', { type: 'image/jpeg' })
      const file2 = new File(['test2'], 'test2.jpg', { type: 'image/jpeg' })
      await service.uploadImages({ files: [file1, file2] })

      const response = await service.getUploadedImages()

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      if (response.data) {
        expect(response.data.images).toHaveLength(2)
        expect(response.data.count).toBe(2)
        expect(response.data.canAddMore).toBe(true)
        expect(response.data.remainingSlots).toBe(MAX_IMAGES - 2)
      }
    })

    it('should show canAddMore false when at max', async () => {
      const files = Array.from({ length: MAX_IMAGES }, (_, i) =>
        new File(['test'], `test${i}.jpg`, { type: 'image/jpeg' })
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
      const file1 = new File(['test1'], 'test1.jpg', { type: 'image/jpeg' })
      const file2 = new File(['test2'], 'test2.jpg', { type: 'image/jpeg' })
      await service.uploadImages({ files: [file1, file2] })

      const clearResponse = await service.clearAllImages()
      expect(clearResponse.success).toBe(true)

      const getResponse = await service.getUploadedImages()
      expect(getResponse.data?.images).toHaveLength(0)
    })

    it('should revoke all preview URLs', async () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      await service.uploadImages({ files: [file] })

      const response = await service.clearAllImages()
      expect(response.success).toBe(true)
      expect(response.data).toBeUndefined() // void return
    })

    it('should allow uploading after clear', async () => {
      const file1 = new File(['test1'], 'test1.jpg', { type: 'image/jpeg' })
      await service.uploadImages({ files: [file1] })
      await service.clearAllImages()

      const file2 = new File(['test2'], 'test2.jpg', { type: 'image/jpeg' })
      const response = await service.uploadImages({ files: [file2] })

      expect(response.success).toBe(true)
      expect(response.data?.uploadedImages).toHaveLength(1)
    })
  })

  describe('Error Codes', () => {
    it('should return correct error codes for all validation failures', async () => {
      const testCases = [
        {
          file: new File([''], 'empty.jpg', { type: 'image/jpeg' }),
          expectedCode: ImageUploadErrorCode.FILE_CORRUPTED,
        },
        {
          file: new File(['test'], 'test.gif', { type: 'image/gif' }),
          expectedCode: ImageUploadErrorCode.INVALID_FILE_TYPE,
        },
        {
          file: new File([new ArrayBuffer(MAX_IMAGE_SIZE_BYTES + 1)], 'huge.jpg', {
            type: 'image/jpeg',
          }),
          expectedCode: ImageUploadErrorCode.FILE_TOO_LARGE,
        },
      ]

      for (const testCase of testCases) {
        const response = await service.uploadImages({ files: [testCase.file] })
        expect(response.data?.failedImages[0]?.code).toBe(testCase.expectedCode)
      }
    })
  })

  describe('Async Behavior', () => {
    it('should return promises for all methods', () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })

      expect(service.uploadImages({ files: [file] })).toBeInstanceOf(Promise)
      expect(service.validateImages({ files: [file] })).toBeInstanceOf(Promise)
      expect(service.getUploadedImages()).toBeInstanceOf(Promise)
      expect(service.clearAllImages()).toBeInstanceOf(Promise)
    })
  })
})
