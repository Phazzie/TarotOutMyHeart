<!--
/**
 * @fileoverview Prompt List Component - Display and edit 22 Major Arcana card prompts
 * @purpose Shows all generated card prompts with expand/collapse and edit capabilities
 * @dataFlow appStore.generatedPrompts → Display → User edits → appStore.updatePrompt()
 * @boundary UI Component for Seam #3 (Prompt Generation)
 * @requirement PRD Sprint 2, Component 3: Prompt display and editing interface
 * @updated 2026-08-08
 *
 * Features:
 * - Accordion-style expandable cards for all 22 prompts
 * - Roman numeral badges (0. 0, I. I, II. II ... XXI. XXI)
 * - Gold leaf card status tags
 * - Quick action buttons: Enhance Prompt, Copy Prompt, Reset to Default
 * - Glass panel styling with metallic gold borders and smooth hover animations
 * - Edit mode with textarea for prompt customization
 * - Generate/regenerate functionality
 * - Visual status indicators (generated, edited, placeholder)
 * - Keyboard navigation and accessibility
 * - Mobile responsive design
 */
-->

<script lang="ts">
  import { appStore } from '$lib/stores/appStore.svelte'
  import { promptGenerationService } from '$services/factory'
  import type { CardNumber } from '$contracts/index'

  // ============================================================================
  // CONSTANTS & MAPS
  // ============================================================================

  /**
   * Roman numeral lookup for Major Arcana cards (0-21)
   */
  const ROMAN_NUMERALS: Record<number, string> = {
    0: '0',
    1: 'I',
    2: 'II',
    3: 'III',
    4: 'IV',
    5: 'V',
    6: 'VI',
    7: 'VII',
    8: 'VIII',
    9: 'IX',
    10: 'X',
    11: 'XI',
    12: 'XII',
    13: 'XIII',
    14: 'XIV',
    15: 'XV',
    16: 'XVI',
    17: 'XVII',
    18: 'XVIII',
    19: 'XIX',
    20: 'XX',
    21: 'XXI',
  }

  // ============================================================================
  // SERVICE INITIALIZATION
  // ============================================================================

  const promptService = promptGenerationService

  // ============================================================================
  // COMPONENT STATE
  // ============================================================================

  /**
   * Set of expanded card numbers
   */
  let expandedCards = $state<Set<number>>(new Set())

  /**
   * Set of cards currently being edited
   */
  let editingCards = $state<Set<number>>(new Set())

  /**
   * Map of card numbers to their edited prompt text (before save)
   */
  let editedPromptTexts = $state<Map<number, string>>(new Map())

  /**
   * Set of cards that have been user-edited
   */
  let userEditedCards = $state<Set<number>>(new Set())

  /**
   * Card number currently being regenerated (for loading state)
   */
  let regeneratingCard = $state<number | null>(null)

  /**
   * Map storing original initial generated prompts for reset functionality
   */
  let initialPromptsMap = $state<Map<number, string>>(new Map())

  /**
   * Card number that was recently copied to clipboard (for visual feedback)
   */
  let copiedCardId = $state<number | null>(null)

  // ============================================================================
  // DERIVED STATE & EFFECTS
  // ============================================================================

  /**
   * Prompts from app store (reactive)
   */
  const prompts = $derived(appStore.generatedPrompts)

  /**
   * Whether prompts are currently being generated
   */
  const isGenerating = $derived(appStore.loadingStates.generatingPrompts)

  /**
   * Whether we have all 22 prompts
   */
  const hasAllPrompts = $derived(appStore.hasAllPrompts)

  /**
   * Whether we can generate prompts (have style inputs and reference images)
   */
  const canGenerate = $derived(appStore.styleInputs !== null && appStore.uploadedImages.length > 0)

  /**
   * Sort prompts by card number for display
   */
  const sortedPrompts = $derived([...prompts].sort((a, b) => a.cardNumber - b.cardNumber))

  /**
   * Sync initial prompt states whenever prompts are loaded/updated
   */
  $effect(() => {
    let updated = false
    for (const prompt of prompts) {
      if (!initialPromptsMap.has(prompt.cardNumber)) {
        initialPromptsMap.set(prompt.cardNumber, prompt.generatedPrompt)
        updated = true
      }
    }
    if (updated) {
      initialPromptsMap = new Map(initialPromptsMap)
    }
  })

  // ============================================================================
  // GENERATE ALL PROMPTS
  // ============================================================================

  /**
   * Generate all 22 card prompts using current style inputs and reference images
   */
  async function generateAllPrompts(): Promise<void> {
    if (!canGenerate) {
      appStore.setError('Please upload reference images and define style inputs first')
      return
    }

    appStore.setLoading('generatingPrompts', true)
    appStore.clearError()

    if (!appStore.styleInputs) {
      appStore.setError('Style inputs are missing')
      return
    }

    const styleInputs = appStore.styleInputs

    try {
      const referenceImageUrls = appStore.uploadedImages.map(img => img.previewUrl)

      const response = await promptService.generatePrompts({
        referenceImageUrls,
        styleInputs,
      })

      if (response.success && response.data) {
        appStore.setGeneratedPrompts(response.data.cardPrompts)
        editingCards = new Set()
        editedPromptTexts = new Map()
        userEditedCards = new Set()
        const newInitialPrompts = new Map<number, string>()
        for (const prompt of response.data.cardPrompts) {
          newInitialPrompts.set(prompt.cardNumber, prompt.generatedPrompt)
        }
        initialPromptsMap = newInitialPrompts
      } else {
        appStore.setError(
          response.error?.message || 'Failed to generate prompts',
          response.error?.code
        )
      }
    } catch (error) {
      appStore.setError(
        error instanceof Error ? error.message : 'Unexpected error generating prompts'
      )
    } finally {
      appStore.setLoading('generatingPrompts', false)
    }
  }

  // ============================================================================
  // REGENERATE SINGLE PROMPT
  // ============================================================================

  /**
   * Regenerate a single card prompt
   */
  async function regeneratePrompt(cardNumber: CardNumber): Promise<void> {
    if (!canGenerate || !appStore.styleInputs) {
      appStore.setError('Cannot regenerate without reference images and style inputs')
      return
    }

    const styleInputs = appStore.styleInputs

    regeneratingCard = cardNumber
    appStore.clearError()

    try {
      const referenceImageUrls = appStore.uploadedImages.map(img => img.previewUrl)
      const currentPrompt = prompts.find(p => p.cardNumber === cardNumber)

      const response = await promptService.regeneratePrompt({
        cardNumber,
        referenceImageUrls,
        styleInputs,
        previousPrompt: currentPrompt?.generatedPrompt,
        feedback: 'User requested regeneration',
      })

      if (response.success && response.data) {
        appStore.updatePrompt(cardNumber, response.data.cardPrompt)
        editingCards.delete(cardNumber)
        editingCards = new Set(editingCards)
        editedPromptTexts.delete(cardNumber)
        editedPromptTexts = new Map(editedPromptTexts)
        userEditedCards.delete(cardNumber)
        userEditedCards = new Set(userEditedCards)
        initialPromptsMap.set(cardNumber, response.data.cardPrompt.generatedPrompt)
        initialPromptsMap = new Map(initialPromptsMap)
      } else {
        appStore.setError(
          response.error?.message || 'Failed to regenerate prompt',
          response.error?.code
        )
      }
    } catch (error) {
      appStore.setError(
        error instanceof Error ? error.message : 'Unexpected error regenerating prompt'
      )
    } finally {
      regeneratingCard = null
    }
  }

  // ============================================================================
  // QUICK ACTIONS: ENHANCE, COPY, RESET
  // ============================================================================

  /**
   * Enhance prompt with vivid gold leaf tarot aesthetic details
   */
  async function enhancePrompt(cardNumber: CardNumber): Promise<void> {
    const prompt = prompts.find(p => p.cardNumber === cardNumber)
    if (!prompt) return

    const enhancementSuffix =
      ', hyper-detailed tarot card artwork, metallic gold leaf linework, sacred geometry, dramatic celestial lighting, 8k resolution'
    const currentText = editingCards.has(cardNumber)
      ? editedPromptTexts.get(cardNumber) || prompt.generatedPrompt
      : prompt.generatedPrompt

    if (currentText.includes('metallic gold leaf linework')) {
      return
    }

    const enhancedText = `${currentText}${enhancementSuffix}`

    if (editingCards.has(cardNumber)) {
      editedPromptTexts.set(cardNumber, enhancedText)
      editedPromptTexts = new Map(editedPromptTexts)
    } else {
      try {
        const response = await promptService.editPrompt({
          promptId: prompt.id,
          editedPrompt: enhancedText,
        })
        if (response.success && response.data) {
          appStore.updatePrompt(cardNumber, response.data.cardPrompt)
          userEditedCards.add(cardNumber)
          userEditedCards = new Set(userEditedCards)
        } else {
          appStore.setError(
            response.error?.message || 'Failed to enhance prompt',
            response.error?.code
          )
        }
      } catch (error) {
        appStore.setError(
          error instanceof Error ? error.message : 'Unexpected error enhancing prompt'
        )
      }
    }
  }

  /**
   * Copy prompt text to clipboard
   */
  async function copyPrompt(cardNumber: number, text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text)
      copiedCardId = cardNumber
      setTimeout(() => {
        if (copiedCardId === cardNumber) {
          copiedCardId = null
        }
      }, 2000)
    } catch {
      appStore.setError('Failed to copy prompt to clipboard')
    }
  }

  /**
   * Reset prompt to original default generated state
   */
  async function resetToDefault(cardNumber: CardNumber): Promise<void> {
    const prompt = prompts.find(p => p.cardNumber === cardNumber)
    if (!prompt) return

    const originalText = initialPromptsMap.get(cardNumber) || prompt.traditionalMeaning

    try {
      const response = await promptService.editPrompt({
        promptId: prompt.id,
        editedPrompt: originalText,
      })

      if (response.success && response.data) {
        appStore.updatePrompt(cardNumber, response.data.cardPrompt)
        userEditedCards.delete(cardNumber)
        userEditedCards = new Set(userEditedCards)
        editingCards.delete(cardNumber)
        editingCards = new Set(editingCards)
        editedPromptTexts.delete(cardNumber)
        editedPromptTexts = new Map(editedPromptTexts)
      } else {
        appStore.setError(response.error?.message || 'Failed to reset prompt', response.error?.code)
      }
    } catch (error) {
      appStore.setError(
        error instanceof Error ? error.message : 'Unexpected error resetting prompt'
      )
    }
  }

  // ============================================================================
  // EXPAND/COLLAPSE & EDITING
  // ============================================================================

  function toggleExpand(cardNumber: number): void {
    if (expandedCards.has(cardNumber)) {
      expandedCards.delete(cardNumber)
      expandedCards = new Set(expandedCards)
    } else {
      expandedCards.add(cardNumber)
      expandedCards = new Set(expandedCards)
    }
  }

  function handleCardKeydown(event: KeyboardEvent, cardNumber: number): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      toggleExpand(cardNumber)
    }
  }

  function startEditing(cardNumber: number): void {
    const prompt = prompts.find(p => p.cardNumber === cardNumber)
    if (prompt) {
      editedPromptTexts.set(cardNumber, prompt.generatedPrompt)
      editedPromptTexts = new Map(editedPromptTexts)
      editingCards.add(cardNumber)
      editingCards = new Set(editingCards)
    }
  }

  function cancelEditing(cardNumber: number): void {
    editingCards.delete(cardNumber)
    editedPromptTexts.delete(cardNumber)
    editingCards = new Set(editingCards)
    editedPromptTexts = new Map(editedPromptTexts)
  }

  async function saveEdit(cardNumber: number): Promise<void> {
    const editedText = editedPromptTexts.get(cardNumber)
    const prompt = prompts.find(p => p.cardNumber === cardNumber)

    if (!editedText || !prompt) return

    appStore.clearError()

    try {
      const response = await promptService.editPrompt({
        promptId: prompt.id,
        editedPrompt: editedText,
      })

      if (response.success && response.data) {
        appStore.updatePrompt(cardNumber, response.data.cardPrompt)
        userEditedCards.add(cardNumber)
        userEditedCards = new Set(userEditedCards)
        editingCards.delete(cardNumber)
        editedPromptTexts.delete(cardNumber)
        editingCards = new Set(editingCards)
        editedPromptTexts = new Map(editedPromptTexts)
      } else {
        appStore.setError(response.error?.message || 'Failed to save edit', response.error?.code)
      }
    } catch (error) {
      appStore.setError(error instanceof Error ? error.message : 'Unexpected error saving edit')
    }
  }

  function updateEditText(cardNumber: number, text: string): void {
    editedPromptTexts.set(cardNumber, text)
    editedPromptTexts = new Map(editedPromptTexts)
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  function getCardStatus(cardNumber: number): 'placeholder' | 'generated' | 'edited' {
    if (!prompts.find(p => p.cardNumber === cardNumber)) return 'placeholder'
    if (userEditedCards.has(cardNumber)) return 'edited'
    return 'generated'
  }

  function getRomanBadgeText(cardNumber: number): string {
    return ROMAN_NUMERALS[cardNumber] ?? String(cardNumber)
  }

  function truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  function getConfidenceColor(confidence: number): string {
    if (confidence >= 0.9) return 'text-green-600'
    if (confidence >= 0.75) return 'text-yellow-600'
    return 'text-red-600'
  }
</script>

<!-- ============================================================================ -->
<!-- TEMPLATE -->
<!-- ============================================================================ -->

<div class="prompt-list-container">
  <!-- Header with Generate Button -->
  <div class="header">
    <div class="title-group">
      <h2 class="title">Case files <span class="count">{prompts.length}/22</span></h2>
      <span class="gold-subtitle">One per Major Arcana. Read, amend, or redraft any of them.</span>
    </div>
    <button
      type="button"
      class="generate-button"
      onclick={generateAllPrompts}
      disabled={!canGenerate || isGenerating}
    >
      {#if isGenerating}
        <span class="spinner" aria-hidden="true"></span>
        The clerk is drafting…
      {:else if hasAllPrompts}
        Redraft all case files
      {:else}
        Draft all 22 case files
      {/if}
    </button>
  </div>

  <!-- Status Message -->
  {#if !canGenerate}
    <div class="status-message warning" role="alert">
      No application on file. Complete Form MA-22 at Window 1 (exhibits and a declaration of
      aesthetic) first.
    </div>
  {:else if prompts.length === 0}
    <div class="status-message info" role="status">
      Your application is on file. Ask the clerk to draft the case files.
    </div>
  {/if}

  <!-- Prompt Cards -->
  <div class="prompt-cards" role="list">
    {#each sortedPrompts as prompt (prompt.id)}
      {@const isExpanded = expandedCards.has(prompt.cardNumber)}
      {@const isEditing = editingCards.has(prompt.cardNumber)}
      {@const status = getCardStatus(prompt.cardNumber)}
      {@const isRegenerating = regeneratingCard === prompt.cardNumber}
      {@const romanBadgeText = getRomanBadgeText(prompt.cardNumber)}
      {@const activePromptText = isEditing
        ? editedPromptTexts.get(prompt.cardNumber) || prompt.generatedPrompt
        : prompt.generatedPrompt}

      <div
        class="prompt-card {status}"
        role="listitem"
        aria-label="Card {prompt.cardNumber}: {prompt.cardName}"
      >
        <!-- Card Header (Always Visible) -->
        <div
          class="card-header"
          role="button"
          tabindex="0"
          onclick={() => toggleExpand(prompt.cardNumber)}
          onkeydown={e => handleCardKeydown(e, prompt.cardNumber)}
          aria-expanded={isExpanded}
          aria-controls="card-content-{prompt.cardNumber}"
        >
          <div class="card-header-content">
            <!-- Roman Numeral Badge -->
            <!-- Case numbers are the card's arcana number: MA-00 is The Fool, MA-21 The World. -->
            <div
              class="roman-badge"
              aria-label="Case MA-{String(prompt.cardNumber).padStart(2, '0')}"
            >
              <span class="roman-leaf-icon" aria-hidden="true"
                >MA-{String(prompt.cardNumber).padStart(2, '0')}</span
              >
              <span class="roman-text">{romanBadgeText}</span>
            </div>

            <div class="card-info">
              <h3 class="card-name">{prompt.cardName}</h3>
              <p class="card-meaning">{prompt.traditionalMeaning}</p>
            </div>

            <!-- Gold Leaf Status Tag -->
            <div class="card-status-badge" aria-label="Status: {status}">
              <span class="badge-gold-leaf {status}">
                {#if status === 'edited'}
                  Amended
                {:else if status === 'generated'}
                  Drafted
                {:else}
                  Pending
                {/if}
              </span>
            </div>
          </div>
          <div class="expand-icon" aria-hidden="true">
            {isExpanded ? '▼' : '▶'}
          </div>
        </div>

        <!-- Collapsed Preview -->
        {#if !isExpanded}
          <div class="card-preview">
            {truncate(prompt.generatedPrompt, 110)}
          </div>
        {/if}

        <!-- Expanded Content -->
        {#if isExpanded}
          <div class="card-content" id="card-content-{prompt.cardNumber}">
            <!-- Metadata -->
            <div class="card-metadata">
              <div class="metadata-item">
                <strong>Clerk's confidence:</strong>
                <span class={getConfidenceColor(prompt.confidence)}>
                  {(prompt.confidence * 100).toFixed(0)}%
                </span>
              </div>
              <div class="metadata-item">
                <strong>Drafted:</strong>
                {new Date(prompt.generatedAt).toLocaleString()}
              </div>
            </div>

            <!-- Prompt Display/Edit -->
            {#if isEditing}
              <!-- Edit Mode -->
              <div class="edit-container">
                <label for="edit-{prompt.cardNumber}" class="sr-only">
                  Edit prompt for {prompt.cardName}
                </label>
                <textarea
                  id="edit-{prompt.cardNumber}"
                  class="prompt-textarea"
                  value={editedPromptTexts.get(prompt.cardNumber) || ''}
                  oninput={e => updateEditText(prompt.cardNumber, e.currentTarget.value)}
                  rows="8"
                  aria-label="Edit prompt text"
                ></textarea>
                <div class="edit-actions">
                  <button
                    type="button"
                    class="button-save"
                    onclick={() => saveEdit(prompt.cardNumber)}
                    aria-label="File amendment"
                  >
                    File amendment
                  </button>
                  <button
                    type="button"
                    class="button-cancel"
                    onclick={() => cancelEditing(prompt.cardNumber)}
                    aria-label="Cancel editing"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            {:else}
              <!-- Display Mode -->
              <div class="prompt-display">
                <p class="prompt-text">{prompt.generatedPrompt}</p>
              </div>
            {/if}

            <!-- Quick Action Buttons & Standard Actions -->
            <div class="actions-section">
              <div class="quick-action-buttons">
                <button
                  type="button"
                  class="quick-btn enhance-btn"
                  onclick={() => enhancePrompt(prompt.cardNumber)}
                  aria-label="Embellish case file for {prompt.cardName}"
                >
                  Embellish
                </button>
                <button
                  type="button"
                  class="quick-btn copy-btn"
                  onclick={() => copyPrompt(prompt.cardNumber, activePromptText)}
                  aria-label="Copy case file for {prompt.cardName}"
                >
                  {#if copiedCardId === prompt.cardNumber}
                    Copied
                  {:else}
                    Copy text
                  {/if}
                </button>
                <button
                  type="button"
                  class="quick-btn reset-btn"
                  onclick={() => resetToDefault(prompt.cardNumber)}
                  aria-label="Restore original case file for {prompt.cardName}"
                >
                  Restore original
                </button>
              </div>

              {#if !isEditing}
                <div class="card-actions">
                  <button
                    type="button"
                    class="button-edit"
                    onclick={() => startEditing(prompt.cardNumber)}
                    aria-label="Amend case file for {prompt.cardName}"
                  >
                    Amend
                  </button>
                  <button
                    type="button"
                    class="button-regenerate"
                    onclick={() => regeneratePrompt(prompt.cardNumber)}
                    disabled={isRegenerating || !canGenerate}
                    aria-label="Redraft case file for {prompt.cardName}"
                  >
                    {#if isRegenerating}
                      <span class="spinner-small" aria-hidden="true"></span>
                      Redrafting…
                    {:else}
                      Redraft
                    {/if}
                  </button>
                </div>
              {/if}
            </div>
          </div>
        {/if}
      </div>
    {/each}
  </div>

  <!-- Empty State -->
  {#if prompts.length === 0 && canGenerate}
    <div class="empty-state" role="status">
      <p class="empty-icon" aria-hidden="true">∅</p>
      <p class="empty-text">No case files yet</p>
      <p class="empty-subtext">
        The clerk writes one illustration brief per card, from The Fool (MA-00) to The World
        (MA-21), using your exhibits and declaration.
      </p>
    </div>
  {/if}
</div>

<!-- ============================================================================ -->
<!-- STYLES -->
<!-- ============================================================================ -->

<style>
  .prompt-list-container {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    flex-wrap: wrap;
    gap: 1rem;
    border-bottom: 2px solid var(--ink);
    padding-bottom: 0.6rem;
  }

  .title {
    font-size: 1.5rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .count {
    font-family: var(--font-typed);
    font-size: 1rem;
    color: var(--stamp-red);
    margin-left: 0.4rem;
  }

  .gold-subtitle {
    display: block;
    font-size: 0.85rem;
    color: var(--ink-soft);
  }

  .generate-button {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.6rem 1.1rem;
    background: var(--stamp-blue);
    border: 2px solid var(--stamp-blue);
    color: #fff;
    font-family: var(--font-heading);
    font-size: 0.95rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    cursor: pointer;
  }

  .generate-button:hover:not(:disabled) {
    background: #173d78;
  }

  .generate-button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .spinner,
  .spinner-small {
    display: inline-block;
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255, 255, 255, 0.4);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  .spinner-small {
    border-color: rgba(0, 0, 0, 0.2);
    border-top-color: var(--ink);
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .status-message {
    padding: 0.7rem 0.9rem;
    border: 2px solid;
    font-size: 0.9rem;
  }

  .status-message.warning {
    border-color: var(--stamp-red);
    background: var(--carbon-pink);
    color: #7d1f1c;
  }

  .status-message.info {
    border-color: var(--stamp-blue);
    background: #e3eaf6;
    color: #173d78;
  }

  .prompt-cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 330px), 1fr));
    gap: 1.6rem 1rem;
    padding-top: 0.9rem;
  }

  /* Each case file is a manila folder with a tab. */
  .prompt-card {
    position: relative;
    background: var(--manila);
    border: 1px solid var(--manila-dark);
    box-shadow: 0 6px 10px -8px rgba(0, 0, 0, 0.6);
  }

  .prompt-card::before {
    content: '';
    position: absolute;
    top: -14px;
    left: 0;
    width: 42%;
    height: 15px;
    background: var(--manila);
    border: 1px solid var(--manila-dark);
    border-bottom: none;
    border-radius: 6px 6px 0 0;
  }

  .card-header {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    padding: 0.6rem 0.75rem 0.4rem;
    cursor: pointer;
  }

  .card-header:focus-visible {
    outline-offset: -3px;
  }

  .card-header-content {
    flex: 1;
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: start;
    gap: 0.6rem;
    min-width: 0;
  }

  .roman-badge {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0.15rem 0.35rem;
    border: 1px solid var(--ink);
    background: var(--paper);
    line-height: 1.05;
  }

  .roman-leaf-icon {
    font-family: var(--font-heading);
    font-size: 0.55rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .roman-text {
    font-family: var(--font-typed);
    font-size: 0.85rem;
  }

  .card-info {
    min-width: 0;
  }

  .card-name {
    font-family: var(--font-tarot);
    font-size: 1rem;
    letter-spacing: 0.02em;
  }

  .card-meaning {
    font-size: 0.75rem;
    color: #5a4a23;
  }

  .badge-gold-leaf {
    display: inline-block;
    padding: 0.05rem 0.35rem;
    border: 2px solid;
    font-family: var(--font-heading);
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    transform: rotate(-6deg);
  }

  .badge-gold-leaf.generated {
    color: var(--stamp-blue);
  }

  .badge-gold-leaf.edited {
    color: #2f6b3d;
  }

  .badge-gold-leaf.placeholder {
    color: #7d7462;
  }

  .expand-icon {
    font-size: 0.7rem;
    padding-top: 0.2rem;
    color: #5a4a23;
  }

  /* The typed sheet inside the folder. */
  .card-preview,
  .card-content {
    margin: 0 0.5rem 0.6rem;
    padding: 0.6rem 0.7rem;
    background: var(--paper);
    border: 1px solid #d8cfb6;
    font-family: var(--font-typed);
    font-size: 0.85rem;
    line-height: 1.45;
  }

  .card-content {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .card-metadata {
    display: flex;
    flex-wrap: wrap;
    gap: 0.2rem 1rem;
    font-family: var(--font-body);
    font-size: 0.75rem;
    color: var(--ink-soft);
  }

  .text-green-600 {
    color: #24542f;
  }

  .text-yellow-600 {
    color: #8a5a00;
  }

  .text-red-600 {
    color: var(--stamp-red);
  }

  .prompt-text {
    white-space: pre-wrap;
  }

  .prompt-textarea {
    width: 100%;
    padding: 0.4rem;
    border: 1px solid var(--ink-soft);
    background: #fffbe8;
    font-family: var(--font-typed);
    font-size: 0.9rem;
    line-height: 1.5;
    resize: vertical;
  }

  .edit-actions,
  .quick-action-buttons,
  .card-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }

  .actions-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    font-family: var(--font-body);
  }

  .quick-btn,
  .button-edit,
  .button-regenerate,
  .button-save,
  .button-cancel {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.3rem 0.65rem;
    background: transparent;
    border: 1px solid var(--ink-soft);
    color: var(--ink);
    font-family: var(--font-heading);
    font-size: 0.78rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    cursor: pointer;
  }

  .quick-btn:hover,
  .button-edit:hover,
  .button-cancel:hover {
    background: #ece4cd;
  }

  .button-save,
  .button-regenerate {
    border-color: var(--stamp-blue);
    color: var(--stamp-blue);
  }

  .button-save:hover,
  .button-regenerate:hover:not(:disabled) {
    background: var(--stamp-blue);
    color: #fff;
  }

  .button-regenerate:disabled {
    opacity: 0.5;
    cursor: not-allowed;
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

  .empty-state {
    padding: 1.5rem 1rem;
    border: 2px dashed #b8ab88;
    text-align: center;
  }

  .empty-icon {
    font-family: var(--font-heading);
    font-size: 2rem;
    color: #8f8670;
  }

  .empty-text {
    font-family: var(--font-heading);
    font-size: 1.1rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .empty-subtext {
    max-width: 52ch;
    margin: 0.3rem auto 0;
    font-size: 0.85rem;
    color: var(--ink-soft);
  }
</style>
