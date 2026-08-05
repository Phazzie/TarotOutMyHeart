/**
 * @fileoverview DownloadService — real implementation.
 * Browser-ONLY. Uses JSZip to package card images into ZIP downloads.
 * Implements IDownloadService strictly without type escapes.
 */

import type { ServiceResponse } from '$contracts/types/common';
import type {
  IDownloadService,
  DownloadDeckInput,
  DownloadDeckOutput,
  DownloadCardInput,
  DownloadCardOutput,
  PrepareDownloadInput,
  PrepareDownloadOutput,
  DeckMetadata,
} from '$contracts/Download';
import { DownloadErrorCode } from '$contracts/Download';
import JSZip from 'jszip';

export class DownloadService implements IDownloadService {
  private isBrowser(): boolean {
    return typeof window !== 'undefined';
  }

  async downloadDeck(input: DownloadDeckInput): Promise<ServiceResponse<DownloadDeckOutput>> {
    if (!this.isBrowser()) {
      return {
        success: false,
        error: {
          code: DownloadErrorCode.DOWNLOAD_BLOCKED,
          message: 'ZIP download is only available in the browser.',
          retryable: false,
        },
      };
    }

    const {
      generatedCards,
      styleInputs,
      deckName = 'tarot-deck',
      includeMetadata = true,
      onProgress,
    } = input;

    if (!generatedCards || generatedCards.length === 0) {
      return {
        success: false,
        error: {
          code: DownloadErrorCode.NO_CARDS_PROVIDED,
          message: 'No cards provided for download',
          retryable: false,
        },
      };
    }

    onProgress?.({
      status: 'Loading ZIP packaging library...',
      progress: 10,
      currentStep: 'preparing',
    });

    const zip = new JSZip();
    const completedCards = generatedCards.filter(
      (c) => c.generationStatus === 'completed' && (c.imageUrl || c.imageDataUrl),
    );

    if (completedCards.length === 0) {
      return {
        success: false,
        error: {
          code: DownloadErrorCode.MISSING_IMAGES,
          message: 'No generated card images available to download',
          retryable: false,
        },
      };
    }

    onProgress?.({
      status: `Fetching ${completedCards.length} card images...`,
      progress: 30,
      currentStep: 'fetching',
    });

    for (let i = 0; i < completedCards.length; i++) {
      const card = completedCards[i];
      if (!card) continue;
      const src = card.imageUrl || card.imageDataUrl;
      if (!src) continue;

      try {
        const res = await fetch(src);
        const blob = await res.blob();
        const paddedNum = String(card.cardNumber).padStart(2, '0');
        const safeName = card.cardName.toLowerCase().replace(/\s+/g, '-');
        zip.file(`${paddedNum}-${safeName}.png`, blob);
      } catch {
        // Continue zipping other cards if one fails
      }

      onProgress?.({
        status: `Packaging card ${i + 1}/${completedCards.length}...`,
        progress: 30 + Math.round(((i + 1) / completedCards.length) * 50),
        currentStep: 'packaging',
      });
    }

    if (includeMetadata && styleInputs) {
      const metadata: DeckMetadata = {
        generatedAt: new Date(),
        deckName,
        styleInputs,
        cardCount: completedCards.length,
        version: '1.0.0',
      };
      zip.file('deck-metadata.json', JSON.stringify(metadata, null, 2));
    }

    onProgress?.({
      status: 'Generating ZIP file...',
      progress: 90,
      currentStep: 'downloading',
    });

    try {
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const filename = `${deckName.toLowerCase().replace(/\s+/g, '-')}.zip`;
      const url = URL.createObjectURL(zipBlob);

      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);

      onProgress?.({
        status: 'Download ready!',
        progress: 100,
        currentStep: 'complete',
      });

      return {
        success: true,
        data: {
          downloaded: true,
          filename,
          fileSize: zipBlob.size,
          cardCount: completedCards.length,
          includedMetadata: !!includeMetadata,
        },
      };
    } catch (err) {
      return {
        success: false,
        error: {
          code: DownloadErrorCode.ZIP_CREATION_FAILED,
          message: err instanceof Error ? err.message : 'Failed to generate ZIP archive',
          retryable: true,
        },
      };
    }
  }

  async downloadCard(input: DownloadCardInput): Promise<ServiceResponse<DownloadCardOutput>> {
    if (!this.isBrowser()) {
      return {
        success: false,
        error: {
          code: DownloadErrorCode.DOWNLOAD_BLOCKED,
          message: 'Download is only available in the browser.',
          retryable: false,
        },
      };
    }

    const { card, filename: customFilename } = input;
    const src = card.imageUrl || card.imageDataUrl;

    if (!src) {
      return {
        success: false,
        error: {
          code: DownloadErrorCode.MISSING_IMAGES,
          message: 'Card image data is missing',
          retryable: false,
        },
      };
    }

    const paddedNum = String(card.cardNumber).padStart(2, '0');
    const safeName = card.cardName.toLowerCase().replace(/\s+/g, '-');
    const filename = customFilename || `${paddedNum}-${safeName}.png`;

    try {
      const res = await fetch(src);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);

      return {
        success: true,
        data: {
          downloaded: true,
          filename,
          fileSize: blob.size,
        },
      };
    } catch (err) {
      return {
        success: false,
        error: {
          code: DownloadErrorCode.FETCH_IMAGE_FAILED,
          message: err instanceof Error ? err.message : 'Failed to fetch card image',
          retryable: true,
        },
      };
    }
  }

  async prepareDownload(
    input: PrepareDownloadInput,
  ): Promise<ServiceResponse<PrepareDownloadOutput>> {
    if (!this.isBrowser()) {
      return {
        success: false,
        error: {
          code: DownloadErrorCode.DOWNLOAD_BLOCKED,
          message: 'Prepare download is only available in the browser.',
          retryable: false,
        },
      };
    }

    const zip = new JSZip();
    const filename = `${(input.deckName || 'tarot-deck').toLowerCase().replace(/\s+/g, '-')}.zip`;

    for (const card of input.generatedCards) {
      const src = card.imageUrl || card.imageDataUrl;
      if (!src) continue;
      try {
        const res = await fetch(src);
        const blob = await res.blob();
        const paddedNum = String(card.cardNumber).padStart(2, '0');
        const safeName = card.cardName.toLowerCase().replace(/\s+/g, '-');
        zip.file(`${paddedNum}-${safeName}.png`, blob);
      } catch {
        // Skip card if fetch fails
      }
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);

    return {
      success: true,
      data: {
        blob: zipBlob,
        filename,
        fileSize: zipBlob.size,
        url,
      },
    };
  }
}
