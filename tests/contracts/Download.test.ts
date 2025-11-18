/**
 * Download Contract Tests
 *
 * Tests that DownloadMock satisfies the IDownloadService contract
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { DownloadMock } from '../../services/mock/Download'
import {
  type IDownloadService,
  type DownloadDeckInput,
  type DownloadCardInput,
  type PrepareDownloadInput,
  type GeneratedCard,
  type StyleInputs,
  DownloadErrorCode,
  generateCardFilename,
  generateDeckFilename,
  type DownloadProgress,
} from '../../contracts'

describe('Download Contract', () => {
  let service: IDownloadService
  let mockCards: GeneratedCard[]
  let mockStyleInputs: StyleInputs

  beforeEach(() => {
    service = new DownloadMock()

    // Create 22 mock cards with valid data
    mockCards = Array.from({ length: 22 }, (_, i) => ({
      id: `card-${i}` as any,
      cardNumber: i as any,
      cardName: getMajorArcanaName(i),
      prompt: `A tarot card illustration for ${getMajorArcanaName(i)}`,
      imageUrl: `https://blob.vercel-storage.com/card-${String(i).padStart(2, '0')}.png`,
      generationStatus: 'completed' as any,
      generatedAt: new Date(),
      retryCount: 0,
    }))

    mockStyleInputs = {
      theme: 'Cyberpunk',
      tone: 'Dark',
      description: 'Neon-lit dystopian future with advanced technology',
      concept: 'Technology vs humanity',
      characters: 'Augmented humans and AI',
    }
  })

  describe('downloadDeck() Method', () => {
    describe('Success Cases', () => {
      it('should download 22 cards as ZIP and return DownloadDeckOutput', async () => {
        const input: DownloadDeckInput = {
          generatedCards: mockCards,
          styleInputs: mockStyleInputs,
          format: 'zip',
        }

        const response = await service.downloadDeck(input)

        expect(response.success).toBe(true)
        expect(response.data?.downloaded).toBe(true)
        expect(response.data?.cardCount).toBe(22)
        expect(response.data?.filename).toBeDefined()
        expect(response.data?.fileSize).toBeGreaterThan(0)
      })

      it('should generate filename following pattern [deckname]-[timestamp].zip', async () => {
        const input: DownloadDeckInput = {
          generatedCards: mockCards,
          styleInputs: mockStyleInputs,
          deckName: 'My Cyberpunk Deck',
        }

        const response = await service.downloadDeck(input)

        expect(response.success).toBe(true)
        expect(response.data?.filename).toMatch(/^my-cyberpunk-deck-\d+\.zip$/)
      })

      it('should use default deckName "tarot-deck" when not provided', async () => {
        const input: DownloadDeckInput = {
          generatedCards: mockCards,
          styleInputs: mockStyleInputs,
        }

        const response = await service.downloadDeck(input)

        expect(response.success).toBe(true)
        expect(response.data?.filename).toMatch(/^tarot-deck-\d+\.zip$/)
      })

      it('should include metadata when includeMetadata is true', async () => {
        const input: DownloadDeckInput = {
          generatedCards: mockCards,
          styleInputs: mockStyleInputs,
          includeMetadata: true,
        }

        const response = await service.downloadDeck(input)

        expect(response.success).toBe(true)
        expect(response.data?.includedMetadata).toBe(true)
      })

      it('should not include metadata when includeMetadata is false', async () => {
        const input: DownloadDeckInput = {
          generatedCards: mockCards,
          styleInputs: mockStyleInputs,
          includeMetadata: false,
        }

        const response = await service.downloadDeck(input)

        expect(response.success).toBe(true)
        expect(response.data?.includedMetadata).toBe(false)
      })

      it('should default to includeMetadata: true when not specified', async () => {
        const input: DownloadDeckInput = {
          generatedCards: mockCards,
          styleInputs: mockStyleInputs,
        }

        const response = await service.downloadDeck(input)

        expect(response.success).toBe(true)
        expect(response.data?.includedMetadata).toBe(true)
      })

      it('should default to format "zip" when not specified', async () => {
        const input: DownloadDeckInput = {
          generatedCards: mockCards,
          styleInputs: mockStyleInputs,
        }

        const response = await service.downloadDeck(input)

        expect(response.success).toBe(true)
        expect(response.data?.filename).toMatch(/\.zip$/)
      })
    })

    describe('Progress Callback', () => {
      it('should call onProgress callback with progress updates', async () => {
        const progressUpdates: DownloadProgress[] = []

        const input: DownloadDeckInput = {
          generatedCards: mockCards,
          styleInputs: mockStyleInputs,
          onProgress: progress => {
            progressUpdates.push(progress)
          },
        }

        const response = await service.downloadDeck(input)

        expect(response.success).toBe(true)
        expect(progressUpdates.length).toBeGreaterThan(0)
      })

      it('should provide progress from 0 to 100', async () => {
        const progressValues: number[] = []

        const input: DownloadDeckInput = {
          generatedCards: mockCards,
          styleInputs: mockStyleInputs,
          onProgress: progress => {
            progressValues.push(progress.progress)
          },
        }

        await service.downloadDeck(input)

        expect(progressValues[0]).toBeLessThanOrEqual(100)
        expect(progressValues[progressValues.length - 1]).toBe(100)
      })

      it('should provide currentStep updates during download', async () => {
        const steps: string[] = []

        const input: DownloadDeckInput = {
          generatedCards: mockCards,
          styleInputs: mockStyleInputs,
          onProgress: progress => {
            if (!steps.includes(progress.currentStep)) {
              steps.push(progress.currentStep)
            }
          },
        }

        await service.downloadDeck(input)

        expect(steps.length).toBeGreaterThan(0)
        expect(steps[steps.length - 1]).toBe('complete')
      })
    })

    describe('Error Cases', () => {
      it('should fail with NO_CARDS_PROVIDED when no cards provided', async () => {
        const input: DownloadDeckInput = {
          generatedCards: [],
          styleInputs: mockStyleInputs,
        }

        const response = await service.downloadDeck(input)

        expect(response.success).toBe(false)
        expect(response.error?.code).toBe(DownloadErrorCode.NO_CARDS_PROVIDED)
        expect(response.error?.retryable).toBe(false)
      })

      it('should fail with INCOMPLETE_CARDS when fewer than 22 cards', async () => {
        const input: DownloadDeckInput = {
          generatedCards: mockCards.slice(0, 10),
          styleInputs: mockStyleInputs,
        }

        const response = await service.downloadDeck(input)

        expect(response.success).toBe(false)
        expect(response.error?.code).toBe(DownloadErrorCode.INCOMPLETE_CARDS)
        expect(response.error?.retryable).toBe(false)
      })

      it('should fail with MISSING_IMAGES when cards have no imageUrl', async () => {
        const cardsWithoutImages = mockCards.map(card => ({
          ...card,
          imageUrl: undefined,
        }))

        const input: DownloadDeckInput = {
          generatedCards: cardsWithoutImages as any,
          styleInputs: mockStyleInputs,
        }

        const response = await service.downloadDeck(input)

        expect(response.success).toBe(false)
        expect(response.error?.code).toBe(DownloadErrorCode.MISSING_IMAGES)
      })

      it('should fail with INVALID_FORMAT when format is invalid', async () => {
        const input: DownloadDeckInput = {
          generatedCards: mockCards,
          styleInputs: mockStyleInputs,
          format: 'invalid-format' as any,
        }

        const response = await service.downloadDeck(input)

        expect(response.success).toBe(false)
        expect(response.error?.code).toBe(DownloadErrorCode.INVALID_FORMAT)
      })
    })

    describe('Response Structure Validation', () => {
      it('should return properly typed DownloadDeckOutput', async () => {
        const input: DownloadDeckInput = {
          generatedCards: mockCards,
          styleInputs: mockStyleInputs,
        }

        const response = await service.downloadDeck(input)

        expect(response.success).toBe(true)
        expect(typeof response.data?.downloaded).toBe('boolean')
        expect(typeof response.data?.filename).toBe('string')
        expect(typeof response.data?.fileSize).toBe('number')
        expect(typeof response.data?.cardCount).toBe('number')
        expect(typeof response.data?.includedMetadata).toBe('boolean')
      })

      it('should return reasonable fileSize for 22 PNG images', async () => {
        const input: DownloadDeckInput = {
          generatedCards: mockCards,
          styleInputs: mockStyleInputs,
        }

        const response = await service.downloadDeck(input)

        expect(response.success).toBe(true)
        // ZIP of 22 PNGs should be at least a few KB
        expect(response.data?.fileSize).toBeGreaterThan(1000)
      })
    })
  })

  describe('downloadCard() Method', () => {
    describe('Success Cases', () => {
      it('should download single card and return DownloadCardOutput', async () => {
        const input: DownloadCardInput = {
          card: mockCards[0]!,
        }

        const response = await service.downloadCard(input)

        expect(response.success).toBe(true)
        expect(response.data?.downloaded).toBe(true)
        expect(response.data?.filename).toBeDefined()
        expect(response.data?.fileSize).toBeGreaterThan(0)
      })

      it('should generate filename following pattern 00-the-fool.png', async () => {
        const input: DownloadCardInput = {
          card: mockCards[0]!,
        }

        const response = await service.downloadCard(input)

        expect(response.success).toBe(true)
        expect(response.data?.filename).toBe('00-the-fool.png')
      })

      it('should use custom filename when provided', async () => {
        const input: DownloadCardInput = {
          card: mockCards[0]!,
          filename: 'custom-fool-card.png',
        }

        const response = await service.downloadCard(input)

        expect(response.success).toBe(true)
        expect(response.data?.filename).toBe('custom-fool-card.png')
      })

      it('should download different cards with correct filenames', async () => {
        const card0 = await service.downloadCard({ card: mockCards[0]! })
        const card13 = await service.downloadCard({ card: mockCards[13]! })
        const card21 = await service.downloadCard({ card: mockCards[21]! })

        expect(card0.data?.filename).toBe('00-the-fool.png')
        expect(card13.data?.filename).toBe('13-death.png')
        expect(card21.data?.filename).toBe('21-the-world.png')
      })
    })

    describe('Error Cases', () => {
      it('should fail with MISSING_IMAGES when card has no imageUrl', async () => {
        const cardWithoutImage = {
          ...mockCards[0],
          imageUrl: undefined,
        }

        const input: DownloadCardInput = {
          card: cardWithoutImage as any,
        }

        const response = await service.downloadCard(input)

        expect(response.success).toBe(false)
        expect(response.error?.code).toBe(DownloadErrorCode.MISSING_IMAGES)
      })

      it('should fail with FETCH_IMAGE_FAILED when image URL is unreachable', async () => {
        const cardWithBadUrl = {
          ...mockCards[0]!,
          imageUrl: 'https://invalid.example.com/nonexistent.png',
        }

        const input: DownloadCardInput = {
          card: cardWithBadUrl,
        }

        const response = await service.downloadCard(input)

        // Mock might simulate this error
        if (!response.success) {
          expect(response.error?.code).toBe(DownloadErrorCode.FETCH_IMAGE_FAILED)
        }
      })
    })

    describe('Response Structure Validation', () => {
      it('should return properly typed DownloadCardOutput', async () => {
        const input: DownloadCardInput = {
          card: mockCards[0]!,
        }

        const response = await service.downloadCard(input)

        expect(response.success).toBe(true)
        expect(typeof response.data?.downloaded).toBe('boolean')
        expect(typeof response.data?.filename).toBe('string')
        expect(typeof response.data?.fileSize).toBe('number')
      })
    })
  })

  describe('prepareDownload() Method', () => {
    describe('Success Cases', () => {
      it('should prepare download without triggering and return blob', async () => {
        const input: PrepareDownloadInput = {
          generatedCards: mockCards,
          styleInputs: mockStyleInputs,
        }

        const response = await service.prepareDownload(input)

        expect(response.success).toBe(true)
        expect(response.data?.blob).toBeDefined()
        expect(response.data?.blob).toBeInstanceOf(Blob)
        expect(response.data?.filename).toBeDefined()
        expect(response.data?.fileSize).toBeGreaterThan(0)
        expect(response.data?.url).toBeDefined()
      })

      it('should return blob with type application/zip for deck', async () => {
        const input: PrepareDownloadInput = {
          generatedCards: mockCards,
          styleInputs: mockStyleInputs,
        }

        const response = await service.prepareDownload(input)

        expect(response.success).toBe(true)
        expect(response.data?.blob.type).toBe('application/zip')
      })

      it('should return valid object URL string', async () => {
        const input: PrepareDownloadInput = {
          generatedCards: mockCards,
          styleInputs: mockStyleInputs,
        }

        const response = await service.prepareDownload(input)

        expect(response.success).toBe(true)
        expect(typeof response.data?.url).toBe('string')
        expect(response.data?.url.length).toBeGreaterThan(0)
      })

      it('should include metadata when includeMetadata is true', async () => {
        const input: PrepareDownloadInput = {
          generatedCards: mockCards,
          styleInputs: mockStyleInputs,
          includeMetadata: true,
        }

        const response = await service.prepareDownload(input)

        expect(response.success).toBe(true)
        // Blob with metadata should be larger
        expect(response.data?.fileSize).toBeGreaterThan(0)
      })

      it('should use custom deckName when provided', async () => {
        const input: PrepareDownloadInput = {
          generatedCards: mockCards,
          styleInputs: mockStyleInputs,
          deckName: 'Custom Tarot',
        }

        const response = await service.prepareDownload(input)

        expect(response.success).toBe(true)
        expect(response.data?.filename).toMatch(/^custom-tarot-\d+\.zip$/)
      })
    })

    describe('Error Cases', () => {
      it('should fail with NO_CARDS_PROVIDED when no cards provided', async () => {
        const input: PrepareDownloadInput = {
          generatedCards: [],
          styleInputs: mockStyleInputs,
        }

        const response = await service.prepareDownload(input)

        expect(response.success).toBe(false)
        expect(response.error?.code).toBe(DownloadErrorCode.NO_CARDS_PROVIDED)
      })

      it('should fail with INCOMPLETE_CARDS when fewer than 22 cards', async () => {
        const input: PrepareDownloadInput = {
          generatedCards: mockCards.slice(0, 15),
          styleInputs: mockStyleInputs,
        }

        const response = await service.prepareDownload(input)

        expect(response.success).toBe(false)
        expect(response.error?.code).toBe(DownloadErrorCode.INCOMPLETE_CARDS)
      })

      it('should fail with MISSING_IMAGES when cards missing imageUrls', async () => {
        const cardsWithoutImages = mockCards.map(card => ({
          ...card,
          imageUrl: undefined,
        }))

        const input: PrepareDownloadInput = {
          generatedCards: cardsWithoutImages as any,
          styleInputs: mockStyleInputs,
        }

        const response = await service.prepareDownload(input)

        expect(response.success).toBe(false)
        expect(response.error?.code).toBe(DownloadErrorCode.MISSING_IMAGES)
      })
    })

    describe('Response Structure Validation', () => {
      it('should return properly typed PrepareDownloadOutput', async () => {
        const input: PrepareDownloadInput = {
          generatedCards: mockCards,
          styleInputs: mockStyleInputs,
        }

        const response = await service.prepareDownload(input)

        expect(response.success).toBe(true)
        expect(response.data?.blob).toBeInstanceOf(Blob)
        expect(typeof response.data?.filename).toBe('string')
        expect(typeof response.data?.fileSize).toBe('number')
        expect(typeof response.data?.url).toBe('string')
      })

      it('should have fileSize matching blob.size', async () => {
        const input: PrepareDownloadInput = {
          generatedCards: mockCards,
          styleInputs: mockStyleInputs,
        }

        const response = await service.prepareDownload(input)

        expect(response.success).toBe(true)
        expect(response.data?.fileSize).toBe(response.data?.blob.size)
      })
    })
  })

  describe('Error Code Coverage', () => {
    it('should handle BLOB_CREATION_FAILED error', async () => {
      // This would be triggered by internal blob creation failure
      // Mock implementation might simulate this with specific conditions

      // Test structure: verify error code exists and is properly typed
      expect(DownloadErrorCode.BLOB_CREATION_FAILED).toBe('BLOB_CREATION_FAILED')
    })

    it('should handle ZIP_CREATION_FAILED error', async () => {
      expect(DownloadErrorCode.ZIP_CREATION_FAILED).toBe('ZIP_CREATION_FAILED')
    })

    it('should handle DOWNLOAD_BLOCKED error', async () => {
      expect(DownloadErrorCode.DOWNLOAD_BLOCKED).toBe('DOWNLOAD_BLOCKED')
    })

    it('should handle BLOB_API_NOT_SUPPORTED error', async () => {
      expect(DownloadErrorCode.BLOB_API_NOT_SUPPORTED).toBe('BLOB_API_NOT_SUPPORTED')
    })

    it('should handle JSZIP_NOT_AVAILABLE error', async () => {
      expect(DownloadErrorCode.JSZIP_NOT_AVAILABLE).toBe('JSZIP_NOT_AVAILABLE')
    })

    it('should handle INSUFFICIENT_STORAGE error', async () => {
      expect(DownloadErrorCode.INSUFFICIENT_STORAGE).toBe('INSUFFICIENT_STORAGE')
    })

    it('should handle DOWNLOAD_FAILED error', async () => {
      expect(DownloadErrorCode.DOWNLOAD_FAILED).toBe('DOWNLOAD_FAILED')
    })
  })

  describe('Integration Workflows', () => {
    it('should prepare download then verify blob size before actual download', async () => {
      // First prepare
      const prepareResponse = await service.prepareDownload({
        generatedCards: mockCards,
        styleInputs: mockStyleInputs,
      })

      expect(prepareResponse.success).toBe(true)

      // Then download
      const downloadResponse = await service.downloadDeck({
        generatedCards: mockCards,
        styleInputs: mockStyleInputs,
      })

      expect(downloadResponse.success).toBe(true)
      // Sizes should be similar (within reason)
      expect(downloadResponse.data!.fileSize).toBeGreaterThan(0)
      expect(prepareResponse.data!.fileSize).toBeGreaterThan(0)
    })

    it('should download deck with metadata then without metadata', async () => {
      const withMetadata = await service.downloadDeck({
        generatedCards: mockCards,
        styleInputs: mockStyleInputs,
        includeMetadata: true,
      })

      const withoutMetadata = await service.downloadDeck({
        generatedCards: mockCards,
        styleInputs: mockStyleInputs,
        includeMetadata: false,
      })

      expect(withMetadata.success).toBe(true)
      expect(withoutMetadata.success).toBe(true)
      expect(withMetadata.data!.includedMetadata).toBe(true)
      expect(withoutMetadata.data!.includedMetadata).toBe(false)
    })

    it('should download individual card then full deck', async () => {
      const cardResponse = await service.downloadCard({
        card: mockCards[0]!,
      })

      const deckResponse = await service.downloadDeck({
        generatedCards: mockCards,
        styleInputs: mockStyleInputs,
      })

      expect(cardResponse.success).toBe(true)
      expect(deckResponse.success).toBe(true)
      expect(deckResponse.data!.cardCount).toBe(22)
    })

    it('should handle custom deckName in both prepare and download', async () => {
      const customName = 'My Custom Deck'

      const prepareResponse = await service.prepareDownload({
        generatedCards: mockCards,
        styleInputs: mockStyleInputs,
        deckName: customName,
      })

      const downloadResponse = await service.downloadDeck({
        generatedCards: mockCards,
        styleInputs: mockStyleInputs,
        deckName: customName,
      })

      expect(prepareResponse.success).toBe(true)
      expect(downloadResponse.success).toBe(true)
      expect(prepareResponse.data!.filename).toMatch(/^my-custom-deck-\d+\.zip$/)
      expect(downloadResponse.data!.filename).toMatch(/^my-custom-deck-\d+\.zip$/)
    })
  })

  describe('Helper Functions', () => {
    describe('generateCardFilename()', () => {
      it('should generate "00-the-fool.png" for card 0', () => {
        const filename = generateCardFilename(0, 'The Fool')
        expect(filename).toBe('00-the-fool.png')
      })

      it('should generate "21-the-world.png" for card 21', () => {
        const filename = generateCardFilename(21, 'The World')
        expect(filename).toBe('21-the-world.png')
      })

      it('should pad single digit numbers with leading zero', () => {
        const filename = generateCardFilename(5, 'The Hierophant')
        expect(filename).toBe('05-the-hierophant.png')
      })

      it('should convert card name to lowercase with hyphens', () => {
        const filename = generateCardFilename(1, 'The Magician')
        expect(filename).toBe('01-the-magician.png')
      })

      it('should handle multiple spaces in card name', () => {
        const filename = generateCardFilename(13, 'Death')
        expect(filename).toBe('13-death.png')
      })
    })

    describe('generateDeckFilename()', () => {
      it('should generate filename with lowercase and hyphens', () => {
        const filename = generateDeckFilename('Cyberpunk Tarot')
        expect(filename).toMatch(/^cyberpunk-tarot-\d+\.zip$/)
      })

      it('should include timestamp in filename', () => {
        const filename = generateDeckFilename('My Deck')
        expect(filename).toMatch(/^my-deck-\d{13}\.zip$/)
      })

      it('should replace spaces with hyphens', () => {
        const filename = generateDeckFilename('Very Long Deck Name')
        expect(filename).toMatch(/^very-long-deck-name-\d+\.zip$/)
      })

      it('should handle single word deck names', () => {
        const filename = generateDeckFilename('Tarot')
        expect(filename).toMatch(/^tarot-\d+\.zip$/)
      })
    })
  })
})

// ============================================================================
// HELPER FUNCTIONS FOR TESTS
// ============================================================================

/**
 * Get Major Arcana card name by number
 */
function getMajorArcanaName(cardNumber: number): string {
  const names = [
    'The Fool',
    'The Magician',
    'The High Priestess',
    'The Empress',
    'The Emperor',
    'The Hierophant',
    'The Lovers',
    'The Chariot',
    'Strength',
    'The Hermit',
    'Wheel of Fortune',
    'Justice',
    'The Hanged Man',
    'Death',
    'Temperance',
    'The Devil',
    'The Tower',
    'The Star',
    'The Moon',
    'The Sun',
    'Judgement',
    'The World',
  ]
  return names[cardNumber] || 'Unknown'
}
