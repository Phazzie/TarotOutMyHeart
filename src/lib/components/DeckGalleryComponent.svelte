<!--
/**
 * @fileoverview Deck Gallery Component - Interactive gallery for generated tarot cards
 * @purpose Display 22 Major Arcana cards in responsive grid with lightbox, filtering, and sorting
 * @dataFlow appStore.generatedCards → DeckDisplayService → Grid Display → Lightbox Modal
 * @boundary Consumes Seam #5 (DeckDisplay) via DeckDisplayMock service
 * @updated 2026-08-07
 *
 * Features:
 * - Responsive grid layout (4 cols desktop, 3 tablet, 2 mobile)
 * - Card thumbnails with hover effects
 * - Lightbox modal with full-size image view, smooth backdrop blur, and high-res inspector
 * - Keyboard navigation (Arrow keys, ESC) using Svelte 5 $effect with cleanup
 * - Filter by status (all, completed, failed)
 * - Sort by card number, name, or generation date
 * - Accessibility (ARIA labels, focus management)
 * - Loading skeletons for pending cards
 * - Glassmorphism design matching app theme
 *
 * @example
 * ```svelte
 * <script>
 *   import DeckGalleryComponent from '$lib/components/DeckGalleryComponent.svelte'
 *   import { appStore } from '$lib/stores/appStore.svelte'
 * </script>
 *
 * <DeckGalleryComponent cards={appStore.generatedCards} />
 * ```
 */
-->

<script lang="ts">
  import { onMount } from 'svelte'
  import { deckDisplayService } from '$services/factory'
  import type {
    GeneratedCard,
    DisplayCard,
    LightboxState,
    DisplayLayout,
    CardSize,
    SortOption,
  } from '$contracts/index'

  // ============================================================================
  // PROPS
  // ============================================================================

  /**
   * Array of generated cards to display
   * Should come from appStore.generatedCards
   */
  interface Props {
    cards: GeneratedCard[]
  }

  const { cards = [] }: Props = $props()

  // ============================================================================
  // SERVICE INITIALIZATION
  // ============================================================================

  const displayService = deckDisplayService

  // ============================================================================
  // COMPONENT STATE
  // ============================================================================

  /** Display cards with metadata (visible, loading, error) */
  let displayCards = $state<DisplayCard[]>([])

  /** Current layout mode */
  const layout = $state<DisplayLayout>('grid')

  /** Current card size */
  const cardSize = $state<CardSize>('medium')

  /** Current sort option */
  let sortBy = $state<SortOption>('number')

  /** Sort direction */
  let sortAscending = $state<boolean>(true)

  /** Filter search term */
  let filterTerm = $state<string>('')

  /** Filter by status */
  let statusFilter = $state<'all' | 'completed' | 'failed'>('all')

  /** Lightbox state */
  let lightboxState = $state<LightboxState | null>(null)

  /** Current lightbox card */
  let lightboxCard = $state<DisplayCard | null>(null)

  /** Loading state */
  let loading = $state<boolean>(false)

  /** Error state */
  let error = $state<string | null>(null)

  /** High-resolution view toggle state for lightbox modal */
  let isHighResZoomed = $state<boolean>(false)

  /** Copy prompt status state */
  let copiedPrompt = $state<boolean>(false)

  /** Whether lightbox is open (derived from lightboxState) */
  const isLightboxOpen = $derived(lightboxState?.open ?? false)

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  /** Filtered and sorted cards */
  const visibleCards = $derived.by(() => {
    const filtered = displayCards.filter(dc => {
      // Filter by status
      if (statusFilter === 'completed' && dc.card.generationStatus !== 'completed') {
        return false
      }
      if (statusFilter === 'failed' && dc.card.generationStatus !== 'failed') {
        return false
      }

      // Filter by search term
      if (filterTerm) {
        const searchLower = filterTerm.toLowerCase()
        const matchesName = dc.card.cardName.toLowerCase().includes(searchLower)
        const matchesNumber = dc.card.cardNumber.toString().includes(searchLower)
        const matchesPrompt = dc.card.prompt.toLowerCase().includes(searchLower)
        return matchesName || matchesNumber || matchesPrompt
      }

      return dc.visible
    })

    // Sort cards
    filtered.sort((a, b) => {
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

      return sortAscending ? comparison : -comparison
    })

    return filtered
  })

  /** Number of visible cards */
  const visibleCount = $derived(visibleCards.length)

  /** Number of completed cards */
  const completedCount = $derived(
    displayCards.filter(dc => dc.card.generationStatus === 'completed').length
  )

  /** Number of failed cards */
  const failedCount = $derived(
    displayCards.filter(dc => dc.card.generationStatus === 'failed').length
  )

  // ============================================================================
  // LIFECYCLE & EFFECTS
  // ============================================================================

  /**
   * Initialize display when component mounts
   */
  onMount(async () => {
    if (cards.length === 0) return

    loading = true
    error = null

    const result = await displayService.initializeDisplay({
      generatedCards: cards,
      initialLayout: 'grid',
      initialSize: 'medium',
    })

    if (result.success && result.data) {
      displayCards = result.data.displayCards
    } else {
      error = result.error?.message ?? 'Failed to initialize gallery'
    }

    loading = false
  })

  /**
   * Re-initialize when cards change
   */
  $effect(() => {
    if (cards.length > 0 && displayCards.length === 0) {
      initializeDisplay()
    }
  })

  /**
   * Keyboard event listener for Lightbox modal navigation (ArrowLeft, ArrowRight, Escape).
   * Managed dynamically via Svelte 5 $effect with automatic cleanup on state change or unmount.
   */
  $effect(() => {
    if (!isLightboxOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeLightbox()
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        navigatePrevious()
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        navigateNext()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  })

  // ============================================================================
  // ACTIONS
  // ============================================================================

  /**
   * Initialize display with current cards
   */
  async function initializeDisplay(): Promise<void> {
    loading = true
    error = null

    const result = await displayService.initializeDisplay({
      generatedCards: cards,
      initialLayout: layout,
      initialSize: cardSize,
    })

    if (result.success && result.data) {
      displayCards = result.data.displayCards
    } else {
      error = result.error?.message ?? 'Failed to initialize gallery'
    }

    loading = false
  }

  /**
   * Open lightbox for a specific card
   */
  async function openLightbox(cardNumber: number): Promise<void> {
    isHighResZoomed = false
    copiedPrompt = false

    const result = await displayService.openLightbox({
      cardNumber,
      showPrompt: true,
      showMetadata: true,
    })

    if (result.success && result.data) {
      lightboxState = result.data.lightboxState
      lightboxCard = result.data.card

      // Focus lightbox for accessibility
      setTimeout(() => {
        const lightboxElement = document.querySelector('.lightbox')
        if (lightboxElement instanceof HTMLElement) {
          lightboxElement.focus()
        }
      }, 100)
    }
  }

  /**
   * Close lightbox
   */
  async function closeLightbox(): Promise<void> {
    isHighResZoomed = false
    copiedPrompt = false

    const result = await displayService.closeLightbox()

    if (result.success) {
      lightboxState = null
      lightboxCard = null
    }
  }

  /**
   * Navigate to previous card in lightbox
   */
  async function navigatePrevious(): Promise<void> {
    if (!lightboxState?.canNavigateLeft) return
    isHighResZoomed = false
    copiedPrompt = false

    const result = await displayService.navigateLightbox({ direction: 'previous' })

    if (result.success && result.data) {
      lightboxState = result.data.lightboxState
      lightboxCard = result.data.card
    }
  }

  /**
   * Navigate to next card in lightbox
   */
  async function navigateNext(): Promise<void> {
    if (!lightboxState?.canNavigateRight) return
    isHighResZoomed = false
    copiedPrompt = false

    const result = await displayService.navigateLightbox({ direction: 'next' })

    if (result.success && result.data) {
      lightboxState = result.data.lightboxState
      lightboxCard = result.data.card
    }
  }

  /**
   * Change sort option
   */
  async function changeSortBy(newSortBy: SortOption): Promise<void> {
    sortBy = newSortBy

    const result = await displayService.sortCards({
      sortBy: newSortBy,
      ascending: sortAscending,
    })

    if (result.success && result.data) {
      displayCards = result.data.displayCards
    }
  }

  /**
   * Toggle sort direction
   */
  function toggleSortDirection(): void {
    sortAscending = !sortAscending
    changeSortBy(sortBy)
  }

  /**
   * Apply filter
   */
  async function applyFilter(): Promise<void> {
    const result = await displayService.filterCards({
      filter: filterTerm,
    })

    if (result.success && result.data) {
      displayCards = result.data.displayCards
    }
  }

  /**
   * Clear filter
   */
  async function clearFilter(): Promise<void> {
    filterTerm = ''
    await applyFilter()
  }

  /**
   * Copy card prompt text to clipboard
   */
  async function copyPromptToClipboard(promptText: string): Promise<void> {
    if (!promptText) return
    try {
      await navigator.clipboard.writeText(promptText)
      copiedPrompt = true
      setTimeout(() => {
        copiedPrompt = false
      }, 2000)
    } catch (err) {
      console.error('Failed to copy prompt to clipboard:', err)
    }
  }

  /**
   * Get card image URL (with fallback)
   */
  function getCardImageUrl(card: GeneratedCard): string {
    return card.imageUrl || card.imageDataUrl || 'https://via.placeholder.com/400x600?text=Loading'
  }

  /**
   * Get status badge color
   */
  function getStatusColor(status: GeneratedCard['generationStatus']): string {
    switch (status) {
      case 'completed':
        return 'var(--color-secondary)'
      case 'failed':
        return '#f56565'
      case 'generating':
        return 'var(--color-primary)'
      default:
        return 'var(--color-text-muted)'
    }
  }

  /**
   * Get status badge text
   */
  function getStatusText(status: GeneratedCard['generationStatus']): string {
    switch (status) {
      case 'completed':
        return 'Complete'
      case 'failed':
        return 'Failed'
      case 'generating':
        return 'Generating...'
      case 'queued':
        return 'Queued'
      case 'retrying':
        return 'Retrying...'
      default:
        return 'Unknown'
    }
  }
</script>

<!-- ============================================================================
     TEMPLATE
     ============================================================================ -->

<div class="deck-gallery">
  <!-- Controls -->
  <div class="gallery-controls">
    <!-- Filter and Sort -->
    <div class="controls-row">
      <!-- Search Filter -->
      <div class="search-box">
        <input
          type="text"
          bind:value={filterTerm}
          onkeydown={e => e.key === 'Enter' && applyFilter()}
          placeholder="Search cards..."
          class="search-input"
          aria-label="Search cards by name or number"
        />
        {#if filterTerm}
          <button onclick={clearFilter} class="clear-button" aria-label="Clear search"> ✕ </button>
        {/if}
      </div>

      <!-- Status Filter -->
      <div class="filter-group">
        <label for="status-filter" class="filter-label">Status:</label>
        <select
          id="status-filter"
          bind:value={statusFilter}
          class="filter-select"
          aria-label="Filter by status"
        >
          <option value="all">All ({displayCards.length})</option>
          <option value="completed">Completed ({completedCount})</option>
          <option value="failed">Failed ({failedCount})</option>
        </select>
      </div>

      <!-- Sort Options -->
      <div class="filter-group">
        <label for="sort-by" class="filter-label">Sort by:</label>
        <select
          id="sort-by"
          bind:value={sortBy}
          onchange={() => changeSortBy(sortBy)}
          class="filter-select"
          aria-label="Sort cards"
        >
          <option value="number">Card Number</option>
          <option value="name">Card Name</option>
          <option value="generated-date">Generation Date</option>
        </select>
        <button
          onclick={toggleSortDirection}
          class="sort-direction-button"
          aria-label={sortAscending ? 'Sort descending' : 'Sort ascending'}
          title={sortAscending ? 'Sort descending' : 'Sort ascending'}
        >
          {sortAscending ? '↑' : '↓'}
        </button>
      </div>
    </div>

    <!-- Info Bar -->
    <div class="info-bar">
      <span class="info-text">
        Showing {visibleCount} of {displayCards.length} cards
      </span>
    </div>
  </div>

  <!-- Loading State -->
  {#if loading}
    <div class="loading-container">
      <div class="spinner" aria-label="Loading gallery"></div>
      <p>Loading gallery...</p>
    </div>
  {/if}

  <!-- Error State -->
  {#if error}
    <div class="error-container" role="alert">
      <p class="error-message">{error}</p>
      <button onclick={initializeDisplay} class="retry-button"> Retry </button>
    </div>
  {/if}

  <!-- Empty State -->
  {#if !loading && !error && displayCards.length === 0}
    <div class="empty-container">
      <div class="empty-icon">🎴</div>
      <p class="empty-message">No cards to display</p>
      <p class="empty-hint">Generate some cards to see them here!</p>
    </div>
  {/if}

  <!-- Card Grid -->
  {#if !loading && !error && visibleCount > 0}
    <div class="card-grid" role="grid" aria-label="Tarot card gallery">
      {#each visibleCards as displayCard (displayCard.card.id)}
        <div
          class="card-tile"
          role="gridcell"
          tabindex="0"
          onclick={() => openLightbox(displayCard.card.cardNumber)}
          onkeydown={e =>
            (e.key === 'Enter' || e.key === ' ') && openLightbox(displayCard.card.cardNumber)}
          aria-label={`${displayCard.card.cardName}, card ${displayCard.card.cardNumber}`}
        >
          <!-- Card Image -->
          <div class="card-image-container">
            {#if displayCard.loading}
              <div class="card-skeleton" aria-label="Loading card image">
                <div class="skeleton-shimmer"></div>
              </div>
            {:else}
              <img
                src={getCardImageUrl(displayCard.card)}
                alt={displayCard.card.cardName}
                class="card-image"
                loading="lazy"
              />
            {/if}

            <!-- Status Badge -->
            <div
              class="status-badge"
              style="background-color: {getStatusColor(displayCard.card.generationStatus)}"
            >
              {getStatusText(displayCard.card.generationStatus)}
            </div>
          </div>

          <!-- Card Info Overlay -->
          <div class="card-overlay">
            <div class="card-number">Card #{displayCard.card.cardNumber}</div>
            <div class="card-name">{displayCard.card.cardName}</div>
          </div>

          <!-- Hover Effect Border -->
          <div class="card-border"></div>
        </div>
      {/each}
    </div>
  {/if}

  <!-- No Results Message -->
  {#if !loading && !error && displayCards.length > 0 && visibleCount === 0}
    <div class="no-results">
      <p>No cards match your filters</p>
      <button onclick={clearFilter} class="clear-filters-button"> Clear Filters </button>
    </div>
  {/if}
</div>

<!-- ============================================================================
     LIGHTBOX MODAL
     ============================================================================ -->

{#if isLightboxOpen && lightboxCard}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div
    class="lightbox"
    role="dialog"
    aria-modal="true"
    aria-label="Card detail view"
    tabindex="-1"
    onclick={e => e.target === e.currentTarget && closeLightbox()}
  >
    <!-- Lightbox Content -->
    <div class="lightbox-content">
      <!-- Close Button -->
      <button onclick={closeLightbox} class="lightbox-close" aria-label="Close lightbox">
        ✕
      </button>

      <!-- Navigation: Previous -->
      {#if lightboxState?.canNavigateLeft}
        <button
          onclick={navigatePrevious}
          class="lightbox-nav lightbox-nav-prev"
          aria-label="Previous card"
        >
          ‹
        </button>
      {/if}

      <!-- Navigation: Next -->
      {#if lightboxState?.canNavigateRight}
        <button
          onclick={navigateNext}
          class="lightbox-nav lightbox-nav-next"
          aria-label="Next card"
        >
          ›
        </button>
      {/if}

      <!-- Card Display -->
      <div class="lightbox-card">
        <!-- Card Image Column -->
        <div class="lightbox-image-column">
          <div class="lightbox-image-container" class:zoomed={isHighResZoomed}>
            <img
              src={getCardImageUrl(lightboxCard.card)}
              alt={lightboxCard.card.cardName}
              class="lightbox-image"
            />
            {#if isHighResZoomed}
              <div class="high-res-badge">1024×1024 High-Res View</div>
            {/if}
          </div>

          <!-- Controls under image -->
          <div class="image-controls">
            <button
              type="button"
              class="high-res-toggle-btn"
              class:active={isHighResZoomed}
              onclick={() => (isHighResZoomed = !isHighResZoomed)}
              aria-label={isHighResZoomed ? 'Exit High-Res view' : 'Toggle High-Res view'}
            >
              {isHighResZoomed ? '🔍 Reset Scale' : '🔍 High-Res View'}
            </button>
          </div>
        </div>

        <!-- Card Details Column -->
        <div class="lightbox-details">
          <div class="lightbox-header">
            <div class="header-top-row">
              <span class="card-arcana-badge">Major Arcana</span>
              <div
                class="lightbox-status-badge"
                style="background-color: {getStatusColor(lightboxCard.card.generationStatus)}"
              >
                {getStatusText(lightboxCard.card.generationStatus)}
              </div>
            </div>
            <h2 class="lightbox-title">
              <span class="card-num-prefix">Card #{lightboxCard.card.cardNumber}</span>
              {lightboxCard.card.cardName}
            </h2>
          </div>

          {#if lightboxCard.card.error}
            <div class="lightbox-section error-section">
              <h3 class="section-title text-error">Generation Error</h3>
              <p class="error-detail">{lightboxCard.card.error}</p>
            </div>
          {/if}

          {#if lightboxState?.showPrompt}
            <div class="lightbox-section prompt-section">
              <div class="section-header">
                <h3 class="section-title">Generation Prompt</h3>
                <button
                  type="button"
                  class="copy-prompt-button"
                  onclick={() => copyPromptToClipboard(lightboxCard?.card.prompt ?? '')}
                  aria-label="Copy prompt to clipboard"
                >
                  {copiedPrompt ? '✓ Copied' : '📋 Copy Prompt'}
                </button>
              </div>
              <p class="prompt-text">{lightboxCard.card.prompt}</p>
            </div>
          {/if}

          {#if lightboxState?.showMetadata}
            <div class="lightbox-section metadata-section">
              <h3 class="section-title">Card Metadata</h3>
              <div class="metadata-grid">
                <div class="metadata-item">
                  <span class="metadata-label">Card ID</span>
                  <span class="metadata-value font-mono">{lightboxCard.card.id}</span>
                </div>
                {#if lightboxCard.card.generatedAt}
                  <div class="metadata-item">
                    <span class="metadata-label">Generated</span>
                    <span class="metadata-value">
                      {new Date(lightboxCard.card.generatedAt).toLocaleString()}
                    </span>
                  </div>
                {/if}
                <div class="metadata-item">
                  <span class="metadata-label">Resolution</span>
                  <span class="metadata-value">1024 × 1024 px (PNG)</span>
                </div>
                <div class="metadata-item">
                  <span class="metadata-label">Engine</span>
                  <span class="metadata-value">Grok 2 Image Alpha</span>
                </div>
                {#if lightboxCard.card.retryCount > 0}
                  <div class="metadata-item">
                    <span class="metadata-label">Retry Attempts</span>
                    <span class="metadata-value">{lightboxCard.card.retryCount}</span>
                  </div>
                {/if}
              </div>
            </div>
          {/if}

          <!-- Keyboard Navigation Hint -->
          <div class="keyboard-hint">
            <div class="hint-pills">
              <kbd class="key-pill">←</kbd>
              <kbd class="key-pill">→</kbd>
              <span>Navigate</span>
              <kbd class="key-pill">ESC</kbd>
              <span>Close</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- ============================================================================
     STYLES
     ============================================================================ -->

<style>
  /* ========================================================================
     GALLERY CONTAINER
     ======================================================================== */

  .deck-gallery {
    width: 100%;
    max-width: 1400px;
    margin: 0 auto;
  }

  /* ========================================================================
     CONTROLS
     ======================================================================== */

  .gallery-controls {
    margin-bottom: var(--spacing-xl);
    padding: var(--spacing-lg);
    background: var(--glass-bg);
    backdrop-filter: blur(10px);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-lg);
  }

  .controls-row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-md);
    align-items: center;
    margin-bottom: var(--spacing-md);
  }

  .search-box {
    position: relative;
    flex: 1 1 300px;
  }

  .search-input {
    width: 100%;
    padding: var(--spacing-sm) var(--spacing-md);
    padding-right: 2.5rem;
    background: var(--color-bg-secondary);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-md);
    color: var(--color-text);
    font-size: var(--text-base);
    transition: all var(--transition-fast);
  }

  .search-input:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px rgba(107, 70, 193, 0.1);
  }

  .clear-button {
    position: absolute;
    right: var(--spacing-sm);
    top: 50%;
    transform: translateY(-50%);
    padding: var(--spacing-xs);
    background: transparent;
    color: var(--color-text-muted);
    font-size: var(--text-lg);
    cursor: pointer;
    transition: color var(--transition-fast);
  }

  .clear-button:hover {
    color: var(--color-text);
  }

  .filter-group {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }

  .filter-label {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .filter-select {
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--color-bg-secondary);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-md);
    color: var(--color-text);
    font-size: var(--text-base);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .filter-select:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px rgba(107, 70, 193, 0.1);
  }

  .sort-direction-button {
    padding: var(--spacing-sm);
    background: var(--color-bg-secondary);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-md);
    color: var(--color-text);
    font-size: var(--text-lg);
    cursor: pointer;
    transition: all var(--transition-fast);
    min-width: 2.5rem;
  }

  .sort-direction-button:hover {
    background: var(--color-bg-tertiary);
    border-color: var(--color-primary);
  }

  .info-bar {
    padding-top: var(--spacing-md);
    border-top: 1px solid var(--glass-border);
  }

  .info-text {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
  }

  /* ========================================================================
     LOADING / ERROR / EMPTY STATES
     ======================================================================== */

  .loading-container,
  .error-container,
  .empty-container,
  .no-results {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-xxl);
    text-align: center;
  }

  .spinner {
    width: 48px;
    height: 48px;
    border: 4px solid var(--glass-border);
    border-top-color: var(--color-primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: var(--spacing-md);
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .error-container {
    background: rgba(245, 101, 101, 0.1);
    border: 1px solid rgba(245, 101, 101, 0.3);
    border-radius: var(--radius-lg);
  }

  .error-message {
    color: #f56565;
    margin-bottom: var(--spacing-md);
    font-size: var(--text-lg);
  }

  .retry-button,
  .clear-filters-button {
    padding: var(--spacing-sm) var(--spacing-lg);
    background: var(--color-primary);
    color: var(--color-text);
    border-radius: var(--radius-md);
    font-size: var(--text-base);
    font-weight: 600;
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .retry-button:hover,
  .clear-filters-button:hover {
    background: var(--color-primary-light);
    transform: translateY(-2px);
  }

  .empty-icon {
    font-size: 4rem;
    margin-bottom: var(--spacing-md);
    opacity: 0.5;
  }

  .empty-message {
    font-size: var(--text-xl);
    font-weight: 600;
    color: var(--color-text-secondary);
    margin-bottom: var(--spacing-sm);
  }

  .empty-hint {
    font-size: var(--text-base);
    color: var(--color-text-muted);
  }

  /* ========================================================================
     CARD GRID
     ======================================================================== */

  .card-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-lg);
  }

  @media (min-width: 640px) {
    .card-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  @media (min-width: 1024px) {
    .card-grid {
      grid-template-columns: repeat(4, 1fr);
    }
  }

  /* ========================================================================
     CARD TILE
     ======================================================================== */

  .card-tile {
    position: relative;
    aspect-ratio: 2/3;
    border-radius: var(--radius-lg);
    overflow: hidden;
    cursor: pointer;
    transition: all var(--transition-normal);
    outline: none;
  }

  .card-tile:hover,
  .card-tile:focus {
    transform: translateY(-8px) scale(1.02);
  }

  .card-tile:focus {
    box-shadow: 0 0 0 3px var(--color-primary);
  }

  .card-image-container {
    position: relative;
    width: 100%;
    height: 100%;
  }

  .card-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .card-skeleton {
    width: 100%;
    height: 100%;
    background: var(--color-bg-secondary);
    position: relative;
    overflow: hidden;
  }

  .skeleton-shimmer {
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.1), transparent);
    animation: shimmer 2s infinite;
  }

  @keyframes shimmer {
    to {
      left: 100%;
    }
  }

  .status-badge {
    position: absolute;
    top: var(--spacing-sm);
    right: var(--spacing-sm);
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--radius-sm);
    font-size: var(--text-xs);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text);
    backdrop-filter: blur(4px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }

  .card-overlay {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: var(--spacing-md);
    background: linear-gradient(to top, rgba(15, 14, 23, 0.95), rgba(15, 14, 23, 0.7), transparent);
    color: var(--color-text);
    transform: translateY(100%);
    transition: transform var(--transition-normal);
  }

  .card-tile:hover .card-overlay,
  .card-tile:focus .card-overlay {
    transform: translateY(0);
  }

  .card-number {
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--color-secondary);
    margin-bottom: var(--spacing-xs);
  }

  .card-name {
    font-family: var(--font-heading);
    font-size: var(--text-lg);
    font-weight: 600;
  }

  .card-border {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border: 2px solid transparent;
    border-radius: var(--radius-lg);
    pointer-events: none;
    transition: border-color var(--transition-fast);
  }

  .card-tile:hover .card-border,
  .card-tile:focus .card-border {
    border-color: var(--color-primary);
  }

  /* ========================================================================
     LIGHTBOX MODAL & ENHANCEMENTS
     ======================================================================== */

  .lightbox {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(10, 9, 15, 0.85);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    padding: var(--spacing-lg);
    animation: lightboxFadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    outline: none;
  }

  @keyframes lightboxFadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .lightbox-content {
    position: relative;
    width: 100%;
    max-width: 1200px;
    max-height: 90vh;
    animation: lightboxSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes lightboxSlideUp {
    from {
      opacity: 0;
      transform: translateY(24px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .lightbox-close {
    position: absolute;
    top: -12px;
    right: -12px;
    z-index: 20;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-bg-secondary);
    border: 1px solid var(--glass-border);
    border-radius: 50%;
    color: var(--color-text);
    font-size: var(--text-xl);
    line-height: 1;
    cursor: pointer;
    transition: all var(--transition-fast);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  }

  .lightbox-close:hover {
    background: var(--color-primary);
    transform: rotate(90deg) scale(1.1);
  }

  .lightbox-nav {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    padding: var(--spacing-lg) var(--spacing-md);
    background: var(--glass-bg);
    backdrop-filter: blur(12px);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-md);
    color: var(--color-text);
    font-size: var(--text-3xl);
    line-height: 1;
    cursor: pointer;
    transition: all var(--transition-fast);
    z-index: 15;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  }

  .lightbox-nav:hover {
    background: var(--color-primary);
    transform: translateY(-50%) scale(1.1);
  }

  .lightbox-nav-prev {
    left: -20px;
  }

  .lightbox-nav-next {
    right: -20px;
  }

  .lightbox-card {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--spacing-xl);
    background: var(--color-bg-secondary);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-lg);
    padding: var(--spacing-xl);
    max-height: 85vh;
    overflow-y: auto;
    box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5);
  }

  @media (min-width: 768px) {
    .lightbox-card {
      grid-template-columns: 1fr 1fr;
    }
  }

  .lightbox-image-column {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .lightbox-image-container {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .lightbox-image-container.zoomed {
    transform: scale(1.12);
    z-index: 5;
  }

  .lightbox-image {
    max-width: 100%;
    max-height: 65vh;
    object-fit: contain;
    border-radius: var(--radius-md);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
    transition: all 0.3s ease;
  }

  .high-res-badge {
    position: absolute;
    top: var(--spacing-sm);
    left: var(--spacing-sm);
    padding: var(--spacing-xs) var(--spacing-sm);
    background: rgba(107, 70, 193, 0.85);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: var(--radius-sm);
    color: #ffffff;
    font-size: var(--text-xs);
    font-weight: 600;
    letter-spacing: 0.05em;
  }

  .image-controls {
    margin-top: var(--spacing-md);
    display: flex;
    justify-content: center;
  }

  .high-res-toggle-btn {
    padding: var(--spacing-xs) var(--spacing-md);
    background: var(--color-bg-tertiary);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-md);
    color: var(--color-text);
    font-size: var(--text-xs);
    font-weight: 600;
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .high-res-toggle-btn:hover {
    background: var(--color-primary);
    border-color: var(--color-primary-light);
  }

  .high-res-toggle-btn.active {
    background: var(--color-primary);
    border-color: var(--color-secondary);
    color: #ffffff;
  }

  .lightbox-details {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
  }

  .lightbox-header {
    padding-bottom: var(--spacing-md);
    border-bottom: 1px solid var(--glass-border);
  }

  .header-top-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--spacing-xs);
  }

  .card-arcana-badge {
    font-size: var(--text-xs);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-secondary);
  }

  .lightbox-status-badge {
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--radius-sm);
    font-size: var(--text-xs);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #ffffff;
  }

  .lightbox-title {
    font-family: var(--font-heading);
    font-size: var(--text-2xl);
    color: var(--color-text);
    margin: 0;
  }

  .card-num-prefix {
    color: var(--color-text-secondary);
    font-size: var(--text-lg);
    font-weight: normal;
    margin-right: var(--spacing-xs);
  }

  .lightbox-section {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .error-section {
    padding: var(--spacing-sm);
    background: rgba(245, 101, 101, 0.1);
    border: 1px solid rgba(245, 101, 101, 0.3);
    border-radius: var(--radius-md);
  }

  .text-error {
    color: #f56565 !important;
  }

  .error-detail {
    font-size: var(--text-sm);
    color: #feb2b2;
  }

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .section-title {
    font-family: var(--font-heading);
    font-size: var(--text-base);
    color: var(--color-secondary);
    margin: 0;
  }

  .copy-prompt-button {
    padding: 2px var(--spacing-sm);
    background: var(--color-bg-tertiary);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-sm);
    color: var(--color-text-secondary);
    font-size: var(--text-xs);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .copy-prompt-button:hover {
    color: var(--color-text);
    border-color: var(--color-primary);
  }

  .prompt-text {
    line-height: 1.6;
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
    background: var(--color-bg-tertiary);
    padding: var(--spacing-sm) var(--spacing-md);
    border-radius: var(--radius-md);
    border: 1px solid var(--glass-border);
  }

  .metadata-grid {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .metadata-item {
    display: flex;
    justify-content: space-between;
    padding: var(--spacing-xs) var(--spacing-sm);
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
    font-size: var(--text-xs);
  }

  .metadata-label {
    font-weight: 600;
    color: var(--color-text-secondary);
  }

  .metadata-value {
    color: var(--color-text);
  }

  .font-mono {
    font-family: monospace;
  }

  .keyboard-hint {
    margin-top: auto;
    padding: var(--spacing-sm);
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-md);
    display: flex;
    justify-content: center;
  }

  .hint-pills {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }

  .key-pill {
    display: inline-block;
    padding: 2px 6px;
    background: var(--color-bg-secondary);
    border: 1px solid var(--glass-border);
    border-radius: 4px;
    font-family: monospace;
    font-size: var(--text-xs);
    font-weight: bold;
    color: var(--color-secondary);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  }

  /* ========================================================================
     RESPONSIVE
     ======================================================================== */

  @media (max-width: 640px) {
    .controls-row {
      flex-direction: column;
      align-items: stretch;
    }

    .filter-group {
      flex-direction: column;
      align-items: stretch;
    }

    .lightbox {
      padding: var(--spacing-md);
    }

    .lightbox-card {
      padding: var(--spacing-md);
    }

    .lightbox-nav {
      padding: var(--spacing-md) var(--spacing-sm);
      font-size: var(--text-2xl);
    }

    .lightbox-nav-prev {
      left: -10px;
    }

    .lightbox-nav-next {
      right: -10px;
    }
  }
</style>
