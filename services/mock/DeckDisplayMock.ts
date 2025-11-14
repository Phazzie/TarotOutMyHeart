/**
 * @fileoverview DeckDisplay Mock Service - Gallery view for generated cards
 * @purpose Mock implementation of IDeckDisplayService for testing and development
 * @dataFlow Generated Cards → Display State → Mock Operations → UI Updates
 * @boundary Implements Seam #5: DeckDisplaySeam
 * @updated 2025-11-14
 *
 * @example
 * ```typescript
 * const service = new DeckDisplayMock()
 * const result = await service.initializeDisplay({ generatedCards: cards })
 * if (result.success) {
 *   console.log(result.data.displayCards) // 22 cards with display metadata
 * }
 * ```
 */

import type {
  IDeckDisplayService,
  ServiceResponse,
  DeckDisplayState,
  DisplayCard,
  LightboxState,
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
} from '../../contracts'

import {
  DeckDisplayErrorCode,
  DECK_DISPLAY_ERROR_MESSAGES,
  DISPLAY_LAYOUTS,
  CARD_SIZES,
  SORT_OPTIONS,
} from '../../contracts'

/**
 * Mock implementation of DeckDisplay service
 *
 * Manages display state for 22 tarot cards including:
 * - Layout switching (grid, list, carousel)
 * - Card sizing (small, medium, large)
 * - Sorting (by number, name, date)
 * - Filtering and search
 * - Card selection and lightbox modal
 * - Lightbox navigation
 */
export class DeckDisplayMock implements IDeckDisplayService {
  private displayState: DeckDisplayState | null = null
  private displayCards: DisplayCard[] = []
  private lightboxState: LightboxState | null = null

  /**
   * Initialize deck display with generated cards
   */
  async initializeDisplay(
    input: InitializeDisplayInput
  ): Promise<ServiceResponse<InitializeDisplayOutput>> {
    // Validate: NO_CARDS_PROVIDED
    if (!input.generatedCards || input.generatedCards.length === 0) {
      return {
        success: false,
        error: {
          code: DeckDisplayErrorCode.NO_CARDS_PROVIDED,
          message: DECK_DISPLAY_ERROR_MESSAGES[DeckDisplayErrorCode.NO_CARDS_PROVIDED],
          retryable: false,
        },
      }
    }

    // Validate: INVALID_LAYOUT
    if (input.initialLayout && !DISPLAY_LAYOUTS.includes(input.initialLayout)) {
      return {
        success: false,
        error: {
          code: DeckDisplayErrorCode.INVALID_LAYOUT,
          message: DECK_DISPLAY_ERROR_MESSAGES[DeckDisplayErrorCode.INVALID_LAYOUT],
          retryable: false,
        },
      }
    }

    // Validate: INVALID_SIZE
    if (input.initialSize && !CARD_SIZES.includes(input.initialSize)) {
      return {
        success: false,
        error: {
          code: DeckDisplayErrorCode.INVALID_SIZE,
          message: DECK_DISPLAY_ERROR_MESSAGES[DeckDisplayErrorCode.INVALID_SIZE],
          retryable: false,
        },
      }
    }

    // Initialize display state with defaults
    this.displayState = {
      layout: input.initialLayout || 'grid',
      cardSize: input.initialSize || 'medium',
      sortBy: 'number',
      selectedCard: null,
      lightboxOpen: false,
      showMetadata: false,
      filter: undefined,
    }

    // Create DisplayCard objects
    this.displayCards = input.generatedCards.map((card, index) => ({
      card,
      position: index,
      visible: true,
      loading: false,
      error: undefined,
    }))

    // Handle autoOpenFirst option
    if (input.autoOpenFirst && this.displayCards.length > 0) {
      this.displayState.selectedCard = 0
      this.displayState.lightboxOpen = true
      this.lightboxState = this.createLightboxState(0, false, false)
    }

    return {
      success: true,
      data: {
        state: this.displayState,
        displayCards: this.displayCards,
        visibleCount: this.displayCards.filter(c => c.visible).length,
      },
    }
  }

  /**
   * Change display layout
   */
  async changeLayout(
    input: ChangeLayoutInput
  ): Promise<ServiceResponse<ChangeLayoutOutput>> {
    // Validate: INVALID_LAYOUT
    if (!DISPLAY_LAYOUTS.includes(input.layout)) {
      return {
        success: false,
        error: {
          code: DeckDisplayErrorCode.INVALID_LAYOUT,
          message: DECK_DISPLAY_ERROR_MESSAGES[DeckDisplayErrorCode.INVALID_LAYOUT],
          retryable: false,
        },
      }
    }

    // Update state
    if (this.displayState) {
      this.displayState.layout = input.layout
    }

    return {
      success: true,
      data: {
        state: this.displayState!,
        layout: input.layout,
      },
    }
  }

  /**
   * Change card size
   */
  async changeCardSize(
    input: ChangeCardSizeInput
  ): Promise<ServiceResponse<ChangeCardSizeOutput>> {
    // Validate: INVALID_SIZE
    if (!CARD_SIZES.includes(input.size)) {
      return {
        success: false,
        error: {
          code: DeckDisplayErrorCode.INVALID_SIZE,
          message: DECK_DISPLAY_ERROR_MESSAGES[DeckDisplayErrorCode.INVALID_SIZE],
          retryable: false,
        },
      }
    }

    // Update state
    if (this.displayState) {
      this.displayState.cardSize = input.size
    }

    return {
      success: true,
      data: {
        state: this.displayState!,
        size: input.size,
      },
    }
  }

  /**
   * Sort cards by specified option
   */
  async sortCards(
    input: SortCardsInput
  ): Promise<ServiceResponse<SortCardsOutput>> {
    // Validate: INVALID_SORT_OPTION
    if (!SORT_OPTIONS.includes(input.sortBy)) {
      return {
        success: false,
        error: {
          code: DeckDisplayErrorCode.INVALID_SORT_OPTION,
          message: DECK_DISPLAY_ERROR_MESSAGES[DeckDisplayErrorCode.INVALID_SORT_OPTION],
          retryable: false,
        },
      }
    }

    // Update state
    if (this.displayState) {
      this.displayState.sortBy = input.sortBy
    }

    // Default to ascending if not specified
    const ascending = input.ascending !== false

    // Sort displayCards
    const sortedCards = [...this.displayCards].sort((a, b) => {
      let comparison = 0

      switch (input.sortBy) {
        case 'number':
          comparison = a.card.cardNumber - b.card.cardNumber
          break
        case 'name':
          comparison = a.card.cardName.localeCompare(b.card.cardName)
          break
        case 'generated-date':
          comparison = a.card.generatedAt!.getTime() - b.card.generatedAt!.getTime()
          break
      }

      return ascending ? comparison : -comparison
    })

    this.displayCards = sortedCards

    return {
      success: true,
      data: {
        state: this.displayState!,
        displayCards: this.displayCards,
      },
    }
  }

  /**
   * Filter cards by search term
   */
  async filterCards(
    input: FilterCardsInput
  ): Promise<ServiceResponse<FilterCardsOutput>> {
    // Update state filter
    if (this.displayState) {
      this.displayState.filter = input.filter || undefined
    }

    // Apply filter
    const filterLower = input.filter.toLowerCase()
    let visibleCount = 0

    this.displayCards = this.displayCards.map(displayCard => {
      const card = displayCard.card

      // Empty filter shows all cards
      if (!input.filter) {
        visibleCount++
        return { ...displayCard, visible: true }
      }

      // Search in name, number, and prompt
      const matchesName = card.cardName.toLowerCase().includes(filterLower)
      const matchesNumber = card.cardNumber.toString().includes(filterLower)
      const matchesPrompt = card.prompt.toLowerCase().includes(filterLower)

      const visible = matchesName || matchesNumber || matchesPrompt

      if (visible) {
        visibleCount++
      }

      return { ...displayCard, visible }
    })

    return {
      success: true,
      data: {
        state: this.displayState!,
        displayCards: this.displayCards,
        visibleCount,
      },
    }
  }

  /**
   * Select a card
   */
  async selectCard(
    input: SelectCardInput
  ): Promise<ServiceResponse<SelectCardOutput>> {
    // Validate: INVALID_CARD_NUMBER
    if (input.cardNumber < 0 || input.cardNumber > 21) {
      return {
        success: false,
        error: {
          code: DeckDisplayErrorCode.INVALID_CARD_NUMBER,
          message: DECK_DISPLAY_ERROR_MESSAGES[DeckDisplayErrorCode.INVALID_CARD_NUMBER],
          retryable: false,
        },
      }
    }

    // Update state
    if (this.displayState) {
      this.displayState.selectedCard = input.cardNumber
    }

    // Find the selected card
    const selectedCard = this.displayCards.find(
      dc => dc.card.cardNumber === input.cardNumber
    )

    if (!selectedCard) {
      return {
        success: false,
        error: {
          code: DeckDisplayErrorCode.INVALID_CARD_NUMBER,
          message: DECK_DISPLAY_ERROR_MESSAGES[DeckDisplayErrorCode.INVALID_CARD_NUMBER],
          retryable: false,
        },
      }
    }

    // Handle lightbox opening
    let lightboxState: LightboxState | undefined

    if (input.openLightbox) {
      if (this.displayState) {
        this.displayState.lightboxOpen = true
      }
      this.lightboxState = this.createLightboxState(input.cardNumber, false, false)
      lightboxState = this.lightboxState
    }

    return {
      success: true,
      data: {
        state: this.displayState!,
        selectedCard,
        lightboxState,
      },
    }
  }

  /**
   * Open lightbox for a card
   */
  async openLightbox(
    input: OpenLightboxInput
  ): Promise<ServiceResponse<OpenLightboxOutput>> {
    // Validate: INVALID_CARD_NUMBER
    if (input.cardNumber < 0 || input.cardNumber > 21) {
      return {
        success: false,
        error: {
          code: DeckDisplayErrorCode.INVALID_CARD_NUMBER,
          message: DECK_DISPLAY_ERROR_MESSAGES[DeckDisplayErrorCode.INVALID_CARD_NUMBER],
          retryable: false,
        },
      }
    }

    // Update state
    if (this.displayState) {
      this.displayState.lightboxOpen = true
      this.displayState.selectedCard = input.cardNumber
    }

    // Create lightbox state
    this.lightboxState = this.createLightboxState(
      input.cardNumber,
      input.showPrompt || false,
      input.showMetadata || false
    )

    // Find the card
    const card = this.displayCards.find(
      dc => dc.card.cardNumber === input.cardNumber
    )

    if (!card) {
      return {
        success: false,
        error: {
          code: DeckDisplayErrorCode.INVALID_CARD_NUMBER,
          message: DECK_DISPLAY_ERROR_MESSAGES[DeckDisplayErrorCode.INVALID_CARD_NUMBER],
          retryable: false,
        },
      }
    }

    return {
      success: true,
      data: {
        state: this.displayState!,
        lightboxState: this.lightboxState,
        card,
      },
    }
  }

  /**
   * Close lightbox
   */
  async closeLightbox(): Promise<ServiceResponse<CloseLightboxOutput>> {
    // Update state
    if (this.displayState) {
      this.displayState.lightboxOpen = false
    }

    this.lightboxState = null

    return {
      success: true,
      data: {
        state: this.displayState!,
      },
    }
  }

  /**
   * Navigate in lightbox (previous/next card)
   */
  async navigateLightbox(
    input: NavigateLightboxInput
  ): Promise<ServiceResponse<NavigateLightboxOutput>> {
    // Validate: LIGHTBOX_NOT_OPEN
    if (!this.lightboxState || !this.displayState?.lightboxOpen) {
      return {
        success: false,
        error: {
          code: DeckDisplayErrorCode.LIGHTBOX_NOT_OPEN,
          message: DECK_DISPLAY_ERROR_MESSAGES[DeckDisplayErrorCode.LIGHTBOX_NOT_OPEN],
          retryable: false,
        },
      }
    }

    const currentCard = this.lightboxState.currentCard
    let newCardNumber: number

    if (input.direction === 'next') {
      newCardNumber = currentCard + 1
    } else {
      newCardNumber = currentCard - 1
    }

    // Validate: CANNOT_NAVIGATE
    if (newCardNumber < 0 || newCardNumber > 21) {
      return {
        success: false,
        error: {
          code: DeckDisplayErrorCode.CANNOT_NAVIGATE,
          message: DECK_DISPLAY_ERROR_MESSAGES[DeckDisplayErrorCode.CANNOT_NAVIGATE],
          retryable: false,
        },
      }
    }

    // Update lightbox state
    this.lightboxState = this.createLightboxState(
      newCardNumber,
      this.lightboxState.showPrompt,
      this.lightboxState.showMetadata
    )

    // Update display state
    if (this.displayState) {
      this.displayState.selectedCard = newCardNumber
    }

    // Find the card
    const card = this.displayCards.find(
      dc => dc.card.cardNumber === newCardNumber
    )

    if (!card) {
      return {
        success: false,
        error: {
          code: DeckDisplayErrorCode.INVALID_CARD_NUMBER,
          message: DECK_DISPLAY_ERROR_MESSAGES[DeckDisplayErrorCode.INVALID_CARD_NUMBER],
          retryable: false,
        },
      }
    }

    return {
      success: true,
      data: {
        lightboxState: this.lightboxState,
        card,
      },
    }
  }

  /**
   * Helper: Create lightbox state for a card
   */
  private createLightboxState(
    cardNumber: number,
    showPrompt: boolean,
    showMetadata: boolean
  ): LightboxState {
    return {
      open: true,
      currentCard: cardNumber,
      showPrompt,
      showMetadata,
      canNavigateLeft: cardNumber > 0,
      canNavigateRight: cardNumber < 21,
    }
  }
}
