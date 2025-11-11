/**
 * @fileoverview Contract tests for DeckDisplay seam
 * @purpose Validate DeckDisplayMock matches DeckDisplay contract exactly
 * @testStrategy
 * 1. Interface compliance - Mock implements IDeckDisplayService
 * 2. Display management - Layout, size, sort, filter operations
 * 3. Return types - DeckDisplayState, DisplayCard, LightboxState structures
 * 4. Error handling - Returns correct DeckDisplayErrorCode values
 * 5. Interaction - Card selection, lightbox navigation
 */

import { describe, it, expect, beforeEach } from 'vitest'
import type { IDeckDisplayService, GeneratedCard } from '$contracts/DeckDisplay'
import { DeckDisplayErrorCode } from '$contracts/DeckDisplay'
import { deckDisplayService } from '$services/factory'
import { promptGenerationService } from '$services/factory'
import { imageGenerationService } from '$services/factory'

describe('DeckDisplay Contract Compliance', () => {
  let service: IDeckDisplayService
  let mockCards: GeneratedCard[]

  beforeEach(async () => {
    service = deckDisplayService

    // Generate mock cards for testing
    const promptResponse = await promptGenerationService.generatePrompts({
      referenceImageUrls: ['https://example.com/image1.jpg'],
      styleInputs: {
        theme: 'Test',
        tone: 'Test',
        description: 'Test description',
      },
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
    it('should implement IDeckDisplayService interface', () => {
      expect(service).toBeDefined()
      expect(service.initializeDisplay).toBeDefined()
      expect(typeof service.initializeDisplay).toBe('function')
      expect(service.changeLayout).toBeDefined()
      expect(typeof service.changeLayout).toBe('function')
      expect(service.changeCardSize).toBeDefined()
      expect(typeof service.changeCardSize).toBe('function')
      expect(service.sortCards).toBeDefined()
      expect(typeof service.sortCards).toBe('function')
      expect(service.filterCards).toBeDefined()
      expect(typeof service.filterCards).toBe('function')
      expect(service.selectCard).toBeDefined()
      expect(typeof service.selectCard).toBe('function')
      expect(service.openLightbox).toBeDefined()
      expect(typeof service.openLightbox).toBe('function')
      expect(service.closeLightbox).toBeDefined()
      expect(typeof service.closeLightbox).toBe('function')
      expect(service.navigateLightbox).toBeDefined()
      expect(typeof service.navigateLightbox).toBe('function')
    })
  })

  describe('initializeDisplay()', () => {
    it('should initialize display with generated cards', async () => {
      const response = await service.initializeDisplay({
        generatedCards: mockCards,
      })

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      if (response.data) {
        expect(response.data.state).toBeDefined()
        expect(response.data.displayCards).toHaveLength(22)
        expect(response.data.visibleCount).toBe(22)
      }
    })

    it('should create display state with default values', async () => {
      const response = await service.initializeDisplay({
        generatedCards: mockCards,
      })

      expect(response.success).toBe(true)
      if (response.data) {
        expect(response.data.state.layout).toBeDefined()
        expect(response.data.state.cardSize).toBeDefined()
        expect(response.data.state.sortBy).toBeDefined()
        expect(response.data.state.selectedCard).toBeNull()
        expect(response.data.state.lightboxOpen).toBe(false)
        expect(typeof response.data.state.showMetadata).toBe('boolean')
      }
    })

    it('should accept initial layout and size', async () => {
      const response = await service.initializeDisplay({
        generatedCards: mockCards,
        initialLayout: 'grid',
        initialSize: 'large',
      })

      expect(response.success).toBe(true)
      if (response.data) {
        expect(response.data.state.layout).toBe('grid')
        expect(response.data.state.cardSize).toBe('large')
      }
    })

    it('should create DisplayCard objects with required properties', async () => {
      const response = await service.initializeDisplay({
        generatedCards: mockCards,
      })

      expect(response.success).toBe(true)
      if (response.data) {
        const firstCard = response.data.displayCards[0]
        expect(firstCard).toHaveProperty('card')
        expect(firstCard).toHaveProperty('position')
        expect(firstCard).toHaveProperty('visible')
        expect(firstCard).toHaveProperty('loading')
        expect(typeof firstCard.position).toBe('number')
        expect(typeof firstCard.visible).toBe('boolean')
        expect(typeof firstCard.loading).toBe('boolean')
      }
    })

    it('should return error for no cards provided', async () => {
      const response = await service.initializeDisplay({
        generatedCards: [],
      })

      expect(response.success).toBe(false)
      expect(response.error).toBeDefined()
      if (response.error) {
        expect(response.error.code).toBe(DeckDisplayErrorCode.NO_CARDS_PROVIDED)
      }
    })
  })

  describe('changeLayout()', () => {
    it('should change display layout', async () => {
      await service.initializeDisplay({ generatedCards: mockCards })

      const response = await service.changeLayout({
        layout: 'list',
      })

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      if (response.data) {
        expect(response.data.state.layout).toBe('list')
        expect(response.data.layout).toBe('list')
      }
    })

    it('should support all layout types', async () => {
      await service.initializeDisplay({ generatedCards: mockCards })

      const layouts = ['grid', 'list', 'carousel'] as const

      for (const layout of layouts) {
        const response = await service.changeLayout({ layout })
        expect(response.success).toBe(true)
        expect(response.data?.layout).toBe(layout)
      }
    })

    it('should return error for invalid layout', async () => {
      await service.initializeDisplay({ generatedCards: mockCards })

      const response = await service.changeLayout({
        layout: 'invalid-layout' as any,
      })

      expect(response.success).toBe(false)
      expect(response.error?.code).toBe(DeckDisplayErrorCode.INVALID_LAYOUT)
    })
  })

  describe('changeCardSize()', () => {
    it('should change card size', async () => {
      await service.initializeDisplay({ generatedCards: mockCards })

      const response = await service.changeCardSize({
        size: 'large',
      })

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      if (response.data) {
        expect(response.data.state.cardSize).toBe('large')
        expect(response.data.size).toBe('large')
      }
    })

    it('should support all size types', async () => {
      await service.initializeDisplay({ generatedCards: mockCards })

      const sizes = ['small', 'medium', 'large'] as const

      for (const size of sizes) {
        const response = await service.changeCardSize({ size })
        expect(response.success).toBe(true)
        expect(response.data?.size).toBe(size)
      }
    })
  })

  describe('sortCards()', () => {
    it('should sort cards by number', async () => {
      await service.initializeDisplay({ generatedCards: mockCards })

      const response = await service.sortCards({
        sortBy: 'number',
      })

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      if (response.data) {
        expect(response.data.state.sortBy).toBe('number')
        expect(response.data.displayCards).toHaveLength(22)
      }
    })

    it('should sort cards by name', async () => {
      await service.initializeDisplay({ generatedCards: mockCards })

      const response = await service.sortCards({
        sortBy: 'name',
      })

      expect(response.success).toBe(true)
      expect(response.data?.state.sortBy).toBe('name')
    })

    it('should sort cards by generated date', async () => {
      await service.initializeDisplay({ generatedCards: mockCards })

      const response = await service.sortCards({
        sortBy: 'generated-date',
      })

      expect(response.success).toBe(true)
      expect(response.data?.state.sortBy).toBe('generated-date')
    })

    it('should support ascending and descending order', async () => {
      await service.initializeDisplay({ generatedCards: mockCards })

      const ascResponse = await service.sortCards({
        sortBy: 'number',
        ascending: true,
      })
      expect(ascResponse.success).toBe(true)

      const descResponse = await service.sortCards({
        sortBy: 'number',
        ascending: false,
      })
      expect(descResponse.success).toBe(true)
    })
  })

  describe('filterCards()', () => {
    it('should filter cards by search term', async () => {
      await service.initializeDisplay({ generatedCards: mockCards })

      const response = await service.filterCards({
        filter: 'Fool',
      })

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      if (response.data) {
        expect(response.data.visibleCount).toBeLessThanOrEqual(22)
        expect(response.data.state.filter).toBe('Fool')
      }
    })

    it('should show all cards with empty filter', async () => {
      await service.initializeDisplay({ generatedCards: mockCards })

      const response = await service.filterCards({
        filter: '',
      })

      expect(response.success).toBe(true)
      expect(response.data?.visibleCount).toBe(22)
    })

    it('should update visible count based on filter', async () => {
      await service.initializeDisplay({ generatedCards: mockCards })

      const response = await service.filterCards({
        filter: 'NonExistentCard',
      })

      expect(response.success).toBe(true)
      if (response.data) {
        expect(response.data.visibleCount).toBeGreaterThanOrEqual(0)
      }
    })
  })

  describe('selectCard()', () => {
    it('should select a card by number', async () => {
      await service.initializeDisplay({ generatedCards: mockCards })

      const response = await service.selectCard({
        cardNumber: 0,
      })

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      if (response.data) {
        expect(response.data.state.selectedCard).toBe(0)
        expect(response.data.selectedCard).toBeDefined()
        expect(response.data.selectedCard.card.cardNumber).toBe(0)
      }
    })

    it('should open lightbox when requested', async () => {
      await service.initializeDisplay({ generatedCards: mockCards })

      const response = await service.selectCard({
        cardNumber: 5,
        openLightbox: true,
      })

      expect(response.success).toBe(true)
      if (response.data) {
        expect(response.data.state.selectedCard).toBe(5)
        expect(response.data.state.lightboxOpen).toBe(true)
        expect(response.data.lightboxState).toBeDefined()
      }
    })

    it('should return error for invalid card number', async () => {
      await service.initializeDisplay({ generatedCards: mockCards })

      const response = await service.selectCard({
        cardNumber: 99,
      })

      expect(response.success).toBe(false)
      expect(response.error?.code).toBe(DeckDisplayErrorCode.INVALID_CARD_NUMBER)
    })
  })

  describe('openLightbox()', () => {
    it('should open lightbox for card', async () => {
      await service.initializeDisplay({ generatedCards: mockCards })

      const response = await service.openLightbox({
        cardNumber: 10,
      })

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      if (response.data) {
        expect(response.data.state.lightboxOpen).toBe(true)
        expect(response.data.lightboxState.open).toBe(true)
        expect(response.data.lightboxState.currentCard).toBe(10)
        expect(response.data.card.card.cardNumber).toBe(10)
      }
    })

    it('should configure lightbox display options', async () => {
      await service.initializeDisplay({ generatedCards: mockCards })

      const response = await service.openLightbox({
        cardNumber: 5,
        showPrompt: true,
        showMetadata: true,
      })

      expect(response.success).toBe(true)
      if (response.data) {
        expect(response.data.lightboxState.showPrompt).toBe(true)
        expect(response.data.lightboxState.showMetadata).toBe(true)
      }
    })

    it('should set navigation flags correctly', async () => {
      await service.initializeDisplay({ generatedCards: mockCards })

      // First card - can only go right
      const firstResponse = await service.openLightbox({
        cardNumber: 0,
      })
      expect(firstResponse.success).toBe(true)
      if (firstResponse.data) {
        expect(firstResponse.data.lightboxState.canNavigateLeft).toBe(false)
        expect(firstResponse.data.lightboxState.canNavigateRight).toBe(true)
      }

      // Last card - can only go left
      const lastResponse = await service.openLightbox({
        cardNumber: 21,
      })
      expect(lastResponse.success).toBe(true)
      if (lastResponse.data) {
        expect(lastResponse.data.lightboxState.canNavigateLeft).toBe(true)
        expect(lastResponse.data.lightboxState.canNavigateRight).toBe(false)
      }

      // Middle card - can go both ways
      const middleResponse = await service.openLightbox({
        cardNumber: 10,
      })
      expect(middleResponse.success).toBe(true)
      if (middleResponse.data) {
        expect(middleResponse.data.lightboxState.canNavigateLeft).toBe(true)
        expect(middleResponse.data.lightboxState.canNavigateRight).toBe(true)
      }
    })
  })

  describe('closeLightbox()', () => {
    it('should close lightbox', async () => {
      await service.initializeDisplay({ generatedCards: mockCards })
      await service.openLightbox({ cardNumber: 5 })

      const response = await service.closeLightbox()

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      if (response.data) {
        expect(response.data.state.lightboxOpen).toBe(false)
      }
    })

    it('should succeed even when lightbox not open', async () => {
      await service.initializeDisplay({ generatedCards: mockCards })

      const response = await service.closeLightbox()

      expect(response.success).toBe(true)
    })
  })

  describe('navigateLightbox()', () => {
    it('should navigate to next card', async () => {
      await service.initializeDisplay({ generatedCards: mockCards })
      await service.openLightbox({ cardNumber: 5 })

      const response = await service.navigateLightbox({
        direction: 'next',
      })

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      if (response.data) {
        expect(response.data.lightboxState.currentCard).toBe(6)
        expect(response.data.card.card.cardNumber).toBe(6)
      }
    })

    it('should navigate to previous card', async () => {
      await service.initializeDisplay({ generatedCards: mockCards })
      await service.openLightbox({ cardNumber: 10 })

      const response = await service.navigateLightbox({
        direction: 'previous',
      })

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      if (response.data) {
        expect(response.data.lightboxState.currentCard).toBe(9)
        expect(response.data.card.card.cardNumber).toBe(9)
      }
    })

    it('should return error when navigating past bounds', async () => {
      await service.initializeDisplay({ generatedCards: mockCards })
      await service.openLightbox({ cardNumber: 0 })

      const response = await service.navigateLightbox({
        direction: 'previous',
      })

      expect(response.success).toBe(false)
      expect(response.error?.code).toBe(DeckDisplayErrorCode.CANNOT_NAVIGATE)
    })
  })

  describe('Return Type Validation', () => {
    it('should return all async methods as Promises', async () => {
      const initPromise = service.initializeDisplay({
        generatedCards: mockCards,
      })
      expect(initPromise).toBeInstanceOf(Promise)

      await initPromise

      const layoutPromise = service.changeLayout({ layout: 'grid' })
      expect(layoutPromise).toBeInstanceOf(Promise)

      const sizePromise = service.changeCardSize({ size: 'medium' })
      expect(sizePromise).toBeInstanceOf(Promise)

      const sortPromise = service.sortCards({ sortBy: 'number' })
      expect(sortPromise).toBeInstanceOf(Promise)

      const filterPromise = service.filterCards({ filter: 'Fool' })
      expect(filterPromise).toBeInstanceOf(Promise)

      const selectPromise = service.selectCard({ cardNumber: 0 })
      expect(selectPromise).toBeInstanceOf(Promise)

      const openPromise = service.openLightbox({ cardNumber: 0 })
      expect(openPromise).toBeInstanceOf(Promise)

      const closePromise = service.closeLightbox()
      expect(closePromise).toBeInstanceOf(Promise)

      await service.openLightbox({ cardNumber: 5 })
      const navigatePromise = service.navigateLightbox({ direction: 'next' })
      expect(navigatePromise).toBeInstanceOf(Promise)
    })
  })
})
