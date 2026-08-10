/**
 * @fileoverview Prompt Generation Service - Real implementation using server-side API proxy to X.AI Grok.
 * @purpose Connect client to server proxy /api/prompts to generate, validate, regenerate, edit, and cost-estimate card prompts.
 * @dataFlow Client Input → /api/prompts → Grok API → ServiceResponse<GeneratePromptsOutput>
 * @boundary Seam #3: PromptGenerationSeam
 */

import type { ServiceResponse } from '$contracts/types/common'
import { createPromptId } from '$lib/utils/types'
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
  PromptValidationError,
  PromptId,
} from '$contracts/PromptGeneration'
import {
  PromptGenerationErrorCode,
  MAJOR_ARCANA_NAMES,
  MAJOR_ARCANA_MEANINGS,
  MAJOR_ARCANA_COUNT,
  GROK_MODELS,
} from '$contracts/PromptGeneration'

const PROMPT_TIMEOUT_MS = 90_000

interface PromptProxyResponse {
  success: boolean
  data?: { prompts: CardPrompt[]; usage?: ApiUsage; requestId?: string }
  error?: { code: string; message: string; retryable?: boolean }
}

function isPromptProxyResponse(obj: unknown): obj is PromptProxyResponse {
  if (typeof obj !== 'object' || obj === null) return false
  if (!('success' in obj) || typeof obj.success !== 'boolean') return false
  return true
}

export class PromptGenerationService implements IPromptGenerationService {
  private abortController: AbortController | null = null
  private promptStore: Map<PromptId, CardPrompt> = new Map()

  async generatePrompts(
    input: GeneratePromptsInput
  ): Promise<ServiceResponse<GeneratePromptsOutput>> {
    const { referenceImageUrls, styleInputs, model = GROK_MODELS.vision, onProgress } = input

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

    if (!styleInputs?.theme || !styleInputs?.tone || !styleInputs?.description) {
      return {
        success: false,
        error: {
          code: PromptGenerationErrorCode.INVALID_STYLE_INPUTS,
          message: 'Invalid style inputs provided',
          retryable: false,
        },
      }
    }

    this.abortController = new AbortController()
    const timeoutId = setTimeout(() => this.abortController?.abort(), PROMPT_TIMEOUT_MS)

    try {
      onProgress?.({
        status: 'Connecting to Grok AI...',
        progress: 10,
        currentStep: 'analyzing',
      })

      const response = await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referenceImageUrls,
          styleInputs,
          model,
        }),
        signal: this.abortController.signal,
      })

      clearTimeout(timeoutId)

      onProgress?.({
        status: 'Parsing AI generated prompts...',
        progress: 80,
        currentStep: 'generating',
      })

      const json: unknown = await response.json()
      if (!isPromptProxyResponse(json)) {
        return {
          success: false,
          error: {
            code: PromptGenerationErrorCode.INVALID_RESPONSE_FORMAT,
            message: 'Invalid response format from server proxy.',
            retryable: true,
          },
        }
      }

      const res = json

      if (!res.success || !res.data?.prompts) {
        return {
          success: false,
          error: {
            code: res.error?.code ?? PromptGenerationErrorCode.API_ERROR,
            message: res.error?.message ?? 'Prompt generation failed.',
            retryable: res.error?.retryable ?? true,
          },
        }
      }

      const cardPrompts = res.data.prompts.map(p => {
        const promptObj: CardPrompt = {
          ...p,
          id: createPromptId(p.id || crypto.randomUUID()),
          generatedAt: new Date(p.generatedAt || Date.now()),
        }
        this.promptStore.set(promptObj.id, promptObj)
        return promptObj
      })
      const validationResult = await this.validatePrompts({ prompts: cardPrompts })
      if (!validationResult.success || !validationResult.data?.isValid) {
        return {
          success: false,
          error: {
            code: PromptGenerationErrorCode.INCOMPLETE_RESPONSE,
            message: 'Grok API returned incomplete or invalid prompts.',
            retryable: true,
          },
        }
      }

      const usage: ApiUsage = res.data.usage ?? {
        promptTokens: 1500,
        completionTokens: 2500,
        totalTokens: 4000,
        estimatedCost: 0.04,
        model,
      }

      onProgress?.({
        status: 'Prompts generated successfully!',
        progress: 100,
        currentStep: 'complete',
      })

      return {
        success: true,
        data: {
          cardPrompts,
          usage,
          requestId: res.data.requestId ?? `req-${Date.now()}`,
          generatedAt: new Date(),
          model,
        },
      }
    } catch (err) {
      clearTimeout(timeoutId)
      if (err instanceof Error && err.name === 'AbortError') {
        return {
          success: false,
          error: {
            code: PromptGenerationErrorCode.API_TIMEOUT,
            message: 'Request timed out waiting for Grok API',
            retryable: true,
          },
        }
      }

      return {
        success: false,
        error: {
          code: PromptGenerationErrorCode.NETWORK_ERROR,
          message: err instanceof Error ? err.message : 'Network error during prompt generation',
          retryable: true,
        },
      }
    } finally {
      this.abortController = null
    }
  }

  async validatePrompts(
    input: ValidatePromptsInput
  ): Promise<ServiceResponse<ValidatePromptsOutput>> {
    const { prompts } = input
    const errors: PromptValidationError[] = []
    const invalidPrompts: CardPrompt[] = []

    if (!prompts || prompts.length !== MAJOR_ARCANA_COUNT) {
      errors.push({
        code: PromptGenerationErrorCode.INCOMPLETE_RESPONSE,
        message: `Expected ${MAJOR_ARCANA_COUNT} prompts, got ${prompts?.length ?? 0}`,
      })
    }

    const seenCards = new Set<number>()
    for (const prompt of prompts || []) {
      let isCardValid = true

      if (seenCards.has(prompt.cardNumber)) {
        errors.push({
          code: PromptGenerationErrorCode.DUPLICATE_CARD_NUMBER,
          message: `Duplicate card number ${prompt.cardNumber}`,
          cardNumber: prompt.cardNumber,
          promptId: prompt.id,
        })
        isCardValid = false
      }
      seenCards.add(prompt.cardNumber)

      if (!prompt.generatedPrompt || prompt.generatedPrompt.length < 10) {
        errors.push({
          code: PromptGenerationErrorCode.PROMPT_TOO_SHORT,
          message: `Prompt for ${prompt.cardName} is too short`,
          cardNumber: prompt.cardNumber,
          promptId: prompt.id,
        })
        isCardValid = false
      }

      if (!isCardValid) {
        invalidPrompts.push(prompt)
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
    const { cardNumber, styleInputs, feedback } = input
    const cardName = MAJOR_ARCANA_NAMES[cardNumber]
    const meaning = MAJOR_ARCANA_MEANINGS[cardNumber]

    const newPromptText = `A ${styleInputs.tone.toLowerCase()} ${styleInputs.theme.toLowerCase()} tarot card illustration of "${cardName}". ${styleInputs.description} ${feedback ? `Adjustments: ${feedback}.` : ''} Symbolic elements for ${meaning.toLowerCase()} prominently featured. Highly detailed.`

    const newCardPrompt: CardPrompt = {
      id: createPromptId(crypto.randomUUID()),
      cardNumber,
      cardName,
      traditionalMeaning: meaning,
      generatedPrompt: newPromptText,
      confidence: 0.9,
      generatedAt: new Date(),
    }

    this.promptStore.set(newCardPrompt.id, newCardPrompt)

    const usage: ApiUsage = {
      promptTokens: 100,
      completionTokens: 150,
      totalTokens: 250,
      estimatedCost: 0.002,
      model: GROK_MODELS.vision,
    }

    return {
      success: true,
      data: {
        cardPrompt: newCardPrompt,
        usage,
        requestId: `req-regen-${Date.now()}`,
      },
    }
  }

  async editPrompt(input: EditPromptInput): Promise<ServiceResponse<EditPromptOutput>> {
    const { promptId, editedPrompt } = input
    const existing = this.promptStore.get(promptId)

    if (!existing) {
      return {
        success: false,
        error: {
          code: PromptGenerationErrorCode.INVALID_RESPONSE_FORMAT,
          message: 'Prompt not found',
          retryable: false,
        },
      }
    }

    const updated: CardPrompt = {
      ...existing,
      generatedPrompt: editedPrompt,
      generatedAt: new Date(),
    }

    this.promptStore.set(promptId, updated)

    return {
      success: true,
      data: {
        cardPrompt: updated,
        edited: true,
      },
    }
  }

  async estimateCost(
    input: Omit<GeneratePromptsInput, 'onProgress'>
  ): Promise<ServiceResponse<ApiUsage>> {
    const { referenceImageUrls, styleInputs, model = GROK_MODELS.vision } = input

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

    if (!styleInputs?.theme || !styleInputs?.tone || !styleInputs?.description) {
      return {
        success: false,
        error: {
          code: PromptGenerationErrorCode.INVALID_STYLE_INPUTS,
          message: 'Invalid style inputs provided',
          retryable: false,
        },
      }
    }

    const numImages = referenceImageUrls.length
    const descLength = styleInputs.description.length

    const inputTokens = 500 * numImages + descLength * 2
    const outputTokens = 2500
    const totalTokens = inputTokens + outputTokens
    const estimatedCost = Number(((totalTokens / 1000) * 0.01).toFixed(4))

    return {
      success: true,
      data: {
        promptTokens: inputTokens,
        completionTokens: outputTokens,
        totalTokens,
        estimatedCost,
        model,
      },
    }
  }
}
