/**
 * @fileoverview Mock implementation of ICostCalculationService
 * @purpose Provide realistic mock behavior for cost calculation operations
 * @boundary Seam #6: CostCalculationSeam
 * @contract contracts/CostCalculation.ts
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

/**
 * Mock implementation of ICostCalculationService
 * Calculates and formats API usage costs
 */
export class CostCalculationMockService implements ICostCalculationService {
  /**
   * Simulate async delay
   */
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  async calculateTotalCost(
    input: CalculateTotalCostInput
  ): Promise<ServiceResponse<CalculateTotalCostOutput>> {
    await this.delay(50)

    const { promptUsage, imageUsage } = input

    // Validate input
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

    // Calculate text costs
    const textCost: TextCostBreakdown = {
      inputTokens: promptUsage.promptTokens,
      outputTokens: promptUsage.completionTokens,
      inputCost: promptUsage.promptTokens * GROK_PRICING.textInputTokens,
      outputCost: promptUsage.completionTokens * GROK_PRICING.textOutputTokens,
      totalCost:
        promptUsage.promptTokens * GROK_PRICING.textInputTokens +
        promptUsage.completionTokens * GROK_PRICING.textOutputTokens,
    }

    // Calculate image costs
    const imageCost: ImageCostBreakdown = {
      imagesGenerated: imageUsage.successfulImages,
      imagesFailed: imageUsage.failedImages,
      imagesRetried: 0, // Not tracked in mock
      generationCost: GROK_PRICING.imageGeneration,
      totalCost: imageUsage.successfulImages * GROK_PRICING.imageGeneration,
    }

    // Calculate vision API costs (1 request for prompt generation)
    const visionCost: VisionCostBreakdown = {
      requestCount: 1,
      requestCost: GROK_PRICING.visionRequest,
      totalCost: GROK_PRICING.visionRequest,
    }

    const totalCost = textCost.totalCost + imageCost.totalCost + visionCost.totalCost
    const warningLevel = getWarningLevel(totalCost)

    const summary: CostSummary = {
      textCost,
      imageCost,
      visionCost,
      totalCost,
      warningLevel,
      formattedCost: formatCurrency(totalCost),
    }

    return {
      success: true,
      data: {
        summary,
        exceeded: totalCost >= COST_THRESHOLDS.warning,
        canProceed: totalCost < COST_THRESHOLDS.maximum,
      },
    }
  }

  async estimateCost(input: EstimateCostInput): Promise<ServiceResponse<EstimateCostOutput>> {
    await this.delay(50)

    const { imageCount, referenceImageCount, estimatedPromptLength = 1000 } = input

    if (imageCount <= 0 || imageCount > 100) {
      return {
        success: false,
        error: {
          code: CostCalculationErrorCode.INVALID_IMAGE_COUNT,
          message: 'Invalid image count for estimation',
          retryable: false,
        },
      }
    }

    // Estimate prompt generation cost
    const estimatedInputTokens = 500 + referenceImageCount * 500 + estimatedPromptLength
    const estimatedOutputTokens = imageCount * 200 // ~200 tokens per card prompt
    const promptGenerationCost =
      estimatedInputTokens * GROK_PRICING.textInputTokens +
      estimatedOutputTokens * GROK_PRICING.textOutputTokens +
      GROK_PRICING.visionRequest

    // Estimate image generation cost
    const imageGenerationCost = imageCount * GROK_PRICING.imageGeneration

    const estimatedCost = promptGenerationCost + imageGenerationCost
    const warningLevel = getWarningLevel(estimatedCost)

    const estimate: CostEstimate = {
      estimatedCost,
      breakdown: {
        promptGeneration: promptGenerationCost,
        imageGeneration: imageGenerationCost,
      },
      assumptions: [
        `${referenceImageCount} reference image(s)`,
        `${imageCount} cards to generate`,
        `~${estimatedPromptLength} tokens of style description`,
        `Using grok-vision-beta for prompts`,
        `Using grok-2-image-alpha for images`,
      ],
    }

    return {
      success: true,
      data: {
        estimate,
        canAfford: estimatedCost < COST_THRESHOLDS.maximum,
        warningMessage: getWarningMessage(warningLevel, estimatedCost),
      },
    }
  }

  async formatCost(input: FormatCostInput): Promise<ServiceResponse<FormatCostOutput>> {
    await this.delay(10)

    const { cost, format = 'summary', includeWarning = false } = input

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

    return {
      success: true,
      data: {
        formatted,
        warningLevel,
        warningMessage: includeWarning ? getWarningMessage(warningLevel, cost) : undefined,
      },
    }
  }
}
