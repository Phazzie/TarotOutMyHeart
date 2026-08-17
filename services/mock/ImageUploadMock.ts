/**
 * @fileoverview Mock implementation of IImageUploadService
 * @purpose Provide realistic mock behavior for image upload operations
 * @boundary Seam #1: ImageUploadSeam
 * @contract contracts/ImageUpload.ts
 */

import type { ServiceResponse } from '$contracts/types/common'
import { createImageId, isImageMimeType } from '$lib/utils/types'
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
} from '$contracts/ImageUpload'
import {
  ImageUploadErrorCode,
  MAX_IMAGE_SIZE_BYTES,
  MIN_IMAGES,
  MAX_IMAGES,
} from '$contracts/ImageUpload'

/**
 * Mock implementation of IImageUploadService
 * Stores images in memory and validates per contract specifications
 */
export class ImageUploadMockService implements IImageUploadService {
  private uploadedImages: Map<ImageId, UploadedImage> = new Map()

  /**
   * Generate a unique ImageId
   */
  private generateId(): ImageId {
    return createImageId(crypto.randomUUID())
  }

  /**
   * Simulate async delay
   */
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Validate a single file
   */
  private validateFile(file: File): ImageValidationError[] {
    const errors: ImageValidationError[] = []

    // Check MIME type
    if (!isImageMimeType(file.type)) {
      errors.push({
        code: ImageUploadErrorCode.INVALID_FILE_TYPE,
        message: `Invalid file type: ${file.type}. Only JPEG and PNG are allowed.`,
        fileName: file.name,
      })
    }

    // Check file size
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      errors.push({
        code: ImageUploadErrorCode.FILE_TOO_LARGE,
        message: `File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Maximum is 10MB.`,
        fileName: file.name,
      })
    }

    return errors
  }

  async uploadImages(input: UploadImagesInput): Promise<ServiceResponse<UploadImagesOutput>> {
    await this.delay(500) // Simulate network latency

    const { files } = input

    // Validate file count
    if (files.length === 0) {
      return {
        success: false,
        error: {
          code: ImageUploadErrorCode.TOO_FEW_FILES,
          message: 'No files provided',
          retryable: false,
        },
      }
    }

    // Check if we'd exceed max uploads
    const currentCount = this.uploadedImages.size
    if (currentCount >= MAX_IMAGES) {
      return {
        success: false,
        error: {
          code: ImageUploadErrorCode.MAX_UPLOADS_REACHED,
          message: `Maximum of ${MAX_IMAGES} images already reached`,
          retryable: false,
        },
      }
    }

    if (currentCount + files.length > MAX_IMAGES) {
      return {
        success: false,
        error: {
          code: ImageUploadErrorCode.TOO_MANY_FILES,
          message: `Cannot upload ${files.length} files. Only ${MAX_IMAGES - currentCount} slots remaining.`,
          retryable: false,
        },
      }
    }

    const uploadedImages: UploadedImage[] = []
    const failedImages: ImageValidationError[] = []

    for (const file of files) {
      // Check for duplicate images using name, size, and lastModified
      const isDuplicate =
        Array.from(this.uploadedImages.values()).some(img => {
          const sameName = img.fileName === file.name
          const sameSize = img.fileSize === file.size
          const sameModified =
            typeof img.file?.lastModified === 'number' && typeof file.lastModified === 'number'
              ? img.file.lastModified === file.lastModified
              : true
          return sameName && sameSize && sameModified
        }) ||
        uploadedImages.some(img => {
          const sameName = img.fileName === file.name
          const sameSize = img.fileSize === file.size
          const sameModified =
            typeof img.file?.lastModified === 'number' && typeof file.lastModified === 'number'
              ? img.file.lastModified === file.lastModified
              : true
          return sameName && sameSize && sameModified
        })

      if (isDuplicate) {
        failedImages.push({
          code: ImageUploadErrorCode.DUPLICATE_IMAGE,
          message: `Duplicate image detected: ${file.name}`,
          fileName: file.name,
        })
        continue
      }

      const errors = this.validateFile(file)

      if (errors.length > 0) {
        failedImages.push(...errors)
      } else {
        const id = this.generateId()
        const previewUrl = URL.createObjectURL(file)

        const uploadedImage: UploadedImage = {
          id,
          file,
          previewUrl,
          fileName: file.name,
          fileSize: file.size,
          mimeType: isImageMimeType(file.type) ? file.type : 'image/jpeg',
          uploadedAt: new Date(),
        }

        this.uploadedImages.set(id, uploadedImage)
        uploadedImages.push(uploadedImage)
      }
    }

    const responseData = {
      uploadedImages,
      failedImages,
      totalUploaded: uploadedImages.length,
      totalFailed: failedImages.length,
    }

    if (uploadedImages.length === 0 && failedImages.length > 0) {
      return {
        success: true,
        data: responseData,
      }
    }

    return {
      success: true,
      data: responseData,
    }
  }

  async removeImage(input: RemoveImageInput): Promise<ServiceResponse<RemoveImageOutput>> {
    await this.delay(100)

    const { imageId } = input
    const image = this.uploadedImages.get(imageId)

    if (!image) {
      return {
        success: false,
        error: {
          code: ImageUploadErrorCode.IMAGE_NOT_FOUND,
          message: 'Image not found',
          retryable: false,
        },
      }
    }

    // Revoke the object URL to free memory
    URL.revokeObjectURL(image.previewUrl)
    this.uploadedImages.delete(imageId)

    const remainingImages = Array.from(this.uploadedImages.values())

    return {
      success: true,
      data: {
        removedImageId: imageId,
        remainingImages,
        previewUrlRevoked: true,
      },
    }
  }

  async validateImages(input: ValidateImagesInput): Promise<ServiceResponse<ValidateImagesOutput>> {
    await this.delay(100)

    const { files } = input

    if (files.length > MAX_IMAGES) {
      return {
        success: false,
        error: {
          code: ImageUploadErrorCode.TOO_MANY_FILES,
          message: `Too many files`,
          retryable: false,
        },
      }
    }

    const validImages: ImageValidationResult[] = []
    const invalidImages: ImageValidationError[] = []

    for (const file of files) {
      const errors = this.validateFile(file)

      if (errors.length === 0) {
        validImages.push({
          isValid: true,
          imageId: this.generateId(), // Temporary ID for validation
          errors: [],
        })
      } else {
        invalidImages.push(...errors)
      }
    }

    const canProceed = validImages.length >= MIN_IMAGES && invalidImages.length === 0

    return {
      success: true,
      data: {
        validImages,
        invalidImages,
        canProceed,
      },
    }
  }

  async getUploadedImages(): Promise<ServiceResponse<GetUploadedImagesOutput>> {
    await this.delay(50)

    const images = Array.from(this.uploadedImages.values())
    const count = images.length

    return {
      success: true,
      data: {
        images,
        count,
        canAddMore: count < MAX_IMAGES,
        remainingSlots: MAX_IMAGES - count,
      },
    }
  }

  async clearAllImages(): Promise<ServiceResponse<void>> {
    await this.delay(100)

    // Revoke all preview URLs
    for (const image of this.uploadedImages.values()) {
      URL.revokeObjectURL(image.previewUrl)
    }

    this.uploadedImages.clear()

    return {
      success: true,
      data: undefined,
    }
  }
}
