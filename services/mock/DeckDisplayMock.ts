/**
 * @fileoverview Mock implementation of Deck Display service
 * @purpose Provide gallery state management for viewing generated cards
 * @dataFlow Generated Cards → Display State → UI Rendering
 * @mockBehavior
 *   - Manages display layout, sorting, and filtering
 *   - Handles lightbox/modal state
 *   - Tracks selected cards
 *   - Simulates minimal delays (50-100ms)
 * @dependencies contracts/DeckDisplay.ts
 * @updated 2025-11-07
 */

import type {
  IDeckDisplayService,
  InitializeDisplayInput,
  InitializeDisplayOutput,
  UpdateDisplaySettingsInput,
  UpdateDisplaySettingsOutput,
  OpenLightboxInput,
  OpenLightboxOutput,
  CloseLightboxOutput,
  FilterCardsInput,
  FilterCardsOutput,
  GetDisplayStateOutput,
  DeckDisplayState,
  DisplayLayout,
  CardSize,
  SortOption,
} from '$contracts/DeckDisplay'

import { DISPLAY_LAYOUTS, CARD_SIZES, SORT_OPTIONS } from '$contracts/DeckDisplay'
import type { ServiceResponse } from '$contracts/types/common'

/**
 * Mock implementation of DeckDisplayService
 *
 * Manages display state for the tarot card gallery.
 */
export class DeckDisplayMockService implements IDeckDisplayService {
  private displayState: DeckDisplayState = {
    layout: 'grid',
    cardSize: 'medium',
    sortBy: 'number',
    selectedCard: null,
    lightboxOpen: false,
    showMetadata: true,
  }

  /**
   * Initialize display with generated cards
   */
  async initializeDisplay(
    input: InitializeDisplayInput
  ): Promise<ServiceResponse<InitializeDisplayOutput>> {
    await this.delay(100)

    const { generatedCards, initialLayout, initialCardSize } = input

    // Reset state
    this.displayState = {
      layout: initialLayout || 'grid',
      cardSize: initialCardSize || 'medium',
      sortBy: 'number',
      selectedCard: null,
      lightboxOpen: false,
      showMetadata: true,
    }

    // Sort cards by number initially
    const sortedCards = [...generatedCards].sort((a, b) => a.cardNumber - b.cardNumber)

    return {
      success: true,
      data: {
        displayState: { ...this.displayState },
        cards: sortedCards,
        totalCards: generatedCards.length,
      },
    }
  }

  /**
   * Update display settings
   */
  async updateDisplaySettings(
    input: UpdateDisplaySettingsInput
  ): Promise<ServiceResponse<UpdateDisplaySettingsOutput>> {
    await this.delay(50)

    const { layout, cardSize, sortBy, showMetadata } = input

    // Update state
    if (layout) this.displayState.layout = layout
    if (cardSize) this.displayState.cardSize = cardSize
    if (sortBy) this.displayState.sortBy = sortBy
    if (showMetadata !== undefined) this.displayState.showMetadata = showMetadata

    return {
      success: true,
      data: {
        displayState: { ...this.displayState },
        updated: true,
      },
    }
  }

  /**
   * Open lightbox for a card
   */
  async openLightbox(input: OpenLightboxInput): Promise<ServiceResponse<OpenLightboxOutput>> {
    await this.delay(50)

    const { cardNumber } = input

    this.displayState.selectedCard = cardNumber
    this.displayState.lightboxOpen = true

    return {
      success: true,
      data: {
        selectedCard: cardNumber,
        lightboxOpen: true,
      },
    }
  }

  /**
   * Close lightbox
   */
  async closeLightbox(): Promise<ServiceResponse<CloseLightboxOutput>> {
    await this.delay(50)

    this.displayState.selectedCard = null
    this.displayState.lightboxOpen = false

    return {
      success: true,
      data: {
        lightboxOpen: false,
      },
    }
  }

  /**
   * Filter cards by search term
   */
  async filterCards(input: FilterCardsInput): Promise<ServiceResponse<FilterCardsOutput>> {
    await this.delay(100)

    const { cards, filterTerm } = input

    if (!filterTerm || filterTerm.trim() === '') {
      return {
        success: true,
        data: {
          filteredCards: cards,
          matchCount: cards.length,
          filter: '',
        },
      }
    }

    const lowercaseFilter = filterTerm.toLowerCase()
    const filteredCards = cards.filter(
      card =>
        card.cardName.toLowerCase().includes(lowercaseFilter) ||
        card.cardNumber.toString().includes(lowercaseFilter)
    )

    return {
      success: true,
      data: {
        filteredCards,
        matchCount: filteredCards.length,
        filter: filterTerm,
      },
    }
  }

  /**
   * Get current display state
   */
  async getDisplayState(): Promise<ServiceResponse<GetDisplayStateOutput>> {
    await this.delay(50)

    return {
      success: true,
      data: {
        displayState: { ...this.displayState },
      },
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Simulate async delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

/**
 * Singleton instance for use throughout the application
 */
export const deckDisplayMockService = new DeckDisplayMockService()
