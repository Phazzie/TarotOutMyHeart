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

    const fields: Record<keyof StyleInputs, FieldValidation> = {
      theme: this.validateField('theme', input.theme),
      tone: this.validateField('tone', input.tone),
      description: this.validateField('description', input.description),
      concept: this.validateField('concept', input.concept),
      characters: this.validateField('characters', input.characters),
    }

    const allErrors: StyleInputValidationError[] = []
    let isValid = true

    for (const [fieldName, validation] of Object.entries(fields)) {
      if (!validation.isValid) {
        isValid = false
        for (const errorMsg of validation.errors) {
          allErrors.push({
            code: this.getErrorCodeForField(fieldName as keyof StyleInputs),
            field: fieldName as keyof StyleInputs,
            message: errorMsg,
            currentValue: input[fieldName as keyof StyleInputs],
          })
        }
      }
    }

    // Required fields check for canProceed
    const hasRequiredFields =
      fields.theme.isValid && fields.tone.isValid && fields.description.isValid

    const validation: StyleInputsValidation = {
      isValid,
      fields,
      canProceed: hasRequiredFields,
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

  private getErrorCodeForField(field: keyof StyleInputs): StyleInputErrorCode {
    switch (field) {
      case 'theme':
        return StyleInputErrorCode.THEME_REQUIRED
      case 'tone':
        return StyleInputErrorCode.TONE_REQUIRED
      case 'description':
        return StyleInputErrorCode.DESCRIPTION_REQUIRED
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

    // Return defaults if no draft
    return {
      success: true,
      data: {
        found: false,
        styleInputs: null,
        loadedFrom: 'none',
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
