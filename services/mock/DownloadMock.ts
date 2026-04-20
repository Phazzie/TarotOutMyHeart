/**
 * @fileoverview Mock implementation of IDownloadService
 * @purpose Provide realistic mock behavior for download operations
 * @boundary Seam #7: DownloadSeam
 * @contract contracts/Download.ts
 */

import type { ServiceResponse } from '$contracts/types/common'
import type {
  IDownloadService,
  DownloadDeckInput,
  DownloadDeckOutput,
  DownloadCardInput,
  DownloadCardOutput,
  PrepareDownloadInput,
  PrepareDownloadOutput,
} from '$contracts/Download'
import {
  DownloadErrorCode,
  generateCardFilename,
  generateDeckFilename,
} from '$contracts/Download'

/**
 * Mock implementation of IDownloadService
 * Simulates file download operations
 */
export class DownloadMockService implements IDownloadService {
  /**
   * Simulate async delay
   */
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Trigger browser download
   */
  private triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  async downloadDeck(input: DownloadDeckInput): Promise<ServiceResponse<DownloadDeckOutput>> {
    const {
      generatedCards,
      styleInputs,
      deckName = 'tarot-deck',
      includeMetadata = true,
      onProgress,
    } = input

    // Validate input
    if (!generatedCards || generatedCards.length === 0) {
      return {
        success: false,
        error: {
          code: DownloadErrorCode.NO_CARDS_PROVIDED,
          message: 'No cards provided for download',
          retryable: false,
        },
      }
    }

    // Check for completed cards
    const completedCards = generatedCards.filter(c => c.generationStatus === 'completed')
    if (completedCards.length === 0) {
      return {
        success: false,
        error: {
          code: DownloadErrorCode.INCOMPLETE_CARDS,
          message: 'No completed cards to download',
          retryable: false,
        },
      }
    }

    // Check for missing images
    const cardsWithImages = completedCards.filter(c => c.imageUrl || c.imageDataUrl)
    if (cardsWithImages.length === 0) {
      return {
        success: false,
        error: {
          code: DownloadErrorCode.MISSING_IMAGES,
          message: 'No cards have images to download',
          retryable: false,
        },
      }
    }

    // Progress: preparing
    if (onProgress) {
      onProgress({
        status: 'Preparing download...',
        progress: 0,
        currentStep: 'preparing',
      })
    }

    await this.delay(200)

    // Progress: fetching
    if (onProgress) {
      onProgress({
        status: 'Fetching images...',
        progress: 25,
        currentStep: 'fetching',
      })
    }

    await this.delay(500)

    // Progress: packaging
    if (onProgress) {
      onProgress({
        status: 'Creating archive...',
        progress: 50,
        currentStep: 'packaging',
      })
    }

    await this.delay(300)

    // Create mock ZIP content
    const mockZipContent = JSON.stringify({
      cards: cardsWithImages.map(c => ({
        number: c.cardNumber,
        name: c.cardName,
        filename: generateCardFilename(c.cardNumber, c.cardName),
      })),
      metadata: includeMetadata ? {
        generatedAt: new Date().toISOString(),
        deckName,
        styleInputs,
        cardCount: cardsWithImages.length,
        version: '1.0.0',
      } : null,
    })

    const mockBlob = new Blob([mockZipContent], { type: 'application/zip' })
    const filename = generateDeckFilename(deckName)

    // Progress: downloading
    if (onProgress) {
      onProgress({
        status: 'Starting download...',
        progress: 75,
        currentStep: 'downloading',
      })
    }

    // Trigger download
    this.triggerDownload(mockBlob, filename)

    await this.delay(200)

    // Progress: complete
    if (onProgress) {
      onProgress({
        status: 'Download complete!',
        progress: 100,
        currentStep: 'complete',
      })
    }

    return {
      success: true,
      data: {
        downloaded: true,
        filename,
        fileSize: mockBlob.size,
        cardCount: cardsWithImages.length,
        includedMetadata: includeMetadata,
      },
    }
  }

  async downloadCard(input: DownloadCardInput): Promise<ServiceResponse<DownloadCardOutput>> {
    await this.delay(100)

    const { card, filename: customFilename } = input

    if (!card.imageUrl && !card.imageDataUrl) {
      return {
        success: false,
        error: {
          code: DownloadErrorCode.MISSING_IMAGES,
          message: 'Card has no image to download',
          retryable: false,
        },
      }
    }

    const filename = customFilename || generateCardFilename(card.cardNumber, card.cardName)

    // Create mock image blob
    const mockBlob = new Blob(['mock single card image'], { type: 'image/png' })

    // Trigger download
    this.triggerDownload(mockBlob, filename)

    return {
      success: true,
      data: {
        downloaded: true,
        filename,
        fileSize: mockBlob.size,
      },
    }
  }

  async prepareDownload(
    input: PrepareDownloadInput
  ): Promise<ServiceResponse<PrepareDownloadOutput>> {
    await this.delay(200)

    const { generatedCards, deckName = 'tarot-deck', includeMetadata = true } = input

    if (!generatedCards || generatedCards.length === 0) {
      return {
        success: false,
        error: {
          code: DownloadErrorCode.NO_CARDS_PROVIDED,
          message: 'No cards provided',
          retryable: false,
        },
      }
    }

    const completedCards = generatedCards.filter(c => c.generationStatus === 'completed')

    if (completedCards.length === 0) {
      return {
        success: false,
        error: {
          code: DownloadErrorCode.INCOMPLETE_CARDS,
          message: 'No completed cards',
          retryable: false,
        },
      }
    }

    // Create mock blob
    const mockContent = JSON.stringify({
      deckName,
      cardCount: completedCards.length,
      includeMetadata,
    })

    const blob = new Blob([mockContent], { type: 'application/zip' })
    const filename = generateDeckFilename(deckName)
    const url = URL.createObjectURL(blob)

    return {
      success: true,
      data: {
        blob,
        filename,
        fileSize: blob.size,
        url,
      },
    }
  }
}
