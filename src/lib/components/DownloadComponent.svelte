<!--
  @fileoverview Download Component - Download generated tarot cards
  @purpose Provide UI for downloading individual cards or complete deck as ZIP
  @dataFlow appStore.generatedCards → DownloadService → Browser download
  @boundary Seam #7: DownloadSeam - UI layer for card downloads
  @requirement PRD Sprint 2 Component 7: Download functionality
  @updated 2025-11-15

  This component allows users to:
  - Download complete deck as ZIP file (all 22 cards)
  - Download individual cards as PNG files
  - Customize deck name for ZIP download
  - Include/exclude metadata JSON in ZIP
  - Track download progress in real-time
  - Handle download errors with retry capability

  @example
  ```svelte
  <DownloadComponent />
  ```
-->

<script lang="ts">
  import { appStore } from '$lib/stores/appStore.svelte'
  import { downloadService as downloadServiceFactory } from '$services/factory'
  import type {
    DownloadDeckInput,
    DownloadCardInput,
    DownloadProgress,
    GeneratedCard,
  } from '$contracts/index'

  // ============================================================================
  // SERVICE INITIALIZATION
  // ============================================================================

  /**
   * Download service instance
   * Uses mock for development, will switch to real service in production
   */
  const downloadService = downloadServiceFactory

  interface Props {
    /** Show the per-card download grid. The gallery hides it because its lightbox has one. */
    showIndividual?: boolean
  }

  const { showIndividual = true }: Props = $props()

  // ============================================================================
  // COMPONENT STATE (Svelte 5 $state runes)
  // ============================================================================

  /**
   * Custom deck name for ZIP file
   * Defaults to 'tarot-deck' if not provided
   */
  let deckName = $state<string>('tarot-deck')

  /**
   * Whether to include metadata.json in ZIP download
   * Metadata includes: generation date, style inputs, card count, version
   */
  let includeMetadata = $state<boolean>(true)

  /**
   * Whether a download operation is currently in progress
   * Used to disable buttons and show loading state
   */
  let isDownloading = $state<boolean>(false)

  /**
   * Current download progress tracking
   * Updated via onProgress callback from download service
   * Null when not downloading
   */
  let downloadProgress = $state<DownloadProgress | null>(null)

  /**
   * Success message after successful download
   * Shows filename and file size
   * Null when no recent download
   */
  let successMessage = $state<string | null>(null)

  /**
   * Error message if download fails
   * Shows user-friendly error with retry option
   * Null when no error
   */
  let errorMessage = $state<string | null>(null)

  /**
   * Which individual card is currently being downloaded
   * Tracks card number (0-21) to show loading state on specific card button
   * Null when no individual download in progress
   */
  let downloadingCardNumber = $state<number | null>(null)

  // ============================================================================
  // COMPUTED VALUES (Svelte 5 $derived)
  // ============================================================================

  /**
   * Whether the download deck button should be enabled
   * Requirements:
   * - Must have all 22 cards generated
   * - Must not be currently downloading
   * - Cards must have completed generation status
   */
  const canDownloadDeck = $derived(
    appStore.hasAllCards && !isDownloading && appStore.generatedCards.length === 22
  )

  /**
   * Progress percentage for display
   * 0-100 based on download progress
   */
  const progressPercent = $derived(downloadProgress?.progress ?? 0)

  /**
   * Current download status message
   * Shows what step is currently happening
   */
  const progressStatus = $derived(downloadProgress?.status ?? '')

  // ============================================================================
  // DOWNLOAD HANDLERS
  // ============================================================================

  /**
   * Download complete deck as ZIP file
   *
   * Workflow:
   * 1. Validate all cards are available
   * 2. Set loading state and clear previous messages
   * 3. Call download service with progress callback
   * 4. Update UI during progress
   * 5. Show success or error message
   * 6. Reset loading state
   *
   * @example
   * ```typescript
   * await downloadDeck()
   * ```
   */
  async function downloadDeck(): Promise<void> {
    // Clear previous messages
    successMessage = null
    errorMessage = null

    // Validate we have cards and style inputs
    if (!appStore.styleInputs) {
      errorMessage = 'Style inputs not available. Please regenerate your deck.'
      return
    }

    if (appStore.generatedCards.length !== 22) {
      errorMessage = 'Incomplete deck. Please ensure all 22 cards are generated.'
      return
    }

    // Set loading state
    isDownloading = true
    appStore.setLoading('downloadingDeck', true)

    try {
      // Prepare download input
      const input: DownloadDeckInput = {
        generatedCards: appStore.generatedCards,
        styleInputs: appStore.styleInputs,
        deckName: deckName || 'tarot-deck',
        format: 'zip',
        includeMetadata,
        onProgress: (progress: DownloadProgress) => {
          downloadProgress = progress
        },
      }

      // Call download service
      const response = await downloadService.downloadDeck(input)

      if (response.success && response.data) {
        // Show success message
        const fileSizeMB = (response.data.fileSize / 1024 / 1024).toFixed(2)
        successMessage = `Download complete! ${response.data.filename} (${fileSizeMB} MB)`

        // Clear progress after short delay
        setTimeout(() => {
          downloadProgress = null
        }, 2000)
      } else {
        // Show error message
        errorMessage = response.error?.message || 'Download failed. Please try again.'
      }
    } catch (error) {
      // Handle unexpected errors
      console.error('Download error:', error)
      errorMessage = 'An unexpected error occurred. Please try again.'
    } finally {
      // Reset loading state
      isDownloading = false
      appStore.setLoading('downloadingDeck', false)
    }
  }

  /**
   * Download a single card image
   *
   * Triggers browser download for one card as PNG file.
   * Filename follows pattern: {number:02d}-{name}.png (e.g., "00-the-fool.png")
   *
   * @param card - The card to download
   *
   * @example
   * ```typescript
   * await downloadCard(cards[0])
   * ```
   */
  async function downloadCard(card: GeneratedCard): Promise<void> {
    // Set loading state for this specific card
    downloadingCardNumber = card.cardNumber

    try {
      // Prepare download input
      const input: DownloadCardInput = {
        card,
        // filename is optional - service will generate default
      }

      // Call download service
      const response = await downloadService.downloadCard(input)

      if (response.success && response.data) {
        // Show brief success message
        const fileSizeKB = (response.data.fileSize / 1024).toFixed(0)
        successMessage = `Downloaded ${response.data.filename} (${fileSizeKB} KB)`

        // Clear success message after 3 seconds
        setTimeout(() => {
          successMessage = null
        }, 3000)
      } else {
        // Show error message
        errorMessage = response.error?.message || 'Download failed. Please try again.'
      }
    } catch (error) {
      console.error('Card download error:', error)
      errorMessage = 'Failed to download card. Please try again.'
    } finally {
      // Reset card loading state
      downloadingCardNumber = null
    }
  }

  /**
   * Dismiss error message
   * Allows user to clear error and retry
   */
  function clearError(): void {
    errorMessage = null
  }

  /**
   * Dismiss success message
   * Allows user to clear success notification
   */
  function clearSuccess(): void {
    successMessage = null
  }
</script>

<!-- ============================================================================
     TEMPLATE
     ============================================================================ -->

<div class="download-component">
  <!-- Download Options Panel -->
  <div class="options-panel">
    <div class="slip-head">
      <span class="slip-code">Form BF-9</span>
      <h3 class="panel-title">Request for certified copies</h3>
    </div>

    <!-- Deck Name Input -->
    <div class="form-group">
      <label for="deck-name" class="form-label">
        Name on the folder
        <span class="label-hint">(becomes the .zip filename)</span>
      </label>
      <input
        id="deck-name"
        type="text"
        class="form-input"
        bind:value={deckName}
        placeholder="my-tarot-deck"
        disabled={isDownloading}
        aria-label="Deck name for ZIP file"
      />
    </div>

    <!-- Include Metadata Checkbox -->
    <div class="form-group">
      <label class="checkbox-label">
        <input
          type="checkbox"
          bind:checked={includeMetadata}
          disabled={isDownloading}
          aria-label="Include metadata JSON file in ZIP"
        />
        <span>Attach the paperwork (metadata.json)</span>
        <span class="label-hint">: your declaration, the issue date and the card list</span>
      </label>
    </div>
  </div>

  <!-- Download All Button -->
  <div class="download-all-section">
    <button
      class="download-all-button"
      onclick={downloadDeck}
      disabled={!canDownloadDeck}
      aria-label="Download all 22 cards as ZIP file"
      aria-busy={isDownloading}
    >
      <span class="button-text">
        {#if isDownloading}
          Photocopying…
        {:else}
          Collect all 22 certified copies (.zip)
        {/if}
      </span>
    </button>

    {#if !canDownloadDeck && !isDownloading}
      <p class="download-hint">
        {#if appStore.generatedCards.length < 22}
          The full set of 22 must be issued before copies can be collected.
        {:else if !appStore.hasAllCards}
          Some cards were returned. Resubmit them at Window 2 first.
        {/if}
      </p>
    {/if}
  </div>

  <!-- Progress Indicator -->
  {#if downloadProgress}
    <div class="progress-section" role="status" aria-live="polite">
      <div class="progress-bar" aria-label="Download progress">
        <div
          class="progress-fill"
          style="width: {progressPercent}%"
          aria-valuenow={progressPercent}
          aria-valuemin="0"
          aria-valuemax="100"
        ></div>
      </div>
      <p class="progress-text">{progressStatus}</p>
      <p class="progress-percent">{progressPercent}%</p>
    </div>
  {/if}

  <!-- Success Message -->
  {#if successMessage}
    <div class="message success-message" role="alert">
      <span class="message-icon" aria-hidden="true">✓</span>
      <span class="message-text">{successMessage}</span>
      <button class="message-close" onclick={clearSuccess} aria-label="Dismiss success message">
        ×
      </button>
    </div>
  {/if}

  <!-- Error Message -->
  {#if errorMessage}
    <div class="message error-message" role="alert">
      <span class="message-icon" aria-hidden="true">⚠</span>
      <span class="message-text">{errorMessage}</span>
      <button class="message-close" onclick={clearError} aria-label="Dismiss error message">
        ×
      </button>
    </div>
  {/if}

  <!-- Individual Card Downloads -->
  {#if showIndividual && appStore.generatedCards.length > 0}
    <div class="individual-downloads">
      <h3 class="section-title">Single copies</h3>
      <div class="card-grid">
        {#each appStore.generatedCards as card (card.cardNumber)}
          <div class="card-item">
            <!-- Card Preview (if image available) -->
            {#if card.imageUrl}
              <div class="card-image-container">
                <img src={card.imageUrl} alt={card.cardName} class="card-image" loading="lazy" />
              </div>
            {:else}
              <div class="card-placeholder">
                <span class="card-number">{card.cardNumber}</span>
              </div>
            {/if}

            <!-- Card Info -->
            <div class="card-info">
              <h4 class="card-name">{card.cardName}</h4>
              <p class="card-number-text">MA-{String(card.cardNumber).padStart(2, '0')}</p>
            </div>

            <!-- Download Button -->
            <button
              class="card-download-button"
              onclick={() => downloadCard(card)}
              disabled={!card.imageUrl || downloadingCardNumber === card.cardNumber}
              aria-label="Download {card.cardName}"
            >
              {#if downloadingCardNumber === card.cardNumber}
                Copying…
              {:else}
                Take a copy
              {/if}
            </button>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .download-component {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    color: var(--ink);
  }

  .options-panel {
    padding: 1rem 1.1rem;
    background: var(--carbon-yellow);
    border: 2px solid var(--ink);
    box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.35);
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .slip-head {
    border-bottom: 2px solid var(--ink);
    padding-bottom: 0.4rem;
  }

  .slip-code {
    font-family: var(--font-heading);
    font-size: 0.7rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .panel-title {
    font-family: var(--font-heading);
    font-size: 1.1rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .form-label {
    font-family: var(--font-heading);
    font-size: 0.75rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .label-hint {
    font-family: var(--font-body);
    text-transform: none;
    letter-spacing: 0;
    font-size: 0.8rem;
    color: var(--ink-soft);
  }

  .form-input {
    min-height: 44px;
    padding: 0.4rem 0.6rem;
    font-family: var(--font-typed);
    font-size: 1rem;
    color: var(--ink);
    background: transparent;
    border: none;
    border-bottom: 2px solid var(--ink);
  }

  .form-input:focus {
    outline: 3px solid var(--stamp-blue);
    outline-offset: 2px;
  }

  .checkbox-label {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.9rem;
    cursor: pointer;
  }

  .checkbox-label input {
    width: 20px;
    height: 20px;
    accent-color: var(--ink);
  }

  .download-all-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .download-all-button {
    min-height: 52px;
    padding: 0.6rem 1rem;
    font-family: var(--font-heading);
    font-size: 1rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--paper);
    background: var(--stamp-blue);
    border: 2px solid var(--ink);
    box-shadow: 4px 4px 0 var(--ink);
    cursor: pointer;
    transition:
      transform 0.08s,
      box-shadow 0.08s;
  }

  .download-all-button:active:not(:disabled) {
    transform: translate(3px, 3px);
    box-shadow: 1px 1px 0 var(--ink);
  }

  .download-all-button:disabled {
    background: var(--ink-soft);
    cursor: not-allowed;
    box-shadow: none;
  }

  .download-hint {
    font-size: 0.85rem;
    color: #d9d2b6;
  }

  .progress-section {
    padding: 0.75rem;
    background: var(--paper);
    border: 2px solid var(--ink);
  }

  .progress-bar {
    height: 14px;
    border: 2px solid var(--ink);
    background: var(--paper-rule);
  }

  .progress-fill {
    height: 100%;
    background: var(--stamp-blue);
    transition: width 0.2s;
  }

  .progress-text,
  .progress-percent {
    font-size: 0.85rem;
    margin-top: 0.3rem;
  }

  .message {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.6rem 0.75rem;
    border: 2px solid var(--ink);
    background: var(--paper);
  }

  .success-message {
    border-color: var(--stamp-blue);
  }

  .error-message {
    background: var(--carbon-pink);
    border-color: var(--stamp-red);
  }

  .message-text {
    flex: 1;
    font-size: 0.9rem;
  }

  .message-close {
    width: 36px;
    height: 36px;
    border: none;
    background: transparent;
    font-size: 1.2rem;
    cursor: pointer;
    color: var(--ink);
  }

  .individual-downloads {
    padding: 1rem;
    background: var(--paper);
    border: 2px solid var(--ink);
  }

  .section-title {
    font-family: var(--font-heading);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 0.75rem;
  }

  .card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
    gap: 0.75rem;
  }

  .card-item {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    padding: 0.4rem;
    border: 1px solid var(--ink);
  }

  .card-image-container,
  .card-placeholder {
    aspect-ratio: 2 / 3;
    overflow: hidden;
    background: var(--paper-rule);
    display: grid;
    place-items: center;
  }

  .card-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .card-number {
    font-family: var(--font-led);
    font-size: 2rem;
    color: var(--stamp-red);
  }

  .card-name {
    font-family: var(--font-typed);
    font-size: 0.85rem;
  }

  .card-number-text {
    font-family: var(--font-led);
    color: var(--stamp-red);
  }

  .card-download-button {
    min-height: 40px;
    font-family: var(--font-heading);
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    background: var(--paper);
    border: 2px solid var(--ink);
    cursor: pointer;
    color: var(--ink);
  }

  .card-download-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
