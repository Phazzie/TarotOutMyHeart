/**
 * @fileoverview Real implementation of Image Generation service
 * @purpose Generate tarot card images using Grok image API (grok-2-image-alpha)
 * @dataFlow Card Prompts → Grok Image API → Base64 Images → Application
 * @boundary Implements ImageGenerationSeam (Seam #4)
 * @dependencies contracts/ImageGeneration.ts, Grok Image API
 * @updated 2025-11-17
 *
 * @example
 * ```typescript
 * const service = new ImageGenerationService(apiKey)
 * const result = await service.generateImages({
 *   prompts: cardPrompts,
 *   onProgress: (progress) => console.log(progress)
 * })
 * ```
 */

import type {
  IImageGenerationService,
  GenerateImagesInput,
  GenerateImagesOutput,
  RegenerateImageInput,
  RegenerateImageOutput,
  CancelGenerationInput,
  CancelGenerationOutput,
  GetGenerationStatusInput,
  GetGenerationStatusOutput,
  EstimateImageCostOutput,
  GeneratedCard,
  GeneratedCardId,
  ImageGenerationProgress,
  TotalImageGenerationUsage,
  ImageGenerationUsage,
} from '$contracts/ImageGeneration'

import {
  GROK_IMAGE_MODEL,
  IMAGE_GENERATION_CONFIG,
  ImageGenerationErrorCode,
  IMAGE_GENERATION_ERROR_MESSAGES,
} from '$contracts/ImageGeneration'

import type { ServiceResponse } from '$contracts/types/common'
import type { CardPrompt, PromptId } from '$contracts/PromptGeneration'

/**
 * Grok API response for image generation
 */
interface GrokImageResponse {
  created: number
  data: Array<{
    b64_json?: string
    url?: string
    revised_prompt?: string
  }>
}

/**
 * Generation session state for tracking ongoing generation
 */
interface GenerationSession {
  sessionId: string
  startedAt: Date
  progress: ImageGenerationProgress
  generatedCards: GeneratedCard[]
  usagePerCard: ImageGenerationUsage[]
  isCanceled: boolean
  isComplete: boolean
}

/**
 * Real implementation of Image Generation Service
 *
 * Uses Grok Image API (grok-2-image-alpha) to generate tarot card images.
 * Handles sequential generation, progress tracking, retries, and cost calculation.
 */
export class ImageGenerationService implements IImageGenerationService {
  private apiKey: string
  private baseUrl: string
  private sessions: Map<string, GenerationSession> = new Map()

  constructor(
    apiKey?: string,
    baseUrl: string = 'https://api.x.ai/v1'
  ) {
    // Get API key from env or parameter
    this.apiKey = apiKey || process.env['XAI_API_KEY'] || ''
    this.baseUrl = baseUrl

    if (!this.apiKey) {
      console.warn('[ImageGenerationService] Warning: XAI_API_KEY not set - service will fail')
    }
  }

  /**
   * Generate all 22 tarot card images
   */
  async generateImages(
    input: GenerateImagesInput
  ): Promise<ServiceResponse<GenerateImagesOutput>> {
    const { prompts, model, onProgress, allowPartialSuccess } = input
    // Note: saveToStorage parameter would be used for Vercel Blob upload in future enhancement

    // Validation
    if (!this.apiKey) {
      return {
        success: false,
        error: {
          code: ImageGenerationErrorCode.API_KEY_MISSING,
          message: IMAGE_GENERATION_ERROR_MESSAGES[ImageGenerationErrorCode.API_KEY_MISSING],
          retryable: false,
        },
      }
    }

    if (!prompts || prompts.length !== 22) {
      return {
        success: false,
        error: {
          code: ImageGenerationErrorCode.WRONG_PROMPT_COUNT,
          message: IMAGE_GENERATION_ERROR_MESSAGES[ImageGenerationErrorCode.WRONG_PROMPT_COUNT],
          retryable: false,
        },
      }
    }

    // Create session
    const sessionId = `session_${crypto.randomUUID()}`
    const startTime = Date.now()
    const startedAt = new Date(startTime)
    const generatedCards: GeneratedCard[] = []
    const usagePerCard: ImageGenerationUsage[] = []
    let failedCount = 0

    // Initialize session
    const session: GenerationSession = {
      sessionId,
      startedAt,
      progress: {
        total: prompts.length,
        completed: 0,
        failed: 0,
        current: 0,
        percentComplete: 0,
        estimatedTimeRemaining: prompts.length * 3.0, // ~3s per image estimate
        status: 'Starting generation...',
      },
      generatedCards: [],
      usagePerCard: [],
      isCanceled: false,
      isComplete: false,
    }

    this.sessions.set(sessionId, session)

    // Generate images sequentially
    for (let i = 0; i < prompts.length; i++) {
      // Check for cancellation
      if (session.isCanceled) {
        console.log(`[ImageGenerationService] Generation canceled after ${i} images`)
        break
      }

      const prompt = prompts[i]

      // Skip if prompt is undefined (shouldn't happen with validation, but TypeScript requires check)
      if (!prompt) {
        console.error(`[ImageGenerationService] Prompt at index ${i} is undefined`)
        continue
      }

      const cardStartTime = Date.now()

      // Update progress
      session.progress = {
        total: prompts.length,
        completed: i,
        failed: failedCount,
        current: i,
        percentComplete: Math.round((i / prompts.length) * 100),
        estimatedTimeRemaining: (prompts.length - i) * 3.0,
        status: `Generating ${prompt.cardName}...`,
      }

      if (onProgress) {
        onProgress(session.progress)
      }

      // Generate image with retry logic
      const result = await this.generateSingleImage(
        prompt,
        model || GROK_IMAGE_MODEL
      )

      const generationTime = Date.now() - cardStartTime

      if (result.success && result.data) {
        // Success
        generatedCards.push(result.data)
        usagePerCard.push({
          cardNumber: prompt.cardNumber,
          model: model || GROK_IMAGE_MODEL,
          estimatedCost: 0.10, // $0.10 per image (Grok pricing)
          generationTime,
          requestId: `img_${crypto.randomUUID()}`,
        })
      } else {
        // Failed
        failedCount++
        const failedCard: GeneratedCard = {
          id: crypto.randomUUID() as GeneratedCardId,
          cardNumber: prompt.cardNumber,
          cardName: prompt.cardName,
          prompt: prompt.generatedPrompt,
          generationStatus: 'failed',
          retryCount: IMAGE_GENERATION_CONFIG.maxRetries,
          error: result.error?.message || 'Unknown error',
        }
        generatedCards.push(failedCard)
      }

      // Update session
      session.generatedCards = generatedCards
      session.usagePerCard = usagePerCard

      // Delay between requests to avoid rate limiting
      if (i < prompts.length - 1) {
        await this.delay(IMAGE_GENERATION_CONFIG.delayBetweenRequests)
      }
    }

    // Final progress
    session.progress = {
      total: prompts.length,
      completed: prompts.length - failedCount,
      failed: failedCount,
      current: prompts.length,
      percentComplete: 100,
      estimatedTimeRemaining: 0,
      status: session.isCanceled ? 'Canceled' : 'Complete!',
    }

    session.isComplete = true

    if (onProgress) {
      onProgress(session.progress)
    }

    const completedAt = new Date()
    const totalTime = Date.now() - startTime

    const totalUsage: TotalImageGenerationUsage = {
      totalImages: prompts.length,
      successfulImages: prompts.length - failedCount,
      failedImages: failedCount,
      estimatedCost: (prompts.length - failedCount) * 0.10,
      totalGenerationTime: totalTime,
      usagePerCard,
    }

    const fullySuccessful = failedCount === 0

    // Check if we should fail due to too many failures
    if (failedCount === prompts.length) {
      // All generations failed
      return {
        success: false,
        error: {
          code: ImageGenerationErrorCode.ALL_GENERATIONS_FAILED,
          message: IMAGE_GENERATION_ERROR_MESSAGES[ImageGenerationErrorCode.ALL_GENERATIONS_FAILED],
          retryable: true,
        },
      }
    }

    if (!fullySuccessful && !allowPartialSuccess) {
      // Some failed and partial success not allowed
      return {
        success: false,
        error: {
          code: ImageGenerationErrorCode.PARTIAL_GENERATION_FAILURE,
          message: IMAGE_GENERATION_ERROR_MESSAGES[ImageGenerationErrorCode.PARTIAL_GENERATION_FAILURE],
          retryable: true,
          details: {
            failedCards: generatedCards.filter(c => c.generationStatus === 'failed').map(c => c.cardNumber),
          },
        },
      }
    }

    // Success (full or partial)
    return {
      success: true,
      data: {
        generatedCards,
        totalUsage,
        sessionId,
        startedAt,
        completedAt,
        fullySuccessful,
      },
    }
  }

  /**
   * Regenerate a single failed image
   */
  async regenerateImage(
    input: RegenerateImageInput
  ): Promise<ServiceResponse<RegenerateImageOutput>> {
    if (!this.apiKey) {
      return {
        success: false,
        error: {
          code: ImageGenerationErrorCode.API_KEY_MISSING,
          message: IMAGE_GENERATION_ERROR_MESSAGES[ImageGenerationErrorCode.API_KEY_MISSING],
          retryable: false,
        },
      }
    }

    const { cardNumber, prompt } = input
    const cardStartTime = Date.now()
    // Note: previousAttempts could be used for exponential backoff in future enhancement

    // Create card prompt structure
    const cardPrompt: CardPrompt = {
      id: crypto.randomUUID() as PromptId,
      cardNumber,
      cardName: `Card ${cardNumber}`, // This should come from input ideally
      traditionalMeaning: '', // Not used for generation
      generatedPrompt: prompt,
      confidence: 1.0,
      generatedAt: new Date(),
    }

    // Generate image
    const result = await this.generateSingleImage(
      cardPrompt,
      GROK_IMAGE_MODEL
    )

    const generationTime = Date.now() - cardStartTime

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || {
          code: ImageGenerationErrorCode.GENERATION_FAILED,
          message: IMAGE_GENERATION_ERROR_MESSAGES[ImageGenerationErrorCode.GENERATION_FAILED],
          retryable: true,
        },
      }
    }

    const usage: ImageGenerationUsage = {
      cardNumber,
      model: GROK_IMAGE_MODEL,
      estimatedCost: 0.10,
      generationTime,
      requestId: `regen_img_${crypto.randomUUID()}`,
    }

    return {
      success: true,
      data: {
        generatedCard: result.data,
        usage,
      },
    }
  }

  /**
   * Cancel ongoing image generation
   */
  async cancelGeneration(
    input: CancelGenerationInput
  ): Promise<ServiceResponse<CancelGenerationOutput>> {
    const { sessionId } = input

    const session = this.sessions.get(sessionId)

    if (!session) {
      return {
        success: false,
        error: {
          code: ImageGenerationErrorCode.SESSION_NOT_FOUND,
          message: IMAGE_GENERATION_ERROR_MESSAGES[ImageGenerationErrorCode.SESSION_NOT_FOUND],
          retryable: false,
        },
      }
    }

    if (session.isComplete) {
      return {
        success: false,
        error: {
          code: ImageGenerationErrorCode.SESSION_ALREADY_COMPLETE,
          message: IMAGE_GENERATION_ERROR_MESSAGES[ImageGenerationErrorCode.SESSION_ALREADY_COMPLETE],
          retryable: false,
        },
      }
    }

    // Mark session as canceled
    session.isCanceled = true
    session.progress.status = 'Canceling...'

    return {
      success: true,
      data: {
        canceled: true,
        completedBeforeCancel: session.progress.completed,
        sessionId,
      },
    }
  }

  /**
   * Get status of ongoing generation
   */
  async getGenerationStatus(
    input: GetGenerationStatusInput
  ): Promise<ServiceResponse<GetGenerationStatusOutput>> {
    const { sessionId } = input

    const session = this.sessions.get(sessionId)

    if (!session) {
      return {
        success: false,
        error: {
          code: ImageGenerationErrorCode.SESSION_NOT_FOUND,
          message: IMAGE_GENERATION_ERROR_MESSAGES[ImageGenerationErrorCode.SESSION_NOT_FOUND],
          retryable: false,
        },
      }
    }

    return {
      success: true,
      data: {
        sessionId,
        progress: session.progress,
        isComplete: session.isComplete,
        isCanceled: session.isCanceled,
      },
    }
  }

  /**
   * Estimate cost and time for generating images
   */
  async estimateCost(
    input: { imageCount: number }
  ): Promise<ServiceResponse<EstimateImageCostOutput>> {
    const { imageCount } = input

    if (imageCount < 1 || imageCount > 100) {
      return {
        success: false,
        error: {
          code: ImageGenerationErrorCode.INVALID_PROMPTS,
          message: 'Image count must be between 1 and 100',
          retryable: false,
        },
      }
    }

    const costPerImage = 0.10 // $0.10 per image (Grok pricing)
    const timePerImage = 3.0 // ~3 seconds per image
    const delayPerImage = IMAGE_GENERATION_CONFIG.delayBetweenRequests / 1000 // 2 seconds

    return {
      success: true,
      data: {
        totalImages: imageCount,
        costPerImage,
        totalEstimatedCost: imageCount * costPerImage,
        estimatedTime: Math.round(imageCount * (timePerImage + delayPerImage)),
      },
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Generate a single image with retry logic
   */
  private async generateSingleImage(
    prompt: CardPrompt,
    model: string
  ): Promise<ServiceResponse<GeneratedCard>> {
    let lastError: ServiceResponse<GeneratedCard>['error']

    for (let attempt = 0; attempt < IMAGE_GENERATION_CONFIG.maxRetries; attempt++) {
      try {
        // Call Grok Image API
        const response = await fetch(`${this.baseUrl}/images/generations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model,
            prompt: prompt.generatedPrompt,
            n: 1,
            size: IMAGE_GENERATION_CONFIG.imageSize,
            response_format: IMAGE_GENERATION_CONFIG.responseFormat,
          }),
          signal: AbortSignal.timeout(IMAGE_GENERATION_CONFIG.timeout),
        })

        // Check for rate limiting
        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('Retry-After') || '5', 10)
          console.log(`[ImageGenerationService] Rate limited, waiting ${retryAfter}s before retry ${attempt + 1}/${IMAGE_GENERATION_CONFIG.maxRetries}`)
          await this.delay(retryAfter * 1000)
          continue
        }

        // Check for auth errors
        if (response.status === 401 || response.status === 403) {
          return {
            success: false,
            error: {
              code: ImageGenerationErrorCode.API_KEY_INVALID,
              message: IMAGE_GENERATION_ERROR_MESSAGES[ImageGenerationErrorCode.API_KEY_INVALID],
              retryable: false,
            },
          }
        }

        // Check for other errors
        if (!response.ok) {
          const errorText = await response.text()
          lastError = {
            code: ImageGenerationErrorCode.API_ERROR,
            message: `API error (${response.status}): ${errorText}`,
            retryable: true,
          }

          // Exponential backoff
          if (attempt < IMAGE_GENERATION_CONFIG.maxRetries - 1) {
            await this.delay(Math.pow(2, attempt) * 1000)
          }
          continue
        }

        // Parse response
        const data: GrokImageResponse = await response.json()

        if (!data.data || data.data.length === 0) {
          lastError = {
            code: ImageGenerationErrorCode.INVALID_IMAGE_DATA,
            message: IMAGE_GENERATION_ERROR_MESSAGES[ImageGenerationErrorCode.INVALID_IMAGE_DATA],
            retryable: true,
          }
          continue
        }

        // Extract image data
        const imageData = data.data[0]

        if (!imageData) {
          lastError = {
            code: ImageGenerationErrorCode.INVALID_IMAGE_DATA,
            message: IMAGE_GENERATION_ERROR_MESSAGES[ImageGenerationErrorCode.INVALID_IMAGE_DATA],
            retryable: true,
          }
          continue
        }

        const imageDataUrl = imageData.b64_json
          ? `data:image/png;base64,${imageData.b64_json}`
          : undefined
        const imageUrl = imageData.url

        // Validate we got image data
        if (!imageDataUrl && !imageUrl) {
          lastError = {
            code: ImageGenerationErrorCode.INVALID_IMAGE_DATA,
            message: IMAGE_GENERATION_ERROR_MESSAGES[ImageGenerationErrorCode.INVALID_IMAGE_DATA],
            retryable: true,
          }
          continue
        }

        // Success!
        const generatedCard: GeneratedCard = {
          id: crypto.randomUUID() as GeneratedCardId,
          cardNumber: prompt.cardNumber,
          cardName: prompt.cardName,
          prompt: prompt.generatedPrompt,
          imageUrl,
          imageDataUrl,
          generationStatus: 'completed',
          generatedAt: new Date(),
          retryCount: attempt,
        }

        return {
          success: true,
          data: generatedCard,
        }

      } catch (error) {
        console.error(`[ImageGenerationService] Error generating image (attempt ${attempt + 1}):`, error)

        if (error instanceof Error && error.name === 'AbortError') {
          lastError = {
            code: ImageGenerationErrorCode.API_TIMEOUT,
            message: IMAGE_GENERATION_ERROR_MESSAGES[ImageGenerationErrorCode.API_TIMEOUT],
            retryable: true,
          }
        } else {
          lastError = {
            code: ImageGenerationErrorCode.NETWORK_ERROR,
            message: error instanceof Error ? error.message : 'Unknown network error',
            retryable: true,
          }
        }

        // Exponential backoff before retry
        if (attempt < IMAGE_GENERATION_CONFIG.maxRetries - 1) {
          await this.delay(Math.pow(2, attempt) * 1000)
        }
      }
    }

    // All retries failed
    return {
      success: false,
      error: lastError || {
        code: ImageGenerationErrorCode.GENERATION_FAILED,
        message: IMAGE_GENERATION_ERROR_MESSAGES[ImageGenerationErrorCode.GENERATION_FAILED],
        retryable: false,
      },
    }
  }

  /**
   * Delay helper for rate limiting and retries
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Clean up old sessions
   */
  public clearOldSessions(olderThanMinutes: number = 60): void {
    const cutoffTime = Date.now() - (olderThanMinutes * 60 * 1000)
    const sessionsToDelete: string[] = []

    // Collect sessions to delete
    this.sessions.forEach((session, sessionId) => {
      if (session.startedAt.getTime() < cutoffTime) {
        sessionsToDelete.push(sessionId)
      }
    })

    // Delete collected sessions
    sessionsToDelete.forEach(sessionId => {
      this.sessions.delete(sessionId)
    })
  }
}

/**
 * Singleton instance for use throughout the application
 */
export const imageGenerationService = new ImageGenerationService()
