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
	import PromptListComponent from '$lib/components/PromptListComponent.svelte'
	import GenerationProgressComponent from '$lib/components/GenerationProgressComponent.svelte'
	import { appStore } from '$lib/stores/appStore.svelte'
	import { goto } from '$app/navigation'
	import { ImageGenerationMock } from '$services/mock/ImageGenerationMock'
	import type { CardNumber } from '$contracts/index'

	// ============================================================================
	// SERVICE INITIALIZATION
	// ============================================================================

	const generationService = new ImageGenerationMock()

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
				onProgress: (progress) => {
					// Update app store with real-time progress
					appStore.updateGenerationProgress(progress)
				}
			})

			if (response.success && response.data) {
				// Store generated cards
				appStore.setGeneratedCards(response.data.generatedCards)

				// Check if any failed
				const failedCount = response.data.generatedCards.filter(
					(card) => card.generationStatus === 'failed'
				).length

				if (failedCount === 0) {
					// All succeeded - show success message briefly then go to gallery
					setTimeout(() => {
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
	function handleCancel(): void {
		// In a real implementation, we'd call generationService.cancelGeneration()
		// For now, just stop the loading state
		appStore.setLoading('generatingImages', false)
		appStore.setError('Generation canceled by user')
	}

	/**
	 * Retry a specific failed card
	 *
	 * @param cardNumber - Card number (0-21) to retry
	 */
	async function handleRetryFailed(cardNumber: number): Promise<void> {
		const prompt = appStore.generatedPrompts.find((p) => p.cardNumber === cardNumber)

		if (!prompt) {
			appStore.setError(`Cannot find prompt for card ${cardNumber}`)
			return
		}

		try {
			const response = await generationService.regenerateImage({
				cardNumber: cardNumber as CardNumber,
				prompt: prompt.generatedPrompt,
				previousAttempts: 1
			})

			if (response.success && response.data) {
				// Update the specific card in the store
				const newCards = appStore.generatedCards.map((card) =>
					card.cardNumber === cardNumber ? response.data!.generatedCard : card
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
					<h2>Generation Complete!</h2>
					<p class="description">Your tarot deck is ready to view.</p>
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
		color: #666;
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
		color: #1a1a1a;
		margin-bottom: 1rem;
	}

	.start-generation .description {
		font-size: 1.125rem;
		color: #666;
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
		color: #1a1a1a;
		margin-bottom: 1rem;
	}

	.generation-complete h2::before {
		content: '🎉 ';
		font-size: 2.5rem;
		display: block;
		margin-bottom: 0.5rem;
	}

	.generation-complete .description {
		font-size: 1.125rem;
		color: #666;
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
		transition: transform 0.2s, box-shadow 0.2s;
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
