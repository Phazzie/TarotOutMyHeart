/**
 * @fileoverview Cost Calculation Contract - Track and display API usage costs
 * @purpose Define the seam between API usage metrics and cost display
 * @dataFlow API Usage Data → Cost Calculation → User-Facing Cost Display
 * @boundary Seam #6: CostCalculationSeam - Calculate and display Grok API costs
 * @requirement PRD Section: "User Flow - Display estimated costs"
 * @updated 2025-11-07
 *
 * @example
 * ```typescript
 * const result = await costService.calculateTotalCost({
 *   promptUsage: promptResult.usage,
 *   imageUsage: imageResult.totalUsage
 * });
 *
 * console.log(`Total cost: $${result.data.totalCost.toFixed(4)}`);
 * ```
 */

import type { ServiceResponse } from './types/common'
import type { ApiUsage } from './PromptGeneration'
import type { TotalImageGenerationUsage } from './ImageGeneration'

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Grok API pricing (as of 2025-11-07)
 * Prices in USD per unit
 *
 * NOTE: These prices must be kept up-to-date with Grok's actual pricing.
 * See: https://x.ai/api/pricing
 */
export const GROK_PRICING = {
  // Text generation (grok-4-fast-reasoning)
  textInputTokens: 0.000002, // $0.002 per 1K tokens
  textOutputTokens: 0.00001, // $0.010 per 1K tokens

  // Image generation (grok-2-image-alpha)
  imageGeneration: 0.1, // $0.10 per image

  // Vision API (grok-vision-beta)
  visionRequest: 0.05, // $0.05 per request (assumed - verify with X.AI)
} as const

/**
 * Cost warning thresholds
 */
export const COST_THRESHOLDS = {
  warning: 5.0, // Warn user if cost exceeds $5
  high: 10.0, // Show high cost warning if exceeds $10
  maximum: 20.0, // Maximum allowed cost
} as const

/**
 * Cost display formats
 */
export const COST_FORMATS = ['detailed', 'summary', 'minimal'] as const

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Cost format type
 */
export type CostFormat = (typeof COST_FORMATS)[number]

// ============================================================================
// CORE DATA STRUCTURES
// ============================================================================

/**
 * Cost breakdown for text generation (prompts)
 *
 * @property inputTokens - Number of input tokens used
 * @property outputTokens - Number of output tokens generated
 * @property inputCost - Cost of input tokens
 * @property outputCost - Cost of output tokens
 * @property totalCost - Total text generation cost
 */
export interface TextCostBreakdown {
  inputTokens: number
  outputTokens: number
  inputCost: number
  outputCost: number
  totalCost: number
}

/**
 * Cost breakdown for image generation
 *
 * @property imagesGenerated - Number of images successfully generated
 * @property imagesFailed - Number of failed generations
 * @property imagesRetried - Number of retry attempts
 * @property generationCost - Cost per image
 * @property totalCost - Total image generation cost
 */
export interface ImageCostBreakdown {
  imagesGenerated: number
  imagesFailed: number
  imagesRetried: number
  generationCost: number
  totalCost: number
}

/**
 * Cost breakdown for vision API (prompt generation)
 *
 * @property requestCount - Number of vision API requests
 * @property requestCost - Cost per request
 * @property totalCost - Total vision API cost
 */
export interface VisionCostBreakdown {
  requestCount: number
  requestCost: number
  totalCost: number
}

/**
 * Complete cost summary
 *
 * @property textCost - Text generation costs
 * @property imageCost - Image generation costs
 * @property visionCost - Vision API costs
 * @property totalCost - Total cost across all services
 * @property warningLevel - Cost warning level (none/warning/high/maximum)
 * @property formattedCost - Human-readable cost string
 */
export interface CostSummary {
  textCost: TextCostBreakdown
  imageCost: ImageCostBreakdown
  visionCost: VisionCostBreakdown
  totalCost: number
  warningLevel: 'none' | 'warning' | 'high' | 'maximum'
  formattedCost: string
}

/**
 * Cost estimate before generation
 *
 * @property estimatedCost - Estimated total cost
 * @property breakdown - Breakdown by service
 * @property assumptions - Assumptions made for estimate
 */
export interface CostEstimate {
  estimatedCost: number
  breakdown: {
    promptGeneration: number
    imageGeneration: number
  }
  assumptions: string[]
}

// ============================================================================
// INPUT CONTRACTS
// ============================================================================

/**
 * Input for calculating total cost
 *
 * @property promptUsage - API usage from prompt generation
 * @property imageUsage - API usage from image generation
 */
export interface CalculateTotalCostInput {
  promptUsage: ApiUsage
  imageUsage: TotalImageGenerationUsage
}

/**
 * Input for estimating cost before generation
 *
 * @property imageCount - Number of images to generate (typically 22)
 * @property referenceImageCount - Number of reference images (1-5)
 * @property estimatedPromptLength - Estimated prompt length in tokens
 */
export interface EstimateCostInput {
  imageCount: number
  referenceImageCount: number
  estimatedPromptLength?: number
}

/**
 * Input for formatting cost display
 *
 * @property cost - Cost to format
 * @property format - Display format
 * @property includeWarning - Include warning text
 */
export interface FormatCostInput {
  cost: number
  format?: CostFormat
  includeWarning?: boolean
}

// ============================================================================
// OUTPUT CONTRACTS
// ============================================================================

/**
 * Result of calculating total cost
 *
 * @property summary - Complete cost summary
 * @property exceeded - Whether cost exceeded any threshold
 * @property canProceed - Whether generation can proceed (under maximum)
 */
export interface CalculateTotalCostOutput {
  summary: CostSummary
  exceeded: boolean
  canProceed: boolean
}

/**
 * Result of estimating cost
 *
 * @property estimate - Cost estimate
 * @property canAfford - Whether under maximum threshold
 * @property warningMessage - Warning message if applicable
 */
export interface EstimateCostOutput {
  estimate: CostEstimate
  canAfford: boolean
  warningMessage?: string
}

/**
 * Result of formatting cost
 *
 * @property formatted - Formatted cost string
 * @property warningLevel - Warning level
 * @property warningMessage - Warning message if applicable
 */
export interface FormatCostOutput {
  formatted: string
  warningLevel: 'none' | 'warning' | 'high' | 'maximum'
  warningMessage?: string
}

// ============================================================================
// ERROR CODES
// ============================================================================

/**
 * All possible error codes for cost operations
 */
export enum CostCalculationErrorCode {
  // Input validation
  INVALID_USAGE_DATA = 'INVALID_USAGE_DATA',
  MISSING_PROMPT_USAGE = 'MISSING_PROMPT_USAGE',
  MISSING_IMAGE_USAGE = 'MISSING_IMAGE_USAGE',
  INVALID_IMAGE_COUNT = 'INVALID_IMAGE_COUNT',

  // Calculation errors
  NEGATIVE_COST = 'NEGATIVE_COST',
  COST_OVERFLOW = 'COST_OVERFLOW',
  CALCULATION_FAILED = 'CALCULATION_FAILED',

  // Cost limits
  COST_EXCEEDS_MAXIMUM = 'COST_EXCEEDS_MAXIMUM',
  INSUFFICIENT_BUDGET = 'INSUFFICIENT_BUDGET',
}

// ============================================================================
// SERVICE INTERFACE (THE CONTRACT)
// ============================================================================

/**
 * Cost Calculation Service Contract
 *
 * Defines all operations for calculating and displaying API costs.
 * Implementation handles:
 * - Parsing usage data from API responses
 * - Calculating costs based on current pricing
 * - Generating cost breakdowns
 * - Formatting costs for display
 * - Checking against thresholds
 *
 * @interface ICostCalculationService
 */
export interface ICostCalculationService {
  /**
   * Calculate total cost from usage data
   *
   * Workflow:
   * 1. Extract token usage from prompt generation
   * 2. Extract image counts from image generation
   * 3. Calculate text costs (input + output tokens)
   * 4. Calculate image costs (successful + retries)
   * 5. Calculate vision API costs
   * 6. Sum totals
   * 7. Check against thresholds
   * 8. Generate warning level
   *
   * @param input - Usage data from both APIs
   * @returns Promise<ServiceResponse<CalculateTotalCostOutput>> - Cost summary
   *
   * @throws Never throws - all errors returned in ServiceResponse
   *
   * @example
   * ```typescript
   * const result = await service.calculateTotalCost({
   *   promptUsage: {
   *     totalInputTokens: 5000,
   *     totalOutputTokens: 15000,
   *     requestCount: 1,
   *     model: 'grok-4-fast-reasoning'
   *   },
   *   imageUsage: {
   *     totalImagesGenerated: 22,
   *     totalImagesFailed: 1,
   *     totalImagesRetried: 1,
   *     totalGenerationTime: 120000
   *   }
   * });
   *
   * if (result.success) {
   *   console.log(result.data.summary.formattedCost);
   *   if (!result.data.canProceed) {
   *     alert('Cost exceeds maximum allowed');
   *   }
   * }
   * ```
   */
  calculateTotalCost(
    input: CalculateTotalCostInput
  ): Promise<ServiceResponse<CalculateTotalCostOutput>>

  /**
   * Estimate cost before generation
   *
   * Provides estimate based on:
   * - Number of images to generate
   * - Number of reference images
   * - Estimated prompt length
   *
   * @param input - Estimation parameters
   * @returns Promise<ServiceResponse<EstimateCostOutput>> - Cost estimate
   *
   * @example
   * ```typescript
   * const result = await service.estimateCost({
   *   imageCount: 22,
   *   referenceImageCount: 3,
   *   estimatedPromptLength: 1000
   * });
   *
   * if (result.success) {
   *   if (result.data.canAfford) {
   *     console.log(`Estimated: $${result.data.estimate.estimatedCost.toFixed(2)}`);
   *   } else {
   *     alert(result.data.warningMessage);
   *   }
   * }
   * ```
   */
  estimateCost(input: EstimateCostInput): Promise<ServiceResponse<EstimateCostOutput>>

  /**
   * Format cost for display
   *
   * Supports multiple formats:
   * - detailed: "$2.34 (prompts: $0.12, images: $2.20, vision: $0.02)"
   * - summary: "$2.34"
   * - minimal: "~$2.34"
   *
   * @param input - Cost and format options
   * @returns Promise<ServiceResponse<FormatCostOutput>> - Formatted string
   *
   * @example
   * ```typescript
   * const result = await service.formatCost({
   *   cost: 2.345,
   *   format: 'detailed',
   *   includeWarning: true
   * });
   * ```
   */
  formatCost(input: FormatCostInput): Promise<ServiceResponse<FormatCostOutput>>
}

// ============================================================================
// USER-FRIENDLY ERROR MESSAGES
// ============================================================================

/**
 * Maps error codes to user-friendly messages
 */
export const COST_CALCULATION_ERROR_MESSAGES: Record<CostCalculationErrorCode, string> = {
  [CostCalculationErrorCode.INVALID_USAGE_DATA]: 'Invalid API usage data provided',
  [CostCalculationErrorCode.MISSING_PROMPT_USAGE]: 'Missing prompt generation usage data',
  [CostCalculationErrorCode.MISSING_IMAGE_USAGE]: 'Missing image generation usage data',
  [CostCalculationErrorCode.INVALID_IMAGE_COUNT]: 'Invalid image count for estimation',

  [CostCalculationErrorCode.NEGATIVE_COST]: 'Calculated cost is negative - data may be invalid',
  [CostCalculationErrorCode.COST_OVERFLOW]: 'Cost calculation resulted in overflow',
  [CostCalculationErrorCode.CALCULATION_FAILED]: 'Failed to calculate cost',

  [CostCalculationErrorCode.COST_EXCEEDS_MAXIMUM]:
    'Estimated cost exceeds maximum allowed ($20.00)',
  [CostCalculationErrorCode.INSUFFICIENT_BUDGET]: 'Insufficient budget for this operation',
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format cost as currency string
 *
 * @param cost - Cost in USD
 * @param decimals - Number of decimal places (default 2)
 * @returns Formatted string (e.g., "$2.34")
 */
export function formatCurrency(cost: number, decimals: number = 2): string {
  return `$${cost.toFixed(decimals)}`
}

/**
 * Determine warning level for cost
 *
 * @param cost - Total cost
 * @returns Warning level
 */
export function getWarningLevel(cost: number): 'none' | 'warning' | 'high' | 'maximum' {
  if (cost >= COST_THRESHOLDS.maximum) return 'maximum'
  if (cost >= COST_THRESHOLDS.high) return 'high'
  if (cost >= COST_THRESHOLDS.warning) return 'warning'
  return 'none'
}

/**
 * Get warning message for cost level
 *
 * @param level - Warning level
 * @param cost - Actual cost
 * @returns Warning message or undefined
 */
export function getWarningMessage(
  level: 'none' | 'warning' | 'high' | 'maximum',
  cost: number
): string | undefined {
  switch (level) {
    case 'maximum':
      return `Cost of ${formatCurrency(cost)} exceeds maximum allowed (${formatCurrency(COST_THRESHOLDS.maximum)}). Generation cannot proceed.`
    case 'high':
      return `High cost alert: ${formatCurrency(cost)}. Please review before proceeding.`
    case 'warning':
      return `Cost of ${formatCurrency(cost)} is above normal range. Proceed with caution.`
    case 'none':
      return undefined
  }
}

// ============================================================================
// METADATA
// ============================================================================

/**
 * Contract metadata for tracking and documentation
 */
export const COST_CALCULATION_CONTRACT_METADATA = {
  version: '1.0.0',
  seam: 'CostCalculationSeam',
  boundary: 'API Usage Data → Cost Calculation → User Display',
  requirement: 'PRD: Display estimated costs',
  lastUpdated: '2025-11-07',
  dependencies: ['PromptGeneration', 'ImageGeneration'],
  pricingSource: 'https://x.ai/api/pricing',
  pricingLastVerified: '2025-11-07',
} as const
