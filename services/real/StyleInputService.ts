/**
 * @fileoverview StyleInputService — real implementation.
 * PreMortem #8: Must NOT crash when localStorage is undefined (SSR/Node.js).
 * Design: SSR guard on every localStorage access, returns DEFAULT_STYLE_INPUTS on server.
 */

import type { ServiceResponse } from '$contracts/types/common';
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
} from '$contracts/StyleInput';
import {
  StyleInputErrorCode,
  CHAR_LIMITS,
  PREDEFINED_THEMES,
  PREDEFINED_TONES,
  DEFAULT_STYLE_INPUTS,
} from '$contracts/StyleInput';

export const STORAGE_KEY = 'tarot_style_inputs';

type FieldError = { code: StyleInputErrorCode; message: string };

export class StyleInputService implements IStyleInputService {
  private isSSR(): boolean {
    return typeof localStorage === 'undefined';
  }

  private validateField(
    fieldName: keyof StyleInputs,
    value: string | undefined,
  ): FieldValidation & { specificErrors: FieldError[] } {
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
    input: ValidateStyleInputsInput,
  ): Promise<ServiceResponse<ValidateStyleInputsOutput>> {
    const fields = {
      theme: this.validateField('theme', input.theme),
      tone: this.validateField('tone', input.tone),
      description: this.validateField('description', input.description),
      concept: this.validateField('concept', input.concept),
      characters: this.validateField('characters', input.characters),
    };

    const errors: StyleInputValidationError[] = [];

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
    input: SaveStyleInputsInput,
  ): Promise<ServiceResponse<SaveStyleInputsOutput>> {
    const { styleInputs, saveAsDraft } = input;

    const validationRes = await this.validateStyleInputs(styleInputs);
    if (!validationRes.data?.validation.canProceed) {
      return {
        success: false,
        error: {
          code: StyleInputErrorCode.SAVE_FAILED,
          message: 'Invalid style inputs',
          retryable: false,
        },
      };
    }

    if (saveAsDraft && !this.isSSR()) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(styleInputs));
      } catch {
        // Ignored non-fatal
      }
    }

    return {
      success: true,
      data: {
        saved: true,
        styleInputs,
        savedAt: new Date(),
        savedToDraft: saveAsDraft,
      },
    };
  }

  async loadStyleInputs(
    input: LoadStyleInputsInput,
  ): Promise<ServiceResponse<LoadStyleInputsOutput>> {
    if (!input.loadFromDraft || this.isSSR()) {
      return {
        success: true,
        data: {
          found: false,
          styleInputs: DEFAULT_STYLE_INPUTS,
          loadedFrom: 'default',
        },
      };
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return {
          success: true,
          data: {
            found: false,
            styleInputs: DEFAULT_STYLE_INPUTS,
            loadedFrom: 'default',
          },
        };
      }

      const styleInputs = JSON.parse(raw) as StyleInputs;
      return {
        success: true,
        data: {
          found: true,
          styleInputs,
          loadedFrom: 'draft',
        },
      };
    } catch {
      return {
        success: true,
        data: {
          found: false,
          styleInputs: DEFAULT_STYLE_INPUTS,
          loadedFrom: 'default',
        },
      };
    }
  }

  async getDefaults(): Promise<ServiceResponse<GetDefaultsOutput>> {
    return {
      success: true,
      data: {
        defaults: DEFAULT_STYLE_INPUTS,
      },
    };
  }

  async getPredefinedOptions(): Promise<ServiceResponse<GetPredefinedOptionsOutput>> {
    return {
      success: true,
      data: {
        themes: PREDEFINED_THEMES,
        tones: PREDEFINED_TONES,
      },
    };
  }

  async clearDraft(): Promise<ServiceResponse<void>> {
    if (!this.isSSR()) {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Ignored
      }
    }
    return { success: true };
  }
}
