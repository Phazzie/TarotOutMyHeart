/**
 * @fileoverview Style Input Mock Service
 * @purpose Mock implementation of IStyleInputService for testing and development
 * @dataFlow Form inputs → Validation → In-memory storage simulation → Application state
 * @boundary Seam #2: StyleInputSeam - Validates and stores user style preferences
 * @updated 2025-11-14
 *
 * @example
 * ```typescript
 * const service = new StyleInputMock()
 * const result = await service.validateStyleInputs({
 *   theme: 'Cyberpunk',
 *   tone: 'Dark',
 *   description: 'Neon-lit dystopian future...'
 * })
 * ```
 */

import type {
  IStyleInputService,
  ValidateStyleInputsInput,
  ValidateStyleInputsOutput,
  SaveStyleInputsInput,
  SaveStyleInputsOutput,
  LoadStyleInputsInput,
  LoadStyleInputsOutput,
  GetDefaultsOutput,
  GetPredefinedOptionsOutput,
  StyleInputs,
  StyleInputsValidation,
  FieldValidation,
  StyleInputValidationError,
} from '../../contracts/StyleInput'

import {
  StyleInputErrorCode,
  CHAR_LIMITS,
  PREDEFINED_THEMES,
  PREDEFINED_TONES,
  DEFAULT_STYLE_INPUTS,
  STYLE_INPUT_ERROR_MESSAGES,
} from '../../contracts/StyleInput'

import type { ServiceResponse } from '../../contracts/types/common'

/**
 * Mock implementation of Style Input Service
 *
 * Simulates localStorage with in-memory storage for draft persistence.
 * All validation logic matches real service behavior.
 */
export class StyleInputMock implements IStyleInputService {
  /**
   * In-memory storage simulating localStorage
   * In real service, this would be localStorage
   */
  private draftStorage: StyleInputs | null = null

  /**
   * Validate style inputs
   *
   * Validates all provided fields against contract rules.
   * Supports partial validation for real-time field validation.
   */
  async validateStyleInputs(
    input: ValidateStyleInputsInput
  ): Promise<ServiceResponse<ValidateStyleInputsOutput>> {
    const fields: Record<string, FieldValidation> = {}
    const errors: StyleInputValidationError[] = []
    const warnings: string[] = []

    // Validate theme if provided
    if (input.theme !== undefined) {
      const themeValidation = this.validateTheme(input.theme)
      fields['theme'] = themeValidation
      if (!themeValidation.isValid) {
        errors.push(...this.createValidationErrors('theme', themeValidation.errors))
      }
    }

    // Validate tone if provided
    if (input.tone !== undefined) {
      const toneValidation = this.validateTone(input.tone)
      fields['tone'] = toneValidation
      if (!toneValidation.isValid) {
        errors.push(...this.createValidationErrors('tone', toneValidation.errors))
      }
    }

    // Validate description if provided
    if (input.description !== undefined) {
      const descriptionValidation = this.validateDescription(input.description)
      fields['description'] = descriptionValidation
      if (!descriptionValidation.isValid) {
        errors.push(...this.createValidationErrors('description', descriptionValidation.errors))
      }

      // Add warning if description is short but valid
      if (input.description.length >= CHAR_LIMITS.description.min &&
          input.description.length < 50) {
        warnings.push('Consider adding more detail to your description for better results')
      }
    }

    // Validate concept if provided
    if (input.concept !== undefined) {
      const conceptValidation = this.validateConcept(input.concept)
      fields['concept'] = conceptValidation
      if (!conceptValidation.isValid) {
        errors.push(...this.createValidationErrors('concept', conceptValidation.errors))
      }
    }

    // Validate characters if provided
    if (input.characters !== undefined) {
      const charactersValidation = this.validateCharacters(input.characters)
      fields['characters'] = charactersValidation
      if (!charactersValidation.isValid) {
        errors.push(...this.createValidationErrors('characters', charactersValidation.errors))
      }
    }

    // Determine overall validation state
    const allFieldsValid = Object.values(fields).every(f => f.isValid)
    const hasRequiredFields =
      (fields['theme']?.isValid ?? false) &&
      (fields['tone']?.isValid ?? false) &&
      (fields['description']?.isValid ?? false)
    const canProceed = allFieldsValid && hasRequiredFields

    const validation: StyleInputsValidation = {
      isValid: allFieldsValid,
      fields: fields as Record<keyof StyleInputs, FieldValidation>,
      canProceed,
    }

    return {
      success: true,
      data: {
        validation,
        errors,
        warnings,
      },
    }
  }

  /**
   * Save style inputs
   *
   * Validates and saves style inputs to in-memory storage.
   * Optionally saves to draft storage for session recovery.
   */
  async saveStyleInputs(
    input: SaveStyleInputsInput
  ): Promise<ServiceResponse<SaveStyleInputsOutput>> {
    const now = new Date()

    // If saveAsDraft is true, store in draft storage
    if (input.saveAsDraft) {
      this.draftStorage = { ...input.styleInputs }
    }

    return {
      success: true,
      data: {
        saved: true,
        styleInputs: { ...input.styleInputs },
        savedAt: now,
        savedToDraft: input.saveAsDraft,
      },
    }
  }

  /**
   * Load previously saved style inputs
   *
   * Loads from draft storage if available and requested.
   * Returns defaults if no draft found.
   */
  async loadStyleInputs(
    input: LoadStyleInputsInput
  ): Promise<ServiceResponse<LoadStyleInputsOutput>> {
    // If loadFromDraft is true, try to load from draft storage
    if (input.loadFromDraft && this.draftStorage !== null) {
      return {
        success: true,
        data: {
          found: true,
          styleInputs: { ...this.draftStorage },
          loadedFrom: 'draft',
        },
      }
    }

    // Return defaults if no draft or not loading from draft
    const defaults = this.getDefaultValues()
    return {
      success: true,
      data: {
        found: false,
        styleInputs: defaults,
        loadedFrom: 'default',
      },
    }
  }

  /**
   * Get default style input values
   *
   * Returns tarot-appropriate defaults for form initialization.
   */
  async getDefaults(): Promise<ServiceResponse<GetDefaultsOutput>> {
    return {
      success: true,
      data: {
        defaults: { ...DEFAULT_STYLE_INPUTS },
      },
    }
  }

  /**
   * Get predefined options for dropdowns
   *
   * Returns all predefined themes and tones for UI dropdown menus.
   */
  async getPredefinedOptions(): Promise<ServiceResponse<GetPredefinedOptionsOutput>> {
    return {
      success: true,
      data: {
        themes: PREDEFINED_THEMES,
        tones: PREDEFINED_TONES,
      },
    }
  }

  /**
   * Clear draft from storage
   *
   * Removes saved draft to start fresh.
   */
  async clearDraft(): Promise<ServiceResponse<void>> {
    this.draftStorage = null
    return {
      success: true,
      data: undefined,
    }
  }

  // ============================================================================
  // PRIVATE VALIDATION HELPERS
  // ============================================================================

  /**
   * Validate theme field
   */
  private validateTheme(theme: string): FieldValidation {
    const errors: string[] = []

    if (!theme || theme.trim().length === 0) {
      errors.push(StyleInputErrorCode.THEME_REQUIRED)
    } else if (theme.length > CHAR_LIMITS.theme) {
      errors.push(StyleInputErrorCode.THEME_TOO_LONG)
    }

    return {
      fieldName: 'theme',
      isValid: errors.length === 0,
      errors,
    }
  }

  /**
   * Validate tone field
   */
  private validateTone(tone: string): FieldValidation {
    const errors: string[] = []

    if (!tone || tone.trim().length === 0) {
      errors.push(StyleInputErrorCode.TONE_REQUIRED)
    } else if (tone.length > CHAR_LIMITS.tone) {
      errors.push(StyleInputErrorCode.TONE_TOO_LONG)
    }

    return {
      fieldName: 'tone',
      isValid: errors.length === 0,
      errors,
    }
  }

  /**
   * Validate description field
   */
  private validateDescription(description: string): FieldValidation {
    const errors: string[] = []

    if (!description || description.trim().length === 0) {
      errors.push(StyleInputErrorCode.DESCRIPTION_REQUIRED)
    } else if (description.length < CHAR_LIMITS.description.min) {
      errors.push(StyleInputErrorCode.DESCRIPTION_TOO_SHORT)
    } else if (description.length > CHAR_LIMITS.description.max) {
      errors.push(StyleInputErrorCode.DESCRIPTION_TOO_LONG)
    }

    return {
      fieldName: 'description',
      isValid: errors.length === 0,
      errors,
    }
  }

  /**
   * Validate concept field (optional)
   */
  private validateConcept(concept: string): FieldValidation {
    const errors: string[] = []

    if (concept.length > CHAR_LIMITS.concept) {
      errors.push(StyleInputErrorCode.CONCEPT_TOO_LONG)
    }

    return {
      fieldName: 'concept',
      isValid: errors.length === 0,
      errors,
    }
  }

  /**
   * Validate characters field (optional)
   */
  private validateCharacters(characters: string): FieldValidation {
    const errors: string[] = []

    if (characters.length > CHAR_LIMITS.characters) {
      errors.push(StyleInputErrorCode.CHARACTERS_TOO_LONG)
    }

    return {
      fieldName: 'characters',
      isValid: errors.length === 0,
      errors,
    }
  }

  /**
   * Create validation error objects from error codes
   */
  private createValidationErrors(
    field: keyof StyleInputs,
    errorCodes: string[]
  ): StyleInputValidationError[] {
    return errorCodes.map(code => ({
      code: code as StyleInputErrorCode,
      field,
      message: STYLE_INPUT_ERROR_MESSAGES[code as StyleInputErrorCode] || 'Validation error',
    }))
  }

  /**
   * Get default style input values as StyleInputs
   */
  private getDefaultValues(): StyleInputs {
    return {
      theme: DEFAULT_STYLE_INPUTS.theme,
      tone: DEFAULT_STYLE_INPUTS.tone,
      description: DEFAULT_STYLE_INPUTS.description,
      concept: DEFAULT_STYLE_INPUTS.concept,
      characters: DEFAULT_STYLE_INPUTS.characters,
    }
  }
}
