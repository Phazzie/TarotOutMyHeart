/**
 * CostCalculationService — real implementation.
 * Pure math. No external dependencies. No failure modes expected.
 * Pricing:
 *   - Prompt/completion tokens: $5.00 per 1,000,000 total tokens
 *   - Image generation:        $0.07 per image
 */
import type { ApiUsage } from '../../contracts/PromptGeneration';
import type { TotalImageGenerationUsage } from '../../contracts/ImageGeneration';

const TOKENS_PER_DOLLAR = 1_000_000 / 5.0; // $5 per 1M tokens
const COST_PER_IMAGE = 0.07;
const DECIMAL_PRECISION = 4;

/** Round to N decimal places, avoiding floating-point drift. */
function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

export class CostCalculationService {
  async calculatePromptCost(usage: ApiUsage): Promise<ServiceResult<number>> {
    const cost = usage.totalTokens / TOKENS_PER_DOLLAR;
    return { success: true, data: round(cost, DECIMAL_PRECISION) };
  }

  async calculateImageCost(usage: TotalImageGenerationUsage): Promise<ServiceResult<number>> {
    // Only charge for images that were successfully generated (totalImages in this context
    // represents successful/completed images when failedImages is tracked separately).
    const cost = usage.totalImages * COST_PER_IMAGE;
    return { success: true, data: round(cost, DECIMAL_PRECISION) };
  }

  async calculateTotalCost(
    promptUsage: ApiUsage,
    imageUsage: TotalImageGenerationUsage,
  ): Promise<ServiceResult<{ prompt: number; images: number; total: number }>> {
    const promptResult = await this.calculatePromptCost(promptUsage);
    const imageResult = await this.calculateImageCost(imageUsage);

    if (!promptResult.success) return promptResult;
    if (!imageResult.success) return imageResult;

    const prompt = promptResult.data;
    const images = imageResult.data;
    const total = round(prompt + images, DECIMAL_PRECISION);

    return { success: true, data: { prompt, images, total } };
  }

  /**
   * Rough cost estimate before generation starts.
   * @param referenceImageCount - number of reference images used for vision prompting
   */
  async estimateCost(
    referenceImageCount: number,
  ): Promise<ServiceResult<{ min: number; typical: number; max: number }>> {
    // Image cost is fixed at 22 cards * $0.07
    const imageCost = round(22 * COST_PER_IMAGE, DECIMAL_PRECISION);

    // Prompt cost varies with token count; estimate based on reference image count.
    // Each reference image ≈ 500–2000 tokens for vision encoding.
    const minPromptCost = round(referenceImageCount * 0.02, DECIMAL_PRECISION);
    const typicalPromptCost = round(referenceImageCount * 0.05, DECIMAL_PRECISION);
    const maxPromptCost = round(referenceImageCount * 0.12, DECIMAL_PRECISION);

    return {
      success: true,
      data: {
        min: round(minPromptCost + imageCost, DECIMAL_PRECISION),
        typical: round(typicalPromptCost + imageCost, DECIMAL_PRECISION),
        max: round(maxPromptCost + imageCost, DECIMAL_PRECISION),
      },
    };
  }
}
