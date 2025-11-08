/**
 * @fileoverview Download Contract - Export generated cards as ZIP
 * @purpose Define the seam between generated cards and user's file system
 * @dataFlow Generated Cards → JSZip → Browser Download → User's Downloads Folder
 * @boundary Seam #7: DownloadSeam - Package and download complete tarot deck
 * @requirement PRD Section: "User Flow Step 8 - Download Cards"
 * @updated 2025-11-07
 * 
 * @example
 * ```typescript
 * const result = await downloadService.downloadDeck({
 *   generatedCards: cards,
 *   styleInputs: style,
 *   deckName: 'My Cyberpunk Deck',
 *   format: 'zip'
 * });
 * ```
 */

import type { ServiceResponse } from './types/common'
import type { GeneratedCard } from './ImageGeneration'
import type { StyleInputs } from './StyleInput'

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Download format options
 */
export const DOWNLOAD_FORMATS = ['zip', 'individual'] as const

/**
 * Image format for downloads
 */
export const IMAGE_FORMAT = 'png' as const

/**
 * Filename pattern for individual cards
 */
export const CARD_FILENAME_PATTERN = '{number:02d}-{name}.png' // e.g., "00-the-fool.png"

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Download format type
 */
export type DownloadFormat = typeof DOWNLOAD_FORMATS[number]

/**
 * Image format type
 */
export type ImageFormat = typeof IMAGE_FORMAT

// ============================================================================
// CORE DATA STRUCTURES
// ============================================================================

/**
 * Metadata included in deck download
 * 
 * @property generatedAt - When deck was created
 * @property deckName - User-provided deck name
 * @property styleInputs - Style parameters used
 * @property cardCount - Number of cards in deck
 * @property version - Application version
 */
export interface DeckMetadata {
  generatedAt: Date
  deckName: string
  styleInputs: StyleInputs
  cardCount: number
  version: string
}

/**
 * Individual card file in download
 * 
 * @property filename - Filename for this card
 * @property cardNumber - Card number (0-21)
 * @property cardName - Traditional card name
 * @property blob - Image blob data
 * @property size - File size in bytes
 */
export interface CardFile {
  filename: string
  cardNumber: number
  cardName: string
  blob: Blob
  size: number
}

/**
 * Download progress tracking
 * 
 * @property status - Current status message
 * @property progress - Progress percentage (0-100)
 * @property currentStep - Current operation
 */
export interface DownloadProgress {
  status: string
  progress: number
  currentStep: 'preparing' | 'fetching' | 'packaging' | 'downloading' | 'complete'
}

// ============================================================================
// INPUT CONTRACTS
// ============================================================================

/**
 * Input for downloading complete deck as ZIP
 * 
 * @property generatedCards - All 22 generated cards
 * @property styleInputs - Style parameters used for generation
 * @property deckName - Optional custom deck name
 * @property format - Download format (zip or individual)
 * @property includeMetadata - Whether to include metadata JSON file
 * @property onProgress - Progress callback
 */
export interface DownloadDeckInput {
  generatedCards: GeneratedCard[]
  styleInputs: StyleInputs
  deckName?: string
  format?: DownloadFormat
  includeMetadata?: boolean
  onProgress?: (progress: DownloadProgress) => void
}

/**
 * Input for downloading a single card
 * 
 * @property card - Card to download
 * @property filename - Optional custom filename
 */
export interface DownloadCardInput {
  card: GeneratedCard
  filename?: string
}

/**
 * Input for preparing download (without triggering browser download)
 * Useful for preview or custom download handling
 * 
 * @property generatedCards - Cards to prepare
 * @property styleInputs - Style parameters
 * @property deckName - Optional deck name
 * @property includeMetadata - Include metadata file
 */
export interface PrepareDownloadInput {
  generatedCards: GeneratedCard[]
  styleInputs: StyleInputs
  deckName?: string
  includeMetadata?: boolean
}

// ============================================================================
// OUTPUT CONTRACTS
// ============================================================================

/**
 * Result of downloading deck
 * 
 * @property downloaded - Whether download was triggered successfully
 * @property filename - Downloaded filename
 * @property fileSize - Total size in bytes
 * @property cardCount - Number of cards included
 * @property includedMetadata - Whether metadata was included
 */
export interface DownloadDeckOutput {
  downloaded: boolean
  filename: string
  fileSize: number
  cardCount: number
  includedMetadata: boolean
}

/**
 * Result of downloading single card
 * 
 * @property downloaded - Whether download was triggered
 * @property filename - Downloaded filename
 * @property fileSize - File size in bytes
 */
export interface DownloadCardOutput {
  downloaded: boolean
  filename: string
  fileSize: number
}

/**
 * Result of preparing download (without downloading)
 * 
 * @property blob - Download blob (ZIP or image)
 * @property filename - Suggested filename
 * @property fileSize - Size in bytes
 * @property url - Object URL for download link
 */
export interface PrepareDownloadOutput {
  blob: Blob
  filename: string
  fileSize: number
  url: string
}

// ============================================================================
// ERROR CODES
// ============================================================================

/**
 * All possible error codes for download operations
 */
export enum DownloadErrorCode {
  // Input validation
  NO_CARDS_PROVIDED = 'NO_CARDS_PROVIDED',
  INCOMPLETE_CARDS = 'INCOMPLETE_CARDS',
  MISSING_IMAGES = 'MISSING_IMAGES',
  INVALID_FORMAT = 'INVALID_FORMAT',
  
  // Processing errors
  FETCH_IMAGE_FAILED = 'FETCH_IMAGE_FAILED',
  ZIP_CREATION_FAILED = 'ZIP_CREATION_FAILED',
  BLOB_CREATION_FAILED = 'BLOB_CREATION_FAILED',
  
  // Browser errors
  DOWNLOAD_BLOCKED = 'DOWNLOAD_BLOCKED',
  BLOB_API_NOT_SUPPORTED = 'BLOB_API_NOT_SUPPORTED',
  JSZIP_NOT_AVAILABLE = 'JSZIP_NOT_AVAILABLE',
  
  // File system errors
  INSUFFICIENT_STORAGE = 'INSUFFICIENT_STORAGE',
  DOWNLOAD_FAILED = 'DOWNLOAD_FAILED',
}

// ============================================================================
// SERVICE INTERFACE (THE CONTRACT)
// ============================================================================

/**
 * Download Service Contract
 * 
 * Defines all operations for downloading generated tarot cards.
 * Implementation handles:
 * - Fetching image blobs from URLs
 * - Creating ZIP archives with JSZip
 * - Generating metadata JSON files
 * - Triggering browser downloads
 * - Progress tracking
 * 
 * @interface IDownloadService
 */
export interface IDownloadService {
  /**
   * Download complete deck as ZIP
   * 
   * Workflow:
   * 1. Validate all cards have images
   * 2. Fetch image blobs from URLs
   * 3. Create ZIP with JSZip:
   *    - Add all 22 card images (00-the-fool.png, etc.)
   *    - Add metadata JSON (optional)
   * 4. Generate blob and object URL
   * 5. Trigger browser download
   * 6. Revoke object URL after download
   * 
   * @param input - Cards and download options
   * @returns Promise<ServiceResponse<DownloadDeckOutput>> - Download result
   * 
   * @throws Never throws - all errors returned in ServiceResponse
   * 
   * @example
   * ```typescript
   * const result = await service.downloadDeck({
   *   generatedCards: cards,
   *   styleInputs: style,
   *   deckName: 'Cyberpunk Tarot',
   *   format: 'zip',
   *   includeMetadata: true,
   *   onProgress: (progress) => {
   *     console.log(`${progress.status}: ${progress.progress}%`);
   *   }
   * });
   * 
   * if (result.success) {
   *   console.log(`Downloaded ${result.data.filename}`);
   *   console.log(`Size: ${(result.data.fileSize / 1024 / 1024).toFixed(2)} MB`);
   * }
   * ```
   */
  downloadDeck(
    input: DownloadDeckInput
  ): Promise<ServiceResponse<DownloadDeckOutput>>

  /**
   * Download a single card image
   * 
   * Triggers browser download for one card.
   * 
   * @param input - Card to download
   * @returns Promise<ServiceResponse<DownloadCardOutput>> - Download result
   * 
   * @throws Never throws - all errors returned in ServiceResponse
   * 
   * @example
   * ```typescript
   * const result = await service.downloadCard({
   *   card: cards[0],
   *   filename: '00-the-fool-custom.png'
   * });
   * ```
   */
  downloadCard(
    input: DownloadCardInput
  ): Promise<ServiceResponse<DownloadCardOutput>>

  /**
   * Prepare download without triggering (returns blob)
   * 
   * Useful for:
   * - Custom download handling
   * - Preview before download
   * - Saving to IndexedDB
   * 
   * @param input - Cards to prepare
   * @returns Promise<ServiceResponse<PrepareDownloadOutput>> - Blob and URL
   * 
   * @throws Never throws - all errors returned in ServiceResponse
   * 
   * @example
   * ```typescript
   * const result = await service.prepareDownload({
   *   generatedCards: cards,
   *   styleInputs: style,
   *   deckName: 'My Deck'
   * });
   * 
   * if (result.success) {
   *   // Use the blob URL for custom handling
   *   showPreviewLink(result.data.url, result.data.filename);
   * }
   * ```
   */
  prepareDownload(
    input: PrepareDownloadInput
  ): Promise<ServiceResponse<PrepareDownloadOutput>>
}

// ============================================================================
// USER-FRIENDLY ERROR MESSAGES
// ============================================================================

/**
 * Maps error codes to user-friendly messages
 */
export const DOWNLOAD_ERROR_MESSAGES: Record<DownloadErrorCode, string> = {
  [DownloadErrorCode.NO_CARDS_PROVIDED]: 
    'No cards provided for download',
  [DownloadErrorCode.INCOMPLETE_CARDS]: 
    'Some cards are not fully generated yet',
  [DownloadErrorCode.MISSING_IMAGES]: 
    'Some cards are missing images',
  [DownloadErrorCode.INVALID_FORMAT]: 
    'Invalid download format specified',
  
  [DownloadErrorCode.FETCH_IMAGE_FAILED]: 
    'Failed to fetch card images for download',
  [DownloadErrorCode.ZIP_CREATION_FAILED]: 
    'Failed to create ZIP file',
  [DownloadErrorCode.BLOB_CREATION_FAILED]: 
    'Failed to create download file',
  
  [DownloadErrorCode.DOWNLOAD_BLOCKED]: 
    'Download was blocked by browser - please check popup blocker',
  [DownloadErrorCode.BLOB_API_NOT_SUPPORTED]: 
    'Your browser does not support downloads - please use a modern browser',
  [DownloadErrorCode.JSZIP_NOT_AVAILABLE]: 
    'ZIP library not available - please refresh the page',
  
  [DownloadErrorCode.INSUFFICIENT_STORAGE]: 
    'Insufficient storage space for download',
  [DownloadErrorCode.DOWNLOAD_FAILED]: 
    'Download failed - please try again',
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate filename for a card
 * Follows pattern: {number:02d}-{name}.png
 * 
 * @param cardNumber - Card number (0-21)
 * @param cardName - Card name (e.g., "The Fool")
 * @returns Filename (e.g., "00-the-fool.png")
 */
export function generateCardFilename(cardNumber: number, cardName: string): string {
  const number = String(cardNumber).padStart(2, '0')
  const name = cardName.toLowerCase().replace(/\s+/g, '-')
  return `${number}-${name}.png`
}

/**
 * Generate filename for deck ZIP
 * Follows pattern: {deckName}-{timestamp}.zip
 * 
 * @param deckName - Deck name
 * @returns Filename (e.g., "cyberpunk-tarot-1699382400000.zip")
 */
export function generateDeckFilename(deckName: string): string {
  const name = deckName.toLowerCase().replace(/\s+/g, '-')
  const timestamp = Date.now()
  return `${name}-${timestamp}.zip`
}

// ============================================================================
// METADATA
// ============================================================================

/**
 * Contract metadata for tracking and documentation
 */
export const DOWNLOAD_CONTRACT_METADATA = {
  version: '1.0.0',
  seam: 'DownloadSeam',
  boundary: 'Application → JSZip → Browser Download',
  requirement: 'PRD: User Flow Step 8',
  lastUpdated: '2025-11-07',
  dependencies: ['ImageGeneration', 'StyleInput'],
  externalLibraries: ['JSZip'],
} as const
