<!--
/**
 * @fileoverview Style Input Component - Form for collecting deck style preferences
 * @purpose Collect and validate user's style parameters (theme, tone, description, concept, characters)
 * @dataFlow User input → Real-time validation → Save → AppStore
 * @boundary Seam #2: StyleInputSeam - HTML form interface to style validation service
 * @updated 2025-11-15
 *
 * Features:
 * - 5 input fields: theme, tone, description, concept, characters
 * - Real-time validation with visual feedback
 * - Character counters with color-coded limits
 * - Predefined dropdown options with custom input fallback
 * - Auto-save draft to localStorage
 * - Accessibility: ARIA labels, keyboard navigation, screen reader support
 * - Integration with StyleInputMock service and appStore
 *
 * @example
 * ```svelte
 * <StyleInputComponent />
 * ```
 */
-->

<script lang="ts">
  import { appStore } from '$lib/stores/appStore.svelte'
  import { styleInputService } from '$services/factory'
  import type {
    StyleInputs,
    PredefinedTheme,
    PredefinedTone,
    StyleInputsValidation,
  } from '$contracts/index'
  import { CHAR_LIMITS } from '$contracts/index'
  import { isPredefinedTheme, isPredefinedTone } from '$lib/utils/types'

  // ============================================================================
  // SERVICE INITIALIZATION
  // ============================================================================

  const styleService = styleInputService

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  /**
   * Form data - reactive state for all style inputs
   */
  let formData = $state<StyleInputs>({
    theme: '',
    tone: '',
    description: '',
    concept: '',
    characters: '',
  })

  /**
   * Predefined options for dropdowns
   * Loaded on component mount
   */
  let predefinedThemes = $state<readonly PredefinedTheme[]>([])
  let predefinedTones = $state<readonly PredefinedTone[]>([])

  /**
   * Whether custom theme input is shown
   */
  let showCustomTheme = $state(false)

  /**
   * Whether custom tone input is shown
   */
  let showCustomTone = $state(false)

  /**
   * Selected predefined theme (from dropdown)
   */
  let selectedTheme = $state<PredefinedTheme | ''>('')

  /**
   * Selected predefined tone (from dropdown)
   */
  let selectedTone = $state<PredefinedTone | ''>('')

  /**
   * Validation state for the form
   * Updated on every input change
   */
  let validation = $state<StyleInputsValidation | null>(null)

  /**
   * Validation warnings (non-blocking)
   */
  let warnings = $state<string[]>([])

  /**
   * Whether form is currently saving
   */
  let isSaving = $state(false)

  /**
   * Success message after save
   */
  let successMessage = $state<string | null>(null)

  /**
   * Error message if save fails
   */
  let errorMessage = $state<string | null>(null)

  // ============================================================================
  // DERIVED STATE (COMPUTED VALUES)
  // ============================================================================

  /**
   * Whether form is valid and can be submitted
   */
  const canSubmit = $derived(validation?.canProceed ?? false)

  /**
   * Character count for description
   */
  const descriptionCount = $derived(formData.description.length)

  /**
   * Character count for concept
   */
  const conceptCount = $derived(formData.concept?.length ?? 0)

  /**
   * Character count for characters
   */
  const charactersCount = $derived(formData.characters?.length ?? 0)

  /**
   * Description counter color based on usage
   */
  const descriptionCounterClass = $derived(() => {
    if (descriptionCount > CHAR_LIMITS.description.max) return 'over-limit'
    if (descriptionCount >= CHAR_LIMITS.description.max * 0.9) return 'near-limit'
    return 'normal'
  })

  /**
   * Concept counter color based on usage
   */
  const conceptCounterClass = $derived(() => {
    if (conceptCount > CHAR_LIMITS.concept) return 'over-limit'
    if (conceptCount >= CHAR_LIMITS.concept * 0.9) return 'near-limit'
    return 'normal'
  })

  /**
   * Characters counter color based on usage
   */
  const charactersCounterClass = $derived(() => {
    if (charactersCount > CHAR_LIMITS.characters) return 'over-limit'
    if (charactersCount >= CHAR_LIMITS.characters * 0.9) return 'near-limit'
    return 'normal'
  })

  // ============================================================================
  // LIFECYCLE & INITIALIZATION
  // ============================================================================

  /**
   * Load predefined options and saved draft on component mount
   */
  async function initialize() {
    // Load predefined options for dropdowns
    const optionsResult = await styleService.getPredefinedOptions()
    if (optionsResult.success && optionsResult.data) {
      predefinedThemes = optionsResult.data.themes
      predefinedTones = optionsResult.data.tones
    }

    // Try to load saved draft
    const loadResult = await styleService.loadStyleInputs({ loadFromDraft: true })
    if (loadResult.success && loadResult.data?.found && loadResult.data.styleInputs) {
      formData = { ...loadResult.data.styleInputs }

      // Check if loaded values are custom (not in predefined lists)
      if (isPredefinedTheme(formData.theme)) {
        selectedTheme = formData.theme
      } else {
        showCustomTheme = true
        selectedTheme = 'Custom'
      }

      if (isPredefinedTone(formData.tone)) {
        selectedTone = formData.tone
      } else {
        showCustomTone = true
        selectedTone = 'Custom'
      }
    } else {
      // Load defaults if no draft found
      const defaultsResult = await styleService.getDefaults()
      if (defaultsResult.success && defaultsResult.data) {
        const defaults = defaultsResult.data.defaults
        formData.theme = defaults.theme
        formData.tone = defaults.tone
        selectedTheme = defaults.theme
        selectedTone = defaults.tone
      }
    }

    // Initial validation
    await validateForm()
  }

  // Run initialization
  initialize()

  // ============================================================================
  // VALIDATION
  // ============================================================================

  /**
   * Validate entire form
   * Called on input changes and before save
   */
  async function validateForm() {
    const result = await styleService.validateStyleInputs({
      theme: formData.theme,
      tone: formData.tone,
      description: formData.description,
      concept: formData.concept,
      characters: formData.characters,
    })

    if (result.success && result.data) {
      validation = result.data.validation
      warnings = result.data.warnings
    }
  }

  /**
   * Auto-save draft on input change
   * Debounced to avoid excessive saves
   */
  let autoSaveTimeout: ReturnType<typeof setTimeout> | null = null
  function scheduleAutoSave() {
    if (autoSaveTimeout) clearTimeout(autoSaveTimeout)

    autoSaveTimeout = setTimeout(async () => {
      await styleService.saveStyleInputs({
        styleInputs: formData,
        saveAsDraft: true,
      })
    }, 1000) // Save 1 second after user stops typing
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  /**
   * Handle theme dropdown change
   */
  function handleThemeChange(event: Event) {
    if (!(event.target instanceof HTMLSelectElement)) return
    const target = event.target
    const value = target.value

    if (isPredefinedTheme(value)) {
      selectedTheme = value
    } else {
      selectedTheme = 'Custom'
    }

    if (value === 'Custom') {
      showCustomTheme = true
      formData.theme = ''
    } else {
      showCustomTheme = false
      formData.theme = value
    }

    validateForm()
    scheduleAutoSave()
  }

  /**
   * Handle custom theme input change
   */
  function handleCustomThemeChange(event: Event) {
    if (!(event.target instanceof HTMLInputElement)) return
    const target = event.target
    formData.theme = target.value
    validateForm()
    scheduleAutoSave()
  }

  /**
   * Handle tone dropdown change
   */
  function handleToneChange(event: Event) {
    if (!(event.target instanceof HTMLSelectElement)) return
    const target = event.target
    const value = target.value

    if (isPredefinedTone(value)) {
      selectedTone = value
    } else {
      selectedTone = 'Custom'
    }

    if (value === 'Custom') {
      showCustomTone = true
      formData.tone = ''
    } else {
      showCustomTone = false
      formData.tone = value
    }

    validateForm()
    scheduleAutoSave()
  }

  /**
   * Handle custom tone input change
   */
  function handleCustomToneChange(event: Event) {
    if (!(event.target instanceof HTMLInputElement)) return
    const target = event.target
    formData.tone = target.value
    validateForm()
    scheduleAutoSave()
  }

  /**
   * Handle description textarea change
   */
  function handleDescriptionChange(event: Event) {
    if (!(event.target instanceof HTMLTextAreaElement)) return
    const target = event.target
    formData.description = target.value
    validateForm()
    scheduleAutoSave()
  }

  /**
   * Handle concept textarea change
   */
  function handleConceptChange(event: Event) {
    if (!(event.target instanceof HTMLTextAreaElement)) return
    const target = event.target
    formData.concept = target.value
    validateForm()
    scheduleAutoSave()
  }

  /**
   * Handle characters textarea change
   */
  function handleCharactersChange(event: Event) {
    if (!(event.target instanceof HTMLTextAreaElement)) return
    const target = event.target
    formData.characters = target.value
    validateForm()
    scheduleAutoSave()
  }

  /**
   * Handle form submission
   */
  async function handleSubmit(event: Event) {
    event.preventDefault()

    // Final validation
    await validateForm()

    if (!canSubmit) {
      errorMessage = 'Declaration incomplete. Fix the marked boxes and file again.'
      return
    }

    // Clear previous messages
    errorMessage = null
    successMessage = null

    // Set loading state
    isSaving = true
    appStore.setLoading('savingStyleInputs', true)

    try {
      // Save to service (and localStorage draft)
      const result = await styleService.saveStyleInputs({
        styleInputs: formData,
        saveAsDraft: true,
      })

      if (result.success && result.data) {
        // Save to app store
        appStore.setStyleInputs(result.data.styleInputs)

        // Show success message
        successMessage = 'Declaration filed. Saved successfully.'

        // Clear success message after 3 seconds
        setTimeout(() => {
          successMessage = null
        }, 3000)
      } else {
        errorMessage = 'The declaration could not be filed. Please try again.'
      }
    } catch (error) {
      console.error('Error saving style inputs:', error)
      errorMessage = 'An unexpected error occurred. Please try again.'
    } finally {
      isSaving = false
      appStore.setLoading('savingStyleInputs', false)
    }
  }

  /**
   * Clear form and start fresh
   */
  async function handleClear() {
    // Clear draft from storage
    await styleService.clearDraft()

    // Reset form to defaults
    const defaultsResult = await styleService.getDefaults()
    if (defaultsResult.success && defaultsResult.data) {
      const defaults = defaultsResult.data.defaults
      formData = {
        theme: defaults.theme,
        tone: defaults.tone,
        description: defaults.description,
        concept: defaults.concept,
        characters: defaults.characters,
      }
      selectedTheme = defaults.theme
      selectedTone = defaults.tone
      showCustomTheme = false
      showCustomTone = false
    }

    // Revalidate
    await validateForm()

    // Clear messages
    successMessage = null
    errorMessage = null
  }

  // ============================================================================
  // ECLECTIC AESTHETIC PRESETS
  // ============================================================================

  interface StylePreset {
    id: string
    label: string
    theme: string
    tone: string
    concept: string
    description: string
  }

  const PRESETS: readonly StylePreset[] = [
    {
      id: 'cyberpunk-neon',
      label: 'Cyberpunk Neon',
      theme: 'Cyberpunk',
      tone: 'Mystical',
      concept:
        'High-tech neo-tokyo tarot with chrome foil, holographic neon lines, and dark obsidian alleyways.',
      description:
        'Electric cyan, violet luminescence, metallic gold circuits, hyper-detailed cyberpunk tarot art.',
    },
    {
      id: 'botanical-gothic',
      label: 'Botanical Gothic',
      theme: 'Art Nouveau',
      tone: 'Dark',
      concept:
        'Enchanted Victorian greenhouse with poisonous herbs, gold-trimmed vines, and gothic moth iconography.',
      description:
        'Deep forest emerald, rose gold filigree, dried herbs, velvet shadows, dark botanical realism.',
    },
    {
      id: 'alchemical-gold',
      label: 'Alchemical Gold',
      theme: 'Classic Rider-Waite',
      tone: 'Light',
      concept:
        '16th century Renaissance alchemy manuscript with celestial orbits, solar gold leaf, and parchment texture.',
      description:
        'Aged parchment, 24k gold leaf gilding, lapis lazuli blue, sacred geometry, woodcut linework.',
    },
    {
      id: 'cosmic-void',
      label: 'Cosmic Void',
      theme: 'Minimalist',
      tone: 'Surreal',
      concept:
        'Esoteric deep space cosmic journey with nebulae, glowing stardust, and celestial geometry.',
      description:
        'Deep space obsidian black, stardust gold particles, translucent opal glass, ethereal cosmic glow.',
    },
  ]

  /**
   * Check if a preset is currently active
   */
  function isPresetActive(preset: StylePreset): boolean {
    return (
      formData.theme === preset.theme &&
      formData.tone === preset.tone &&
      formData.concept === preset.concept &&
      formData.description === preset.description
    )
  }

  /**
   * Handle 1-click preset application
   */
  function handleApplyPreset(preset: StylePreset) {
    formData.theme = preset.theme
    formData.tone = preset.tone
    formData.concept = preset.concept
    formData.description = preset.description

    if (isPredefinedTheme(preset.theme)) {
      selectedTheme = preset.theme
      showCustomTheme = false
    } else {
      selectedTheme = 'Custom'
      showCustomTheme = true
    }

    if (isPredefinedTone(preset.tone)) {
      selectedTone = preset.tone
      showCustomTone = false
    } else {
      selectedTone = 'Custom'
      showCustomTone = true
    }

    validateForm()
    scheduleAutoSave()
  }
</script>

<div class="style-input-container">
  <header class="component-header">
    <h2><span class="section-tag">Section B</span> Declaration of aesthetic</h2>
    <p class="subtitle">
      State, in your own words, how the deck should look and feel. The clerk follows this for all 22
      cards, so the deck stays consistent.
    </p>
  </header>

  <form class="style-form" onsubmit={handleSubmit} novalidate>
    <!-- Eclectic Aesthetic Presets -->
    <div class="preset-section">
      <div class="preset-header">
        <span class="preset-title">Pre-approved aesthetics</span>
        <span class="preset-subtitle"
          >Pick one to fill in boxes B1 to B4 for you. You can still edit them.</span
        >
      </div>
      <div class="preset-chips" role="group" aria-label="Eclectic Aesthetic Presets">
        {#each PRESETS as preset}
          <button
            type="button"
            class="preset-chip"
            class:active={isPresetActive(preset)}
            onclick={() => handleApplyPreset(preset)}
            aria-label={`Apply ${preset.label} preset`}
          >
            {preset.label}
          </button>
        {/each}
      </div>
    </div>

    <!-- Theme Field -->
    <div class="form-section">
      <div class="field-group">
        <label for="theme-select" class="field-label">
          <span class="box-no">B1</span> Theme <span class="required">*</span>
        </label>
        <p class="field-help">Visual style category (e.g., Art Nouveau, Cyberpunk, Watercolor)</p>

        <select
          id="theme-select"
          class="select-input"
          class:error={validation?.fields.theme && !validation.fields.theme.isValid}
          value={selectedTheme}
          onchange={handleThemeChange}
          aria-required="true"
          aria-invalid={validation?.fields.theme && !validation.fields.theme.isValid}
          aria-describedby="theme-error"
        >
          <option value="">Select a theme...</option>
          {#each predefinedThemes as theme}
            <option value={theme}>{theme}</option>
          {/each}
        </select>

        {#if showCustomTheme}
          <input
            type="text"
            class="text-input custom-input"
            class:error={validation?.fields.theme && !validation.fields.theme.isValid}
            placeholder="Enter your custom theme"
            value={formData.theme}
            oninput={handleCustomThemeChange}
            maxlength={CHAR_LIMITS.theme}
            aria-label="Custom theme"
          />
          <div class="char-counter normal">
            {formData.theme.length} / {CHAR_LIMITS.theme}
          </div>
        {/if}

        {#if validation?.fields.theme && !validation.fields.theme.isValid}
          <div id="theme-error" class="error-message" role="alert">
            {validation.fields.theme.errors[0]}
          </div>
        {/if}
      </div>
    </div>

    <!-- Tone Field -->
    <div class="form-section">
      <div class="field-group">
        <label for="tone-select" class="field-label">
          <span class="box-no">B2</span> Tone <span class="required">*</span>
        </label>
        <p class="field-help">Emotional/atmospheric tone (e.g., Dark, Whimsical, Mystical)</p>

        <select
          id="tone-select"
          class="select-input"
          class:error={validation?.fields.tone && !validation.fields.tone.isValid}
          value={selectedTone}
          onchange={handleToneChange}
          aria-required="true"
          aria-invalid={validation?.fields.tone && !validation.fields.tone.isValid}
          aria-describedby="tone-error"
        >
          <option value="">Select a tone...</option>
          {#each predefinedTones as tone}
            <option value={tone}>{tone}</option>
          {/each}
        </select>

        {#if showCustomTone}
          <input
            type="text"
            class="text-input custom-input"
            class:error={validation?.fields.tone && !validation.fields.tone.isValid}
            placeholder="Enter your custom tone"
            value={formData.tone}
            oninput={handleCustomToneChange}
            maxlength={CHAR_LIMITS.tone}
            aria-label="Custom tone"
          />
          <div class="char-counter normal">
            {formData.tone.length} / {CHAR_LIMITS.tone}
          </div>
        {/if}

        {#if validation?.fields.tone && !validation.fields.tone.isValid}
          <div id="tone-error" class="error-message" role="alert">
            {validation.fields.tone.errors[0]}
          </div>
        {/if}
      </div>
    </div>

    <!-- Description Field -->
    <div class="form-section">
      <div class="field-group">
        <label for="description" class="field-label">
          <span class="box-no">B3</span> Description <span class="required">*</span>
        </label>
        <p class="field-help">
          Detailed description of your desired aesthetic (minimum {CHAR_LIMITS.description.min}
          characters)
        </p>
        <p class="field-example">
          Example: "Vintage 1920s Art Deco style with geometric patterns, gold foil accents, and
          rich jewel tones. Inspired by the Tarot de Marseille with modern illustration techniques."
        </p>

        <textarea
          id="description"
          class="textarea-input"
          class:error={validation?.fields.description && !validation.fields.description.isValid}
          placeholder="Describe your deck's visual style in detail..."
          value={formData.description}
          oninput={handleDescriptionChange}
          rows="5"
          maxlength={CHAR_LIMITS.description.max}
          aria-required="true"
          aria-invalid={validation?.fields.description && !validation.fields.description.isValid}
          aria-describedby="description-counter description-error"
        ></textarea>

        <div
          id="description-counter"
          class="char-counter {descriptionCounterClass()}"
          aria-live="polite"
        >
          {descriptionCount} / {CHAR_LIMITS.description.max}
          {#if descriptionCount < CHAR_LIMITS.description.min}
            (minimum {CHAR_LIMITS.description.min})
          {/if}
        </div>

        {#if validation?.fields.description && !validation.fields.description.isValid}
          <div id="description-error" class="error-message" role="alert">
            {validation.fields.description.errors[0]}
          </div>
        {/if}
      </div>
    </div>

    <!-- Concept Field (Optional) -->
    <div class="form-section">
      <div class="field-group">
        <label for="concept" class="field-label">
          <span class="box-no">B4</span> Concept <span class="optional">(optional)</span>
        </label>
        <p class="field-help">
          Conceptual theme or narrative thread (e.g., "Journey of self-discovery," "Balance of light
          and shadow")
        </p>

        <textarea
          id="concept"
          class="textarea-input"
          class:error={validation?.fields.concept && !validation.fields.concept.isValid}
          placeholder="Enter a conceptual theme for your deck (optional)..."
          value={formData.concept}
          oninput={handleConceptChange}
          rows="3"
          maxlength={CHAR_LIMITS.concept}
          aria-describedby="concept-counter concept-error"
        ></textarea>

        <div id="concept-counter" class="char-counter {conceptCounterClass()}" aria-live="polite">
          {conceptCount} / {CHAR_LIMITS.concept}
        </div>

        {#if validation?.fields.concept && !validation.fields.concept.isValid}
          <div id="concept-error" class="error-message" role="alert">
            {validation.fields.concept.errors[0]}
          </div>
        {/if}
      </div>
    </div>

    <!-- Characters Field (Optional) -->
    <div class="form-section">
      <div class="field-group">
        <label for="characters" class="field-label">
          <span class="box-no">B5</span> Characters <span class="optional">(optional)</span>
        </label>
        <p class="field-help">
          Character descriptions or archetypes to appear across cards (e.g., "Androgynous figure
          with silver hair," "Cloaked wanderer")
        </p>

        <textarea
          id="characters"
          class="textarea-input"
          class:error={validation?.fields.characters && !validation.fields.characters.isValid}
          placeholder="Describe recurring characters or archetypes (optional)..."
          value={formData.characters}
          oninput={handleCharactersChange}
          rows="3"
          maxlength={CHAR_LIMITS.characters}
          aria-describedby="characters-counter characters-error"
        ></textarea>

        <div
          id="characters-counter"
          class="char-counter {charactersCounterClass()}"
          aria-live="polite"
        >
          {charactersCount} / {CHAR_LIMITS.characters}
        </div>

        {#if validation?.fields.characters && !validation.fields.characters.isValid}
          <div id="characters-error" class="error-message" role="alert">
            {validation.fields.characters.errors[0]}
          </div>
        {/if}
      </div>
    </div>

    <!-- Warnings -->
    {#if warnings.length > 0}
      <div class="warnings" role="status">
        {#each warnings as warning}
          <div class="warning-message">
            <span class="warning-icon">⚠</span>
            {warning}
          </div>
        {/each}
      </div>
    {/if}

    <!-- Success Message -->
    {#if successMessage}
      <div class="success-banner" role="status">
        <span class="success-icon">✓</span>
        {successMessage}
      </div>
    {/if}

    <!-- Error Message -->
    {#if errorMessage}
      <div class="error-banner" role="alert">
        <span class="error-icon">✕</span>
        {errorMessage}
      </div>
    {/if}

    <!-- Form Actions -->
    <div class="form-actions">
      <button
        type="button"
        class="secondary-button"
        onclick={handleClear}
        disabled={isSaving}
        aria-label="Clear form and start over"
      >
        Clear boxes
      </button>

      <button
        type="submit"
        class="primary-button"
        disabled={!canSubmit || isSaving}
        aria-label="Save style preferences"
      >
        {#if isSaving}
          Filing…
        {:else}
          File declaration
        {/if}
      </button>
    </div>
  </form>
</div>

<style>
  .style-input-container {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .component-header h2 {
    font-size: 1.25rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    display: flex;
    align-items: baseline;
    gap: 0.6rem;
    flex-wrap: wrap;
    border-bottom: 2px solid var(--ink);
    padding-bottom: 0.4rem;
    margin-bottom: 0.6rem;
  }

  .section-tag {
    font-size: 0.75rem;
    padding: 0.1rem 0.4rem;
    background: var(--ink);
    color: var(--paper);
    letter-spacing: 0.1em;
  }

  .subtitle {
    font-size: 0.95rem;
    color: var(--ink-soft);
  }

  .style-form {
    display: grid;
    grid-template-columns: 1fr 1fr;
    border-top: 1px solid var(--ink);
    border-left: 1px solid var(--ink);
  }

  .preset-section,
  .form-section,
  .warnings,
  .success-banner,
  .error-banner,
  .form-actions {
    grid-column: 1 / -1;
    border-right: 1px solid var(--ink);
    border-bottom: 1px solid var(--ink);
  }

  /* B1 (theme) and B2 (tone) share a row like boxes on a real form. */
  .form-section:nth-of-type(2),
  .form-section:nth-of-type(3) {
    grid-column: span 1;
  }

  .preset-section {
    padding: 0.8rem 0.9rem;
    background: var(--carbon-yellow);
  }

  .preset-header {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    margin-bottom: 0.6rem;
  }

  .preset-title {
    font-family: var(--font-heading);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-weight: 600;
  }

  .preset-subtitle {
    font-size: 0.8rem;
    color: #4a3f13;
  }

  .preset-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .preset-chip {
    padding: 0.35rem 0.75rem;
    border: 2px solid var(--ink);
    background: #fffbe8;
    color: var(--ink);
    font-family: var(--font-heading);
    font-size: 0.85rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    cursor: pointer;
  }

  .preset-chip:hover {
    background: #fff;
  }

  .preset-chip.active {
    background: var(--ink);
    color: var(--carbon-yellow);
  }

  .form-section {
    padding: 0.6rem 0.9rem 0.7rem;
    background: var(--paper);
  }

  .field-group {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .field-label {
    font-family: var(--font-heading);
    font-size: 0.85rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .box-no {
    display: inline-block;
    min-width: 1.9rem;
    padding: 0 0.25rem;
    border: 1px solid var(--ink);
    text-align: center;
    font-size: 0.75rem;
  }

  .required {
    color: var(--stamp-red);
  }

  .optional {
    font-family: var(--font-body);
    font-size: 0.75rem;
    font-weight: 400;
    text-transform: none;
    letter-spacing: 0;
    color: var(--ink-soft);
  }

  .field-help {
    font-size: 0.8rem;
    color: var(--ink-soft);
  }

  .field-example {
    font-size: 0.8rem;
    font-style: italic;
    color: var(--ink-soft);
    border-left: 3px solid var(--paper-rule);
    padding-left: 0.5rem;
  }

  .select-input,
  .text-input,
  .textarea-input {
    width: 100%;
    padding: 0.4rem 0.2rem;
    border: none;
    border-bottom: 2px solid var(--ink);
    background: transparent;
    color: #1b2f5c;
    font-family: var(--font-typed);
    font-size: 1.05rem;
    border-radius: 0;
  }

  .textarea-input {
    resize: vertical;
    line-height: 1.75rem;
    border: none;
    background: repeating-linear-gradient(
      transparent 0 calc(1.75rem - 1px),
      var(--paper-rule) calc(1.75rem - 1px) 1.75rem
    );
    background-attachment: local;
    padding: 0 0.2rem;
  }

  .select-input {
    cursor: pointer;
  }

  .select-input:focus,
  .text-input:focus,
  .textarea-input:focus {
    outline: none;
    background-color: #fffbe8;
  }

  .select-input.error,
  .text-input.error,
  .textarea-input.error {
    border-bottom-color: var(--stamp-red);
    background-color: var(--carbon-pink);
  }

  .custom-input {
    margin-top: 0.3rem;
  }

  .char-counter {
    align-self: flex-end;
    font-size: 0.75rem;
    color: var(--ink-soft);
  }

  .char-counter.warning {
    color: #8a5a00;
  }

  .char-counter.error {
    color: var(--stamp-red);
  }

  .error-message {
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--stamp-red);
  }

  .warnings {
    padding: 0.6rem 0.9rem;
    background: #fff4d6;
  }

  .warning-message {
    font-size: 0.85rem;
    color: #6b4a00;
  }

  .success-banner,
  .error-banner {
    padding: 0.6rem 0.9rem;
    font-weight: 700;
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .success-banner {
    background: #e3efdd;
    color: #24542f;
  }

  .error-banner {
    background: var(--carbon-pink);
    color: #7d1f1c;
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 0.75rem;
    padding: 0.8rem 0.9rem;
    background: var(--color-bg-secondary);
  }

  .secondary-button,
  .primary-button {
    padding: 0.55rem 1.1rem;
    font-family: var(--font-heading);
    font-size: 0.95rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    cursor: pointer;
  }

  .secondary-button {
    background: transparent;
    border: 1px solid var(--ink-soft);
    color: var(--ink);
  }

  .primary-button {
    background: var(--stamp-blue);
    border: 2px solid var(--stamp-blue);
    color: #fff;
    font-weight: 600;
  }

  .primary-button:hover:not(:disabled) {
    background: #173d78;
  }

  .primary-button:disabled,
  .secondary-button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  @media (max-width: 640px) {
    .style-form {
      grid-template-columns: 1fr;
    }

    .form-section:nth-of-type(2),
    .form-section:nth-of-type(3) {
      grid-column: 1 / -1;
    }
  }
</style>
