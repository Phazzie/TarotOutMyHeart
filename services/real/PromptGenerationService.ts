/**
 * PromptGenerationService — real implementation.
 * Calls POST /api/prompts which proxies to xAI Grok vision API server-side.
 * Returns 22 CardPrompt objects — one per Major Arcana card.
 *
 * PreMortem protections:
 *   - NETWORK_ERROR:  fetch() throws
 *   - API_ERROR:      server returns success: false
 *   - TIMEOUT:        server takes too long (30s client timeout)
 */
import type { StyleInputs } from '../../contracts/StyleInput';
import type { CardPrompt } from '../../contracts/PromptGeneration';

const PROMPT_TIMEOUT_MS = 90_000; // 90s — Grok reasoning can be slow

type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

export interface GeneratePromptsParams {
  referenceImageUrls: string[];
  styleInputs: StyleInputs;
  onProgress?: (completed: number, total: number) => void;
}

export class PromptGenerationService {
  private abortController: AbortController | null = null;

  async generatePrompts(params: GeneratePromptsParams): Promise<ServiceResult<CardPrompt[]>> {
    this.abortController = new AbortController();
    const timeoutId = setTimeout(() => this.abortController?.abort(), PROMPT_TIMEOUT_MS);

    try {
      params.onProgress?.(0, 22);

      const response = await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referenceImageUrls: params.referenceImageUrls,
          styleInputs: params.styleInputs,
        }),
        signal: this.abortController.signal,
      });

      clearTimeout(timeoutId);
      const json = (await response.json()) as {
        success: boolean;
        data?: { prompts: CardPrompt[] };
        error?: { code: string; message: string };
      };

      if (!json.success || !json.data?.prompts) {
        return {
          success: false,
          error: json.error ?? { code: 'API_ERROR', message: 'Prompt generation failed.' },
        };
      }

      params.onProgress?.(22, 22);
      return { success: true, data: json.data.prompts };
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === 'AbortError') {
        return {
          success: false,
          error: { code: 'CANCELLED', message: 'Generation was cancelled.' },
        };
      }
      return {
        success: false,
        error: { code: 'NETWORK_ERROR', message: 'Network error during prompt generation.' },
      };
    } finally {
      this.abortController = null;
    }
  }

  cancelGeneration(): void {
    this.abortController?.abort();
    this.abortController = null;
  }
}
