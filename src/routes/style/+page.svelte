<!--
/**
 * @fileoverview Style Input Page - Define deck style parameters
 * @purpose Page for users to define their deck's visual style
 * @dataFlow User inputs → StyleInputComponent → AppStore → Next step (prompts)
 * @updated 2025-11-15
 *
 * This page:
 * - Displays the StyleInputComponent
 * - Provides navigation to next step after saving
 * - Shows current progress in the workflow
 */
-->

<script lang="ts">
	import StyleInputComponent from '$lib/components/StyleInputComponent.svelte';
	import { appStore } from '$lib/stores/appStore.svelte';

	/**
	 * Navigate to prompts page after style is saved
	 */
	function handleContinue() {
		if (appStore.styleInputs) {
			appStore.setCurrentPage('prompts');
		}
	}
</script>

<svelte:head>
	<title>Define Style - TarotOutMyHeart</title>
	<meta
		name="description"
		content="Define the visual style for your custom tarot deck"
	/>
</svelte:head>

<div class="page-container">
	<!-- Progress Indicator -->
	<div class="progress-bar">
		<div class="progress-step completed">
			<div class="step-number">1</div>
			<div class="step-label">Upload</div>
		</div>
		<div class="progress-connector"></div>
		<div class="progress-step active">
			<div class="step-number">2</div>
			<div class="step-label">Style</div>
		</div>
		<div class="progress-connector"></div>
		<div class="progress-step">
			<div class="step-number">3</div>
			<div class="step-label">Prompts</div>
		</div>
		<div class="progress-connector"></div>
		<div class="progress-step">
			<div class="step-number">4</div>
			<div class="step-label">Generate</div>
		</div>
	</div>

	<!-- Style Input Component -->
	<StyleInputComponent />

	<!-- Navigation Buttons -->
	{#if appStore.styleInputs}
		<div class="navigation-actions">
			<a href="/upload" class="nav-button secondary">
				← Back to Upload
			</a>
			<button
				class="nav-button primary"
				onclick={handleContinue}
			>
				Continue to Prompts →
			</button>
		</div>
	{/if}
</div>

<style>
	/* ===============================================
	   PAGE LAYOUT
	   =============================================== */
	.page-container {
		max-width: 1000px;
		margin: 0 auto;
		padding: var(--spacing-xl);
	}

	/* ===============================================
	   PROGRESS BAR
	   =============================================== */
	.progress-bar {
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: var(--spacing-xxl);
		padding: var(--spacing-lg);
		background: var(--glass-bg);
		border-radius: var(--radius-lg);
		border: 1px solid var(--glass-border);
	}

	.progress-step {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--spacing-sm);
		min-width: 80px;
	}

	.step-number {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: var(--font-heading);
		font-weight: 600;
		background: var(--color-bg-tertiary);
		color: var(--color-text-muted);
		border: 2px solid var(--color-bg-tertiary);
		transition: all var(--transition-normal);
	}

	.progress-step.completed .step-number {
		background: var(--color-primary);
		border-color: var(--color-primary);
		color: var(--color-text);
	}

	.progress-step.active .step-number {
		background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
		border-color: var(--color-secondary);
		color: var(--color-text);
		box-shadow: 0 0 20px rgba(246, 173, 85, 0.4);
	}

	.step-label {
		font-size: var(--text-sm);
		font-family: var(--font-heading);
		color: var(--color-text-muted);
		transition: color var(--transition-normal);
	}

	.progress-step.completed .step-label,
	.progress-step.active .step-label {
		color: var(--color-text);
	}

	.progress-connector {
		flex: 1;
		height: 2px;
		background: var(--color-bg-tertiary);
		margin: 0 var(--spacing-sm);
		max-width: 60px;
	}

	.progress-step.completed + .progress-connector {
		background: var(--color-primary);
	}

	/* ===============================================
	   NAVIGATION
	   =============================================== */
	.navigation-actions {
		display: flex;
		justify-content: space-between;
		gap: var(--spacing-md);
		margin-top: var(--spacing-xxl);
		padding-top: var(--spacing-xl);
		border-top: 1px solid var(--glass-border);
	}

	.nav-button {
		padding: var(--spacing-md) var(--spacing-xl);
		font-size: var(--text-base);
		font-weight: 600;
		font-family: var(--font-heading);
		border-radius: var(--radius-md);
		text-decoration: none;
		cursor: pointer;
		transition: all var(--transition-fast);
		border: none;
		display: inline-flex;
		align-items: center;
		gap: var(--spacing-sm);
	}

	.nav-button.primary {
		background: linear-gradient(135deg, var(--color-primary), var(--color-primary-light));
		color: var(--color-text);
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
	}

	.nav-button.primary:hover {
		transform: translateY(-2px);
		box-shadow: 0 6px 12px rgba(107, 70, 193, 0.3);
	}

	.nav-button.secondary {
		background: transparent;
		color: var(--color-text-secondary);
		border: 2px solid var(--glass-border);
	}

	.nav-button.secondary:hover {
		color: var(--color-text);
		border-color: var(--color-primary);
		background: var(--glass-bg);
	}

	/* ===============================================
	   RESPONSIVE DESIGN
	   =============================================== */
	@media (max-width: 768px) {
		.progress-bar {
			padding: var(--spacing-md);
		}

		.step-label {
			font-size: var(--text-xs);
		}

		.progress-connector {
			max-width: 30px;
		}

		.navigation-actions {
			flex-direction: column;
		}

		.nav-button {
			width: 100%;
			justify-content: center;
		}
	}

	@media (max-width: 480px) {
		.progress-step {
			min-width: 60px;
		}

		.step-number {
			width: 32px;
			height: 32px;
			font-size: var(--text-sm);
		}

		.step-label {
			display: none;
		}
	}
</style>
