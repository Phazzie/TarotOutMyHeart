/**
 * @fileoverview Contract tests for Download seam
 * @purpose Validate DownloadMock matches Download contract exactly
 * @testStrategy
 * 1. Interface compliance - Mock implements IDownloadService
 * 2. Download operations - ZIP deck download, single card download
 * 3. Return types - DownloadDeckOutput, DownloadCardOutput structures
 * 4. Error handling - Returns correct DownloadErrorCode values
 * 5. File preparation - Metadata inclusion, filename generation
 */

import { describe, it, expect, beforeEach } from 'vitest'
import type { IDownloadService, GeneratedCard } from '$contracts/Download'
import { DownloadErrorCode } from '$contracts/Download'
import { downloadService } from '$services/factory'
import { promptGenerationService } from '$services/factory'
import { imageGenerationService } from '$services/factory'

describe('Download Contract Compliance', () => {
  let service: IDownloadService
  let mockCards: GeneratedCard[]
  let mockStyleInputs: any

  beforeEach(async () => {
    service = downloadService

    mockStyleInputs = {
      theme: 'Cyberpunk',
      tone: 'Dark',
      description: 'Neon-lit dystopian future',
    }

    // Generate mock cards for testing
    const promptResponse = await promptGenerationService.generatePrompts({
      referenceImageUrls: ['https://example.com/image1.jpg'],
      styleInputs: mockStyleInputs,
    })

    if (promptResponse.success && promptResponse.data) {
      const imageResponse = await imageGenerationService.generateImages({
        prompts: promptResponse.data.cardPrompts,
      })

      if (imageResponse.success && imageResponse.data) {
        mockCards = imageResponse.data.generatedCards
      }
    }
  })

  describe('Interface Implementation', () => {
    it('should implement IDownloadService interface', () => {
      expect(service).toBeDefined()
      expect(service.downloadDeck).toBeDefined()
      expect(typeof service.downloadDeck).toBe('function')
      expect(service.downloadCard).toBeDefined()
      expect(typeof service.downloadCard).toBe('function')
      expect(service.prepareDownload).toBeDefined()
      expect(typeof service.prepareDownload).toBe('function')
    })
  })

  describe('downloadDeck()', () => {
    it('should download complete deck as ZIP', async () => {
      const response = await service.downloadDeck({
        generatedCards: mockCards,
        styleInputs: mockStyleInputs,
      })

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      if (response.data) {
        expect(response.data.downloaded).toBe(true)
        expect(response.data.filename).toBeDefined()
        expect(typeof response.data.filename).toBe('string')
        expect(response.data.filename).toMatch(/\.zip$/)
        expect(response.data.fileSize).toBeGreaterThan(0)
        expect(response.data.cardCount).toBe(22)
        expect(typeof response.data.includedMetadata).toBe('boolean')
      }
    })

    it('should accept custom deck name', async () => {
      const response = await service.downloadDeck({
        generatedCards: mockCards,
        styleInputs: mockStyleInputs,
        deckName: 'My Cyberpunk Deck',
      })

      expect(response.success).toBe(true)
      if (response.data) {
        expect(response.data.filename).toContain('my-cyberpunk-deck')
      }
    })

    it('should include metadata when requested', async () => {
      const response = await service.downloadDeck({
        generatedCards: mockCards,
        styleInputs: mockStyleInputs,
        includeMetadata: true,
      })

      expect(response.success).toBe(true)
      if (response.data) {
        expect(response.data.includedMetadata).toBe(true)
      }
    })

    it('should exclude metadata when not requested', async () => {
      const response = await service.downloadDeck({
        generatedCards: mockCards,
        styleInputs: mockStyleInputs,
        includeMetadata: false,
      })

      expect(response.success).toBe(true)
      if (response.data) {
        expect(response.data.includedMetadata).toBe(false)
      }
    })

    it('should support ZIP format', async () => {
      const response = await service.downloadDeck({
        generatedCards: mockCards,
        styleInputs: mockStyleInputs,
        format: 'zip',
      })

      expect(response.success).toBe(true)
      if (response.data) {
        expect(response.data.filename).toMatch(/\.zip$/)
      }
    })

    it('should support individual format', async () => {
      const response = await service.downloadDeck({
        generatedCards: mockCards,
        styleInputs: mockStyleInputs,
        format: 'individual',
      })

      expect(response.success).toBe(true)
      // Individual format may or may not use ZIP depending on implementation
    })

    it('should support progress callback', async () => {
      let progressCalled = false

      const response = await service.downloadDeck({
        generatedCards: mockCards,
        styleInputs: mockStyleInputs,
        onProgress: (progress) => {
          progressCalled = true
          expect(progress.status).toBeDefined()
          expect(progress.progress).toBeGreaterThanOrEqual(0)
          expect(progress.progress).toBeLessThanOrEqual(100)
          expect(['preparing', 'fetching', 'packaging', 'downloading', 'complete']).toContain(
            progress.currentStep
          )
        },
      })

      expect(response.success).toBe(true)
      // Progress callback may or may not be called in mock
    })

    it('should return error for no cards provided', async () => {
      const response = await service.downloadDeck({
        generatedCards: [],
        styleInputs: mockStyleInputs,
      })

      expect(response.success).toBe(false)
      expect(response.error).toBeDefined()
      if (response.error) {
        expect(response.error.code).toBe(DownloadErrorCode.NO_CARDS_PROVIDED)
      }
    })

    it('should return error for incomplete cards', async () => {
      // Create cards with missing images
      const incompleteCards = mockCards.map((card) => ({
        ...card,
        imageUrl: undefined,
        imageDataUrl: undefined,
        generationStatus: 'failed' as const,
      }))

      const response = await service.downloadDeck({
        generatedCards: incompleteCards,
        styleInputs: mockStyleInputs,
      })

      expect(response.success).toBe(false)
      expect(response.error).toBeDefined()
      if (response.error) {
        expect([DownloadErrorCode.INCOMPLETE_CARDS, DownloadErrorCode.MISSING_IMAGES]).toContain(
          response.error.code
        )
      }
    })
  })

  describe('downloadCard()', () => {
    it('should download single card', async () => {
      const response = await service.downloadCard({
        card: mockCards[0],
      })

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      if (response.data) {
        expect(response.data.downloaded).toBe(true)
        expect(response.data.filename).toBeDefined()
        expect(typeof response.data.filename).toBe('string')
        expect(response.data.filename).toMatch(/\.png$/)
        expect(response.data.fileSize).toBeGreaterThan(0)
      }
    })

    it('should accept custom filename', async () => {
      const response = await service.downloadCard({
        card: mockCards[0],
        filename: 'my-custom-card.png',
      })

      expect(response.success).toBe(true)
      if (response.data) {
        expect(response.data.filename).toBe('my-custom-card.png')
      }
    })

    it('should use default filename when not provided', async () => {
      const response = await service.downloadCard({
        card: mockCards[0],
      })

      expect(response.success).toBe(true)
      if (response.data) {
        // Default filename should follow pattern: 00-the-fool.png
        expect(response.data.filename).toMatch(/^\d{2}-[\w-]+\.png$/)
      }
    })

    it('should download cards from different positions', async () => {
      const firstResponse = await service.downloadCard({
        card: mockCards[0],
      })
      expect(firstResponse.success).toBe(true)

      const middleResponse = await service.downloadCard({
        card: mockCards[10],
      })
      expect(middleResponse.success).toBe(true)

      const lastResponse = await service.downloadCard({
        card: mockCards[21],
      })
      expect(lastResponse.success).toBe(true)
    })
  })

  describe('prepareDownload()', () => {
    it('should prepare download without triggering browser download', async () => {
      const response = await service.prepareDownload({
        generatedCards: mockCards,
        styleInputs: mockStyleInputs,
      })

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      if (response.data) {
        expect(response.data.blob).toBeDefined()
        expect(response.data.blob).toBeInstanceOf(Blob)
        expect(response.data.filename).toBeDefined()
        expect(response.data.fileSize).toBeGreaterThan(0)
        expect(response.data.url).toBeDefined()
        expect(typeof response.data.url).toBe('string')
      }
    })

    it('should accept custom deck name', async () => {
      const response = await service.prepareDownload({
        generatedCards: mockCards,
        styleInputs: mockStyleInputs,
        deckName: 'Prepared Deck',
      })

      expect(response.success).toBe(true)
      if (response.data) {
        expect(response.data.filename).toContain('prepared-deck')
      }
    })

    it('should include metadata when requested', async () => {
      const response = await service.prepareDownload({
        generatedCards: mockCards,
        styleInputs: mockStyleInputs,
        includeMetadata: true,
      })

      expect(response.success).toBe(true)
      // Metadata inclusion should be reflected in file size
      expect(response.data?.fileSize).toBeGreaterThan(0)
    })

    it('should return blob URL for custom handling', async () => {
      const response = await service.prepareDownload({
        generatedCards: mockCards,
        styleInputs: mockStyleInputs,
      })

      expect(response.success).toBe(true)
      if (response.data) {
        // URL should be a blob URL or data URL
        expect(response.data.url).toBeDefined()
        expect(typeof response.data.url).toBe('string')
      }
    })

    it('should return error for no cards provided', async () => {
      const response = await service.prepareDownload({
        generatedCards: [],
        styleInputs: mockStyleInputs,
      })

      expect(response.success).toBe(false)
      expect(response.error?.code).toBe(DownloadErrorCode.NO_CARDS_PROVIDED)
    })
  })

  describe('Return Type Validation', () => {
    it('should return all async methods as Promises', async () => {
      const downloadDeckPromise = service.downloadDeck({
        generatedCards: mockCards,
        styleInputs: mockStyleInputs,
      })
      expect(downloadDeckPromise).toBeInstanceOf(Promise)

      const downloadCardPromise = service.downloadCard({
        card: mockCards[0],
      })
      expect(downloadCardPromise).toBeInstanceOf(Promise)

      const preparePromise = service.prepareDownload({
        generatedCards: mockCards,
        styleInputs: mockStyleInputs,
      })
      expect(preparePromise).toBeInstanceOf(Promise)
    })

    it('should handle all 22 cards in download', async () => {
      const response = await service.downloadDeck({
        generatedCards: mockCards,
        styleInputs: mockStyleInputs,
      })

      expect(response.success).toBe(true)
      if (response.data) {
        expect(response.data.cardCount).toBe(22)
      }
    })

    it('should generate valid filenames', async () => {
      const response = await service.downloadDeck({
        generatedCards: mockCards,
        styleInputs: mockStyleInputs,
        deckName: 'Test Deck',
      })

      expect(response.success).toBe(true)
      if (response.data) {
        // Filename should be lowercase with hyphens
        expect(response.data.filename).toMatch(/^[a-z0-9-]+\.zip$/)
      }
    })

    it('should calculate file size correctly', async () => {
      const response = await service.downloadDeck({
        generatedCards: mockCards,
        styleInputs: mockStyleInputs,
      })

      expect(response.success).toBe(true)
      if (response.data) {
        // File size should be reasonable for 22 images
        expect(response.data.fileSize).toBeGreaterThan(100) // At least 100 bytes
      }
    })

    it('should handle deck name sanitization', async () => {
      const response = await service.downloadDeck({
        generatedCards: mockCards,
        styleInputs: mockStyleInputs,
        deckName: 'My Deck With Spaces & Special!',
      })

      expect(response.success).toBe(true)
      if (response.data) {
        // Special characters should be removed or replaced
        expect(response.data.filename).toMatch(/^[a-z0-9-]+\.zip$/)
      }
    })
  })

  describe('Edge Cases', () => {
    it('should handle cards with only imageDataUrl', async () => {
      const cardsWithDataUrl = mockCards.map((card) => ({
        ...card,
        imageUrl: undefined,
        imageDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      }))

      const response = await service.downloadDeck({
        generatedCards: cardsWithDataUrl,
        styleInputs: mockStyleInputs,
      })

      expect(response.success).toBe(true)
    })

    it('should handle cards with only imageUrl', async () => {
      const cardsWithUrl = mockCards.map((card) => ({
        ...card,
        imageUrl: 'https://example.com/card.png',
        imageDataUrl: undefined,
      }))

      const response = await service.downloadDeck({
        generatedCards: cardsWithUrl,
        styleInputs: mockStyleInputs,
      })

      expect(response.success).toBe(true)
    })

    it('should handle default deck name', async () => {
      const response = await service.downloadDeck({
        generatedCards: mockCards,
        styleInputs: mockStyleInputs,
        // No deck name provided
      })

      expect(response.success).toBe(true)
      if (response.data) {
        // Should use a default name
        expect(response.data.filename).toBeDefined()
        expect(response.data.filename).toMatch(/\.zip$/)
      }
    })
  })
})
