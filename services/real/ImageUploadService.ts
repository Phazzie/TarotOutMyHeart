/**
 * @fileoverview ImageUploadService — real implementation.
 *
 * PURPOSE:
 * Provides client-side validation, server upload proxying (/api/upload to Vercel Blob),
 * ObjectURL lifecycle tracking and memory management, and in-memory session state storage.
 *
 * DATA FLOW:
 * Input: Browser File objects from user file selection / drag-and-drop
 * Transform: Client-side validation (size, MIME type, count), server proxy POST or local ObjectURL fallback
 * Output: ServiceResponse containing UploadedImage records with preview URLs
 *
 * DEPENDENCIES:
 * - Depends on: $contracts/ImageUpload, $contracts/types/common, $lib/utils/types
 * - Used by: RealServiceFactory, ReferenceImageUpload components, Tarot generation workflow
 *
 * @boundary ImageUploadSeam
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
  ImageMimeType,
} from '$contracts/ImageUpload'
import {
  ImageUploadErrorCode,
  MAX_IMAGE_SIZE_BYTES,
  MIN_IMAGES,
  MAX_IMAGES,
} from '$contracts/ImageUpload'

const UPLOAD_TIMEOUT_MS = 30_000

interface UploadApiSuccessResponse {
  success: true
  data: {
    url: string
  }
}

interface UploadApiErrorResponse {
  success: false
  error?: {
    code?: string
    message?: string
  }
}

type UploadApiResponse = UploadApiSuccessResponse | UploadApiErrorResponse

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isUploadApiSuccessResponse(obj: unknown): obj is UploadApiSuccessResponse {
  if (!isRecord(obj)) {
    return false
  }
  if (obj['success'] !== true) {
    return false
  }
  const data = obj['data']
  if (!isRecord(data)) {
    return false
  }
  const url = data['url']
  return typeof url === 'string' && url.trim().length > 0
}

function isUploadApiErrorResponse(obj: unknown): obj is UploadApiErrorResponse {
  if (!isRecord(obj)) {
    return false
  }
  if (obj['success'] !== false) {
    return false
  }
  const err = obj['error']
  if (err === undefined) {
    return true
  }
  if (!isRecord(err)) {
    return false
  }
  const code = err['code']
  const message = err['message']
  const codeValid = code === undefined || typeof code === 'string'
  const messageValid = message === undefined || typeof message === 'string'
  return codeValid && messageValid
}

function isUploadApiResponse(obj: unknown): obj is UploadApiResponse {
  return isUploadApiSuccessResponse(obj) || isUploadApiErrorResponse(obj)
}

export class ImageUploadService implements IImageUploadService {
  private uploadedImages: Map<ImageId, UploadedImage> = new Map()
  private createdObjectUrls: Set<string> = new Set()

  private generateId(): ImageId {
    return createImageId(crypto.randomUUID())
  }

  /**
   * Safely create and track an Object URL for browser memory management.
   */
  private createTrackedObjectURL(file: File): string {
    if (
      typeof window !== 'undefined' &&
      typeof URL !== 'undefined' &&
      typeof URL.createObjectURL === 'function'
    ) {
      try {
        const objectUrl = URL.createObjectURL(file)
        this.createdObjectUrls.add(objectUrl)
        return objectUrl
      } catch {
        return ''
      }
    }
    return ''
  }

  /**
   * Safely revoke and untrack an Object URL to prevent memory leaks.
   */
  private revokeTrackedObjectURL(url: string): boolean {
    if (
      typeof window !== 'undefined' &&
      typeof URL !== 'undefined' &&
      typeof URL.revokeObjectURL === 'function'
    ) {
      if (url.startsWith('blob:') || this.createdObjectUrls.has(url)) {
        try {
          URL.revokeObjectURL(url)
          this.createdObjectUrls.delete(url)
          return true
        } catch {
          return false
        }
      }
    }
    return false
  }

  private validateFile(file: File): ImageValidationError[] {
    const errors: ImageValidationError[] = []

    if (!isImageMimeType(file.type)) {
      errors.push({
        code: ImageUploadErrorCode.INVALID_FILE_TYPE,
        message: `Invalid file type: ${file.type}. Only JPEG and PNG are allowed.`,
        fileName: file.name,
      })
    }

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
    if (!input || !Array.isArray(input.files) || input.files.length === 0) {
      return {
        success: false,
        error: {
          code: ImageUploadErrorCode.TOO_FEW_FILES,
          message: 'No files provided',
          retryable: false,
        },
      }
    }

    const { files } = input
    const currentCount = this.uploadedImages.size

    if (currentCount >= MAX_IMAGES) {
      return {
        success: false,
        error: {
          code: ImageUploadErrorCode.MAX_UPLOADS_REACHED,
          message: `Maximum of ${MAX_IMAGES} images already reached. Current count: ${currentCount}`,
          retryable: false,
        },
      }
    }

    if (currentCount + files.length > MAX_IMAGES) {
      return {
        success: false,
        error: {
          code: ImageUploadErrorCode.TOO_MANY_FILES,
          message: `Cannot upload ${files.length} files. Maximum allowed total is ${MAX_IMAGES}. Current count: ${currentCount}`,
          retryable: false,
        },
      }
    }

    const uploadedList: UploadedImage[] = []
    const failedList: ImageValidationError[] = []

    for (const file of files) {
      const isDuplicate = Array.from(this.uploadedImages.values()).some(
        img => img.fileName === file.name
      )
      if (isDuplicate) {
        failedList.push({
          code: ImageUploadErrorCode.DUPLICATE_IMAGE,
          message: `Duplicate image detected: ${file.name}`,
          fileName: file.name,
        })
        continue
      }

      const errors = this.validateFile(file)
      if (errors.length > 0) {
        failedList.push(...errors)
        continue
      }

      let remoteUrl: string | null = null
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS)

      try {
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        const json: unknown = await response.json()
        if (isUploadApiResponse(json)) {
          if (json.success) {
            remoteUrl = json.data.url
          } else if (json.error) {
            console.warn(
              `Upload API returned error for ${file.name}: ${json.error.code ?? 'UNKNOWN'} - ${json.error.message ?? 'Unknown error'}`
            )
          }
        }
      } catch {
        clearTimeout(timeoutId)
        // Fallback to local ObjectURL if upload proxy fails or times out
      }

      const imageId = this.generateId()
      const previewUrl = remoteUrl ?? this.createTrackedObjectURL(file)
      const mimeType: ImageMimeType = isImageMimeType(file.type) ? file.type : 'image/jpeg'

      const uploaded: UploadedImage = {
        id: imageId,
        file,
        previewUrl,
        fileName: file.name,
        fileSize: file.size,
        mimeType,
        uploadedAt: new Date(),
      }

      this.uploadedImages.set(imageId, uploaded)
      uploadedList.push(uploaded)
    }

    const responseData: UploadImagesOutput = {
      uploadedImages: uploadedList,
      failedImages: failedList,
      totalUploaded: uploadedList.length,
      totalFailed: failedList.length,
    }

    return {
      success: true,
      data: responseData,
    }
  }

  async removeImage(input: RemoveImageInput): Promise<ServiceResponse<RemoveImageOutput>> {
    if (!input || typeof input.imageId !== 'string') {
      return {
        success: false,
        error: {
          code: ImageUploadErrorCode.IMAGE_NOT_FOUND,
          message: 'Invalid image ID provided',
          retryable: false,
        },
      }
    }

    const { imageId } = input
    const image = this.uploadedImages.get(imageId)

    if (!image) {
      return {
        success: false,
        error: {
          code: ImageUploadErrorCode.IMAGE_NOT_FOUND,
          message: `Image with ID '${imageId}' not found`,
          retryable: false,
        },
      }
    }

    const previewUrlRevoked = this.revokeTrackedObjectURL(image.previewUrl)
    this.uploadedImages.delete(imageId)
    const remainingImages = Array.from(this.uploadedImages.values())

    return {
      success: true,
      data: {
        removedImageId: imageId,
        remainingImages,
        previewUrlRevoked,
      },
    }
  }

  async validateImages(input: ValidateImagesInput): Promise<ServiceResponse<ValidateImagesOutput>> {
    if (!input || !Array.isArray(input.files)) {
      return {
        success: false,
        error: {
          code: ImageUploadErrorCode.TOO_FEW_FILES,
          message: 'No files provided for validation',
          retryable: false,
        },
      }
    }

    const { files } = input

    if (files.length > MAX_IMAGES) {
      return {
        success: false,
        error: {
          code: ImageUploadErrorCode.TOO_MANY_FILES,
          message: `Cannot validate more than ${MAX_IMAGES} files`,
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
          imageId: this.generateId(),
          errors: [],
        })
      } else {
        invalidImages.push(...errors)
      }
    }

    const totalCount = this.uploadedImages.size + validImages.length
    const canProceed =
      totalCount >= MIN_IMAGES && totalCount <= MAX_IMAGES && invalidImages.length === 0

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
    const images = Array.from(this.uploadedImages.values())
    const count = images.length
    const canAddMore = count < MAX_IMAGES
    const remainingSlots = Math.max(0, MAX_IMAGES - count)

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

  async clearAllImages(): Promise<ServiceResponse<void>> {
    for (const image of this.uploadedImages.values()) {
      this.revokeTrackedObjectURL(image.previewUrl)
    }

    if (
      typeof window !== 'undefined' &&
      typeof URL !== 'undefined' &&
      typeof URL.revokeObjectURL === 'function'
    ) {
      for (const url of this.createdObjectUrls) {
        URL.revokeObjectURL(url)
      }
    }
    this.createdObjectUrls.clear()
    this.uploadedImages.clear()

    return {
      success: true,
    }
  }
}
