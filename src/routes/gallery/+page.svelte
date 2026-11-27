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
  import { imageUploadService } from '$services/factory'

  // Derived state from appStore
  const hasCards = $derived(appStore.generatedCards.length > 0)
  const cardCount = $derived(appStore.generatedCards.length)
  const completedCount = $derived(appStore.completedCardCount)
  const failedCount = $derived(appStore.failedCardCount)
  const issuedOn = new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const certNo = `MA-${String(Math.floor(Math.random() * 9000) + 1000)}-${new Date().getFullYear()}`

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
  async function startOver() {
    if (
      confirm(
        'Withdraw your application? Every exhibit, declaration and issued card will be shredded. This cannot be undone.'
      )
    ) {
      // The upload service keeps its own image list (and enforces the 5-image limit
      // against it), so clear it too or the old deck's images count against the new one.
      await imageUploadService.clearAllImages()
      appStore.reset()
      goto('/')
    }
  }
</script>

<svelte:head>
  <title>Window 3 · Issuance · Bureau of Fate</title>
</svelte:head>

<div class="gallery-page">
  <header class="window-head head-row">
    <div>
      <span class="window-plate">Window 3</span>
      <h1>Issuance</h1>
      <p class="subtitle">
        Your deck has cleared processing. Inspect each card, then collect your certified copies.
      </p>
    </div>
    <button class="stamp-btn withdraw" onclick={startOver}>Withdraw application</button>
  </header>

  {#if hasCards}
    <section class="certificate" aria-label="Certificate of issuance">
      <div class="cert-inner">
        <p class="cert-kicker">Bureau of Fate · Office of Major Arcana Issuance</p>
        <h2 class="cert-title">Certificate of Issuance</h2>
        <p class="cert-body">
          This certifies that the bearer has been issued
          <strong>{completedCount} of 22</strong> Major Arcana on {issuedOn}.
          {#if failedCount > 0}
            <span class="cert-returned"
              >{failedCount} returned unillustrated and may be resubmitted at Window 2.</span
            >
          {:else if cardCount === 22}
            The deck is complete and valid for any purpose not involving the future.
          {/if}
        </p>
        <dl class="cert-stats">
          <div>
            <dt>On file</dt>
            <dd>{cardCount}/22</dd>
          </div>
          <div>
            <dt>Issued</dt>
            <dd class="ok">{completedCount}</dd>
          </div>
          <div>
            <dt>Returned</dt>
            <dd class:bad={failedCount > 0}>{failedCount}</dd>
          </div>
          <div>
            <dt>Certificate no.</dt>
            <dd class="certno">{certNo}</dd>
          </div>
        </dl>
        <span class="cert-stamp" class:partial={failedCount > 0} aria-hidden="true">
          {failedCount > 0 ? 'Partial' : 'Issued'}
        </span>
      </div>
    </section>

    <div class="issuance-grid">
      <section class="gallery-section" aria-label="Your cards">
        <h2 class="pigeon-label">Pigeonholes · click a card to inspect it</h2>
        <DeckGalleryComponent cards={appStore.generatedCards} />
      </section>

      <aside class="download-section">
        <DownloadComponent showIndividual={false} />
      </aside>
    </div>
  {:else}
    <div class="empty-state sheet">
      <p class="empty-code">Records search · Window 3</p>
      <h2>No record found</h2>
      <p>
        The clerk checked every drawer. No cards have been issued under your name yet. Window 2
        drafts and illustrates them once your application is on file.
      </p>
      <span class="void-stamp" aria-hidden="true">No record</span>
      <button class="stamp-btn" onclick={goToGenerate}>Go to Window 2 →</button>
    </div>
  {/if}
</div>

<style>
  .gallery-page {
    display: flex;
    flex-direction: column;
    gap: 1.75rem;
  }

  .head-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .withdraw {
    background: var(--paper);
    font-size: 0.85rem;
  }

  /* ---------- Certificate ---------- */
  .certificate {
    padding: 10px;
    background:
      repeating-linear-gradient(45deg, #1f4f9a 0 2px, transparent 2px 7px),
      repeating-linear-gradient(-45deg, #b8312f 0 2px, transparent 2px 7px), var(--paper);
    box-shadow: 6px 6px 0 rgba(0, 0, 0, 0.35);
  }

  .cert-inner {
    position: relative;
    padding: 1.4rem 1.5rem 1.2rem;
    background: var(--paper);
    border: 3px double var(--ink);
    color: var(--ink);
    text-align: center;
    overflow: hidden;
  }

  .cert-kicker {
    font-family: var(--font-heading);
    font-size: 0.75rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--ink-soft);
  }

  .cert-title {
    font-family: var(--font-tarot);
    font-size: clamp(1.5rem, 4vw, 2.4rem);
    margin: 0.3rem 0 0.6rem;
  }

  .cert-body {
    max-width: 62ch;
    margin: 0 auto;
    font-size: 0.95rem;
  }

  .cert-returned {
    color: var(--stamp-red);
  }

  .cert-stats {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.5rem;
    margin: 1rem auto 0;
    max-width: 720px;
    border-top: 1px solid var(--ink);
    padding-top: 0.8rem;
  }

  .cert-stats dt {
    font-family: var(--font-heading);
    font-size: 0.65rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--ink-soft);
  }

  .cert-stats dd {
    font-family: var(--font-led);
    font-size: 1.9rem;
    line-height: 1;
  }

  .cert-stats dd.ok {
    color: var(--stamp-blue);
  }

  .cert-stats dd.bad {
    color: var(--stamp-red);
  }

  .cert-stats dd.certno {
    font-size: 1.2rem;
    padding-top: 0.35rem;
  }

  .cert-stamp {
    position: absolute;
    right: 1.2rem;
    top: 1rem;
    padding: 0.15rem 0.7rem;
    border: 4px solid var(--stamp-blue);
    border-radius: 6px;
    color: var(--stamp-blue);
    font-family: var(--font-heading);
    font-weight: 700;
    font-size: 1.4rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    transform: rotate(12deg);
    opacity: 0.8;
    mix-blend-mode: multiply;
  }

  .cert-stamp.partial {
    border-color: var(--stamp-red);
    color: var(--stamp-red);
  }

  /* ---------- Layout ---------- */
  .issuance-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 300px;
    gap: 1.75rem;
    align-items: start;
  }

  .pigeon-label {
    font-family: var(--font-heading);
    font-size: 0.8rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #d9d2b6;
    margin-bottom: 0.6rem;
  }

  .download-section {
    position: sticky;
    top: 9rem;
  }

  /* ---------- Empty ---------- */
  .empty-state {
    position: relative;
    max-width: 640px;
    margin: 0 auto;
    padding: 2rem 1.75rem;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.9rem;
    overflow: hidden;
  }

  .empty-code {
    font-family: var(--font-heading);
    font-size: 0.75rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--ink-soft);
  }

  .empty-state h2 {
    font-family: var(--font-heading);
    font-size: 2rem;
    text-transform: uppercase;
  }

  .empty-state p {
    max-width: 48ch;
  }

  .void-stamp {
    position: absolute;
    top: 1.2rem;
    right: -0.5rem;
    padding: 0.1rem 0.8rem;
    border: 4px solid var(--stamp-red);
    color: var(--stamp-red);
    font-family: var(--font-heading);
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    transform: rotate(18deg);
    opacity: 0.55;
    mix-blend-mode: multiply;
  }

  @media (max-width: 960px) {
    .issuance-grid {
      grid-template-columns: minmax(0, 1fr);
    }

    .download-section {
      position: static;
      order: -1;
    }
  }

  @media (max-width: 640px) {
    .cert-inner {
      padding: 2.6rem 0.9rem 1rem;
    }

    .cert-stats {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .cert-stamp {
      font-size: 0.95rem;
      right: 0.4rem;
      top: 0.4rem;
    }

    .void-stamp {
      font-size: 0.8rem;
    }
  }
</style>
