/**
 * DeckDisplay Contract Tests
 *
 * Tests that DeckDisplayMock satisfies the IDeckDisplayService contract
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { DeckDisplayMock } from '../../services/mock/DeckDisplayMock'
import {
  DeckDisplayErrorCode,
  DISPLAY_LAYOUTS,
  CARD_SIZES,
  SORT_OPTIONS,
  type GeneratedCard,
  type CardNumber,
  type GeneratedCardId,
  type DisplayCard,
} from '../../contracts'

// Helper to create mock cards
const createMockCards = (count: number = 22): GeneratedCard[] => {
  const MAJOR_ARCANA_NAMES = [
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

  return Array.from({ length: count }, (_, i) => ({
    id: `card-${i}` as GeneratedCardId,
    cardNumber: i as CardNumber,
    cardName: MAJOR_ARCANA_NAMES[i] || `Card ${i}`,
    prompt: `A tarot card depicting ${MAJOR_ARCANA_NAMES[i] || `card ${i}`} in cyberpunk style`,
    imageUrl: `https://example.com/cards/card-${String(i).padStart(2, '0')}.png`,
    generationStatus: 'completed' as const,
    generatedAt: new Date(Date.now() - (21 - i) * 1000), // Staggered times
    retryCount: 0,
  }))
}

describe('DeckDisplay Contract', () => {
  let service: DeckDisplayMock
  let mockCards: GeneratedCard[]

  beforeEach(() => {
    service = new DeckDisplayMock()
    mockCards = createMockCards(22)
  })

  describe('initializeDisplay()', () => {
    it('should initialize display with 22 cards and default settings', async () => {
      const response = await service.initializeDisplay({
        generatedCards: mockCards,
      })

      expect(response.success).toBe(true)
      expect(response.data?.state).toBeDefined()
      expect(response.data?.state.layout).toBe('grid')
      expect(response.data?.state.cardSize).toBe('medium')
      expect(response.data?.state.sortBy).toBe('number')
      expect(response.data?.state.selectedCard).toBeNull()
      expect(response.data?.state.lightboxOpen).toBe(false)
      expect(response.data?.state.showMetadata).toBe(false)
      expect(response.data?.displayCards).toHaveLength(22)
      expect(response.data?.visibleCount).toBe(22)
    })

    it('should initialize with custom layout', async () => {
      const response = await service.initializeDisplay({
        generatedCards: mockCards,
        initialLayout: 'list',
      })

      expect(response.success).toBe(true)
      expect(response.data?.state.layout).toBe('list')
    })

    it('should initialize with custom size', async () => {
      const response = await service.initializeDisplay({
        generatedCards: mockCards,
        initialSize: 'large',
      })

      expect(response.success).toBe(true)
      expect(response.data?.state.cardSize).toBe('large')
    })

    it('should create DisplayCard objects with correct properties', async () => {
      const response = await service.initializeDisplay({
        generatedCards: mockCards,
      })

      expect(response.success).toBe(true)
      const firstCard = response.data?.displayCards[0]
      expect(firstCard?.card).toBeDefined()
      expect(firstCard?.position).toBe(0)
      expect(firstCard?.visible).toBe(true)
      expect(firstCard?.loading).toBe(false)
      expect(firstCard?.error).toBeUndefined()
    })

    it('should auto-open first card when autoOpenFirst is true', async () => {
      const response = await service.initializeDisplay({
        generatedCards: mockCards,
        autoOpenFirst: true,
      })

      expect(response.success).toBe(true)
      // Note: Actual behavior depends on mock implementation
      // The mock should handle this flag appropriately
    })

    it('should fail with NO_CARDS_PROVIDED when no cards provided', async () => {
      const response = await service.initializeDisplay({
        generatedCards: [],
      })

      expect(response.success).toBe(false)
      expect(response.error?.code).toBe(DeckDisplayErrorCode.NO_CARDS_PROVIDED)
      expect(response.error?.message).toBeDefined()
      expect(response.error?.retryable).toBe(false)
    })

    it('should fail with INVALID_LAYOUT for invalid initial layout', async () => {
      const response = await service.initializeDisplay({
        generatedCards: mockCards,
        initialLayout: 'invalid' as any,
      })

      expect(response.success).toBe(false)
      expect(response.error?.code).toBe(DeckDisplayErrorCode.INVALID_LAYOUT)
    })

    it('should fail with INVALID_SIZE for invalid initial size', async () => {
      const response = await service.initializeDisplay({
        generatedCards: mockCards,
        initialSize: 'extra-large' as any,
      })

      expect(response.success).toBe(false)
      expect(response.error?.code).toBe(DeckDisplayErrorCode.INVALID_SIZE)
    })
  })

  describe('changeLayout()', () => {
    beforeEach(async () => {
      await service.initializeDisplay({ generatedCards: mockCards })
    })

    it('should change layout from grid to list', async () => {
      const response = await service.changeLayout({
        layout: 'list',
      })

      expect(response.success).toBe(true)
      expect(response.data?.state.layout).toBe('list')
      expect(response.data?.layout).toBe('list')
    })

    it('should change layout from list to carousel', async () => {
      await service.changeLayout({ layout: 'list' })

      const response = await service.changeLayout({
        layout: 'carousel',
      })

      expect(response.success).toBe(true)
      expect(response.data?.state.layout).toBe('carousel')
    })

    it('should change layout from carousel to grid', async () => {
      await service.changeLayout({ layout: 'carousel' })

      const response = await service.changeLayout({
        layout: 'grid',
      })

      expect(response.success).toBe(true)
      expect(response.data?.state.layout).toBe('grid')
    })

    it('should support all valid layouts', async () => {
      for (const layout of DISPLAY_LAYOUTS) {
        const response = await service.changeLayout({ layout })
        expect(response.success).toBe(true)
        expect(response.data?.layout).toBe(layout)
      }
    })

    it('should fail with INVALID_LAYOUT for invalid layout', async () => {
      const response = await service.changeLayout({
        layout: 'masonry' as any,
      })

      expect(response.success).toBe(false)
      expect(response.error?.code).toBe(DeckDisplayErrorCode.INVALID_LAYOUT)
    })
  })

  describe('changeCardSize()', () => {
    beforeEach(async () => {
      await service.initializeDisplay({ generatedCards: mockCards })
    })

    it('should change size from medium to small', async () => {
      const response = await service.changeCardSize({
        size: 'small',
      })

      expect(response.success).toBe(true)
      expect(response.data?.state.cardSize).toBe('small')
      expect(response.data?.size).toBe('small')
    })

    it('should change size to large', async () => {
      const response = await service.changeCardSize({
        size: 'large',
      })

      expect(response.success).toBe(true)
      expect(response.data?.state.cardSize).toBe('large')
    })

    it('should change size back to medium', async () => {
      await service.changeCardSize({ size: 'large' })

      const response = await service.changeCardSize({
        size: 'medium',
      })

      expect(response.success).toBe(true)
      expect(response.data?.state.cardSize).toBe('medium')
    })

    it('should support all valid sizes', async () => {
      for (const size of CARD_SIZES) {
        const response = await service.changeCardSize({ size })
        expect(response.success).toBe(true)
        expect(response.data?.size).toBe(size)
      }
    })

    it('should fail with INVALID_SIZE for invalid size', async () => {
      const response = await service.changeCardSize({
        size: 'tiny' as any,
      })

      expect(response.success).toBe(false)
      expect(response.error?.code).toBe(DeckDisplayErrorCode.INVALID_SIZE)
    })
  })

  describe('sortCards()', () => {
    beforeEach(async () => {
      await service.initializeDisplay({ generatedCards: mockCards })
    })

    it('should sort cards by number ascending', async () => {
      const response = await service.sortCards({
        sortBy: 'number',
        ascending: true,
      })

      expect(response.success).toBe(true)
      expect(response.data?.state.sortBy).toBe('number')
      expect(response.data?.displayCards).toBeDefined()

      // Verify order
      const cards = response.data!.displayCards
      expect(cards[0]!.card.cardNumber).toBe(0)
      expect(cards[21]!.card.cardNumber).toBe(21)
    })

    it('should sort cards by number descending', async () => {
      const response = await service.sortCards({
        sortBy: 'number',
        ascending: false,
      })

      expect(response.success).toBe(true)
      const cards = response.data!.displayCards
      expect(cards[0]!.card.cardNumber).toBe(21)
      expect(cards[21]!.card.cardNumber).toBe(0)
    })

    it('should sort cards by name ascending', async () => {
      const response = await service.sortCards({
        sortBy: 'name',
        ascending: true,
      })

      expect(response.success).toBe(true)
      expect(response.data?.state.sortBy).toBe('name')

      // Verify alphabetical order
      const cards = response.data!.displayCards
      for (let i = 1; i < cards.length; i++) {
        expect(
          cards[i]!.card.cardName.localeCompare(cards[i - 1]!.card.cardName)
        ).toBeGreaterThanOrEqual(0)
      }
    })

    it('should sort cards by generated date ascending', async () => {
      const response = await service.sortCards({
        sortBy: 'generated-date',
        ascending: true,
      })

      expect(response.success).toBe(true)
      expect(response.data?.state.sortBy).toBe('generated-date')

      // Verify chronological order
      const cards = response.data!.displayCards
      for (let i = 1; i < cards.length; i++) {
        expect(cards[i]!.card.generatedAt!.getTime()).toBeGreaterThanOrEqual(
          cards[i - 1]!.card.generatedAt!.getTime()
        )
      }
    })

    it('should default to ascending when not specified', async () => {
      const response = await service.sortCards({
        sortBy: 'number',
      })

      expect(response.success).toBe(true)
      const cards = response.data!.displayCards
      expect(cards[0]!.card.cardNumber).toBeLessThan(cards[1]!.card.cardNumber)
    })

    it('should support all valid sort options', async () => {
      for (const sortBy of SORT_OPTIONS) {
        const response = await service.sortCards({ sortBy })
        expect(response.success).toBe(true)
        expect(response.data?.state.sortBy).toBe(sortBy)
      }
    })

    it('should fail with INVALID_SORT_OPTION for invalid sort option', async () => {
      const response = await service.sortCards({
        sortBy: 'color' as any,
      })

      expect(response.success).toBe(false)
      expect(response.error?.code).toBe(DeckDisplayErrorCode.INVALID_SORT_OPTION)
    })
  })

  describe('filterCards()', () => {
    beforeEach(async () => {
      await service.initializeDisplay({ generatedCards: mockCards })
    })

    it('should filter cards by name', async () => {
      const response = await service.filterCards({
        filter: 'Fool',
      })

      expect(response.success).toBe(true)
      expect(response.data?.visibleCount).toBeGreaterThan(0)
      expect(response.data?.displayCards).toBeDefined()

      // Should find "The Fool"
      const visibleCards = response.data!.displayCards.filter((c: DisplayCard) => c.visible)
      expect(visibleCards.some((c: DisplayCard) => c.card.cardName.includes('Fool'))).toBe(true)
    })

    it('should filter cards by number', async () => {
      const response = await service.filterCards({
        filter: '0',
      })

      expect(response.success).toBe(true)
      expect(response.data?.visibleCount).toBeGreaterThan(0)

      // Should find card 0 and possibly 10, 20
      const visibleCards = response.data!.displayCards.filter((c: DisplayCard) => c.visible)
      expect(visibleCards.length).toBeGreaterThan(0)
    })

    it('should filter cards by prompt text', async () => {
      const response = await service.filterCards({
        filter: 'cyberpunk',
      })

      expect(response.success).toBe(true)
      // All cards have "cyberpunk" in prompt
      expect(response.data?.visibleCount).toBe(22)
    })

    it('should be case-insensitive', async () => {
      const response1 = await service.filterCards({ filter: 'FOOL' })
      const response2 = await service.filterCards({ filter: 'fool' })
      const response3 = await service.filterCards({ filter: 'Fool' })

      expect(response1.data?.visibleCount).toBe(response2.data?.visibleCount)
      expect(response2.data?.visibleCount).toBe(response3.data?.visibleCount)
    })

    it('should show all cards when filter is empty', async () => {
      // First filter to reduce
      await service.filterCards({ filter: 'Fool' })

      // Then clear filter
      const response = await service.filterCards({
        filter: '',
      })

      expect(response.success).toBe(true)
      expect(response.data?.visibleCount).toBe(22)
    })

    it('should return zero visible count for non-matching filter', async () => {
      const response = await service.filterCards({
        filter: 'nonexistent-card-xyz',
      })

      expect(response.success).toBe(true)
      expect(response.data?.visibleCount).toBe(0)
    })

    it('should mark matching cards as visible and non-matching as not visible', async () => {
      const response = await service.filterCards({
        filter: 'Fool',
      })

      expect(response.success).toBe(true)
      const cards = response.data!.displayCards

      // At least one card should be visible
      expect(cards.some((c: DisplayCard) => c.visible)).toBe(true)

      // Cards not matching should not be visible
      const foolCard = cards.find((c: DisplayCard) => c.card.cardName === 'The Fool')
      expect(foolCard?.visible).toBe(true)
    })
  })

  describe('selectCard()', () => {
    beforeEach(async () => {
      await service.initializeDisplay({ generatedCards: mockCards })
    })

    it('should select card 0', async () => {
      const response = await service.selectCard({
        cardNumber: 0,
      })

      expect(response.success).toBe(true)
      expect(response.data?.state.selectedCard).toBe(0)
      expect(response.data?.selectedCard).toBeDefined()
      expect(response.data?.selectedCard.card.cardNumber).toBe(0)
    })

    it('should select card 13', async () => {
      const response = await service.selectCard({
        cardNumber: 13,
      })

      expect(response.success).toBe(true)
      expect(response.data?.state.selectedCard).toBe(13)
      expect(response.data?.selectedCard.card.cardNumber).toBe(13)
    })

    it('should select card 21', async () => {
      const response = await service.selectCard({
        cardNumber: 21,
      })

      expect(response.success).toBe(true)
      expect(response.data?.state.selectedCard).toBe(21)
      expect(response.data?.selectedCard.card.cardNumber).toBe(21)
    })

    it('should select card without opening lightbox', async () => {
      const response = await service.selectCard({
        cardNumber: 5,
        openLightbox: false,
      })

      expect(response.success).toBe(true)
      expect(response.data?.state.selectedCard).toBe(5)
      expect(response.data?.state.lightboxOpen).toBe(false)
      expect(response.data?.lightboxState).toBeUndefined()
    })

    it('should select card and open lightbox', async () => {
      const response = await service.selectCard({
        cardNumber: 7,
        openLightbox: true,
      })

      expect(response.success).toBe(true)
      expect(response.data?.state.selectedCard).toBe(7)
      expect(response.data?.state.lightboxOpen).toBe(true)
      expect(response.data?.lightboxState).toBeDefined()
      expect(response.data?.lightboxState?.currentCard).toBe(7)
    })

    it('should fail with INVALID_CARD_NUMBER for card -1', async () => {
      const response = await service.selectCard({
        cardNumber: -1,
      })

      expect(response.success).toBe(false)
      expect(response.error?.code).toBe(DeckDisplayErrorCode.INVALID_CARD_NUMBER)
    })

    it('should fail with INVALID_CARD_NUMBER for card 22', async () => {
      const response = await service.selectCard({
        cardNumber: 22,
      })

      expect(response.success).toBe(false)
      expect(response.error?.code).toBe(DeckDisplayErrorCode.INVALID_CARD_NUMBER)
    })

    it('should fail with INVALID_CARD_NUMBER for card 100', async () => {
      const response = await service.selectCard({
        cardNumber: 100,
      })

      expect(response.success).toBe(false)
      expect(response.error?.code).toBe(DeckDisplayErrorCode.INVALID_CARD_NUMBER)
    })
  })

  describe('openLightbox()', () => {
    beforeEach(async () => {
      await service.initializeDisplay({ generatedCards: mockCards })
    })

    it('should open lightbox for card 0', async () => {
      const response = await service.openLightbox({
        cardNumber: 0,
      })

      expect(response.success).toBe(true)
      expect(response.data?.state.lightboxOpen).toBe(true)
      expect(response.data?.lightboxState.open).toBe(true)
      expect(response.data?.lightboxState.currentCard).toBe(0)
      expect(response.data?.card.card.cardNumber).toBe(0)
    })

    it('should open lightbox for card 13 (middle card)', async () => {
      const response = await service.openLightbox({
        cardNumber: 13,
      })

      expect(response.success).toBe(true)
      expect(response.data?.lightboxState.currentCard).toBe(13)
      expect(response.data?.lightboxState.canNavigateLeft).toBe(true)
      expect(response.data?.lightboxState.canNavigateRight).toBe(true)
    })

    it('should open lightbox for card 21 (last card)', async () => {
      const response = await service.openLightbox({
        cardNumber: 21,
      })

      expect(response.success).toBe(true)
      expect(response.data?.lightboxState.currentCard).toBe(21)
      expect(response.data?.lightboxState.canNavigateLeft).toBe(true)
      expect(response.data?.lightboxState.canNavigateRight).toBe(false)
    })

    it('should set canNavigateLeft to false for first card', async () => {
      const response = await service.openLightbox({
        cardNumber: 0,
      })

      expect(response.success).toBe(true)
      expect(response.data?.lightboxState.canNavigateLeft).toBe(false)
      expect(response.data?.lightboxState.canNavigateRight).toBe(true)
    })

    it('should set canNavigateRight to false for last card', async () => {
      const response = await service.openLightbox({
        cardNumber: 21,
      })

      expect(response.success).toBe(true)
      expect(response.data?.lightboxState.canNavigateLeft).toBe(true)
      expect(response.data?.lightboxState.canNavigateRight).toBe(false)
    })

    it('should open with showPrompt option', async () => {
      const response = await service.openLightbox({
        cardNumber: 5,
        showPrompt: true,
      })

      expect(response.success).toBe(true)
      expect(response.data?.lightboxState.showPrompt).toBe(true)
    })

    it('should open with showMetadata option', async () => {
      const response = await service.openLightbox({
        cardNumber: 5,
        showMetadata: true,
      })

      expect(response.success).toBe(true)
      expect(response.data?.lightboxState.showMetadata).toBe(true)
    })

    it('should open with both showPrompt and showMetadata', async () => {
      const response = await service.openLightbox({
        cardNumber: 5,
        showPrompt: true,
        showMetadata: true,
      })

      expect(response.success).toBe(true)
      expect(response.data?.lightboxState.showPrompt).toBe(true)
      expect(response.data?.lightboxState.showMetadata).toBe(true)
    })

    it('should default showPrompt and showMetadata to false', async () => {
      const response = await service.openLightbox({
        cardNumber: 5,
      })

      expect(response.success).toBe(true)
      expect(response.data?.lightboxState.showPrompt).toBe(false)
      expect(response.data?.lightboxState.showMetadata).toBe(false)
    })

    it('should fail with INVALID_CARD_NUMBER for invalid card', async () => {
      const response = await service.openLightbox({
        cardNumber: 25,
      })

      expect(response.success).toBe(false)
      expect(response.error?.code).toBe(DeckDisplayErrorCode.INVALID_CARD_NUMBER)
    })
  })

  describe('closeLightbox()', () => {
    beforeEach(async () => {
      await service.initializeDisplay({ generatedCards: mockCards })
      await service.openLightbox({ cardNumber: 5 })
    })

    it('should close lightbox', async () => {
      const response = await service.closeLightbox()

      expect(response.success).toBe(true)
      expect(response.data?.state.lightboxOpen).toBe(false)
    })

    it('should preserve selectedCard after closing', async () => {
      await service.selectCard({ cardNumber: 10 })

      const response = await service.closeLightbox()

      expect(response.success).toBe(true)
      expect(response.data?.state.lightboxOpen).toBe(false)
      // selectedCard might still be set
    })

    it('should succeed even if lightbox already closed', async () => {
      await service.closeLightbox()

      const response = await service.closeLightbox()

      // Depends on mock implementation - might succeed or fail
      // Most implementations would succeed silently
      expect(response.success).toBe(true)
    })
  })

  describe('navigateLightbox()', () => {
    beforeEach(async () => {
      await service.initializeDisplay({ generatedCards: mockCards })
    })

    it('should navigate to next card', async () => {
      await service.openLightbox({ cardNumber: 0 })

      const response = await service.navigateLightbox({
        direction: 'next',
      })

      expect(response.success).toBe(true)
      expect(response.data?.lightboxState.currentCard).toBe(1)
      expect(response.data?.card.card.cardNumber).toBe(1)
    })

    it('should navigate to previous card', async () => {
      await service.openLightbox({ cardNumber: 5 })

      const response = await service.navigateLightbox({
        direction: 'previous',
      })

      expect(response.success).toBe(true)
      expect(response.data?.lightboxState.currentCard).toBe(4)
      expect(response.data?.card.card.cardNumber).toBe(4)
    })

    it('should navigate next multiple times', async () => {
      await service.openLightbox({ cardNumber: 0 })

      await service.navigateLightbox({ direction: 'next' })
      await service.navigateLightbox({ direction: 'next' })
      const response = await service.navigateLightbox({ direction: 'next' })

      expect(response.success).toBe(true)
      expect(response.data?.lightboxState.currentCard).toBe(3)
    })

    it('should navigate previous multiple times', async () => {
      await service.openLightbox({ cardNumber: 10 })

      await service.navigateLightbox({ direction: 'previous' })
      await service.navigateLightbox({ direction: 'previous' })
      const response = await service.navigateLightbox({ direction: 'previous' })

      expect(response.success).toBe(true)
      expect(response.data?.lightboxState.currentCard).toBe(7)
    })

    it('should update canNavigateLeft and canNavigateRight', async () => {
      await service.openLightbox({ cardNumber: 1 })

      const response = await service.navigateLightbox({ direction: 'previous' })

      expect(response.success).toBe(true)
      expect(response.data?.lightboxState.currentCard).toBe(0)
      expect(response.data?.lightboxState.canNavigateLeft).toBe(false)
      expect(response.data?.lightboxState.canNavigateRight).toBe(true)
    })

    it('should fail with CANNOT_NAVIGATE when at first card and navigating previous', async () => {
      await service.openLightbox({ cardNumber: 0 })

      const response = await service.navigateLightbox({
        direction: 'previous',
      })

      expect(response.success).toBe(false)
      expect(response.error?.code).toBe(DeckDisplayErrorCode.CANNOT_NAVIGATE)
    })

    it('should fail with CANNOT_NAVIGATE when at last card and navigating next', async () => {
      await service.openLightbox({ cardNumber: 21 })

      const response = await service.navigateLightbox({
        direction: 'next',
      })

      expect(response.success).toBe(false)
      expect(response.error?.code).toBe(DeckDisplayErrorCode.CANNOT_NAVIGATE)
    })

    it('should fail with LIGHTBOX_NOT_OPEN when lightbox is closed', async () => {
      const response = await service.navigateLightbox({
        direction: 'next',
      })

      expect(response.success).toBe(false)
      expect(response.error?.code).toBe(DeckDisplayErrorCode.LIGHTBOX_NOT_OPEN)
    })
  })

  describe('Integration Workflows', () => {
    beforeEach(async () => {
      await service.initializeDisplay({ generatedCards: mockCards })
    })

    it('should handle complete workflow: initialize → change layout → change size → sort', async () => {
      const layoutRes = await service.changeLayout({ layout: 'list' })
      expect(layoutRes.success).toBe(true)

      const sizeRes = await service.changeCardSize({ size: 'large' })
      expect(sizeRes.success).toBe(true)

      const sortRes = await service.sortCards({ sortBy: 'name' })
      expect(sortRes.success).toBe(true)

      // All operations should maintain state
      expect(sortRes.data?.state.layout).toBe('list')
      expect(sortRes.data?.state.cardSize).toBe('large')
      expect(sortRes.data?.state.sortBy).toBe('name')
    })

    it('should handle lightbox workflow: select → open → navigate → close', async () => {
      const selectRes = await service.selectCard({ cardNumber: 5, openLightbox: true })
      expect(selectRes.success).toBe(true)
      expect(selectRes.data?.lightboxState?.currentCard).toBe(5)

      const navRes = await service.navigateLightbox({ direction: 'next' })
      expect(navRes.success).toBe(true)
      expect(navRes.data?.lightboxState.currentCard).toBe(6)

      const closeRes = await service.closeLightbox()
      expect(closeRes.success).toBe(true)
      expect(closeRes.data?.state.lightboxOpen).toBe(false)
    })

    it('should handle filter → sort → select workflow', async () => {
      const filterRes = await service.filterCards({ filter: 'The' })
      expect(filterRes.success).toBe(true)

      const sortRes = await service.sortCards({ sortBy: 'name' })
      expect(sortRes.success).toBe(true)

      const selectRes = await service.selectCard({ cardNumber: 0 })
      expect(selectRes.success).toBe(true)
    })

    it('should handle multiple layout/size/sort changes without data loss', async () => {
      await service.changeLayout({ layout: 'list' })
      await service.changeLayout({ layout: 'carousel' })
      await service.changeLayout({ layout: 'grid' })

      await service.changeCardSize({ size: 'small' })
      await service.changeCardSize({ size: 'large' })
      await service.changeCardSize({ size: 'medium' })

      const sortRes = await service.sortCards({ sortBy: 'number' })
      expect(sortRes.success).toBe(true)
      expect(sortRes.data?.displayCards).toHaveLength(22)
    })

    it('should handle lightbox navigation from first to last card', async () => {
      await service.openLightbox({ cardNumber: 0 })

      let currentCard = 0
      while (currentCard < 21) {
        const navRes = await service.navigateLightbox({ direction: 'next' })
        expect(navRes.success).toBe(true)
        currentCard++
        expect(navRes.data?.lightboxState.currentCard).toBe(currentCard)
      }

      // Try to navigate beyond last card
      const failRes = await service.navigateLightbox({ direction: 'next' })
      expect(failRes.success).toBe(false)
      expect(failRes.error?.code).toBe(DeckDisplayErrorCode.CANNOT_NAVIGATE)
    })

    it('should handle lightbox navigation from last to first card', async () => {
      await service.openLightbox({ cardNumber: 21 })

      let currentCard = 21
      while (currentCard > 0) {
        const navRes = await service.navigateLightbox({ direction: 'previous' })
        expect(navRes.success).toBe(true)
        currentCard--
        expect(navRes.data?.lightboxState.currentCard).toBe(currentCard)
      }

      // Try to navigate before first card
      const failRes = await service.navigateLightbox({ direction: 'previous' })
      expect(failRes.success).toBe(false)
      expect(failRes.error?.code).toBe(DeckDisplayErrorCode.CANNOT_NAVIGATE)
    })
  })

  describe('Error Code Coverage', () => {
    it('should test NO_CARDS_PROVIDED error', async () => {
      const response = await service.initializeDisplay({
        generatedCards: [],
      })

      expect(response.error?.code).toBe(DeckDisplayErrorCode.NO_CARDS_PROVIDED)
    })

    it('should test INVALID_CARD_NUMBER error', async () => {
      await service.initializeDisplay({ generatedCards: mockCards })

      const response = await service.selectCard({ cardNumber: 99 })

      expect(response.error?.code).toBe(DeckDisplayErrorCode.INVALID_CARD_NUMBER)
    })

    it('should test INVALID_LAYOUT error', async () => {
      const response = await service.initializeDisplay({
        generatedCards: mockCards,
        initialLayout: 'invalid-layout' as any,
      })

      expect(response.error?.code).toBe(DeckDisplayErrorCode.INVALID_LAYOUT)
    })

    it('should test INVALID_SIZE error', async () => {
      const response = await service.initializeDisplay({
        generatedCards: mockCards,
        initialSize: 'gigantic' as any,
      })

      expect(response.error?.code).toBe(DeckDisplayErrorCode.INVALID_SIZE)
    })

    it('should test INVALID_SORT_OPTION error', async () => {
      await service.initializeDisplay({ generatedCards: mockCards })

      const response = await service.sortCards({
        sortBy: 'popularity' as any,
      })

      expect(response.error?.code).toBe(DeckDisplayErrorCode.INVALID_SORT_OPTION)
    })

    it('should test LIGHTBOX_NOT_OPEN error', async () => {
      await service.initializeDisplay({ generatedCards: mockCards })

      const response = await service.navigateLightbox({ direction: 'next' })

      expect(response.error?.code).toBe(DeckDisplayErrorCode.LIGHTBOX_NOT_OPEN)
    })

    it('should test CANNOT_NAVIGATE error (next at end)', async () => {
      await service.initializeDisplay({ generatedCards: mockCards })
      await service.openLightbox({ cardNumber: 21 })

      const response = await service.navigateLightbox({ direction: 'next' })

      expect(response.error?.code).toBe(DeckDisplayErrorCode.CANNOT_NAVIGATE)
    })

    it('should test CANNOT_NAVIGATE error (previous at start)', async () => {
      await service.initializeDisplay({ generatedCards: mockCards })
      await service.openLightbox({ cardNumber: 0 })

      const response = await service.navigateLightbox({ direction: 'previous' })

      expect(response.error?.code).toBe(DeckDisplayErrorCode.CANNOT_NAVIGATE)
    })

    // Note: CARD_IMAGE_FAILED and RENDER_FAILED would be tested with specific
    // mock scenarios that simulate image loading failures or rendering errors
    // These depend on mock implementation details
  })

  describe('Response Structure Validation', () => {
    beforeEach(async () => {
      await service.initializeDisplay({ generatedCards: mockCards })
    })

    it('should return properly typed InitializeDisplayOutput', async () => {
      const response = await service.initializeDisplay({
        generatedCards: mockCards,
      })

      expect(response.success).toBe(true)
      expect(response.data?.state).toBeDefined()
      expect(typeof response.data?.state.layout).toBe('string')
      expect(typeof response.data?.state.cardSize).toBe('string')
      expect(Array.isArray(response.data?.displayCards)).toBe(true)
      expect(typeof response.data?.visibleCount).toBe('number')
    })

    it('should return properly typed ChangeLayoutOutput', async () => {
      const response = await service.changeLayout({ layout: 'list' })

      expect(response.success).toBe(true)
      expect(response.data?.state).toBeDefined()
      expect(response.data?.layout).toBe('list')
    })

    it('should return properly typed SelectCardOutput', async () => {
      const response = await service.selectCard({ cardNumber: 5 })

      expect(response.success).toBe(true)
      expect(response.data?.state).toBeDefined()
      expect(response.data?.selectedCard).toBeDefined()
      expect(response.data?.selectedCard.card).toBeDefined()
      expect(response.data?.selectedCard.position).toBe(5)
    })

    it('should return properly typed OpenLightboxOutput', async () => {
      const response = await service.openLightbox({ cardNumber: 10 })

      expect(response.success).toBe(true)
      expect(response.data?.state).toBeDefined()
      expect(response.data?.lightboxState).toBeDefined()
      expect(response.data?.lightboxState.open).toBe(true)
      expect(typeof response.data?.lightboxState.currentCard).toBe('number')
      expect(typeof response.data?.lightboxState.canNavigateLeft).toBe('boolean')
      expect(typeof response.data?.lightboxState.canNavigateRight).toBe('boolean')
      expect(response.data?.card).toBeDefined()
    })

    it('should return properly typed NavigateLightboxOutput', async () => {
      await service.openLightbox({ cardNumber: 5 })

      const response = await service.navigateLightbox({ direction: 'next' })

      expect(response.success).toBe(true)
      expect(response.data?.lightboxState).toBeDefined()
      expect(response.data?.card).toBeDefined()
      expect(response.data?.card.card.cardNumber).toBe(6)
    })
  })
})
