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

    try {
      const response = await generationService.generateImages({
        prompts: appStore.generatedPrompts,
        saveToStorage: true,
        onProgress: progress => {
          // Update app store with real-time progress
          appStore.updateGenerationProgress(progress)
        },
      })

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
      appStore.setError(
        error instanceof Error ? error.message : 'Unexpected error during generation'
      )
    } finally {
      appStore.setLoading('generatingImages', false)
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

    retrying = [...retrying, cardNumber]
    try {
      const response = await generationService.regenerateImage({
        cardNumber,
        prompt: prompt.generatedPrompt,
        previousAttempts: 1,
      })

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
      appStore.setError(
        error instanceof Error ? error.message : `Error retrying card ${cardNumber}`
      )
    } finally {
      retrying = retrying.filter(n => n !== cardNumber)
    }
  }

  /** Retry every failed card, one at a time. */
  async function retryAllFailed(): Promise<void> {
    for (const card of failedCards) {
      await handleRetryFailed(card.cardNumber)
    }
  }

  /**
   * Navigate to gallery page
   */
  function goToGallery(): void {
    goto('/gallery')
  }
</script>

<!-- ============================================================================ -->
<!-- TEMPLATE -->
<!-- ============================================================================ -->

<div class="generate-page">
  <header>
    <h1>Generate Your Tarot Deck</h1>
    <p class="subtitle">Step 2 of 3: Review Prompts & Generate Images</p>
  </header>

  <div class="content">
    <!-- Prompt List Section -->
    <section class="prompts-section">
      <PromptListComponent />
    </section>

    <!-- Generation Controls -->
    <section class="generation-section">
      {#if !isGenerating && !hasGeneratedCards}
        <!-- Initial State: Ready to Generate -->
        <div class="start-generation">
          <h2>Ready to Generate?</h2>
          <p class="description">
            Review your prompts above. Once satisfied, click the button below to generate all 22
            Major Arcana cards.
          </p>
          <button class="btn-primary" disabled={!hasPrompts} onclick={startGeneration}>
            Generate All 22 Cards
          </button>
          {#if !hasPrompts}
            <p class="warning">Generate prompts first using the button above</p>
          {/if}
        </div>
      {:else if isGenerating}
        <!-- Generating State: Show Progress -->
        <GenerationProgressComponent onCancel={handleCancel} onRetryFailed={handleRetryFailed} />
      {:else}
        <!-- Complete State: Navigation to Gallery -->
        <div class="generation-complete">
          {#if failedCards.length === 0}
            <h2>Generation Complete!</h2>
            <p class="description">Your tarot deck is ready to view.</p>
          {:else}
            <h2 class="partial">{22 - failedCards.length} of 22 Cards Ready</h2>
            <p class="description">
              {failedCards.length === 1 ? 'One card' : `${failedCards.length} cards`} didn't generate.
              Retry {failedCards.length === 1 ? 'it' : 'them'}, or view the deck as it is.
            </p>
            <ul class="failed-list">
              {#each failedCards as card (card.cardNumber)}
                <li>
                  <span>{card.cardName}</span>
                  <button
                    class="btn-retry"
                    disabled={retrying.includes(card.cardNumber)}
                    aria-label={`Retry ${card.cardName}`}
                    onclick={() => handleRetryFailed(card.cardNumber)}
                  >
                    {retrying.includes(card.cardNumber) ? 'Retrying…' : 'Retry'}
                  </button>
                </li>
              {/each}
            </ul>
            {#if failedCards.length > 1}
              <button class="btn-secondary" disabled={retrying.length > 0} onclick={retryAllFailed}>
                Retry All Failed
              </button>
            {/if}
          {/if}
          <button class="btn-primary" onclick={goToGallery}>View Gallery →</button>
        </div>
      {/if}
    </section>
  </div>
</div>

<!-- ============================================================================ -->
<!-- STYLES -->
<!-- ============================================================================ -->

<style>
  /* ==========================================================================
	   LAYOUT
	   ========================================================================== */

  .generate-page {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }

  header {
    text-align: center;
    margin-bottom: 3rem;
  }

  header h1 {
    font-size: 2.5rem;
    font-weight: 700;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 0.5rem;
  }

  .subtitle {
    font-size: 1.125rem;
    color: #b9b2c8;
    margin: 0;
  }

  .content {
    display: flex;
    flex-direction: column;
    gap: 3rem;
  }

  /* ==========================================================================
	   SECTIONS
	   ========================================================================== */

  .generation-section {
    background: rgba(139, 92, 246, 0.05);
    border: 1px solid rgba(139, 92, 246, 0.2);
    border-radius: 12px;
    padding: 2rem;
  }

  /* ==========================================================================
	   START GENERATION STATE
	   ========================================================================== */

  .start-generation {
    text-align: center;
  }

  .start-generation h2 {
    font-size: 2rem;
    font-weight: 700;
    color: #f3e9d2;
    margin-bottom: 1rem;
  }

  .start-generation .description {
    font-size: 1.125rem;
    color: #b9b2c8;
    margin-bottom: 2rem;
    line-height: 1.6;
  }

  .warning {
    color: #f6ad55;
    margin-top: 1rem;
    font-size: 0.9rem;
    font-weight: 600;
  }

  /* ==========================================================================
	   COMPLETE STATE
	   ========================================================================== */

  .generation-complete {
    text-align: center;
  }

  .generation-complete h2 {
    font-size: 2rem;
    font-weight: 700;
    color: #f3e9d2;
    margin-bottom: 1rem;
  }

  .generation-complete h2::before {
    content: '🎉 ';
    font-size: 2.5rem;
    display: block;
    margin-bottom: 0.5rem;
  }

  .generation-complete h2.partial::before {
    content: none;
  }

  .failed-list {
    list-style: none;
    max-width: 420px;
    margin: 0 auto 1.5rem;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .failed-list li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.6rem 0.9rem;
    border: 1px solid rgba(248, 113, 113, 0.4);
    border-radius: 8px;
    background: rgba(60, 14, 20, 0.45);
    color: #f3e9d2;
  }

  .btn-retry,
  .btn-secondary {
    padding: 0.5rem 1rem;
    border: 1px solid rgba(223, 168, 69, 0.6);
    border-radius: 6px;
    background: transparent;
    color: #dfa845;
    font-weight: 600;
    cursor: pointer;
  }

  .btn-secondary {
    display: block;
    margin: 0 auto 1.25rem;
  }

  .btn-retry:disabled,
  .btn-secondary:disabled {
    opacity: 0.5;
    cursor: wait;
  }

  .generation-complete .description {
    font-size: 1.125rem;
    color: #b9b2c8;
    margin-bottom: 2rem;
  }

  /* ==========================================================================
	   BUTTONS
	   ========================================================================== */

  .btn-primary {
    padding: 1rem 2rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 1.1rem;
    font-weight: 600;
    cursor: pointer;
    transition:
      transform 0.2s,
      box-shadow 0.2s;
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
  }

  .btn-primary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(102, 126, 234, 0.4);
  }

  .btn-primary:active:not(:disabled) {
    transform: translateY(0);
  }

  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  /* ==========================================================================
	   RESPONSIVE DESIGN
	   ========================================================================== */

  @media (max-width: 768px) {
    .generate-page {
      padding: 1rem;
    }

    header h1 {
      font-size: 2rem;
    }

    .subtitle {
      font-size: 1rem;
    }

    .generation-section {
      padding: 1.5rem;
    }

    .start-generation h2,
    .generation-complete h2 {
      font-size: 1.5rem;
    }

    .start-generation .description,
    .generation-complete .description {
      font-size: 1rem;
    }

    .btn-primary {
      width: 100%;
      padding: 0.875rem 1.5rem;
      font-size: 1rem;
    }
  }

  /* ==========================================================================
	   ACCESSIBILITY
	   ========================================================================== */

  @media (prefers-reduced-motion: reduce) {
    .btn-primary,
    header h1 {
      transition: none;
    }
  }

  @media (prefers-contrast: high) {
    .generation-section {
      border-width: 2px;
    }

    .btn-primary {
      border: 2px solid white;
    }
  }
</style>
