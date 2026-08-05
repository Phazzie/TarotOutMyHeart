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

type FieldError = { code: StyleInputErrorCode; message: string };

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
  private validateField(fieldName: keyof StyleInputs, value: string | undefined): FieldValidation & { specificErrors: FieldError[] } {
    const specificErrors: FieldError[] = [];

    switch (fieldName) {
      case 'theme':
        if (!value || value.trim().length === 0) {
          specificErrors.push({ code: StyleInputErrorCode.THEME_REQUIRED, message: 'Theme is required' });
        } else if (value.length > CHAR_LIMITS.theme) {
          specificErrors.push({ code: StyleInputErrorCode.THEME_TOO_LONG, message: `Theme must be ${CHAR_LIMITS.theme} characters or less` });
        }
        break;

      case 'tone':
        if (!value || value.trim().length === 0) {
          specificErrors.push({ code: StyleInputErrorCode.TONE_REQUIRED, message: 'Tone is required' });
        } else if (value.length > CHAR_LIMITS.tone) {
          specificErrors.push({ code: StyleInputErrorCode.TONE_TOO_LONG, message: `Tone must be ${CHAR_LIMITS.tone} characters or less` });
        }
        break;

      case 'description':
        if (!value || value.trim().length === 0) {
          specificErrors.push({ code: StyleInputErrorCode.DESCRIPTION_REQUIRED, message: 'Description is required' });
        } else if (value.length < CHAR_LIMITS.description.min) {
          specificErrors.push({ code: StyleInputErrorCode.DESCRIPTION_TOO_SHORT, message: `Description must be at least ${CHAR_LIMITS.description.min} characters` });
        } else if (value.length > CHAR_LIMITS.description.max) {
          specificErrors.push({ code: StyleInputErrorCode.DESCRIPTION_TOO_LONG, message: `Description must be ${CHAR_LIMITS.description.max} characters or less` });
        }
        break;

      case 'concept':
        if (value && value.length > CHAR_LIMITS.concept) {
          specificErrors.push({ code: StyleInputErrorCode.CONCEPT_TOO_LONG, message: `Concept must be ${CHAR_LIMITS.concept} characters or less` });
        }
        break;

      case 'characters':
        if (value && value.length > CHAR_LIMITS.characters) {
          specificErrors.push({ code: StyleInputErrorCode.CHARACTERS_TOO_LONG, message: `Characters must be ${CHAR_LIMITS.characters} characters or less` });
        }
        break;
    }

    return {
      fieldName,
      isValid: specificErrors.length === 0,
      errors: specificErrors.map(e => e.message),
      specificErrors,
    };
  }

  async validateStyleInputs(
    input: ValidateStyleInputsInput
  ): Promise<ServiceResponse<ValidateStyleInputsOutput>> {
    await this.delay(50)

    const fields = {
      theme: this.validateField('theme', input.theme),
      tone: this.validateField('tone', input.tone),
      description: this.validateField('description', input.description),
      concept: this.validateField('concept', input.concept),
      characters: this.validateField('characters', input.characters),
    }

    const errors: StyleInputValidationError[] = []

    for (const [field, validation] of Object.entries(fields)) {
      if (!validation.isValid) {
        for (const err of validation.specificErrors) {
          errors.push({
            code: err.code,
            field: field as keyof StyleInputs,
            message: err.message,
          });
        }
      }
    }

    const isValid = errors.length === 0;
    const canProceed =
      fields.theme.isValid && fields.tone.isValid && fields.description.isValid;

    const validationState: StyleInputsValidation = {
      isValid,
      fields,
      canProceed,
    };

    return {
      success: true,
      data: {
        validation: validationState,
        errors,
        warnings: [],
      },
    };
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
        styleInputs: DEFAULT_STYLE_INPUTS,
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
