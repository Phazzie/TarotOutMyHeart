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
  import { MAJOR_ARCANA_NAMES } from '$contracts/PromptGeneration'

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

  const { onCancel, onRetryFailed }: Props = $props()

  // ========================================================================
  // DERIVED STATE (from appStore)
  // ========================================================================

  /**
   * Current generation progress (null when not generating)
   */
  const progress = $derived(appStore.generationProgress)

  /**
   * Whether generation is currently running
   */
  const isGenerating = $derived(appStore.isGenerating)

  /**
   * Percent complete (0-100)
   */
  const percentComplete = $derived(progress?.percentComplete ?? 0)

  /**
   * Cards completed successfully
   */
  const completedCount = $derived(progress?.completed ?? 0)

  /**
   * Total cards to generate (always 22)
   */
  const totalCards = $derived(progress?.total ?? 22)

  /**
   * Failed card count
   */
  const failedCount = $derived(progress?.failed ?? 0)

  /**
   * Current card being generated
   */
  const currentCardNumber = $derived(progress?.current)

  /**
   * Current status message
   */
  const statusMessage = $derived(progress?.status ?? 'Waiting to start...')

  /**
   * Estimated time remaining (seconds)
   */
  const timeRemaining = $derived(progress?.estimatedTimeRemaining ?? 0)

  /**
   * Whether all cards are complete
   */
  const isComplete = $derived(completedCount === 22)

  /**
   * Failed cards from generated cards
   */
  const failedCards = $derived(
    appStore.generatedCards.filter(card => card.generationStatus === 'failed')
  )

  // ========================================================================
  // COMPUTED VALUES
  // ========================================================================

  /**
   * Format time remaining as human-readable string
   */
  const formattedTimeRemaining = $derived(() => {
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
  /** Cards are processed in order, so everything before `processed` has been seen. */
  const processed = $derived(completedCount + failedCount)

  const currentName = $derived(
    currentCardNumber !== undefined ? (MAJOR_ARCANA_NAMES[currentCardNumber] ?? '') : ''
  )

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
  <h2 class="sr-only">Generation progress</h2>

  <div class="board">
    <div class="board-main">
      <span class="board-label">Now serving</span>
      <span class="board-number" aria-hidden="true">
        {currentCardNumber !== undefined ? String(currentCardNumber).padStart(2, '0') : '--'}
      </span>
      <span class="board-name">{currentName || 'Please wait'}</span>
    </div>
    <div class="board-side">
      <div
        class="progress-bar-wrapper"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percentComplete}
        aria-label="Generation progress: {percentComplete}% complete"
      >
        <ol class="slots" aria-hidden="true">
          {#each MAJOR_ARCANA_NAMES as name, i (name)}
            <li
              class="slot"
              class:done={i < processed}
              class:active={isGenerating && i === currentCardNumber}
              title={name}
            >
              {String(i).padStart(2, '0')}
            </li>
          {/each}
        </ol>
      </div>
      <p class="stats-text" aria-live="polite">
        <span class="stats-count">{completedCount}/{totalCards}</span>
        illustrated · {percentComplete}%
        {#if formattedTimeRemaining()}
          · {formattedTimeRemaining()}
        {/if}
      </p>
      <p class="clerk-status">{statusMessage}</p>
    </div>
  </div>

  <p class="hold-music">
    Please hold. Your fate is important to us. Cards are illustrated one at a time, in order.
  </p>

  {#if failedCount > 0}
    <div class="failed-cards-section" role="alert">
      <h3 class="failed-cards-title">
        Returned: {failedCount}
        {failedCount === 1 ? 'card' : 'cards'}
      </h3>
      <div class="failed-cards-list">
        {#each failedCards as card (card.cardNumber)}
          <div class="failed-card-item">
            <div class="failed-card-info">
              <p class="failed-card-name">
                MA-{String(card.cardNumber).padStart(2, '0')} · {card.cardName}
              </p>
              {#if card.error}
                <p class="failed-card-error">{card.error}</p>
              {/if}
            </div>
            {#if onRetryFailed}
              <button
                class="retry-button"
                onclick={() => handleRetry(card.cardNumber)}
                aria-label="Resubmit {card.cardName}"
              >
                Resubmit
              </button>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  {/if}

  {#if isComplete}
    <div class="completion-section" role="status" aria-live="polite">
      <h3 class="completion-title">All 22 cards illustrated</h3>
      <p class="completion-subtitle">Proceed to Window 3 to collect your deck.</p>
    </div>
  {/if}

  {#if isGenerating && !isComplete && onCancel}
    <div class="actions-section">
      <button class="cancel-button" onclick={handleCancel}>Withdraw from the queue</button>
    </div>
  {/if}
</div>

<style>
  .progress-container {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    border: 0;
  }

  /* The lobby's LED "Now Serving" board. */
  .board {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 1.25rem;
    padding: 1rem 1.25rem;
    background: #0b0b0b;
    border: 6px solid #2b2b2b;
    border-radius: 6px;
    color: var(--led);
    box-shadow: inset 0 0 30px rgba(255, 75, 43, 0.08);
  }

  .board-main {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 9rem;
  }

  .board-label {
    font-family: var(--font-heading);
    font-size: 0.75rem;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: #9a9a9a;
  }

  .board-number {
    font-family: var(--font-led);
    font-size: 6rem;
    line-height: 0.9;
    text-shadow: 0 0 14px rgba(255, 75, 43, 0.75);
    animation: flicker 2.4s steps(1) infinite;
  }

  @keyframes flicker {
    0%,
    92%,
    100% {
      opacity: 1;
    }
    94% {
      opacity: 0.6;
    }
  }

  .board-name {
    font-family: var(--font-led);
    font-size: 1.6rem;
    line-height: 1;
    text-align: center;
    color: #ffb199;
  }

  .board-side {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 0.6rem;
    min-width: 0;
  }

  .slots {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(11, minmax(0, 1fr));
    gap: 4px;
  }

  .slot {
    padding: 0.15rem 0;
    text-align: center;
    font-family: var(--font-led);
    font-size: 1.1rem;
    color: #3a1a14;
    background: #1a1a1a;
    border: 1px solid #2c2c2c;
  }

  .slot.done {
    color: var(--led);
    background: #2a0f0a;
  }

  .slot.active {
    color: #0b0b0b;
    background: var(--led);
  }

  .stats-text {
    font-family: var(--font-led);
    font-size: 1.35rem;
    color: #ffb199;
  }

  .stats-count {
    color: var(--led);
  }

  .clerk-status {
    font-family: var(--font-led);
    font-size: 1.1rem;
    color: #8a8a8a;
  }

  .hold-music {
    font-size: 0.85rem;
    font-style: italic;
    color: var(--ink-soft);
  }

  .failed-cards-section {
    padding: 0.8rem 1rem;
    background: var(--carbon-pink);
    border: 2px solid var(--stamp-red);
  }

  .failed-cards-title {
    font-size: 0.95rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--stamp-red);
    margin-bottom: 0.4rem;
  }

  .failed-cards-list {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .failed-card-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.75rem;
  }

  .failed-card-name {
    font-family: var(--font-typed);
  }

  .failed-card-error {
    font-size: 0.78rem;
    color: #7d1f1c;
  }

  .retry-button,
  .cancel-button {
    padding: 0.35rem 0.8rem;
    background: transparent;
    border: 2px solid var(--stamp-red);
    color: var(--stamp-red);
    font-family: var(--font-heading);
    font-size: 0.8rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    cursor: pointer;
  }

  .retry-button:hover,
  .cancel-button:hover {
    background: var(--stamp-red);
    color: #fff;
  }

  .completion-section {
    padding: 0.8rem 1rem;
    border: 2px solid #2f6b3d;
    background: #e3efdd;
    color: #24542f;
  }

  .completion-title {
    font-size: 1rem;
    text-transform: uppercase;
  }

  .actions-section {
    display: flex;
    justify-content: center;
  }

  @media (max-width: 640px) {
    .board {
      grid-template-columns: 1fr;
      gap: 0.75rem;
      padding: 0.8rem;
    }

    .board-number {
      font-size: 4.5rem;
    }

    .slots {
      grid-template-columns: repeat(6, minmax(0, 1fr));
    }
  }
</style>
