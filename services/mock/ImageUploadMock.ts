/**
 * @fileoverview Mock implementation of ImageUpload service
 * @purpose Provide realistic image upload behavior for UI development without real file handling
 * @dataFlow Browser Files → Validation → In-memory storage → Preview URLs
 * @mockBehavior
 *   - Validates file types (JPEG/PNG only)
 *   - Validates file sizes (max 10MB)
 *   - Validates count limits (1-5 images)
 *   - Generates mock preview URLs
 *   - Simulates 200ms upload delay
 *   - Maintains in-memory image storage
 * @dependencies contracts/ImageUpload.ts
 * @updated 2025-11-07
 */

import type {
  IImageUploadService,
  UploadImagesInput,
  UploadImagesOutput,
  RemoveImageInput,
  RemoveImageOutput,
  ValidateImagesInput,
  ValidateImagesOutput,
  GetUploadedImagesOutput,
  UploadedImage,
  ImageId,
  ImageMimeType,
  ImageValidationError,
} from '$contracts/ImageUpload'

import {
  ImageUploadErrorCode,
  MAX_IMAGE_SIZE_BYTES,
  MAX_IMAGES,
  ALLOWED_IMAGE_TYPES,
} from '$contracts/ImageUpload'

import type { ServiceResponse } from '$contracts/types/common'

/**
 * Mock implementation of ImageUploadService
 *
 * Simulates client-side image upload and validation without server.
 * Stores images in memory and generates mock preview URLs.
 */
export class ImageUploadMockService implements IImageUploadService {
  private images: Map<ImageId, UploadedImage> = new Map()
  private previewUrls: Map<ImageId, string> = new Map()

  /**
   * Upload and validate images
   */
  async uploadImages(input: UploadImagesInput): Promise<ServiceResponse<UploadImagesOutput>> {
    // Simulate network delay
    await this.delay(200)

    const { files } = input
    const uploadedImages: UploadedImage[] = []
    const failedImages: ImageValidationError[] = []

    // Check if we can add any more images
    const currentCount = this.images.size
    const availableSlots = MAX_IMAGES - currentCount

    if (availableSlots === 0) {
      return {
        success: false,
        error: {
          code: 'MAX_UPLOADS_REACHED',
          message: 'Maximum of 5 images already uploaded',
          retryable: false,
        },
      }
    }

    // Validate and process each file
    for (let i = 0; i < files.length && uploadedImages.length < availableSlots; i++) {
      const file = files[i]
      if (!file) continue // Skip if file is undefined

      const validation = this.validateSingleFile(file)

      if (validation.errors.length > 0) {
        failedImages.push(...validation.errors)
        continue
      }

      // Check for duplicates (same filename and size)
      const isDuplicate = Array.from(this.images.values()).some(
        img => img.fileName === file.name && img.fileSize === file.size
      )

      if (isDuplicate) {
        failedImages.push({
          code: ImageUploadErrorCode.DUPLICATE_IMAGE,
          message: `${file.name} has already been uploaded`,
          fileName: file.name,
        })
        continue
      }

      // Create uploaded image
      const imageId = this.generateImageId()
      const previewUrl = this.createMockPreviewUrl(file)

      const uploadedImage: UploadedImage = {
        id: imageId,
        file,
        previewUrl,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type as ImageMimeType,
        uploadedAt: new Date(),
      }

      this.images.set(imageId, uploadedImage)
      this.previewUrls.set(imageId, previewUrl)
      uploadedImages.push(uploadedImage)
    }

    // Check if we had too many files
    if (files.length > availableSlots) {
      failedImages.push({
        code: ImageUploadErrorCode.TOO_MANY_FILES,
        message: `Can only add ${availableSlots} more image(s)`,
        fileName: '',
      })
    }

    return {
      success: true,
      data: {
        uploadedImages,
        failedImages,
        totalUploaded: uploadedImages.length,
        totalFailed: failedImages.length,
      },
    }
  }

  /**
   * Remove an uploaded image
   */
  async removeImage(input: RemoveImageInput): Promise<ServiceResponse<RemoveImageOutput>> {
    await this.delay(100)

    const { imageId } = input

    if (!this.images.has(imageId)) {
      return {
        success: false,
        error: {
          code: 'IMAGE_NOT_FOUND',
          message: 'Image not found - it may have been already removed',
          retryable: false,
        },
      }
    }

    // Revoke preview URL to free memory
    const previewUrl = this.previewUrls.get(imageId)
    if (previewUrl) {
      this.revokeMockPreviewUrl(previewUrl)
      this.previewUrls.delete(imageId)
    }

    // Remove from storage
    this.images.delete(imageId)

    return {
      success: true,
      data: {
        removedImageId: imageId,
        remainingImages: Array.from(this.images.values()),
        previewUrlRevoked: true,
      },
    }
  }

  /**
   * Validate images without uploading
   */
  async validateImages(input: ValidateImagesInput): Promise<ServiceResponse<ValidateImagesOutput>> {
    await this.delay(50)

    const { files } = input
    const validImages: { isValid: boolean; imageId?: ImageId; errors: ImageValidationError[] }[] =
      []
    const invalidImages: ImageValidationError[] = []

    // Check count
    if (files.length === 0) {
      return {
        success: true,
        data: {
          validImages: [],
          invalidImages: [
            {
              code: ImageUploadErrorCode.TOO_FEW_FILES,
              message: 'Please select at least 1 image',
              fileName: '',
            },
          ],
          canProceed: false,
        },
      }
    }

    const totalAfterUpload = this.images.size + files.length
    if (totalAfterUpload > MAX_IMAGES) {
      invalidImages.push({
        code: ImageUploadErrorCode.TOO_MANY_FILES,
        message: `Can only upload ${MAX_IMAGES - this.images.size} more image(s)`,
        fileName: '',
      })
    }

    // Validate each file
    for (const file of files) {
      const validation = this.validateSingleFile(file)

      if (validation.errors.length > 0) {
        invalidImages.push(...validation.errors)
        validImages.push({
          isValid: false,
          errors: validation.errors,
        })
      } else {
        validImages.push({
          isValid: true,
          imageId: this.generateImageId(),
          errors: [],
        })
      }
    }

    const canProceed = invalidImages.length === 0 && totalAfterUpload <= MAX_IMAGES

    return {
      success: true,
      data: {
        validImages,
        invalidImages,
        canProceed,
      },
    }
  }

  /**
   * Get all currently uploaded images
   */
  async getUploadedImages(): Promise<ServiceResponse<GetUploadedImagesOutput>> {
    await this.delay(50)

    const images = Array.from(this.images.values())
    const count = images.length
    const canAddMore = count < MAX_IMAGES
    const remainingSlots = MAX_IMAGES - count

    return {
      success: true,
      data: {
        images,
        count,
        canAddMore,
        remainingSlots,
      },
    }
  }

  /**
   * Clear all uploaded images
   */
  async clearAllImages(): Promise<ServiceResponse<void>> {
    await this.delay(100)

    // Revoke all preview URLs
    for (const previewUrl of this.previewUrls.values()) {
      this.revokeMockPreviewUrl(previewUrl)
    }

    // Clear storage
    this.images.clear()
    this.previewUrls.clear()

    return {
      success: true,
      data: undefined,
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Validate a single file
   */
  private validateSingleFile(file: File): {
    isValid: boolean
    errors: ImageValidationError[]
  } {
    const errors: ImageValidationError[] = []

    // Check file type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type as ImageMimeType)) {
      errors.push({
        code: ImageUploadErrorCode.INVALID_FILE_TYPE,
        message: `${file.name} must be JPEG or PNG`,
        fileName: file.name,
      })
    }

    // Check file size
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2)
      errors.push({
        code: ImageUploadErrorCode.FILE_TOO_LARGE,
        message: `${file.name} (${sizeMB}MB) exceeds 10MB limit`,
        fileName: file.name,
      })
    }

    // Check if file is empty
    if (file.size === 0) {
      errors.push({
        code: ImageUploadErrorCode.FILE_CORRUPTED,
        message: `${file.name} is empty or corrupted`,
        fileName: file.name,
      })
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  /**
   * Generate a unique image ID
   */
  private generateImageId(): ImageId {
    return crypto.randomUUID() as ImageId
  }

  /**
   * Create a mock preview URL for a file
   * In real implementation, this would use URL.createObjectURL(file)
   */
  private createMockPreviewUrl(file: File): string {
    // Mock: Generate a data URL pattern
    // Real implementation would use: URL.createObjectURL(file)
    return `mock://preview/${crypto.randomUUID()}/${encodeURIComponent(file.name)}`
  }

  /**
   * Revoke a mock preview URL
   * In real implementation, this would use URL.revokeObjectURL(url)
   */
  private revokeMockPreviewUrl(_url: string): void {
    // Mock: No-op since we don't actually create object URLs
    // Real implementation would use: URL.revokeObjectURL(_url)
  }

  /**
   * Simulate async delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

/**
 * Singleton instance for use throughout the application
 */
export const imageUploadMockService = new ImageUploadMockService()

/**
 * Export class alias for testing
 * Tests need to instantiate their own instances to avoid state pollution
 */
export { ImageUploadMockService as ImageUploadMock }
