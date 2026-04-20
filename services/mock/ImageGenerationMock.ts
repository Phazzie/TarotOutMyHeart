/**
 * @fileoverview Mock implementation of IImageGenerationService
 * @purpose Provide realistic mock behavior for AI image generation
 * @boundary Seam #4: ImageGenerationSeam
 * @contract contracts/ImageGeneration.ts
 */

import type { ServiceResponse } from '$contracts/types/common'
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
  ImageGenerationProgress,
  ImageGenerationUsage,
  TotalImageGenerationUsage,
  GeneratedCardId,
  GenerationStatus,
} from '$contracts/ImageGeneration'
import { ImageGenerationErrorCode, GROK_IMAGE_MODEL } from '$contracts/ImageGeneration'
import type { CardNumber } from '$contracts/PromptGeneration'
import { MAJOR_ARCANA_COUNT } from '$contracts/PromptGeneration'

interface GenerationSession {
  id: string
  progress: ImageGenerationProgress
  isComplete: boolean
  isCanceled: boolean
  cards: GeneratedCard[]
}

/**
 * Mock implementation of IImageGenerationService
 * Simulates sequential image generation with progress tracking
 */
export class ImageGenerationMockService implements IImageGenerationService {
  private generatedCards: Map<GeneratedCardId, GeneratedCard> = new Map()
  private sessions: Map<string, GenerationSession> = new Map()
  private activeSession: string | null = null
  private cancelRequested: boolean = false

  /**
   * Generate a unique GeneratedCardId
   */
  private generateId(): GeneratedCardId {
    return crypto.randomUUID() as GeneratedCardId
  }

  /**
   * Simulate async delay
   */
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Generate a placeholder image URL
   */
  private generatePlaceholderImageUrl(cardNumber: number, cardName: string): string {
    const colors = ['2C3E50', '8E44AD', '2980B9', '27AE60', 'F39C12', 'C0392B', '16A085']
    const color = colors[cardNumber % colors.length]
    const encodedName = encodeURIComponent(cardName)
    return `https://placehold.co/1024x1024/${color}/FFFFFF?text=${encodedName}`
  }

  /**
   * Generate a single card
   */
  private generateSingleCard(
    cardNumber: CardNumber,
    cardName: string,
    prompt: string,
    status: GenerationStatus = 'completed'
  ): GeneratedCard {
    const id = this.generateId()
    const card: GeneratedCard = {
      id,
      cardNumber,
      cardName,
      prompt,
      imageUrl:
        status === 'completed' ? this.generatePlaceholderImageUrl(cardNumber, cardName) : undefined,
      imageDataUrl: undefined,
      generationStatus: status,
      generatedAt: status === 'completed' ? new Date() : undefined,
      retryCount: 0,
      error: status === 'failed' ? 'Simulated generation failure' : undefined,
    }
    return card
  }

  /**
   * Runtime type guard to validate a prompt has the expected shape
   */
  private isValidPrompt(
    prompt: unknown
  ): prompt is { cardNumber: CardNumber; cardName: string; generatedPrompt: string } {
    if (typeof prompt !== 'object' || prompt === null) return false
    const p = prompt as Record<string, unknown>
    return (
      typeof p['cardNumber'] === 'number' &&
      typeof p['cardName'] === 'string' &&
      typeof p['generatedPrompt'] === 'string'
    )
  }

  async generateImages(input: GenerateImagesInput): Promise<ServiceResponse<GenerateImagesOutput>> {
    const { prompts, onProgress, allowPartialSuccess = true, saveToStorage = true } = input

    // Validate prompts
    if (!prompts || prompts.length === 0) {
      return {
        success: false,
        error: {
          code: ImageGenerationErrorCode.WRONG_PROMPT_COUNT,
          message: `Expected ${MAJOR_ARCANA_COUNT} prompts, got ${prompts?.length ?? 0}`,
          retryable: false,
        },
      }
    }

    if (prompts.length !== MAJOR_ARCANA_COUNT) {
      return {
        success: false,
        error: {
          code: ImageGenerationErrorCode.WRONG_PROMPT_COUNT,
          message: `Expected ${MAJOR_ARCANA_COUNT} prompts, got ${prompts.length}`,
          retryable: false,
        },
      }
    }

    // Create session
    const sessionId = crypto.randomUUID()
    this.activeSession = sessionId
    this.cancelRequested = false

    const generatedCards: GeneratedCard[] = []
    const usagePerCard: ImageGenerationUsage[] = []
    const startedAt = new Date()
    let completed = 0
    let failed = 0

    // Process each prompt
    for (let i = 0; i < prompts.length; i++) {
      // Check for cancellation
      if (this.cancelRequested) {
        break
      }

      const prompt = prompts[i]!

      // Validate prompt shape at runtime (contract tests may pass malformed prompts)
      if (!this.isValidPrompt(prompt)) {
        return {
          success: false,
          error: {
            code: ImageGenerationErrorCode.INVALID_PROMPTS,
            message: `Invalid prompt shape at index ${i}: expected { cardNumber, cardName, generatedPrompt }`,
            retryable: false,
          },
        }
      }

      // Update progress
      if (onProgress) {
        const progress: ImageGenerationProgress = {
          total: MAJOR_ARCANA_COUNT,
          completed,
          failed,
          current: i,
          percentComplete: Math.round((i / MAJOR_ARCANA_COUNT) * 100),
          estimatedTimeRemaining: (MAJOR_ARCANA_COUNT - i) * 2,
          status: `Generating ${prompt.cardName}...`,
        }
        onProgress(progress)
      }

      await this.delay(50) // Simulate generation time (mock: 50ms per card = ~1.1s total)

      // Simulate occasional failures (10% chance)
      const shouldFail = Math.random() < 0.1

      const card = this.generateSingleCard(
        prompt.cardNumber,
        prompt.cardName,
        prompt.generatedPrompt,
        shouldFail ? 'failed' : 'completed'
      )

      // When not saving to storage, populate imageDataUrl instead of (or in addition to) imageUrl
      if (!shouldFail && !saveToStorage) {
        card.imageDataUrl = `data:image/png;base64,mock-base64-data-for-card-${prompt.cardNumber}`
        card.imageUrl = undefined
      }

      if (shouldFail) {
        failed++
      } else {
        completed++
        this.generatedCards.set(card.id, card)
      }

      generatedCards.push(card)

      usagePerCard.push({
        cardNumber: prompt.cardNumber,
        model: GROK_IMAGE_MODEL,
        estimatedCost: 0.1,
        generationTime: 2000,
        requestId: crypto.randomUUID(),
      })
    }

    // Final progress
    if (onProgress) {
      onProgress({
        total: MAJOR_ARCANA_COUNT,
        completed,
        failed,
        current: MAJOR_ARCANA_COUNT,
        percentComplete: 100,
        estimatedTimeRemaining: 0,
        status: 'Complete',
      })
    }

    const completedAt = new Date()
    const fullySuccessful = failed === 0 && completed === MAJOR_ARCANA_COUNT

    const totalUsage: TotalImageGenerationUsage = {
      totalImages: MAJOR_ARCANA_COUNT,
      successfulImages: completed,
      failedImages: failed,
      estimatedCost: completed * 0.1,
      totalGenerationTime: completedAt.getTime() - startedAt.getTime(),
      usagePerCard,
    }

    // Store session
    this.sessions.set(sessionId, {
      id: sessionId,
      progress: {
        total: MAJOR_ARCANA_COUNT,
        completed,
        failed,
        current: MAJOR_ARCANA_COUNT,
        percentComplete: 100,
        estimatedTimeRemaining: 0,
        status: 'Complete',
      },
      isComplete: true,
      isCanceled: this.cancelRequested,
      cards: generatedCards,
    })

    this.activeSession = null

    // Check for complete failure
    if (failed === MAJOR_ARCANA_COUNT) {
      return {
        success: false,
        error: {
          code: ImageGenerationErrorCode.ALL_GENERATIONS_FAILED,
          message: 'All image generations failed',
          retryable: true,
        },
      }
    }

    // Partial failure warning
    if (failed > 0 && !allowPartialSuccess) {
      return {
        success: false,
        error: {
          code: ImageGenerationErrorCode.PARTIAL_GENERATION_FAILURE,
          message: `${failed} images failed to generate`,
          retryable: true,
        },
      }
    }

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

  async regenerateImage(
    input: RegenerateImageInput
  ): Promise<ServiceResponse<RegenerateImageOutput>> {
    await this.delay(500)

    const { cardNumber, prompt, previousAttempts = 0 } = input

    // Validate cardNumber bounds (0-21)
    if (cardNumber < 0 || cardNumber > 21) {
      return {
        success: false,
        error: {
          code: ImageGenerationErrorCode.INVALID_PROMPTS,
          message: `Invalid card number: ${cardNumber}. Must be between 0 and 21.`,
          retryable: false,
        },
      }
    }

    // Get card name from number
    const cardNames = [
      'The Fool',
      'The Magician',
      'The High Priestess',
      'The Empress',
      'The Emperor',
      'The Hierophant',
      'The Lovers',
      'The Chariot',
      'Strength',
      'The Hermit',
      'Wheel of Fortune',
      'Justice',
      'The Hanged Man',
      'Death',
      'Temperance',
      'The Devil',
      'The Tower',
      'The Star',
      'The Moon',
      'The Sun',
      'Judgement',
      'The World',
    ]

    const cardName = cardNames[cardNumber] || `Card ${cardNumber}`

    // Simulate failure after too many retries
    if (previousAttempts >= 3) {
      return {
        success: false,
        error: {
          code: ImageGenerationErrorCode.GENERATION_FAILED,
          message: 'Maximum retry attempts exceeded',
          retryable: false,
        },
      }
    }

    const card = this.generateSingleCard(cardNumber, cardName, prompt, 'completed')
    card.retryCount = previousAttempts + 1

    this.generatedCards.set(card.id, card)

    const usage: ImageGenerationUsage = {
      cardNumber,
      model: GROK_IMAGE_MODEL,
      estimatedCost: 0.1,
      generationTime: 2000,
      requestId: crypto.randomUUID(),
    }

    return {
      success: true,
      data: {
        generatedCard: card,
        usage,
      },
    }
  }

  async cancelGeneration(
    input: CancelGenerationInput
  ): Promise<ServiceResponse<CancelGenerationOutput>> {
    const { sessionId } = input

    if (this.activeSession !== sessionId) {
      const session = this.sessions.get(sessionId)
      if (!session) {
        return {
          success: false,
          error: {
            code: ImageGenerationErrorCode.SESSION_NOT_FOUND,
            message: 'Session not found',
            retryable: false,
          },
        }
      }

      if (session.isComplete) {
        return {
          success: false,
          error: {
            code: ImageGenerationErrorCode.SESSION_ALREADY_COMPLETE,
            message: 'Session already complete',
            retryable: false,
          },
        }
      }
    }

    this.cancelRequested = true

    const session = this.sessions.get(sessionId)
    const completedBeforeCancel = session?.progress.completed || 0

    return {
      success: true,
      data: {
        canceled: true,
        completedBeforeCancel,
        sessionId,
      },
    }
  }

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
          message: 'Session not found',
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

  async estimateCost(input: {
    imageCount: number
  }): Promise<ServiceResponse<EstimateImageCostOutput>> {
    await this.delay(50)

    const { imageCount } = input

    if (imageCount <= 0 || imageCount > 100) {
      return {
        success: false,
        error: {
          code: ImageGenerationErrorCode.INVALID_PROMPTS,
          message: 'Invalid image count',
          retryable: false,
        },
      }
    }

    const costPerImage = 0.1 // $0.10 per image
    const timePerImage = 2 // 2 seconds per image

    return {
      success: true,
      data: {
        totalImages: imageCount,
        costPerImage,
        totalEstimatedCost: imageCount * costPerImage,
        estimatedTime: imageCount * timePerImage,
      },
    }
  }
}
