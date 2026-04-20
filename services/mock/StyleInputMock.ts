/**
 * @fileoverview Mock implementation of IStyleInputService
 * @purpose Provide realistic mock behavior for style input operations
 * @boundary Seam #2: StyleInputSeam
 * @contract contracts/StyleInput.ts
 */

import type { ServiceResponse } from '$contracts/types/common'
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
} from '$contracts/StyleInput'
import {
  StyleInputErrorCode,
  CHAR_LIMITS,
  PREDEFINED_THEMES,
  PREDEFINED_TONES,
  DEFAULT_STYLE_INPUTS,
} from '$contracts/StyleInput'

const STORAGE_KEY = 'tarot-style-draft'

/**
 * Mock implementation of IStyleInputService
 * Validates inputs and persists drafts to localStorage
 */
export class StyleInputMockService implements IStyleInputService {
  /**
   * Simulate async delay
   */
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Validate a single field
   */
  private validateField(fieldName: keyof StyleInputs, value: string | undefined): FieldValidation {
    const errors: string[] = []

    switch (fieldName) {
      case 'theme':
        if (!value || value.trim().length === 0) {
          errors.push('Theme is required')
        } else if (value.length > CHAR_LIMITS.theme) {
          errors.push(`Theme must be ${CHAR_LIMITS.theme} characters or less`)
        }
        break

      case 'tone':
        if (!value || value.trim().length === 0) {
          errors.push('Tone is required')
        } else if (value.length > CHAR_LIMITS.tone) {
          errors.push(`Tone must be ${CHAR_LIMITS.tone} characters or less`)
        }
        break

      case 'description':
        if (!value || value.trim().length === 0) {
          errors.push('Description is required')
        } else if (value.length < CHAR_LIMITS.description.min) {
          errors.push(`Description must be at least ${CHAR_LIMITS.description.min} characters`)
        } else if (value.length > CHAR_LIMITS.description.max) {
          errors.push(`Description must be ${CHAR_LIMITS.description.max} characters or less`)
        }
        break

      case 'concept':
        if (value && value.length > CHAR_LIMITS.concept) {
          errors.push(`Concept must be ${CHAR_LIMITS.concept} characters or less`)
        }
        break

      case 'characters':
        if (value && value.length > CHAR_LIMITS.characters) {
          errors.push(`Characters must be ${CHAR_LIMITS.characters} characters or less`)
        }
        break
    }

    return {
      fieldName,
      isValid: errors.length === 0,
      errors,
    }
  }

  async validateStyleInputs(
    input: ValidateStyleInputsInput
  ): Promise<ServiceResponse<ValidateStyleInputsOutput>> {
    await this.delay(50)

    // Only validate fields that are explicitly present in the input
    const makeSkippedValidation = (fieldName: keyof StyleInputs): FieldValidation => ({
      fieldName,
      isValid: true,
      errors: [],
    })

    const fields: Record<keyof StyleInputs, FieldValidation> = {
      theme:
        'theme' in input
          ? this.validateField('theme', input.theme)
          : makeSkippedValidation('theme'),
      tone:
        'tone' in input ? this.validateField('tone', input.tone) : makeSkippedValidation('tone'),
      description:
        'description' in input
          ? this.validateField('description', input.description)
          : makeSkippedValidation('description'),
      concept:
        'concept' in input
          ? this.validateField('concept', input.concept)
          : makeSkippedValidation('concept'),
      characters:
        'characters' in input
          ? this.validateField('characters', input.characters)
          : makeSkippedValidation('characters'),
    }

    const allErrors: StyleInputValidationError[] = []
    let isValid = true

    for (const [fieldName, validation] of Object.entries(fields)) {
      if (!validation.isValid) {
        isValid = false
        for (const errorMsg of validation.errors) {
          allErrors.push({
            code: this.getErrorCodeForField(fieldName as keyof StyleInputs, errorMsg),
            field: fieldName as keyof StyleInputs,
            message: errorMsg,
            currentValue: input[fieldName as keyof ValidateStyleInputsInput],
          })
        }
      }
    }

    // canProceed: all required fields must be present in input AND valid
    const hasValidTheme = 'theme' in input && fields.theme.isValid
    const hasValidTone = 'tone' in input && fields.tone.isValid
    const hasValidDescription = 'description' in input && fields.description.isValid
    const canProceed = hasValidTheme && hasValidTone && hasValidDescription

    const validation: StyleInputsValidation = {
      isValid,
      fields,
      canProceed,
    }

    return {
      success: true,
      data: {
        validation,
        errors: allErrors,
        warnings: [],
      },
    }
  }

  private getErrorCodeForField(
    field: keyof StyleInputs,
    errorMessage: string
  ): StyleInputErrorCode {
    switch (field) {
      case 'theme':
        if (errorMessage.toLowerCase().includes('required'))
          return StyleInputErrorCode.THEME_REQUIRED
        return StyleInputErrorCode.THEME_TOO_LONG
      case 'tone':
        if (errorMessage.toLowerCase().includes('required'))
          return StyleInputErrorCode.TONE_REQUIRED
        return StyleInputErrorCode.TONE_TOO_LONG
      case 'description':
        if (errorMessage.toLowerCase().includes('required'))
          return StyleInputErrorCode.DESCRIPTION_REQUIRED
        if (errorMessage.toLowerCase().includes('at least'))
          return StyleInputErrorCode.DESCRIPTION_TOO_SHORT
        return StyleInputErrorCode.DESCRIPTION_TOO_LONG
      case 'concept':
        return StyleInputErrorCode.CONCEPT_TOO_LONG
      case 'characters':
        return StyleInputErrorCode.CHARACTERS_TOO_LONG
      default:
        return StyleInputErrorCode.SAVE_FAILED
    }
  }

  async saveStyleInputs(
    input: SaveStyleInputsInput
  ): Promise<ServiceResponse<SaveStyleInputsOutput>> {
    await this.delay(100)

    const { styleInputs, saveAsDraft } = input

    // Validate before saving
    const validationResult = await this.validateStyleInputs(styleInputs)
    if (!validationResult.data?.validation.canProceed) {
      return {
        success: false,
        error: {
          code: StyleInputErrorCode.SAVE_FAILED,
          message: 'Cannot save invalid style inputs',
          retryable: false,
        },
      }
    }

    let savedToDraft = false
    if (saveAsDraft) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(styleInputs))
        savedToDraft = true
      } catch {
        // localStorage might be unavailable
        savedToDraft = false
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

  async loadStyleInputs(
    input: LoadStyleInputsInput
  ): Promise<ServiceResponse<LoadStyleInputsOutput>> {
    await this.delay(50)

    const { loadFromDraft } = input

    if (loadFromDraft) {
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
          const styleInputs = JSON.parse(stored) as StyleInputs
          return {
            success: true,
            data: {
              found: true,
              styleInputs,
              loadedFrom: 'draft',
            },
          }
        }
      } catch {
        // localStorage might be unavailable or data corrupted
      }
    }

    // Return defaults when no draft found or loadFromDraft is false
    return {
      success: true,
      data: {
        found: false,
        styleInputs: { ...DEFAULT_STYLE_INPUTS },
        loadedFrom: 'default',
      },
    }
  }

  async getDefaults(): Promise<ServiceResponse<GetDefaultsOutput>> {
    await this.delay(10)

    return {
      success: true,
      data: {
        defaults: { ...DEFAULT_STYLE_INPUTS },
      },
    }
  }

  async getPredefinedOptions(): Promise<ServiceResponse<GetPredefinedOptionsOutput>> {
    await this.delay(10)

    return {
      success: true,
      data: {
        themes: PREDEFINED_THEMES,
        tones: PREDEFINED_TONES,
      },
    }
  }

  async clearDraft(): Promise<ServiceResponse<void>> {
    await this.delay(50)

    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // localStorage might be unavailable
    }

    return {
      success: true,
      data: undefined,
    }
  }
}
