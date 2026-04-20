/**
 * @fileoverview Mock implementation of IDeckDisplayService
 * @purpose Provide realistic mock behavior for deck display operations
 * @boundary Seam #5: DeckDisplaySeam
 * @contract contracts/DeckDisplay.ts
 */

import type { ServiceResponse } from '$contracts/types/common'
import type {
  IDeckDisplayService,
  InitializeDisplayInput,
  InitializeDisplayOutput,
  ChangeLayoutInput,
  ChangeLayoutOutput,
  ChangeCardSizeInput,
  ChangeCardSizeOutput,
  SortCardsInput,
  SortCardsOutput,
  FilterCardsInput,
  FilterCardsOutput,
  SelectCardInput,
  SelectCardOutput,
  OpenLightboxInput,
  OpenLightboxOutput,
  CloseLightboxOutput,
  NavigateLightboxInput,
  NavigateLightboxOutput,
  DeckDisplayState,
  DisplayCard,
  LightboxState,
  SortOption,
} from '$contracts/DeckDisplay'
import { DeckDisplayErrorCode } from '$contracts/DeckDisplay'
import type { GeneratedCard } from '$contracts/ImageGeneration'

/**
 * Mock implementation of IDeckDisplayService
 * Manages display state for the deck gallery
 */
export class DeckDisplayMockService implements IDeckDisplayService {
  private displayState: DeckDisplayState | null = null
  private displayCards: DisplayCard[] = []
  private lightboxState: LightboxState | null = null

  /**
   * Simulate async delay
   */
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Convert GeneratedCard to DisplayCard
   */
  private toDisplayCard(card: GeneratedCard, position: number): DisplayCard {
    return {
      card,
      position,
      visible: true,
      loading: false,
      error: card.generationStatus === 'failed' ? card.error : undefined,
    }
  }

  /**
   * Sort cards by the specified option (internal helper)
   */
  private sortCardsInternal(cards: DisplayCard[], sortBy: SortOption, ascending: boolean): DisplayCard[] {
    const sorted = [...cards].sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'number':
          comparison = a.card.cardNumber - b.card.cardNumber
          break
        case 'name':
          comparison = a.card.cardName.localeCompare(b.card.cardName)
          break
        case 'generated-date':
          const dateA = a.card.generatedAt?.getTime() || 0
          const dateB = b.card.generatedAt?.getTime() || 0
          comparison = dateA - dateB
          break
      }
      return ascending ? comparison : -comparison
    })

    // Update positions after sort
    return sorted.map((card, index) => ({ ...card, position: index }))
  }

  async initializeDisplay(
    input: InitializeDisplayInput
  ): Promise<ServiceResponse<InitializeDisplayOutput>> {
    await this.delay(50)

    const { generatedCards, initialLayout = 'grid', initialSize = 'medium', autoOpenFirst = false } = input

    if (!generatedCards || generatedCards.length === 0) {
      return {
        success: false,
        error: {
          code: DeckDisplayErrorCode.NO_CARDS_PROVIDED,
          message: 'No cards provided for display',
          retryable: false,
        },
      }
    }

    this.displayState = {
      layout: initialLayout,
      cardSize: initialSize,
      sortBy: 'number',
      selectedCard: autoOpenFirst ? 0 : null,
      lightboxOpen: autoOpenFirst,
      showMetadata: false,
      filter: undefined,
    }

    this.displayCards = generatedCards.map((card, index) => this.toDisplayCard(card, index))
    this.displayCards = this.sortCardsInternal(this.displayCards, 'number', true)

    if (autoOpenFirst && this.displayCards.length > 0) {
      this.lightboxState = {
        open: true,
        currentCard: 0,
        showPrompt: false,
        showMetadata: false,
        canNavigateLeft: false,
        canNavigateRight: this.displayCards.length > 1,
      }
    }

    return {
      success: true,
      data: {
        state: { ...this.displayState },
        displayCards: [...this.displayCards],
        visibleCount: this.displayCards.filter(c => c.visible).length,
      },
    }
  }

  async changeLayout(input: ChangeLayoutInput): Promise<ServiceResponse<ChangeLayoutOutput>> {
    await this.delay(20)

    if (!this.displayState) {
      return {
        success: false,
        error: {
          code: DeckDisplayErrorCode.NO_DISPLAY_STATE,
          message: 'Display not initialized',
          retryable: false,
        },
      }
    }

    const { layout } = input

    if (!['grid', 'list', 'carousel'].includes(layout)) {
      return {
        success: false,
        error: {
          code: DeckDisplayErrorCode.INVALID_LAYOUT,
          message: 'Invalid layout option',
          retryable: false,
        },
      }
    }

    this.displayState = { ...this.displayState, layout }

    return {
      success: true,
      data: {
        state: { ...this.displayState },
        layout,
      },
    }
  }

  async changeCardSize(input: ChangeCardSizeInput): Promise<ServiceResponse<ChangeCardSizeOutput>> {
    await this.delay(20)

    if (!this.displayState) {
      return {
        success: false,
        error: {
          code: DeckDisplayErrorCode.NO_DISPLAY_STATE,
          message: 'Display not initialized',
          retryable: false,
        },
      }
    }

    const { size } = input

    if (!['small', 'medium', 'large'].includes(size)) {
      return {
        success: false,
        error: {
          code: DeckDisplayErrorCode.INVALID_SIZE,
          message: 'Invalid card size option',
          retryable: false,
        },
      }
    }

    this.displayState = { ...this.displayState, cardSize: size }

    return {
      success: true,
      data: {
        state: { ...this.displayState },
        size,
      },
    }
  }

  async sortCards(input: SortCardsInput): Promise<ServiceResponse<SortCardsOutput>> {
    await this.delay(20)

    if (!this.displayState) {
      return {
        success: false,
        error: {
          code: DeckDisplayErrorCode.NO_DISPLAY_STATE,
          message: 'Display not initialized',
          retryable: false,
        },
      }
    }

    const { sortBy, ascending = true } = input

    if (!['number', 'name', 'generated-date'].includes(sortBy)) {
      return {
        success: false,
        error: {
          code: DeckDisplayErrorCode.INVALID_SORT_OPTION,
          message: 'Invalid sort option',
          retryable: false,
        },
      }
    }

    this.displayState = { ...this.displayState, sortBy }
    this.displayCards = this.sortCardsInternal(this.displayCards, sortBy, ascending)

    return {
      success: true,
      data: {
        state: { ...this.displayState },
        displayCards: [...this.displayCards],
      },
    }
  }

  async filterCards(input: FilterCardsInput): Promise<ServiceResponse<FilterCardsOutput>> {
    await this.delay(20)

    if (!this.displayState) {
      return {
        success: false,
        error: {
          code: DeckDisplayErrorCode.NO_DISPLAY_STATE,
          message: 'Display not initialized',
          retryable: false,
        },
      }
    }

    const { filter } = input
    const lowerFilter = filter.toLowerCase()

    this.displayState = { ...this.displayState, filter }

    // Update visibility based on filter
    this.displayCards = this.displayCards.map(dc => ({
      ...dc,
      visible:
        !filter ||
        dc.card.cardName.toLowerCase().includes(lowerFilter) ||
        dc.card.cardNumber.toString().includes(lowerFilter) ||
        dc.card.prompt.toLowerCase().includes(lowerFilter),
    }))

    return {
      success: true,
      data: {
        state: { ...this.displayState },
        displayCards: [...this.displayCards],
        visibleCount: this.displayCards.filter(c => c.visible).length,
      },
    }
  }

  async selectCard(input: SelectCardInput): Promise<ServiceResponse<SelectCardOutput>> {
    await this.delay(20)

    if (!this.displayState) {
      return {
        success: false,
        error: {
          code: DeckDisplayErrorCode.NO_DISPLAY_STATE,
          message: 'Display not initialized',
          retryable: false,
        },
      }
    }

    const { cardNumber, openLightbox = false } = input

    if (cardNumber < 0 || cardNumber > 21) {
      return {
        success: false,
        error: {
          code: DeckDisplayErrorCode.INVALID_CARD_NUMBER,
          message: 'Invalid card number',
          retryable: false,
        },
      }
    }

    const selectedCard = this.displayCards.find(dc => dc.card.cardNumber === cardNumber)

    if (!selectedCard) {
      return {
        success: false,
        error: {
          code: DeckDisplayErrorCode.INVALID_CARD_NUMBER,
          message: 'Card not found',
          retryable: false,
        },
      }
    }

    this.displayState = {
      ...this.displayState,
      selectedCard: cardNumber,
      lightboxOpen: openLightbox,
    }

    if (openLightbox) {
      this.lightboxState = {
        open: true,
        currentCard: cardNumber,
        showPrompt: false,
        showMetadata: false,
        canNavigateLeft: cardNumber > 0,
        canNavigateRight: cardNumber < 21,
      }
    }

    return {
      success: true,
      data: {
        state: { ...this.displayState },
        selectedCard,
        lightboxState: openLightbox ? { ...this.lightboxState! } : undefined,
      },
    }
  }

  async openLightbox(input: OpenLightboxInput): Promise<ServiceResponse<OpenLightboxOutput>> {
    await this.delay(20)

    if (!this.displayState) {
      return {
        success: false,
        error: {
          code: DeckDisplayErrorCode.NO_DISPLAY_STATE,
          message: 'Display not initialized',
          retryable: false,
        },
      }
    }

    const { cardNumber, showPrompt = false, showMetadata = false } = input

    if (cardNumber < 0 || cardNumber > 21) {
      return {
        success: false,
        error: {
          code: DeckDisplayErrorCode.INVALID_CARD_NUMBER,
          message: 'Invalid card number',
          retryable: false,
        },
      }
    }

    const card = this.displayCards.find(dc => dc.card.cardNumber === cardNumber)

    if (!card) {
      return {
        success: false,
        error: {
          code: DeckDisplayErrorCode.INVALID_CARD_NUMBER,
          message: 'Card not found',
          retryable: false,
        },
      }
    }

    this.displayState = {
      ...this.displayState,
      selectedCard: cardNumber,
      lightboxOpen: true,
    }

    this.lightboxState = {
      open: true,
      currentCard: cardNumber,
      showPrompt,
      showMetadata,
      canNavigateLeft: cardNumber > 0,
      canNavigateRight: cardNumber < 21,
    }

    return {
      success: true,
      data: {
        state: { ...this.displayState },
        lightboxState: { ...this.lightboxState },
        card,
      },
    }
  }

  async closeLightbox(): Promise<ServiceResponse<CloseLightboxOutput>> {
    await this.delay(20)

    if (!this.displayState) {
      return {
        success: false,
        error: {
          code: DeckDisplayErrorCode.NO_DISPLAY_STATE,
          message: 'Display not initialized',
          retryable: false,
        },
      }
    }

    this.displayState = {
      ...this.displayState,
      lightboxOpen: false,
    }

    this.lightboxState = null

    return {
      success: true,
      data: {
        state: { ...this.displayState },
      },
    }
  }

  async navigateLightbox(
    input: NavigateLightboxInput
  ): Promise<ServiceResponse<NavigateLightboxOutput>> {
    await this.delay(20)

    if (!this.displayState || !this.lightboxState || !this.lightboxState.open) {
      return {
        success: false,
        error: {
          code: DeckDisplayErrorCode.LIGHTBOX_NOT_OPEN,
          message: 'Lightbox is not open',
          retryable: false,
        },
      }
    }

    const { direction } = input
    const currentCard = this.lightboxState.currentCard

    let newCardNumber: number

    if (direction === 'previous') {
      if (currentCard <= 0) {
        return {
          success: false,
          error: {
            code: DeckDisplayErrorCode.CANNOT_NAVIGATE,
            message: 'Already at first card',
            retryable: false,
          },
        }
      }
      newCardNumber = currentCard - 1
    } else {
      if (currentCard >= 21) {
        return {
          success: false,
          error: {
            code: DeckDisplayErrorCode.CANNOT_NAVIGATE,
            message: 'Already at last card',
            retryable: false,
          },
        }
      }
      newCardNumber = currentCard + 1
    }

    const card = this.displayCards.find(dc => dc.card.cardNumber === newCardNumber)

    if (!card) {
      return {
        success: false,
        error: {
          code: DeckDisplayErrorCode.INVALID_CARD_NUMBER,
          message: 'Card not found',
          retryable: false,
        },
      }
    }

    this.lightboxState = {
      ...this.lightboxState,
      currentCard: newCardNumber,
      canNavigateLeft: newCardNumber > 0,
      canNavigateRight: newCardNumber < 21,
    }

    this.displayState = {
      ...this.displayState,
      selectedCard: newCardNumber,
    }

    return {
      success: true,
      data: {
        lightboxState: { ...this.lightboxState },
        card,
      },
    }
  }
}
