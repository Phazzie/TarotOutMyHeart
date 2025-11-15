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
    <h3 class="panel-title">Download Options</h3>

    <!-- Deck Name Input -->
    <div class="form-group">
      <label for="deck-name" class="form-label">
        Deck Name
        <span class="label-hint">(for ZIP filename)</span>
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
        <span>Include metadata JSON</span>
        <span class="label-hint">
          (style inputs, generation date, card list)
        </span>
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
      <span class="button-icon" aria-hidden="true">⬇️</span>
      <span class="button-text">
        {#if isDownloading}
          Preparing Download...
        {:else}
          Download All as ZIP
        {/if}
      </span>
    </button>

    {#if !canDownloadDeck && !isDownloading}
      <p class="download-hint">
        {#if appStore.generatedCards.length < 22}
          Generate all 22 cards to enable download
        {:else if !appStore.hasAllCards}
          Wait for all cards to complete generation
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
      <button
        class="message-close"
        onclick={clearSuccess}
        aria-label="Dismiss success message"
      >
        ×
      </button>
    </div>
  {/if}

  <!-- Error Message -->
  {#if errorMessage}
    <div class="message error-message" role="alert">
      <span class="message-icon" aria-hidden="true">⚠</span>
      <span class="message-text">{errorMessage}</span>
      <button
        class="message-close"
        onclick={clearError}
        aria-label="Dismiss error message"
      >
        ×
      </button>
    </div>
  {/if}

  <!-- Individual Card Downloads -->
  {#if appStore.generatedCards.length > 0}
    <div class="individual-downloads">
      <h3 class="section-title">Download Individual Cards</h3>
      <div class="card-grid">
        {#each appStore.generatedCards as card (card.cardNumber)}
          <div class="card-item">
            <!-- Card Preview (if image available) -->
            {#if card.imageUrl}
              <div class="card-image-container">
                <img
                  src={card.imageUrl}
                  alt={card.cardName}
                  class="card-image"
                  loading="lazy"
                />
              </div>
            {:else}
              <div class="card-placeholder">
                <span class="card-number">{card.cardNumber}</span>
              </div>
            {/if}

            <!-- Card Info -->
            <div class="card-info">
              <h4 class="card-name">{card.cardName}</h4>
              <p class="card-number-text">Card #{card.cardNumber}</p>
            </div>

            <!-- Download Button -->
            <button
              class="card-download-button"
              onclick={() => downloadCard(card)}
              disabled={!card.imageUrl || downloadingCardNumber === card.cardNumber}
              aria-label="Download {card.cardName}"
            >
              {#if downloadingCardNumber === card.cardNumber}
                <span class="button-spinner" aria-hidden="true">⏳</span>
                Downloading...
              {:else}
                <span class="button-icon" aria-hidden="true">⬇️</span>
                Download
              {/if}
            </button>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>

<!-- ============================================================================
     STYLES
     ============================================================================ -->

<style>
  .download-component {
    display: grid;
    gap: 2rem;
  }

  /* Options Panel */
  .options-panel {
    background: #ffffff;
    padding: 1.5rem;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .panel-title {
    font-size: 1.25rem;
    font-weight: 600;
    margin-bottom: 1rem;
    color: #1a1a1a;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  .form-group:last-child {
    margin-bottom: 0;
  }

  .form-label {
    display: block;
    font-weight: 500;
    margin-bottom: 0.5rem;
    color: #4a5568;
    font-size: 0.875rem;
  }

  .label-hint {
    font-weight: 400;
    color: #718096;
    font-size: 0.8125rem;
  }

  .form-input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #cbd5e0;
    border-radius: 4px;
    font-size: 1rem;
    transition: border-color 0.2s;
  }

  .form-input:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }

  .form-input:disabled {
    background: #f7fafc;
    cursor: not-allowed;
    opacity: 0.6;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    font-size: 0.875rem;
    color: #4a5568;
  }

  .checkbox-label input[type='checkbox'] {
    width: 1.125rem;
    height: 1.125rem;
    cursor: pointer;
  }

  .checkbox-label input[type='checkbox']:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  /* Download All Section */
  .download-all-section {
    text-align: center;
  }

  .download-all-button {
    display: inline-flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1.25rem 2.5rem;
    font-size: 1.125rem;
    font-weight: 600;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);
  }

  .download-all-button:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 12px rgba(102, 126, 234, 0.4);
  }

  .download-all-button:active:not(:disabled) {
    transform: translateY(0);
  }

  .download-all-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  .button-icon {
    font-size: 1.5rem;
  }

  .button-text {
    font-size: 1.125rem;
  }

  .download-hint {
    margin-top: 1rem;
    color: #718096;
    font-size: 0.875rem;
  }

  /* Progress Section */
  .progress-section {
    background: #ffffff;
    padding: 1.5rem;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .progress-bar {
    width: 100%;
    height: 2rem;
    background: #e2e8f0;
    border-radius: 1rem;
    overflow: hidden;
    margin-bottom: 1rem;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #667eea, #764ba2);
    transition: width 0.3s ease;
    border-radius: 1rem;
  }

  .progress-text {
    font-size: 1rem;
    color: #4a5568;
    margin-bottom: 0.5rem;
    text-align: center;
  }

  .progress-percent {
    font-size: 1.5rem;
    font-weight: 600;
    color: #667eea;
    text-align: center;
  }

  /* Messages */
  .message {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem 1.5rem;
    border-radius: 8px;
    font-size: 0.875rem;
  }

  .success-message {
    background: #f0fdf4;
    border: 1px solid #86efac;
    color: #166534;
  }

  .error-message {
    background: #fef2f2;
    border: 1px solid #fca5a5;
    color: #991b1b;
  }

  .message-icon {
    font-size: 1.25rem;
    flex-shrink: 0;
  }

  .message-text {
    flex: 1;
  }

  .message-close {
    background: transparent;
    border: none;
    font-size: 1.5rem;
    color: currentColor;
    cursor: pointer;
    padding: 0;
    width: 1.5rem;
    height: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0.7;
    transition: opacity 0.2s;
  }

  .message-close:hover {
    opacity: 1;
  }

  /* Individual Downloads */
  .individual-downloads {
    background: #ffffff;
    padding: 2rem;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .section-title {
    font-size: 1.25rem;
    font-weight: 600;
    margin-bottom: 1.5rem;
    color: #1a1a1a;
  }

  .card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 1.5rem;
  }

  .card-item {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    background: #f7fafc;
    padding: 1rem;
    border-radius: 8px;
    transition: box-shadow 0.2s;
  }

  .card-item:hover {
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }

  .card-image-container {
    aspect-ratio: 2 / 3;
    border-radius: 4px;
    overflow: hidden;
  }

  .card-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .card-placeholder {
    aspect-ratio: 2 / 3;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: bold;
    font-size: 2rem;
  }

  .card-info {
    flex: 1;
  }

  .card-name {
    font-size: 1rem;
    font-weight: 600;
    color: #2d3748;
    margin-bottom: 0.25rem;
  }

  .card-number-text {
    font-size: 0.8125rem;
    color: #718096;
  }

  .card-download-button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.625rem 1rem;
    font-size: 0.875rem;
    font-weight: 500;
    background: #4299e1;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.2s;
  }

  .card-download-button:hover:not(:disabled) {
    background: #3182ce;
  }

  .card-download-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .button-spinner {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .download-component {
      gap: 1.5rem;
    }

    .options-panel,
    .individual-downloads {
      padding: 1rem;
    }

    .download-all-button {
      width: 100%;
      padding: 1rem 1.5rem;
      font-size: 1rem;
    }

    .card-grid {
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 1rem;
    }

    .card-item {
      padding: 0.75rem;
    }
  }

  @media (max-width: 480px) {
    .card-grid {
      grid-template-columns: 1fr 1fr;
    }
  }
</style>
