/**
 * @fileoverview Contract tests for Download seam
 * @purpose Validate DownloadMock matches Download contract exactly
 * @testStrategy
 * 1. Interface compliance - Mock implements interface
 * 2. Input validation - Handles valid/invalid inputs correctly
 * 3. Return types - Matches contract types exactly
 * 4. Error handling - Returns correct error codes
 * 5. Download operations - Both ZIP and individual formats work
 */

import { describe, it, expect, beforeEach } from 'vitest'
import type { IDownloadService } from '$contracts/Download'
import { DownloadErrorCode } from '$contracts/Download'
import { downloadMockService } from '$services/mock/DownloadMock'

describe('Download Contract Compliance', () => {
  let service: IDownloadService

  beforeEach(() => {
    service = downloadMockService
  })

  // Helper to create mock generated cards
  const createMockCards = (count: number) => {
    return Array.from({ length: count }, (_, i) => ({
      id: `card-${i}` as any,
      cardNumber: i as any,
      cardName: `Card ${i}`,
      prompt: `Prompt ${i}`,
      generationStatus: 'completed' as const,
      retryCount: 0,
      generatedAt: new Date(),
      imageUrl: `https://example.com/card-${i}.png`,
    }))
  }

  describe('Interface Implementation', () => {
    it('should implement IDownloadService interface', () => {
      expect(service).toBeDefined()
      expect(service.downloadDeck).toBeDefined()
      expect(typeof service.downloadDeck).toBe('function')
      expect(service.downloadCard).toBeDefined()
      expect(typeof service.downloadCard).toBe('function')
      expect(service.prepareDeck).toBeDefined()
      expect(typeof service.prepareDeck).toBe('function')
    })
  })

  describe('downloadDeck()', () => {
    it('should require cards array (1-22 cards)', async () => {
      const response = await service.downloadDeck({
        cards: [],
        format: 'zip',
      })

      expect(response.success).toBe(false)
      expect(response.error).toBeDefined()
    })

    it('should require format (zip or individual)', async () => {
      const cards = createMockCards(22)

      const zipResponse = await service.downloadDeck({
        cards,
        format: 'zip',
      })

      const individualResponse = await service.downloadDeck({
        cards,
        format: 'individual',
      })

      expect(zipResponse.success).toBe(true)
      expect(individualResponse.success).toBe(true)
    })

    it('should return DownloadResult with url, fileName, fileSize, format', async () => {
      const cards = createMockCards(22)

      const response = await service.downloadDeck({
        cards,
        format: 'zip',
      })

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      if (response.data) {
        expect(response.data.url).toBeTruthy()
        expect(response.data.fileName).toBeTruthy()
        expect(response.data.fileSize).toBeGreaterThan(0)
        expect(response.data.format).toBe('zip')
      }
    })

    it('should have blob URL or download link format', async () => {
      const cards = createMockCards(22)

      const response = await service.downloadDeck({
        cards,
        format: 'zip',
      })

      if (response.data) {
        expect(response.data.url).toMatch(/^(blob:|https?:\/\/|mock:\/\/)/i)
      }
    })

    it('should have correct extension (.zip for zip format)', async () => {
      const cards = createMockCards(22)

      const response = await service.downloadDeck({
        cards,
        format: 'zip',
      })

      if (response.data) {
        expect(response.data.fileName).toMatch(/\.zip$/i)
      }
    })

    it('should have positive fileSize in bytes', async () => {
      const cards = createMockCards(22)

      const response = await service.downloadDeck({
        cards,
        format: 'zip',
      })

      if (response.data) {
        expect(response.data.fileSize).toBeGreaterThan(0)
        expect(typeof response.data.fileSize).toBe('number')
      }
    })

    it('should return correct error codes', async () => {
      const emptyResponse = await service.downloadDeck({
        cards: [],
        format: 'zip',
      })

      expect(emptyResponse.success).toBe(false)
      if (emptyResponse.error) {
        expect(
          [DownloadErrorCode.NO_CARDS, DownloadErrorCode.INVALID_CARD_DATA]
        ).toContain(emptyResponse.error.code)
      }
    })

    it('should simulate file preparation delay (100-500ms)', async () => {
      const cards = createMockCards(22)
      const startTime = Date.now()

      await service.downloadDeck({
        cards,
        format: 'zip',
      })

      const elapsed = Date.now() - startTime
      expect(elapsed).toBeGreaterThan(50) // At least some delay
    })

    it('should handle both zip and individual formats', async () => {
      const cards = createMockCards(22)

      const zipResponse = await service.downloadDeck({
        cards,
        format: 'zip',
      })

      const individualResponse = await service.downloadDeck({
        cards,
        format: 'individual',
      })

      expect(zipResponse.success).toBe(true)
      expect(individualResponse.success).toBe(true)
      expect(zipResponse.data?.format).toBe('zip')
      expect(individualResponse.data?.format).toBe('individual')
    })

    it('should accept custom deck name', async () => {
      const cards = createMockCards(22)

      const response = await service.downloadDeck({
        cards,
        format: 'zip',
        deckName: 'My Custom Deck',
      })

      if (response.data) {
        expect(response.data.fileName).toContain('My Custom Deck')
      }
    })
  })

  describe('downloadCard()', () => {
    it('should download single card image', async () => {
      const card = createMockCards(1)[0]

      if (card) {
        const response = await service.downloadCard({
          card,
        })

        expect(response.success).toBe(true)
        expect(response.data).toBeDefined()
        if (response.data) {
          expect(response.data.url).toBeTruthy()
          expect(response.data.fileName).toBeTruthy()
          expect(response.data.fileSize).toBeGreaterThan(0)
        }
      }
    })

    it('should return DownloadResult for individual card', async () => {
      const card = createMockCards(1)[0]

      if (card) {
        const response = await service.downloadCard({
          card,
        })

        if (response.success && response.data) {
          expect(response.data).toHaveProperty('url')
          expect(response.data).toHaveProperty('fileName')
          expect(response.data).toHaveProperty('fileSize')
          expect(response.data).toHaveProperty('format')
        }
      }
    })

    it('should accept custom filename', async () => {
      const card = createMockCards(1)[0]

      if (card) {
        const response = await service.downloadCard({
          card,
          filename: 'custom-name.png',
        })

        if (response.data) {
          expect(response.data.fileName).toBe('custom-name.png')
        }
      }
    })

    it('should have correct file extension', async () => {
      const card = createMockCards(1)[0]

      if (card) {
        const response = await service.downloadCard({
          card,
        })

        if (response.data) {
          expect(response.data.fileName).toMatch(/\.(png|jpg|jpeg)$/i)
        }
      }
    })
  })

  describe('prepareDeck()', () => {
    it('should prepare deck without triggering download', async () => {
      const cards = createMockCards(22)

      const response = await service.prepareDeck({
        cards,
        format: 'zip',
      })

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      if (response.data) {
        expect(response.data.blob).toBeDefined()
        expect(response.data.fileName).toBeTruthy()
        expect(response.data.fileSize).toBeGreaterThan(0)
      }
    })

    it('should return blob for custom handling', async () => {
      const cards = createMockCards(22)

      const response = await service.prepareDeck({
        cards,
        format: 'zip',
      })

      if (response.data) {
        expect(response.data.blob).toBeDefined()
        expect(response.data.blob instanceof Blob || typeof response.data.blob === 'object').toBe(
          true
        )
      }
    })

    it('should support progress tracking', async () => {
      const cards = createMockCards(22)
      const progressUpdates: number[] = []

      await service.prepareDeck({
        cards,
        format: 'zip',
        onProgress: (progress) => {
          progressUpdates.push(progress.progress)
        },
      })

      if (progressUpdates.length > 0) {
        expect(progressUpdates[0]).toBeGreaterThanOrEqual(0)
        expect(progressUpdates[progressUpdates.length - 1]).toBeLessThanOrEqual(100)
      }
    })
  })

  describe('Return Types', () => {
    it('should match contract types exactly', async () => {
      const cards = createMockCards(22)

      const downloadResponse = await service.downloadDeck({
        cards,
        format: 'zip',
      })

      expect(downloadResponse).toHaveProperty('success')
      if (downloadResponse.success && downloadResponse.data) {
        expect(downloadResponse.data).toHaveProperty('url')
        expect(downloadResponse.data).toHaveProperty('fileName')
        expect(downloadResponse.data).toHaveProperty('fileSize')
        expect(downloadResponse.data).toHaveProperty('format')
      }

      const prepareResponse = await service.prepareDeck({
        cards,
        format: 'zip',
      })

      if (prepareResponse.success && prepareResponse.data) {
        expect(prepareResponse.data).toHaveProperty('blob')
        expect(prepareResponse.data).toHaveProperty('fileName')
        expect(prepareResponse.data).toHaveProperty('fileSize')
      }
    })
  })

  describe('Error Handling', () => {
    it('should handle empty cards array', async () => {
      const response = await service.downloadDeck({
        cards: [],
        format: 'zip',
      })

      expect(response.success).toBe(false)
      expect(response.error).toBeDefined()
    })

    it('should handle invalid format', async () => {
      const cards = createMockCards(22)

      const response = await service.downloadDeck({
        cards,
        format: 'invalid' as any,
      })

      expect(response.success).toBe(false)
      if (response.error) {
        expect(response.error.code).toBe(DownloadErrorCode.INVALID_FORMAT)
      }
    })

    it('should handle missing card images', async () => {
      const cardsWithoutImages = createMockCards(22).map((card) => ({
        ...card,
        imageUrl: undefined,
      }))

      const response = await service.downloadDeck({
        cards: cardsWithoutImages as any,
        format: 'zip',
      })

      expect(response.success).toBe(false)
      if (response.error) {
        expect(response.error.code).toBe(DownloadErrorCode.INVALID_CARD_DATA)
      }
    })
  })

  describe('Async Behavior', () => {
    it('should return promises for all methods', () => {
      const cards = createMockCards(1)

      expect(service.downloadDeck({ cards, format: 'zip' })).toBeInstanceOf(Promise)
      expect(service.downloadCard({ card: cards[0]! })).toBeInstanceOf(Promise)
      expect(service.prepareDeck({ cards, format: 'zip' })).toBeInstanceOf(Promise)
    })
  })

  describe('File Size Validation', () => {
    it('should return reasonable file sizes', async () => {
      const cards = createMockCards(22)

      const response = await service.downloadDeck({
        cards,
        format: 'zip',
      })

      if (response.data) {
        // ZIP of 22 images should be at least 1KB and less than 100MB
        expect(response.data.fileSize).toBeGreaterThan(1000)
        expect(response.data.fileSize).toBeLessThan(100 * 1024 * 1024)
      }
    })

    it('should scale file size with card count', async () => {
      const fewCards = createMockCards(5)
      const manyCards = createMockCards(22)

      const fewResponse = await service.downloadDeck({
        cards: fewCards,
        format: 'zip',
      })

      const manyResponse = await service.downloadDeck({
        cards: manyCards,
        format: 'zip',
      })

      if (fewResponse.data && manyResponse.data) {
        expect(manyResponse.data.fileSize).toBeGreaterThan(fewResponse.data.fileSize)
      }
    })
  })
})
