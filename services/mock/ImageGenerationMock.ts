/**
 * @fileoverview Mock implementation of Image Generation service
 * @purpose Provide realistic Grok image API simulation for generating tarot card images
 * @dataFlow Card Prompts → Mock AI Image Generation → Base64 Images
 * @mockBehavior
 *   - Simulates 2-3 seconds per card generation
 *   - Generates mock base64 placeholder images
 *   - Reports progress for each card (0-22)
 *   - Simulates occasional failures and retries
 *   - Returns complete usage and cost data
 * @dependencies contracts/ImageGeneration.ts
 * @updated 2025-11-07
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
  GenerationStatus,
  ImageGenerationProgress,
  TotalImageGenerationUsage,
  ImageGenerationUsage,
} from '$contracts/ImageGeneration'

import { GROK_IMAGE_MODEL } from '$contracts/ImageGeneration'
import type { ServiceResponse } from '$contracts/types/common'
import type { CardNumber } from '$contracts/PromptGeneration'

/**
 * Mock implementation of ImageGenerationService
 *
 * Simulates Grok image generation API with realistic delays and progress tracking.
 */
export class ImageGenerationMockService implements IImageGenerationService {
  private generatedCards: Map<GeneratedCardId, GeneratedCard> = new Map()

  /**
   * Generate all 22 card images
   */
  async generateImages(input: GenerateImagesInput): Promise<ServiceResponse<GenerateImagesOutput>> {
    const { prompts, onProgress } = input
    const generatedCards: GeneratedCard[] = []
    const usagePerCard: ImageGenerationUsage[] = []
    let failed = 0

    const startTime = Date.now()

    for (let i = 0; i < prompts.length; i++) {
      const prompt = prompts[i]
      if (!prompt) continue // Skip if undefined

      // Report progress
      if (onProgress) {
        const progress: ImageGenerationProgress = {
          total: prompts.length,
          completed: i,
          failed,
          current: i,
          percentComplete: Math.round((i / prompts.length) * 100),
          estimatedTimeRemaining: (prompts.length - i) * 2.5,
          status: `Generating ${prompt.cardName}...`,
        }
        onProgress(progress)
      }

      // Simulate generation delay
      await this.delay(2500 + Math.random() * 500)

      // 10% chance of simulated failure on first attempt
      const shouldFail = Math.random() < 0.1

      if (shouldFail && i < prompts.length - 1) {
        // Simulate failure
        const failedCard: GeneratedCard = {
          id: crypto.randomUUID() as GeneratedCardId,
          cardNumber: prompt.cardNumber,
          cardName: prompt.cardName,
          prompt: prompt.generatedPrompt,
          generationStatus: 'failed',
          retryCount: 1,
          error: 'Simulated API error',
        }
        generatedCards.push(failedCard)
        failed++

        // Auto-retry
        await this.delay(1000)

        // Retry succeeds
        const retriedCard = await this.generateSingleCard(
          prompt.cardNumber,
          prompt.cardName,
          prompt.generatedPrompt
        )
        generatedCards[generatedCards.length - 1] = retriedCard
        failed--
      } else {
        // Success
        const card = await this.generateSingleCard(
          prompt.cardNumber,
          prompt.cardName,
          prompt.generatedPrompt
        )
        generatedCards.push(card)
      }

      // Track usage
      usagePerCard.push({
        cardNumber: prompt.cardNumber,
        model: GROK_IMAGE_MODEL,
        estimatedCost: 0.1, // $0.10 per image
        generationTime: 2500,
        requestId: `mock_img_${crypto.randomUUID()}`,
      })

      this.generatedCards.set(
        generatedCards[generatedCards.length - 1].id,
        generatedCards[generatedCards.length - 1]
      )
    }

    // Final progress
    if (onProgress) {
      onProgress({
        total: prompts.length,
        completed: prompts.length,
        failed: 0,
        current: prompts.length,
        percentComplete: 100,
        estimatedTimeRemaining: 0,
        status: 'Complete!',
      })
    }

    const totalTime = Date.now() - startTime

    const totalUsage: TotalImageGenerationUsage = {
      totalImages: prompts.length,
      successfulImages: prompts.length - failed,
      failedImages: failed,
      estimatedCost: prompts.length * 0.1,
      totalGenerationTime: totalTime,
      usagePerCard,
    }

    return {
      success: true,
      data: {
        generatedCards,
        totalUsage,
        sessionId: crypto.randomUUID(),
        startedAt: new Date(startTime),
        completedAt: new Date(),
        fullySuccessful: failed === 0,
      },
    }
  }

  /**
   * Regenerate a single card
   */
  async regenerateImage(
    input: RegenerateImageInput
  ): Promise<ServiceResponse<RegenerateImageOutput>> {
    await this.delay(2500)

    const { cardNumber, prompt } = input
    const card = await this.generateSingleCard(cardNumber, prompt.cardName, prompt.generatedPrompt)

    this.generatedCards.set(card.id, card)

    const usage: ImageGenerationUsage = {
      cardNumber,
      model: GROK_IMAGE_MODEL,
      estimatedCost: 0.1,
      generationTime: 2500,
      requestId: `mock_regen_img_${crypto.randomUUID()}`,
    }

    return {
      success: true,
      data: {
        generatedCard: card,
        usage,
      },
    }
  }

  /**
   * Cancel ongoing generation
   */
  async cancelGeneration(
    input: CancelGenerationInput
  ): Promise<ServiceResponse<CancelGenerationOutput>> {
    await this.delay(100)

    const { sessionId } = input

    // Mock: just return that we canceled
    // In real implementation, this would stop the actual generation process
    return {
      success: true,
      data: {
        canceled: true,
        completedBeforeCancel: this.generatedCards.size,
        sessionId,
      },
    }
  }

  /**
   * Get generation status
   */
  async getGenerationStatus(
    input: GetGenerationStatusInput
  ): Promise<ServiceResponse<GetGenerationStatusOutput>> {
    await this.delay(50)

    const { sessionId } = input

    // Mock: return completion status
    // In real implementation, this would track actual session progress
    return {
      success: true,
      data: {
        sessionId,
        progress: {
          total: 22,
          completed: this.generatedCards.size,
          failed: 0,
          current: this.generatedCards.size,
          percentComplete: Math.round((this.generatedCards.size / 22) * 100),
          estimatedTimeRemaining: (22 - this.generatedCards.size) * 2.5,
          status: this.generatedCards.size === 22 ? 'Complete!' : 'Generating...',
        },
        isComplete: this.generatedCards.size === 22,
        isCanceled: false,
      },
    }
  }

  /**
   * Estimate cost for generating images
   */
  async estimateCost(input: {
    imageCount: number
  }): Promise<ServiceResponse<EstimateImageCostOutput>> {
    await this.delay(50)

    const { imageCount } = input
    const costPerImage = 0.1 // $0.10 per image
    const timePerImage = 2.5 // 2.5 seconds per image

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

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Generate a single card with mock image data
   */
  private async generateSingleCard(
    cardNumber: CardNumber,
    cardName: string,
    prompt: string
  ): Promise<GeneratedCard> {
    // Generate a mock base64 placeholder image
    const imageDataUrl = this.createMockImageDataUrl(cardName)

    return {
      id: crypto.randomUUID() as GeneratedCardId,
      cardNumber,
      cardName,
      prompt,
      imageDataUrl,
      generationStatus: 'completed',
      generatedAt: new Date(),
      retryCount: 0,
    }
  }

  /**
   * Create a mock base64 image data URL
   * In real implementation, this would be actual generated image data
   */
  private createMockImageDataUrl(cardName: string): string {
    // Create a simple SVG placeholder as base64
    const svg = `
      <svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
        <rect width="1024" height="1024" fill="#${this.randomColor()}"/>
        <text x="512" y="512" text-anchor="middle" font-size="48" fill="white" font-family="Arial">
          ${cardName}
        </text>
        <text x="512" y="572" text-anchor="middle" font-size="24" fill="white" font-family="Arial" opacity="0.7">
          [Mock Generated Image]
        </text>
      </svg>
    `
    const base64 = Buffer.from(svg).toString('base64')
    return `data:image/svg+xml;base64,${base64}`
  }

  /**
   * Generate a random color for mock images
   */
  private randomColor(): string {
    const colors = ['2C3E50', '8E44AD', '2980B9', '27AE60', 'F39C12', 'C0392B', '16A085']
    return colors[Math.floor(Math.random() * colors.length)]
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
export const imageGenerationMockService = new ImageGenerationMockService()
