/**
 * @fileoverview DeckDisplayService — real implementation.
 * Pure functions and display state management for tarot deck gallery.
 * Design: never mutates input arrays, strictly implements IDeckDisplayService contract.
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

export class DeckDisplayService implements IDeckDisplayService {
  private displayState: DeckDisplayState | null = null
  private displayCards: DisplayCard[] = []
  private lightboxState: LightboxState | null = null

  private toDisplayCard(card: GeneratedCard, position: number): DisplayCard {
    return {
      card,
      position,
      visible: true,
      loading: false,
      error: card.generationStatus === 'failed' ? card.error : undefined,
    }
  }

  private sortCardsInternal(
    cards: DisplayCard[],
    sortBy: SortOption,
    ascending: boolean
  ): DisplayCard[] {
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
          const dateA = a.card.generatedAt ? new Date(a.card.generatedAt).getTime() : 0
          const dateB = b.card.generatedAt ? new Date(b.card.generatedAt).getTime() : 0
          comparison = dateA - dateB
          break
      }
      return ascending ? comparison : -comparison
    })

    return sorted.map((card, index) => ({ ...card, position: index }))
  }

  async initializeDisplay(
    input: InitializeDisplayInput
  ): Promise<ServiceResponse<InitializeDisplayOutput>> {
    const {
      generatedCards,
      initialLayout = 'grid',
      initialSize = 'medium',
      autoOpenFirst = false,
    } = input

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

    this.displayCards = generatedCards.map((card, index) => this.toDisplayCard(card, index))

    this.displayState = {
      layout: initialLayout,
      cardSize: initialSize,
      sortBy: 'number',
      selectedCard: autoOpenFirst ? 0 : null,
      lightboxOpen: autoOpenFirst,
      showMetadata: true,
      filter: undefined,
    }

    if (autoOpenFirst && this.displayCards.length > 0) {
      this.lightboxState = {
        open: true,
        currentCard: 0,
        showPrompt: true,
        showMetadata: true,
        canNavigateLeft: false,
        canNavigateRight: this.displayCards.length > 1,
      }
    } else {
      this.lightboxState = null
    }

    return {
      success: true,
      data: {
        state: this.displayState,
        displayCards: this.displayCards,
        visibleCount: this.displayCards.length,
      },
    }
  }

  async changeLayout(input: ChangeLayoutInput): Promise<ServiceResponse<ChangeLayoutOutput>> {
    if (!this.displayState) {
      return {
        success: false,
        error: {
          code: DeckDisplayErrorCode.NO_DISPLAY_STATE,
          message: 'Display state not initialized',
          retryable: false,
        },
      }
    }

    this.displayState.layout = input.layout

    return {
      success: true,
      data: {
        state: this.displayState,
        layout: input.layout,
      },
    }
  }

  async changeCardSize(input: ChangeCardSizeInput): Promise<ServiceResponse<ChangeCardSizeOutput>> {
    if (!this.displayState) {
      return {
        success: false,
        error: {
          code: DeckDisplayErrorCode.NO_DISPLAY_STATE,
          message: 'Display state not initialized',
          retryable: false,
        },
      }
    }

    this.displayState.cardSize = input.size

    return {
      success: true,
      data: {
        state: this.displayState,
        size: input.size,
      },
    }
  }

  async sortCards(input: SortCardsInput): Promise<ServiceResponse<SortCardsOutput>> {
    if (!this.displayState) {
      return {
        success: false,
        error: {
          code: DeckDisplayErrorCode.NO_DISPLAY_STATE,
          message: 'Display state not initialized',
          retryable: false,
        },
      }
    }

    const { sortBy, ascending = true } = input
    this.displayCards = this.sortCardsInternal(this.displayCards, sortBy, ascending)
    this.displayState.sortBy = sortBy

    return {
      success: true,
      data: {
        state: this.displayState,
        displayCards: this.displayCards,
      },
    }
  }

  async filterCards(input: FilterCardsInput): Promise<ServiceResponse<FilterCardsOutput>> {
    if (!this.displayState) {
      return {
        success: false,
        error: {
          code: DeckDisplayErrorCode.NO_DISPLAY_STATE,
          message: 'Display state not initialized',
          retryable: false,
        },
      }
    }

    const searchTerm = input.filter.toLowerCase().trim()
    this.displayState.filter = input.filter

    if (!searchTerm) {
      this.displayCards = this.displayCards.map(c => ({ ...c, visible: true }))
    } else {
      this.displayCards = this.displayCards.map(c => {
        const matchesName = c.card.cardName.toLowerCase().includes(searchTerm)
        const matchesNumber = c.card.cardNumber.toString().includes(searchTerm)
        const matchesPrompt = c.card.prompt.toLowerCase().includes(searchTerm)
        return {
          ...c,
          visible: matchesName || matchesNumber || matchesPrompt,
        }
      })
    }

    const visibleCount = this.displayCards.filter(c => c.visible).length

    return {
      success: true,
      data: {
        state: this.displayState,
        displayCards: this.displayCards,
        visibleCount,
      },
    }
  }

  async selectCard(input: SelectCardInput): Promise<ServiceResponse<SelectCardOutput>> {
    if (!this.displayState) {
      return {
        success: false,
        error: {
          code: DeckDisplayErrorCode.NO_DISPLAY_STATE,
          message: 'Display state not initialized',
          retryable: false,
        },
      }
    }

    const targetCard = this.displayCards.find(c => c.card.cardNumber === input.cardNumber)
    if (!targetCard) {
      return {
        success: false,
        error: {
          code: DeckDisplayErrorCode.INVALID_CARD_NUMBER,
          message: `Card number ${input.cardNumber} not found`,
          retryable: false,
        },
      }
    }

    this.displayState.selectedCard = input.cardNumber

    if (input.openLightbox) {
      this.displayState.lightboxOpen = true
      const index = this.displayCards.findIndex(c => c.card.cardNumber === input.cardNumber)
      this.lightboxState = {
        open: true,
        currentCard: input.cardNumber,
        showPrompt: true,
        showMetadata: true,
        canNavigateLeft: index > 0,
        canNavigateRight: index < this.displayCards.length - 1,
      }
    }

    return {
      success: true,
      data: {
        state: this.displayState,
        selectedCard: targetCard,
        lightboxState: this.lightboxState ?? undefined,
      },
    }
  }

  async openLightbox(input: OpenLightboxInput): Promise<ServiceResponse<OpenLightboxOutput>> {
    if (!this.displayState) {
      return {
        success: false,
        error: {
          code: DeckDisplayErrorCode.NO_DISPLAY_STATE,
          message: 'Display state not initialized',
          retryable: false,
        },
      }
    }

    const index = this.displayCards.findIndex(c => c.card.cardNumber === input.cardNumber)
    if (index === -1) {
      return {
        success: false,
        error: {
          code: DeckDisplayErrorCode.INVALID_CARD_NUMBER,
          message: `Card number ${input.cardNumber} not found`,
          retryable: false,
        },
      }
    }

    const card = this.displayCards[index]
    if (!card) {
      return {
        success: false,
        error: {
          code: DeckDisplayErrorCode.INVALID_CARD_NUMBER,
          message: `Card number ${input.cardNumber} not found`,
          retryable: false,
        },
      }
    }

    this.displayState.selectedCard = input.cardNumber
    this.displayState.lightboxOpen = true

    this.lightboxState = {
      open: true,
      currentCard: input.cardNumber,
      showPrompt: input.showPrompt ?? true,
      showMetadata: input.showMetadata ?? true,
      canNavigateLeft: index > 0,
      canNavigateRight: index < this.displayCards.length - 1,
    }

    return {
      success: true,
      data: {
        state: this.displayState,
        lightboxState: this.lightboxState,
        card,
      },
    }
  }

  async closeLightbox(): Promise<ServiceResponse<CloseLightboxOutput>> {
    if (!this.displayState) {
      return {
        success: false,
        error: {
          code: DeckDisplayErrorCode.NO_DISPLAY_STATE,
          message: 'Display state not initialized',
          retryable: false,
        },
      }
    }

    this.displayState.lightboxOpen = false
    this.lightboxState = null

    return {
      success: true,
      data: {
        state: this.displayState,
      },
    }
  }

  async navigateLightbox(
    input: NavigateLightboxInput
  ): Promise<ServiceResponse<NavigateLightboxOutput>> {
    if (!this.lightboxState || !this.lightboxState.open) {
      return {
        success: false,
        error: {
          code: DeckDisplayErrorCode.LIGHTBOX_NOT_OPEN,
          message: 'Lightbox is not open',
          retryable: false,
        },
      }
    }

    const currentCardNum = this.lightboxState.currentCard
    const currentIndex = this.displayCards.findIndex(c => c.card.cardNumber === currentCardNum)

    let newIndex = currentIndex
    if (input.direction === 'previous' && currentIndex > 0) {
      newIndex = currentIndex - 1
    } else if (input.direction === 'next' && currentIndex < this.displayCards.length - 1) {
      newIndex = currentIndex + 1
    } else {
      return {
        success: false,
        error: {
          code: DeckDisplayErrorCode.CANNOT_NAVIGATE,
          message: `Cannot navigate ${input.direction}`,
          retryable: false,
        },
      }
    }

    const newCard = this.displayCards[newIndex]
    if (!newCard) {
      return {
        success: false,
        error: {
          code: DeckDisplayErrorCode.CANNOT_NAVIGATE,
          message: `Card at index ${newIndex} not found`,
          retryable: false,
        },
      }
    }

    this.lightboxState.currentCard = newCard.card.cardNumber
    this.lightboxState.canNavigateLeft = newIndex > 0
    this.lightboxState.canNavigateRight = newIndex < this.displayCards.length - 1

    if (this.displayState) {
      this.displayState.selectedCard = newCard.card.cardNumber
    }

    return {
      success: true,
      data: {
        lightboxState: this.lightboxState,
        card: newCard,
      },
    }
  }
}
