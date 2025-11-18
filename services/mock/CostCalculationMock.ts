/**
 * @fileoverview Mock implementation of Cost Calculation service
 * @purpose Provide realistic API cost calculations and tracking
 * @dataFlow API Usage Data → Cost Calculation → Formatted Display
 * @mockBehavior
 *   - Calculates costs from usage data
 *   - Applies Grok pricing structure
 *   - Formats costs for display
 *   - Tracks total session costs
 *   - Simulates minimal delays (50ms)
 * @dependencies contracts/CostCalculation.ts
 * @updated 2025-11-07
 */

import type {
  ICostCalculationService,
  CalculateTotalCostInput,
  CalculateTotalCostOutput,
  CalculatePromptCostInput,
  CalculatePromptCostOutput,
  CalculateImageCostInput,
  CalculateImageCostOutput,
  FormatCostInput,
  FormatCostOutput,
  GetCostSummaryOutput,
  TextCostBreakdown,
  ImageCostBreakdown,
  TotalCostBreakdown,
  CostSummary,
} from '$contracts/CostCalculation'

import { GROK_PRICING } from '$contracts/CostCalculation'
import type { ServiceResponse } from '$contracts/types/common'

/**
 * Mock implementation of CostCalculationService
 *
 * Calculates and formats API costs based on Grok pricing.
 */
export class CostCalculationMockService implements ICostCalculationService {
  private sessionCosts: TotalCostBreakdown[] = []

  /**
   * Calculate total cost from all operations
   */
  async calculateTotalCost(
    input: CalculateTotalCostInput
  ): Promise<ServiceResponse<CalculateTotalCostOutput>> {
    await this.delay(50)

    const { promptUsage, imageUsage } = input

    // Calculate text costs
    const textBreakdown: TextCostBreakdown = {
      inputTokens: promptUsage.promptTokens,
      outputTokens: promptUsage.completionTokens,
      inputCost: promptUsage.promptTokens * GROK_PRICING.textInputTokens,
      outputCost: promptUsage.completionTokens * GROK_PRICING.textOutputTokens,
      totalCost: 0,
    }
    textBreakdown.totalCost = textBreakdown.inputCost + textBreakdown.outputCost

    // Calculate image costs
    const imageBreakdown: ImageCostBreakdown = {
      imagesGenerated: imageUsage.successfulImages,
      imagesFailed: imageUsage.failedImages,
      imagesRetried: 0, // Mock: no retries tracked
      generationCost: GROK_PRICING.imageGeneration,
      totalCost: imageUsage.successfulImages * GROK_PRICING.imageGeneration,
    }

    // Total breakdown
    const totalCost = textBreakdown.totalCost + imageBreakdown.totalCost
    const costBreakdown: TotalCostBreakdown = {
      textCost: textBreakdown,
      imageCost: imageBreakdown,
      totalCost,
      currency: 'USD',
    }

    // Save to session
    this.sessionCosts.push(costBreakdown)

    return {
      success: true,
      data: {
        costBreakdown,
        totalCost,
        currency: 'USD',
      },
    }
  }

  /**
   * Calculate cost for prompt generation only
   */
  async calculatePromptCost(
    input: CalculatePromptCostInput
  ): Promise<ServiceResponse<CalculatePromptCostOutput>> {
    await this.delay(50)

    const { promptUsage } = input

    const textBreakdown: TextCostBreakdown = {
      inputTokens: promptUsage.promptTokens,
      outputTokens: promptUsage.completionTokens,
      inputCost: promptUsage.promptTokens * GROK_PRICING.textInputTokens,
      outputCost: promptUsage.completionTokens * GROK_PRICING.textOutputTokens,
      totalCost: 0,
    }
    textBreakdown.totalCost = textBreakdown.inputCost + textBreakdown.outputCost

    return {
      success: true,
      data: {
        textBreakdown,
        totalCost: textBreakdown.totalCost,
        currency: 'USD',
      },
    }
  }

  /**
   * Calculate cost for image generation only
   */
  async calculateImageCost(
    input: CalculateImageCostInput
  ): Promise<ServiceResponse<CalculateImageCostOutput>> {
    await this.delay(50)

    const { imageUsage } = input

    const imageBreakdown: ImageCostBreakdown = {
      imagesGenerated: imageUsage.successfulImages,
      imagesFailed: imageUsage.failedImages,
      imagesRetried: 0,
      generationCost: GROK_PRICING.imageGeneration,
      totalCost: imageUsage.successfulImages * GROK_PRICING.imageGeneration,
    }

    return {
      success: true,
      data: {
        imageBreakdown,
        totalCost: imageBreakdown.totalCost,
        currency: 'USD',
      },
    }
  }

  /**
   * Format cost for display
   */
  async formatCost(input: FormatCostInput): Promise<ServiceResponse<FormatCostOutput>> {
    await this.delay(50)

    const { cost, format } = input

    let formattedCost: string

    switch (format) {
      case 'detailed':
        formattedCost = `$${cost.toFixed(4)} USD`
        break
      case 'summary':
        formattedCost = `$${cost.toFixed(2)}`
        break
      case 'minimal':
        formattedCost = cost < 0.01 ? '<$0.01' : `$${cost.toFixed(2)}`
        break
      default:
        formattedCost = `$${cost.toFixed(2)}`
    }

    return {
      success: true,
      data: {
        formatted: formattedCost,
        raw: cost,
        currency: 'USD',
      },
    }
  }

  /**
   * Get cost summary for session
   */
  async getCostSummary(): Promise<ServiceResponse<GetCostSummaryOutput>> {
    await this.delay(50)

    const totalSessionCost = this.sessionCosts.reduce(
      (sum, breakdown) => sum + breakdown.totalCost,
      0
    )
    const totalOperations = this.sessionCosts.length

    const summary: CostSummary = {
      totalCost: totalSessionCost,
      operationCount: totalOperations,
      breakdown: this.sessionCosts,
      currency: 'USD',
    }

    return {
      success: true,
      data: {
        summary,
      },
    }
  }

  /**
   * Clear cost history
   */
  async clearCostHistory(): Promise<ServiceResponse<void>> {
    await this.delay(50)

    this.sessionCosts = []

    return {
      success: true,
      data: undefined,
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

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
export const costCalculationMockService = new CostCalculationMockService()
