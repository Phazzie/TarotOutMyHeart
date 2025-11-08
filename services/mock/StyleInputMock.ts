/**
 * @fileoverview Mock implementation of StyleInput service
 * @purpose Provide realistic style input validation and storage for UI development
 * @dataFlow Form Input → Validation → In-memory/localStorage storage → Validation Results
 * @mockBehavior
 *   - Validates all fields against character limits
 *   - Validates required fields (theme, tone, description)
 *   - Simulates localStorage draft save/load
 *   - Returns predefined dropdown options
 *   - Simulates 100ms processing delay
 * @dependencies contracts/StyleInput.ts
 * @updated 2025-11-07
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
  StyleInputErrorCode,
} from '$contracts/StyleInput'

import {
  CHAR_LIMITS,
  PREDEFINED_THEMES,
  PREDEFINED_TONES,
  DEFAULT_STYLE_INPUTS,
} from '$contracts/StyleInput'

import type { ServiceResponse } from '$contracts/types/common'

/**
 * localStorage key for draft storage
 */
const DRAFT_STORAGE_KEY = 'tarot_style_inputs_draft'

/**
 * Mock implementation of StyleInputService
 * 
 * Provides form validation and draft persistence simulation.
 */
export class StyleInputMockService implements IStyleInputService {
  private currentStyleInputs: StyleInputs | null = null

  /**
   * Validate style inputs
   */
  async validateStyleInputs(
    input: ValidateStyleInputsInput
  ): Promise<ServiceResponse<ValidateStyleInputsOutput>> {
    await this.delay(100)

    const errors: StyleInputValidationError[] = []
    const warnings: string[] = []
    const fields: Record<keyof StyleInputs, FieldValidation> = {
      theme: { fieldName: 'theme', isValid: true, errors: [] },
      tone: { fieldName: 'tone', isValid: true, errors: [] },
      description: { fieldName: 'description', isValid: true, errors: [] },
      concept: { fieldName: 'concept', isValid: true, errors: [] },
      characters: { fieldName: 'characters', isValid: true, errors: [] },
    }

    // Validate theme
    if (input.theme !== undefined) {
      const themeValidation = this.validateTheme(input.theme)
      if (!themeValidation.isValid) {
        fields.theme = themeValidation
        errors.push(...themeValidation.errors.map(msg => ({
          code: StyleInputErrorCode.THEME_INVALID,
          field: 'theme' as const,
          message: msg,
          currentValue: input.theme,
        })))
      }
    }

    // Validate tone
    if (input.tone !== undefined) {
      const toneValidation = this.validateTone(input.tone)
      if (!toneValidation.isValid) {
        fields.tone = toneValidation
        errors.push(...toneValidation.errors.map(msg => ({
          code: StyleInputErrorCode.TONE_INVALID,
          field: 'tone' as const,
          message: msg,
          currentValue: input.tone,
        })))
      }
    }

    // Validate description (required field)
    if (input.description !== undefined) {
      const descriptionValidation = this.validateDescription(input.description)
      if (!descriptionValidation.isValid) {
        fields.description = descriptionValidation
        errors.push(...descriptionValidation.errors.map(msg => ({
          code: this.getDescriptionErrorCode(msg),
          field: 'description' as const,
          message: msg,
          currentValue: input.description,
        })))
      } else if (input.description.length < 50) {
        warnings.push('Consider adding more details to your description for better results')
      }
    }

    // Validate concept (optional)
    if (input.concept !== undefined) {
      const conceptValidation = this.validateConcept(input.concept)
      if (!conceptValidation.isValid) {
        fields.concept = conceptValidation
        errors.push(...conceptValidation.errors.map(msg => ({
          code: StyleInputErrorCode.CONCEPT_TOO_LONG,
          field: 'concept' as const,
          message: msg,
          currentValue: input.concept,
        })))
      }
    }

    // Validate characters (optional)
    if (input.characters !== undefined) {
      const charactersValidation = this.validateCharacters(input.characters)
      if (!charactersValidation.isValid) {
        fields.characters = charactersValidation
        errors.push(...charactersValidation.errors.map(msg => ({
          code: StyleInputErrorCode.CHARACTERS_TOO_LONG,
          field: 'characters' as const,
          message: msg,
          currentValue: input.characters,
        })))
      }
    }

    const isValid = errors.length === 0
    const canProceed = isValid && 
      input.theme !== undefined && 
      input.tone !== undefined && 
      input.description !== undefined &&
      input.description.length >= CHAR_LIMITS.description.min

    const validation: StyleInputsValidation = {
      isValid,
      fields,
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
   */
  async saveStyleInputs(
    input: SaveStyleInputsInput
  ): Promise<ServiceResponse<SaveStyleInputsOutput>> {
    await this.delay(150)

    const { styleInputs, saveAsDraft } = input

    // Validate before saving
    const validationResult = await this.validateStyleInputs(styleInputs)
    
    if (!validationResult.data.validation.canProceed) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Style inputs contain errors',
          retryable: false,
        },
      }
    }

    // Save to memory
    this.currentStyleInputs = styleInputs

    // Save to localStorage if requested
    let savedToDraft = false
    if (saveAsDraft) {
      try {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(styleInputs))
        savedToDraft = true
      } catch (error) {
        // localStorage might not be available or quota exceeded
        // Continue anyway, just don't save draft
        console.warn('Could not save draft to localStorage:', error)
      }
    }

    return {
      success: true,
      data: {
        saved: true,
        styleInputs,
        savedAt: new Date(),
        savedToDraft,
      },
    }
  }

  /**
   * Load previously saved style inputs
   */
  async loadStyleInputs(
    input: LoadStyleInputsInput
  ): Promise<ServiceResponse<LoadStyleInputsOutput>> {
    await this.delay(100)

    const { loadFromDraft } = input

    // Try to load from draft if requested
    if (loadFromDraft) {
      try {
        const draftJson = localStorage.getItem(DRAFT_STORAGE_KEY)
        if (draftJson) {
          const draft = JSON.parse(draftJson) as StyleInputs
          this.currentStyleInputs = draft
          return {
            success: true,
            data: {
              found: true,
              styleInputs: draft,
              loadedFrom: 'draft',
            },
          }
        }
      } catch (error) {
        // localStorage error or invalid JSON - continue to defaults
        console.warn('Could not load draft from localStorage:', error)
      }
    }

    // Return defaults if no draft found
    return {
      success: true,
      data: {
        found: false,
        styleInputs: null,
        loadedFrom: 'none',
      },
    }
  }

  /**
   * Get default style input values
   */
  async getDefaults(): Promise<ServiceResponse<GetDefaultsOutput>> {
    await this.delay(50)

    return {
      success: true,
      data: {
        defaults: { ...DEFAULT_STYLE_INPUTS },
      },
    }
  }

  /**
   * Get predefined options for dropdowns
   */
  async getPredefinedOptions(): Promise<ServiceResponse<GetPredefinedOptionsOutput>> {
    await this.delay(50)

    return {
      success: true,
      data: {
        themes: PREDEFINED_THEMES,
        tones: PREDEFINED_TONES,
      },
    }
  }

  /**
   * Clear draft from localStorage
   */
  async clearDraft(): Promise<ServiceResponse<void>> {
    await this.delay(100)

    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY)
      this.currentStyleInputs = null
      return {
        success: true,
        data: undefined,
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CLEAR_FAILED',
          message: 'Could not clear draft',
          retryable: true,
        },
      }
    }
  }

  // ============================================================================
  // PRIVATE VALIDATION METHODS
  // ============================================================================

  /**
   * Validate theme field
   */
  private validateTheme(theme: string): FieldValidation {
    const errors: string[] = []

    if (!theme || theme.trim().length === 0) {
      errors.push('Please select or enter a theme')
    } else if (theme.length > CHAR_LIMITS.theme) {
      errors.push(`Theme must be ${CHAR_LIMITS.theme} characters or less`)
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
      errors.push('Please select or enter a tone')
    } else if (tone.length > CHAR_LIMITS.tone) {
      errors.push(`Tone must be ${CHAR_LIMITS.tone} characters or less`)
    }

    return {
      fieldName: 'tone',
      isValid: errors.length === 0,
      errors,
    }
  }

  /**
   * Validate description field (required)
   */
  private validateDescription(description: string): FieldValidation {
    const errors: string[] = []

    if (!description || description.trim().length === 0) {
      errors.push('Description is required')
    } else if (description.length < CHAR_LIMITS.description.min) {
      errors.push(`Description must be at least ${CHAR_LIMITS.description.min} characters`)
    } else if (description.length > CHAR_LIMITS.description.max) {
      errors.push(`Description must be ${CHAR_LIMITS.description.max} characters or less`)
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

    if (concept && concept.length > CHAR_LIMITS.concept) {
      errors.push(`Concept must be ${CHAR_LIMITS.concept} characters or less`)
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

    if (characters && characters.length > CHAR_LIMITS.characters) {
      errors.push(`Characters must be ${CHAR_LIMITS.characters} characters or less`)
    }

    return {
      fieldName: 'characters',
      isValid: errors.length === 0,
      errors,
    }
  }

  /**
   * Get appropriate error code for description errors
   */
  private getDescriptionErrorCode(errorMessage: string): StyleInputErrorCode {
    if (errorMessage.includes('required')) {
      return StyleInputErrorCode.DESCRIPTION_REQUIRED
    } else if (errorMessage.includes('at least')) {
      return StyleInputErrorCode.DESCRIPTION_TOO_SHORT
    } else if (errorMessage.includes('or less')) {
      return StyleInputErrorCode.DESCRIPTION_TOO_LONG
    }
    return StyleInputErrorCode.DESCRIPTION_INVALID
  }

  /**
   * Simulate async delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

/**
 * Singleton instance for use throughout the application
 */
export const styleInputMockService = new StyleInputMockService()
