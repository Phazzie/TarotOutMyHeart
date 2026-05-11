/**
 * @fileoverview TDD tests for CostCalculationService (real implementation).
 * Written BEFORE implementation — these must fail first (red phase).
 * PreMortem coverage: pure math, no external dependencies, no failure modes expected.
 */
import { describe, it, expect } from 'vitest';
import { CostCalculationService } from '../../services/real/CostCalculationService';

// Inline types matching the contract shapes — avoids import alias resolution issues in vitest
interface ApiUsage {
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
}

interface TotalImageGenerationUsage {
  totalImages: number;
  failedImages: number;
  estimatedCost: number;
}

describe('CostCalculationService', () => {
  const svc = new CostCalculationService();

  describe('calculatePromptCost', () => {
    it('returns zero cost for zero tokens', async () => {
      const usage: ApiUsage = { model: 'grok-4-fast-reasoning', promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCost: 0 };
      const result = await svc.calculatePromptCost(usage);
      expect(result.success).toBe(true);
      if (result.success) expect(result.data).toBe(0);
    });

    it('calculates cost at $5 per 1M tokens', async () => {
      const usage: ApiUsage = { model: 'grok-4-fast-reasoning', promptTokens: 500000, completionTokens: 500000, totalTokens: 1_000_000, estimatedCost: 0 };
      const result = await svc.calculatePromptCost(usage);
      expect(result.success).toBe(true);
      if (result.success) expect(result.data).toBeCloseTo(5.0, 2);
    });

    it('rounds to 4 decimal places', async () => {
      const usage: ApiUsage = { model: 'grok-4-fast-reasoning', promptTokens: 1000, completionTokens: 0, totalTokens: 1000, estimatedCost: 0 };
      const result = await svc.calculatePromptCost(usage);
      expect(result.success).toBe(true);
      if (result.success) {
        const str = result.data.toString();
        const decimals = str.includes('.') ? str.split('.')[1].length : 0;
        expect(decimals).toBeLessThanOrEqual(4);
      }
    });
  });

  describe('calculateImageCost', () => {
    it('calculates cost at $0.07 per image', async () => {
      const usage: TotalImageGenerationUsage = { totalImages: 22, failedImages: 0, estimatedCost: 0 };
      const result = await svc.calculateImageCost(usage);
      expect(result.success).toBe(true);
      if (result.success) expect(result.data).toBeCloseTo(1.54, 2);
    });

    it('returns zero for zero completed images', async () => {
      const usage: TotalImageGenerationUsage = { totalImages: 0, failedImages: 22, estimatedCost: 0 };
      const result = await svc.calculateImageCost(usage);
      expect(result.success).toBe(true);
      if (result.success) expect(result.data).toBe(0);
    });
  });

  describe('calculateTotalCost', () => {
    it('sums prompt and image costs', async () => {
      const promptUsage: ApiUsage = { model: 'grok-4-fast-reasoning', promptTokens: 0, completionTokens: 0, totalTokens: 1_000_000, estimatedCost: 0 };
      const imageUsage: TotalImageGenerationUsage = { totalImages: 22, failedImages: 0, estimatedCost: 0 };
      const result = await svc.calculateTotalCost(promptUsage, imageUsage);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.prompt).toBeCloseTo(5.0, 2);
        expect(result.data.images).toBeCloseTo(1.54, 2);
        expect(result.data.total).toBeCloseTo(6.54, 2);
      }
    });
  });

  describe('estimateCost', () => {
    it('returns min less than typical less than max', async () => {
      const result = await svc.estimateCost(3);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.min).toBeLessThan(result.data.typical);
        expect(result.data.typical).toBeLessThan(result.data.max);
      }
    });

    it('returns higher estimate for more images', async () => {
      const low = await svc.estimateCost(1);
      const high = await svc.estimateCost(5);
      expect(low.success && high.success).toBe(true);
      if (low.success && high.success) {
        expect(high.data.typical).toBeGreaterThan(low.data.typical);
      }
    });
  });
});
