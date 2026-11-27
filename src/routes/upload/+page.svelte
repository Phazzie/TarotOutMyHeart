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
  const canProceed = $derived(appStore.uploadedImages.length > 0 && appStore.styleInputs !== null)

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

<svelte:head>
  <title>Window 1 · Intake · Bureau of Fate</title>
</svelte:head>

<div class="upload-page">
  <div class="form-sheet sheet">
    <header class="form-head">
      <div class="form-id">
        <span class="form-code">Form MA-22</span>
        <span class="form-rev">Rev. 11/2026</span>
      </div>
      <h1>Application for issuance of a Major Arcana deck</h1>
      <p class="form-instr">
        Window 1 · Intake. Type or print clearly. Fields marked <span class="req">*</span> are required.
      </p>
      <span class="received-stamp" class:visible={canProceed} aria-hidden="true">Received</span>
    </header>

    <section class="upload-section">
      <ImageUploadComponent />
    </section>

    <section class="style-section">
      <StyleInputComponent />
    </section>
  </div>

  <aside class="sidebar">
    <CostDisplayComponent />

    <div class="navigation">
      <button class="stamp-btn submit" disabled={!canProceed} onclick={handleContinue}>
        Submit to Window 2 →
      </button>
      <p class="help-text">
        {#if !canProceed}
          The clerk needs at least one exhibit (Section A) and a filed declaration (Section B).
        {:else}
          Application complete. Window 2 will see you now.
        {/if}
      </p>
    </div>
  </aside>
</div>

<style>
  .upload-page {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 300px;
    gap: 2rem;
    align-items: start;
  }

  .form-sheet {
    padding: 1.75rem 2rem 2rem;
    display: flex;
    flex-direction: column;
    gap: 2.25rem;
  }

  .form-head {
    position: relative;
    overflow: hidden;
    border: 3px double var(--ink);
    padding: 0.9rem 1rem;
  }

  .form-id {
    display: flex;
    justify-content: space-between;
    font-family: var(--font-heading);
    font-size: 0.75rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    margin-bottom: 0.3rem;
  }

  .form-code {
    font-weight: 700;
  }

  .form-head h1 {
    font-size: clamp(1.4rem, 2.6vw, 2.1rem);
    line-height: 1.1;
    text-transform: uppercase;
    max-width: 22ch;
  }

  .form-instr {
    margin-top: 0.4rem;
    font-size: 0.85rem;
    color: var(--ink-soft);
  }

  .req {
    color: var(--stamp-red);
  }

  .received-stamp {
    position: absolute;
    right: 1rem;
    top: 50%;
    padding: 0.2rem 0.7rem;
    border: 4px solid var(--stamp-blue);
    border-radius: 6px;
    color: var(--stamp-blue);
    font-family: var(--font-heading);
    font-size: 1.6rem;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    opacity: 0;
    transform: translateY(-50%) rotate(-14deg) scale(1.6);
    transition:
      opacity 0.2s ease-out,
      transform 0.25s cubic-bezier(0.3, 1.6, 0.6, 1);
    mix-blend-mode: multiply;
    pointer-events: none;
  }

  .received-stamp.visible {
    opacity: 0.85;
    transform: translateY(-50%) rotate(-14deg) scale(1);
  }

  .sidebar {
    position: sticky;
    top: 9rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .navigation {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
  }

  .submit {
    width: 100%;
    background: var(--paper);
  }

  .help-text {
    text-align: center;
    font-size: 0.85rem;
    color: #d9d2b6;
  }

  @media (max-width: 960px) {
    .upload-page {
      grid-template-columns: minmax(0, 1fr);
    }

    .sidebar {
      position: static;
    }
  }

  @media (max-width: 640px) {
    .form-sheet {
      padding: 1rem 0.9rem 1.25rem;
      gap: 1.75rem;
    }

    .received-stamp {
      font-size: 1.1rem;
      right: 0.5rem;
    }
  }
</style>
