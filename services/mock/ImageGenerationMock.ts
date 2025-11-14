/**
 * @fileoverview Image Generation Mock Service
 * @purpose Mock implementation of IImageGenerationService for testing and development
 * @dataFlow CardPrompt[] → Mock image generation → GeneratedCard[] with URLs
 * @boundary Seam #4: ImageGenerationSeam - Simulates Grok image API behavior
 *
 * Provides realistic simulation of image generation including:
 * - Sequential generation with progress tracking
 * - Session management for cancellation and status checks
 * - Realistic delays and cost estimates
 * - Error handling for all contract error codes
 * - Support for both permanent storage (URLs) and temporary (data URLs)
 *
 * @example
 * ```typescript
 * const service = new ImageGenerationMock()
 * const result = await service.generateImages({
 *   prompts: cardPrompts,
 *   onProgress: (progress) => console.log(`${progress.percentComplete}% complete`)
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
  ImageGenerationUsage,
  TotalImageGenerationUsage,
} from '../../contracts/ImageGeneration'

import { ImageGenerationErrorCode } from '../../contracts/ImageGeneration'

import type { ServiceResponse } from '../../contracts/types/common'
import type { CardNumber } from '../../contracts/PromptGeneration'

/**
 * Internal session state for tracking generation
 */
interface GenerationSession {
  sessionId: string
  startedAt: Date
  completedAt?: Date
  cards: GeneratedCard[]
  progress: ImageGenerationProgress
  isComplete: boolean
  isCanceled: boolean
  totalUsage: TotalImageGenerationUsage
}

/**
 * Mock implementation of Image Generation Service
 *
 * Simulates Grok image API behavior with realistic delays and responses.
 * All 22 Major Arcana cards are generated with mock image URLs or data URLs.
 */
export class ImageGenerationMock implements IImageGenerationService {
  // Session storage
  private sessions = new Map<string, GenerationSession>()
  private sessionIdCounter = 1

  // Mock configuration
  private readonly COST_PER_IMAGE = 0.05 // $0.05 per image
  private readonly GENERATION_TIME_PER_IMAGE = 10 // 10ms per image (fast for tests)
  private readonly MAX_PROMPT_LENGTH = 2000
  private readonly VALID_MODEL = 'grok-2-image-alpha'

  /**
   * Generate all 22 tarot card images
   */
  async generateImages(
    input: GenerateImagesInput
  ): Promise<ServiceResponse<GenerateImagesOutput>> {
    // Validate input
    const validationError = this.validateGenerateInput(input)
    if (validationError) {
      return validationError
    }

    // Create session
    const sessionId = `session-${this.sessionIdCounter++}-${Date.now()}`
    const startedAt = new Date()

    const session: GenerationSession = {
      sessionId,
      startedAt,
      cards: [],
      progress: {
        total: 22,
        completed: 0,
        failed: 0,
        current: 0,
        percentComplete: 0,
        estimatedTimeRemaining: 22 * this.GENERATION_TIME_PER_IMAGE / 1000,
        status: 'Starting generation...',
      },
      isComplete: false,
      isCanceled: false,
      totalUsage: {
        totalImages: 22,
        successfulImages: 0,
        failedImages: 0,
        estimatedCost: 0,
        totalGenerationTime: 0,
        usagePerCard: [],
      },
    }

    this.sessions.set(sessionId, session)

    // Generate images sequentially
    const generatedCards: GeneratedCard[] = []
    const usagePerCard: ImageGenerationUsage[] = []
    let totalGenerationTime = 0

    for (let i = 0; i < input.prompts.length; i++) {
      // Check if canceled
      if (session.isCanceled) {
        break
      }

      const prompt = input.prompts[i]!
      const cardNumber = prompt.cardNumber

      // Update progress
      session.progress = {
        total: 22,
        completed: i,
        failed: session.totalUsage.failedImages,
        current: i,
        percentComplete: Math.round((i / 22) * 100),
        estimatedTimeRemaining: (22 - i) * this.GENERATION_TIME_PER_IMAGE / 1000,
        status: `Generating ${prompt.cardName}...`,
      }

      // Call progress callback
      if (input.onProgress) {
        input.onProgress(session.progress)
      }

      // Simulate generation delay
      await this.delay(this.GENERATION_TIME_PER_IMAGE)

      // Generate image
      const generationStart = Date.now()
      const card = this.generateCard(prompt, input.saveToStorage ?? true)
      const generationTime = Date.now() - generationStart

      generatedCards.push(card)
      totalGenerationTime += generationTime

      // Track usage
      const usage: ImageGenerationUsage = {
        cardNumber,
        model: input.model || this.VALID_MODEL,
        estimatedCost: this.COST_PER_IMAGE,
        generationTime,
        requestId: `req-${sessionId}-${i}`,
      }
      usagePerCard.push(usage)

      // Update session stats
      if (card.generationStatus === 'completed') {
        session.totalUsage.successfulImages++
      } else if (card.generationStatus === 'failed') {
        session.totalUsage.failedImages++
      }

      session.cards = generatedCards
      session.totalUsage.usagePerCard = usagePerCard
    }

    // Finalize session
    const completedAt = new Date()
    session.completedAt = completedAt
    session.isComplete = true
    session.totalUsage.totalGenerationTime = totalGenerationTime
    session.totalUsage.estimatedCost = session.totalUsage.successfulImages * this.COST_PER_IMAGE

    // Final progress update
    session.progress = {
      total: 22,
      completed: session.totalUsage.successfulImages,
      failed: session.totalUsage.failedImages,
      current: 22,
      percentComplete: 100,
      estimatedTimeRemaining: 0,
      status: session.isCanceled ? 'Canceled' : 'Complete',
    }

    if (input.onProgress) {
      input.onProgress(session.progress)
    }

    const fullySuccessful = session.totalUsage.successfulImages === 22

    // Return result
    return {
      success: true,
      data: {
        generatedCards,
        totalUsage: session.totalUsage,
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
    // Validate input
    if (input.cardNumber < 0 || input.cardNumber > 21) {
      return {
        success: false,
        error: {
          code: ImageGenerationErrorCode.INVALID_PROMPTS,
          message: 'Card number must be between 0 and 21',
          retryable: false,
        },
      }
    }

    if (input.prompt.length > this.MAX_PROMPT_LENGTH) {
      return {
        success: false,
        error: {
          code: ImageGenerationErrorCode.PROMPT_TOO_LONG,
          message: `Prompt exceeds maximum length of ${this.MAX_PROMPT_LENGTH}`,
          retryable: false,
        },
      }
    }

    // Simulate generation delay
    await this.delay(this.GENERATION_TIME_PER_IMAGE)

    const generationStart = Date.now()

    // Generate card
    const mockPrompt = {
      cardNumber: input.cardNumber,
      cardName: this.getCardName(input.cardNumber),
      generatedPrompt: input.prompt,
    }

    const generatedCard = this.generateCard(mockPrompt, true, input.previousAttempts)
    const generationTime = Date.now() - generationStart

    const usage: ImageGenerationUsage = {
      cardNumber: input.cardNumber,
      model: this.VALID_MODEL,
      estimatedCost: this.COST_PER_IMAGE,
      generationTime,
      requestId: `regen-${Date.now()}`,
    }

    return {
      success: true,
      data: {
        generatedCard,
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
    const session = this.sessions.get(input.sessionId)

    if (!session) {
      return {
        success: false,
        error: {
          code: ImageGenerationErrorCode.SESSION_NOT_FOUND,
          message: `Session ${input.sessionId} not found`,
          retryable: false,
        },
      }
    }

    if (session.isComplete) {
      return {
        success: false,
        error: {
          code: ImageGenerationErrorCode.SESSION_ALREADY_COMPLETE,
          message: 'Generation session is already complete',
          retryable: false,
        },
      }
    }

    if (session.isCanceled) {
      return {
        success: false,
        error: {
          code: ImageGenerationErrorCode.SESSION_CANCELED,
          message: 'Generation was already canceled',
          retryable: false,
        },
      }
    }

    // Mark as canceled
    session.isCanceled = true
    session.isComplete = true
    session.completedAt = new Date()

    return {
      success: true,
      data: {
        canceled: true,
        completedBeforeCancel: session.totalUsage.successfulImages,
        sessionId: input.sessionId,
      },
    }
  }

  /**
   * Get status of ongoing generation
   */
  async getGenerationStatus(
    input: GetGenerationStatusInput
  ): Promise<ServiceResponse<GetGenerationStatusOutput>> {
    const session = this.sessions.get(input.sessionId)

    if (!session) {
      return {
        success: false,
        error: {
          code: ImageGenerationErrorCode.SESSION_NOT_FOUND,
          message: `Session ${input.sessionId} not found`,
          retryable: false,
        },
      }
    }

    return {
      success: true,
      data: {
        sessionId: input.sessionId,
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
    // Validate input
    if (input.imageCount <= 0) {
      return {
        success: false,
        error: {
          code: ImageGenerationErrorCode.INVALID_PROMPTS,
          message: 'Image count must be greater than 0',
          retryable: false,
        },
      }
    }

    if (input.imageCount > 100) {
      return {
        success: false,
        error: {
          code: ImageGenerationErrorCode.QUOTA_EXCEEDED,
          message: 'Image count exceeds maximum allowed (100)',
          retryable: false,
        },
      }
    }

    const totalEstimatedCost = input.imageCount * this.COST_PER_IMAGE
    const estimatedTime = input.imageCount * (this.GENERATION_TIME_PER_IMAGE / 1000)

    return {
      success: true,
      data: {
        totalImages: input.imageCount,
        costPerImage: this.COST_PER_IMAGE,
        totalEstimatedCost,
        estimatedTime,
      },
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Validate generateImages input
   */
  private validateGenerateInput(
    input: GenerateImagesInput
  ): ServiceResponse<never> | null {
    // Check prompt count
    if (input.prompts.length !== 22) {
      return {
        success: false,
        error: {
          code: ImageGenerationErrorCode.WRONG_PROMPT_COUNT,
          message: `Must provide exactly 22 prompts, received ${input.prompts.length}`,
          retryable: false,
        },
      }
    }

    // Validate prompts structure
    for (const prompt of input.prompts) {
      if (!prompt.cardNumber && prompt.cardNumber !== 0) {
        return {
          success: false,
          error: {
            code: ImageGenerationErrorCode.INVALID_PROMPTS,
            message: 'Invalid prompt structure: missing cardNumber',
            retryable: false,
          },
        }
      }

      if (!prompt.generatedPrompt) {
        return {
          success: false,
          error: {
            code: ImageGenerationErrorCode.INVALID_PROMPTS,
            message: 'Invalid prompt structure: missing generatedPrompt',
            retryable: false,
          },
        }
      }

      if (prompt.generatedPrompt.length > this.MAX_PROMPT_LENGTH) {
        return {
          success: false,
          error: {
            code: ImageGenerationErrorCode.PROMPT_TOO_LONG,
            message: `Prompt for ${prompt.cardName} exceeds maximum length`,
            retryable: false,
          },
        }
      }
    }

    // Validate model if provided
    if (input.model && input.model !== this.VALID_MODEL) {
      return {
        success: false,
        error: {
          code: ImageGenerationErrorCode.INVALID_MODEL,
          message: `Invalid model: ${input.model}. Use ${this.VALID_MODEL}`,
          retryable: false,
        },
      }
    }

    return null
  }

  /**
   * Generate a single card with mock data
   */
  private generateCard(
    prompt: { cardNumber: CardNumber; cardName: string; generatedPrompt: string },
    saveToStorage: boolean,
    previousAttempts: number = 0
  ): GeneratedCard {
    const id = `card-${prompt.cardNumber}-${Date.now()}` as GeneratedCardId
    const cardName = prompt.cardName || this.getCardName(prompt.cardNumber)

    // Mock: 95% success rate
    const isSuccess = Math.random() > 0.05

    const card: GeneratedCard = {
      id,
      cardNumber: prompt.cardNumber,
      cardName,
      prompt: prompt.generatedPrompt,
      generationStatus: isSuccess ? 'completed' : 'failed',
      retryCount: previousAttempts || 0,
    }

    if (isSuccess) {
      card.generatedAt = new Date()

      if (saveToStorage) {
        // Permanent storage URL (Vercel Blob)
        card.imageUrl = this.generateMockImageUrl(prompt.cardNumber, cardName)
      } else {
        // Temporary base64 data URL
        card.imageDataUrl = this.generateMockDataUrl(prompt.cardNumber)
      }
    } else {
      card.error = 'Mock generation failure for testing'
    }

    return card
  }

  /**
   * Generate mock image URL (simulates Vercel Blob storage)
   */
  private generateMockImageUrl(cardNumber: CardNumber, cardName: string): string {
    const slug = cardName.toLowerCase().replace(/\s+/g, '-')
    return `https://mock-blob-storage.vercel.app/tarot/${slug}-${cardNumber}.png`
  }

  /**
   * Generate mock base64 data URL
   */
  private generateMockDataUrl(_cardNumber: CardNumber): string {
    // Mock: tiny 1x1 transparent PNG (same for all cards in mock)
    const base64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    return `data:image/png;base64,${base64}`
  }

  /**
   * Get card name from card number
   */
  private getCardName(cardNumber: CardNumber): string {
    const names = [
      'The Fool', 'The Magician', 'The High Priestess', 'The Empress',
      'The Emperor', 'The Hierophant', 'The Lovers', 'The Chariot',
      'Strength', 'The Hermit', 'Wheel of Fortune', 'Justice',
      'The Hanged Man', 'Death', 'Temperance', 'The Devil',
      'The Tower', 'The Star', 'The Moon', 'The Sun',
      'Judgement', 'The World'
    ]
    return names[cardNumber] || `Card ${cardNumber}`
  }

  /**
   * Simulate async delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
