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
  const editedPromptTexts = $state<Map<number, string>>(new Map())

  /**
   * Set of cards that have been user-edited
   */
  const userEditedCards = $state<Set<number>>(new Set())

  /**
   * Card number currently being regenerated (for loading state)
   */
  let regeneratingCard = $state<number | null>(null)

  /**
   * Map storing original initial generated prompts for reset functionality
   */
  const initialPromptsMap = $state<Map<number, string>>(new Map())

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
    for (const prompt of prompts) {
      if (!initialPromptsMap.has(prompt.cardNumber)) {
        initialPromptsMap.set(prompt.cardNumber, prompt.generatedPrompt)
      }
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
        editingCards.clear()
        editedPromptTexts.clear()
        userEditedCards.clear()
        initialPromptsMap.clear()

        for (const prompt of response.data.cardPrompts) {
          initialPromptsMap.set(prompt.cardNumber, prompt.generatedPrompt)
        }
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
        editedPromptTexts.delete(cardNumber)
        userEditedCards.delete(cardNumber)
        initialPromptsMap.set(cardNumber, response.data.cardPrompt.generatedPrompt)
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
    } else {
      try {
        const response = await promptService.editPrompt({
          promptId: prompt.id,
          editedPrompt: enhancedText,
        })
        if (response.success && response.data) {
          appStore.updatePrompt(cardNumber, response.data.cardPrompt)
          userEditedCards.add(cardNumber)
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
        editingCards.delete(cardNumber)
        editedPromptTexts.delete(cardNumber)
        editingCards = editingCards
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
      expandedCards = expandedCards
    } else {
      expandedCards.add(cardNumber)
      expandedCards = expandedCards
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
      editingCards.add(cardNumber)
      editingCards = editingCards
    }
  }

  function cancelEditing(cardNumber: number): void {
    editingCards.delete(cardNumber)
    editedPromptTexts.delete(cardNumber)
    editingCards = editingCards
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
        editingCards.delete(cardNumber)
        editedPromptTexts.delete(cardNumber)
        editingCards = editingCards
      } else {
        appStore.setError(response.error?.message || 'Failed to save edit', response.error?.code)
      }
    } catch (error) {
      appStore.setError(error instanceof Error ? error.message : 'Unexpected error saving edit')
    }
  }

  function updateEditText(cardNumber: number, text: string): void {
    editedPromptTexts.set(cardNumber, text)
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
    const roman = ROMAN_NUMERALS[cardNumber] ?? String(cardNumber)
    if (cardNumber === 0) return '0. 0'
    return `${roman}. ${roman}`
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
      <h2 class="title">Card Prompts ({prompts.length}/22)</h2>
      <span class="gold-subtitle">Major Arcana Gold Leaf Edition</span>
    </div>
    <button
      type="button"
      class="generate-button"
      onclick={generateAllPrompts}
      disabled={!canGenerate || isGenerating}
      aria-label={hasAllPrompts ? 'Regenerate all prompts' : 'Generate all prompts'}
    >
      {#if isGenerating}
        <span class="spinner" aria-hidden="true"></span>
        Generating...
      {:else if hasAllPrompts}
        ✨ Regenerate All
      {:else}
        ✨ Generate All Prompts
      {/if}
    </button>
  </div>

  <!-- Status Message -->
  {#if !canGenerate}
    <div class="status-message warning" role="alert">
      Please upload reference images and define style inputs before generating prompts.
    </div>
  {:else if prompts.length === 0}
    <div class="status-message info" role="status">
      Ready to generate prompts. Click "Generate All Prompts" to begin.
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
            <div class="roman-badge" aria-label="Roman numeral badge {romanBadgeText}">
              <span class="roman-leaf-icon" aria-hidden="true">⚜</span>
              <span class="roman-text">{romanBadgeText}</span>
            </div>

            <div class="card-info">
              <h3 class="card-name">{prompt.cardName}</h3>
              <p class="card-meaning">{prompt.traditionalMeaning}</p>
            </div>

            <!-- Gold Leaf Status Tag -->
            <div class="card-status-badge" aria-label="Status: {status}">
              <span class="badge-gold-leaf {status}">
                <span class="gold-leaf-sparkle" aria-hidden="true">✨</span>
                {#if status === 'edited'}
                  Edited
                {:else if status === 'generated'}
                  Generated
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
                <strong>Confidence:</strong>
                <span class={getConfidenceColor(prompt.confidence)}>
                  {(prompt.confidence * 100).toFixed(0)}%
                </span>
              </div>
              <div class="metadata-item">
                <strong>Generated:</strong>
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
                    aria-label="Save changes"
                  >
                    Save
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
                  aria-label="Enhance prompt for {prompt.cardName}"
                >
                  ✨ Enhance Prompt
                </button>
                <button
                  type="button"
                  class="quick-btn copy-btn"
                  onclick={() => copyPrompt(prompt.cardNumber, activePromptText)}
                  aria-label="Copy prompt for {prompt.cardName}"
                >
                  {#if copiedCardId === prompt.cardNumber}
                    ✓ Copied!
                  {:else}
                    📋 Copy Prompt
                  {/if}
                </button>
                <button
                  type="button"
                  class="quick-btn reset-btn"
                  onclick={() => resetToDefault(prompt.cardNumber)}
                  aria-label="Reset prompt for {prompt.cardName} to default"
                >
                  🔄 Reset to Default
                </button>
              </div>

              {#if !isEditing}
                <div class="card-actions">
                  <button
                    type="button"
                    class="button-edit"
                    onclick={() => startEditing(prompt.cardNumber)}
                    aria-label="Edit prompt for {prompt.cardName}"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    class="button-regenerate"
                    onclick={() => regeneratePrompt(prompt.cardNumber)}
                    disabled={isRegenerating || !canGenerate}
                    aria-label="Regenerate prompt for {prompt.cardName}"
                  >
                    {#if isRegenerating}
                      <span class="spinner-small" aria-hidden="true"></span>
                      Regenerating...
                    {:else}
                      Regenerate
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
      <p class="empty-icon" aria-hidden="true">✨</p>
      <p class="empty-text">No prompts generated yet</p>
      <p class="empty-subtext">
        Click "Generate All Prompts" to create AI-generated prompts for all 22 Major Arcana cards
      </p>
    </div>
  {/if}
</div>

<!-- ============================================================================ -->
<!-- STYLES -->
<!-- ============================================================================ -->

<style>
  /* Container with Subtle Glass Backing */
  .prompt-list-container {
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem 1rem;
  }

  /* Header */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .title-group {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .title {
    font-size: 1.875rem;
    font-weight: 700;
    color: #4c1d95;
    margin: 0;
  }

  .gold-subtitle {
    font-size: 0.875rem;
    font-weight: 600;
    color: #b45309;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  /* Generate Button */
  .generate-button {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    background: linear-gradient(135deg, #6d28d9 0%, #b45309 50%, #d97706 100%);
    color: white;
    border: 1px solid #fef3c7;
    border-radius: 0.5rem;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.25s ease;
    box-shadow: 0 4px 12px rgba(180, 83, 9, 0.35);
  }

  .generate-button:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 18px rgba(180, 83, 9, 0.45);
    filter: brightness(1.08);
  }

  .generate-button:active:not(:disabled) {
    transform: translateY(0);
  }

  .generate-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Status Messages */
  .status-message {
    padding: 1rem;
    border-radius: 0.5rem;
    margin-bottom: 1.5rem;
  }

  .status-message.warning {
    background-color: #fef3c7;
    border: 1px solid #f59e0b;
    color: #92400e;
  }

  .status-message.info {
    background-color: #dbeafe;
    border: 1px solid #3b82f6;
    color: #1e40af;
  }

  /* Prompt Cards Container */
  .prompt-cards {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  /* Glass Panel & Metallic Gold Border Styling */
  .prompt-card {
    background: rgba(255, 255, 255, 0.75);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1.5px solid rgba(212, 175, 55, 0.45);
    border-radius: 0.875rem;
    overflow: hidden;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    box-shadow:
      0 4px 20px rgba(0, 0, 0, 0.05),
      inset 0 0 0 1px rgba(255, 215, 0, 0.2);
  }

  .prompt-card:hover {
    transform: translateY(-3px);
    border-color: rgba(212, 175, 55, 0.85);
    box-shadow:
      0 12px 32px rgba(212, 175, 55, 0.25),
      inset 0 0 12px rgba(255, 215, 0, 0.3);
  }

  .prompt-card.generated {
    border-color: rgba(212, 175, 55, 0.65);
  }

  .prompt-card.edited {
    border-color: rgba(245, 158, 11, 0.85);
    background: rgba(254, 243, 199, 0.7);
  }

  .prompt-card.placeholder {
    border-color: #d1d5db;
    opacity: 0.7;
  }

  /* Card Header */
  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.25rem;
    cursor: pointer;
    user-select: none;
    background: linear-gradient(135deg, rgba(250, 245, 255, 0.9) 0%, rgba(254, 243, 199, 0.4) 100%);
  }

  .card-header:hover {
    background: linear-gradient(
      135deg,
      rgba(243, 232, 255, 0.95) 0%,
      rgba(254, 243, 199, 0.6) 100%
    );
  }

  .card-header:focus {
    outline: 2px solid #b45309;
    outline-offset: -2px;
  }

  .card-header-content {
    display: flex;
    align-items: center;
    gap: 1.25rem;
    flex: 1;
  }

  /* Roman Numeral Badges */
  .roman-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.4rem 0.75rem;
    background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);
    border: 1px solid rgba(212, 175, 55, 0.75);
    border-radius: 0.5rem;
    color: #fef08a;
    font-weight: 700;
    font-size: 0.875rem;
    letter-spacing: 0.05em;
    box-shadow:
      0 2px 6px rgba(30, 27, 75, 0.3),
      inset 0 0 6px rgba(255, 215, 0, 0.25);
    flex-shrink: 0;
  }

  .roman-leaf-icon {
    color: #fbbf24;
    font-size: 0.75rem;
  }

  .roman-text {
    font-family: serif;
  }

  /* Card Info */
  .card-info {
    flex: 1;
    min-width: 0;
  }

  .card-name {
    font-size: 1.25rem;
    font-weight: 700;
    color: #1f2937;
    margin: 0 0 0.25rem 0;
  }

  .card-meaning {
    font-size: 0.875rem;
    color: #4b5563;
    margin: 0;
  }

  /* Gold Leaf Card Status Tag */
  .card-status-badge {
    flex-shrink: 0;
  }

  .badge-gold-leaf {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.35rem 0.85rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    background: linear-gradient(
      135deg,
      #bf953f 0%,
      #fcf6ba 25%,
      #b38728 50%,
      #fbf5b7 75%,
      #aa771c 100%
    );
    color: #2a1b00;
    border: 1px solid #d4af37;
    box-shadow:
      0 2px 6px rgba(170, 119, 28, 0.35),
      inset 0 1px 0 rgba(255, 255, 255, 0.6);
    text-shadow: 0 1px 0 rgba(255, 255, 255, 0.4);
    transition: all 0.2s ease;
  }

  .badge-gold-leaf:hover {
    filter: brightness(1.08);
    box-shadow: 0 4px 10px rgba(170, 119, 28, 0.45);
  }

  .badge-gold-leaf.edited {
    background: linear-gradient(135deg, #e6a100 0%, #fff3b0 30%, #c48200 60%, #ffd966 100%);
    color: #3b2000;
  }

  .badge-gold-leaf.placeholder {
    background: linear-gradient(135deg, #d1d5db 0%, #f3f4f6 50%, #9ca3af 100%);
    color: #374151;
    border-color: #9ca3af;
    box-shadow: none;
    text-shadow: none;
  }

  .gold-leaf-sparkle {
    font-size: 0.75rem;
  }

  /* Expand Icon */
  .expand-icon {
    font-size: 1rem;
    color: #b45309;
    margin-left: 1rem;
    transition: transform 0.2s;
  }

  /* Card Preview (Collapsed) */
  .card-preview {
    padding: 0 1.25rem 1.25rem 1.25rem;
    color: #4b5563;
    font-size: 0.875rem;
    line-height: 1.5;
  }

  /* Card Content (Expanded) */
  .card-content {
    padding: 0 1.25rem 1.25rem 1.25rem;
    border-top: 1px solid rgba(212, 175, 55, 0.3);
  }

  /* Metadata */
  .card-metadata {
    display: flex;
    gap: 2rem;
    padding: 1rem 0;
    font-size: 0.875rem;
    color: #6b7280;
    border-bottom: 1px solid rgba(212, 175, 55, 0.2);
    margin-bottom: 1rem;
  }

  .metadata-item strong {
    color: #374151;
  }

  /* Prompt Display */
  .prompt-display {
    padding: 1.25rem;
    background: rgba(249, 250, 251, 0.85);
    border: 1px solid rgba(209, 213, 219, 0.6);
    border-radius: 0.625rem;
    margin-bottom: 1rem;
  }

  .prompt-text {
    margin: 0;
    line-height: 1.6;
    color: #1f2937;
    white-space: pre-wrap;
    word-wrap: break-word;
  }

  /* Edit Container */
  .edit-container {
    margin-bottom: 1rem;
  }

  .prompt-textarea {
    width: 100%;
    padding: 1rem;
    border: 2px solid rgba(212, 175, 55, 0.5);
    border-radius: 0.5rem;
    font-family: inherit;
    font-size: 1rem;
    line-height: 1.6;
    resize: vertical;
    margin-bottom: 0.75rem;
    transition:
      border-color 0.2s,
      box-shadow 0.2s;
    background: rgba(255, 255, 255, 0.9);
  }

  .prompt-textarea:focus {
    outline: none;
    border-color: #b45309;
    box-shadow: 0 0 0 3px rgba(180, 83, 9, 0.2);
  }

  /* Edit Actions */
  .edit-actions {
    display: flex;
    gap: 0.75rem;
  }

  /* Actions Section & Quick Action Buttons */
  .actions-section {
    display: flex;
    flex-direction: column;
    gap: 0.875rem;
  }

  .quick-action-buttons {
    display: flex;
    gap: 0.625rem;
    flex-wrap: wrap;
  }

  .quick-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.5rem 0.9rem;
    border-radius: 0.5rem;
    font-size: 0.8125rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    border: 1px solid transparent;
  }

  .enhance-btn {
    background: linear-gradient(135deg, #7e22ce 0%, #a855f7 100%);
    color: white;
    border-color: rgba(233, 213, 255, 0.3);
    box-shadow: 0 2px 6px rgba(126, 34, 206, 0.3);
  }

  .enhance-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(126, 34, 206, 0.45);
  }

  .copy-btn {
    background: linear-gradient(135deg, #0f766e 0%, #14b8a6 100%);
    color: white;
    border-color: rgba(204, 251, 241, 0.3);
    box-shadow: 0 2px 6px rgba(15, 118, 110, 0.3);
  }

  .copy-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(15, 118, 110, 0.45);
  }

  .reset-btn {
    background: linear-gradient(135deg, #374151 0%, #4b5563 100%);
    color: #f3f4f6;
    border-color: rgba(209, 213, 219, 0.2);
    box-shadow: 0 2px 6px rgba(55, 65, 81, 0.3);
  }

  .reset-btn:hover {
    transform: translateY(-1px);
    background: linear-gradient(135deg, #1f2937 0%, #374151 100%);
    box-shadow: 0 4px 12px rgba(31, 41, 55, 0.45);
  }

  /* Standard Card Actions */
  .card-actions {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  /* Buttons */
  button {
    font-family: inherit;
  }

  .button-save,
  .button-edit,
  .button-regenerate {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }

  .button-save {
    background-color: #7c3aed;
    color: white;
  }

  .button-save:hover {
    background-color: #6d28d9;
  }

  .button-cancel {
    padding: 0.5rem 1rem;
    border: 1px solid #d1d5db;
    background-color: white;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 600;
    color: #6b7280;
    cursor: pointer;
    transition: all 0.2s;
  }

  .button-cancel:hover {
    background-color: #f9fafb;
    border-color: #9ca3af;
  }

  .button-edit {
    background-color: #2563eb;
    color: white;
  }

  .button-edit:hover {
    background-color: #1d4ed8;
  }

  .button-regenerate {
    background-color: #d97706;
    color: white;
  }

  .button-regenerate:hover:not(:disabled) {
    background-color: #b45309;
  }

  .button-regenerate:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Empty State */
  .empty-state {
    text-align: center;
    padding: 4rem 2rem;
    color: #6b7280;
  }

  .empty-icon {
    font-size: 4rem;
    margin: 0 0 1rem 0;
  }

  .empty-text {
    font-size: 1.5rem;
    font-weight: 600;
    color: #374151;
    margin: 0 0 0.5rem 0;
  }

  .empty-subtext {
    font-size: 1rem;
    margin: 0;
  }

  /* Spinners */
  .spinner,
  .spinner-small {
    display: inline-block;
    width: 1rem;
    height: 1rem;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }

  .spinner-small {
    width: 0.875rem;
    height: 0.875rem;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* Screen Reader Only */
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .header {
      flex-direction: column;
      align-items: stretch;
    }

    .generate-button {
      width: 100%;
      justify-content: center;
    }

    .card-header-content {
      flex-wrap: wrap;
    }

    .card-name {
      font-size: 1.125rem;
    }

    .card-metadata {
      flex-direction: column;
      gap: 0.5rem;
    }

    .quick-action-buttons,
    .card-actions,
    .edit-actions {
      flex-direction: column;
    }

    .quick-btn,
    .button-save,
    .button-cancel,
    .button-edit,
    .button-regenerate {
      width: 100%;
      justify-content: center;
    }
  }

  /* Accessibility - High Contrast Mode */
  @media (prefers-contrast: high) {
    .prompt-card {
      border-width: 3px;
    }

    .card-header:focus {
      outline-width: 3px;
    }
  }

  /* Accessibility - Reduced Motion */
  @media (prefers-reduced-motion: reduce) {
    .prompt-card,
    .expand-icon,
    .spinner,
    .spinner-small,
    .quick-btn {
      animation: none;
      transition: none;
    }
  }
</style>
