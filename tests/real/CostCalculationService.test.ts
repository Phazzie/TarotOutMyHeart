/**
 * @fileoverview TDD tests for CostCalculationService (real implementation).
 */
import { describe, it, expect } from 'vitest';
import { CostCalculationService } from '../../services/real/CostCalculationService';
import type { ApiUsage } from '$contracts/PromptGeneration';
import type { TotalImageGenerationUsage } from '$contracts/ImageGeneration';
import { GROK_MODELS } from '$contracts/PromptGeneration';

describe('CostCalculationService', () => {
  const svc = new CostCalculationService();

  const promptUsage: ApiUsage = {
    model: GROK_MODELS.vision,
    promptTokens: 5000,
    completionTokens: 15000,
    totalTokens: 20000,
    estimatedCost: 0.16,
  };

  const imageUsage: TotalImageGenerationUsage = {
    totalImages: 22,
    successfulImages: 22,
    failedImages: 0,
    estimatedCost: 2.2,
    totalGenerationTime: 330,
    usagePerCard: [],
  };

  describe('calculateTotalCost', () => {
    it('returns cost summary on success', async () => {
      const result = await svc.calculateTotalCost({ promptUsage, imageUsage });
      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data.canProceed).toBe(true);
        expect(result.data.summary.totalCost).toBeGreaterThan(0);
      }
    });

    it('returns error when missing prompt usage', async () => {
      const result = await svc.calculateTotalCost({ promptUsage: null as any, imageUsage });
      expect(result.success).toBe(false);
    });
  });

  describe('estimateCost', () => {
    it('returns estimate for valid image and reference counts', async () => {
      const result = await svc.estimateCost({ imageCount: 22, referenceImageCount: 3 });
      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data.estimate.estimatedCost).toBeGreaterThan(0);
        expect(result.data.canAfford).toBe(true);
      }
    });
  });
});
