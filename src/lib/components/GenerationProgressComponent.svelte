<!--
  @fileoverview Generation Progress Component - Real-time progress tracking for image generation
  @purpose Display progress bar, stats, and status for 22-card generation process
  @dataFlow appStore.generationProgress → Component display → User feedback
  @boundary UI Component - No external API calls, reads from appStore
  @requirement PRD Sprint 2, Component 4: Progress tracking UI
  @updated 2025-11-15

  This component displays:
  - Progress bar (0-100%) with gradient fill
  - Stats display (X/22 cards completed with percentage)
  - Current card being generated with spinner
  - Estimated time remaining
  - Failed cards list with retry functionality
  - Cancel button to stop generation
  - Completion message when all 22 cards done

  Accessibility features:
  - ARIA live region for progress updates
  - Progress role with aria-valuenow/valuemin/valuemax
  - Screen reader announcements for milestones
  - Keyboard accessible cancel button

  @example
  ```svelte
  <script lang="ts">
    import GenerationProgressComponent from '$lib/components/GenerationProgressComponent.svelte'
    import { appStore } from '$lib/stores/appStore.svelte'
  </script>

  <GenerationProgressComponent
    onCancel={() => cancelGeneration()}
    onRetryFailed={(cardNumber) => retryCard(cardNumber)}
  />
  ```
-->

<script lang="ts">
  import { appStore } from '$lib/stores/appStore.svelte'

  // ========================================================================
  // PROPS
  // ========================================================================

  /**
   * Callback when user cancels generation
   */
  interface Props {
    onCancel?: () => void
    onRetryFailed?: (cardNumber: number) => void
  }

  let { onCancel, onRetryFailed }: Props = $props()

  // ========================================================================
  // DERIVED STATE (from appStore)
  // ========================================================================

  /**
   * Current generation progress (null when not generating)
   */
  let progress = $derived(appStore.generationProgress)

  /**
   * Whether generation is currently running
   */
  let isGenerating = $derived(appStore.isGenerating)

  /**
   * Percent complete (0-100)
   */
  let percentComplete = $derived(progress?.percentComplete ?? 0)

  /**
   * Cards completed successfully
   */
  let completedCount = $derived(progress?.completed ?? 0)

  /**
   * Total cards to generate (always 22)
   */
  let totalCards = $derived(progress?.total ?? 22)

  /**
   * Failed card count
   */
  let failedCount = $derived(progress?.failed ?? 0)

  /**
   * Current card being generated
   */
  let currentCardNumber = $derived(progress?.current)

  /**
   * Current status message
   */
  let statusMessage = $derived(progress?.status ?? 'Waiting to start...')

  /**
   * Estimated time remaining (seconds)
   */
  let timeRemaining = $derived(progress?.estimatedTimeRemaining ?? 0)

  /**
   * Whether all cards are complete
   */
  let isComplete = $derived(completedCount === 22)

  /**
   * Failed cards from generated cards
   */
  let failedCards = $derived(
    appStore.generatedCards.filter(card => card.generationStatus === 'failed')
  )

  // ========================================================================
  // COMPUTED VALUES
  // ========================================================================

  /**
   * Format time remaining as human-readable string
   */
  let formattedTimeRemaining = $derived(() => {
    if (!timeRemaining || timeRemaining <= 0) return null

    const minutes = Math.floor(timeRemaining / 60)
    const seconds = Math.floor(timeRemaining % 60)

    if (minutes > 0) {
      return `~${minutes}m ${seconds}s remaining`
    }
    return `~${seconds}s remaining`
  })

  /**
   * Status icon for current card
   */
  let statusIcon = $derived(() => {
    if (isComplete) return '✓'
    if (isGenerating) return '⟳'
    return '○'
  })

  // ========================================================================
  // EVENT HANDLERS
  // ========================================================================

  /**
   * Handle cancel button click
   */
  function handleCancel(): void {
    if (onCancel) {
      onCancel()
    }
  }

  /**
   * Handle retry failed card
   */
  function handleRetry(cardNumber: number): void {
    if (onRetryFailed) {
      onRetryFailed(cardNumber)
    }
  }
</script>

<!-- ========================================================================
     COMPONENT TEMPLATE
     ======================================================================== -->

<div class="progress-container" role="region" aria-label="Image generation progress">
  <!-- Progress Bar Section -->
  <div class="progress-section">
    <h2 class="sr-only">Generation Progress</h2>

    <!-- Progress Bar -->
    <div
      class="progress-bar-wrapper"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percentComplete}
      aria-label="Generation progress: {percentComplete}% complete"
    >
      <div class="progress-bar-track">
        <div
          class="progress-bar-fill"
          class:pulsing={isGenerating && !isComplete}
          style="width: {percentComplete}%"
        ></div>
      </div>
    </div>

    <!-- Stats Display -->
    <div class="stats-display" aria-live="polite">
      <p class="stats-text">
        <span class="stats-count">{completedCount}/{totalCards}</span>
        cards completed
        <span class="stats-percent">({percentComplete}%)</span>
      </p>
    </div>
  </div>

  <!-- Current Card Section -->
  {#if isGenerating && !isComplete && currentCardNumber !== undefined}
    <div class="current-card-section">
      <div class="current-card">
        <span class="spinner" aria-hidden="true">{statusIcon}</span>
        <div class="current-card-info">
          <p class="current-card-label">Currently generating:</p>
          <p class="current-card-name">{statusMessage}</p>
        </div>
      </div>
    </div>
  {/if}

  <!-- Time Estimate -->
  {#if isGenerating && !isComplete && formattedTimeRemaining()}
    <div class="time-estimate">
      <p aria-live="polite">
        <span class="clock-icon" aria-hidden="true">🕐</span>
        {formattedTimeRemaining()}
      </p>
    </div>
  {/if}

  <!-- Failed Cards Section -->
  {#if failedCount > 0}
    <div class="failed-cards-section" role="alert">
      <h3 class="failed-cards-title">
        <span class="warning-icon" aria-hidden="true">⚠️</span>
        {failedCount}
        {failedCount === 1 ? 'card' : 'cards'} failed
      </h3>
      <div class="failed-cards-list">
        {#each failedCards as card}
          <div class="failed-card-item">
            <div class="failed-card-info">
              <p class="failed-card-name">{card.cardNumber}. {card.cardName}</p>
              {#if card.error}
                <p class="failed-card-error">{card.error}</p>
              {/if}
            </div>
            {#if onRetryFailed}
              <button
                class="retry-button"
                onclick={() => handleRetry(card.cardNumber)}
                aria-label="Retry generating {card.cardName}"
              >
                Retry
              </button>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Completion Message -->
  {#if isComplete}
    <div class="completion-section" role="status" aria-live="polite">
      <div class="completion-message">
        <span class="completion-icon" aria-hidden="true">🎉</span>
        <h3 class="completion-title">All cards generated!</h3>
        <p class="completion-subtitle">
          {failedCount > 0
            ? `${completedCount} cards completed successfully. ${failedCount} cards need retry.`
            : 'Your complete 22-card Major Arcana deck is ready!'}
        </p>
      </div>
    </div>
  {/if}

  <!-- Cancel Button -->
  {#if isGenerating && !isComplete && onCancel}
    <div class="actions-section">
      <button class="cancel-button" onclick={handleCancel} aria-label="Cancel generation">
        Cancel Generation
      </button>
    </div>
  {/if}
</div>

<!-- ========================================================================
     COMPONENT STYLES
     ======================================================================== -->

<style>
  /* ======================================================================
     CSS CUSTOM PROPERTIES (THEME)
     ====================================================================== */

  :root {
    --color-primary: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    --color-success: #48bb78;
    --color-warning: #ed8936;
    --color-danger: #f56565;
    --color-text-primary: #1a1a1a;
    --color-text-secondary: #666;
    --color-border: #e2e8f0;
    --color-bg-light: #f7fafc;
  }

  /* ======================================================================
     CONTAINER
     ====================================================================== */

  .progress-container {
    background: white;
    border-radius: 12px;
    padding: 2rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    max-width: 800px;
    margin: 0 auto;
  }

  /* ======================================================================
     SCREEN READER ONLY
     ====================================================================== */

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }

  /* ======================================================================
     PROGRESS BAR SECTION
     ====================================================================== */

  .progress-section {
    margin-bottom: 2rem;
  }

  .progress-bar-wrapper {
    margin-bottom: 1rem;
  }

  .progress-bar-track {
    width: 100%;
    height: 40px;
    background: var(--color-bg-light);
    border-radius: 20px;
    overflow: hidden;
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .progress-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
    border-radius: 20px;
    transition: width 0.5s ease-in-out;
    box-shadow: 0 2px 4px rgba(102, 126, 234, 0.4);
  }

  .progress-bar-fill.pulsing {
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.8;
    }
  }

  .stats-display {
    text-align: center;
  }

  .stats-text {
    font-size: 1.5rem;
    color: var(--color-text-primary);
    font-weight: 600;
    margin: 0;
  }

  .stats-count {
    color: #667eea;
    font-weight: 700;
    font-size: 1.75rem;
  }

  .stats-percent {
    color: var(--color-text-secondary);
    font-size: 1.25rem;
    font-weight: 500;
  }

  /* ======================================================================
     CURRENT CARD SECTION
     ====================================================================== */

  .current-card-section {
    margin-bottom: 1.5rem;
  }

  .current-card {
    display: flex;
    align-items: center;
    gap: 1rem;
    background: var(--color-bg-light);
    padding: 1.5rem;
    border-radius: 8px;
    border-left: 4px solid #667eea;
  }

  .spinner {
    font-size: 2rem;
    animation: spin 2s linear infinite;
    display: block;
    flex-shrink: 0;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .current-card-info {
    flex: 1;
  }

  .current-card-label {
    font-size: 0.875rem;
    color: var(--color-text-secondary);
    margin: 0 0 0.25rem 0;
    font-weight: 500;
  }

  .current-card-name {
    font-size: 1.25rem;
    color: var(--color-text-primary);
    margin: 0;
    font-weight: 600;
  }

  /* ======================================================================
     TIME ESTIMATE
     ====================================================================== */

  .time-estimate {
    text-align: center;
    margin-bottom: 1.5rem;
  }

  .time-estimate p {
    font-size: 1.125rem;
    color: var(--color-text-secondary);
    margin: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }

  .clock-icon {
    font-size: 1.25rem;
  }

  /* ======================================================================
     FAILED CARDS SECTION
     ====================================================================== */

  .failed-cards-section {
    background: #fff5f5;
    border: 2px solid #fc8181;
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .failed-cards-title {
    font-size: 1.25rem;
    color: #c53030;
    margin: 0 0 1rem 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .warning-icon {
    font-size: 1.5rem;
  }

  .failed-cards-list {
    display: grid;
    gap: 0.75rem;
  }

  .failed-card-item {
    background: white;
    padding: 1rem;
    border-radius: 6px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
  }

  .failed-card-info {
    flex: 1;
  }

  .failed-card-name {
    font-size: 1rem;
    color: var(--color-text-primary);
    margin: 0 0 0.25rem 0;
    font-weight: 600;
  }

  .failed-card-error {
    font-size: 0.875rem;
    color: #e53e3e;
    margin: 0;
  }

  .retry-button {
    padding: 0.5rem 1rem;
    background: #667eea;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition:
      background 0.2s,
      transform 0.1s;
  }

  .retry-button:hover {
    background: #5a67d8;
    transform: translateY(-1px);
  }

  .retry-button:active {
    transform: translateY(0);
  }

  /* ======================================================================
     COMPLETION SECTION
     ====================================================================== */

  .completion-section {
    margin-bottom: 1.5rem;
  }

  .completion-message {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 2rem;
    border-radius: 12px;
    text-align: center;
  }

  .completion-icon {
    font-size: 3rem;
    display: block;
    margin-bottom: 1rem;
    animation: celebrate 0.6s ease-in-out;
  }

  @keyframes celebrate {
    0%,
    100% {
      transform: scale(1) rotate(0deg);
    }
    25% {
      transform: scale(1.2) rotate(-10deg);
    }
    75% {
      transform: scale(1.2) rotate(10deg);
    }
  }

  .completion-title {
    font-size: 2rem;
    margin: 0 0 0.5rem 0;
    font-weight: 700;
  }

  .completion-subtitle {
    font-size: 1.125rem;
    margin: 0;
    opacity: 0.95;
  }

  /* ======================================================================
     ACTIONS SECTION
     ====================================================================== */

  .actions-section {
    text-align: center;
  }

  .cancel-button {
    padding: 0.75rem 2rem;
    background: transparent;
    color: #e53e3e;
    border: 2px solid #e53e3e;
    border-radius: 6px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .cancel-button:hover {
    background: #e53e3e;
    color: white;
  }

  /* ======================================================================
     RESPONSIVE DESIGN
     ====================================================================== */

  @media (max-width: 768px) {
    .progress-container {
      padding: 1.5rem;
    }

    .stats-text {
      font-size: 1.25rem;
    }

    .stats-count {
      font-size: 1.5rem;
    }

    .stats-percent {
      font-size: 1rem;
    }

    .current-card {
      flex-direction: column;
      text-align: center;
    }

    .current-card-name {
      font-size: 1.125rem;
    }

    .failed-card-item {
      flex-direction: column;
      align-items: stretch;
    }

    .retry-button {
      width: 100%;
    }

    .completion-icon {
      font-size: 2.5rem;
    }

    .completion-title {
      font-size: 1.75rem;
    }

    .completion-subtitle {
      font-size: 1rem;
    }
  }
</style>
