/**
 * @fileoverview PromptGeneration Mock Implementation
 * @purpose Mock implementation of IPromptGenerationService for testing and development
 * @dataFlow Simulates Grok vision API: Reference Images + Style → 22 Card Prompts
 * @boundary Mock Seam #3: PromptGenerationSeam - Generate AI prompts for Major Arcana cards
 *
 * This mock service provides realistic tarot card prompt generation without calling
 * the real Grok API. It handles all contract methods, error cases, and progress callbacks.
 *
 * @example
 * ```typescript
 * const service = new PromptGenerationMock()
 * const result = await service.generatePrompts({
 *   referenceImageUrls: ['https://...'],
 *   styleInputs: { theme: 'Cyberpunk', tone: 'Dark', ... }
 * })
 * // Returns 22 realistic card prompts
 * ```
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
  ApiUsage,
  GenerationProgress,
  PromptValidationError,
  PromptId,
  CardNumber,
  GrokModel,
} from '../../contracts/PromptGeneration'

import {
  PromptGenerationErrorCode,
  MAJOR_ARCANA_NAMES,
  MAJOR_ARCANA_MEANINGS,
  MAJOR_ARCANA_COUNT,
  GROK_MODELS,
} from '../../contracts/PromptGeneration'

import type { ServiceResponse } from '../../contracts/types/common'

/**
 * Mock implementation of PromptGeneration service
 *
 * Provides realistic simulation of Grok vision API for generating tarot card prompts.
 * All methods return properly typed ServiceResponse objects matching the contract.
 */
export class PromptGenerationMock implements IPromptGenerationService {
  // Store generated prompts by ID for editing
  private promptStore = new Map<PromptId, CardPrompt>()

  // Request ID counter for unique IDs
  private requestIdCounter = 1

  /**
   * Generate all 22 Major Arcana card prompts
   */
  async generatePrompts(
    input: GeneratePromptsInput
  ): Promise<ServiceResponse<GeneratePromptsOutput>> {
    // Validate input
    const validationError = this.validateInput(input)
    if (validationError) {
      return validationError
    }

    // Simulate progress updates
    if (input.onProgress) {
      await this.simulateProgress(input.onProgress)
    }

    // Generate all 22 prompts
    const cardPrompts = this.generateAllCardPrompts(input)

    // Store prompts for later editing
    cardPrompts.forEach(prompt => {
      this.promptStore.set(prompt.id, prompt)
    })

    // Calculate usage and cost
    const usage = this.calculateUsage(input, MAJOR_ARCANA_COUNT)

    // Generate response
    const model = input.model || GROK_MODELS.vision
    const requestId = this.generateRequestId()
    const generatedAt = new Date()

    const output: GeneratePromptsOutput = {
      cardPrompts,
      usage,
      requestId,
      generatedAt,
      model,
    }

    return {
      success: true,
      data: output,
    }
  }

  /**
   * Validate generated prompts
   */
  async validatePrompts(
    input: ValidatePromptsInput
  ): Promise<ServiceResponse<ValidatePromptsOutput>> {
    const errors: PromptValidationError[] = []
    const invalidPrompts: CardPrompt[] = []

    // Check count
    if (input.prompts.length !== MAJOR_ARCANA_COUNT) {
      errors.push({
        code: PromptGenerationErrorCode.INCOMPLETE_RESPONSE,
        message: `Expected ${MAJOR_ARCANA_COUNT} prompts, got ${input.prompts.length}`,
      })
    }

    // Check for all card numbers 0-21
    const cardNumbers = new Set(input.prompts.map(p => p.cardNumber))
    for (let i = 0; i < MAJOR_ARCANA_COUNT; i++) {
      if (!cardNumbers.has(i as CardNumber)) {
        errors.push({
          code: PromptGenerationErrorCode.MISSING_CARD_NUMBER,
          message: `Missing card number ${i}`,
          cardNumber: i as CardNumber,
        })
      }
    }

    // Check for duplicates
    const seenCards = new Set<number>()
    for (const prompt of input.prompts) {
      if (seenCards.has(prompt.cardNumber)) {
        errors.push({
          code: PromptGenerationErrorCode.DUPLICATE_CARD_NUMBER,
          message: `Duplicate card number ${prompt.cardNumber}`,
          cardNumber: prompt.cardNumber,
          promptId: prompt.id,
        })
        invalidPrompts.push(prompt)
      }
      seenCards.add(prompt.cardNumber)
    }

    // Validate each prompt
    for (const prompt of input.prompts) {
      // Check prompt length
      if (prompt.generatedPrompt.length < 10) {
        errors.push({
          code: PromptGenerationErrorCode.PROMPT_TOO_SHORT,
          message: `Prompt too short for card ${prompt.cardNumber}`,
          cardNumber: prompt.cardNumber,
          promptId: prompt.id,
        })
        if (!invalidPrompts.includes(prompt)) {
          invalidPrompts.push(prompt)
        }
      }

      if (prompt.generatedPrompt.length > 2000) {
        errors.push({
          code: PromptGenerationErrorCode.PROMPT_TOO_LONG,
          message: `Prompt too long for card ${prompt.cardNumber}`,
          cardNumber: prompt.cardNumber,
          promptId: prompt.id,
        })
        if (!invalidPrompts.includes(prompt)) {
          invalidPrompts.push(prompt)
        }
      }

      // Check confidence range
      if (prompt.confidence < 0 || prompt.confidence > 1) {
        errors.push({
          code: PromptGenerationErrorCode.INVALID_RESPONSE_FORMAT,
          message: `Invalid confidence score for card ${prompt.cardNumber}: ${prompt.confidence}`,
          cardNumber: prompt.cardNumber,
          promptId: prompt.id,
        })
        if (!invalidPrompts.includes(prompt)) {
          invalidPrompts.push(prompt)
        }
      }
    }

    const output: ValidatePromptsOutput = {
      isValid: errors.length === 0,
      invalidPrompts,
      errors,
    }

    return {
      success: true,
      data: output,
    }
  }

  /**
   * Regenerate a single card prompt
   */
  async regeneratePrompt(
    input: RegeneratePromptInput
  ): Promise<ServiceResponse<RegeneratePromptOutput>> {
    // Validate input
    const validationError = this.validateRegenerateInput(input)
    if (validationError) {
      return validationError
    }

    // Generate single card prompt
    const cardPrompt = this.generateSingleCardPrompt(
      input.cardNumber,
      input.styleInputs,
      input.previousPrompt,
      input.feedback
    )

    // Store the regenerated prompt
    this.promptStore.set(cardPrompt.id, cardPrompt)

    // Calculate usage for single prompt
    const usage = this.calculateUsage(
      {
        referenceImageUrls: input.referenceImageUrls,
        styleInputs: input.styleInputs,
      },
      1 // Single prompt
    )

    const output: RegeneratePromptOutput = {
      cardPrompt,
      usage,
      requestId: this.generateRequestId(),
    }

    return {
      success: true,
      data: output,
    }
  }

  /**
   * Edit a generated prompt manually
   */
  async editPrompt(
    input: EditPromptInput
  ): Promise<ServiceResponse<EditPromptOutput>> {
    // Validate edited prompt length
    if (input.editedPrompt.length < 3) {
      return {
        success: false,
        error: {
          code: PromptGenerationErrorCode.PROMPT_TOO_SHORT,
          message: 'Edited prompt is too short (minimum 3 characters)',
          retryable: false,
        },
      }
    }

    if (input.editedPrompt.length > 10000) {
      return {
        success: false,
        error: {
          code: PromptGenerationErrorCode.PROMPT_TOO_LONG,
          message: 'Edited prompt exceeds maximum length (10000 characters)',
          retryable: false,
        },
      }
    }

    // Get existing prompt from store
    const existingPrompt = this.promptStore.get(input.promptId)

    // Create updated prompt (or create new one if not found)
    const cardPrompt: CardPrompt = existingPrompt
      ? {
          ...existingPrompt,
          generatedPrompt: `[User edited] ${input.editedPrompt}`,
          generatedAt: new Date(),
        }
      : {
          id: input.promptId,
          cardNumber: 0 as CardNumber,
          cardName: MAJOR_ARCANA_NAMES[0],
          traditionalMeaning: MAJOR_ARCANA_MEANINGS[0],
          generatedPrompt: `[User edited] ${input.editedPrompt}`,
          confidence: 1.0,
          generatedAt: new Date(),
        }

    // Update store
    this.promptStore.set(input.promptId, cardPrompt)

    const output: EditPromptOutput = {
      cardPrompt,
      edited: true,
    }

    return {
      success: true,
      data: output,
    }
  }

  /**
   * Estimate cost for prompt generation
   */
  async estimateCost(
    input: Omit<GeneratePromptsInput, 'onProgress'>
  ): Promise<ServiceResponse<ApiUsage>> {
    // Validate input
    const validationError = this.validateInput(input)
    if (validationError) {
      return validationError as ServiceResponse<ApiUsage>
    }

    // Calculate estimated usage
    const usage = this.calculateUsage(input, MAJOR_ARCANA_COUNT)

    return {
      success: true,
      data: usage,
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Validate input for generatePrompts and estimateCost
   */
  private validateInput(
    input: Omit<GeneratePromptsInput, 'onProgress'>
  ): ServiceResponse<never> | null {
    // Check reference images
    if (!input.referenceImageUrls || input.referenceImageUrls.length === 0) {
      return {
        success: false,
        error: {
          code: PromptGenerationErrorCode.NO_REFERENCE_IMAGES,
          message: 'No reference images provided',
          retryable: false,
        },
      }
    }

    // Validate URLs
    for (const url of input.referenceImageUrls) {
      if (!this.isValidUrl(url)) {
        return {
          success: false,
          error: {
            code: PromptGenerationErrorCode.INVALID_REFERENCE_URL,
            message: `Invalid reference image URL: ${url}`,
            retryable: false,
          },
        }
      }
    }

    // Validate style inputs
    if (!this.isValidStyleInputs(input.styleInputs)) {
      return {
        success: false,
        error: {
          code: PromptGenerationErrorCode.INVALID_STYLE_INPUTS,
          message: 'Style inputs are invalid or incomplete',
          retryable: false,
        },
      }
    }

    // Validate model if provided
    if (input.model && !this.isValidModel(input.model)) {
      return {
        success: false,
        error: {
          code: PromptGenerationErrorCode.INVALID_MODEL,
          message: `Invalid model: ${input.model}`,
          retryable: false,
        },
      }
    }

    return null
  }

  /**
   * Validate input for regeneratePrompt
   */
  private validateRegenerateInput(
    input: RegeneratePromptInput
  ): ServiceResponse<never> | null {
    // Check reference images
    if (!input.referenceImageUrls || input.referenceImageUrls.length === 0) {
      return {
        success: false,
        error: {
          code: PromptGenerationErrorCode.NO_REFERENCE_IMAGES,
          message: 'No reference images provided',
          retryable: false,
        },
      }
    }

    // Validate style inputs
    if (!this.isValidStyleInputs(input.styleInputs)) {
      return {
        success: false,
        error: {
          code: PromptGenerationErrorCode.INVALID_STYLE_INPUTS,
          message: 'Style inputs are invalid or incomplete',
          retryable: false,
        },
      }
    }

    return null
  }

  /**
   * Check if URL is valid
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  /**
   * Check if style inputs are valid
   */
  private isValidStyleInputs(styleInputs: unknown): boolean {
    return (
      typeof styleInputs === 'object' &&
      styleInputs !== null &&
      'theme' in styleInputs &&
      typeof styleInputs.theme === 'string' &&
      styleInputs.theme.length > 0 &&
      'tone' in styleInputs &&
      typeof styleInputs.tone === 'string' &&
      styleInputs.tone.length > 0 &&
      'description' in styleInputs &&
      typeof styleInputs.description === 'string' &&
      styleInputs.description.length > 0
    )
  }

  /**
   * Check if model is valid
   */
  private isValidModel(model: string): boolean {
    return Object.values(GROK_MODELS).includes(model as GrokModel)
  }

  /**
   * Generate all 22 card prompts
   */
  private generateAllCardPrompts(input: GeneratePromptsInput): CardPrompt[] {
    const prompts: CardPrompt[] = []

    for (let i = 0; i < MAJOR_ARCANA_COUNT; i++) {
      const cardNumber = i as CardNumber
      prompts.push(this.generateSingleCardPrompt(cardNumber, input.styleInputs))
    }

    return prompts
  }

  /**
   * Generate a single card prompt
   */
  private generateSingleCardPrompt(
    cardNumber: CardNumber,
    styleInputs: unknown,
    previousPrompt?: string,
    feedback?: string
  ): CardPrompt {
    const cardName = MAJOR_ARCANA_NAMES[cardNumber]
    const traditionalMeaning = MAJOR_ARCANA_MEANINGS[cardNumber]

    // Generate realistic prompt incorporating style
    let generatedPrompt = this.craftPrompt(
      cardNumber,
      cardName,
      traditionalMeaning,
      styleInputs,
      feedback
    )

    // If regenerating with feedback, modify the prompt
    if (previousPrompt && feedback) {
      generatedPrompt = `${generatedPrompt}. Enhanced with: ${feedback}`
    }

    return {
      id: this.generatePromptId(cardNumber),
      cardNumber,
      cardName,
      traditionalMeaning,
      generatedPrompt,
      confidence: this.generateConfidence(),
      generatedAt: new Date(),
    }
  }

  /**
   * Craft a realistic prompt for a card
   */
  private craftPrompt(
    cardNumber: CardNumber,
    cardName: string,
    traditionalMeaning: string,
    styleInputs: unknown,
    feedback?: string
  ): string {
    // Type guard ensures styleInputs is valid before accessing properties
    if (!this.isValidStyleInputs(styleInputs)) {
      throw new Error('Invalid style inputs')
    }
    const { theme, tone, description, concept, characters } = styleInputs as { theme: string; tone: string; description: string; concept?: string; characters?: string }

    // Build prompt with style elements
    const parts = [
      `A tarot card illustration for ${cardName} (Card ${cardNumber})`,
      `embodying ${traditionalMeaning}`,
      `Style: ${theme} with ${tone} tone`,
      description,
    ]

    if (concept) {
      parts.push(`Central concept: ${concept}`)
    }

    if (characters) {
      parts.push(`Featuring: ${characters}`)
    }

    // Add card-specific symbolism
    const symbols = this.getCardSymbols(cardNumber)
    if (symbols) {
      parts.push(`Symbolic elements: ${symbols}`)
    }

    // Apply feedback if regenerating
    if (feedback) {
      parts.push(`Special consideration: ${feedback}`)
    }

    return parts.join('. ')
  }

  /**
   * Get symbolic elements for each card
   */
  private getCardSymbols(cardNumber: CardNumber): string {
    const symbols: Record<CardNumber, string> = {
      0: 'cliff edge, white dog, beggar\'s bundle, white rose',
      1: 'infinity symbol, wand raised, altar with tools',
      2: 'moon at feet, pillars, pomegranates, veil',
      3: 'wheat field, Venus symbol, flowing robes, crown of stars',
      4: 'throne with rams, orb and scepter, mountains',
      5: 'papal crown, crossed keys, two acolytes, pillars',
      6: 'angel Raphael, tree of knowledge, tree of life, serpent',
      7: 'starry canopy, sphinxes, armor, wand',
      8: 'lion, infinity symbol, gentle hand, flowers',
      9: 'lantern with star, mountain peak, staff, robes',
      10: 'wheel with symbols, sphinx, snake, Anubis, clouds',
      11: 'scales, sword, throne, pillars, crown',
      12: 'upside-down figure, tree, halo, peaceful expression',
      13: 'skeleton, black armor, white rose, sunrise',
      14: 'angel, water flowing, cups, sun crown, triangle',
      15: 'horned figure, chains, inverted pentagram, torch',
      16: 'crumbling tower, lightning, falling figures, crown',
      17: 'woman pouring water, eight stars, ibis, pool',
      18: 'moon faces, two towers, path, dog and wolf, crayfish',
      19: 'sun with face, sunflowers, child on horse, wall',
      20: 'angel Gabriel, trumpet, rising figures, cross, mountains',
      21: 'dancing figure, wreath, four corners, infinity ribbon',
    }

    return symbols[cardNumber] || 'traditional tarot imagery'
  }

  /**
   * Generate a unique prompt ID
   */
  private generatePromptId(cardNumber: CardNumber): PromptId {
    return `prompt-${cardNumber}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` as PromptId
  }

  /**
   * Generate a unique request ID
   */
  private generateRequestId(): string {
    return `grok-req-${this.requestIdCounter++}-${Date.now()}`
  }

  /**
   * Generate realistic confidence score
   */
  private generateConfidence(): number {
    // Generate scores between 0.75 and 0.95 (realistic AI confidence)
    return 0.75 + Math.random() * 0.2
  }

  /**
   * Calculate API usage and cost
   */
  private calculateUsage(
    input: Omit<GeneratePromptsInput, 'onProgress'>,
    promptCount: number
  ): ApiUsage {
    const model = input.model || GROK_MODELS.vision

    // Estimate tokens based on input
    const imageCount = input.referenceImageUrls.length
    const styleLength = JSON.stringify(input.styleInputs).length

    // Rough estimation (vision models use more tokens for images)
    const promptTokens = 1000 + (imageCount * 500) + Math.floor(styleLength / 4)

    // Each card prompt is roughly 100-200 tokens
    const completionTokens = promptCount * 150

    const totalTokens = promptTokens + completionTokens

    // Mock Grok pricing (approximate)
    // Vision model: ~$0.01 per 1K tokens
    const estimatedCost = (totalTokens / 1000) * 0.01

    return {
      promptTokens,
      completionTokens,
      totalTokens,
      estimatedCost,
      model,
    }
  }

  /**
   * Simulate progress updates during generation
   */
  private async simulateProgress(
    onProgress: (progress: GenerationProgress) => void
  ): Promise<void> {
    const steps: Array<{ step: GenerationProgress['currentStep']; status: string; progress: number; delay: number }> = [
      { step: 'uploading', status: 'Uploading reference images...', progress: 10, delay: 200 },
      { step: 'uploading', status: 'Processing images...', progress: 25, delay: 300 },
      { step: 'analyzing', status: 'Analyzing style and theme...', progress: 40, delay: 400 },
      { step: 'analyzing', status: 'Understanding tarot symbolism...', progress: 55, delay: 300 },
      { step: 'generating', status: 'Generating prompts for cards 0-10...', progress: 70, delay: 500 },
      { step: 'generating', status: 'Generating prompts for cards 11-21...', progress: 85, delay: 500 },
      { step: 'validating', status: 'Validating generated prompts...', progress: 95, delay: 200 },
      { step: 'complete', status: 'Generation complete!', progress: 100, delay: 100 },
    ]

    for (const step of steps) {
      onProgress({
        status: step.status,
        progress: step.progress,
        currentStep: step.step,
      })
      await this.delay(step.delay)
    }
  }

  /**
   * Delay helper for async simulation
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
