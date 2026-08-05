/**
 * @fileoverview Image Generation Contract - Grok image API integration for card images
 * @purpose Define the seam between prompt data and Grok image generation API
 * @dataFlow 22 Card Prompts → Grok grok-2-image-alpha API → 22 Generated Card Images
 * @boundary Seam #4: ImageGenerationSeam - Generate 22 tarot card images from prompts
 * @requirement PRD Section: "User Flow Step 5 - Generate Card Images"
 * @updated 2025-11-07
 *
 * @example
 * ```typescript
 * const result = await imageService.generateImages({
 *   prompts: cardPrompts, // 22 prompts
 *   onProgress: (progress) => console.log(`${progress.completed}/22`)
 * });
 *
 * if (result.success) {
 *   const images = result.data.generatedCards;
 *   const cost = result.data.totalUsage.estimatedCost;
 * }
 * ```
 */

import type { ServiceResponse } from './types/common'
import type { CardPrompt, CardNumber } from './PromptGeneration'

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Grok image generation model
 */
export const GROK_IMAGE_MODEL = 'grok-2-image-alpha' as const

/**
 * Image generation settings
 */
export const IMAGE_GENERATION_CONFIG = {
  imageSize: '1024x1024', // Fixed size for Grok
  format: 'png', // PNG format
  responseFormat: 'b64_json', // Base64 response
  delayBetweenRequests: 2000, // 2 seconds to avoid rate limits
  timeout: 30000, // 30 seconds per image
  maxRetries: 3, // Retry failed generations
} as const

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Branded type for generated card IDs
 */
export type GeneratedCardId = string & { readonly __brand: 'GeneratedCardId' }

/**
 * Generation status for a single card
 */
export type GenerationStatus =
  | 'queued' // Waiting to generate
  | 'generating' // Currently generating
  | 'completed' // Successfully generated
  | 'failed' // Generation failed
  | 'retrying' // Retrying after failure

// ============================================================================
// CORE DATA STRUCTURES
// ============================================================================

/**
 * A single generated tarot card image
 *
 * @property id - Unique identifier
 * @property cardNumber - Card number (0-21)
 * @property cardName - Traditional card name
 * @property prompt - Prompt used for generation
 * @property imageUrl - Permanent storage URL (Vercel Blob)
 * @property imageDataUrl - Base64 data URL (temporary, for immediate display)
 * @property generationStatus - Current status
 * @property generatedAt - Timestamp when generated
 * @property retryCount - Number of retry attempts
 * @property error - Error if generation failed
 */
export interface GeneratedCard {
  id: GeneratedCardId
  cardNumber: CardNumber
  cardName: string
  prompt: string
  imageUrl?: string
  imageDataUrl?: string
  generationStatus: GenerationStatus
  generatedAt?: Date
  retryCount: number
  error?: string
}

/**
 * Progress tracking during image generation
 *
 * @property total - Total cards to generate
 * @property completed - Cards successfully generated
 * @property failed - Cards that failed
 * @property current - Current card being generated
 * @property percentComplete - Progress percentage (0-100)
 * @property estimatedTimeRemaining - Estimated seconds remaining
 */
export interface ImageGenerationProgress {
  total: number
  completed: number
  failed: number
  current: number
  percentComplete: number
  estimatedTimeRemaining: number
  status: string
}

/**
 * API usage for a single image generation
 */
export interface ImageGenerationUsage {
  cardNumber: CardNumber
  model: string
  estimatedCost: number
  generationTime: number
  requestId: string
}

/**
 * Total API usage for all images
 */
export interface TotalImageGenerationUsage {
  totalImages: number
  successfulImages: number
  failedImages: number
  estimatedCost: number
  totalGenerationTime: number
  usagePerCard: ImageGenerationUsage[]
}

// ============================================================================
// INPUT CONTRACTS
// ============================================================================

/**
 * Input for generating all 22 card images
 *
 * @property prompts - 22 card prompts to generate images from
 * @property model - Grok model to use (defaults to grok-2-image-alpha)
 * @property saveToStorage - Whether to upload to permanent storage (Vercel Blob)
 * @property onProgress - Callback for progress updates
 * @property allowPartialSuccess - Continue if some images fail (default true)
 */
export interface GenerateImagesInput {
  prompts: CardPrompt[]
  model?: string
  saveToStorage?: boolean
  onProgress?: (progress: ImageGenerationProgress) => void
  allowPartialSuccess?: boolean
}

/**
 * Input for regenerating a single failed image
 *
 * @property cardNumber - Card to regenerate
 * @property prompt - Prompt to use
 * @property previousAttempts - Number of previous attempts
 */
export interface RegenerateImageInput {
  cardNumber: CardNumber
  prompt: string
  previousAttempts?: number
}

/**
 * Input for canceling ongoing generation
 *
 * @property sessionId - Generation session to cancel
 */
export interface CancelGenerationInput {
  sessionId: string
}

/**
 * Input for getting generation status
 *
 * @property sessionId - Generation session ID
 */
export interface GetGenerationStatusInput {
  sessionId: string
}

// ============================================================================
// OUTPUT CONTRACTS
// ============================================================================

/**
 * Result of generating all images
 *
 * @property generatedCards - All 22 cards (successful and failed)
 * @property totalUsage - API usage and cost information
 * @property sessionId - Session ID for this generation
 * @property startedAt - When generation started
 * @property completedAt - When generation finished
 * @property fullySuccessful - Whether all 22 images generated successfully
 */
export interface GenerateImagesOutput {
  generatedCards: GeneratedCard[]
  totalUsage: TotalImageGenerationUsage
  sessionId: string
  startedAt: Date
  completedAt: Date
  fullySuccessful: boolean
}

/**
 * Result of regenerating a single image
 *
 * @property generatedCard - The regenerated card
 * @property usage - API usage for this regeneration
 */
export interface RegenerateImageOutput {
  generatedCard: GeneratedCard
  usage: ImageGenerationUsage
}

/**
 * Result of canceling generation
 *
 * @property canceled - Whether cancellation was successful
 * @property completedBeforeCancel - Cards completed before cancellation
 * @property sessionId - The canceled session
 */
export interface CancelGenerationOutput {
  canceled: boolean
  completedBeforeCancel: number
  sessionId: string
}

/**
 * Current status of generation session
 *
 * @property sessionId - Session ID
 * @property progress - Current progress
 * @property isComplete - Whether generation is complete
 * @property isCanceled - Whether generation was canceled
 */
export interface GetGenerationStatusOutput {
  sessionId: string
  progress: ImageGenerationProgress
  isComplete: boolean
  isCanceled: boolean
}

/**
 * Cost estimate for generating all images
 *
 * @property totalImages - Number of images to generate
 * @property costPerImage - Estimated cost per image
 * @property totalEstimatedCost - Total estimated cost
 * @property estimatedTime - Estimated total time in seconds
 */
export interface EstimateImageCostOutput {
  totalImages: number
  costPerImage: number
  totalEstimatedCost: number
  estimatedTime: number
}

// ============================================================================
// ERROR CODES
// ============================================================================

/**
 * All possible error codes for image generation operations
 */
export enum ImageGenerationErrorCode {
  // API errors
  API_KEY_MISSING = 'API_KEY_MISSING',
  API_KEY_INVALID = 'API_KEY_INVALID',
  API_TIMEOUT = 'API_TIMEOUT',
  API_RATE_LIMIT = 'API_RATE_LIMIT',
  API_ERROR = 'API_ERROR',

  // Input validation
  INVALID_PROMPTS = 'INVALID_PROMPTS',
  WRONG_PROMPT_COUNT = 'WRONG_PROMPT_COUNT',
  PROMPT_TOO_LONG = 'PROMPT_TOO_LONG',
  INVALID_MODEL = 'INVALID_MODEL',

  // Generation errors
  GENERATION_FAILED = 'GENERATION_FAILED',
  INVALID_IMAGE_DATA = 'INVALID_IMAGE_DATA',
  IMAGE_UPLOAD_FAILED = 'IMAGE_UPLOAD_FAILED',
  PARTIAL_GENERATION_FAILURE = 'PARTIAL_GENERATION_FAILURE',
  ALL_GENERATIONS_FAILED = 'ALL_GENERATIONS_FAILED',

  // Session errors
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
  SESSION_ALREADY_COMPLETE = 'SESSION_ALREADY_COMPLETE',
  SESSION_CANCELED = 'SESSION_CANCELED',

  // Storage errors
  STORAGE_UNAVAILABLE = 'STORAGE_UNAVAILABLE',
  STORAGE_QUOTA_EXCEEDED = 'STORAGE_QUOTA_EXCEEDED',

  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',

  // Cost/quota errors
  INSUFFICIENT_CREDITS = 'INSUFFICIENT_CREDITS',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
}

/**
 * Error for a specific card generation failure
 */
export interface CardGenerationError {
  code: ImageGenerationErrorCode
  message: string
  cardNumber: CardNumber
  retryable: boolean
}

// ============================================================================
// SERVICE INTERFACE (THE CONTRACT)
// ============================================================================

/**
 * Image Generation Service Contract
 *
 * Defines all operations for generating tarot card images using Grok image API.
 * Implementation handles:
 * - Sequential generation of 22 images with progress tracking
 * - Rate limiting and retry logic
 * - Base64 to Blob conversion
 * - Upload to permanent storage (Vercel Blob)
 * - Error handling and partial success
 * - Generation cancellation
 *
 * @interface IImageGenerationService
 */
export interface IImageGenerationService {
  /**
   * Generate all 22 tarot card images
   *
   * Workflow:
   * 1. Validate prompts (count, format)
   * 2. Generate images sequentially (to avoid rate limits)
   * 3. Convert base64 responses to Blobs
   * 4. Upload to Vercel Blob for permanent storage
   * 5. Track progress and call onProgress callback
   * 6. Handle failures (retry or mark as failed)
   * 7. Return all cards (successful and failed)
   *
   * @param input - Prompts and generation options
   * @returns Promise<ServiceResponse<GenerateImagesOutput>> - All generated images
   *
   * @throws Never throws - all errors returned in ServiceResponse
   *
   * @example
   * ```typescript
   * const result = await service.generateImages({
   *   prompts: cardPrompts,
   *   saveToStorage: true,
   *   onProgress: (progress) => {
   *     console.log(`${progress.completed}/${progress.total} complete`);
   *     console.log(`${progress.percentComplete}% done`);
   *     console.log(`~${progress.estimatedTimeRemaining}s remaining`);
   *   }
   * });
   *
   * if (result.success) {
   *   const { generatedCards, totalUsage, fullySuccessful } = result.data;
   *
   *   if (fullySuccessful) {
   *     console.log('All 22 cards generated!');
   *   } else {
   *     const failed = generatedCards.filter(c => c.generationStatus === 'failed');
   *     console.log(`${failed.length} cards failed - retry?`);
   *   }
   *
   *   console.log(`Total cost: $${totalUsage.estimatedCost}`);
   * }
   * ```
   */
  generateImages(input: GenerateImagesInput): Promise<ServiceResponse<GenerateImagesOutput>>

  /**
   * Regenerate a single failed image
   *
   * Useful for retrying specific cards that failed during batch generation.
   *
   * @param input - Card to regenerate
   * @returns Promise<ServiceResponse<RegenerateImageOutput>> - Regenerated card
   *
   * @throws Never throws - all errors returned in ServiceResponse
   *
   * @example
   * ```typescript
   * // Retry failed card
   * const result = await service.regenerateImage({
   *   cardNumber: 13, // Death card failed
   *   prompt: cardPrompts[13].generatedPrompt
   * });
   *
   * if (result.success) {
   *   replaceCard(13, result.data.generatedCard);
   * }
   * ```
   */
  regenerateImage(input: RegenerateImageInput): Promise<ServiceResponse<RegenerateImageOutput>>

  /**
   * Cancel ongoing image generation
   *
   * Stops generation after current card completes.
   * Returns cards generated before cancellation.
   *
   * @param input - Session to cancel
   * @returns Promise<ServiceResponse<CancelGenerationOutput>> - Cancellation result
   *
   * @throws Never throws - all errors returned in ServiceResponse
   *
   * @example
   * ```typescript
   * const result = await service.cancelGeneration({ sessionId });
   * if (result.success) {
   *   console.log(`Canceled. ${result.data.completedBeforeCancel} cards saved.`);
   * }
   * ```
   */
  cancelGeneration(input: CancelGenerationInput): Promise<ServiceResponse<CancelGenerationOutput>>

  /**
   * Get status of ongoing generation
   *
   * Check progress without blocking.
   *
   * @param input - Session ID
   * @returns Promise<ServiceResponse<GetGenerationStatusOutput>> - Current status
   *
   * @throws Never throws - all errors returned in ServiceResponse
   *
   * @example
   * ```typescript
   * const result = await service.getGenerationStatus({ sessionId });
   * if (result.success) {
   *   const { progress, isComplete } = result.data;
   *   if (!isComplete) {
   *     console.log(`${progress.percentComplete}% complete`);
   *   }
   * }
   * ```
   */
  getGenerationStatus(
    input: GetGenerationStatusInput
  ): Promise<ServiceResponse<GetGenerationStatusOutput>>

  /**
   * Estimate cost and time for generating images
   *
   * Calculates estimated cost based on number of images.
   * Use before generation to show user expected cost.
   *
   * @param input - Number of images to generate
   * @returns Promise<ServiceResponse<EstimateImageCostOutput>> - Cost estimate
   *
   * @throws Never throws - all errors returned in ServiceResponse
   *
   * @example
   * ```typescript
   * const result = await service.estimateCost({ imageCount: 22 });
   * if (result.success) {
   *   const { totalEstimatedCost, estimatedTime } = result.data;
   *   if (totalEstimatedCost > 5.00) {
   *     await confirmWithUser(`Cost: $${totalEstimatedCost}, Time: ~${estimatedTime/60}min`);
   *   }
   * }
   * ```
   */
  estimateCost(input: { imageCount: number }): Promise<ServiceResponse<EstimateImageCostOutput>>
}

// ============================================================================
// USER-FRIENDLY ERROR MESSAGES
// ============================================================================

/**
 * Maps error codes to user-friendly messages
 */
export const IMAGE_GENERATION_ERROR_MESSAGES: Record<ImageGenerationErrorCode, string> = {
  [ImageGenerationErrorCode.API_KEY_MISSING]:
    'Grok API key is not configured - please contact support',
  [ImageGenerationErrorCode.API_KEY_INVALID]: 'Grok API key is invalid - please contact support',
  [ImageGenerationErrorCode.API_TIMEOUT]: 'Image generation timed out - please try again',
  [ImageGenerationErrorCode.API_RATE_LIMIT]: 'Rate limit reached - please wait a moment',
  [ImageGenerationErrorCode.API_ERROR]: 'Grok API error - please try again',

  [ImageGenerationErrorCode.INVALID_PROMPTS]: 'Invalid prompts provided',
  [ImageGenerationErrorCode.WRONG_PROMPT_COUNT]: 'Must provide exactly 22 prompts',
  [ImageGenerationErrorCode.PROMPT_TOO_LONG]: 'Prompt exceeds maximum length',
  [ImageGenerationErrorCode.INVALID_MODEL]: 'Invalid Grok model specified',

  [ImageGenerationErrorCode.GENERATION_FAILED]: 'Image generation failed - please try again',
  [ImageGenerationErrorCode.INVALID_IMAGE_DATA]: 'Received invalid image data from API',
  [ImageGenerationErrorCode.IMAGE_UPLOAD_FAILED]: 'Failed to upload image to storage',
  [ImageGenerationErrorCode.PARTIAL_GENERATION_FAILURE]:
    'Some images failed to generate - you can retry failed cards',
  [ImageGenerationErrorCode.ALL_GENERATIONS_FAILED]:
    'All image generations failed - please try again',

  [ImageGenerationErrorCode.SESSION_NOT_FOUND]: 'Generation session not found',
  [ImageGenerationErrorCode.SESSION_ALREADY_COMPLETE]: 'Generation session is already complete',
  [ImageGenerationErrorCode.SESSION_CANCELED]: 'Generation was canceled',

  [ImageGenerationErrorCode.STORAGE_UNAVAILABLE]: 'Image storage is unavailable',
  [ImageGenerationErrorCode.STORAGE_QUOTA_EXCEEDED]: 'Storage quota exceeded',

  [ImageGenerationErrorCode.NETWORK_ERROR]: 'Network error - please check your connection',

  [ImageGenerationErrorCode.INSUFFICIENT_CREDITS]: 'Insufficient API credits',
  [ImageGenerationErrorCode.QUOTA_EXCEEDED]: 'API quota exceeded - please try again later',
}

// ============================================================================
// METADATA
// ============================================================================

/**
 * Contract metadata for tracking and documentation
 */
export const IMAGE_GENERATION_CONTRACT_METADATA = {
  version: '1.0.0',
  seam: 'ImageGenerationSeam',
  boundary: 'Application → Grok Image API → Vercel Blob Storage',
  requirement: 'PRD: User Flow Step 5',
  lastUpdated: '2025-11-07',
  dependencies: ['PromptGeneration'],
  externalAPIs: ['Grok grok-2-image-alpha', 'Vercel Blob'],
} as const
