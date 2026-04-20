/**
 * @fileoverview Mock implementation of IPromptGenerationService
 * @purpose Provide realistic mock behavior for AI prompt generation
 * @boundary Seam #3: PromptGenerationSeam
 * @contract contracts/PromptGeneration.ts
 */

import type { ServiceResponse } from '$contracts/types/common'
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
  CardNumber,
  PromptId,
} from '$contracts/PromptGeneration'
import {
  PromptGenerationErrorCode,
  MAJOR_ARCANA_NAMES,
  MAJOR_ARCANA_MEANINGS,
  MAJOR_ARCANA_COUNT,
  GROK_MODELS,
} from '$contracts/PromptGeneration'

/**
 * Mock implementation of IPromptGenerationService
 * Generates realistic prompts for all 22 Major Arcana cards
 */
export class PromptGenerationMockService implements IPromptGenerationService {
  private generatedPrompts: Map<PromptId, CardPrompt> = new Map()

  /**
   * Generate a unique PromptId
   */
  private generateId(): PromptId {
    return crypto.randomUUID() as PromptId
  }

  /**
   * Simulate async delay
   */
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Generate a realistic prompt for a single card
   */
  private generateCardPrompt(
    cardNumber: CardNumber,
    theme: string,
    tone: string,
    description: string
  ): CardPrompt {
    const cardName = MAJOR_ARCANA_NAMES[cardNumber]
    const meaning = MAJOR_ARCANA_MEANINGS[cardNumber]

    const prompt = `A ${tone.toLowerCase()} ${theme.toLowerCase()} tarot card illustration of "${cardName}". ${description} The imagery should embody the themes of ${meaning.toLowerCase()}. Highly detailed, dramatic lighting, symbolic elements prominently featured.`

    return {
      id: this.generateId(),
      cardNumber,
      cardName,
      traditionalMeaning: meaning,
      generatedPrompt: prompt,
      confidence: 0.85 + Math.random() * 0.14, // 0.85-0.99
      generatedAt: new Date(),
    }
  }

  async generatePrompts(
    input: GeneratePromptsInput
  ): Promise<ServiceResponse<GeneratePromptsOutput>> {
    const { referenceImageUrls, styleInputs, model, onProgress } = input

    // Validate input
    if (!referenceImageUrls || referenceImageUrls.length === 0) {
      return {
        success: false,
        error: {
          code: PromptGenerationErrorCode.NO_REFERENCE_IMAGES,
          message: 'No reference images provided',
          retryable: false,
        },
      }
    }

    // Validate each reference image URL is a valid URL
    const invalidUrls = referenceImageUrls.filter(url => {
      try {
        new URL(url)
        return false
      } catch {
        return true
      }
    })
    if (invalidUrls.length > 0) {
      return {
        success: false,
        error: {
          code: PromptGenerationErrorCode.INVALID_REFERENCE_URL,
          message: `Invalid reference image URL(s): ${invalidUrls.join(', ')}`,
          retryable: false,
        },
      }
    }

    // Validate model if provided
    if (model !== undefined && !Object.values(GROK_MODELS).includes(model)) {
      return {
        success: false,
        error: {
          code: PromptGenerationErrorCode.INVALID_MODEL,
          message: `Invalid model: "${model}". Supported models: ${Object.values(GROK_MODELS).join(', ')}`,
          retryable: false,
        },
      }
    }

    if (!styleInputs.theme || !styleInputs.tone || !styleInputs.description) {
      return {
        success: false,
        error: {
          code: PromptGenerationErrorCode.INVALID_STYLE_INPUTS,
          message: 'Missing required style inputs',
          retryable: false,
        },
      }
    }

    const cardPrompts: CardPrompt[] = []

    // Simulate progressive generation
    for (let i = 0; i < MAJOR_ARCANA_COUNT; i++) {
      // Update progress
      if (onProgress) {
        const progress: GenerationProgress = {
          status: `Generating prompt for ${MAJOR_ARCANA_NAMES[i]}...`,
          progress: Math.round((i / MAJOR_ARCANA_COUNT) * 100),
          currentStep: i < MAJOR_ARCANA_COUNT - 1 ? 'generating' : 'validating',
        }
        onProgress(progress)
      }

      await this.delay(100) // Simulate per-card delay

      const prompt = this.generateCardPrompt(
        i as CardNumber,
        styleInputs.theme,
        styleInputs.tone,
        styleInputs.description
      )

      cardPrompts.push(prompt)
      this.generatedPrompts.set(prompt.id, prompt)
    }

    // Final progress update
    if (onProgress) {
      onProgress({
        status: 'Complete',
        progress: 100,
        currentStep: 'complete',
      })
    }

    const usage: ApiUsage = {
      promptTokens: 2500,
      completionTokens: 4500,
      totalTokens: 7000,
      estimatedCost: 0.035,
      model: GROK_MODELS.vision,
    }

    return {
      success: true,
      data: {
        cardPrompts,
        usage,
        requestId: crypto.randomUUID(),
        generatedAt: new Date(),
        model: GROK_MODELS.vision,
      },
    }
  }

  async validatePrompts(
    input: ValidatePromptsInput
  ): Promise<ServiceResponse<ValidatePromptsOutput>> {
    await this.delay(100)

    const { prompts } = input
    const invalidPrompts: CardPrompt[] = []
    const errors: PromptValidationError[] = []

    // Check for 22 prompts
    if (prompts.length !== MAJOR_ARCANA_COUNT) {
      errors.push({
        code: PromptGenerationErrorCode.INCOMPLETE_RESPONSE,
        message: `Expected ${MAJOR_ARCANA_COUNT} prompts, got ${prompts.length}`,
      })
    }

    // Check for all card numbers present
    const cardNumbers = new Set(prompts.map(p => p.cardNumber))
    for (let i = 0; i < MAJOR_ARCANA_COUNT; i++) {
      if (!cardNumbers.has(i as CardNumber)) {
        errors.push({
          code: PromptGenerationErrorCode.MISSING_CARD_NUMBER,
          message: `Missing card number ${i}`,
          cardNumber: i as CardNumber,
        })
      }
    }

    // Check for duplicates (same card number appearing multiple times)
    if (cardNumbers.size !== prompts.length) {
      errors.push({
        code: PromptGenerationErrorCode.DUPLICATE_CARD_NUMBER,
        message: 'Duplicate card numbers detected',
      })
    }

    // Check for prompts that conflict with service-stored prompts
    // (same cardNumber but different ID indicates an unrecognized/duplicate prompt)
    if (this.generatedPrompts.size > 0) {
      for (const prompt of prompts) {
        for (const [storedId, storedPrompt] of this.generatedPrompts.entries()) {
          if (storedPrompt.cardNumber === prompt.cardNumber && storedId !== prompt.id) {
            errors.push({
              code: PromptGenerationErrorCode.DUPLICATE_CARD_NUMBER,
              message: `Card number ${prompt.cardNumber} conflicts with existing prompt`,
              cardNumber: prompt.cardNumber,
              promptId: prompt.id,
            })
            if (!invalidPrompts.includes(prompt)) {
              invalidPrompts.push(prompt)
            }
            break
          }
        }
      }
    }

    // Check prompt lengths and confidence
    for (const prompt of prompts) {
      if (prompt.generatedPrompt.length < 20) {
        errors.push({
          code: PromptGenerationErrorCode.PROMPT_TOO_SHORT,
          message: `Prompt for card ${prompt.cardNumber} is too short`,
          cardNumber: prompt.cardNumber,
          promptId: prompt.id,
        })
        invalidPrompts.push(prompt)
      }
      if (prompt.generatedPrompt.length > 2000) {
        errors.push({
          code: PromptGenerationErrorCode.PROMPT_TOO_LONG,
          message: `Prompt for card ${prompt.cardNumber} is too long`,
          cardNumber: prompt.cardNumber,
          promptId: prompt.id,
        })
        invalidPrompts.push(prompt)
      }
      // Check confidence range (must be 0-1)
      if (prompt.confidence < 0 || prompt.confidence > 1) {
        errors.push({
          code: PromptGenerationErrorCode.PROMPT_TOO_SHORT, // Closest available code for invalid metadata
          message: `Prompt for card ${prompt.cardNumber} has confidence out of range: ${prompt.confidence}`,
          cardNumber: prompt.cardNumber,
          promptId: prompt.id,
        })
        if (!invalidPrompts.includes(prompt)) {
          invalidPrompts.push(prompt)
        }
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

  async regeneratePrompt(
    input: RegeneratePromptInput
  ): Promise<ServiceResponse<RegeneratePromptOutput>> {
    await this.delay(50)

    const { cardNumber, referenceImageUrls, styleInputs, feedback } = input

    if (!referenceImageUrls || referenceImageUrls.length === 0) {
      return {
        success: false,
        error: {
          code: PromptGenerationErrorCode.NO_REFERENCE_IMAGES,
          message: 'No reference images provided',
          retryable: false,
        },
      }
    }

    if (!styleInputs.theme || !styleInputs.tone || !styleInputs.description) {
      return {
        success: false,
        error: {
          code: PromptGenerationErrorCode.INVALID_STYLE_INPUTS,
          message: 'Missing required style inputs',
          retryable: false,
        },
      }
    }

    // Generate new prompt, incorporating feedback if provided
    let prompt = this.generateCardPrompt(
      cardNumber,
      styleInputs.theme,
      styleInputs.tone,
      styleInputs.description
    )

    // If feedback was provided, append it to the prompt
    if (feedback) {
      prompt = {
        ...prompt,
        generatedPrompt: `${prompt.generatedPrompt} Additional direction: ${feedback}`,
      }
    }

    this.generatedPrompts.set(prompt.id, prompt)

    const usage: ApiUsage = {
      promptTokens: 150,
      completionTokens: 250,
      totalTokens: 400,
      estimatedCost: 0.002,
      model: GROK_MODELS.vision,
    }

    return {
      success: true,
      data: {
        cardPrompt: prompt,
        usage,
        requestId: crypto.randomUUID(),
      },
    }
  }

  async editPrompt(input: EditPromptInput): Promise<ServiceResponse<EditPromptOutput>> {
    await this.delay(50)

    const { promptId, editedPrompt } = input
    const existingPrompt = this.generatedPrompts.get(promptId)

    if (!existingPrompt) {
      return {
        success: false,
        error: {
          code: PromptGenerationErrorCode.INVALID_RESPONSE_FORMAT,
          message: 'Prompt not found',
          retryable: false,
        },
      }
    }

    const updatedPrompt: CardPrompt = {
      ...existingPrompt,
      generatedPrompt: `[edited] ${editedPrompt}`,
      generatedAt: new Date(),
    }

    this.generatedPrompts.set(promptId, updatedPrompt)

    return {
      success: true,
      data: {
        cardPrompt: updatedPrompt,
        edited: true,
      },
    }
  }

  async estimateCost(
    input: Omit<GeneratePromptsInput, 'onProgress'>
  ): Promise<ServiceResponse<ApiUsage>> {
    await this.delay(50)

    const { referenceImageUrls, styleInputs } = input

    // Validate input
    if (!referenceImageUrls || referenceImageUrls.length === 0) {
      return {
        success: false,
        error: {
          code: PromptGenerationErrorCode.NO_REFERENCE_IMAGES,
          message: 'No reference images provided',
          retryable: false,
        },
      }
    }

    if (!styleInputs.theme || !styleInputs.tone || !styleInputs.description) {
      return {
        success: false,
        error: {
          code: PromptGenerationErrorCode.INVALID_STYLE_INPUTS,
          message: 'Missing required style inputs',
          retryable: false,
        },
      }
    }

    // Estimate based on number of images
    const imageCount = referenceImageUrls.length
    const estimatedInputTokens = 500 + imageCount * 500
    const estimatedOutputTokens = MAJOR_ARCANA_COUNT * 200

    const usage: ApiUsage = {
      promptTokens: estimatedInputTokens,
      completionTokens: estimatedOutputTokens,
      totalTokens: estimatedInputTokens + estimatedOutputTokens,
      estimatedCost: estimatedInputTokens * 0.000002 + estimatedOutputTokens * 0.00001,
      model: GROK_MODELS.vision,
    }

    return {
      success: true,
      data: usage,
    }
  }
}
