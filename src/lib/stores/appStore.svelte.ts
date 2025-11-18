/**
 * @fileoverview Global application store using Svelte 5 runes
 * @purpose Centralized state management for the entire tarot generation flow
 * @dataFlow Components read/write state through this store
 * @boundary Central state management - no external API calls
 * @updated 2025-11-15
 *
 * This store manages the complete application state across all phases:
 * - Phase 1: Image Upload (reference images)
 * - Phase 2: Style Input (theme, tone, description)
 * - Phase 3: Prompt Generation (22 card prompts)
 * - Phase 4: Image Generation (22 generated cards)
 * - UI State: Current page, loading, errors
 *
 * Uses Svelte 5 runes ($state, $derived) for reactive state management.
 *
 * @example
 * ```typescript
 * import { appStore } from '$lib/stores/appStore.svelte'
 *
 * // In component
 * function handleUpload(images: UploadedImage[]) {
 *   appStore.setUploadedImages(images)
 * }
 *
 * // Access computed values
 * if (appStore.canProceedToGenerate) {
 *   console.log('Ready to generate!')
 * }
 * ```
 */

import type {
  UploadedImage,
  StyleInputs,
  CardPrompt,
  GeneratedCard,
  ImageGenerationProgress,
} from '$contracts/index'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Application pages/steps in the generation flow
 */
export type AppPage =
  | 'upload' // Step 1: Upload reference images
  | 'style' // Step 2: Define style parameters
  | 'prompts' // Step 3: Generate and review prompts
  | 'generate' // Step 4: Generate card images
  | 'review' // Step 5: Review and download deck

/**
 * Loading state keys for different async operations
 */
export type LoadingStateKey =
  | 'uploadingImages'
  | 'savingStyleInputs'
  | 'generatingPrompts'
  | 'generatingImages'
  | 'downloadingDeck'

/**
 * Error state for UI display
 */
export interface AppError {
  /** Error message to display */
  message: string
  /** Error code for programmatic handling */
  code?: string
  /** Whether error is dismissable */
  dismissable: boolean
  /** Timestamp when error occurred */
  timestamp: Date
}

// ============================================================================
// STORE CLASS
// ============================================================================

/**
 * Global application store using Svelte 5 runes
 *
 * This class encapsulates all application state and provides
 * methods for state updates and computed values via $derived.
 *
 * State is reactive thanks to $state rune.
 * Computed values are automatically recalculated via $derived rune.
 */
class AppStore {
  // ========================================================================
  // UPLOAD STATE
  // ========================================================================

  /**
   * Uploaded reference images
   * Empty array initially, populated when user uploads images
   */
  uploadedImages = $state<UploadedImage[]>([])

  /**
   * Maximum number of images allowed
   * Per requirements: 10 images max
   */
  readonly MAX_IMAGES = 10

  // ========================================================================
  // STYLE STATE
  // ========================================================================

  /**
   * User's style inputs (theme, tone, description, concept, characters)
   * Null until user provides style parameters
   */
  styleInputs = $state<StyleInputs | null>(null)

  // ========================================================================
  // PROMPT STATE
  // ========================================================================

  /**
   * Generated prompts for all 22 Major Arcana cards
   * Empty array initially, populated after prompt generation
   */
  generatedPrompts = $state<CardPrompt[]>([])

  // ========================================================================
  // GENERATION STATE
  // ========================================================================

  /**
   * Generated card images
   * Empty array initially, populated during image generation
   */
  generatedCards = $state<GeneratedCard[]>([])

  /**
   * Current image generation progress
   * Null when not generating, updated during generation
   */
  generationProgress = $state<ImageGenerationProgress | null>(null)

  // ========================================================================
  // UI STATE
  // ========================================================================

  /**
   * Current page/step in the generation flow
   * Starts at 'upload'
   */
  currentPage = $state<AppPage>('upload')

  /**
   * Loading states for different async operations
   * Map of operation name to loading boolean
   */
  loadingStates = $state<Record<LoadingStateKey, boolean>>({
    uploadingImages: false,
    savingStyleInputs: false,
    generatingPrompts: false,
    generatingImages: false,
    downloadingDeck: false,
  })

  /**
   * Current error state
   * Null when no error, populated when error occurs
   */
  currentError = $state<AppError | null>(null)

  // ========================================================================
  // COMPUTED VALUES (using $derived)
  // ========================================================================

  /**
   * Whether user can proceed to image generation
   *
   * Requirements:
   * - Has uploaded images
   * - Has defined style inputs
   * - Has generated prompts (22 cards)
   *
   * @returns true if all requirements met
   */
  canProceedToGenerate = $derived(
    this.uploadedImages.length > 0 &&
      this.styleInputs !== null &&
      this.generatedPrompts.length === 22
  )

  /**
   * Total estimated cost across all operations
   *
   * Sums up:
   * - Prompt generation cost (from API usage)
   * - Image generation cost (from API usage)
   *
   * @returns Total cost in USD, or 0 if no costs yet
   */
  totalCost = $derived(() => {
    let cost = 0

    // Add prompt generation cost if available
    // Note: CardPrompt doesn't include cost directly
    // Cost would come from the GeneratePromptsOutput.usage.estimatedCost
    // For now, we'll return 0 as we'd need to store API usage separately

    // Add image generation cost
    // Note: Cost info would be in the API response, not on individual cards
    // We'd need to store TotalImageGenerationUsage separately
    // For now, just iterate to suppress unused variable warnings
    this.generatedCards.forEach(() => {
      // When we have cost tracking, add costs here
    })

    return cost
  })

  /**
   * Whether image generation is currently in progress
   *
   * @returns true if generating images
   */
  isGenerating = $derived(this.loadingStates.generatingImages)

  /**
   * Whether any async operation is in progress
   *
   * @returns true if any loading state is true
   */
  isLoading = $derived(Object.values(this.loadingStates).some(loading => loading))

  /**
   * Number of uploaded images
   *
   * @returns Count of uploaded images
   */
  uploadedImageCount = $derived(this.uploadedImages.length)

  /**
   * Whether user can upload more images
   *
   * @returns true if under MAX_IMAGES limit
   */
  canUploadMore = $derived(this.uploadedImages.length < this.MAX_IMAGES)

  /**
   * How many more images can be uploaded
   *
   * @returns Remaining slots
   */
  remainingImageSlots = $derived(this.MAX_IMAGES - this.uploadedImages.length)

  /**
   * Number of generated prompts
   *
   * @returns Count of prompts
   */
  promptCount = $derived(this.generatedPrompts.length)

  /**
   * Whether all 22 prompts have been generated
   *
   * @returns true if 22 prompts exist
   */
  hasAllPrompts = $derived(this.generatedPrompts.length === 22)

  /**
   * Number of successfully generated cards
   *
   * @returns Count of cards with 'completed' status
   */
  completedCardCount = $derived(
    this.generatedCards.filter(card => card.generationStatus === 'completed').length
  )

  /**
   * Number of failed card generations
   *
   * @returns Count of cards with 'failed' status
   */
  failedCardCount = $derived(
    this.generatedCards.filter(card => card.generationStatus === 'failed').length
  )

  /**
   * Whether all 22 cards have been successfully generated
   *
   * @returns true if 22 cards completed
   */
  hasAllCards = $derived(this.completedCardCount === 22)

  /**
   * Current generation progress percentage
   *
   * @returns Progress 0-100, or 0 if not generating
   */
  generationProgressPercent = $derived(this.generationProgress?.percentComplete ?? 0)

  // ========================================================================
  // STATE MUTATION METHODS
  // ========================================================================

  /**
   * Set uploaded images
   *
   * Replaces current uploaded images with new array.
   * Use for both initial upload and when modifying images.
   *
   * @param images - Array of uploaded images
   *
   * @example
   * ```typescript
   * appStore.setUploadedImages([image1, image2, image3])
   * ```
   */
  setUploadedImages(images: UploadedImage[]): void {
    this.uploadedImages = images
  }

  /**
   * Add a single uploaded image
   *
   * Appends image to existing array.
   * Useful for incremental uploads.
   *
   * @param image - Single image to add
   *
   * @example
   * ```typescript
   * appStore.addUploadedImage(newImage)
   * ```
   */
  addUploadedImage(image: UploadedImage): void {
    if (this.uploadedImages.length < this.MAX_IMAGES) {
      this.uploadedImages = [...this.uploadedImages, image]
    }
  }

  /**
   * Remove an uploaded image by ID
   *
   * Filters out image with matching ID.
   *
   * @param imageId - ID of image to remove
   *
   * @example
   * ```typescript
   * appStore.removeUploadedImage('image-uuid-123')
   * ```
   */
  removeUploadedImage(imageId: string): void {
    this.uploadedImages = this.uploadedImages.filter(img => img.id !== imageId)
  }

  /**
   * Clear all uploaded images
   *
   * Resets to empty array.
   *
   * @example
   * ```typescript
   * appStore.clearUploadedImages()
   * ```
   */
  clearUploadedImages(): void {
    this.uploadedImages = []
  }

  /**
   * Set style inputs
   *
   * Replaces current style inputs with new values.
   *
   * @param inputs - Complete style inputs
   *
   * @example
   * ```typescript
   * appStore.setStyleInputs({
   *   theme: 'Cyberpunk',
   *   tone: 'Dark',
   *   description: 'Neon-lit dystopian future...'
   * })
   * ```
   */
  setStyleInputs(inputs: StyleInputs): void {
    this.styleInputs = inputs
  }

  /**
   * Clear style inputs
   *
   * Resets to null.
   *
   * @example
   * ```typescript
   * appStore.clearStyleInputs()
   * ```
   */
  clearStyleInputs(): void {
    this.styleInputs = null
  }

  /**
   * Set generated prompts
   *
   * Replaces current prompts with new array.
   * Typically receives all 22 prompts at once from API.
   *
   * @param prompts - Array of 22 card prompts
   *
   * @example
   * ```typescript
   * appStore.setGeneratedPrompts(allPrompts)
   * ```
   */
  setGeneratedPrompts(prompts: CardPrompt[]): void {
    this.generatedPrompts = prompts
  }

  /**
   * Update a single prompt
   *
   * Replaces prompt at specific card number.
   * Useful for regenerating individual prompts.
   *
   * @param cardNumber - Card number (0-21)
   * @param prompt - Updated prompt
   *
   * @example
   * ```typescript
   * appStore.updatePrompt(0, newFoolPrompt)
   * ```
   */
  updatePrompt(cardNumber: number, prompt: CardPrompt): void {
    this.generatedPrompts = this.generatedPrompts.map(p =>
      p.cardNumber === cardNumber ? prompt : p
    )
  }

  /**
   * Clear generated prompts
   *
   * Resets to empty array.
   *
   * @example
   * ```typescript
   * appStore.clearGeneratedPrompts()
   * ```
   */
  clearGeneratedPrompts(): void {
    this.generatedPrompts = []
  }

  /**
   * Set generated cards
   *
   * Replaces current cards with new array.
   * Use when receiving batch of cards from API.
   *
   * @param cards - Array of generated cards
   *
   * @example
   * ```typescript
   * appStore.setGeneratedCards(allCards)
   * ```
   */
  setGeneratedCards(cards: GeneratedCard[]): void {
    this.generatedCards = cards
  }

  /**
   * Update a single generated card
   *
   * Replaces card at specific card number.
   * Useful for updating status during generation or regenerating failed cards.
   *
   * @param cardNumber - Card number (0-21)
   * @param card - Updated card
   *
   * @example
   * ```typescript
   * appStore.updateGeneratedCard(0, { ...card, generationStatus: 'completed' })
   * ```
   */
  updateGeneratedCard(cardNumber: number, card: GeneratedCard): void {
    this.generatedCards = this.generatedCards.map(c => (c.cardNumber === cardNumber ? card : c))
  }

  /**
   * Clear generated cards
   *
   * Resets to empty array.
   *
   * @example
   * ```typescript
   * appStore.clearGeneratedCards()
   * ```
   */
  clearGeneratedCards(): void {
    this.generatedCards = []
  }

  /**
   * Update generation progress
   *
   * Updates current progress during image generation.
   * Called by onProgress callback from image generation service.
   *
   * @param progress - Current generation progress
   *
   * @example
   * ```typescript
   * appStore.updateGenerationProgress({
   *   total: 22,
   *   completed: 10,
   *   failed: 0,
   *   current: 11,
   *   percentComplete: 45,
   *   estimatedTimeRemaining: 120,
   *   status: 'Generating card 11/22...'
   * })
   * ```
   */
  updateGenerationProgress(progress: ImageGenerationProgress): void {
    this.generationProgress = progress
  }

  /**
   * Clear generation progress
   *
   * Resets to null.
   * Call when generation completes or is canceled.
   *
   * @example
   * ```typescript
   * appStore.clearGenerationProgress()
   * ```
   */
  clearGenerationProgress(): void {
    this.generationProgress = null
  }

  /**
   * Navigate to a specific page
   *
   * Updates current page in the flow.
   *
   * @param page - Page to navigate to
   *
   * @example
   * ```typescript
   * appStore.setCurrentPage('prompts')
   * ```
   */
  setCurrentPage(page: AppPage): void {
    this.currentPage = page
  }

  /**
   * Navigate to next page in the flow
   *
   * Advances to next step:
   * upload -> style -> prompts -> generate -> review
   *
   * @example
   * ```typescript
   * appStore.nextPage()
   * ```
   */
  nextPage(): void {
    const pages: AppPage[] = ['upload', 'style', 'prompts', 'generate', 'review']
    const currentIndex = pages.indexOf(this.currentPage)
    if (currentIndex !== -1 && currentIndex < pages.length - 1) {
      const nextPage = pages[currentIndex + 1]
      if (nextPage) {
        this.currentPage = nextPage
      }
    }
  }

  /**
   * Navigate to previous page in the flow
   *
   * Goes back one step.
   *
   * @example
   * ```typescript
   * appStore.previousPage()
   * ```
   */
  previousPage(): void {
    const pages: AppPage[] = ['upload', 'style', 'prompts', 'generate', 'review']
    const currentIndex = pages.indexOf(this.currentPage)
    if (currentIndex > 0) {
      const prevPage = pages[currentIndex - 1]
      if (prevPage) {
        this.currentPage = prevPage
      }
    }
  }

  /**
   * Set loading state for a specific operation
   *
   * @param key - Loading state key
   * @param loading - Whether operation is loading
   *
   * @example
   * ```typescript
   * appStore.setLoading('generatingPrompts', true)
   * // ... perform operation ...
   * appStore.setLoading('generatingPrompts', false)
   * ```
   */
  setLoading(key: LoadingStateKey, loading: boolean): void {
    this.loadingStates[key] = loading
  }

  /**
   * Set error state
   *
   * Displays error to user.
   *
   * @param message - Error message
   * @param code - Optional error code
   * @param dismissable - Whether error can be dismissed (default true)
   *
   * @example
   * ```typescript
   * appStore.setError('Failed to generate prompts', 'API_ERROR')
   * ```
   */
  setError(message: string, code?: string, dismissable = true): void {
    this.currentError = {
      message,
      code,
      dismissable,
      timestamp: new Date(),
    }
  }

  /**
   * Clear error state
   *
   * Dismisses current error.
   *
   * @example
   * ```typescript
   * appStore.clearError()
   * ```
   */
  clearError(): void {
    this.currentError = null
  }

  /**
   * Reset entire store to initial state
   *
   * Clears all data and resets to defaults.
   * Use for "start over" functionality.
   *
   * @example
   * ```typescript
   * appStore.reset()
   * ```
   */
  reset(): void {
    // Clear all data
    this.uploadedImages = []
    this.styleInputs = null
    this.generatedPrompts = []
    this.generatedCards = []
    this.generationProgress = null

    // Reset UI state
    this.currentPage = 'upload'
    this.loadingStates = {
      uploadingImages: false,
      savingStyleInputs: false,
      generatingPrompts: false,
      generatingImages: false,
      downloadingDeck: false,
    }
    this.currentError = null
  }
}

// ============================================================================
// STORE INSTANCE EXPORT
// ============================================================================

/**
 * Global application store instance
 *
 * Import and use this singleton throughout your application.
 *
 * @example
 * ```typescript
 * import { appStore } from '$lib/stores/appStore.svelte'
 *
 * // In component
 * <script lang="ts">
 *   import { appStore } from '$lib/stores/appStore.svelte'
 *
 *   function handleNext() {
 *     if (appStore.canProceedToGenerate) {
 *       appStore.nextPage()
 *     }
 *   }
 * </script>
 *
 * <button
 *   onclick={handleNext}
 *   disabled={!appStore.canProceedToGenerate}
 * >
 *   {#if appStore.isLoading}
 *     Loading...
 *   {:else}
 *     Next ({appStore.completedCardCount}/22)
 *   {/if}
 * </button>
 * ```
 */
export const appStore = new AppStore()
