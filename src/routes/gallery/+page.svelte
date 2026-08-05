<!--
/**
 * @fileoverview Gallery Page - Final step in tarot deck generation workflow
 * @purpose Display all 22 generated cards with download and viewing capabilities
 * @dataFlow appStore.generatedCards → DeckGalleryComponent (view) → DownloadComponent (export)
 * @boundary Page-level integration: combines gallery viewing + download features
 * @updated 2025-11-15
 *
 * This page is the final destination (Step 3/3) where users:
 * - View all 22 Major Arcana cards in a responsive grid
 * - See deck generation statistics (total/completed/failed counts)
 * - Download individual cards or entire deck as ZIP
 * - Start over to generate a new deck
 *
 * Empty state handling:
 * - If no cards generated yet, shows empty state with "Go to Generate" button
 * - Redirects users to the generation page to create their deck
 *
 * Data flow:
 * - appStore.generatedCards → passes to DeckGalleryComponent for display
 * - DeckGalleryComponent handles lightbox, individual downloads
 * - DownloadComponent handles ZIP export of all cards
 * - Statistics computed from appStore reactive state
 *
 * Integration points:
 * - DeckGalleryComponent: Grid display with lightbox functionality
 * - DownloadComponent: Batch download capabilities
 * - appStore: Reactive state management for cards and stats
 * - Navigation: goto() for routing to other pages
 */
-->

<script lang="ts">
  import DeckGalleryComponent from '$lib/components/DeckGalleryComponent.svelte'
  import DownloadComponent from '$lib/components/DownloadComponent.svelte'
  import { appStore } from '$lib/stores/appStore.svelte'
  import { goto } from '$app/navigation'

  // Derived state from appStore
  const hasCards = $derived(appStore.generatedCards.length > 0)
  const cardCount = $derived(appStore.generatedCards.length)
  const completedCount = $derived(appStore.completedCardCount)
  const failedCount = $derived(appStore.failedCardCount)

  /**
   * Navigate to generate page
   */
  function goToGenerate() {
    goto('/generate')
  }

  /**
   * Reset entire app state and return to home
   * Confirms with user before clearing all work
   */
  function startOver() {
    if (confirm('Are you sure you want to start over? This will clear all your work.')) {
      appStore.reset()
      goto('/')
    }
  }
</script>

<div class="gallery-page">
  <header>
    <div class="header-content">
      <div>
        <h1>Your Tarot Deck</h1>
        <p>Step 3 of 3: View & Download Your Cards</p>
      </div>
      <div class="header-actions">
        <button class="btn-secondary" onclick={startOver}> Start Over </button>
      </div>
    </div>
  </header>

  {#if hasCards}
    <!-- Deck Statistics -->
    <section class="stats-section">
      <div class="stat-card">
        <span class="stat-label">Total Cards</span>
        <span class="stat-value">{cardCount}/22</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Completed</span>
        <span class="stat-value completed">{completedCount}</span>
      </div>
      {#if failedCount > 0}
        <div class="stat-card">
          <span class="stat-label">Failed</span>
          <span class="stat-value failed">{failedCount}</span>
        </div>
      {/if}
    </section>

    <!-- Download Section -->
    <section class="download-section">
      <DownloadComponent />
    </section>

    <!-- Gallery Section -->
    <section class="gallery-section">
      <DeckGalleryComponent cards={appStore.generatedCards} />
    </section>
  {:else}
    <!-- Empty State -->
    <div class="empty-state">
      <div class="empty-icon">🎴</div>
      <h2>No Cards Generated Yet</h2>
      <p>Generate your tarot deck to see it here.</p>
      <button class="btn-primary" onclick={goToGenerate}> Go to Generate → </button>
    </div>
  {/if}
</div>

<style>
  .gallery-page {
    max-width: 1400px;
    margin: 0 auto;
    padding: 2rem;
  }

  header {
    margin-bottom: 2rem;
  }

  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .header-actions {
    display: flex;
    gap: 1rem;
  }

  h1 {
    font-size: 2.5rem;
    margin-bottom: 0.5rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  header p {
    color: var(--color-text-secondary, #a0aec0);
    font-size: 1.125rem;
  }

  /* Statistics */
  .stats-section {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .stat-card {
    background: rgba(139, 92, 246, 0.1);
    border: 1px solid rgba(139, 92, 246, 0.2);
    border-radius: 12px;
    padding: 1.5rem;
    text-align: center;
  }

  .stat-label {
    display: block;
    font-size: 0.9rem;
    color: var(--color-text-secondary, #a0aec0);
    margin-bottom: 0.5rem;
  }

  .stat-value {
    display: block;
    font-size: 2rem;
    font-weight: bold;
    color: var(--color-primary, #7c3aed);
  }

  .stat-value.completed {
    color: #10b981;
  }

  .stat-value.failed {
    color: #ef4444;
  }

  /* Sections */
  .download-section {
    margin-bottom: 3rem;
  }

  /* Gallery component has its own styling */

  /* Empty State */
  .empty-state {
    text-align: center;
    padding: 4rem 2rem;
  }

  .empty-icon {
    font-size: 5rem;
    margin-bottom: 1rem;
  }

  .empty-state h2 {
    font-size: 2rem;
    margin-bottom: 1rem;
    color: var(--color-text-primary, #2d3748);
  }

  .empty-state p {
    font-size: 1.125rem;
    color: var(--color-text-secondary, #a0aec0);
    margin-bottom: 2rem;
  }

  /* Buttons */
  .btn-primary,
  .btn-secondary {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    cursor: pointer;
    transition:
      transform 0.2s,
      box-shadow 0.2s;
  }

  .btn-primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);
  }

  .btn-secondary {
    background: rgba(139, 92, 246, 0.1);
    border: 1px solid rgba(139, 92, 246, 0.3);
    color: var(--color-primary, #7c3aed);
  }

  .btn-primary:hover,
  .btn-secondary:hover {
    transform: translateY(-2px);
  }

  .btn-primary:hover {
    box-shadow: 0 6px 12px rgba(102, 126, 234, 0.4);
  }

  .btn-secondary:hover {
    background: rgba(139, 92, 246, 0.15);
  }

  /* Responsive */
  @media (max-width: 768px) {
    .gallery-page {
      padding: 1rem;
    }

    .header-content {
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
    }

    h1 {
      font-size: 2rem;
    }

    header p {
      font-size: 1rem;
    }

    .header-actions {
      width: 100%;
    }

    .btn-secondary {
      flex: 1;
    }

    .stats-section {
      grid-template-columns: 1fr;
    }

    .empty-state {
      padding: 2rem 1rem;
    }

    .empty-icon {
      font-size: 4rem;
    }

    .empty-state h2 {
      font-size: 1.5rem;
    }

    .empty-state p {
      font-size: 1rem;
    }
  }
</style>
