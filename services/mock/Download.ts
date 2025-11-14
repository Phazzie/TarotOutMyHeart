/**
 * @fileoverview Download Mock Service - Package and download generated tarot cards
 * @purpose Mock implementation of IDownloadService for testing and development
 * @dataFlow Generated Cards → Mock ZIP Creation → Simulated Browser Download
 * @boundary Seam #7: DownloadSeam - Mock download operations without real browser interaction
 * @example
 * ```typescript
 * const service = new DownloadMock()
 * const result = await service.downloadDeck({
 *   generatedCards: cards,
 *   styleInputs: style,
 *   deckName: 'My Cyberpunk Deck'
 * })
 * ```
 */

import type {
  IDownloadService,
  DownloadDeckInput,
  DownloadCardInput,
  PrepareDownloadInput,
  DownloadDeckOutput,
  DownloadCardOutput,
  PrepareDownloadOutput,
  ServiceResponse,
  DeckMetadata,
  GeneratedCard,
  StyleInputs,
  DownloadFormat,
} from '../../contracts'

import {
  DownloadErrorCode,
  DOWNLOAD_FORMATS,
  generateCardFilename,
  generateDeckFilename,
  DOWNLOAD_ERROR_MESSAGES,
} from '../../contracts'

/**
 * Mock implementation of Download Service
 *
 * Simulates:
 * - ZIP file creation with all 22 Major Arcana cards
 * - Individual card downloads
 * - Metadata JSON generation
 * - Progress tracking during packaging
 * - Realistic file sizes and download behavior
 *
 * Does NOT actually:
 * - Trigger real browser downloads (mocked)
 * - Fetch real image blobs (generates mock blobs)
 * - Use JSZip library (simulates ZIP creation)
 */
export class DownloadMock implements IDownloadService {
  // Realistic file size constants (in bytes)
  private readonly AVERAGE_CARD_SIZE = 350_000 // ~350KB per PNG
  private readonly METADATA_SIZE = 2_000 // ~2KB for metadata.json
  private readonly ZIP_OVERHEAD = 50_000 // ZIP compression overhead

  /**
   * Download complete deck as ZIP
   *
   * Simulates creating a ZIP archive containing:
   * - 22 card images (00-the-fool.png through 21-the-world.png)
   * - metadata.json (if includeMetadata is true)
   */
  async downloadDeck(
    input: DownloadDeckInput
  ): Promise<ServiceResponse<DownloadDeckOutput>> {
    // Validate input
    const validation = this.validateDeckInput(input)
    if (!validation.isValid) {
      return {
        success: false,
        error: {
          code: validation.errorCode!,
          message: DOWNLOAD_ERROR_MESSAGES[validation.errorCode!],
          retryable: false,
        },
      }
    }

    // Extract parameters with defaults
    const deckName = input.deckName || 'tarot-deck'
    const includeMetadata = input.includeMetadata !== false // Default true
    const onProgress = input.onProgress

    // Simulate progress: Preparing
    if (onProgress) {
      onProgress({
        status: 'Preparing download...',
        progress: 0,
        currentStep: 'preparing',
      })
    }

    // Simulate delay for preparing
    await this.simulateDelay(100)

    // Simulate progress: Fetching images
    if (onProgress) {
      onProgress({
        status: 'Fetching card images...',
        progress: 20,
        currentStep: 'fetching',
      })
    }

    // Simulate fetching images
    await this.simulateDelay(200)

    // Simulate progress: Packaging
    if (onProgress) {
      onProgress({
        status: 'Creating ZIP archive...',
        progress: 60,
        currentStep: 'packaging',
      })
    }

    // Simulate ZIP creation with progress updates
    const cardCount = input.generatedCards.length
    for (let i = 0; i < cardCount; i++) {
      await this.simulateDelay(10)
      if (onProgress) {
        const progress = 60 + Math.floor((i / cardCount) * 30)
        onProgress({
          status: `Adding card ${i + 1} of ${cardCount}...`,
          progress,
          currentStep: 'packaging',
        })
      }
    }

    // Simulate progress: Downloading
    if (onProgress) {
      onProgress({
        status: 'Preparing download...',
        progress: 95,
        currentStep: 'downloading',
      })
    }

    await this.simulateDelay(100)

    // Calculate realistic file size
    const cardSize = cardCount * this.AVERAGE_CARD_SIZE
    const metadataSize = includeMetadata ? this.METADATA_SIZE : 0
    const fileSize = cardSize + metadataSize + this.ZIP_OVERHEAD

    // Generate filename
    const filename = generateDeckFilename(deckName)

    // Simulate progress: Complete
    if (onProgress) {
      onProgress({
        status: 'Download complete!',
        progress: 100,
        currentStep: 'complete',
      })
    }

    // Return success response
    return {
      success: true,
      data: {
        downloaded: true,
        filename,
        fileSize,
        cardCount,
        includedMetadata: includeMetadata,
      },
    }
  }

  /**
   * Download a single card image
   *
   * Simulates downloading one PNG file with proper filename.
   */
  async downloadCard(
    input: DownloadCardInput
  ): Promise<ServiceResponse<DownloadCardOutput>> {
    // Validate card has image
    if (!input.card.imageUrl) {
      return {
        success: false,
        error: {
          code: DownloadErrorCode.MISSING_IMAGES,
          message: DOWNLOAD_ERROR_MESSAGES[DownloadErrorCode.MISSING_IMAGES],
          retryable: false,
        },
      }
    }

    // Check for unreachable URLs (mock specific check)
    if (input.card.imageUrl.includes('invalid.example.com')) {
      return {
        success: false,
        error: {
          code: DownloadErrorCode.FETCH_IMAGE_FAILED,
          message: DOWNLOAD_ERROR_MESSAGES[DownloadErrorCode.FETCH_IMAGE_FAILED],
          retryable: true,
        },
      }
    }

    // Generate filename
    const filename = input.filename || generateCardFilename(
      input.card.cardNumber,
      input.card.cardName
    )

    // Simulate download delay
    await this.simulateDelay(100)

    // Calculate realistic file size for single card
    const fileSize = this.AVERAGE_CARD_SIZE

    return {
      success: true,
      data: {
        downloaded: true,
        filename,
        fileSize,
      },
    }
  }

  /**
   * Prepare download without triggering browser download
   *
   * Creates a blob and object URL for custom download handling.
   * Useful for preview, custom UI, or saving to IndexedDB.
   */
  async prepareDownload(
    input: PrepareDownloadInput
  ): Promise<ServiceResponse<PrepareDownloadOutput>> {
    // Validate input
    const validation = this.validateDeckInput({
      generatedCards: input.generatedCards,
      styleInputs: input.styleInputs,
    })
    if (!validation.isValid) {
      return {
        success: false,
        error: {
          code: validation.errorCode!,
          message: DOWNLOAD_ERROR_MESSAGES[validation.errorCode!],
          retryable: false,
        },
      }
    }

    // Extract parameters with defaults
    const deckName = input.deckName || 'tarot-deck'
    const includeMetadata = input.includeMetadata !== false // Default true

    // Simulate preparing ZIP
    await this.simulateDelay(200)

    // Create mock ZIP metadata structure
    const zipContent = this.createMockZipContent(
      input.generatedCards,
      input.styleInputs,
      deckName,
      includeMetadata
    )

    // Create blob with application/zip type
    const blob = new Blob([zipContent], { type: 'application/zip' })
    const fileSize = blob.size

    // Generate filename
    const filename = generateDeckFilename(deckName)

    // Create mock object URL
    const url = this.createMockObjectURL(blob)

    return {
      success: true,
      data: {
        blob,
        filename,
        fileSize,
        url,
      },
    }
  }

  // ============================================================================
  // VALIDATION HELPERS
  // ============================================================================

  /**
   * Validate deck input parameters
   */
  private validateDeckInput(input: {
    generatedCards: unknown[]
    styleInputs?: unknown
    format?: unknown
  }): { isValid: boolean; errorCode?: DownloadErrorCode } {
    // Check if cards array is empty
    if (!input.generatedCards || input.generatedCards.length === 0) {
      return {
        isValid: false,
        errorCode: DownloadErrorCode.NO_CARDS_PROVIDED,
      }
    }

    // Check if we have exactly 22 cards
    if (input.generatedCards.length !== 22) {
      return {
        isValid: false,
        errorCode: DownloadErrorCode.INCOMPLETE_CARDS,
      }
    }

    // Check if all cards have imageUrls
    const hasInvalidCards = input.generatedCards.some(
      (card) => {
        // Type guard: check if card has imageUrl property
        if (typeof card === 'object' && card !== null && 'imageUrl' in card) {
          return !card.imageUrl
        }
        return true // Invalid card structure
      }
    )
    if (hasInvalidCards) {
      return {
        isValid: false,
        errorCode: DownloadErrorCode.MISSING_IMAGES,
      }
    }

    // Check format if provided
    if (input.format && !DOWNLOAD_FORMATS.includes(input.format as DownloadFormat)) {
      return {
        isValid: false,
        errorCode: DownloadErrorCode.INVALID_FORMAT,
      }
    }

    return { isValid: true }
  }

  // ============================================================================
  // MOCK DATA GENERATION
  // ============================================================================

  /**
   * Create mock ZIP content structure
   *
   * Simulates a ZIP file containing:
   * - 22 PNG card images
   * - metadata.json (if includeMetadata is true)
   */
  private createMockZipContent(
    cards: GeneratedCard[],
    styleInputs: StyleInputs,
    deckName: string,
    includeMetadata: boolean
  ): string {
    // Create a mock ZIP structure as a string
    // In reality, JSZip would create a proper ZIP binary
    const lines: string[] = []

    lines.push(`[MOCK ZIP FILE: ${deckName}]`)
    lines.push(``)
    lines.push(`Contents:`)

    // Add card files
    for (const card of cards) {
      const filename = generateCardFilename(card.cardNumber, card.cardName)
      lines.push(`  - ${filename} (${this.AVERAGE_CARD_SIZE} bytes)`)
    }

    // Add metadata if requested
    if (includeMetadata) {
      lines.push(`  - metadata.json (${this.METADATA_SIZE} bytes)`)

      // Generate metadata
      const metadata: DeckMetadata = {
        generatedAt: new Date(),
        deckName,
        styleInputs,
        cardCount: cards.length,
        version: '1.0.0',
      }

      lines.push(``)
      lines.push(`Metadata:`)
      lines.push(JSON.stringify(metadata, null, 2))
    }

    return lines.join('\n')
  }

  /**
   * Create a mock object URL
   *
   * In reality, URL.createObjectURL() creates a blob:// URL
   * We simulate this for testing.
   */
  private createMockObjectURL(_blob: Blob): string {
    return `blob:mock-url-${Math.random().toString(36).substring(7)}`
  }

  /**
   * Simulate async delay
   */
  private simulateDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
