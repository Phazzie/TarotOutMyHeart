/**
 * @fileoverview ImageUpload Mock Service - Reference image upload and validation
 * @purpose Mock implementation of IImageUploadService for testing and development
 * @dataFlow File[] → Validation → In-memory storage → UploadedImage[] with preview URLs
 * @boundary Seam #1: ImageUploadSeam - Mock implementation for browser file upload
 * @updated 2025-11-14
 *
 * @example
 * ```typescript
 * const service = new ImageUploadMock()
 * const result = await service.uploadImages({ files: [file1, file2] })
 * if (result.success) {
 *   console.log(`Uploaded ${result.data.totalUploaded} images`)
 * }
 * ```
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
  ImageValidationResult,
  ImageValidationError,
  ImageId,
  ImageMimeType,
  ServiceResponse,
} from '../../contracts'

import {
  ImageUploadErrorCode,
  MAX_IMAGE_SIZE_BYTES,
  MAX_IMAGES,
  ALLOWED_IMAGE_TYPES,
  IMAGE_UPLOAD_ERROR_MESSAGES,
} from '../../contracts'

/**
 * Mock implementation of IImageUploadService
 *
 * Simulates browser-based image upload with client-side storage.
 * Handles validation, duplicate detection, and capacity limits.
 */
export class ImageUploadMock implements IImageUploadService {
  /**
   * In-memory storage for uploaded images
   */
  private uploadedImages: UploadedImage[] = []

  /**
   * Counter for generating unique IDs
   */
  private idCounter = 1

  /**
   * Track uploaded file objects to detect duplicates
   */
  private uploadedFiles: Set<File> = new Set()

  // ==========================================================================
  // PUBLIC INTERFACE METHODS
  // ==========================================================================

  /**
   * Upload and validate one or more images
   */
  async uploadImages(input: UploadImagesInput): Promise<ServiceResponse<UploadImagesOutput>> {
    const { files } = input

    // Validate count constraints first
    if (files.length === 0) {
      return {
        success: false,
        error: {
          code: ImageUploadErrorCode.TOO_FEW_FILES,
          message: IMAGE_UPLOAD_ERROR_MESSAGES[ImageUploadErrorCode.TOO_FEW_FILES],
          retryable: false,
        },
      }
    }

    if (files.length > MAX_IMAGES) {
      return {
        success: false,
        error: {
          code: ImageUploadErrorCode.TOO_MANY_FILES,
          message: IMAGE_UPLOAD_ERROR_MESSAGES[ImageUploadErrorCode.TOO_MANY_FILES],
          retryable: false,
        },
      }
    }

    // Check if already at max capacity
    if (this.uploadedImages.length >= MAX_IMAGES) {
      return {
        success: false,
        error: {
          code: ImageUploadErrorCode.MAX_UPLOADS_REACHED,
          message: IMAGE_UPLOAD_ERROR_MESSAGES[ImageUploadErrorCode.MAX_UPLOADS_REACHED],
          retryable: false,
        },
      }
    }

    // Check if uploading would exceed max capacity
    if (this.uploadedImages.length + files.length > MAX_IMAGES) {
      return {
        success: false,
        error: {
          code: ImageUploadErrorCode.TOO_MANY_FILES,
          message: `Can only add ${MAX_IMAGES - this.uploadedImages.length} more image(s)`,
          retryable: false,
        },
      }
    }

    // Validate and upload each file
    const uploadedImages: UploadedImage[] = []
    const failedImages: ImageValidationError[] = []

    for (const file of files) {
      const validationResult = this.validateSingleFile(file)

      if (validationResult.errors.length > 0) {
        // File failed validation
        failedImages.push(...validationResult.errors)
      } else {
        // File is valid, create UploadedImage
        const uploadedImage = this.createUploadedImage(file)
        uploadedImages.push(uploadedImage)
        this.uploadedImages.push(uploadedImage)
        this.uploadedFiles.add(file)
      }
    }

    // Return response with partial success handling
    const output: UploadImagesOutput = {
      uploadedImages,
      failedImages,
      totalUploaded: uploadedImages.length,
      totalFailed: failedImages.length,
    }

    // If all files failed, return failure response with data
    if (uploadedImages.length === 0 && failedImages.length > 0) {
      return {
        success: false,
        data: output,
      }
    }

    // Success (full or partial)
    return {
      success: true,
      data: output,
    }
  }

  /**
   * Remove a previously uploaded image
   */
  async removeImage(input: RemoveImageInput): Promise<ServiceResponse<RemoveImageOutput>> {
    const { imageId } = input

    const index = this.uploadedImages.findIndex(img => img.id === imageId)

    if (index === -1) {
      return {
        success: false,
        error: {
          code: ImageUploadErrorCode.IMAGE_NOT_FOUND,
          message: IMAGE_UPLOAD_ERROR_MESSAGES[ImageUploadErrorCode.IMAGE_NOT_FOUND],
          retryable: false,
        },
      }
    }

    // Remove image
    const [removedImage] = this.uploadedImages.splice(index, 1)
    this.uploadedFiles.delete(removedImage!.file)

    // In real implementation, would call URL.revokeObjectURL(removedImage.previewUrl)
    const previewUrlRevoked = true

    return {
      success: true,
      data: {
        removedImageId: imageId,
        remainingImages: [...this.uploadedImages],
        previewUrlRevoked,
      },
    }
  }

  /**
   * Validate images without uploading
   */
  async validateImages(input: ValidateImagesInput): Promise<ServiceResponse<ValidateImagesOutput>> {
    const { files } = input

    // Check count constraints
    if (files.length > MAX_IMAGES) {
      return {
        success: false,
        error: {
          code: ImageUploadErrorCode.TOO_MANY_FILES,
          message: IMAGE_UPLOAD_ERROR_MESSAGES[ImageUploadErrorCode.TOO_MANY_FILES],
          retryable: false,
        },
      }
    }

    // Validate each file
    const validImages: ImageValidationResult[] = []
    const invalidImages: ImageValidationError[] = []

    for (const file of files) {
      const validationResult = this.validateSingleFile(file)

      if (validationResult.errors.length === 0) {
        // File is valid
        validImages.push({
          isValid: true,
          imageId: this.generateImageId(),
          errors: [],
        })
      } else {
        // File is invalid - only add to invalidImages
        invalidImages.push(...validationResult.errors)
      }
    }

    // Can proceed if at least one valid image exists
    const canProceed = validImages.length > 0

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
    const count = this.uploadedImages.length
    const canAddMore = count < MAX_IMAGES
    const remainingSlots = MAX_IMAGES - count

    return {
      success: true,
      data: {
        images: [...this.uploadedImages],
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
    // In real implementation, would revoke all preview URLs
    // this.uploadedImages.forEach(img => URL.revokeObjectURL(img.previewUrl))

    this.uploadedImages = []
    this.uploadedFiles.clear()

    return {
      success: true,
    }
  }

  // ==========================================================================
  // PRIVATE HELPER METHODS
  // ==========================================================================

  /**
   * Validate a single file
   */
  private validateSingleFile(file: File): { errors: ImageValidationError[] } {
    const errors: ImageValidationError[] = []

    // Check for duplicate
    if (this.uploadedFiles.has(file)) {
      errors.push({
        code: ImageUploadErrorCode.DUPLICATE_IMAGE,
        message: IMAGE_UPLOAD_ERROR_MESSAGES[ImageUploadErrorCode.DUPLICATE_IMAGE],
        fileName: file.name,
      })
    }

    // Check file type
    if (!this.isValidMimeType(file.type)) {
      errors.push({
        code: ImageUploadErrorCode.INVALID_FILE_TYPE,
        message: IMAGE_UPLOAD_ERROR_MESSAGES[ImageUploadErrorCode.INVALID_FILE_TYPE],
        fileName: file.name,
      })
    }

    // Check file size
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      errors.push({
        code: ImageUploadErrorCode.FILE_TOO_LARGE,
        message: IMAGE_UPLOAD_ERROR_MESSAGES[ImageUploadErrorCode.FILE_TOO_LARGE],
        fileName: file.name,
      })
    }

    return { errors }
  }

  /**
   * Check if MIME type is valid
   */
  private isValidMimeType(mimeType: string): mimeType is ImageMimeType {
    return (ALLOWED_IMAGE_TYPES as readonly string[]).includes(mimeType)
  }

  /**
   * Create an UploadedImage from a File
   */
  private createUploadedImage(file: File): UploadedImage {
    const id = this.generateImageId()
    const previewUrl = this.generateMockPreviewUrl(file)

    return {
      id,
      file,
      previewUrl,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type as ImageMimeType,
      uploadedAt: new Date(),
    }
  }

  /**
   * Generate a unique image ID
   */
  private generateImageId(): ImageId {
    // In real implementation, would use crypto.randomUUID()
    const id = `mock-image-${this.idCounter++}-${Date.now()}`
    return id as ImageId
  }

  /**
   * Generate a mock preview URL
   */
  private generateMockPreviewUrl(_file: File): string {
    // In real implementation, would use URL.createObjectURL(file)
    // For mock, generate a fake blob URL
    return `blob:http://localhost:5173/${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36)}`
  }
}
