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
	import { appStore } from '$lib/stores/appStore.svelte';
	import { StyleInputMock } from '$services/mock/StyleInputMock';
	import type {
		StyleInputs,
		PredefinedTheme,
		PredefinedTone,
		StyleInputsValidation
	} from '$contracts/index';
	import { CHAR_LIMITS } from '$contracts/index';

	// ============================================================================
	// SERVICE INITIALIZATION
	// ============================================================================

	const styleService = new StyleInputMock();

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
		characters: ''
	});

	/**
	 * Predefined options for dropdowns
	 * Loaded on component mount
	 */
	let predefinedThemes = $state<readonly PredefinedTheme[]>([]);
	let predefinedTones = $state<readonly PredefinedTone[]>([]);

	/**
	 * Whether custom theme input is shown
	 */
	let showCustomTheme = $state(false);

	/**
	 * Whether custom tone input is shown
	 */
	let showCustomTone = $state(false);

	/**
	 * Selected predefined theme (from dropdown)
	 */
	let selectedTheme = $state<PredefinedTheme | ''>('');

	/**
	 * Selected predefined tone (from dropdown)
	 */
	let selectedTone = $state<PredefinedTone | ''>('');

	/**
	 * Validation state for the form
	 * Updated on every input change
	 */
	let validation = $state<StyleInputsValidation | null>(null);

	/**
	 * Validation warnings (non-blocking)
	 */
	let warnings = $state<string[]>([]);

	/**
	 * Whether form is currently saving
	 */
	let isSaving = $state(false);

	/**
	 * Success message after save
	 */
	let successMessage = $state<string | null>(null);

	/**
	 * Error message if save fails
	 */
	let errorMessage = $state<string | null>(null);

	// ============================================================================
	// DERIVED STATE (COMPUTED VALUES)
	// ============================================================================

	/**
	 * Whether form is valid and can be submitted
	 */
	const canSubmit = $derived(validation?.canProceed ?? false);

	/**
	 * Character count for description
	 */
	const descriptionCount = $derived(formData.description.length);

	/**
	 * Character count for concept
	 */
	const conceptCount = $derived(formData.concept?.length ?? 0);

	/**
	 * Character count for characters
	 */
	const charactersCount = $derived(formData.characters?.length ?? 0);

	/**
	 * Description counter color based on usage
	 */
	const descriptionCounterClass = $derived(() => {
		if (descriptionCount > CHAR_LIMITS.description.max) return 'over-limit';
		if (descriptionCount >= CHAR_LIMITS.description.max * 0.9) return 'near-limit';
		return 'normal';
	});

	/**
	 * Concept counter color based on usage
	 */
	const conceptCounterClass = $derived(() => {
		if (conceptCount > CHAR_LIMITS.concept) return 'over-limit';
		if (conceptCount >= CHAR_LIMITS.concept * 0.9) return 'near-limit';
		return 'normal';
	});

	/**
	 * Characters counter color based on usage
	 */
	const charactersCounterClass = $derived(() => {
		if (charactersCount > CHAR_LIMITS.characters) return 'over-limit';
		if (charactersCount >= CHAR_LIMITS.characters * 0.9) return 'near-limit';
		return 'normal';
	});

	// ============================================================================
	// LIFECYCLE & INITIALIZATION
	// ============================================================================

	/**
	 * Load predefined options and saved draft on component mount
	 */
	async function initialize() {
		// Load predefined options for dropdowns
		const optionsResult = await styleService.getPredefinedOptions();
		if (optionsResult.success && optionsResult.data) {
			predefinedThemes = optionsResult.data.themes;
			predefinedTones = optionsResult.data.tones;
		}

		// Try to load saved draft
		const loadResult = await styleService.loadStyleInputs({ loadFromDraft: true });
		if (loadResult.success && loadResult.data?.found && loadResult.data.styleInputs) {
			formData = { ...loadResult.data.styleInputs };

			// Check if loaded values are custom (not in predefined lists)
			if (!predefinedThemes.includes(formData.theme as PredefinedTheme)) {
				showCustomTheme = true;
				selectedTheme = 'Custom';
			} else {
				selectedTheme = formData.theme as PredefinedTheme;
			}

			if (!predefinedTones.includes(formData.tone as PredefinedTone)) {
				showCustomTone = true;
				selectedTone = 'Custom';
			} else {
				selectedTone = formData.tone as PredefinedTone;
			}
		} else {
			// Load defaults if no draft found
			const defaultsResult = await styleService.getDefaults();
			if (defaultsResult.success && defaultsResult.data) {
				const defaults = defaultsResult.data.defaults;
				formData.theme = defaults.theme;
				formData.tone = defaults.tone;
				selectedTheme = defaults.theme;
				selectedTone = defaults.tone;
			}
		}

		// Initial validation
		await validateForm();
	}

	// Run initialization
	initialize();

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
			characters: formData.characters
		});

		if (result.success && result.data) {
			validation = result.data.validation;
			warnings = result.data.warnings;
		}
	}

	/**
	 * Auto-save draft on input change
	 * Debounced to avoid excessive saves
	 */
	let autoSaveTimeout: ReturnType<typeof setTimeout> | null = null;
	function scheduleAutoSave() {
		if (autoSaveTimeout) clearTimeout(autoSaveTimeout);

		autoSaveTimeout = setTimeout(async () => {
			await styleService.saveStyleInputs({
				styleInputs: formData,
				saveAsDraft: true
			});
		}, 1000); // Save 1 second after user stops typing
	}

	// ============================================================================
	// EVENT HANDLERS
	// ============================================================================

	/**
	 * Handle theme dropdown change
	 */
	function handleThemeChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		const value = target.value as PredefinedTheme;

		selectedTheme = value;

		if (value === 'Custom') {
			showCustomTheme = true;
			formData.theme = '';
		} else {
			showCustomTheme = false;
			formData.theme = value;
		}

		validateForm();
		scheduleAutoSave();
	}

	/**
	 * Handle custom theme input change
	 */
	function handleCustomThemeChange(event: Event) {
		const target = event.target as HTMLInputElement;
		formData.theme = target.value;
		validateForm();
		scheduleAutoSave();
	}

	/**
	 * Handle tone dropdown change
	 */
	function handleToneChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		const value = target.value as PredefinedTone;

		selectedTone = value;

		if (value === 'Custom') {
			showCustomTone = true;
			formData.tone = '';
		} else {
			showCustomTone = false;
			formData.tone = value;
		}

		validateForm();
		scheduleAutoSave();
	}

	/**
	 * Handle custom tone input change
	 */
	function handleCustomToneChange(event: Event) {
		const target = event.target as HTMLInputElement;
		formData.tone = target.value;
		validateForm();
		scheduleAutoSave();
	}

	/**
	 * Handle description textarea change
	 */
	function handleDescriptionChange(event: Event) {
		const target = event.target as HTMLTextAreaElement;
		formData.description = target.value;
		validateForm();
		scheduleAutoSave();
	}

	/**
	 * Handle concept textarea change
	 */
	function handleConceptChange(event: Event) {
		const target = event.target as HTMLTextAreaElement;
		formData.concept = target.value;
		validateForm();
		scheduleAutoSave();
	}

	/**
	 * Handle characters textarea change
	 */
	function handleCharactersChange(event: Event) {
		const target = event.target as HTMLTextAreaElement;
		formData.characters = target.value;
		validateForm();
		scheduleAutoSave();
	}

	/**
	 * Handle form submission
	 */
	async function handleSubmit(event: Event) {
		event.preventDefault();

		// Final validation
		await validateForm();

		if (!canSubmit) {
			errorMessage = 'Please fix validation errors before saving';
			return;
		}

		// Clear previous messages
		errorMessage = null;
		successMessage = null;

		// Set loading state
		isSaving = true;
		appStore.setLoading('savingStyleInputs', true);

		try {
			// Save to service (and localStorage draft)
			const result = await styleService.saveStyleInputs({
				styleInputs: formData,
				saveAsDraft: true
			});

			if (result.success && result.data) {
				// Save to app store
				appStore.setStyleInputs(result.data.styleInputs);

				// Show success message
				successMessage = 'Style preferences saved successfully!';

				// Clear success message after 3 seconds
				setTimeout(() => {
					successMessage = null;
				}, 3000);
			} else {
				errorMessage = 'Failed to save style preferences. Please try again.';
			}
		} catch (error) {
			console.error('Error saving style inputs:', error);
			errorMessage = 'An unexpected error occurred. Please try again.';
		} finally {
			isSaving = false;
			appStore.setLoading('savingStyleInputs', false);
		}
	}

	/**
	 * Clear form and start fresh
	 */
	async function handleClear() {
		// Clear draft from storage
		await styleService.clearDraft();

		// Reset form to defaults
		const defaultsResult = await styleService.getDefaults();
		if (defaultsResult.success && defaultsResult.data) {
			const defaults = defaultsResult.data.defaults;
			formData = {
				theme: defaults.theme,
				tone: defaults.tone,
				description: defaults.description,
				concept: defaults.concept,
				characters: defaults.characters
			};
			selectedTheme = defaults.theme;
			selectedTone = defaults.tone;
			showCustomTheme = false;
			showCustomTone = false;
		}

		// Revalidate
		await validateForm();

		// Clear messages
		successMessage = null;
		errorMessage = null;
	}
</script>

<div class="style-input-container">
	<header class="component-header">
		<h2>Define Your Deck Style</h2>
		<p class="subtitle">
			Describe the visual aesthetic for your tarot deck. These parameters will guide the AI in
			generating consistent, cohesive card images.
		</p>
	</header>

	<form class="style-form" onsubmit={handleSubmit} novalidate>
		<!-- Theme Field -->
		<div class="form-section">
			<div class="field-group">
				<label for="theme-select" class="field-label">
					Theme <span class="required">*</span>
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
					Tone <span class="required">*</span>
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
					Description <span class="required">*</span>
				</label>
				<p class="field-help">
					Detailed description of your desired aesthetic (minimum {CHAR_LIMITS.description.min}
					characters)
				</p>
				<p class="field-example">
					Example: "Vintage 1920s Art Deco style with geometric patterns, gold foil accents, and
					rich jewel tones. Inspired by the Tarot de Marseille with modern illustration
					techniques."
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
				<label for="concept" class="field-label"> Concept <span class="optional">(optional)</span> </label>
				<p class="field-help">
					Conceptual theme or narrative thread (e.g., "Journey of self-discovery," "Balance of
					light and shadow")
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
					Characters <span class="optional">(optional)</span>
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
				Clear Form
			</button>

			<button
				type="submit"
				class="primary-button"
				disabled={!canSubmit || isSaving}
				aria-label="Save style preferences"
			>
				{#if isSaving}
					Saving...
				{:else}
					Save Style Preferences
				{/if}
			</button>
		</div>
	</form>
</div>

<style>
	/* ===============================================
	   CONTAINER
	   =============================================== */
	.style-input-container {
		max-width: 800px;
		margin: 0 auto;
	}

	/* ===============================================
	   HEADER
	   =============================================== */
	.component-header {
		margin-bottom: var(--spacing-xl);
		text-align: center;
	}

	.component-header h2 {
		font-size: var(--text-3xl);
		margin-bottom: var(--spacing-md);
		color: var(--color-text);
	}

	.subtitle {
		font-size: var(--text-base);
		color: var(--color-text-secondary);
		line-height: 1.6;
		max-width: 600px;
		margin: 0 auto;
	}

	/* ===============================================
	   FORM STRUCTURE
	   =============================================== */
	.style-form {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xl);
	}

	.form-section {
		background: var(--glass-bg);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
		border: 1px solid var(--glass-border);
		border-radius: var(--radius-lg);
		padding: var(--spacing-xl);
		box-shadow: var(--glass-shadow);
	}

	.field-group {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
	}

	/* ===============================================
	   LABELS & HELP TEXT
	   =============================================== */
	.field-label {
		font-family: var(--font-heading);
		font-size: var(--text-lg);
		font-weight: 600;
		color: var(--color-text);
	}

	.required {
		color: var(--color-secondary);
	}

	.optional {
		font-size: var(--text-sm);
		color: var(--color-text-muted);
		font-weight: 400;
	}

	.field-help {
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
		margin: 0;
	}

	.field-example {
		font-size: var(--text-sm);
		color: var(--color-text-muted);
		font-style: italic;
		margin: 0;
		padding: var(--spacing-sm);
		background: var(--color-bg-secondary);
		border-left: 3px solid var(--color-accent);
		border-radius: var(--radius-sm);
	}

	/* ===============================================
	   FORM INPUTS
	   =============================================== */
	.select-input,
	.text-input,
	.textarea-input {
		width: 100%;
		padding: var(--spacing-md);
		font-size: var(--text-base);
		color: var(--color-text);
		background: var(--color-bg-secondary);
		border: 2px solid var(--glass-border);
		border-radius: var(--radius-md);
		transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
	}

	.select-input:focus,
	.text-input:focus,
	.textarea-input:focus {
		outline: none;
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px rgba(107, 70, 193, 0.2);
	}

	.select-input.error,
	.text-input.error,
	.textarea-input.error {
		border-color: #fc8181;
	}

	.select-input.error:focus,
	.text-input.error:focus,
	.textarea-input.error:focus {
		box-shadow: 0 0 0 3px rgba(252, 129, 129, 0.2);
	}

	.custom-input {
		margin-top: var(--spacing-sm);
	}

	.textarea-input {
		resize: vertical;
		min-height: 100px;
		line-height: 1.6;
	}

	/* ===============================================
	   CHARACTER COUNTER
	   =============================================== */
	.char-counter {
		font-size: var(--text-sm);
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	.char-counter.normal {
		color: var(--color-text-secondary);
	}

	.char-counter.near-limit {
		color: var(--color-secondary);
		font-weight: 600;
	}

	.char-counter.over-limit {
		color: #fc8181;
		font-weight: 600;
	}

	/* ===============================================
	   VALIDATION MESSAGES
	   =============================================== */
	.error-message {
		font-size: var(--text-sm);
		color: #fc8181;
		padding: var(--spacing-sm);
		background: rgba(252, 129, 129, 0.1);
		border-left: 3px solid #fc8181;
		border-radius: var(--radius-sm);
	}

	.warnings {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
	}

	.warning-message {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
		font-size: var(--text-sm);
		color: var(--color-secondary);
		padding: var(--spacing-md);
		background: rgba(246, 173, 85, 0.1);
		border-left: 3px solid var(--color-secondary);
		border-radius: var(--radius-sm);
	}

	.warning-icon {
		font-size: var(--text-lg);
	}

	/* ===============================================
	   BANNERS (SUCCESS/ERROR)
	   =============================================== */
	.success-banner,
	.error-banner {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
		padding: var(--spacing-md);
		border-radius: var(--radius-md);
		font-size: var(--text-base);
		font-weight: 500;
	}

	.success-banner {
		color: #68d391;
		background: rgba(104, 211, 145, 0.1);
		border: 1px solid rgba(104, 211, 145, 0.3);
	}

	.error-banner {
		color: #fc8181;
		background: rgba(252, 129, 129, 0.1);
		border: 1px solid rgba(252, 129, 129, 0.3);
	}

	.success-icon,
	.error-icon {
		font-size: var(--text-xl);
		font-weight: 700;
	}

	/* ===============================================
	   FORM ACTIONS
	   =============================================== */
	.form-actions {
		display: flex;
		gap: var(--spacing-md);
		justify-content: flex-end;
		padding-top: var(--spacing-md);
	}

	.primary-button,
	.secondary-button {
		padding: var(--spacing-md) var(--spacing-xl);
		font-size: var(--text-base);
		font-weight: 600;
		border-radius: var(--radius-md);
		transition: all var(--transition-fast);
		cursor: pointer;
	}

	.primary-button {
		background: linear-gradient(135deg, var(--color-primary), var(--color-primary-light));
		color: var(--color-text);
		border: none;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
	}

	.primary-button:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 6px 12px rgba(107, 70, 193, 0.3);
	}

	.primary-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.secondary-button {
		background: transparent;
		color: var(--color-text-secondary);
		border: 2px solid var(--glass-border);
	}

	.secondary-button:hover:not(:disabled) {
		color: var(--color-text);
		border-color: var(--color-primary);
		background: var(--glass-bg);
	}

	.secondary-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* ===============================================
	   RESPONSIVE DESIGN
	   =============================================== */
	@media (max-width: 640px) {
		.form-section {
			padding: var(--spacing-lg);
		}

		.form-actions {
			flex-direction: column;
		}

		.primary-button,
		.secondary-button {
			width: 100%;
		}
	}
</style>
