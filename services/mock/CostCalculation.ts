/**
 * @fileoverview Cost Calculation Mock Service - Calculates and formats API costs
 * @purpose Mock implementation of ICostCalculationService for testing and development
 * @dataFlow Usage data → Cost calculation → Formatted display with warnings
 * @boundary Seam #6: CostCalculationSeam - Converts API usage to cost summaries
 *
 * @example
 * const service = new CostCalculationMock()
 * const result = await service.calculateTotalCost({
 *   promptUsage: { promptTokens: 5000, completionTokens: 15000, ... },
 *   imageUsage: { totalImages: 22, successfulImages: 22, ... }
 * })
 * console.log(result.data.summary.formattedCost) // "$2.36"
 */

import type {
  ICostCalculationService,
  CalculateTotalCostInput,
  CalculateTotalCostOutput,
  EstimateCostInput,
  EstimateCostOutput,
  FormatCostInput,
  FormatCostOutput,
  CostSummary,
  TextCostBreakdown,
  ImageCostBreakdown,
  VisionCostBreakdown,
  CostEstimate,
} from '../../contracts/CostCalculation'

import {
  GROK_PRICING,
  COST_THRESHOLDS,
  formatCurrency,
  getWarningLevel,
  getWarningMessage,
} from '../../contracts/CostCalculation'

import type { ServiceResponse } from '../../contracts/types/common'

/**
 * Mock implementation of ICostCalculationService
 *
 * Provides realistic cost calculations based on Grok API pricing.
 * Handles all warning levels and cost formatting options.
 */
export class CostCalculationMock implements ICostCalculationService {
  /**
   * Calculate total cost from API usage data
   *
   * Workflow:
   * 1. Extract token counts from prompt usage
   * 2. Calculate text costs (input + output tokens)
   * 3. Extract image counts from image usage
   * 4. Calculate image costs (successful images only)
   * 5. Calculate vision costs (based on total images as proxy for vision requests)
   * 6. Sum all costs
   * 7. Determine warning level
   * 8. Check if can proceed
   */
  async calculateTotalCost(
    input: CalculateTotalCostInput
  ): Promise<ServiceResponse<CalculateTotalCostOutput>> {
    // Simulate minimal processing delay
    await this.simulateDelay(10, 50)

    try {
      // Calculate text costs
      const textCost = this.calculateTextCost(
        input.promptUsage.promptTokens,
        input.promptUsage.completionTokens
      )

      // Calculate image costs
      const imageCost = this.calculateImageCost(
        input.imageUsage.successfulImages,
        input.imageUsage.failedImages,
        input.imageUsage.totalImages
      )

      // Calculate vision costs
      // In real implementation, vision requests would be tracked separately
      // For mock, we estimate based on total images (assuming 1 vision request per image for prompt generation)
      const visionCost = this.calculateVisionCost(input.imageUsage.totalImages)

      // Calculate total cost
      const totalCost = textCost.totalCost + imageCost.totalCost + visionCost.totalCost

      // Determine warning level
      const warningLevel = getWarningLevel(totalCost)

      // Create cost summary
      const summary: CostSummary = {
        textCost,
        imageCost,
        visionCost,
        totalCost,
        warningLevel,
        formattedCost: formatCurrency(totalCost, 2),
      }

      // Determine if any threshold exceeded
      const exceeded = totalCost >= COST_THRESHOLDS.warning

      // Can proceed if under maximum threshold
      const canProceed = totalCost < COST_THRESHOLDS.maximum

      return {
        success: true,
        data: {
          summary,
          exceeded,
          canProceed,
        },
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CALCULATION_FAILED',
          message: 'Failed to calculate total cost',
          retryable: false,
        },
      }
    }
  }

  /**
   * Estimate cost before generation
   *
   * Provides estimate based on expected usage patterns:
   * - Prompt generation: ~1-2K input tokens, ~3-5K output tokens per request
   * - Vision API: 1 request per reference image
   * - Image generation: imageCount * $0.10
   */
  async estimateCost(
    input: EstimateCostInput
  ): Promise<ServiceResponse<EstimateCostOutput>> {
    // Simulate minimal processing delay
    await this.simulateDelay(10, 30)

    try {
      // Estimate prompt generation cost
      // Default: ~1000 input tokens, ~3000 output tokens per prompt generation
      const estimatedInputTokens = input.estimatedPromptLength || 1000
      const estimatedOutputTokens = (input.estimatedPromptLength || 1000) * 3

      const promptGenerationCost =
        estimatedInputTokens * GROK_PRICING.textInputTokens +
        estimatedOutputTokens * GROK_PRICING.textOutputTokens +
        input.referenceImageCount * GROK_PRICING.visionRequest

      // Estimate image generation cost
      const imageGenerationCost = input.imageCount * GROK_PRICING.imageGeneration

      // Total estimated cost
      const estimatedCost = promptGenerationCost + imageGenerationCost

      // Create estimate object
      const estimate: CostEstimate = {
        estimatedCost,
        breakdown: {
          promptGeneration: promptGenerationCost,
          imageGeneration: imageGenerationCost,
        },
        assumptions: [
          `Estimated ${estimatedInputTokens} input tokens for prompt generation`,
          `Estimated ${estimatedOutputTokens} output tokens for prompt generation`,
          `${input.referenceImageCount} vision API requests for reference images`,
          `${input.imageCount} images to generate at $${GROK_PRICING.imageGeneration} each`,
          'Assumes no retries or failures',
        ],
      }

      // Check if can afford
      const canAfford = estimatedCost < COST_THRESHOLDS.maximum

      // Get warning message if needed
      const warningLevel = getWarningLevel(estimatedCost)
      const warningMessage = canAfford ? undefined : getWarningMessage(warningLevel, estimatedCost)

      return {
        success: true,
        data: {
          estimate,
          canAfford,
          warningMessage,
        },
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CALCULATION_FAILED',
          message: 'Failed to estimate cost',
          retryable: false,
        },
      }
    }
  }

  /**
   * Format cost for display
   *
   * Supports three formats:
   * - detailed: Full breakdown with all components
   * - summary: Simple dollar amount
   * - minimal: Approximate dollar amount with ~ prefix
   */
  async formatCost(
    input: FormatCostInput
  ): Promise<ServiceResponse<FormatCostOutput>> {
    // Simulate minimal processing delay
    await this.simulateDelay(5, 15)

    try {
      const { cost, format = 'summary', includeWarning = false } = input

      // Format based on requested format
      let formatted: string

      switch (format) {
        case 'detailed':
          // For detailed format, we need to estimate breakdown
          // In real implementation, this would use actual breakdown data
          const textCostEstimate = cost * 0.05 // ~5% for text
          const imageCostEstimate = cost * 0.90 // ~90% for images
          const visionCostEstimate = cost * 0.05 // ~5% for vision
          formatted = `${formatCurrency(cost)} (prompts: ${formatCurrency(textCostEstimate)}, images: ${formatCurrency(imageCostEstimate)}, vision: ${formatCurrency(visionCostEstimate)})`
          break

        case 'minimal':
          formatted = `~${formatCurrency(cost)}`
          break

        case 'summary':
        default:
          formatted = formatCurrency(cost)
          break
      }

      // Get warning level
      const warningLevel = getWarningLevel(cost)

      // Get warning message if requested
      const warningMessage = includeWarning ? getWarningMessage(warningLevel, cost) : undefined

      return {
        success: true,
        data: {
          formatted,
          warningLevel,
          warningMessage,
        },
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CALCULATION_FAILED',
          message: 'Failed to format cost',
          retryable: false,
        },
      }
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Calculate text generation costs from token usage
   */
  private calculateTextCost(
    inputTokens: number,
    outputTokens: number
  ): TextCostBreakdown {
    const inputCost = inputTokens * GROK_PRICING.textInputTokens
    const outputCost = outputTokens * GROK_PRICING.textOutputTokens
    const totalCost = inputCost + outputCost

    return {
      inputTokens,
      outputTokens,
      inputCost,
      outputCost,
      totalCost,
    }
  }

  /**
   * Calculate image generation costs
   *
   * Note: Only successful images are charged
   * Retried images are calculated as totalImages - successfulImages - failedImages
   */
  private calculateImageCost(
    successfulImages: number,
    failedImages: number,
    totalImages: number
  ): ImageCostBreakdown {
    // Calculate retried images
    // Retried = total attempts - final successful - final failed
    const imagesRetried = Math.max(0, totalImages - successfulImages - failedImages)

    // Cost per image
    const generationCost = GROK_PRICING.imageGeneration

    // Total cost based on successful images only
    const totalCost = successfulImages * generationCost

    return {
      imagesGenerated: successfulImages,
      imagesFailed: failedImages,
      imagesRetried,
      generationCost,
      totalCost,
    }
  }

  /**
   * Calculate vision API costs
   *
   * In real implementation, this would track actual vision requests
   * For mock, we estimate based on image count (1 vision request per image)
   */
  private calculateVisionCost(requestCount: number): VisionCostBreakdown {
    const requestCost = GROK_PRICING.visionRequest
    const totalCost = requestCount * requestCost

    return {
      requestCount,
      requestCost,
      totalCost,
    }
  }

  /**
   * Simulate processing delay for realistic mock behavior
   */
  private async simulateDelay(minMs: number, maxMs: number): Promise<void> {
    const delay = Math.random() * (maxMs - minMs) + minMs
    return new Promise(resolve => setTimeout(resolve, delay))
  }
}
