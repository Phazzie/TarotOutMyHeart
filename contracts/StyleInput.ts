/**
 * @fileoverview Style Input Contract - User-defined style parameters for tarot deck
 * @purpose Define the seam between form input and style validation/storage
 * @dataFlow HTML Form → Validation → Application State → Prompt Generation
 * @boundary Seam #2: StyleInputSeam - User defines theme, tone, description, concept, characters
 * @requirement PRD Section: "User Flow Step 2 - Define Style Parameters"
 * @updated 2025-11-07
 *
 * @example
 * ```typescript
 * const result = await styleInputService.validateStyleInputs({
 *   theme: 'Cyberpunk',
 *   tone: 'Dark',
 *   description: 'Neon-lit dystopian future...',
 *   concept: 'Megacorporation control',
 *   characters: 'Augmented humans'
 * });
 * ```
 */

import type { ServiceResponse } from './types/common'

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Character limits for text fields
 */
export const CHAR_LIMITS = {
  theme: 50,
  tone: 50,
  description: { min: 10, max: 500 },
  concept: 200,
  characters: 200,
} as const

/**
 * Predefined theme options for dropdown
 * User can also select "Custom" to enter their own
 */
export const PREDEFINED_THEMES = [
  'Art Nouveau',
  'Cyberpunk',
  'Watercolor',
  'Minimalist',
  'Gothic',
  'Art Deco',
  'Fantasy',
  'Vintage',
  'Digital Art',
  'Hand-Drawn',
  'Custom',
] as const

/**
 * Predefined tone options for dropdown
 * User can also select "Custom" to enter their own
 */
export const PREDEFINED_TONES = [
  'Dark',
  'Light',
  'Whimsical',
  'Serious',
  'Mystical',
  'Modern',
  'Traditional',
  'Ethereal',
  'Bold',
  'Soft',
  'Custom',
] as const

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Predefined theme options (derived from constant)
 */
export type PredefinedTheme = (typeof PREDEFINED_THEMES)[number]

/**
 * Predefined tone options (derived from constant)
 */
export type PredefinedTone = (typeof PREDEFINED_TONES)[number]

// ============================================================================
// CORE DATA STRUCTURES
// ============================================================================

/**
 * Complete style inputs for tarot deck generation
 *
 * @property theme - Visual style theme (predefined or custom)
 * @property tone - Emotional/atmospheric tone (predefined or custom)
 * @property description - Detailed description of desired aesthetic (required, 10-500 chars)
 * @property concept - Optional conceptual theme or narrative
 * @property characters - Optional character descriptions or archetypes
 */
export interface StyleInputs {
  theme: string
  tone: string
  description: string
  concept?: string
  characters?: string
}

/**
 * Validation result for a single field
 */
export interface FieldValidation {
  fieldName: keyof StyleInputs
  isValid: boolean
  errors: string[]
}

/**
 * Complete validation state for all style inputs
 */
export interface StyleInputsValidation {
  isValid: boolean
  fields: Record<keyof StyleInputs, FieldValidation>
  canProceed: boolean
}

/**
 * Default values for style inputs
 * Used for form initialization
 */
export interface StyleInputsDefaults {
  theme: PredefinedTheme
  tone: PredefinedTone
  description: string
  concept: string
  characters: string
}

// ============================================================================
// INPUT CONTRACTS
// ============================================================================

/**
 * Input for validating style inputs
 * Partial allows validating individual fields or complete form
 *
 * @property theme - Theme to validate
 * @property tone - Tone to validate
 * @property description - Description to validate
 * @property concept - Optional concept to validate
 * @property characters - Optional characters to validate
 */
export interface ValidateStyleInputsInput {
  theme?: string
  tone?: string
  description?: string
  concept?: string
  characters?: string
}

/**
 * Input for saving style inputs to storage
 * Complete inputs required for save operation
 *
 * @property styleInputs - Complete style inputs
 * @property saveAsDraft - Whether to save to localStorage as draft
 */
export interface SaveStyleInputsInput {
  styleInputs: StyleInputs
  saveAsDraft: boolean
}

/**
 * Input for loading previously saved style inputs
 *
 * @property loadFromDraft - Whether to load from localStorage draft
 */
export interface LoadStyleInputsInput {
  loadFromDraft: boolean
}

// ============================================================================
// OUTPUT CONTRACTS
// ============================================================================

/**
 * Result of validating style inputs
 *
 * @property validation - Complete validation state
 * @property errors - All validation errors across fields
 * @property warnings - Non-blocking warnings (e.g., description too short but within limits)
 */
export interface ValidateStyleInputsOutput {
  validation: StyleInputsValidation
  errors: StyleInputValidationError[]
  warnings: string[]
}

/**
 * Result of saving style inputs
 *
 * @property saved - Whether save was successful
 * @property styleInputs - The saved style inputs (validated)
 * @property savedAt - Timestamp of save operation
 * @property savedToDraft - Whether saved to localStorage draft
 */
export interface SaveStyleInputsOutput {
  saved: boolean
  styleInputs: StyleInputs
  savedAt: Date
  savedToDraft: boolean
}

/**
 * Result of loading style inputs
 *
 * @property found - Whether saved inputs were found
 * @property styleInputs - Loaded style inputs (null if not found)
 * @property loadedFrom - Where inputs were loaded from ('draft' | 'default')
 */
export interface LoadStyleInputsOutput {
  found: boolean
  styleInputs: StyleInputs | null
  loadedFrom: 'draft' | 'default' | 'none'
}

/**
 * Get default style input values
 *
 * @property defaults - Default values for all fields
 */
export interface GetDefaultsOutput {
  defaults: StyleInputsDefaults
}

/**
 * Get predefined options for dropdowns
 *
 * @property themes - All predefined theme options
 * @property tones - All predefined tone options
 */
export interface GetPredefinedOptionsOutput {
  themes: readonly PredefinedTheme[]
  tones: readonly PredefinedTone[]
}

// ============================================================================
// ERROR CODES
// ============================================================================

/**
 * All possible error codes for style input operations
 */
export enum StyleInputErrorCode {
  // Theme validation
  THEME_REQUIRED = 'THEME_REQUIRED',
  THEME_TOO_LONG = 'THEME_TOO_LONG',
  THEME_INVALID = 'THEME_INVALID',

  // Tone validation
  TONE_REQUIRED = 'TONE_REQUIRED',
  TONE_TOO_LONG = 'TONE_TOO_LONG',
  TONE_INVALID = 'TONE_INVALID',

  // Description validation
  DESCRIPTION_REQUIRED = 'DESCRIPTION_REQUIRED',
  DESCRIPTION_TOO_SHORT = 'DESCRIPTION_TOO_SHORT',
  DESCRIPTION_TOO_LONG = 'DESCRIPTION_TOO_LONG',
  DESCRIPTION_INVALID = 'DESCRIPTION_INVALID',

  // Concept validation
  CONCEPT_TOO_LONG = 'CONCEPT_TOO_LONG',

  // Characters validation
  CHARACTERS_TOO_LONG = 'CHARACTERS_TOO_LONG',

  // Save/load errors
  SAVE_FAILED = 'SAVE_FAILED',
  LOAD_FAILED = 'LOAD_FAILED',
  LOCALSTORAGE_NOT_SUPPORTED = 'LOCALSTORAGE_NOT_SUPPORTED',
  DRAFT_NOT_FOUND = 'DRAFT_NOT_FOUND',
}

/**
 * Specific validation error with context
 */
export interface StyleInputValidationError {
  code: StyleInputErrorCode
  field: keyof StyleInputs
  message: string
  currentValue?: string
  constraint?: string | number
}

// ============================================================================
// SERVICE INTERFACE (THE CONTRACT)
// ============================================================================

/**
 * Style Input Service Contract
 *
 * Defines all operations for managing style input parameters.
 * Implementation handles:
 * - Field validation (required, length, format)
 * - Draft persistence (localStorage)
 * - Default values
 * - Predefined options for dropdowns
 *
 * @interface IStyleInputService
 */
export interface IStyleInputService {
  /**
   * Validate style inputs
   *
   * Validates all provided fields against rules.
   * Can validate partial inputs (for real-time validation) or complete form.
   *
   * @param input - Style inputs to validate (partial or complete)
   * @returns Promise<ServiceResponse<ValidateStyleInputsOutput>> - Validation results
   *
   * @throws Never throws - all errors returned in ServiceResponse
   *
   * @example
   * ```typescript
   * // Validate single field (real-time)
   * const result = await service.validateStyleInputs({
   *   description: userInput
   * });
   *
   * // Validate complete form
   * const result = await service.validateStyleInputs({
   *   theme: 'Cyberpunk',
   *   tone: 'Dark',
   *   description: 'Neon-lit dystopian future...'
   * });
   *
   * if (!result.data.validation.canProceed) {
   *   showErrors(result.data.errors);
   * }
   * ```
   */
  validateStyleInputs(
    input: ValidateStyleInputsInput
  ): Promise<ServiceResponse<ValidateStyleInputsOutput>>

  /**
   * Save style inputs
   *
   * Validates and saves style inputs to application state.
   * Optionally saves to localStorage as draft for session recovery.
   *
   * @param input - Style inputs to save and draft flag
   * @returns Promise<ServiceResponse<SaveStyleInputsOutput>> - Save result
   *
   * @throws Never throws - all errors returned in ServiceResponse
   *
   * @example
   * ```typescript
   * const result = await service.saveStyleInputs({
   *   styleInputs: {
   *     theme: 'Gothic',
   *     tone: 'Dark',
   *     description: 'Victorian era with supernatural elements...'
   *   },
   *   saveAsDraft: true  // Save to localStorage
   * });
   *
   * if (result.success) {
   *   console.log(`Saved at ${result.data.savedAt}`);
   * }
   * ```
   */
  saveStyleInputs(input: SaveStyleInputsInput): Promise<ServiceResponse<SaveStyleInputsOutput>>

  /**
   * Load previously saved style inputs
   *
   * Loads from localStorage draft if available.
   * Returns defaults if no draft found.
   *
   * @param input - Load options
   * @returns Promise<ServiceResponse<LoadStyleInputsOutput>> - Loaded inputs
   *
   * @throws Never throws - all errors returned in ServiceResponse
   *
   * @example
   * ```typescript
   * // On page load, try to restore draft
   * const result = await service.loadStyleInputs({
   *   loadFromDraft: true
   * });
   *
   * if (result.success && result.data.found) {
   *   populateForm(result.data.styleInputs);
   * } else {
   *   populateForm(await service.getDefaults());
   * }
   * ```
   */
  loadStyleInputs(input: LoadStyleInputsInput): Promise<ServiceResponse<LoadStyleInputsOutput>>

  /**
   * Get default style input values
   *
   * Returns recommended defaults for form initialization.
   *
   * @returns Promise<ServiceResponse<GetDefaultsOutput>> - Default values
   *
   * @throws Never throws - all errors returned in ServiceResponse
   *
   * @example
   * ```typescript
   * const result = await service.getDefaults();
   * if (result.success) {
   *   const { theme, tone, description } = result.data.defaults;
   *   // theme: 'Art Nouveau', tone: 'Mystical', description: ''
   * }
   * ```
   */
  getDefaults(): Promise<ServiceResponse<GetDefaultsOutput>>

  /**
   * Get predefined options for dropdowns
   *
   * Returns all predefined themes and tones for UI dropdown menus.
   *
   * @returns Promise<ServiceResponse<GetPredefinedOptionsOutput>> - Predefined options
   *
   * @throws Never throws - all errors returned in ServiceResponse
   *
   * @example
   * ```typescript
   * const result = await service.getPredefinedOptions();
   * if (result.success) {
   *   const { themes, tones } = result.data;
   *   // themes: ['Art Nouveau', 'Cyberpunk', ..., 'Custom']
   *   // tones: ['Dark', 'Light', ..., 'Custom']
   * }
   * ```
   */
  getPredefinedOptions(): Promise<ServiceResponse<GetPredefinedOptionsOutput>>

  /**
   * Clear draft from localStorage
   *
   * Removes saved draft to start fresh.
   * Used for "start over" functionality.
   *
   * @returns Promise<ServiceResponse<void>> - Success or error
   *
   * @throws Never throws - all errors returned in ServiceResponse
   *
   * @example
   * ```typescript
   * const result = await service.clearDraft();
   * if (result.success) {
   *   console.log('Draft cleared');
   * }
   * ```
   */
  clearDraft(): Promise<ServiceResponse<void>>
}

// ============================================================================
// USER-FRIENDLY ERROR MESSAGES
// ============================================================================

/**
 * Maps error codes to user-friendly messages
 */
export const STYLE_INPUT_ERROR_MESSAGES: Record<StyleInputErrorCode, string> = {
  [StyleInputErrorCode.THEME_REQUIRED]: 'Please select or enter a theme',
  [StyleInputErrorCode.THEME_TOO_LONG]: `Theme must be ${CHAR_LIMITS.theme} characters or less`,
  [StyleInputErrorCode.THEME_INVALID]: 'Theme contains invalid characters',

  [StyleInputErrorCode.TONE_REQUIRED]: 'Please select or enter a tone',
  [StyleInputErrorCode.TONE_TOO_LONG]: `Tone must be ${CHAR_LIMITS.tone} characters or less`,
  [StyleInputErrorCode.TONE_INVALID]: 'Tone contains invalid characters',

  [StyleInputErrorCode.DESCRIPTION_REQUIRED]: 'Description is required',
  [StyleInputErrorCode.DESCRIPTION_TOO_SHORT]: `Description must be at least ${CHAR_LIMITS.description.min} characters`,
  [StyleInputErrorCode.DESCRIPTION_TOO_LONG]: `Description must be ${CHAR_LIMITS.description.max} characters or less`,
  [StyleInputErrorCode.DESCRIPTION_INVALID]: 'Description contains invalid characters',

  [StyleInputErrorCode.CONCEPT_TOO_LONG]: `Concept must be ${CHAR_LIMITS.concept} characters or less`,

  [StyleInputErrorCode.CHARACTERS_TOO_LONG]: `Characters must be ${CHAR_LIMITS.characters} characters or less`,

  [StyleInputErrorCode.SAVE_FAILED]: 'Failed to save style inputs - please try again',
  [StyleInputErrorCode.LOAD_FAILED]: 'Failed to load style inputs',
  [StyleInputErrorCode.LOCALSTORAGE_NOT_SUPPORTED]: 'Your browser does not support saving drafts',
  [StyleInputErrorCode.DRAFT_NOT_FOUND]: 'No saved draft found',
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

/**
 * Default style inputs
 * Used when no draft is available
 */
export const DEFAULT_STYLE_INPUTS: StyleInputsDefaults = {
  theme: 'Art Nouveau', // Tarot-appropriate default
  tone: 'Mystical', // Tarot-appropriate default
  description: '', // User must provide
  concept: '', // Optional
  characters: '', // Optional
} as const

// ============================================================================
// METADATA
// ============================================================================

/**
 * Contract metadata for tracking and documentation
 */
export const STYLE_INPUT_CONTRACT_METADATA = {
  version: '1.0.0',
  seam: 'StyleInputSeam',
  boundary: 'HTML Form → Application State',
  requirement: 'PRD: User Flow Step 2',
  lastUpdated: '2025-11-07',
  dependencies: [],
} as const
