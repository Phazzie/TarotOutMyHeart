/**
 * @fileoverview TDD tests for DownloadService (real implementation).
 * Written BEFORE implementation — red phase.
 * PreMortem coverage:
 *   - SSR_UNAVAILABLE when window is undefined (Node.js/SSR)
 *   - Skips cards with null imageUrl (failed cards)
 *   - Does not throw on empty card array
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DownloadService, type GeneratedCardForDownload } from '../../services/real/DownloadService';

const makeCompletedCard = (n: number): GeneratedCardForDownload => ({
  cardNumber: n,
  cardName: `Card ${n}`,
  imageUrl: `https://blob.vercel.com/card${n}.png`,
  status: 'completed',
});

const makeFailedCard = (n: number): GeneratedCardForDownload => ({
  cardNumber: n,
  cardName: `Card ${n}`,
  imageUrl: null,
  status: 'failed',
});

describe('DownloadService', () => {
  let svc: DownloadService;

  beforeEach(() => {
    svc = new DownloadService();
    vi.restoreAllMocks();
  });

  describe('SSR safety (PreMortem #13)', () => {
    it('returns SSR_UNAVAILABLE when window is undefined', async () => {
      const origWindow = global.window;
      // @ts-expect-error intentionally removing window to simulate SSR
      delete global.window;
      const ssrSvc = new DownloadService();
      const result = await ssrSvc.downloadDeck([makeCompletedCard(0)]);
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.code).toBe('SSR_UNAVAILABLE');
      // Restore
      global.window = origWindow;
    });
  });

  describe('downloadDeck — browser context', () => {
    beforeEach(() => {
      // Mock URL.createObjectURL and revokeObjectURL (jsdom doesn't implement them)
      global.URL.createObjectURL = vi.fn().mockReturnValue('blob:fake-url');
      global.URL.revokeObjectURL = vi.fn();

      // Mock fetch for image downloads
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        blob: () => Promise.resolve(new Blob(['fake-image-data'], { type: 'image/png' })),
      }));

      // Mock document.createElement to return a mock anchor
      const mockAnchor = {
        href: '',
        download: '',
        click: vi.fn(),
        remove: vi.fn(),
        style: {},
      };
      vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as unknown as HTMLElement);
      vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockAnchor as unknown as Node);
    });

    it('returns success with correct counts for completed cards', async () => {
      // Mock jszip dynamic import
      const mockZip = {
        file: vi.fn(),
        generateAsync: vi.fn().mockResolvedValue(new Blob(['zip-content'])),
      };
      vi.mock('jszip', () => ({ default: vi.fn().mockImplementation(() => mockZip) }));

      const cards = [makeCompletedCard(0), makeCompletedCard(1), makeFailedCard(2)];
      const result = await svc.downloadDeck(cards);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.totalCards).toBe(3);
        expect(result.data.skippedCards).toBe(1); // 1 failed card skipped
      }
    });

    it('returns success with zero cards (edge case)', async () => {
      const mockZip = {
        file: vi.fn(),
        generateAsync: vi.fn().mockResolvedValue(new Blob(['empty-zip'])),
      };
      vi.mock('jszip', () => ({ default: vi.fn().mockImplementation(() => mockZip) }));

      const result = await svc.downloadDeck([]);
      expect(result.success).toBe(true);
    });
  });
});
