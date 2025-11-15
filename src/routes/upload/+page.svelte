<!--
  @fileoverview Upload Page - Integrated image upload, style input, and cost estimation
  @purpose First step in deck generation workflow: collect reference images and style preferences
  @dataFlow User uploads images → appStore.uploadedImages
              User inputs style → appStore.styleInputs
              Both states → enable navigation to /generate page
  @boundary UI layer integrating three core Sprint 2 components
  @updated 2025-11-15

  This page orchestrates the complete upload workflow by integrating:
  - ImageUploadComponent: Handles reference image uploads (1-5 images)
  - StyleInputComponent: Collects style preferences (theme, tone, concept, description)
  - CostDisplayComponent: Displays estimated generation costs

  Navigation is enabled only when both images are uploaded AND style inputs are complete.
  State management is handled entirely through appStore for reactive updates.
-->

<script lang="ts">
  import ImageUploadComponent from '$lib/components/ImageUploadComponent.svelte'
  import StyleInputComponent from '$lib/components/StyleInputComponent.svelte'
  import CostDisplayComponent from '$lib/components/CostDisplayComponent.svelte'
  import { appStore } from '$lib/stores/appStore.svelte'
  import { goto } from '$app/navigation'

  /**
   * Derived state: Can user proceed to next step?
   * Prerequisites:
   * - At least 1 image uploaded
   * - Style inputs completed (non-null)
   */
  const canProceed = $derived(
    appStore.uploadedImages.length > 0 &&
    appStore.styleInputs !== null
  )

  /**
   * Handle navigation to generate page
   * Only enabled when all prerequisites are met
   */
  function handleContinue() {
    if (canProceed) {
      goto('/generate')
    }
  }
</script>

<div class="upload-page">
  <header>
    <h1>Create Your Tarot Deck</h1>
    <p>Step 1 of 3: Upload Reference Images & Define Style</p>
  </header>

  <div class="content">
    <!-- Left column: Image upload + Style input -->
    <div class="main-column">
      <section class="upload-section">
        <ImageUploadComponent />
      </section>

      <section class="style-section">
        <StyleInputComponent />
      </section>
    </div>

    <!-- Right column (sidebar): Cost display + navigation -->
    <aside class="sidebar">
      <CostDisplayComponent />

      <div class="navigation">
        <button
          class="btn-primary"
          disabled={!canProceed}
          onclick={handleContinue}
        >
          Continue to Generate Prompts →
        </button>
        <p class="help-text">
          {#if !canProceed}
            Upload images and define your style to continue
          {:else}
            Ready to generate your tarot prompts!
          {/if}
        </p>
      </div>
    </aside>
  </div>
</div>

<style>
  .upload-page {
    max-width: 1400px;
    margin: 0 auto;
    padding: 2rem;
  }

  header {
    text-align: center;
    margin-bottom: 3rem;
  }

  header h1 {
    font-size: 2.5rem;
    margin-bottom: 0.5rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  header p {
    font-size: 1.125rem;
    color: var(--color-text-secondary, #718096);
  }

  .content {
    display: grid;
    grid-template-columns: 1fr 350px;
    gap: 2rem;
    align-items: start;
  }

  .main-column {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  /* No additional styles needed - components handle their own styling */

  .sidebar {
    position: sticky;
    top: 2rem;
    height: fit-content;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .navigation {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .btn-primary {
    width: 100%;
    padding: 1rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
  }

  .btn-primary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(102, 126, 234, 0.3);
  }

  .btn-primary:active:not(:disabled) {
    transform: translateY(0);
    box-shadow: 0 4px 8px rgba(102, 126, 234, 0.2);
  }

  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: linear-gradient(135deg, #a0aec0 0%, #718096 100%);
  }

  .help-text {
    text-align: center;
    font-size: 0.9rem;
    color: var(--color-text-secondary, #a0aec0);
    margin: 0;
  }

  /* Responsive layout */
  @media (max-width: 1024px) {
    .content {
      grid-template-columns: 1fr;
    }

    .sidebar {
      position: static;
      order: -1; /* Move cost display to top on mobile */
    }
  }

  @media (max-width: 768px) {
    .upload-page {
      padding: 1rem;
    }

    header h1 {
      font-size: 2rem;
    }

    header p {
      font-size: 1rem;
    }

    .main-column {
      gap: 1.5rem;
    }

    .btn-primary {
      padding: 0.875rem;
      font-size: 0.95rem;
    }
  }
</style>
