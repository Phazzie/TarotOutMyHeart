/**
 * @fileoverview Mock implementation of Download service
 * @purpose Provide deck download functionality as ZIP file
 * @dataFlow Generated Cards → ZIP Creation → Browser Download
 * @mockBehavior
 *   - Simulates ZIP file creation (2-3 seconds)
 *   - Creates mock download with metadata
 *   - Reports progress during packaging
 *   - Simulates browser download trigger
 * @dependencies contracts/Download.ts
 * @updated 2025-11-07
 */

import type {
  IDownloadService,
  DownloadDeckInput,
  DownloadDeckOutput,
  DownloadIndividualCardInput,
  DownloadIndividualCardOutput,
  GetDownloadSizeInput,
  GetDownloadSizeOutput,
  DownloadProgress,
} from '$contracts/Download'

import { CARD_FILENAME_PATTERN } from '$contracts/Download'
import type { ServiceResponse } from '$contracts/types/common'

/**
 * Mock implementation of DownloadService
 * 
 * Simulates deck download as ZIP file with progress tracking.
 */
export class DownloadMockService implements IDownloadService {
  /**
   * Download complete deck as ZIP
   */
  async downloadDeck(
    input: DownloadDeckInput
  ): Promise<ServiceResponse<DownloadDeckOutput>> {
    const { generatedCards, deckName, onProgress } = input

    // Simulate progress
    if (onProgress) {
      onProgress({
        status: 'Preparing download...',
        progress: 0,
        currentStep: 'Initializing',
      })
      await this.delay(500)

      onProgress({
        status: 'Creating ZIP archive...',
        progress: 25,
        currentStep: 'Packaging images',
      })
      await this.delay(1000)

      onProgress({
        status: 'Adding metadata...',
        progress: 75,
        currentStep: 'Adding metadata',
      })
      await this.delay(500)

      onProgress({
        status: 'Finalizing download...',
        progress: 90,
        currentStep: 'Finalizing',
      })
      await this.delay(500)

      onProgress({
        status: 'Complete!',
        progress: 100,
        currentStep: 'Download ready',
      })
    } else {
      await this.delay(2500)
    }

    // In mock, we don't actually create a ZIP or trigger download
    // Real implementation would use JSZip and trigger browser download

    const filename = `${this.sanitizeFilename(deckName)}.zip`
    const mockSize = generatedCards.length * 1024 * 500 // Mock: ~500KB per card

    return {
      success: true,
      data: {
        filename,
        size: mockSize,
        cardCount: generatedCards.length,
        downloaded: true,
        downloadUrl: `mock://download/${filename}`, // Mock URL
      },
    }
  }

  /**
   * Download individual card
   */
  async downloadIndividualCard(
    input: DownloadIndividualCardInput
  ): Promise<ServiceResponse<DownloadIndividualCardOutput>> {
    await this.delay(500)

    const { card } = input

    const filename = this.formatCardFilename(card.cardNumber, card.cardName)
    const mockSize = 1024 * 500 // Mock: 500KB

    return {
      success: true,
      data: {
        filename,
        size: mockSize,
        downloaded: true,
        downloadUrl: `mock://download/${filename}`,
      },
    }
  }

  /**
   * Get estimated download size
   */
  async getDownloadSize(
    input: GetDownloadSizeInput
  ): Promise<ServiceResponse<GetDownloadSizeOutput>> {
    await this.delay(100)

    const { generatedCards, format } = input

    // Mock: Estimate ~500KB per card + overhead
    const cardSize = 1024 * 500
    const totalImageSize = generatedCards.length * cardSize
    const metadataSize = 1024 * 10 // 10KB for metadata
    const zipOverhead = totalImageSize * 0.05 // 5% overhead for ZIP

    const estimatedSize = format === 'zip' 
      ? totalImageSize + metadataSize + zipOverhead
      : totalImageSize + metadataSize

    return {
      success: true,
      data: {
        estimatedSize: Math.round(estimatedSize),
        formattedSize: this.formatBytes(estimatedSize),
        cardCount: generatedCards.length,
      },
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Format card filename according to pattern
   */
  private formatCardFilename(cardNumber: number, cardName: string): string {
    const numberPadded = cardNumber.toString().padStart(2, '0')
    const nameSanitized = this.sanitizeFilename(cardName)
    return `${numberPadded}-${nameSanitized}.png`
  }

  /**
   * Sanitize filename by removing/replacing invalid characters
   */
  private sanitizeFilename(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  /**
   * Format bytes to human-readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes'

    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  /**
   * Simulate async delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

/**
 * Singleton instance for use throughout the application
 */
export const downloadMockService = new DownloadMockService()
