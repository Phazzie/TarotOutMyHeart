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
  import StyleInputComponent from '$lib/components/StyleInputComponent.svelte'
  import { appStore } from '$lib/stores/appStore.svelte'
  import { goto } from '$app/navigation'

  /**
   * Move on once the style is saved. Prompts are generated on /generate, which needs
   * reference images too, so send the user back to /upload if they have none yet.
   */
  function handleContinue() {
    if (!appStore.styleInputs) return
    appStore.setCurrentPage('prompts')
    goto(appStore.uploadedImages.length > 0 ? '/generate' : '/upload')
  }
</script>

<svelte:head>
  <title>Section B · Declaration of aesthetic · Bureau of Fate</title>
  <meta name="description" content="Declare the visual style for your Major Arcana deck." />
</svelte:head>

<div class="style-page">
  <header class="window-head">
    <span class="window-plate">Window 1</span>
    <h1>Section B only</h1>
    <p class="subtitle">
      Amending your declaration of aesthetic. Exhibits (Section A) are filed on the full form.
    </p>
  </header>

  <section class="sheet style-sheet">
    <StyleInputComponent />
  </section>

  <div class="navigation-actions">
    <a href="/upload" class="stamp-btn back">← Full form (Window 1)</a>
    <button class="stamp-btn" disabled={!appStore.styleInputs} onclick={handleContinue}>
      {appStore.uploadedImages.length > 0 ? 'Submit to Window 2 →' : 'Add exhibits next →'}
    </button>
  </div>
</div>

<style>
  .style-page {
    max-width: 960px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1.75rem;
  }

  .style-sheet {
    padding: 1.75rem 2rem;
  }

  .navigation-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 1rem;
  }

  .back {
    background: var(--paper);
    text-decoration: none;
  }

  @media (max-width: 640px) {
    .style-sheet {
      padding: 1rem 0.9rem;
    }

    .navigation-actions > * {
      flex: 1 1 100%;
    }
  }
</style>
