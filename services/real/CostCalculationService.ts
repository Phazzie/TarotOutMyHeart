/**
 * @fileoverview CostCalculationService — real implementation.
 * Pure math based on Grok API pricing.
 * Implements ICostCalculationService strictly without type escapes.
 */

import type { ServiceResponse } from '$contracts/types/common'
import type {
  ICostCalculationService,
  CalculateTotalCostInput,
  CalculateTotalCostOutput,
  EstimateCostInput,
  EstimateCostOutput,
  FormatCostInput,
  FormatCostOutput,
  CostSummary,
  CostEstimate,
  TextCostBreakdown,
  ImageCostBreakdown,
  VisionCostBreakdown,
} from '$contracts/CostCalculation'
import {
  CostCalculationErrorCode,
  GROK_PRICING,
  COST_THRESHOLDS,
  formatCurrency,
  getWarningLevel,
  getWarningMessage,
} from '$contracts/CostCalculation'

export class CostCalculationService implements ICostCalculationService {
  async calculateTotalCost(
    input: CalculateTotalCostInput
  ): Promise<ServiceResponse<CalculateTotalCostOutput>> {
    const { promptUsage, imageUsage } = input

    if (!promptUsage) {
      return {
        success: false,
        error: {
          code: CostCalculationErrorCode.MISSING_PROMPT_USAGE,
          message: 'Missing prompt usage data',
          retryable: false,
        },
      }
    }

    if (!imageUsage) {
      return {
        success: false,
        error: {
          code: CostCalculationErrorCode.MISSING_IMAGE_USAGE,
          message: 'Missing image usage data',
          retryable: false,
        },
      }
    }

    const textCost: TextCostBreakdown = {
      inputTokens: promptUsage.promptTokens,
      outputTokens: promptUsage.completionTokens,
      inputCost: promptUsage.promptTokens * GROK_PRICING.textInputTokens,
      outputCost: promptUsage.completionTokens * GROK_PRICING.textOutputTokens,
      totalCost:
        promptUsage.promptTokens * GROK_PRICING.textInputTokens +
        promptUsage.completionTokens * GROK_PRICING.textOutputTokens,
    }

    const imageCost: ImageCostBreakdown = {
      imagesGenerated: imageUsage.successfulImages,
      imagesFailed: imageUsage.failedImages,
      imagesRetried: 0,
      generationCost: GROK_PRICING.imageGeneration,
      totalCost: imageUsage.successfulImages * GROK_PRICING.imageGeneration,
    }

    const visionCost: VisionCostBreakdown = {
      requestCount: 1,
      requestCost: GROK_PRICING.visionRequest,
      totalCost: GROK_PRICING.visionRequest,
    }

    const totalCost = textCost.totalCost + imageCost.totalCost + visionCost.totalCost
    const warningLevel = getWarningLevel(totalCost)
    const formattedCost = formatCurrency(totalCost)

    const summary: CostSummary = {
      textCost,
      imageCost,
      visionCost,
      totalCost,
      warningLevel,
      formattedCost,
    }

    const exceeded = warningLevel === 'maximum'
    const canProceed = !exceeded

    return {
      success: true,
      data: {
        summary,
        exceeded,
        canProceed,
      },
    }
  }

  async estimateCost(input: EstimateCostInput): Promise<ServiceResponse<EstimateCostOutput>> {
    const { imageCount, referenceImageCount, estimatedPromptLength = 1000 } = input

    if (imageCount < 0 || referenceImageCount < 0) {
      return {
        success: false,
        error: {
          code: CostCalculationErrorCode.INVALID_IMAGE_COUNT,
          message: 'Image counts cannot be negative',
          retryable: false,
        },
      }
    }

    const promptGenCost =
      referenceImageCount * GROK_PRICING.visionRequest +
      estimatedPromptLength * GROK_PRICING.textOutputTokens
    const imageGenCost = imageCount * GROK_PRICING.imageGeneration
    const estimatedCost = promptGenCost + imageGenCost

    const estimate: CostEstimate = {
      estimatedCost,
      breakdown: {
        promptGeneration: promptGenCost,
        imageGeneration: imageGenCost,
      },
      assumptions: [
        `Vision API: ${referenceImageCount} reference images`,
        `Text Generation: ~${estimatedPromptLength} tokens per prompt`,
        `Image Generation: ${imageCount} images at $${GROK_PRICING.imageGeneration} each`,
      ],
    }

    const canAfford = estimatedCost <= COST_THRESHOLDS.maximum
    const warningLevel = getWarningLevel(estimatedCost)
    const warningMessage = getWarningMessage(warningLevel, estimatedCost)

    return {
      success: true,
      data: {
        estimate,
        canAfford,
        warningMessage: warningMessage || undefined,
      },
    }
  }

  async formatCost(input: FormatCostInput): Promise<ServiceResponse<FormatCostOutput>> {
    const { cost, format = 'summary', includeWarning = true } = input

    let formatted: string

    switch (format) {
      case 'detailed':
        formatted = `Total: ${formatCurrency(cost)}`
        break
      case 'minimal':
        formatted = `~${formatCurrency(cost, 0)}`
        break
      case 'summary':
      default:
        formatted = formatCurrency(cost)
        break
    }

    const warningLevel = getWarningLevel(cost)
    const warningMessage = includeWarning ? getWarningMessage(warningLevel, cost) : undefined

    return {
      success: true,
      data: {
        formatted,
        warningLevel,
        warningMessage: warningMessage || undefined,
      },
    }
  }
}
