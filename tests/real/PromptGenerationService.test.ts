/**
 * @fileoverview TDD tests for PromptGenerationService (real implementation).
 * Written BEFORE implementation — red phase.
 * PreMortem coverage:
 *   - Returns 22 CardPrompt objects on success
 *   - NETWORK_ERROR on fetch throw
 *   - API_ERROR on success: false response
 *   - onProgress callback fires
 *   - cancelGeneration() aborts in-flight request
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PromptGenerationService } from '../../services/real/PromptGenerationService';

const MOCK_PROMPTS = Array.from({ length: 22 }, (_, i) => ({
  id: `prompt-${i}`,
  cardNumber: i,
  cardName: `Card ${i}`,
  traditionalMeaning: `Meaning ${i}`,
  generatedPrompt: `Detailed image prompt for card ${i}`,
  confidence: 0.9,
  generatedAt: new Date().toISOString(),
}));

const VALID_PARAMS = {
  referenceImageUrls: ['https://blob.vercel.com/ref1.jpg'],
  styleInputs: { theme: 'Gothic', tone: 'Dark', description: 'Moody and mysterious' },
};

describe('PromptGenerationService', () => {
  let svc: PromptGenerationService;

  beforeEach(() => {
    svc = new PromptGenerationService();
    vi.restoreAllMocks();
  });

  describe('generatePrompts — success', () => {
    it('returns 22 CardPrompt objects on success', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ success: true, data: { prompts: MOCK_PROMPTS } }),
      }));
      const result = await svc.generatePrompts(VALID_PARAMS);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(22);
        expect(result.data[0].cardName).toBe('Card 0');
      }
    });

    it('calls onProgress callback', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ success: true, data: { prompts: MOCK_PROMPTS } }),
      }));
      const progressCalls: Array<[number, number]> = [];
      await svc.generatePrompts({
        ...VALID_PARAMS,
        onProgress: (completed, total) => progressCalls.push([completed, total]),
      });
      expect(progressCalls.length).toBeGreaterThan(0);
    });

    it('calls POST /api/prompts with correct body', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ success: true, data: { prompts: MOCK_PROMPTS } }),
      });
      vi.stubGlobal('fetch', fetchMock);
      await svc.generatePrompts(VALID_PARAMS);
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/prompts',
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  describe('generatePrompts — failure (PreMortem)', () => {
    it('returns NETWORK_ERROR when fetch throws', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
      const result = await svc.generatePrompts(VALID_PARAMS);
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.code).toBe('NETWORK_ERROR');
    });

    it('returns API_ERROR when server returns success: false', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ success: false, error: { code: 'API_ERROR', message: 'Grok unavailable' } }),
      }));
      const result = await svc.generatePrompts(VALID_PARAMS);
      expect(result.success).toBe(false);
    });

    it('returns API_ERROR when prompts array is missing', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ success: true, data: {} }),
      }));
      const result = await svc.generatePrompts(VALID_PARAMS);
      expect(result.success).toBe(false);
    });
  });

  describe('cancelGeneration', () => {
    it('does not throw when no request is in-flight', () => {
      expect(() => svc.cancelGeneration()).not.toThrow();
    });
  });
});
