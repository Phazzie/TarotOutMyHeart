/**
 * StyleInputService — real implementation.
 * PreMortem #8: Must NOT crash when localStorage is undefined (SSR/Node.js).
 * Design: SSR guard on every localStorage access, returns DEFAULT_STYLE_INPUTS on server.
 */
import { DEFAULT_STYLE_INPUTS } from '../../contracts/StyleInput';
import type { StyleInputs } from '../../contracts/StyleInput';

export const STORAGE_KEY = 'tarot_style_inputs';
const DESCRIPTION_MAX_LENGTH = 500;

type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

export class StyleInputService {
  /** True when running in Node.js / SSR (no localStorage). */
  private isSSR(): boolean {
    return typeof localStorage === 'undefined';
  }

  async saveStyleInputs(inputs: StyleInputs): Promise<ServiceResult<StyleInputs>> {
    // Validate: theme required and not just whitespace
    if (!inputs.theme || !inputs.theme.trim()) {
      return {
        success: false,
        error: { code: 'THEME_REQUIRED', message: 'Theme is required.' },
      };
    }

    // Validate: description length
    if (inputs.description && inputs.description.length > DESCRIPTION_MAX_LENGTH) {
      return {
        success: false,
        error: {
          code: 'DESCRIPTION_TOO_LONG',
          message: `Description must be ${DESCRIPTION_MAX_LENGTH} characters or fewer.`,
        },
      };
    }

    if (!this.isSSR()) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(inputs));
      } catch {
        // Storage quota exceeded or private browsing — non-fatal, proceed
      }
    }

    return { success: true, data: inputs };
  }

  async loadStyleInputs(): Promise<ServiceResult<StyleInputs>> {
    if (this.isSSR()) {
      return { success: true, data: DEFAULT_STYLE_INPUTS };
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { success: true, data: DEFAULT_STYLE_INPUTS };
      const parsed = JSON.parse(raw) as StyleInputs;
      return { success: true, data: parsed };
    } catch {
      // Corrupt JSON or other storage error — fall back to defaults
      return { success: true, data: DEFAULT_STYLE_INPUTS };
    }
  }

  async clearStyleInputs(): Promise<ServiceResult<void>> {
    if (!this.isSSR()) {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Non-fatal
      }
    }
    return { success: true, data: undefined };
  }
}
