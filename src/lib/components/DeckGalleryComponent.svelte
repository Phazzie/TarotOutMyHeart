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
  import { deckDisplayService, downloadService } from '$services/factory'
  import { GROK_IMAGE_MODEL } from '$contracts/ImageGeneration'
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
  function getCardImageUrl(card: GeneratedCard): string | null {
    return card.imageUrl || card.imageDataUrl || null
  }

  /** Download the card shown in the inspection view as a single PNG. */
  let takingCard = $state(false)
  let takeError = $state<string | null>(null)
  async function takeCard(card: GeneratedCard): Promise<void> {
    takingCard = true
    takeError = null
    try {
      const response = await downloadService.downloadCard({ card })
      if (!response.success) takeError = response.error?.message ?? 'The copy could not be made.'
    } catch {
      takeError = 'The copy could not be made.'
    } finally {
      takingCard = false
    }
  }

  /**
   * Get status badge color
   */
  function getStatusColor(status: GeneratedCard['generationStatus']): string {
    switch (status) {
      case 'completed':
        return 'var(--stamp-blue)'
      case 'failed':
        return 'var(--stamp-red)'
      case 'generating':
        return 'var(--ink)'
      default:
        return 'var(--ink-soft)'
    }
  }

  /**
   * Get status badge text
   */
  function getStatusText(status: GeneratedCard['generationStatus']): string {
    switch (status) {
      case 'completed':
        return 'Issued'
      case 'failed':
        return 'Returned'
      case 'generating':
        return 'Illustrating…'
      case 'queued':
        return 'Queued'
      case 'retrying':
        return 'Resubmitted…'
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
          placeholder="Look up a card by name or number"
          class="search-input"
          aria-label="Search cards by name or number"
        />
        {#if filterTerm}
          <button onclick={clearFilter} class="clear-button" aria-label="Clear search"> ✕ </button>
        {/if}
      </div>

      <!-- Status Filter -->
      <div class="filter-group">
        <label for="status-filter" class="filter-label">Status</label>
        <select
          id="status-filter"
          bind:value={statusFilter}
          class="filter-select"
          aria-label="Filter by status"
        >
          <option value="all">All ({displayCards.length})</option>
          <option value="completed">Issued ({completedCount})</option>
          <option value="failed">Returned ({failedCount})</option>
        </select>
      </div>

      <!-- Sort Options -->
      <div class="filter-group">
        <label for="sort-by" class="filter-label">File by</label>
        <select
          id="sort-by"
          bind:value={sortBy}
          onchange={() => changeSortBy(sortBy)}
          class="filter-select"
          aria-label="Sort cards"
        >
          <option value="number">Case number</option>
          <option value="name">Name</option>
          <option value="generated-date">Date issued</option>
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
        {visibleCount} of {displayCards.length} on file
      </span>
    </div>
  </div>

  <!-- Loading State -->
  {#if loading}
    <div class="loading-container">
      <div class="spinner" aria-label="Loading gallery"></div>
      <p>Pulling your file…</p>
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
      <p class="empty-message">No cards on file</p>
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
            {:else if getCardImageUrl(displayCard.card)}
              <img
                src={getCardImageUrl(displayCard.card)}
                alt={displayCard.card.cardName}
                class="card-image"
                loading="lazy"
              />
            {:else}
              <div class="card-missing">Returned unillustrated</div>
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
            <div class="card-number">MA-{String(displayCard.card.cardNumber).padStart(2, '0')}</div>
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
      <p>No cards on file match that lookup.</p>
      <button onclick={clearFilter} class="clear-filters-button">Clear lookup</button>
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
            {#if getCardImageUrl(lightboxCard.card)}
              <img
                src={getCardImageUrl(lightboxCard.card)}
                alt={lightboxCard.card.cardName}
                class="lightbox-image"
              />
            {:else}
              <div class="card-missing large">Returned unillustrated</div>
            {/if}
            {#if isHighResZoomed}
              <div class="high-res-badge">Full size</div>
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
              {isHighResZoomed ? 'Back to normal size' : 'Inspect at full size'}
            </button>
            <button
              type="button"
              class="high-res-toggle-btn take"
              disabled={takingCard || !getCardImageUrl(lightboxCard.card)}
              onclick={() => lightboxCard && takeCard(lightboxCard.card)}
              aria-label="Download {lightboxCard.card.cardName}"
            >
              {takingCard ? 'Copying…' : 'Take this card (.png)'}
            </button>
          </div>
          {#if takeError}
            <p class="take-error" role="alert">{takeError}</p>
          {/if}
        </div>

        <!-- Card Details Column -->
        <div class="lightbox-details">
          <div class="lightbox-header">
            <div class="header-top-row">
              <span class="card-arcana-badge">Certificate of Arcana</span>
              <div
                class="lightbox-status-badge"
                style="background-color: {getStatusColor(lightboxCard.card.generationStatus)}"
              >
                {getStatusText(lightboxCard.card.generationStatus)}
              </div>
            </div>
            <h2 class="lightbox-title">
              <span class="card-num-prefix"
                >Case MA-{String(lightboxCard.card.cardNumber).padStart(2, '0')}</span
              >
              {lightboxCard.card.cardName}
            </h2>
          </div>

          {#if lightboxCard.card.error}
            <div class="lightbox-section error-section">
              <h3 class="section-title text-error">Reason returned</h3>
              <p class="error-detail">{lightboxCard.card.error}</p>
            </div>
          {/if}

          {#if lightboxState?.showPrompt}
            <div class="lightbox-section prompt-section">
              <div class="section-header">
                <h3 class="section-title">Case file</h3>
                <button
                  type="button"
                  class="copy-prompt-button"
                  onclick={() => copyPromptToClipboard(lightboxCard?.card.prompt ?? '')}
                  aria-label="Copy prompt to clipboard"
                >
                  {copiedPrompt ? 'Copied' : 'Copy text'}
                </button>
              </div>
              <p class="prompt-text">{lightboxCard.card.prompt}</p>
            </div>
          {/if}

          {#if lightboxState?.showMetadata}
            <div class="lightbox-section metadata-section">
              <h3 class="section-title">Record</h3>
              <div class="metadata-grid">
                <div class="metadata-item">
                  <span class="metadata-label">Record no.</span>
                  <span class="metadata-value font-mono">{lightboxCard.card.id}</span>
                </div>
                {#if lightboxCard.card.generatedAt}
                  <div class="metadata-item">
                    <span class="metadata-label">Issued</span>
                    <span class="metadata-value">
                      {new Date(lightboxCard.card.generatedAt).toLocaleString()}
                    </span>
                  </div>
                {/if}
                <div class="metadata-item">
                  <span class="metadata-label">Illustrator</span>
                  <span class="metadata-value">{GROK_IMAGE_MODEL}</span>
                </div>
                {#if lightboxCard.card.retryCount > 0}
                  <div class="metadata-item">
                    <span class="metadata-label">Resubmissions</span>
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
  .deck-gallery {
    width: 100%;
  }

  /* ---------- Lookup counter ---------- */
  .gallery-controls {
    margin-bottom: 1.5rem;
    padding: 0.9rem 1rem;
    background: var(--manila);
    border: 2px solid var(--ink);
    box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.35);
  }

  .controls-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem 1.25rem;
    align-items: end;
  }

  .search-box {
    position: relative;
    flex: 1 1 240px;
  }

  .search-input,
  .filter-select {
    width: 100%;
    min-height: 44px;
    padding: 0.5rem 2.2rem 0.5rem 0.7rem;
    font-family: var(--font-typed);
    font-size: 1rem;
    color: var(--ink);
    background: var(--paper);
    border: 2px solid var(--ink);
    border-radius: 0;
  }

  .filter-select {
    padding-right: 0.7rem;
    width: auto;
  }

  .search-input:focus,
  .filter-select:focus {
    outline: 3px solid var(--stamp-blue);
    outline-offset: 1px;
  }

  .clear-button {
    position: absolute;
    right: 0.3rem;
    top: 50%;
    transform: translateY(-50%);
    width: 34px;
    height: 34px;
    border: none;
    background: transparent;
    color: var(--ink);
    font-size: 1rem;
    cursor: pointer;
  }

  .filter-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .filter-label {
    font-family: var(--font-heading);
    font-size: 0.75rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--ink);
  }

  .sort-direction-button {
    min-width: 44px;
    min-height: 44px;
    border: 2px solid var(--ink);
    background: var(--paper);
    color: var(--ink);
    font-size: 1.1rem;
    cursor: pointer;
  }

  .info-bar {
    margin-top: 0.6rem;
    font-size: 0.8rem;
    color: var(--ink-soft);
  }

  /* ---------- States ---------- */
  .loading-container,
  .error-container,
  .empty-container,
  .no-results {
    padding: 2.5rem 1rem;
    text-align: center;
    background: var(--paper);
    border: 2px dashed var(--ink);
    color: var(--ink);
  }

  .spinner {
    width: 40px;
    height: 40px;
    margin: 0 auto 0.75rem;
    border: 4px solid var(--paper-rule);
    border-top-color: var(--stamp-red);
    border-radius: 50%;
    animation: spin 0.9s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .error-message {
    color: var(--stamp-red);
    margin-bottom: 0.75rem;
  }

  .empty-message {
    font-family: var(--font-heading);
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .retry-button,
  .clear-filters-button {
    margin-top: 0.5rem;
    min-height: 44px;
    padding: 0.4rem 1rem;
    font-family: var(--font-heading);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    background: var(--paper);
    color: var(--ink);
    border: 2px solid var(--ink);
    box-shadow: 3px 3px 0 var(--ink);
    cursor: pointer;
  }

  /* ---------- Pigeonholes ---------- */
  .card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 1rem;
    padding: 1rem;
    background: var(--wall-dark);
    border: 6px solid #5b4426;
    box-shadow:
      inset 0 0 0 2px #3c2c17,
      6px 6px 0 rgba(0, 0, 0, 0.35);
  }

  .card-tile {
    position: relative;
    display: flex;
    flex-direction: column;
    background: var(--paper);
    padding: 0.4rem 0.4rem 0;
    border: 1px solid var(--ink);
    cursor: pointer;
    transition:
      transform 0.15s ease-out,
      box-shadow 0.15s ease-out;
    box-shadow: 0 3px 0 rgba(0, 0, 0, 0.4);
  }

  .card-tile:nth-child(3n + 1) {
    transform: rotate(-0.6deg);
  }

  .card-tile:nth-child(3n + 2) {
    transform: rotate(0.5deg);
  }

  .card-tile:hover,
  .card-tile:focus-visible {
    transform: translateY(-4px) rotate(0deg);
    box-shadow: 0 10px 0 rgba(0, 0, 0, 0.35);
    outline: none;
  }

  .card-tile:focus-visible {
    outline: 3px solid var(--carbon-yellow);
    outline-offset: 2px;
  }

  .card-image-container {
    position: relative;
    aspect-ratio: 2 / 3;
    overflow: hidden;
    background: var(--paper-rule);
  }

  .card-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .card-missing {
    display: grid;
    place-items: center;
    height: 100%;
    padding: 1rem;
    text-align: center;
    font-family: var(--font-heading);
    font-size: 0.8rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--stamp-red);
    background: repeating-linear-gradient(
      45deg,
      var(--paper),
      var(--paper) 10px,
      var(--carbon-pink) 10px,
      var(--carbon-pink) 20px
    );
  }

  .card-missing.large {
    min-height: 420px;
    font-size: 1.2rem;
  }

  .card-skeleton {
    position: absolute;
    inset: 0;
    background: var(--paper-rule);
    overflow: hidden;
  }

  .skeleton-shimmer {
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.6), transparent);
    animation: shimmer 1.4s infinite;
  }

  @keyframes shimmer {
    from {
      transform: translateX(-100%);
    }
    to {
      transform: translateX(100%);
    }
  }

  .status-badge {
    position: absolute;
    top: 0.5rem;
    right: 0.4rem;
    padding: 0.1rem 0.45rem;
    font-family: var(--font-heading);
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--paper);
    transform: rotate(6deg);
    box-shadow: 0 0 0 2px var(--paper);
  }

  .card-overlay {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 0.4rem;
    padding: 0.4rem 0.15rem 0.45rem;
    border-top: 1px dashed var(--ink-soft);
    margin-top: 0.4rem;
  }

  .card-number {
    font-family: var(--font-led);
    font-size: 1rem;
    color: var(--stamp-red);
    flex-shrink: 0;
  }

  .card-name {
    font-family: var(--font-typed);
    font-size: 0.8rem;
    text-align: right;
    color: var(--ink);
    line-height: 1.15;
  }

  .card-border {
    display: none;
  }

  /* ---------- Inspection desk (lightbox) ---------- */
  .lightbox {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: grid;
    place-items: center;
    padding: 1rem;
    background: rgba(12, 18, 14, 0.88);
    animation: fadeIn 0.15s ease-out;
    overflow-y: auto;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
  }

  .lightbox-content {
    position: relative;
    width: min(1100px, 100%);
    max-height: calc(100dvh - 2rem);
    overflow-y: auto;
    background: var(--paper);
    border: 2px solid var(--ink);
    box-shadow: 10px 10px 0 rgba(0, 0, 0, 0.45);
  }

  .lightbox-close {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    z-index: 3;
    width: 44px;
    height: 44px;
    border: 2px solid var(--ink);
    background: var(--paper);
    color: var(--ink);
    font-size: 1.1rem;
    cursor: pointer;
  }

  .lightbox-nav {
    position: absolute;
    top: 50%;
    z-index: 3;
    width: 44px;
    height: 64px;
    transform: translateY(-50%);
    border: 2px solid var(--ink);
    background: var(--carbon-yellow);
    color: var(--ink);
    font-size: 2rem;
    line-height: 1;
    cursor: pointer;
  }

  .lightbox-nav-prev {
    left: 0.5rem;
  }

  .lightbox-nav-next {
    right: 0.5rem;
  }

  .lightbox-card {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
  }

  .lightbox-image-column {
    padding: 1.25rem 3.5rem;
    background: var(--wall-dark);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
  }

  .lightbox-image-container {
    position: relative;
    width: min(380px, 100%);
    padding: 0.5rem;
    background: var(--paper);
    box-shadow: 0 6px 0 rgba(0, 0, 0, 0.4);
    transition: width 0.2s ease-out;
  }

  .lightbox-image-container.zoomed {
    width: min(760px, 100%);
  }

  .lightbox-image {
    display: block;
    width: 100%;
    height: auto;
  }

  .high-res-badge {
    position: absolute;
    top: 0.9rem;
    left: 0.9rem;
    padding: 0.1rem 0.5rem;
    font-family: var(--font-heading);
    font-size: 0.7rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    background: var(--ink);
    color: var(--paper);
  }

  .image-controls {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.6rem;
  }

  .high-res-toggle-btn {
    min-height: 44px;
    padding: 0.4rem 0.9rem;
    font-family: var(--font-heading);
    font-size: 0.8rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--paper);
    background: transparent;
    border: 2px solid var(--paper);
    cursor: pointer;
  }

  .high-res-toggle-btn.active {
    background: var(--paper);
    color: var(--ink);
  }

  .high-res-toggle-btn.take {
    background: var(--carbon-yellow);
    color: var(--ink);
    border-color: var(--carbon-yellow);
  }

  .high-res-toggle-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .take-error {
    color: var(--carbon-pink);
    font-size: 0.85rem;
    text-align: center;
  }

  .lightbox-details {
    padding: 1.25rem 1.25rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    color: var(--ink);
  }

  .lightbox-header {
    border-bottom: 3px double var(--ink);
    padding-bottom: 0.6rem;
    padding-right: 3rem;
  }

  .header-top-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.4rem;
  }

  .card-arcana-badge {
    font-family: var(--font-heading);
    font-size: 0.7rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--ink-soft);
  }

  .lightbox-status-badge {
    padding: 0.05rem 0.5rem;
    font-family: var(--font-heading);
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--paper);
    transform: rotate(-3deg);
  }

  .lightbox-title {
    font-family: var(--font-tarot);
    font-size: clamp(1.4rem, 3vw, 2rem);
    line-height: 1.1;
    display: flex;
    flex-direction: column;
  }

  .card-num-prefix {
    font-family: var(--font-led);
    font-size: 1.1rem;
    color: var(--stamp-red);
    letter-spacing: 0.05em;
  }

  .lightbox-section {
    padding: 0.75rem 0.9rem;
    border: 1px solid var(--ink);
    background:
      repeating-linear-gradient(
        transparent,
        transparent 23px,
        var(--paper-rule) 23px,
        var(--paper-rule) 24px
      ),
      var(--paper);
  }

  .error-section {
    background: var(--carbon-pink);
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.4rem;
  }

  .section-title {
    font-family: var(--font-heading);
    font-size: 0.8rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    margin-bottom: 0.4rem;
  }

  .section-header .section-title {
    margin-bottom: 0;
  }

  .text-error {
    color: var(--stamp-red);
  }

  .error-detail {
    font-size: 0.9rem;
  }

  .copy-prompt-button {
    min-height: 36px;
    padding: 0.2rem 0.7rem;
    font-family: var(--font-heading);
    font-size: 0.7rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    background: var(--paper);
    color: var(--ink);
    border: 1px solid var(--ink);
    cursor: pointer;
  }

  .prompt-text {
    font-family: var(--font-typed);
    font-size: 0.9rem;
    line-height: 24px;
    max-height: 12rem;
    overflow-y: auto;
    white-space: pre-wrap;
  }

  .metadata-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 0.5rem 1rem;
  }

  .metadata-item {
    display: flex;
    flex-direction: column;
  }

  .metadata-label {
    font-family: var(--font-heading);
    font-size: 0.65rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--ink-soft);
  }

  .metadata-value {
    font-family: var(--font-typed);
    font-size: 0.85rem;
    word-break: break-all;
  }

  .keyboard-hint {
    font-size: 0.75rem;
    color: var(--ink-soft);
  }

  .hint-pills {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.35rem;
  }

  .key-pill {
    padding: 0 0.4rem;
    font-family: var(--font-body);
    border: 1px solid var(--ink-soft);
    background: var(--paper);
  }

  @media (min-width: 900px) {
    .lightbox-card {
      grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
    }

    .lightbox-image-column {
      padding: 1.5rem 3.75rem;
      justify-content: center;
    }

    .lightbox-image-container.zoomed {
      width: 100%;
    }

    /* Leave a gutter so the next-card arrow never sits on the case file. */
    .lightbox-details {
      padding-right: 4rem;
    }
  }

  @media (max-width: 640px) {
    .card-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.75rem;
      padding: 0.6rem;
      border-width: 4px;
    }

    .filter-group {
      flex: 1 1 100%;
    }

    .filter-select {
      flex: 1;
    }

    .lightbox {
      padding: 0;
    }

    .lightbox-content {
      max-height: 100dvh;
      height: 100dvh;
      box-shadow: none;
      border: none;
    }

    .lightbox-image-column {
      padding: 3.5rem 3.25rem 1rem;
    }

    .keyboard-hint {
      display: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .card-tile,
    .lightbox,
    .skeleton-shimmer,
    .spinner {
      animation: none;
      transition: none;
    }
  }
</style>
