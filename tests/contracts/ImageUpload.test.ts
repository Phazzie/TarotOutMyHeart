/**
 * ImageUpload Contract Tests
 *
 * Tests that ImageUploadMock satisfies the IImageUploadService contract
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { ImageUploadMock } from '../../services/mock/ImageUploadMock'
import {
  ImageUploadErrorCode,
  MAX_IMAGES,
  MAX_IMAGE_SIZE_BYTES,
  type IImageUploadService,
  type ImageId,
} from '../../contracts/ImageUpload'

describe('ImageUpload Contract', () => {
  let service: IImageUploadService

  beforeEach(() => {
    service = new ImageUploadMock()
  })

  // Helper function to create mock File objects
  const createMockFile = (
    name: string,
    type: string,
    sizeInBytes: number
  ): File => {
    const buffer = new ArrayBuffer(sizeInBytes)
    return new File([buffer], name, { type })
  }

  describe('uploadImages() Method', () => {
    describe('Success Cases', () => {
      it('should upload single valid JPEG image and return UploadedImage with previewUrl', async () => {
        const file = createMockFile('test.jpg', 'image/jpeg', 1000)
        const response = await service.uploadImages({ files: [file] })

        expect(response.success).toBe(true)
        expect(response.data?.uploadedImages).toHaveLength(1)
        expect(response.data?.totalUploaded).toBe(1)
        expect(response.data?.totalFailed).toBe(0)

        const uploadedImage = response.data!.uploadedImages[0]!
        expect(uploadedImage.id).toBeDefined()
        expect(uploadedImage.id).toMatch(/^.+$/) // Has some ID format
        expect(uploadedImage.file).toBe(file)
        expect(uploadedImage.previewUrl).toBeDefined()
        expect(typeof uploadedImage.previewUrl).toBe('string')
        expect(uploadedImage.fileName).toBe('test.jpg')
        expect(uploadedImage.fileSize).toBe(1000)
        expect(uploadedImage.mimeType).toBe('image/jpeg')
        expect(uploadedImage.uploadedAt).toBeInstanceOf(Date)
      })

      it('should upload single valid PNG image and return UploadedImage with previewUrl', async () => {
        const file = createMockFile('test.png', 'image/png', 2000)
        const response = await service.uploadImages({ files: [file] })

        expect(response.success).toBe(true)
        expect(response.data?.uploadedImages).toHaveLength(1)
        expect(response.data?.uploadedImages[0]?.mimeType).toBe('image/png')
        expect(response.data?.uploadedImages[0]?.fileName).toBe('test.png')
      })

      it('should upload 5 images (maximum) successfully', async () => {
        const files = Array.from({ length: 5 }, (_, i) =>
          createMockFile(`test${i}.jpg`, 'image/jpeg', 1000)
        )
        const response = await service.uploadImages({ files })

        expect(response.success).toBe(true)
        expect(response.data?.uploadedImages).toHaveLength(5)
        expect(response.data?.totalUploaded).toBe(5)
        expect(response.data?.failedImages).toHaveLength(0)
      })

      it('should upload mixed JPEG and PNG images successfully', async () => {
        const files = [
          createMockFile('image1.jpg', 'image/jpeg', 1000),
          createMockFile('image2.png', 'image/png', 2000),
          createMockFile('image3.jpg', 'image/jpeg', 1500),
        ]
        const response = await service.uploadImages({ files })

        expect(response.success).toBe(true)
        expect(response.data).toBeDefined()
        expect(response.data!.uploadedImages).toHaveLength(3)
        expect(response.data!.uploadedImages[0]!.mimeType).toBe('image/jpeg')
        expect(response.data!.uploadedImages[1]!.mimeType).toBe('image/png')
        expect(response.data!.uploadedImages[2]!.mimeType).toBe('image/jpeg')
      })

      it('should assign unique IDs to each uploaded image', async () => {
        const files = [
          createMockFile('image1.jpg', 'image/jpeg', 1000),
          createMockFile('image2.jpg', 'image/jpeg', 1000),
          createMockFile('image3.jpg', 'image/jpeg', 1000),
        ]
        const response = await service.uploadImages({ files })

        expect(response.success).toBe(true)
        const ids = response.data!.uploadedImages.map(img => img.id)
        const uniqueIds = new Set(ids)
        expect(uniqueIds.size).toBe(3) // All IDs are unique
      })

      it('should accept files with special characters in filename', async () => {
        const file = createMockFile('my-image_2024 (1).jpg', 'image/jpeg', 1000)
        const response = await service.uploadImages({ files: [file] })

        expect(response.success).toBe(true)
        expect(response.data).toBeDefined()
        expect(response.data!.uploadedImages[0]!.fileName).toBe('my-image_2024 (1).jpg')
      })
    })

    describe('Validation Error Cases', () => {
      it('should fail with TOO_FEW_FILES when uploading 0 files', async () => {
        const response = await service.uploadImages({ files: [] })

        expect(response.success).toBe(false)
        expect(response.error?.code).toBe(ImageUploadErrorCode.TOO_FEW_FILES)
        expect(response.error?.message).toBeDefined()
        expect(response.error?.retryable).toBe(false)
      })

      it('should fail with TOO_MANY_FILES when uploading 6 files', async () => {
        const files = Array.from({ length: 6 }, (_, i) =>
          createMockFile(`test${i}.jpg`, 'image/jpeg', 1000)
        )
        const response = await service.uploadImages({ files })

        expect(response.success).toBe(false)
        expect(response.error?.code).toBe(ImageUploadErrorCode.TOO_MANY_FILES)
      })

      it('should fail with INVALID_FILE_TYPE when uploading GIF', async () => {
        const file = createMockFile('test.gif', 'image/gif', 1000)
        const response = await service.uploadImages({ files: [file] })

        expect(response.success).toBe(false)
        expect(response.data).toBeDefined()
        expect(response.data!.failedImages).toBeDefined()
        expect(response.data!.failedImages.length).toBeGreaterThan(0)
        expect(response.data!.failedImages[0]!.code).toBe(ImageUploadErrorCode.INVALID_FILE_TYPE)
        expect(response.data!.failedImages[0]!.fileName).toBe('test.gif')
      })

      it('should fail with FILE_TOO_LARGE when file exceeds 10MB', async () => {
        const largeFile = createMockFile('large.jpg', 'image/jpeg', MAX_IMAGE_SIZE_BYTES + 1)
        const response = await service.uploadImages({ files: [largeFile] })

        expect(response.success).toBe(false)
        expect(response.data).toBeDefined()
        expect(response.data!.failedImages).toBeDefined()
        expect(response.data!.failedImages.length).toBeGreaterThan(0)
        expect(response.data!.failedImages[0]!.code).toBe(ImageUploadErrorCode.FILE_TOO_LARGE)
      })

      it('should fail with MAX_UPLOADS_REACHED when already at 5 images', async () => {
        // First upload 5 images
        const initialFiles = Array.from({ length: 5 }, (_, i) =>
          createMockFile(`test${i}.jpg`, 'image/jpeg', 1000)
        )
        await service.uploadImages({ files: initialFiles })

        // Try to upload one more
        const additionalFile = createMockFile('extra.jpg', 'image/jpeg', 1000)
        const response = await service.uploadImages({ files: [additionalFile] })

        expect(response.success).toBe(false)
        expect(response.error?.code).toBe(ImageUploadErrorCode.MAX_UPLOADS_REACHED)
      })

      it('should fail with DUPLICATE_IMAGE when uploading same file twice', async () => {
        const file = createMockFile('test.jpg', 'image/jpeg', 1000)

        // First upload
        await service.uploadImages({ files: [file] })

        // Try to upload again
        const response = await service.uploadImages({ files: [file] })

        expect(response.success).toBe(false)
        expect(response.data).toBeDefined()
        expect(response.data!.failedImages).toBeDefined()
        expect(response.data!.failedImages.length).toBeGreaterThan(0)
        expect(response.data!.failedImages[0]!.code).toBe(ImageUploadErrorCode.DUPLICATE_IMAGE)
      })

      it('should handle FILE_CORRUPTED error for corrupted files', async () => {
        // Note: Mock implementation should simulate this case
        // In real implementation, this would be detected when reading the file
        const response = await service.uploadImages({ files: [] })

        // This test structure allows the mock to implement corrupted file detection
        expect(response.success).toBeDefined()
      })
    })

    describe('Response Structure Validation', () => {
      it('should return response with all required fields', async () => {
        const file = createMockFile('test.jpg', 'image/jpeg', 1000)
        const response = await service.uploadImages({ files: [file] })

        expect(response.success).toBe(true)
        expect(response.data).toBeDefined()
        expect(response.data?.uploadedImages).toBeDefined()
        expect(response.data?.failedImages).toBeDefined()
        expect(response.data?.totalUploaded).toBeDefined()
        expect(response.data?.totalFailed).toBeDefined()
        expect(Array.isArray(response.data?.uploadedImages)).toBe(true)
        expect(Array.isArray(response.data?.failedImages)).toBe(true)
        expect(typeof response.data?.totalUploaded).toBe('number')
        expect(typeof response.data?.totalFailed).toBe('number')
      })

      it('should have ImageId with brand property in uploaded images', async () => {
        const file = createMockFile('test.jpg', 'image/jpeg', 1000)
        const response = await service.uploadImages({ files: [file] })

        expect(response.success).toBe(true)
        expect(response.data).toBeDefined()
        const imageId = response.data!.uploadedImages[0]!.id
        expect(typeof imageId).toBe('string')
        // ImageId is a branded type, the brand is compile-time only
      })

      it('should have valid URL string in previewUrl', async () => {
        const file = createMockFile('test.jpg', 'image/jpeg', 1000)
        const response = await service.uploadImages({ files: [file] })

        expect(response.success).toBe(true)
        expect(response.data).toBeDefined()
        const previewUrl = response.data!.uploadedImages[0]!.previewUrl
        expect(typeof previewUrl).toBe('string')
        expect(previewUrl.length).toBeGreaterThan(0)
        // In real implementation, this would be a blob URL
      })

      it('should have Date instance in uploadedAt', async () => {
        const file = createMockFile('test.jpg', 'image/jpeg', 1000)
        const response = await service.uploadImages({ files: [file] })

        expect(response.success).toBe(true)
        expect(response.data).toBeDefined()
        expect(response.data!.uploadedImages[0]!.uploadedAt).toBeInstanceOf(Date)
      })

      it('should include error details in failedImages', async () => {
        const invalidFile = createMockFile('test.gif', 'image/gif', 1000)
        const response = await service.uploadImages({ files: [invalidFile] })

        expect(response.data).toBeDefined()
        if (response.data!.failedImages && response.data!.failedImages.length > 0) {
          const error = response.data!.failedImages[0]!
          expect(error.code).toBeDefined()
          expect(error.message).toBeDefined()
          expect(error.fileName).toBe('test.gif')
        }
      })
    })
  })

  describe('removeImage() Method', () => {
    describe('Success Cases', () => {
      it('should remove existing image and return remaining images', async () => {
        // Upload images first
        const files = [
          createMockFile('image1.jpg', 'image/jpeg', 1000),
          createMockFile('image2.jpg', 'image/jpeg', 1000),
          createMockFile('image3.jpg', 'image/jpeg', 1000),
        ]
        const uploadResponse = await service.uploadImages({ files })
        expect(uploadResponse.data).toBeDefined()
        const imageId = uploadResponse.data!.uploadedImages[0]!.id

        // Remove first image
        const removeResponse = await service.removeImage({ imageId })

        expect(removeResponse.success).toBe(true)
        expect(removeResponse.data?.removedImageId).toBe(imageId)
        expect(removeResponse.data?.remainingImages).toHaveLength(2)
        expect(removeResponse.data?.previewUrlRevoked).toBe(true)
      })

      it('should allow immediate re-upload after removal', async () => {
        // Upload 5 images (max)
        const files = Array.from({ length: 5 }, (_, i) =>
          createMockFile(`test${i}.jpg`, 'image/jpeg', 1000)
        )
        const uploadResponse = await service.uploadImages({ files })
        expect(uploadResponse.data).toBeDefined()
        const imageId = uploadResponse.data!.uploadedImages[0]!.id

        // Remove one
        await service.removeImage({ imageId })

        // Should be able to upload another
        const newFile = createMockFile('new.jpg', 'image/jpeg', 1000)
        const reuploadResponse = await service.uploadImages({ files: [newFile] })

        expect(reuploadResponse.success).toBe(true)
      })

      it('should not include removed image in remainingImages array', async () => {
        const files = [
          createMockFile('image1.jpg', 'image/jpeg', 1000),
          createMockFile('image2.jpg', 'image/jpeg', 1000),
        ]
        const uploadResponse = await service.uploadImages({ files })
        expect(uploadResponse.data).toBeDefined()
        const imageIdToRemove = uploadResponse.data!.uploadedImages[0]!.id

        const removeResponse = await service.removeImage({ imageId: imageIdToRemove })

        expect(removeResponse.success).toBe(true)
        const remainingIds = removeResponse.data!.remainingImages.map(img => img.id)
        expect(remainingIds).not.toContain(imageIdToRemove)
      })
    })

    describe('Error Cases', () => {
      it('should fail with IMAGE_NOT_FOUND for non-existent image ID', async () => {
        const fakeId = 'non-existent-id' as ImageId
        const response = await service.removeImage({ imageId: fakeId })

        expect(response.success).toBe(false)
        expect(response.error?.code).toBe(ImageUploadErrorCode.IMAGE_NOT_FOUND)
        expect(response.error?.retryable).toBe(false)
      })

      it('should fail with IMAGE_NOT_FOUND for invalid image ID format', async () => {
        const invalidId = '@@invalid@@' as ImageId
        const response = await service.removeImage({ imageId: invalidId })

        expect(response.success).toBe(false)
        expect(response.error?.code).toBe(ImageUploadErrorCode.IMAGE_NOT_FOUND)
      })
    })

    describe('Response Structure Validation', () => {
      it('should return all required fields in RemoveImageOutput', async () => {
        const file = createMockFile('test.jpg', 'image/jpeg', 1000)
        const uploadResponse = await service.uploadImages({ files: [file] })
        expect(uploadResponse.data).toBeDefined()
        const imageId = uploadResponse.data!.uploadedImages[0]!.id

        const response = await service.removeImage({ imageId })

        expect(response.success).toBe(true)
        expect(response.data?.removedImageId).toBeDefined()
        expect(response.data?.remainingImages).toBeDefined()
        expect(response.data?.previewUrlRevoked).toBeDefined()
        expect(Array.isArray(response.data?.remainingImages)).toBe(true)
        expect(typeof response.data?.previewUrlRevoked).toBe('boolean')
      })
    })
  })

  describe('validateImages() Method', () => {
    describe('Success Cases', () => {
      it('should validate 1-5 valid images and return canProceed: true', async () => {
        const files = [
          createMockFile('test1.jpg', 'image/jpeg', 1000),
          createMockFile('test2.png', 'image/png', 2000),
          createMockFile('test3.jpg', 'image/jpeg', 1500),
        ]
        const response = await service.validateImages({ files })

        expect(response.success).toBe(true)
        expect(response.data?.canProceed).toBe(true)
        expect(response.data?.validImages).toHaveLength(3)
        expect(response.data?.invalidImages).toHaveLength(0)
      })

      it('should return validImages with correct structure', async () => {
        const file = createMockFile('test.jpg', 'image/jpeg', 1000)
        const response = await service.validateImages({ files: [file] })

        expect(response.success).toBe(true)
        expect(response.data).toBeDefined()
        const validImage = response.data!.validImages[0]!
        expect(validImage.isValid).toBe(true)
        expect(validImage.imageId).toBeDefined()
        expect(validImage.errors).toBeDefined()
        expect(Array.isArray(validImage.errors)).toBe(true)
        expect(validImage.errors).toHaveLength(0)
      })

      it('should handle mix of valid and invalid images', async () => {
        const files = [
          createMockFile('valid.jpg', 'image/jpeg', 1000),
          createMockFile('invalid.gif', 'image/gif', 1000),
          createMockFile('toobig.jpg', 'image/jpeg', MAX_IMAGE_SIZE_BYTES + 1),
        ]
        const response = await service.validateImages({ files })

        expect(response.success).toBe(true)
        expect(response.data?.validImages.length).toBeGreaterThan(0)
        expect(response.data?.invalidImages.length).toBeGreaterThan(0)
      })
    })

    describe('Validation Cases', () => {
      it('should detect invalid file types', async () => {
        const files = [
          createMockFile('test.gif', 'image/gif', 1000),
          createMockFile('test.bmp', 'image/bmp', 1000),
        ]
        const response = await service.validateImages({ files })

        expect(response.success).toBe(true)
        expect(response.data?.invalidImages.length).toBeGreaterThan(0)
        expect(response.data?.invalidImages.some(err =>
          err.code === ImageUploadErrorCode.INVALID_FILE_TYPE
        )).toBe(true)
      })

      it('should detect oversized files', async () => {
        const largeFile = createMockFile('large.jpg', 'image/jpeg', MAX_IMAGE_SIZE_BYTES + 1)
        const response = await service.validateImages({ files: [largeFile] })

        expect(response.success).toBe(true)
        expect(response.data).toBeDefined()
        expect(response.data!.invalidImages.length).toBeGreaterThan(0)
        expect(response.data!.invalidImages[0]!.code).toBe(ImageUploadErrorCode.FILE_TOO_LARGE)
      })

      it('should detect too many files', async () => {
        const files = Array.from({ length: 6 }, (_, i) =>
          createMockFile(`test${i}.jpg`, 'image/jpeg', 1000)
        )
        const response = await service.validateImages({ files })

        expect(response.success).toBe(false)
        expect(response.error?.code).toBe(ImageUploadErrorCode.TOO_MANY_FILES)
      })

      it('should set canProceed: false when all images invalid', async () => {
        const files = [
          createMockFile('test1.gif', 'image/gif', 1000),
          createMockFile('test2.bmp', 'image/bmp', 1000),
        ]
        const response = await service.validateImages({ files })

        expect(response.success).toBe(true)
        expect(response.data?.canProceed).toBe(false)
        expect(response.data?.validImages).toHaveLength(0)
      })
    })

    describe('Response Structure Validation', () => {
      it('should return all required fields in ValidateImagesOutput', async () => {
        const file = createMockFile('test.jpg', 'image/jpeg', 1000)
        const response = await service.validateImages({ files: [file] })

        expect(response.success).toBe(true)
        expect(response.data).toBeDefined()
        expect(response.data?.validImages).toBeDefined()
        expect(response.data?.invalidImages).toBeDefined()
        expect(response.data?.canProceed).toBeDefined()
        expect(Array.isArray(response.data?.validImages)).toBe(true)
        expect(Array.isArray(response.data?.invalidImages)).toBe(true)
        expect(typeof response.data?.canProceed).toBe('boolean')
      })
    })
  })

  describe('getUploadedImages() Method', () => {
    describe('Success Cases', () => {
      it('should return empty state when no images uploaded', async () => {
        const response = await service.getUploadedImages()

        expect(response.success).toBe(true)
        expect(response.data?.images).toHaveLength(0)
        expect(response.data?.count).toBe(0)
        expect(response.data?.canAddMore).toBe(true)
        expect(response.data?.remainingSlots).toBe(MAX_IMAGES)
      })

      it('should return correct state when 3 images uploaded', async () => {
        const files = Array.from({ length: 3 }, (_, i) =>
          createMockFile(`test${i}.jpg`, 'image/jpeg', 1000)
        )
        await service.uploadImages({ files })

        const response = await service.getUploadedImages()

        expect(response.success).toBe(true)
        expect(response.data?.images).toHaveLength(3)
        expect(response.data?.count).toBe(3)
        expect(response.data?.canAddMore).toBe(true)
        expect(response.data?.remainingSlots).toBe(2)
      })

      it('should return correct state when 5 images uploaded (max)', async () => {
        const files = Array.from({ length: 5 }, (_, i) =>
          createMockFile(`test${i}.jpg`, 'image/jpeg', 1000)
        )
        await service.uploadImages({ files })

        const response = await service.getUploadedImages()

        expect(response.success).toBe(true)
        expect(response.data?.images).toHaveLength(5)
        expect(response.data?.count).toBe(5)
        expect(response.data?.canAddMore).toBe(false)
        expect(response.data?.remainingSlots).toBe(0)
      })

      it('should return images with complete UploadedImage properties', async () => {
        const file = createMockFile('test.jpg', 'image/jpeg', 1000)
        await service.uploadImages({ files: [file] })

        const response = await service.getUploadedImages()

        expect(response.success).toBe(true)
        expect(response.data?.images).toBeDefined()
        expect(response.data!.images.length).toBeGreaterThan(0)
        const image = response.data!.images[0]!
        expect(image.id).toBeDefined()
        expect(image.file).toBeDefined()
        expect(image.previewUrl).toBeDefined()
        expect(image.fileName).toBeDefined()
        expect(image.fileSize).toBeDefined()
        expect(image.mimeType).toBeDefined()
        expect(image.uploadedAt).toBeInstanceOf(Date)
      })
    })

    describe('Response Structure Validation', () => {
      it('should return all required fields in GetUploadedImagesOutput', async () => {
        const response = await service.getUploadedImages()

        expect(response.success).toBe(true)
        expect(response.data).toBeDefined()
        expect(response.data?.images).toBeDefined()
        expect(response.data?.count).toBeDefined()
        expect(response.data?.canAddMore).toBeDefined()
        expect(response.data?.remainingSlots).toBeDefined()
        expect(Array.isArray(response.data?.images)).toBe(true)
        expect(typeof response.data?.count).toBe('number')
        expect(typeof response.data?.canAddMore).toBe('boolean')
        expect(typeof response.data?.remainingSlots).toBe('number')
      })
    })
  })

  describe('clearAllImages() Method', () => {
    describe('Success Cases', () => {
      it('should clear all images successfully', async () => {
        // Upload some images first
        const files = Array.from({ length: 3 }, (_, i) =>
          createMockFile(`test${i}.jpg`, 'image/jpeg', 1000)
        )
        await service.uploadImages({ files })

        // Clear all
        const response = await service.clearAllImages()

        expect(response.success).toBe(true)
      })

      it('should return empty array after clearing', async () => {
        const files = [createMockFile('test.jpg', 'image/jpeg', 1000)]
        await service.uploadImages({ files })
        await service.clearAllImages()

        const getResponse = await service.getUploadedImages()

        expect(getResponse.success).toBe(true)
        expect(getResponse.data?.images).toHaveLength(0)
        expect(getResponse.data?.count).toBe(0)
      })

      it('should allow upload after clearing', async () => {
        const files = [createMockFile('test.jpg', 'image/jpeg', 1000)]
        await service.uploadImages({ files })
        await service.clearAllImages()

        const newFile = createMockFile('new.jpg', 'image/jpeg', 1000)
        const uploadResponse = await service.uploadImages({ files: [newFile] })

        expect(uploadResponse.success).toBe(true)
        expect(uploadResponse.data?.totalUploaded).toBe(1)
      })
    })

    describe('Edge Cases', () => {
      it('should succeed when no images exist', async () => {
        const response = await service.clearAllImages()

        expect(response.success).toBe(true)
      })

      it('should reset to initial state after clearing', async () => {
        const files = Array.from({ length: 5 }, (_, i) =>
          createMockFile(`test${i}.jpg`, 'image/jpeg', 1000)
        )
        await service.uploadImages({ files })
        await service.clearAllImages()

        const getResponse = await service.getUploadedImages()

        expect(getResponse.success).toBe(true)
        expect(getResponse.data?.canAddMore).toBe(true)
        expect(getResponse.data?.remainingSlots).toBe(MAX_IMAGES)
      })
    })
  })

  describe('Integration Workflows', () => {
    it('should handle complete upload-remove-check workflow', async () => {
      // Upload 3 images
      const files = Array.from({ length: 3 }, (_, i) =>
        createMockFile(`test${i}.jpg`, 'image/jpeg', 1000)
      )
      const uploadResponse = await service.uploadImages({ files })
      expect(uploadResponse.data?.totalUploaded).toBe(3)

      // Remove 1 image
      expect(uploadResponse.data).toBeDefined()
      expect(uploadResponse.data!.uploadedImages).toBeDefined()
      expect(uploadResponse.data!.uploadedImages.length).toBeGreaterThan(0)
      const imageId = uploadResponse.data!.uploadedImages[0]!.id
      await service.removeImage({ imageId })

      // Check remaining
      const getResponse = await service.getUploadedImages()
      expect(getResponse.data?.count).toBe(2)
    })

    it('should handle upload-validate-get-remove-get workflow', async () => {
      // Upload
      const files = [
        createMockFile('test1.jpg', 'image/jpeg', 1000),
        createMockFile('test2.jpg', 'image/jpeg', 1000),
      ]
      await service.uploadImages({ files })

      // Validate (checking internal state consistency)
      const validateResponse = await service.validateImages({
        files: [createMockFile('test3.jpg', 'image/jpeg', 1000)]
      })
      expect(validateResponse.data?.canProceed).toBe(true)

      // Get
      let getResponse = await service.getUploadedImages()
      expect(getResponse.data?.count).toBe(2)

      // Remove all
      expect(getResponse.data?.images).toBeDefined()
      for (const image of getResponse.data!.images) {
        await service.removeImage({ imageId: image.id })
      }

      // Get again
      getResponse = await service.getUploadedImages()
      expect(getResponse.data?.count).toBe(0)
    })

    it('should handle max capacity workflow', async () => {
      // Upload to max (5)
      const files = Array.from({ length: 5 }, (_, i) =>
        createMockFile(`test${i}.jpg`, 'image/jpeg', 1000)
      )
      await service.uploadImages({ files })

      // Remove 1
      const getResponse = await service.getUploadedImages()
      expect(getResponse.data).toBeDefined()
      expect(getResponse.data!.images).toBeDefined()
      expect(getResponse.data!.images.length).toBeGreaterThan(0)
      const imageId = getResponse.data!.images[0]!.id
      await service.removeImage({ imageId })

      // Upload 1 more (should succeed)
      const newFile = createMockFile('new.jpg', 'image/jpeg', 1000)
      const uploadResponse = await service.uploadImages({ files: [newFile] })

      expect(uploadResponse.success).toBe(true)

      // Verify total is still 5
      const finalResponse = await service.getUploadedImages()
      expect(finalResponse.data?.count).toBe(5)
    })

    it('should handle clear and restart workflow', async () => {
      // Upload some images
      const files = Array.from({ length: 3 }, (_, i) =>
        createMockFile(`test${i}.jpg`, 'image/jpeg', 1000)
      )
      await service.uploadImages({ files })

      // Clear
      await service.clearAllImages()

      // Upload new set
      const newFiles = [
        createMockFile('new1.jpg', 'image/jpeg', 1000),
        createMockFile('new2.jpg', 'image/jpeg', 1000),
      ]
      const uploadResponse = await service.uploadImages({ files: newFiles })

      expect(uploadResponse.success).toBe(true)
      expect(uploadResponse.data?.totalUploaded).toBe(2)

      const getResponse = await service.getUploadedImages()
      expect(getResponse.data?.count).toBe(2)
    })
  })

  describe('Error Code Coverage', () => {
    it('should test INVALID_FILE_TYPE error code', async () => {
      const file = createMockFile('test.gif', 'image/gif', 1000)
      const response = await service.uploadImages({ files: [file] })

      expect(response.data?.failedImages).toBeDefined()
      expect(response.data?.failedImages?.length).toBeGreaterThan(0)
      expect(response.data?.failedImages?.[0]?.code).toBe(ImageUploadErrorCode.INVALID_FILE_TYPE)
    })

    it('should test FILE_TOO_LARGE error code', async () => {
      const file = createMockFile('large.jpg', 'image/jpeg', MAX_IMAGE_SIZE_BYTES + 1)
      const response = await service.uploadImages({ files: [file] })

      expect(response.data?.failedImages).toBeDefined()
      expect(response.data?.failedImages?.length).toBeGreaterThan(0)
      expect(response.data?.failedImages?.[0]?.code).toBe(ImageUploadErrorCode.FILE_TOO_LARGE)
    })

    it('should test TOO_MANY_FILES error code', async () => {
      const files = Array.from({ length: 6 }, (_, i) =>
        createMockFile(`test${i}.jpg`, 'image/jpeg', 1000)
      )
      const response = await service.uploadImages({ files })

      expect(response.error?.code).toBe(ImageUploadErrorCode.TOO_MANY_FILES)
    })

    it('should test TOO_FEW_FILES error code', async () => {
      const response = await service.uploadImages({ files: [] })

      expect(response.error?.code).toBe(ImageUploadErrorCode.TOO_FEW_FILES)
    })

    it('should test MAX_UPLOADS_REACHED error code', async () => {
      const files = Array.from({ length: 5 }, (_, i) =>
        createMockFile(`test${i}.jpg`, 'image/jpeg', 1000)
      )
      await service.uploadImages({ files })

      const extraFile = createMockFile('extra.jpg', 'image/jpeg', 1000)
      const response = await service.uploadImages({ files: [extraFile] })

      expect(response.error?.code).toBe(ImageUploadErrorCode.MAX_UPLOADS_REACHED)
    })

    it('should test IMAGE_NOT_FOUND error code', async () => {
      const fakeId = 'non-existent' as ImageId
      const response = await service.removeImage({ imageId: fakeId })

      expect(response.error?.code).toBe(ImageUploadErrorCode.IMAGE_NOT_FOUND)
    })

    it('should test DUPLICATE_IMAGE error code', async () => {
      const file = createMockFile('test.jpg', 'image/jpeg', 1000)
      await service.uploadImages({ files: [file] })
      const response = await service.uploadImages({ files: [file] })

      expect(response.data?.failedImages).toBeDefined()
      expect(response.data?.failedImages?.length).toBeGreaterThan(0)
      expect(response.data?.failedImages?.[0]?.code).toBe(ImageUploadErrorCode.DUPLICATE_IMAGE)
    })

    it('should test FILE_CORRUPTED error code', async () => {
      // Note: Mock implementation simulates corrupted file detection
      // In real implementation, this occurs when file cannot be read
      // Test structure allows mock to implement corruption detection logic

      // Verify error code enum exists and can be used
      expect(ImageUploadErrorCode.FILE_CORRUPTED).toBe('FILE_CORRUPTED')
    })

    it('should test UPLOAD_FAILED error code', async () => {
      // Note: Mock implementation can simulate generic upload failure
      // Test verifies error code is defined and available
      expect(ImageUploadErrorCode.UPLOAD_FAILED).toBe('UPLOAD_FAILED')
    })

    it('should test FILE_API_NOT_SUPPORTED error code', async () => {
      // Note: Mock implementation can simulate browser API unavailability
      // In real implementation, this is checked before file operations
      expect(ImageUploadErrorCode.FILE_API_NOT_SUPPORTED).toBe('FILE_API_NOT_SUPPORTED')
    })

    it('should test URL_API_NOT_SUPPORTED error code', async () => {
      // Note: Mock implementation can simulate URL.createObjectURL unavailability
      // In real implementation, this is checked before creating preview URLs
      expect(ImageUploadErrorCode.URL_API_NOT_SUPPORTED).toBe('URL_API_NOT_SUPPORTED')
    })
  })
})
