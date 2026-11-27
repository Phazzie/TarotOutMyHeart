<!--
/**
 * @fileoverview Generate Page - Complete prompt generation and image generation workflow
 * @purpose Second step in deck creation: display prompts, allow editing, generate images
 * @dataFlow
 *   - Inbound: appStore (styleInputs, uploadedImages, generatedPrompts)
 *   - Outbound: appStore (generatedCards, generationProgress) → Gallery page
 * @boundary Sprint 2 UI - Integrates Seam #3 (PromptGeneration) and Seam #4 (ImageGeneration)
 * @requirement PRD Sprint 2: "Generate Page with Prompt List and Progress Tracking"
 * @updated 2025-11-15
 *
 * This page orchestrates the complete generation workflow:
 * 1. Display PromptListComponent showing all 22 card prompts
 * 2. Allow users to review/edit prompts before image generation
 * 3. Trigger image generation for all 22 cards
 * 4. Show real-time progress via GenerationProgressComponent
 * 5. Handle cancellation and retry of failed cards
 * 6. Navigate to Gallery when generation completes
 *
 * State Flow:
 * - READY: User can start generation (has prompts, not generating)
 * - GENERATING: Shows progress component, can cancel
 * - COMPLETE: Shows success message, navigates to gallery
 *
 * Integration Points:
 * - PromptListComponent: Displays and manages 22 prompts
 * - GenerationProgressComponent: Real-time progress tracking
 * - ImageGenerationMock: Simulates Grok image API
 * - appStore: Central state management
 *
 * @example
 * User workflow:
 * 1. Upload page → style inputs + reference images
 * 2. THIS PAGE → generate prompts → review → generate images
 * 3. Gallery page → view final deck
 */
-->

<script lang="ts">
  import { onDestroy } from 'svelte'
  import PromptListComponent from '$lib/components/PromptListComponent.svelte'
  import GenerationProgressComponent from '$lib/components/GenerationProgressComponent.svelte'
  import { appStore } from '$lib/stores/appStore.svelte'
  import { goto } from '$app/navigation'
  import { imageGenerationService } from '$services/factory'
  import { isCardNumber } from '$lib/utils/types'

  // ============================================================================
  // SERVICE INITIALIZATION
  // ============================================================================

  const generationService = imageGenerationService
  let navigationTimeout: ReturnType<typeof setTimeout> | null = null

  onDestroy(() => {
    if (navigationTimeout) {
      clearTimeout(navigationTimeout)
      navigationTimeout = null
    }
    if (appStore.isGenerating) {
      generationService.cancelGeneration({ sessionId: 'active' })
      appStore.setLoading('generatingImages', false)
    }
  })

  // ============================================================================
  // DERIVED STATE
  // ============================================================================

  /**
   * Whether we have all 22 prompts ready
   */
  const hasPrompts = $derived(appStore.generatedPrompts.length === 22)

  /**
   * Whether image generation is currently running
   */
  const isGenerating = $derived(appStore.isGenerating)

  /**
   * Whether we have generated any cards (partial or complete)
   */
  const hasGeneratedCards = $derived(appStore.generatedCards.length > 0)

  /**
   * Cards whose image failed. Shown after generation ends so they can be retried;
   * the progress component (which also offers retry) is gone by then.
   */
  const failedCards = $derived(
    appStore.generatedCards.filter(card => card.generationStatus === 'failed')
  )

  /** Card numbers with a retry in flight, so their buttons can't be double-clicked. */
  let retrying = $state<number[]>([])

  /**
   * True while "Resubmit all" works through the list. Single resubmit buttons are disabled
   * meanwhile so a queued card can't be generated (and billed) twice.
   */
  let retryingAll = $state(false)

  // ============================================================================
  // IMAGE GENERATION HANDLERS
  // ============================================================================

  /**
   * Start image generation for all 22 cards
   *
   * Initiates the image generation process:
   * 1. Validates that we have 22 prompts
   * 2. Starts generation session with progress callbacks
   * 3. Updates appStore with generated cards and progress
   * 4. Handles errors gracefully
   */
  async function startGeneration(): Promise<void> {
    if (!hasPrompts) {
      appStore.setError('Need all 22 prompts before generating images')
      return
    }

    appStore.setLoading('generatingImages', true)
    const epoch = appStore.deckEpoch

    try {
      const response = await generationService.generateImages({
        prompts: appStore.generatedPrompts,
        saveToStorage: true,
        onProgress: progress => {
          if (epoch !== appStore.deckEpoch) return
          // Update app store with real-time progress
          appStore.updateGenerationProgress(progress)
        },
      })

      if (epoch !== appStore.deckEpoch) return

      if (response.success && response.data) {
        // Store generated cards
        appStore.setGeneratedCards(response.data.generatedCards)

        // Check if any failed
        const failedCount = response.data.generatedCards.filter(
          card => card.generationStatus === 'failed'
        ).length

        if (failedCount === 0) {
          // All succeeded - show success message briefly then go to gallery
          navigationTimeout = setTimeout(() => {
            goto('/gallery')
          }, 2000)
        }
      } else {
        appStore.setError(
          response.error?.message || 'Failed to generate images',
          response.error?.code || 'GENERATION_ERROR'
        )
      }
    } catch (error) {
      if (epoch !== appStore.deckEpoch) return
      appStore.setError(
        error instanceof Error ? error.message : 'Unexpected error during generation'
      )
    } finally {
      if (epoch === appStore.deckEpoch) appStore.setLoading('generatingImages', false)
    }
  }

  /**
   * Cancel ongoing generation
   *
   * Stops the current generation session.
   * Cards completed before cancellation are preserved.
   */
  async function handleCancel(): Promise<void> {
    await generationService.cancelGeneration({ sessionId: 'active' })
    appStore.setLoading('generatingImages', false)
    appStore.setError('Generation canceled by user')
  }

  /**
   * Retry a specific failed card
   *
   * @param cardNumber - Card number (0-21) to retry
   */
  async function handleRetryFailed(cardNumber: number): Promise<void> {
    if (!isCardNumber(cardNumber)) {
      appStore.setError(`Invalid card number: ${cardNumber}`)
      return
    }

    const prompt = appStore.generatedPrompts.find(p => p.cardNumber === cardNumber)

    if (!prompt) {
      appStore.setError(`Cannot find prompt for card ${cardNumber}`)
      return
    }

    const current = appStore.generatedCards.find(card => card.cardNumber === cardNumber)

    retrying = [...retrying, cardNumber]
    // An earlier failure's banner would contradict this new attempt.
    appStore.clearError()
    const epoch = appStore.deckEpoch
    try {
      const response = await generationService.regenerateImage({
        cardNumber,
        prompt: prompt.generatedPrompt,
        previousAttempts: current?.retryCount ?? 0,
      })

      // Withdrawn meanwhile: this card belongs to a deck that no longer exists.
      if (epoch !== appStore.deckEpoch) return

      if (response.success && response.data?.generatedCard) {
        const generatedCard = response.data.generatedCard
        // Update the specific card in the store
        const newCards = appStore.generatedCards.map(card =>
          card.cardNumber === cardNumber ? generatedCard : card
        )
        appStore.setGeneratedCards(newCards)
      } else {
        appStore.setError(
          response.error?.message || `Failed to regenerate card ${cardNumber}`,
          response.error?.code
        )
      }
    } catch (error) {
      if (epoch !== appStore.deckEpoch) return
      appStore.setError(
        error instanceof Error ? error.message : `Error retrying card ${cardNumber}`
      )
    } finally {
      retrying = retrying.filter(n => n !== cardNumber)
    }
  }

  /** Retry every failed card, one at a time. */
  async function retryAllFailed(): Promise<void> {
    retryingAll = true
    try {
      for (const cardNumber of failedCards.map(card => card.cardNumber)) {
        // Skip anything that stopped being failed since the list was taken.
        const card = appStore.generatedCards.find(c => c.cardNumber === cardNumber)
        if (card?.generationStatus !== 'failed' || retrying.includes(cardNumber)) continue
        await handleRetryFailed(cardNumber)
      }
    } finally {
      retryingAll = false
    }
  }

  /**
   * Navigate to gallery page
   */
  function goToGallery(): void {
    goto('/gallery')
  }
</script>

<svelte:head>
  <title>Window 2 · Processing · Bureau of Fate</title>
</svelte:head>

<div class="generate-page">
  <header class="window-head">
    <span class="window-plate">Window 2</span>
    <h1>Processing</h1>
    <p class="subtitle">
      The clerk drafts a case file for every card. Amend what you like, then send the deck to be
      illustrated.
    </p>
  </header>

  <section class="prompts-section sheet">
    <PromptListComponent />
  </section>

  <section class="generation-section sheet">
    {#if !isGenerating && !hasGeneratedCards}
      <div class="start-generation">
        <h2>Send to illustration</h2>
        <p class="description">
          All 22 case files go to the illustrator, one card at a time. It takes a couple of minutes.
          Anything that comes back rejected can be resubmitted.
        </p>
        <button class="stamp-btn" disabled={!hasPrompts} onclick={startGeneration}>
          Approve all 22 for illustration
        </button>
        {#if !hasPrompts}
          <p class="warning">The clerk needs all 22 case files drafted first.</p>
        {/if}
      </div>
    {:else if isGenerating}
      <GenerationProgressComponent onCancel={handleCancel} onRetryFailed={handleRetryFailed} />
    {:else}
      <div class="generation-complete">
        {#if failedCards.length === 0}
          <span class="approved-stamp" aria-hidden="true">Approved</span>
          <h2>All 22 cards illustrated</h2>
          <p class="description">Your deck is waiting at Window 3.</p>
        {:else}
          <h2>{22 - failedCards.length} of 22 cards illustrated</h2>
          <p class="description">
            {failedCards.length === 1 ? 'One card was' : `${failedCards.length} cards were`} returned
            unillustrated. Resubmit {failedCards.length === 1 ? 'it' : 'them'}, or collect the deck
            as it is.
          </p>
          <ul class="failed-list">
            {#each failedCards as card (card.cardNumber)}
              <li>
                <span class="returned-stamp" aria-hidden="true">Returned</span>
                <span class="failed-name">{card.cardName}</span>
                <button
                  class="btn-retry"
                  disabled={retryingAll || retrying.includes(card.cardNumber)}
                  aria-label={`Resubmit ${card.cardName}`}
                  onclick={() => handleRetryFailed(card.cardNumber)}
                >
                  {retrying.includes(card.cardNumber) ? 'Resubmitting…' : 'Resubmit'}
                </button>
              </li>
            {/each}
          </ul>
          {#if failedCards.length > 1}
            <button
              class="btn-retry all"
              disabled={retryingAll || retrying.length > 0}
              onclick={retryAllFailed}
            >
              Resubmit all returned
            </button>
          {/if}
        {/if}
        <button class="stamp-btn" onclick={goToGallery}>Proceed to Window 3 →</button>
      </div>
    {/if}
  </section>
</div>

<style>
  .generate-page {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .prompts-section,
  .generation-section {
    padding: 1.5rem;
  }

  .start-generation,
  .generation-complete {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 0.9rem;
  }

  .start-generation h2,
  .generation-complete h2 {
    font-size: 1.6rem;
    text-transform: uppercase;
  }

  .description {
    max-width: 56ch;
    color: var(--ink-soft);
  }

  .warning {
    font-size: 0.85rem;
    color: var(--stamp-red);
  }

  .approved-stamp {
    position: absolute;
    top: -0.5rem;
    right: 1rem;
    padding: 0.15rem 0.6rem;
    border: 4px solid #2f6b3d;
    border-radius: 6px;
    color: #2f6b3d;
    font-family: var(--font-heading);
    font-size: 1.4rem;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    transform: rotate(10deg);
    opacity: 0.8;
  }

  .failed-list {
    list-style: none;
    width: min(100%, 460px);
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .failed-list li {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem 0.75rem;
    background: var(--carbon-pink);
    border: 1px solid #d89aa0;
    text-align: left;
  }

  .returned-stamp {
    padding: 0 0.35rem;
    border: 2px solid var(--stamp-red);
    color: var(--stamp-red);
    font-family: var(--font-heading);
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    transform: rotate(-6deg);
  }

  .failed-name {
    flex: 1;
    font-family: var(--font-tarot);
  }

  .btn-retry {
    padding: 0.35rem 0.8rem;
    border: 2px solid var(--stamp-blue);
    background: transparent;
    color: var(--stamp-blue);
    font-family: var(--font-heading);
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    cursor: pointer;
  }

  .btn-retry:hover:not(:disabled) {
    background: var(--stamp-blue);
    color: #fff;
  }

  .btn-retry:disabled {
    opacity: 0.5;
    cursor: wait;
  }

  @media (max-width: 640px) {
    .prompts-section,
    .generation-section {
      padding: 1rem 0.8rem;
    }
  }
</style>
