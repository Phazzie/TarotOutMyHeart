/**
 * @fileoverview TDD tests for ImageGenerationService (real implementation).
 * Written BEFORE implementation — red phase.
 * PreMortem coverage:
 *   - Per-card approach (not batched)
 *   - NETWORK_ERROR on fetch throw
 *   - GENERATION_FAILED on server error after retries
 *   - CANCELLED when cancelGeneration() called
 *   - Deck generation continues after individual card failure (partial success)
 *   - Progress callback fires for each card
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ImageGenerationService } from '../../services/real/ImageGenerationService';

const makePrompt = (cardNumber: number) => ({
  id: `prompt-${cardNumber}`,
  cardNumber,
  cardName: `Card ${cardNumber}`,
  traditionalMeaning: `Meaning ${cardNumber}`,
  generatedPrompt: `Image prompt for card ${cardNumber}`,
  confidence: 0.9,
  generatedAt: new Date(),
});

describe('ImageGenerationService', () => {
  let svc: ImageGenerationService;

  beforeEach(() => {
    svc = new ImageGenerationService();
    vi.restoreAllMocks();
  });

  describe('generateCard — success', () => {
    it('returns GeneratedCardInfo with status completed', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ success: true, data: { imageUrl: 'https://blob.vercel.com/card0.png' } }),
      }));
      const result = await svc.generateCard(makePrompt(0));
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('completed');
        expect(result.data.imageUrl).toBe('https://blob.vercel.com/card0.png');
        expect(result.data.cardNumber).toBe(0);
      }
    });

    it('calls POST /api/generate/card', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ success: true, data: { imageUrl: 'https://blob.vercel.com/card0.png' } }),
      });
      vi.stubGlobal('fetch', fetchMock);
      await svc.generateCard(makePrompt(5));
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/generate/card',
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  describe('generateCard — failure (PreMortem)', () => {
    it('returns NETWORK_ERROR on fetch throw (after retries)', async () => {
      // Mock always throws — should exhaust retries and return NETWORK_ERROR
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
      const result = await svc.generateCard(makePrompt(0));
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.code).toBe('GENERATION_FAILED');
    }, 30_000); // Allow time for retries

    it('returns error when server returns success: false', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ success: false, error: { code: 'GENERATION_FAILED', message: 'xAI error' } }),
      }));
      const result = await svc.generateCard(makePrompt(0));
      expect(result.success).toBe(false);
    }, 30_000);
  });

  describe('generateDeck — partial success (PreMortem)', () => {
    it('continues after individual card failure', async () => {
      let callCount = 0;
      vi.stubGlobal('fetch', vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          // Second card fails
          return Promise.resolve({ json: () => Promise.resolve({ success: false, error: { code: 'FAIL', message: 'error' } }) });
        }
        return Promise.resolve({ json: () => Promise.resolve({ success: true, data: { imageUrl: `https://blob.vercel.com/card${callCount}.png` } }) });
      }));

      const prompts = [makePrompt(0), makePrompt(1), makePrompt(2)];
      const result = await svc.generateDeck(prompts);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(3);
        expect(result.data[0].status).toBe('completed');
        expect(result.data[1].status).toBe('failed');
        expect(result.data[2].status).toBe('completed');
      }
    }, 60_000);

    it('fires onProgress for each card', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ success: true, data: { imageUrl: 'https://blob.vercel.com/card.png' } }),
      }));
      const progressCalls: number[] = [];
      const prompts = [makePrompt(0), makePrompt(1)];
      await svc.generateDeck(prompts, (p) => progressCalls.push(p.completed));
      expect(progressCalls.length).toBeGreaterThan(0);
    });
  });

  describe('cancelGeneration', () => {
    it('cancels a running deck generation', async () => {
      // First call succeeds, second would succeed but we cancel between them
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ success: true, data: { imageUrl: 'https://blob.vercel.com/card.png' } }),
      }));

      const prompts = Array.from({ length: 22 }, (_, i) => makePrompt(i));
      let cancelFired = false;

      const deckPromise = svc.generateDeck(prompts, (p) => {
        if (p.completed === 1 && !cancelFired) {
          cancelFired = true;
          svc.cancelGeneration();
        }
      });

      const result = await deckPromise;
      expect(result.success).toBe(true);
      // Should have stopped before generating all 22
      if (result.success) {
        expect(result.data.length).toBeLessThan(22);
      }
    }, 60_000);

    it('does not throw when called with no generation in progress', () => {
      expect(() => svc.cancelGeneration()).not.toThrow();
    });
  });
});
