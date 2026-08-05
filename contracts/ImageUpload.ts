/**
 * @fileoverview Image Upload Contract - Reference image upload and validation
 * @purpose Define the seam between user's file system and application's image handling
 * @dataFlow Browser File API → Validation → Client-side storage (memory) → Preview URLs
 * @boundary Seam #1: ImageUploadSeam - User uploads 1-5 reference images for tarot deck style
 * @requirement PRD Section: "User Flow Step 1 - Upload Reference Images"
 * @updated 2025-11-07
 *
 * @example
 * ```typescript
 * const result = await imageUploadService.uploadImages(files);
 * if (result.success) {
 *   const previewUrls = result.data.uploadedImages.map(img => img.previewUrl);
 * }
 * ```
 */

import type { ServiceResponse } from './types/common'

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Maximum file size per image (10MB per PRD)
 */
export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024 // 10MB

/**
 * Minimum and maximum number of images allowed
 */
export const MIN_IMAGES = 1
export const MAX_IMAGES = 5

/**
 * Allowed MIME types for uploaded images
 */
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png'] as const

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Allowed image MIME types (derived from constant)
 */
export type ImageMimeType = (typeof ALLOWED_IMAGE_TYPES)[number]

/**
 * Unique identifier for uploaded images
 * UUID format recommended
 */
export type ImageId = string & { readonly __brand: 'ImageId' }

// ============================================================================
// CORE DATA STRUCTURES
// ============================================================================

/**
 * Represents a single uploaded image stored in browser memory
 *
 * @property id - Unique identifier (UUID)
 * @property file - Original File object from browser
 * @property previewUrl - Object URL for immediate display (from URL.createObjectURL)
 * @property fileName - Original filename from user's system
 * @property fileSize - Size in bytes
 * @property mimeType - Validated MIME type
 * @property uploadedAt - Timestamp when image was uploaded
 */
export interface UploadedImage {
  id: ImageId
  file: File
  previewUrl: string
  fileName: string
  fileSize: number
  mimeType: ImageMimeType
  uploadedAt: Date
}

/**
 * Validation result for a single image
 */
export interface ImageValidationResult {
  isValid: boolean
  imageId?: ImageId
  errors: ImageValidationError[]
}

/**
 * Specific validation error for an image
 */
export interface ImageValidationError {
  code: ImageUploadErrorCode
  message: string
  fileName: string
}

// ============================================================================
// INPUT CONTRACTS
// ============================================================================

/**
 * Input for uploading one or more images
 *
 * @property files - Array of File objects from browser file input
 */
export interface UploadImagesInput {
  files: File[]
}

/**
 * Input for removing a previously uploaded image
 *
 * @property imageId - ID of image to remove
 */
export interface RemoveImageInput {
  imageId: ImageId
}

/**
 * Input for validating images without uploading
 * (Used for client-side pre-validation)
 *
 * @property files - Files to validate
 */
export interface ValidateImagesInput {
  files: File[]
}

// ============================================================================
// OUTPUT CONTRACTS
// ============================================================================

/**
 * Result of uploading images
 *
 * @property uploadedImages - Successfully uploaded and validated images
 * @property failedImages - Images that failed validation
 * @property totalUploaded - Count of successful uploads
 * @property totalFailed - Count of failed uploads
 */
export interface UploadImagesOutput {
  uploadedImages: UploadedImage[]
  failedImages: ImageValidationError[]
  totalUploaded: number
  totalFailed: number
}

/**
 * Result of removing an image
 *
 * @property removedImageId - ID of removed image
 * @property remainingImages - All images still in storage
 * @property previewUrlRevoked - Whether URL.revokeObjectURL was called
 */
export interface RemoveImageOutput {
  removedImageId: ImageId
  remainingImages: UploadedImage[]
  previewUrlRevoked: boolean
}

/**
 * Validation results without uploading
 *
 * @property validImages - Files that passed validation
 * @property invalidImages - Files that failed validation
 * @property canProceed - Whether user can proceed with these images
 */
export interface ValidateImagesOutput {
  validImages: ImageValidationResult[]
  invalidImages: ImageValidationError[]
  canProceed: boolean
}

/**
 * Current state of uploaded images
 *
 * @property images - All currently uploaded images
 * @property count - Number of images
 * @property canAddMore - Whether more images can be added
 * @property remainingSlots - How many more images can be added
 */
export interface GetUploadedImagesOutput {
  images: UploadedImage[]
  count: number
  canAddMore: boolean
  remainingSlots: number
}

// ============================================================================
// ERROR CODES
// ============================================================================

/**
 * All possible error codes for image upload operations
 *
 * Used for programmatic error handling and user-friendly messages
 */
export enum ImageUploadErrorCode {
  // File validation errors
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE', // Not JPEG or PNG
  FILE_TOO_LARGE = 'FILE_TOO_LARGE', // Exceeds 10MB
  FILE_CORRUPTED = 'FILE_CORRUPTED', // Cannot read file

  // Count validation errors
  TOO_MANY_FILES = 'TOO_MANY_FILES', // More than 5 files
  TOO_FEW_FILES = 'TOO_FEW_FILES', // 0 files provided
  MAX_UPLOADS_REACHED = 'MAX_UPLOADS_REACHED', // Already have 5 images

  // Operation errors
  IMAGE_NOT_FOUND = 'IMAGE_NOT_FOUND', // Image ID doesn't exist
  DUPLICATE_IMAGE = 'DUPLICATE_IMAGE', // Same file uploaded twice
  UPLOAD_FAILED = 'UPLOAD_FAILED', // Generic upload failure

  // Browser API errors
  FILE_API_NOT_SUPPORTED = 'FILE_API_NOT_SUPPORTED', // Browser doesn't support File API
  URL_API_NOT_SUPPORTED = 'URL_API_NOT_SUPPORTED', // Browser doesn't support URL.createObjectURL
}

// ============================================================================
// SERVICE INTERFACE (THE CONTRACT)
// ============================================================================

/**
 * Image Upload Service Contract
 *
 * Defines all operations for uploading, managing, and validating reference images.
 * Implementation handles:
 * - Client-side storage (browser memory, no server upload)
 * - Validation (type, size, count)
 * - Preview URL generation (URL.createObjectURL)
 * - Memory cleanup (URL.revokeObjectURL on removal)
 *
 * @interface IImageUploadService
 */
export interface IImageUploadService {
  /**
   * Upload and validate one or more images
   *
   * Validates each file and stores in browser memory if valid.
   * Returns both successful and failed uploads.
   *
   * @param input - Files to upload
   * @returns Promise<ServiceResponse<UploadImagesOutput>> - Upload results
   *
   * @throws Never throws - all errors returned in ServiceResponse
   *
   * @example
   * ```typescript
   * const result = await service.uploadImages({
   *   files: [file1, file2]
   * });
   *
   * if (result.success) {
   *   console.log(`Uploaded ${result.data.totalUploaded} images`);
   *   result.data.uploadedImages.forEach(img => {
   *     console.log(`Preview URL: ${img.previewUrl}`);
   *   });
   * }
   * ```
   */
  uploadImages(input: UploadImagesInput): Promise<ServiceResponse<UploadImagesOutput>>

  /**
   * Remove a previously uploaded image
   *
   * Removes image from storage and revokes its preview URL to free memory.
   *
   * @param input - ID of image to remove
   * @returns Promise<ServiceResponse<RemoveImageOutput>> - Removal result
   *
   * @throws Never throws - all errors returned in ServiceResponse
   *
   * @example
   * ```typescript
   * const result = await service.removeImage({ imageId: 'uuid-123' });
   * if (result.success) {
   *   console.log(`${result.data.remainingImages.length} images remaining`);
   * }
   * ```
   */
  removeImage(input: RemoveImageInput): Promise<ServiceResponse<RemoveImageOutput>>

  /**
   * Validate images without uploading
   *
   * Pre-validation before actual upload. Useful for:
   * - Showing validation errors before file selection confirmation
   * - Drag-and-drop validation
   * - Multi-step upload flows
   *
   * @param input - Files to validate
   * @returns Promise<ServiceResponse<ValidateImagesOutput>> - Validation results
   *
   * @throws Never throws - all errors returned in ServiceResponse
   *
   * @example
   * ```typescript
   * const result = await service.validateImages({ files });
   * if (!result.data.canProceed) {
   *   alert(`Fix these errors: ${result.data.invalidImages.map(e => e.message)}`);
   * }
   * ```
   */
  validateImages(input: ValidateImagesInput): Promise<ServiceResponse<ValidateImagesOutput>>

  /**
   * Get all currently uploaded images
   *
   * Returns current state of image storage including metadata about capacity.
   *
   * @returns Promise<ServiceResponse<GetUploadedImagesOutput>> - Current images
   *
   * @throws Never throws - all errors returned in ServiceResponse
   *
   * @example
   * ```typescript
   * const result = await service.getUploadedImages();
   * if (result.success) {
   *   console.log(`${result.data.count}/${MAX_IMAGES} images uploaded`);
   *   if (result.data.canAddMore) {
   *     console.log(`Can add ${result.data.remainingSlots} more`);
   *   }
   * }
   * ```
   */
  getUploadedImages(): Promise<ServiceResponse<GetUploadedImagesOutput>>

  /**
   * Clear all uploaded images
   *
   * Removes all images and revokes all preview URLs.
   * Used for "start over" functionality.
   *
   * @returns Promise<ServiceResponse<void>> - Success or error
   *
   * @throws Never throws - all errors returned in ServiceResponse
   *
   * @example
   * ```typescript
   * const result = await service.clearAllImages();
   * if (result.success) {
   *   console.log('All images cleared');
   * }
   * ```
   */
  clearAllImages(): Promise<ServiceResponse<void>>
}

// ============================================================================
// USER-FRIENDLY ERROR MESSAGES
// ============================================================================

/**
 * Maps error codes to user-friendly messages
 *
 * Use this for displaying errors in UI
 */
export const IMAGE_UPLOAD_ERROR_MESSAGES: Record<ImageUploadErrorCode, string> = {
  [ImageUploadErrorCode.INVALID_FILE_TYPE]: 'Please upload only JPEG or PNG images',
  [ImageUploadErrorCode.FILE_TOO_LARGE]: 'Image must be smaller than 10MB',
  [ImageUploadErrorCode.FILE_CORRUPTED]: 'Unable to read image file - it may be corrupted',
  [ImageUploadErrorCode.TOO_MANY_FILES]: 'You can only upload up to 5 images',
  [ImageUploadErrorCode.TOO_FEW_FILES]: 'Please select at least 1 image',
  [ImageUploadErrorCode.MAX_UPLOADS_REACHED]:
    'Maximum of 5 images reached - remove an image to add more',
  [ImageUploadErrorCode.IMAGE_NOT_FOUND]: 'Image not found - it may have been removed',
  [ImageUploadErrorCode.DUPLICATE_IMAGE]: 'This image has already been uploaded',
  [ImageUploadErrorCode.UPLOAD_FAILED]: 'Upload failed - please try again',
  [ImageUploadErrorCode.FILE_API_NOT_SUPPORTED]:
    'Your browser does not support file uploads - please use a modern browser',
  [ImageUploadErrorCode.URL_API_NOT_SUPPORTED]:
    'Your browser does not support image previews - please use a modern browser',
}

// ============================================================================
// METADATA
// ============================================================================

/**
 * Contract metadata for tracking and documentation
 */
export const IMAGE_UPLOAD_CONTRACT_METADATA = {
  version: '1.0.0',
  seam: 'ImageUploadSeam',
  boundary: 'Browser File API → Application',
  requirement: 'PRD: User Flow Step 1',
  lastUpdated: '2025-11-07',
  dependencies: [],
} as const
