/**
 * @fileoverview Prompt Generation Service - Real implementation using server-side API proxy to X.AI Grok.
 *
 * PURPOSE:
 * Connects the client to the server proxy `/api/prompts` to generate, validate, regenerate,
 * edit, and cost-estimate tarot card prompts using X.AI Grok vision capabilities.
 *
 * DATA FLOW:
 * Input: Reference image URLs and StyleInputs from client UI/store.
 * Transform: Validates inputs, sends request via per-request AbortController to /api/prompts, validates raw response structure.
 * Output: ServiceResponse with 22 CardPrompt objects and ApiUsage metadata.
 *
 * DEPENDENCIES:
 * - Depends on: $contracts/PromptGeneration, $contracts/types/common, $lib/utils/types
 * - Used by: Svelte UI PromptGeneration stores and components
 *
 * @boundary Seam #3: PromptGenerationSeam
 */

import type { ServiceResponse } from '$contracts/types/common'
import { createPromptId, isCardNumber } from '$lib/utils/types'
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
  CardNumber,
  GenerationProgress,
} from '$contracts/PromptGeneration'
import {
  PromptGenerationErrorCode,
  MAJOR_ARCANA_NAMES,
  MAJOR_ARCANA_MEANINGS,
  MAJOR_ARCANA_COUNT,
  GROK_MODELS,
} from '$contracts/PromptGeneration'

const PROMPT_TIMEOUT_MS = 90_000

interface RawProxyPromptItem {
  id?: string
  cardNumber: CardNumber
  cardName: string
  traditionalMeaning?: string
  generatedPrompt: string
  confidence?: number
  generatedAt?: string | number | Date
}

interface PromptProxySuccessData {
  prompt?: unknown
  prompts?: unknown
  usage?: ApiUsage
  requestId?: string
}

interface PromptProxyErrorData {
  code?: string
  message?: string
  retryable?: boolean
}

interface PromptProxyResponse {
  success: boolean
  data?: PromptProxySuccessData
  error?: PromptProxyErrorData
}

function isPromptProxyResponse(obj: unknown): obj is PromptProxyResponse {
  if (typeof obj !== 'object' || obj === null) return false
  if (!('success' in obj) || typeof obj.success !== 'boolean') return false
  return true
}

function isRawProxyPromptItem(obj: unknown): obj is RawProxyPromptItem {
  if (typeof obj !== 'object' || obj === null) return false
  if (
    !('cardNumber' in obj) ||
    typeof obj.cardNumber !== 'number' ||
    !isCardNumber(obj.cardNumber)
  ) {
    return false
  }
  if (!('cardName' in obj) || typeof obj.cardName !== 'string') {
    return false
  }
  if (!('generatedPrompt' in obj) || typeof obj.generatedPrompt !== 'string') {
    return false
  }
  return true
}

function isPromptGenerationErrorCode(value: unknown): value is PromptGenerationErrorCode {
  if (typeof value !== 'string') return false
  const validCodes: readonly string[] = Object.values(PromptGenerationErrorCode)
  return validCodes.includes(value)
}

function safeOnProgress(
  callback: ((progress: GenerationProgress) => void) | undefined,
  progress: GenerationProgress
): void {
  if (!callback) return
  try {
    callback(progress)
  } catch (error) {
    console.error('Error executing onProgress callback:', error)
  }
}

export class PromptGenerationService implements IPromptGenerationService {
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

    const abortController = new AbortController()
    const timeoutId = setTimeout(() => {
      abortController.abort()
    }, PROMPT_TIMEOUT_MS)

    try {
      safeOnProgress(onProgress, {
        status: 'Connecting to Grok AI...',
        progress: 10,
        currentStep: 'analyzing',
      })

      let response: Response
      try {
        response = await fetch('/api/prompts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            referenceImageUrls,
            styleInputs,
            model,
          }),
          signal: abortController.signal,
        })
      } catch (fetchErr) {
        if (
          (fetchErr instanceof DOMException && fetchErr.name === 'AbortError') ||
          (fetchErr instanceof Error && fetchErr.name === 'AbortError')
        ) {
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
            message:
              fetchErr instanceof Error
                ? fetchErr.message
                : 'Network error during prompt generation',
            retryable: true,
          },
        }
      }

      safeOnProgress(onProgress, {
        status: 'Parsing AI generated prompts...',
        progress: 80,
        currentStep: 'generating',
      })

      let json: unknown
      try {
        json = await response.json()
      } catch {
        return {
          success: false,
          error: {
            code: response.ok
              ? PromptGenerationErrorCode.INVALID_RESPONSE_FORMAT
              : PromptGenerationErrorCode.API_ERROR,
            message: response.ok
              ? 'Invalid response format from server proxy.'
              : `Server returned HTTP ${response.status}: ${response.statusText || 'Error'}`,
            retryable: true,
          },
        }
      }

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

      if (!res.success) {
        const rawCode = res.error?.code
        const errorCode = isPromptGenerationErrorCode(rawCode)
          ? rawCode
          : PromptGenerationErrorCode.API_ERROR

        return {
          success: false,
          error: {
            code: errorCode,
            message: res.error?.message ?? 'Prompt generation failed.',
            retryable: res.error?.retryable ?? true,
          },
        }
      }

      if (!res.data || typeof res.data !== 'object' || !Array.isArray(res.data.prompts)) {
        return {
          success: false,
          error: {
            code: PromptGenerationErrorCode.INVALID_RESPONSE_FORMAT,
            message: 'Server response missing valid prompts list.',
            retryable: true,
          },
        }
      }

      const cardPrompts: CardPrompt[] = []
      for (const p of res.data.prompts) {
        if (!isRawProxyPromptItem(p)) {
          continue
        }

        const promptId = createPromptId(
          typeof p.id === 'string' && p.id.length > 0 ? p.id : crypto.randomUUID()
        )
        const traditionalMeaning =
          typeof p.traditionalMeaning === 'string' && p.traditionalMeaning.length > 0
            ? p.traditionalMeaning
            : MAJOR_ARCANA_MEANINGS[p.cardNumber]

        let generatedAtDate: Date
        if (p.generatedAt instanceof Date) {
          generatedAtDate = p.generatedAt
        } else if (typeof p.generatedAt === 'string' || typeof p.generatedAt === 'number') {
          const parsedDate = new Date(p.generatedAt)
          generatedAtDate = isNaN(parsedDate.getTime()) ? new Date() : parsedDate
        } else {
          generatedAtDate = new Date()
        }

        const confidence = typeof p.confidence === 'number' ? p.confidence : 0.9

        const promptObj: CardPrompt = {
          id: promptId,
          cardNumber: p.cardNumber,
          cardName: p.cardName,
          traditionalMeaning,
          generatedPrompt: p.generatedPrompt,
          confidence,
          generatedAt: generatedAtDate,
        }

        this.promptStore.set(promptObj.id, promptObj)
        cardPrompts.push(promptObj)
      }

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

      safeOnProgress(onProgress, {
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
      if (
        (err instanceof DOMException && err.name === 'AbortError') ||
        (err instanceof Error && err.name === 'AbortError')
      ) {
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
      clearTimeout(timeoutId)
    }
  }

  async validatePrompts(
    input: ValidatePromptsInput
  ): Promise<ServiceResponse<ValidatePromptsOutput>> {
    const { prompts } = input
    const errors: PromptValidationError[] = []
    const invalidPrompts: CardPrompt[] = []

    if (!prompts || !Array.isArray(prompts) || prompts.length !== MAJOR_ARCANA_COUNT) {
      errors.push({
        code: PromptGenerationErrorCode.INCOMPLETE_RESPONSE,
        message: `Expected ${MAJOR_ARCANA_COUNT} prompts, got ${prompts?.length ?? 0}`,
      })
    }

    const seenCards = new Set<number>()
    const promptsList = Array.isArray(prompts) ? prompts : []
    for (const prompt of promptsList) {
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
    const {
      cardNumber,
      referenceImageUrls = [],
      styleInputs,
      previousPrompt,
      feedback,
    } = input
    const model = GROK_MODELS.vision

    if (!isCardNumber(cardNumber)) {
      return {
        success: false,
        error: {
          code: PromptGenerationErrorCode.INVALID_RESPONSE_FORMAT,
          message: `Invalid card number ${cardNumber}`,
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

    const abortController = new AbortController()
    const timeoutId = setTimeout(() => {
      abortController.abort()
    }, PROMPT_TIMEOUT_MS)

    try {
      let response: Response
      try {
        response = await fetch('/api/prompts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cardNumber,
            referenceImageUrls,
            styleInputs,
            previousPrompt,
            feedback,
            model,
          }),
          signal: abortController.signal,
        })
      } catch (fetchErr) {
        if (
          (fetchErr instanceof DOMException && fetchErr.name === 'AbortError') ||
          (fetchErr instanceof Error && fetchErr.name === 'AbortError')
        ) {
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
            message:
              fetchErr instanceof Error
                ? fetchErr.message
                : 'Network error during prompt regeneration',
            retryable: true,
          },
        }
      }

      let json: unknown
      try {
        json = await response.json()
      } catch {
        return {
          success: false,
          error: {
            code: response.ok
              ? PromptGenerationErrorCode.INVALID_RESPONSE_FORMAT
              : PromptGenerationErrorCode.API_ERROR,
            message: response.ok
              ? 'Invalid response format from server proxy.'
              : `Server returned HTTP ${response.status}: ${response.statusText || 'Error'}`,
            retryable: true,
          },
        }
      }

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

      if (!res.success) {
        const rawCode = res.error?.code
        const errorCode = isPromptGenerationErrorCode(rawCode)
          ? rawCode
          : PromptGenerationErrorCode.API_ERROR

        return {
          success: false,
          error: {
            code: errorCode,
            message: res.error?.message ?? 'Prompt regeneration failed.',
            retryable: res.error?.retryable ?? true,
          },
        }
      }

      if (!res.data || typeof res.data !== 'object') {
        return {
          success: false,
          error: {
            code: PromptGenerationErrorCode.INVALID_RESPONSE_FORMAT,
            message: 'Server response missing valid prompt data.',
            retryable: true,
          },
        }
      }

      const rawPromptCandidate =
        res.data.prompt ?? (Array.isArray(res.data.prompts) ? res.data.prompts[0] : null)

      const rawPromptItem = isRawProxyPromptItem(rawPromptCandidate) ? rawPromptCandidate : null

      if (!rawPromptItem) {
        return {
          success: false,
          error: {
            code: PromptGenerationErrorCode.INVALID_RESPONSE_FORMAT,
            message: 'Server response missing valid prompt for card.',
            retryable: true,
          },
        }
      }

      const promptId = createPromptId(
        typeof rawPromptItem.id === 'string' && rawPromptItem.id.length > 0
          ? rawPromptItem.id
          : crypto.randomUUID()
      )
      const traditionalMeaning =
        typeof rawPromptItem.traditionalMeaning === 'string' &&
        rawPromptItem.traditionalMeaning.length > 0
          ? rawPromptItem.traditionalMeaning
          : MAJOR_ARCANA_MEANINGS[cardNumber]
      const cardName = MAJOR_ARCANA_NAMES[cardNumber]

      let generatedAtDate: Date
      if (rawPromptItem.generatedAt instanceof Date) {
        generatedAtDate = rawPromptItem.generatedAt
      } else if (
        typeof rawPromptItem.generatedAt === 'string' ||
        typeof rawPromptItem.generatedAt === 'number'
      ) {
        const parsedDate = new Date(rawPromptItem.generatedAt)
        generatedAtDate = isNaN(parsedDate.getTime()) ? new Date() : parsedDate
      } else {
        generatedAtDate = new Date()
      }

      const confidence =
        typeof rawPromptItem.confidence === 'number' ? rawPromptItem.confidence : 0.9

      const newCardPrompt: CardPrompt = {
        id: promptId,
        cardNumber,
        cardName,
        traditionalMeaning,
        generatedPrompt: rawPromptItem.generatedPrompt,
        confidence,
        generatedAt: generatedAtDate,
      }

      this.promptStore.set(newCardPrompt.id, newCardPrompt)

      const usage: ApiUsage = res.data.usage ?? {
        promptTokens: 200,
        completionTokens: 150,
        totalTokens: 350,
        estimatedCost: 0.002,
        model,
      }

      return {
        success: true,
        data: {
          cardPrompt: newCardPrompt,
          usage,
          requestId: res.data.requestId ?? `req-regen-${Date.now()}`,
        },
      }
    } catch (err) {
      if (
        (err instanceof DOMException && err.name === 'AbortError') ||
        (err instanceof Error && err.name === 'AbortError')
      ) {
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
          message:
            err instanceof Error ? err.message : 'Network error during prompt regeneration',
          retryable: true,
        },
      }
    } finally {
      clearTimeout(timeoutId)
    }
  }

  async editPrompt(input: EditPromptInput): Promise<ServiceResponse<EditPromptOutput>> {
    const { promptId, editedPrompt } = input

    if (!promptId || typeof editedPrompt !== 'string' || editedPrompt.trim().length === 0) {
      return {
        success: false,
        error: {
          code: PromptGenerationErrorCode.PROMPT_TOO_SHORT,
          message: 'Edited prompt cannot be empty',
          retryable: false,
        },
      }
    }

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
