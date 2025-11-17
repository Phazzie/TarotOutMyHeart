/**
 * @fileoverview Real implementation of Prompt Generation service using Grok Vision API
 * @purpose Generate tarot card prompts using Grok's vision capabilities to analyze reference images
 * @dataFlow Reference Images + Style → Grok Vision API → 22 Card Prompts
 * @boundary Implements PromptGenerationSeam (Seam #3) - Application → Grok API
 * @dependencies OpenAI SDK (Grok-compatible), contracts/PromptGeneration.ts
 * @updated 2025-11-17
 *
 * @example
 * ```typescript
 * const service = new PromptGenerationService()
 * const result = await service.generatePrompts({
 *   referenceImageUrls: ['https://blob.vercel-storage.com/...'],
 *   styleInputs: { theme: 'Cyberpunk', tone: 'Dark', ... }
 * })
 *
 * if (result.success) {
 *   console.log(`Generated ${result.data.cardPrompts.length} prompts`)
 *   console.log(`Cost: $${result.data.usage.estimatedCost}`)
 * }
 * ```
 */

import OpenAI from 'openai'
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
  GrokModel,
} from '$contracts/PromptGeneration'

import {
  MAJOR_ARCANA_NAMES,
  MAJOR_ARCANA_MEANINGS,
  MAJOR_ARCANA_COUNT,
  GROK_MODELS,
  API_TIMEOUT,
  PromptGenerationErrorCode,
  PROMPT_GENERATION_ERROR_MESSAGES,
} from '$contracts/PromptGeneration'

import type { ServiceResponse } from '$contracts/types/common'

/**
 * Configuration for Grok API
 */
interface GrokConfig {
  apiKey: string
  baseURL: string
  timeout: number
  maxRetries: number
  retryDelay: number
}

/**
 * Retry configuration for exponential backoff
 */
interface RetryConfig {
  attempt: number
  maxAttempts: number
  delay: number
}

/**
 * Real implementation of Prompt Generation using Grok Vision API
 *
 * Uses OpenAI SDK with Grok's API endpoint for vision-enabled text generation.
 * Analyzes reference images and style inputs to generate cohesive prompts
 * for all 22 Major Arcana cards.
 */
export class PromptGenerationService implements IPromptGenerationService {
  private client: OpenAI
  private config: GrokConfig

  constructor() {
    // Get API key from environment
    const apiKey = process.env['XAI_API_KEY'] || ''

    if (!apiKey) {
      console.warn('[PromptGeneration] XAI_API_KEY not configured - service will fail at runtime')
    }

    this.config = {
      apiKey,
      baseURL: 'https://api.x.ai/v1',
      timeout: API_TIMEOUT.promptGeneration,
      maxRetries: API_TIMEOUT.maxRetries,
      retryDelay: API_TIMEOUT.retryDelay,
    }

    // Initialize OpenAI client with Grok configuration
    this.client = new OpenAI({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
    })
  }

  /**
   * Generate all 22 Major Arcana card prompts
   *
   * Workflow:
   * 1. Validate inputs (reference images, style parameters)
   * 2. Build prompt with reference images and style context
   * 3. Call Grok Vision API with retry logic
   * 4. Parse and validate response
   * 5. Return 22 CardPrompt objects with usage data
   */
  async generatePrompts(
    input: GeneratePromptsInput
  ): Promise<ServiceResponse<GeneratePromptsOutput>> {
    const { referenceImageUrls, styleInputs, model, temperature, onProgress } = input

    // Validate API key
    if (!this.config.apiKey) {
      return {
        success: false,
        error: {
          code: PromptGenerationErrorCode.API_KEY_MISSING,
          message: PROMPT_GENERATION_ERROR_MESSAGES[PromptGenerationErrorCode.API_KEY_MISSING],
          retryable: false,
        },
      }
    }

    // Validate inputs
    if (!referenceImageUrls || referenceImageUrls.length === 0) {
      return {
        success: false,
        error: {
          code: PromptGenerationErrorCode.NO_REFERENCE_IMAGES,
          message: PROMPT_GENERATION_ERROR_MESSAGES[PromptGenerationErrorCode.NO_REFERENCE_IMAGES],
          retryable: false,
        },
      }
    }

    // Validate reference image URLs
    for (const url of referenceImageUrls) {
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

    // Validate model
    const selectedModel = model || GROK_MODELS.reasoning
    if (!Object.values(GROK_MODELS).includes(selectedModel)) {
      return {
        success: false,
        error: {
          code: PromptGenerationErrorCode.INVALID_MODEL,
          message: PROMPT_GENERATION_ERROR_MESSAGES[PromptGenerationErrorCode.INVALID_MODEL],
          retryable: false,
        },
      }
    }

    try {
      // Report initial progress
      if (onProgress) {
        onProgress({
          progress: 0,
          status: 'Analyzing reference images...',
          currentStep: 'analyzing',
        })
      }

      // Build system prompt for Grok
      const systemPrompt = this.buildSystemPrompt(styleInputs)

      // Build user prompt with card requirements
      const userPrompt = this.buildUserPrompt(styleInputs)

      // Build message content with images
      const messageContent = [
        { type: 'text' as const, text: userPrompt },
        ...referenceImageUrls.map((url) => ({
          type: 'image_url' as const,
          image_url: { url },
        })),
      ]

      if (onProgress) {
        onProgress({
          progress: 25,
          status: 'Generating prompts...',
          currentStep: 'generating',
        })
      }

      // Call Grok API with retry logic
      const result = await this.callGrokWithRetry(
        {
          model: selectedModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: messageContent },
          ],
          temperature: temperature ?? 0.8,
          max_tokens: 4000, // Enough for 22 prompts (~150 tokens each)
        },
        { attempt: 1, maxAttempts: this.config.maxRetries, delay: this.config.retryDelay }
      )

      if (!result.success) {
        return {
          success: false,
          error: result.error,
        }
      }

      const completion = result.data!

      if (onProgress) {
        onProgress({
          progress: 75,
          status: 'Parsing response...',
          currentStep: 'validating',
        })
      }

      // Parse response
      const parseResult = this.parseGrokResponse(completion.choices[0]?.message?.content || '')
      if (!parseResult.success) {
        return {
          success: false,
          error: parseResult.error,
        }
      }

      const cardPrompts = parseResult.data!

      // Validate we got all 22 prompts
      if (cardPrompts.length !== MAJOR_ARCANA_COUNT) {
        return {
          success: false,
          error: {
            code: PromptGenerationErrorCode.INCOMPLETE_RESPONSE,
            message: `Expected ${MAJOR_ARCANA_COUNT} prompts, received ${cardPrompts.length}`,
            retryable: true,
          },
        }
      }

      if (onProgress) {
        onProgress({
          progress: 100,
          status: 'Complete!',
          currentStep: 'complete',
        })
      }

      // Calculate usage and cost
      const usage: ApiUsage = {
        model: selectedModel,
        promptTokens: completion.usage?.prompt_tokens || 0,
        completionTokens: completion.usage?.completion_tokens || 0,
        totalTokens: completion.usage?.total_tokens || 0,
        estimatedCost: this.calculateCost(
          completion.usage?.prompt_tokens || 0,
          completion.usage?.completion_tokens || 0
        ),
      }

      return {
        success: true,
        data: {
          cardPrompts,
          usage,
          requestId: completion.id || `grok_${crypto.randomUUID()}`,
          generatedAt: new Date(),
          model: selectedModel,
        },
      }
    } catch (error) {
      return this.handleError(error)
    }
  }

  /**
   * Validate generated prompts
   *
   * Checks:
   * - Exactly 22 prompts
   * - All card numbers 0-21 present
   * - No duplicate card numbers
   * - All prompts have reasonable length (50-2000 chars)
   * - All required fields present
   */
  async validatePrompts(
    input: ValidatePromptsInput
  ): Promise<ServiceResponse<ValidatePromptsOutput>> {
    const { prompts } = input
    const invalidPrompts: CardPrompt[] = []
    const errors: PromptValidationError[] = []

    // Check count
    if (prompts.length !== MAJOR_ARCANA_COUNT) {
      errors.push({
        code: PromptGenerationErrorCode.INCOMPLETE_RESPONSE,
        message: `Expected ${MAJOR_ARCANA_COUNT} prompts, received ${prompts.length}`,
      })
    }

    // Check for duplicates and validate each prompt
    const cardNumbers = new Set<number>()
    for (const prompt of prompts) {
      // Check for duplicates
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

      // Validate prompt length
      if (prompt.generatedPrompt.length < 50) {
        errors.push({
          code: PromptGenerationErrorCode.PROMPT_TOO_SHORT,
          message: `Prompt for ${prompt.cardName} is too short (${prompt.generatedPrompt.length} chars)`,
          cardNumber: prompt.cardNumber,
          promptId: prompt.id,
        })
        invalidPrompts.push(prompt)
      } else if (prompt.generatedPrompt.length > 2000) {
        errors.push({
          code: PromptGenerationErrorCode.PROMPT_TOO_LONG,
          message: `Prompt for ${prompt.cardName} is too long (${prompt.generatedPrompt.length} chars)`,
          cardNumber: prompt.cardNumber,
          promptId: prompt.id,
        })
        invalidPrompts.push(prompt)
      }
    }

    // Check for missing cards
    for (let i = 0; i < MAJOR_ARCANA_COUNT; i++) {
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
   * Regenerate a single card prompt
   *
   * Useful when user is unsatisfied with a specific prompt.
   * Includes previous prompt and feedback for context.
   */
  async regeneratePrompt(
    input: RegeneratePromptInput
  ): Promise<ServiceResponse<RegeneratePromptOutput>> {
    const { cardNumber, referenceImageUrls, styleInputs, previousPrompt, feedback } = input

    // Validate API key
    if (!this.config.apiKey) {
      return {
        success: false,
        error: {
          code: PromptGenerationErrorCode.API_KEY_MISSING,
          message: PROMPT_GENERATION_ERROR_MESSAGES[PromptGenerationErrorCode.API_KEY_MISSING],
          retryable: false,
        },
      }
    }

    try {
      const cardName = MAJOR_ARCANA_NAMES[cardNumber]
      const meaning = MAJOR_ARCANA_MEANINGS[cardNumber]

      // Build regeneration prompt
      let userPrompt = `Generate a new image generation prompt for the tarot card "${cardName}" (Card ${cardNumber}).\n\n`
      userPrompt += `Traditional meaning: ${meaning}\n\n`
      userPrompt += `Style: ${styleInputs.theme} with ${styleInputs.tone} tone\n`
      userPrompt += `Description: ${styleInputs.description}\n\n`

      if (previousPrompt) {
        userPrompt += `Previous prompt:\n${previousPrompt}\n\n`
      }

      if (feedback) {
        userPrompt += `User feedback: ${feedback}\n\n`
      }

      userPrompt += 'Generate a single, detailed image generation prompt that captures this card\'s essence.'

      // Build message content with images
      const messageContent = [
        { type: 'text' as const, text: userPrompt },
        ...referenceImageUrls.map((url) => ({
          type: 'image_url' as const,
          image_url: { url },
        })),
      ]

      // Call Grok API
      const result = await this.callGrokWithRetry(
        {
          model: GROK_MODELS.reasoning,
          messages: [
            {
              role: 'system',
              content: 'You are an expert at creating image generation prompts for tarot cards.',
            },
            { role: 'user', content: messageContent },
          ],
          temperature: 0.9, // Higher temperature for more variation
          max_tokens: 300,
        },
        { attempt: 1, maxAttempts: this.config.maxRetries, delay: this.config.retryDelay }
      )

      if (!result.success) {
        return {
          success: false,
          error: result.error,
        }
      }

      const completion = result.data!
      const generatedPrompt = completion.choices[0]?.message?.content?.trim() || ''

      if (!generatedPrompt || generatedPrompt.length < 50) {
        return {
          success: false,
          error: {
            code: PromptGenerationErrorCode.PROMPT_TOO_SHORT,
            message: 'Generated prompt is too short',
            retryable: true,
          },
        }
      }

      // Create CardPrompt object
      const cardPrompt: CardPrompt = {
        id: crypto.randomUUID() as PromptId,
        cardNumber,
        cardName,
        traditionalMeaning: meaning,
        generatedPrompt,
        confidence: 0.9,
        generatedAt: new Date(),
      }

      // Calculate usage
      const usage: ApiUsage = {
        model: GROK_MODELS.reasoning,
        promptTokens: completion.usage?.prompt_tokens || 0,
        completionTokens: completion.usage?.completion_tokens || 0,
        totalTokens: completion.usage?.total_tokens || 0,
        estimatedCost: this.calculateCost(
          completion.usage?.prompt_tokens || 0,
          completion.usage?.completion_tokens || 0
        ),
      }

      return {
        success: true,
        data: {
          cardPrompt,
          usage,
          requestId: completion.id || `grok_regen_${crypto.randomUUID()}`,
        },
      }
    } catch (error) {
      return this.handleError(error) as ServiceResponse<RegeneratePromptOutput>
    }
  }

  /**
   * Edit a generated prompt manually
   *
   * Allows user to manually refine AI-generated prompt.
   * Validates edited prompt length.
   */
  async editPrompt(input: EditPromptInput): Promise<ServiceResponse<EditPromptOutput>> {
    const { promptId, editedPrompt } = input

    // Validate prompt length
    if (editedPrompt.length < 50) {
      return {
        success: false,
        error: {
          code: PromptGenerationErrorCode.PROMPT_TOO_SHORT,
          message: `Edited prompt is too short (${editedPrompt.length} chars, minimum 50)`,
          retryable: false,
        },
      }
    }

    if (editedPrompt.length > 2000) {
      return {
        success: false,
        error: {
          code: PromptGenerationErrorCode.PROMPT_TOO_LONG,
          message: `Edited prompt is too long (${editedPrompt.length} chars, maximum 2000)`,
          retryable: false,
        },
      }
    }

    // In a real implementation, we would update the prompt in storage
    // For now, we'll create a new CardPrompt with the edited text
    // This matches the mock behavior
    const cardPrompt: CardPrompt = {
      id: promptId,
      cardNumber: 0 as CardNumber, // Would be retrieved from storage
      cardName: MAJOR_ARCANA_NAMES[0], // Would be retrieved from storage
      traditionalMeaning: MAJOR_ARCANA_MEANINGS[0], // Would be retrieved from storage
      generatedPrompt: editedPrompt,
      confidence: 1.0, // User-edited = 100% confidence
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

  /**
   * Get estimated cost for prompt generation
   *
   * Calculates estimated cost based on:
   * - Number of reference images (~1000 tokens each for vision)
   * - Style input length
   * - Expected output tokens (22 prompts * ~150 tokens each)
   */
  async estimateCost(
    input: Omit<GeneratePromptsInput, 'onProgress'>
  ): Promise<ServiceResponse<ApiUsage>> {
    const { referenceImageUrls, styleInputs, model } = input

    // Estimate tokens
    // Each image ~= 1000 tokens for vision models
    const imageTokens = referenceImageUrls.length * 1000

    // System + user prompt ~= 500 tokens
    const promptTextTokens = 500

    // Style inputs ~= 100 tokens
    const styleTokens = Math.ceil(
      (styleInputs.theme.length +
       styleInputs.tone.length +
       styleInputs.description.length +
       (styleInputs.concept?.length || 0)) / 4
    )

    const estimatedPromptTokens = imageTokens + promptTextTokens + styleTokens

    // Expected completion: 22 cards * ~150 tokens each
    const estimatedCompletionTokens = 22 * 150

    const estimatedTotalTokens = estimatedPromptTokens + estimatedCompletionTokens

    const usage: ApiUsage = {
      model: model || GROK_MODELS.reasoning,
      promptTokens: estimatedPromptTokens,
      completionTokens: estimatedCompletionTokens,
      totalTokens: estimatedTotalTokens,
      estimatedCost: this.calculateCost(estimatedPromptTokens, estimatedCompletionTokens),
    }

    return {
      success: true,
      data: usage,
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Build system prompt for Grok
   */
  private buildSystemPrompt(styleInputs: { theme: string; tone: string; description: string; concept?: string }): string {
    return `You are an expert at creating image generation prompts for tarot cards. Your task is to generate 22 unique prompts for the Major Arcana cards that:

1. Maintain a cohesive visual style across all cards
2. Incorporate the user's specified theme: ${styleInputs.theme}
3. Match the desired tone: ${styleInputs.tone}
4. Follow this style description: ${styleInputs.description}
${styleInputs.concept ? `5. Express this concept: ${styleInputs.concept}` : ''}

Each prompt should:
- Be 100-200 words
- Include specific visual details
- Reference traditional tarot symbolism for that card
- Maintain consistency with the reference images provided
- Be suitable for an AI image generator

Format your response as a JSON array with 22 objects, each containing:
{
  "cardNumber": 0-21,
  "cardName": "The Fool",
  "generatedPrompt": "detailed prompt text here"
}

Generate prompts for all 22 Major Arcana cards in order (0-21).`
  }

  /**
   * Build user prompt with card requirements
   */
  private buildUserPrompt(styleInputs: { theme: string; tone: string; description: string; concept?: string }): string {
    return `Analyze these reference images and generate 22 image generation prompts for Major Arcana tarot cards.

Style Requirements:
- Theme: ${styleInputs.theme}
- Tone: ${styleInputs.tone}
- Description: ${styleInputs.description}
${styleInputs.concept ? `- Concept: ${styleInputs.concept}` : ''}

Reference the visual style in these images and create prompts for all 22 cards (The Fool through The World) that maintain cohesion.

Return ONLY a valid JSON array with 22 objects.`
  }

  /**
   * Call Grok API with exponential backoff retry logic
   */
  private async callGrokWithRetry(
    params: {
      model: GrokModel
      messages: Array<{ role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }>
      temperature: number
      max_tokens: number
    },
    retryConfig: RetryConfig
  ): Promise<ServiceResponse<OpenAI.Chat.Completions.ChatCompletion>> {
    try {
      const completion = await this.client.chat.completions.create({
        model: params.model,
        messages: params.messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
        temperature: params.temperature,
        max_tokens: params.max_tokens,
      })

      return {
        success: true,
        data: completion,
      }
    } catch (error) {
      // Check if we should retry
      const shouldRetry = this.shouldRetryError(error)
      const canRetry = retryConfig.attempt < retryConfig.maxAttempts

      if (shouldRetry && canRetry) {
        // Calculate exponential backoff delay
        const delay = retryConfig.delay * Math.pow(2, retryConfig.attempt - 1)

        console.log(
          `[PromptGeneration] Retry attempt ${retryConfig.attempt}/${retryConfig.maxAttempts} after ${delay}ms`
        )

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, delay))

        // Retry with incremented attempt
        return this.callGrokWithRetry(params, {
          ...retryConfig,
          attempt: retryConfig.attempt + 1,
        })
      }

      // Max retries exceeded or non-retryable error
      return this.handleError(error) as ServiceResponse<OpenAI.Chat.Completions.ChatCompletion>
    }
  }

  /**
   * Parse Grok API response into CardPrompt array
   */
  private parseGrokResponse(content: string): ServiceResponse<CardPrompt[]> {
    try {
      // Extract JSON from response (handle markdown code blocks)
      let jsonContent = content.trim()

      // Remove markdown code fences if present
      if (jsonContent.startsWith('```')) {
        jsonContent = jsonContent.replace(/^```json?\n?/i, '').replace(/\n?```$/, '')
      }

      // Parse JSON
      const parsed = JSON.parse(jsonContent)

      // Validate it's an array
      if (!Array.isArray(parsed)) {
        return {
          success: false,
          error: {
            code: PromptGenerationErrorCode.INVALID_RESPONSE_FORMAT,
            message: 'Response is not an array',
            retryable: true,
          },
        }
      }

      // Convert to CardPrompt objects
      const cardPrompts: CardPrompt[] = parsed.map((item) => ({
        id: crypto.randomUUID() as PromptId,
        cardNumber: item.cardNumber as CardNumber,
        cardName: item.cardName || MAJOR_ARCANA_NAMES[item.cardNumber],
        traditionalMeaning: MAJOR_ARCANA_MEANINGS[item.cardNumber as CardNumber],
        generatedPrompt: item.generatedPrompt,
        confidence: 0.95,
        generatedAt: new Date(),
      }))

      return {
        success: true,
        data: cardPrompts,
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: PromptGenerationErrorCode.INVALID_RESPONSE_FORMAT,
          message: `Failed to parse response: ${error instanceof Error ? error.message : 'Unknown error'}`,
          retryable: true,
        },
      }
    }
  }

  /**
   * Check if error should trigger a retry
   */
  private shouldRetryError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase()

      // Retry on network errors
      if (message.includes('network') || message.includes('timeout')) {
        return true
      }

      // Retry on rate limit errors
      if (message.includes('rate limit') || message.includes('429')) {
        return true
      }

      // Retry on server errors (5xx)
      if (message.includes('500') || message.includes('502') || message.includes('503')) {
        return true
      }
    }

    return false
  }

  /**
   * Handle errors and convert to ServiceResponse
   */
  private handleError(error: unknown): ServiceResponse<never> {
    if (error instanceof Error) {
      const message = error.message.toLowerCase()

      // API key errors
      if (message.includes('api key') || message.includes('unauthorized') || message.includes('401')) {
        return {
          success: false,
          error: {
            code: PromptGenerationErrorCode.API_KEY_INVALID,
            message: PROMPT_GENERATION_ERROR_MESSAGES[PromptGenerationErrorCode.API_KEY_INVALID],
            retryable: false,
          },
        }
      }

      // Rate limit errors
      if (message.includes('rate limit') || message.includes('429')) {
        return {
          success: false,
          error: {
            code: PromptGenerationErrorCode.API_RATE_LIMIT,
            message: PROMPT_GENERATION_ERROR_MESSAGES[PromptGenerationErrorCode.API_RATE_LIMIT],
            retryable: true,
          },
        }
      }

      // Timeout errors
      if (message.includes('timeout')) {
        return {
          success: false,
          error: {
            code: PromptGenerationErrorCode.API_TIMEOUT,
            message: PROMPT_GENERATION_ERROR_MESSAGES[PromptGenerationErrorCode.API_TIMEOUT],
            retryable: true,
          },
        }
      }

      // Network errors
      if (message.includes('network') || message.includes('econnrefused')) {
        return {
          success: false,
          error: {
            code: PromptGenerationErrorCode.NETWORK_ERROR,
            message: PROMPT_GENERATION_ERROR_MESSAGES[PromptGenerationErrorCode.NETWORK_ERROR],
            retryable: true,
          },
        }
      }

      // Quota errors
      if (message.includes('quota') || message.includes('insufficient')) {
        return {
          success: false,
          error: {
            code: PromptGenerationErrorCode.QUOTA_EXCEEDED,
            message: PROMPT_GENERATION_ERROR_MESSAGES[PromptGenerationErrorCode.QUOTA_EXCEEDED],
            retryable: false,
          },
        }
      }

      // Generic API error
      return {
        success: false,
        error: {
          code: PromptGenerationErrorCode.API_ERROR,
          message: `Grok API error: ${error.message}`,
          retryable: true,
        },
      }
    }

    // Unknown error
    return {
      success: false,
      error: {
        code: PromptGenerationErrorCode.API_ERROR,
        message: PROMPT_GENERATION_ERROR_MESSAGES[PromptGenerationErrorCode.API_ERROR],
        retryable: true,
      },
    }
  }

  /**
   * Calculate cost based on token usage
   *
   * Grok pricing (approximate):
   * - Input: $5 per 1M tokens
   * - Output: $15 per 1M tokens
   */
  private calculateCost(promptTokens: number, completionTokens: number): number {
    const inputCost = (promptTokens / 1_000_000) * 5.0
    const outputCost = (completionTokens / 1_000_000) * 15.0
    return inputCost + outputCost
  }

  /**
   * Validate URL format
   */
  private isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url)
      return parsed.protocol === 'http:' || parsed.protocol === 'https:'
    } catch {
      return false
    }
  }
}

/**
 * Singleton instance for use throughout the application
 */
export const promptGenerationService = new PromptGenerationService()
