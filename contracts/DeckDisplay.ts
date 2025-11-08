/**
 * @fileoverview Deck Display Contract - Gallery view for generated cards
 * @purpose Define the seam between generated cards and UI display components
 * @dataFlow Generated Cards → Display State → Grid/Lightbox UI → User Interaction
 * @boundary Seam #5: DeckDisplaySeam - Display 22 cards in interactive gallery
 * @requirement PRD Section: "User Flow Step 7 - View Generated Deck"
 * @updated 2025-11-07
 * 
 * @example
 * ```typescript
 * const state = displayService.initializeDisplay({ generatedCards: cards });
 * const lightbox = displayService.openLightbox({ cardNumber: 0 });
 * ```
 */

import type { ServiceResponse } from './types/common'
import type { GeneratedCard } from './ImageGeneration'
import type { CardPrompt } from './PromptGeneration'

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Display layout options
 */
export const DISPLAY_LAYOUTS = ['grid', 'list', 'carousel'] as const

/**
 * Grid columns configuration
 */
export const GRID_COLUMNS = {
  mobile: 2,
  tablet: 3,
  desktop: 4,
  large: 6,
} as const

/**
 * Card size presets
 */
export const CARD_SIZES = ['small', 'medium', 'large'] as const

/**
 * Sort options for cards
 */
export const SORT_OPTIONS = ['number', 'name', 'generated-date'] as const

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Display layout type
 */
export type DisplayLayout = typeof DISPLAY_LAYOUTS[number]

/**
 * Card size type
 */
export type CardSize = typeof CARD_SIZES[number]

/**
 * Sort option type
 */
export type SortOption = typeof SORT_OPTIONS[number]

// ============================================================================
// CORE DATA STRUCTURES
// ============================================================================

/**
 * Display state for the deck gallery
 * 
 * @property layout - Current layout mode
 * @property cardSize - Current card size
 * @property sortBy - Current sort order
 * @property selectedCard - Currently selected card (null if none)
 * @property lightboxOpen - Whether lightbox modal is open
 * @property showMetadata - Whether to show card metadata
 * @property filter - Optional filter for cards
 */
export interface DeckDisplayState {
  layout: DisplayLayout
  cardSize: CardSize
  sortBy: SortOption
  selectedCard: number | null
  lightboxOpen: boolean
  showMetadata: boolean
  filter?: string
}

/**
 * Card display information
 * Combines generated card with display metadata
 * 
 * @property card - Generated card data
 * @property position - Position in display (0-21)
 * @property visible - Whether card is currently visible (for filtering)
 * @property loading - Whether card image is still loading
 * @property error - Error loading this card (if any)
 */
export interface DisplayCard {
  card: GeneratedCard
  position: number
  visible: boolean
  loading: boolean
  error?: string
}

/**
 * Lightbox view state
 * Full-screen card viewer with navigation
 * 
 * @property open - Whether lightbox is open
 * @property currentCard - Current card number (0-21)
 * @property showPrompt - Whether to show generation prompt
 * @property showMetadata - Whether to show metadata
 * @property canNavigateLeft - Can go to previous card
 * @property canNavigateRight - Can go to next card
 */
export interface LightboxState {
  open: boolean
  currentCard: number
  showPrompt: boolean
  showMetadata: boolean
  canNavigateLeft: boolean
  canNavigateRight: boolean
}

// ============================================================================
// INPUT CONTRACTS
// ============================================================================

/**
 * Input for initializing deck display
 * 
 * @property generatedCards - All generated cards to display
 * @property initialLayout - Initial layout mode
 * @property initialSize - Initial card size
 * @property autoOpenFirst - Automatically open first card in lightbox
 */
export interface InitializeDisplayInput {
  generatedCards: GeneratedCard[]
  initialLayout?: DisplayLayout
  initialSize?: CardSize
  autoOpenFirst?: boolean
}

/**
 * Input for changing display layout
 * 
 * @property layout - New layout to switch to
 */
export interface ChangeLayoutInput {
  layout: DisplayLayout
}

/**
 * Input for changing card size
 * 
 * @property size - New card size
 */
export interface ChangeCardSizeInput {
  size: CardSize
}

/**
 * Input for sorting cards
 * 
 * @property sortBy - Sort option
 * @property ascending - Sort ascending (default true)
 */
export interface SortCardsInput {
  sortBy: SortOption
  ascending?: boolean
}

/**
 * Input for filtering cards
 * 
 * @property filter - Filter string (searches name, number, prompt)
 */
export interface FilterCardsInput {
  filter: string
}

/**
 * Input for selecting a card
 * 
 * @property cardNumber - Card number to select (0-21)
 * @property openLightbox - Whether to open lightbox (default false)
 */
export interface SelectCardInput {
  cardNumber: number
  openLightbox?: boolean
}

/**
 * Input for opening lightbox
 * 
 * @property cardNumber - Card number to display (0-21)
 * @property showPrompt - Show generation prompt (default false)
 * @property showMetadata - Show metadata (default false)
 */
export interface OpenLightboxInput {
  cardNumber: number
  showPrompt?: boolean
  showMetadata?: boolean
}

/**
 * Input for navigating in lightbox
 * 
 * @property direction - Navigation direction
 */
export interface NavigateLightboxInput {
  direction: 'previous' | 'next'
}

// ============================================================================
// OUTPUT CONTRACTS
// ============================================================================

/**
 * Result of initializing display
 * 
 * @property state - Initial display state
 * @property displayCards - All cards with display metadata
 * @property visibleCount - Number of visible cards
 */
export interface InitializeDisplayOutput {
  state: DeckDisplayState
  displayCards: DisplayCard[]
  visibleCount: number
}

/**
 * Result of changing layout
 * 
 * @property state - Updated display state
 * @property layout - New layout
 */
export interface ChangeLayoutOutput {
  state: DeckDisplayState
  layout: DisplayLayout
}

/**
 * Result of changing card size
 * 
 * @property state - Updated display state
 * @property size - New size
 */
export interface ChangeCardSizeOutput {
  state: DeckDisplayState
  size: CardSize
}

/**
 * Result of sorting cards
 * 
 * @property state - Updated display state
 * @property displayCards - Sorted cards
 */
export interface SortCardsOutput {
  state: DeckDisplayState
  displayCards: DisplayCard[]
}

/**
 * Result of filtering cards
 * 
 * @property state - Updated display state
 * @property displayCards - Filtered cards
 * @property visibleCount - Number of visible cards after filter
 */
export interface FilterCardsOutput {
  state: DeckDisplayState
  displayCards: DisplayCard[]
  visibleCount: number
}

/**
 * Result of selecting card
 * 
 * @property state - Updated display state
 * @property selectedCard - Selected card data
 * @property lightboxState - Lightbox state (if opened)
 */
export interface SelectCardOutput {
  state: DeckDisplayState
  selectedCard: DisplayCard
  lightboxState?: LightboxState
}

/**
 * Result of opening lightbox
 * 
 * @property state - Updated display state
 * @property lightboxState - Lightbox state
 * @property card - Card being displayed
 */
export interface OpenLightboxOutput {
  state: DeckDisplayState
  lightboxState: LightboxState
  card: DisplayCard
}

/**
 * Result of closing lightbox
 * 
 * @property state - Updated display state
 */
export interface CloseLightboxOutput {
  state: DeckDisplayState
}

/**
 * Result of navigating in lightbox
 * 
 * @property lightboxState - Updated lightbox state
 * @property card - New card being displayed
 */
export interface NavigateLightboxOutput {
  lightboxState: LightboxState
  card: DisplayCard
}

// ============================================================================
// ERROR CODES
// ============================================================================

/**
 * All possible error codes for display operations
 */
export enum DeckDisplayErrorCode {
  // Input validation
  NO_CARDS_PROVIDED = 'NO_CARDS_PROVIDED',
  INVALID_CARD_NUMBER = 'INVALID_CARD_NUMBER',
  INVALID_LAYOUT = 'INVALID_LAYOUT',
  INVALID_SIZE = 'INVALID_SIZE',
  INVALID_SORT_OPTION = 'INVALID_SORT_OPTION',
  
  // State errors
  NO_DISPLAY_STATE = 'NO_DISPLAY_STATE',
  LIGHTBOX_NOT_OPEN = 'LIGHTBOX_NOT_OPEN',
  CANNOT_NAVIGATE = 'CANNOT_NAVIGATE',
  
  // Display errors
  CARD_IMAGE_FAILED = 'CARD_IMAGE_FAILED',
  RENDER_FAILED = 'RENDER_FAILED',
}

// ============================================================================
// SERVICE INTERFACE (THE CONTRACT)
// ============================================================================

/**
 * Deck Display Service Contract
 * 
 * Defines all operations for displaying generated tarot cards.
 * Implementation handles:
 * - Layout management (grid, list, carousel)
 * - Card selection and filtering
 * - Lightbox modal navigation
 * - Metadata display
 * - Responsive sizing
 * 
 * @interface IDeckDisplayService
 */
export interface IDeckDisplayService {
  /**
   * Initialize deck display
   * 
   * Creates initial display state for gallery view.
   * 
   * @param input - Cards and display options
   * @returns Promise<ServiceResponse<InitializeDisplayOutput>> - Display state
   * 
   * @throws Never throws - all errors returned in ServiceResponse
   * 
   * @example
   * ```typescript
   * const result = await service.initializeDisplay({
   *   generatedCards: cards,
   *   initialLayout: 'grid',
   *   initialSize: 'medium'
   * });
   * 
   * if (result.success) {
   *   renderGallery(result.data.displayCards);
   * }
   * ```
   */
  initializeDisplay(
    input: InitializeDisplayInput
  ): Promise<ServiceResponse<InitializeDisplayOutput>>

  /**
   * Change display layout
   * 
   * @param input - New layout
   * @returns Promise<ServiceResponse<ChangeLayoutOutput>> - Updated state
   */
  changeLayout(
    input: ChangeLayoutInput
  ): Promise<ServiceResponse<ChangeLayoutOutput>>

  /**
   * Change card size
   * 
   * @param input - New size
   * @returns Promise<ServiceResponse<ChangeCardSizeOutput>> - Updated state
   */
  changeCardSize(
    input: ChangeCardSizeInput
  ): Promise<ServiceResponse<ChangeCardSizeOutput>>

  /**
   * Sort cards
   * 
   * @param input - Sort options
   * @returns Promise<ServiceResponse<SortCardsOutput>> - Sorted cards
   */
  sortCards(
    input: SortCardsInput
  ): Promise<ServiceResponse<SortCardsOutput>>

  /**
   * Filter cards by search term
   * 
   * @param input - Filter string
   * @returns Promise<ServiceResponse<FilterCardsOutput>> - Filtered cards
   */
  filterCards(
    input: FilterCardsInput
  ): Promise<ServiceResponse<FilterCardsOutput>>

  /**
   * Select a card
   * 
   * @param input - Card to select
   * @returns Promise<ServiceResponse<SelectCardOutput>> - Selection result
   */
  selectCard(
    input: SelectCardInput
  ): Promise<ServiceResponse<SelectCardOutput>>

  /**
   * Open lightbox for card
   * 
   * @param input - Card to display in lightbox
   * @returns Promise<ServiceResponse<OpenLightboxOutput>> - Lightbox state
   */
  openLightbox(
    input: OpenLightboxInput
  ): Promise<ServiceResponse<OpenLightboxOutput>>

  /**
   * Close lightbox
   * 
   * @returns Promise<ServiceResponse<CloseLightboxOutput>> - Updated state
   */
  closeLightbox(): Promise<ServiceResponse<CloseLightboxOutput>>

  /**
   * Navigate in lightbox (previous/next card)
   * 
   * @param input - Navigation direction
   * @returns Promise<ServiceResponse<NavigateLightboxOutput>> - New card
   */
  navigateLightbox(
    input: NavigateLightboxInput
  ): Promise<ServiceResponse<NavigateLightboxOutput>>
}

// ============================================================================
// USER-FRIENDLY ERROR MESSAGES
// ============================================================================

/**
 * Maps error codes to user-friendly messages
 */
export const DECK_DISPLAY_ERROR_MESSAGES: Record<DeckDisplayErrorCode, string> = {
  [DeckDisplayErrorCode.NO_CARDS_PROVIDED]: 
    'No cards provided for display',
  [DeckDisplayErrorCode.INVALID_CARD_NUMBER]: 
    'Invalid card number - must be between 0 and 21',
  [DeckDisplayErrorCode.INVALID_LAYOUT]: 
    'Invalid layout option',
  [DeckDisplayErrorCode.INVALID_SIZE]: 
    'Invalid card size option',
  [DeckDisplayErrorCode.INVALID_SORT_OPTION]: 
    'Invalid sort option',
  
  [DeckDisplayErrorCode.NO_DISPLAY_STATE]: 
    'Display not initialized - please refresh the page',
  [DeckDisplayErrorCode.LIGHTBOX_NOT_OPEN]: 
    'Lightbox is not open',
  [DeckDisplayErrorCode.CANNOT_NAVIGATE]: 
    'Cannot navigate in that direction',
  
  [DeckDisplayErrorCode.CARD_IMAGE_FAILED]: 
    'Failed to load card image',
  [DeckDisplayErrorCode.RENDER_FAILED]: 
    'Failed to render display',
}

// ============================================================================
// METADATA
// ============================================================================

/**
 * Contract metadata for tracking and documentation
 */
export const DECK_DISPLAY_CONTRACT_METADATA = {
  version: '1.0.0',
  seam: 'DeckDisplaySeam',
  boundary: 'Generated Cards → UI Components → User Interaction',
  requirement: 'PRD: User Flow Step 7',
  lastUpdated: '2025-11-07',
  dependencies: ['ImageGeneration', 'PromptGeneration'],
} as const
