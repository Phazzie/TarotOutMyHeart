/**
 * @fileoverview Mock implementation of Prompt Generation service
 * @purpose Provide realistic Grok vision API simulation for generating tarot card prompts
 * @dataFlow Reference Images + Style → Mock AI Processing → 22 Card Prompts
 * @mockBehavior
 *   - Simulates 3-5 second generation time
 *   - Generates realistic prompts based on style inputs
 *   - Reports progress callbacks (0%, 25%, 50%, 75%, 100%)
 *   - Returns 22 unique Major Arcana prompts
 *   - Calculates mock API costs
 * @dependencies contracts/PromptGeneration.ts, contracts/StyleInput.ts
 * @updated 2025-11-07
 */

import type {
  IPromptGenerationService,
  GeneratePromptsInput,
  GeneratePromptsOutput,
  ValidatePromptsInput,
  ValidatePromptsOutput,
  RegeneratePromptInput,
  RegeneratePromptOutput,
  EditPromptInput,
  EditPromptOutput,
  CardPrompt,
  CardNumber,
  PromptId,
  ApiUsage,
  PromptValidationError,
} from '$contracts/PromptGeneration'

import {
  PromptGenerationErrorCode,
  MAJOR_ARCANA_NAMES,
  MAJOR_ARCANA_MEANINGS,
  GROK_MODELS,
} from '$contracts/PromptGeneration'

import type { ServiceResponse } from '$contracts/types/common'

/**
 * Mock implementation of PromptGenerationService
 * 
 * Simulates Grok vision API calls with realistic delays and generated content.
 */
export class PromptGenerationMockService implements IPromptGenerationService {
  /**
   * Generate all 22 Major Arcana card prompts
   */
  async generatePrompts(
    input: GeneratePromptsInput
  ): Promise<ServiceResponse<GeneratePromptsOutput>> {
    const { referenceImageUrls, styleInputs, model, onProgress } = input

    // Validate inputs
    if (!referenceImageUrls || referenceImageUrls.length === 0) {
      return {
        success: false,
        error: {
          code: 'NO_REFERENCE_IMAGES',
          message: 'At least one reference image is required',
          retryable: false,
        },
      }
    }

    // Simulate progress callbacks
    if (onProgress) {
      onProgress({ progress: 0, status: 'Analyzing reference images...', currentStep: 'analyzing' })
      await this.delay(800)

      onProgress({ progress: 25, status: 'Generating prompts for Fool through Lovers...', currentStep: 'generating' })
      await this.delay(1000)

      onProgress({ progress: 50, status: 'Generating prompts for Chariot through Hanged Man...', currentStep: 'generating' })
      await this.delay(1000)

      onProgress({ progress: 75, status: 'Generating prompts for Death through World...', currentStep: 'generating' })
      await this.delay(1000)

      onProgress({ progress: 100, status: 'Finalizing prompts...', currentStep: 'complete' })
      await this.delay(500)
    } else {
      // No progress callback, just simulate total generation time
      await this.delay(4000)
    }

    // Generate all 22 prompts
    const cardPrompts: CardPrompt[] = []
    for (let i = 0; i < 22; i++) {
      const cardNumber = i as CardNumber
      const prompt = this.generatePromptForCard(
        cardNumber,
        styleInputs.theme,
        styleInputs.tone,
        styleInputs.description
      )
      cardPrompts.push(prompt)
    }

    // Mock API usage
    const usage: ApiUsage = {
      model: model || GROK_MODELS.vision,
      promptTokens: 450, // Approximate for reference images + style + system prompt
      completionTokens: 2200, // ~100 tokens per card * 22
      totalTokens: 2650,
      estimatedCost: 0.0265, // Mock cost: $0.01 per 1K tokens
    }

    return {
      success: true,
      data: {
        cardPrompts,
        usage,
        requestId: `mock_req_${crypto.randomUUID()}`,
        generatedAt: new Date(),
        model: model || GROK_MODELS.vision,
      },
    }
  }

  /**
   * Validate generated prompts
   */
  async validatePrompts(
    input: ValidatePromptsInput
  ): Promise<ServiceResponse<ValidatePromptsOutput>> {
    await this.delay(200)

    const { prompts } = input
    const invalidPrompts: CardPrompt[] = []
    const errors: PromptValidationError[] = []

    // Check count
    if (prompts.length !== 22) {
      errors.push({
        code: PromptGenerationErrorCode.INCOMPLETE_RESPONSE,
        message: `Expected 22 prompts, received ${prompts.length}`,
      })
    }

    // Check for duplicates and missing cards
    const cardNumbers = new Set<number>()
    for (const prompt of prompts) {
      if (cardNumbers.has(prompt.cardNumber)) {
        errors.push({
          code: PromptGenerationErrorCode.DUPLICATE_CARD_NUMBER,
          message: `Card ${prompt.cardNumber} appears multiple times`,
          cardNumber: prompt.cardNumber,
          promptId: prompt.id,
        })
        invalidPrompts.push(prompt)
      }
      cardNumbers.add(prompt.cardNumber)

      // Check prompt length
      if (prompt.generatedPrompt.length < 50) {
        errors.push({
          code: PromptGenerationErrorCode.PROMPT_TOO_SHORT,
          message: `Prompt for ${prompt.cardName} is too short`,
          cardNumber: prompt.cardNumber,
          promptId: prompt.id,
        })
        invalidPrompts.push(prompt)
      } else if (prompt.generatedPrompt.length > 2000) {
        errors.push({
          code: PromptGenerationErrorCode.PROMPT_TOO_LONG,
          message: `Prompt for ${prompt.cardName} is too long`,
          cardNumber: prompt.cardNumber,
          promptId: prompt.id,
        })
        invalidPrompts.push(prompt)
      }
    }

    // Check for missing cards
    for (let i = 0; i < 22; i++) {
      if (!cardNumbers.has(i)) {
        errors.push({
          code: PromptGenerationErrorCode.MISSING_CARD_NUMBER,
          message: `Card ${i} (${MAJOR_ARCANA_NAMES[i]}) is missing`,
          cardNumber: i as CardNumber,
        })
      }
    }

    return {
      success: true,
      data: {
        isValid: errors.length === 0,
        invalidPrompts,
        errors,
      },
    }
  }

  /**
   * Regenerate a single prompt
   */
  async regeneratePrompt(
    input: RegeneratePromptInput
  ): Promise<ServiceResponse<RegeneratePromptOutput>> {
    await this.delay(2000) // Shorter delay for single card

    const { cardNumber, styleInputs } = input

    // Generate new prompt
    const prompt = this.generatePromptForCard(
      cardNumber,
      styleInputs.theme,
      styleInputs.tone,
      styleInputs.description
    )

    // Mock API usage for single prompt
    const usage: ApiUsage = {
      model: GROK_MODELS.vision,
      promptTokens: 450,
      completionTokens: 100,
      totalTokens: 550,
      estimatedCost: 0.0055,
    }

    return {
      success: true,
      data: {
        cardPrompt: prompt,
        usage,
        requestId: `mock_regen_${crypto.randomUUID()}`,
      },
    }
  }

  /**
   * Edit a generated prompt
   */
  async editPrompt(input: EditPromptInput): Promise<ServiceResponse<EditPromptOutput>> {
    await this.delay(100)

    const { promptId, editedPrompt } = input

    // In mock, we just create a new prompt with the edited text
    // Real implementation would update existing prompt
    const cardPrompt: CardPrompt = {
      id: promptId,
      cardNumber: 0 as CardNumber, // Would retrieve from storage
      cardName: 'The Fool', // Would retrieve from storage
      traditionalMeaning: MAJOR_ARCANA_MEANINGS[0], // Would retrieve from storage
      generatedPrompt: editedPrompt,
      confidence: 1.0, // Manual edit, so full confidence
      generatedAt: new Date(),
    }

    return {
      success: true,
      data: {
        cardPrompt,
        edited: true,
      },
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Estimate cost for prompt generation
   */
  async estimateCost(
    input: Omit<GeneratePromptsInput, 'onProgress'>
  ): Promise<ServiceResponse<ApiUsage>> {
    await this.delay(50)

    const { referenceImageUrls, styleInputs } = input

    // Validate inputs
    if (!referenceImageUrls || referenceImageUrls.length === 0) {
      return {
        success: false,
        error: {
          code: 'NO_REFERENCE_IMAGES',
          message: 'At least one reference image is required',
          retryable: false,
        },
      }
    }

    // Estimate token usage based on inputs
    const imageCount = referenceImageUrls.length
    const descriptionLength = styleInputs.description?.length || 0
    const conceptLength = styleInputs.concept?.length || 0
    const charactersLength = styleInputs.characters?.length || 0

    // Rough estimation: base prompt + image tokens + style input tokens
    const basePromptTokens = 500 // System prompt and instructions
    const imageTokens = imageCount * 500 // ~500 tokens per image
    const styleTokens = Math.ceil((descriptionLength + conceptLength + charactersLength) / 4) // ~4 chars per token
    const promptTokens = basePromptTokens + imageTokens + styleTokens

    // Expected output: 22 prompts with ~200 tokens each
    const completionTokens = 22 * 200

    const totalTokens = promptTokens + completionTokens

    // Cost calculation (based on Grok pricing from contract)
    const inputCost = promptTokens * 0.000002 // $0.002 per 1K tokens
    const outputCost = completionTokens * 0.000010 // $0.010 per 1K tokens
    const estimatedCost = inputCost + outputCost

    return {
      success: true,
      data: {
        promptTokens,
        completionTokens,
        totalTokens,
        estimatedCost,
        model: GROK_MODELS.vision,
      },
    }
  }

  /**
   * Generate a realistic prompt for a specific card
   */
  private generatePromptForCard(
    cardNumber: CardNumber,
    theme: string,
    tone: string,
    description: string
  ): CardPrompt {
    const cardName = MAJOR_ARCANA_NAMES[cardNumber]
    const cardMeaning = MAJOR_ARCANA_MEANINGS[cardNumber]

    // Create a prompt that incorporates the style inputs and card meaning
    const prompt = `Create a ${theme.toLowerCase()} style tarot card for "${cardName}" (Card ${cardNumber}) with a ${tone.toLowerCase()} tone. ${description} This card represents ${cardMeaning.toLowerCase()}. The composition should feature symbolic elements that capture the essence of ${cardMeaning}. Incorporate ${theme.toLowerCase()} artistic elements and maintain a ${tone.toLowerCase()} atmosphere throughout. Include traditional tarot symbolism while staying true to the ${theme} aesthetic. The card should evoke feelings of ${this.getEmotionalKeywords(cardMeaning)} and convey the concept of ${cardMeaning}. Focus on visual storytelling that immediately communicates the card's meaning through ${theme.toLowerCase()} imagery and ${tone.toLowerCase()} color palette.`

    return {
      id: crypto.randomUUID() as PromptId,
      cardNumber,
      cardName,
      traditionalMeaning: cardMeaning,
      generatedPrompt: prompt,
      confidence: 0.85 + Math.random() * 0.15, // 0.85-1.0
      generatedAt: new Date(),
    }
  }

  /**
   * Extract emotional keywords from card meaning
   */
  private getEmotionalKeywords(_meaning: string): string {
    // Simple keyword extraction for more varied prompts
    const keywords = [
      'wonder and curiosity',
      'mystery and wisdom',
      'power and transformation',
      'balance and harmony',
      'courage and determination',
      'introspection and guidance',
      'rebirth and renewal',
      'enlightenment and hope',
    ]

    // Return a random keyword set
    return keywords[Math.floor(Math.random() * keywords.length)] || 'mystery and wisdom'
  }

  /**
   * Simulate async delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

/**
 * Singleton instance for use throughout the application
 */
export const promptGenerationMockService = new PromptGenerationMockService()
