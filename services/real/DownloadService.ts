/**
 * DownloadService — real implementation.
 * Browser-ONLY. Uses JSZip to package all card images into a single ZIP download.
 *
 * PreMortem protections:
 *   - SSR_UNAVAILABLE: returns graceful error when window is undefined (Node.js/SSR)
 *   - JSZIP_UNAVAILABLE: dynamic import failure (CDN down, not installed)
 *   - Missing imageUrl: skips cards with null imageUrl, warns in result
 *   - CORS: images must be from same origin or have permissive CORS headers
 */

export interface GeneratedCardForDownload {
  cardNumber: number;
  cardName: string;
  imageUrl: string | null;
  status: 'completed' | 'failed';
}

export interface DownloadResult {
  totalCards: number;
  downloadedCards: number;
  skippedCards: number;
}

type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

export class DownloadService {
  async downloadDeck(
    cards: GeneratedCardForDownload[],
    fileName = 'tarot-deck.zip',
  ): Promise<ServiceResult<DownloadResult>> {
    // ── SSR guard ──────────────────────────────────────────────────────────────
    if (typeof window === 'undefined') {
      return {
        success: false,
        error: {
          code: 'SSR_UNAVAILABLE',
          message: 'ZIP download is only available in the browser.',
        },
      };
    }

    // ── Load JSZip dynamically so the module compiles in SSR without crashing ──
    let JSZip: typeof import('jszip');
    try {
      JSZip = await import('jszip');
    } catch {
      return {
        success: false,
        error: { code: 'JSZIP_UNAVAILABLE', message: 'Failed to load ZIP library.' },
      };
    }

    const zip = new JSZip.default();
    const completedCards = cards.filter(
      (c) => c.status === 'completed' && c.imageUrl !== null,
    );
    const skippedCards = cards.length - completedCards.length;

    // ── Fetch and zip each image ───────────────────────────────────────────────
    const fetchPromises = completedCards.map(async (card) => {
      try {
        const response = await fetch(card.imageUrl as string);
        const blob = await response.blob();
        const ext = blob.type === 'image/jpeg' ? 'jpg' : 'png';
        const paddedNum = String(card.cardNumber).padStart(2, '0');
        const safeName = card.cardName.replace(/\s+/g, '_');
        zip.file(`${paddedNum}_${safeName}.${ext}`, blob);
      } catch {
        // Skip individual card failures rather than aborting the whole download
      }
    });

    await Promise.all(fetchPromises);

    // ── Generate ZIP blob and trigger browser download ─────────────────────────
    try {
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (err) {
      return {
        success: false,
        error: {
          code: 'DOWNLOAD_FAILED',
          message: err instanceof Error ? err.message : 'Failed to generate ZIP.',
        },
      };
    }

    return {
      success: true,
      data: {
        totalCards: cards.length,
        downloadedCards: completedCards.length,
        skippedCards,
      },
    };
  }
}
