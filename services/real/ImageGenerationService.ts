/**
 * ImageGenerationService — real implementation.
 * Per-card approach: calls POST /api/generate/card once per card.
 * Avoids Vercel serverless timeout (10s/60s) that a batched approach would hit.
 *
 * PreMortem protections:
 *   - TIMEOUT: Vercel Pro 60s limit — each card call is independent
 *   - CANCELLED: user can abort mid-deck
 *   - Partial success: failed cards don't abort the whole deck
 *   - Retry: up to MAX_RETRIES per card with exponential backoff
 */
import type { CardPrompt } from '../../contracts/PromptGeneration';

const CARD_TIMEOUT_MS = 55_000; // Under 60s Pro limit with margin
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 3_000;

type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

export interface GeneratedCardInfo {
  id: string;
  cardNumber: number;
  cardName: string;
  imageUrl: string | null;
  prompt: string;
  status: 'completed' | 'failed';
  generatedAt: string;
  error?: string;
}

export interface DeckGenerationProgress {
  total: number;
  completed: number;
  failed: number;
  currentCardNumber: number;
}

export class ImageGenerationService {
  private cancelled = false;

  /** Generate a single card image. Retries on transient failures. */
  async generateCard(
    prompt: CardPrompt,
    onProgress?: (progress: DeckGenerationProgress) => void,
  ): Promise<ServiceResult<GeneratedCardInfo>> {
    let lastError = '';

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (this.cancelled) {
        return {
          success: false,
          error: { code: 'CANCELLED', message: 'Generation was cancelled.' },
        };
      }

      if (attempt > 0) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CARD_TIMEOUT_MS);

      try {
        const response = await fetch('/api/generate/card', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cardNumber: prompt.cardNumber,
            cardName: prompt.cardName,
            generatedPrompt: prompt.generatedPrompt,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const json = (await response.json()) as {
          success: boolean;
          data?: { imageUrl: string };
          error?: { code: string; message: string };
        };

        if (json.success && json.data?.imageUrl) {
          return {
            success: true,
            data: {
              id: crypto.randomUUID(),
              cardNumber: prompt.cardNumber,
              cardName: prompt.cardName,
              imageUrl: json.data.imageUrl,
              prompt: prompt.generatedPrompt,
              status: 'completed',
              generatedAt: new Date().toISOString(),
            },
          };
        }

        lastError = json.error?.message ?? 'Image generation failed.';
      } catch (err) {
        clearTimeout(timeoutId);
        if (err instanceof Error && err.name === 'AbortError') {
          lastError = 'Request timed out.';
        } else {
          lastError = err instanceof Error ? err.message : 'Network error.';
        }
      }
    }

    return {
      success: false,
      error: { code: 'GENERATION_FAILED', message: lastError },
    };
  }

  /**
   * Generate all 22 cards sequentially.
   * Continues on failure (partial success). Respects cancellation.
   */
  async generateDeck(
    prompts: CardPrompt[],
    onProgress?: (progress: DeckGenerationProgress) => void,
  ): Promise<ServiceResult<GeneratedCardInfo[]>> {
    this.cancelled = false;
    const results: GeneratedCardInfo[] = [];
    let failed = 0;

    for (const prompt of prompts) {
      if (this.cancelled) break;

      onProgress?.({
        total: prompts.length,
        completed: results.filter((r) => r.status === 'completed').length,
        failed,
        currentCardNumber: prompt.cardNumber,
      });

      const result = await this.generateCard(prompt, onProgress);

      if (result.success) {
        results.push(result.data);
      } else {
        failed++;
        // Push a failed card placeholder so the UI can show the failure
        results.push({
          id: crypto.randomUUID(),
          cardNumber: prompt.cardNumber,
          cardName: prompt.cardName,
          imageUrl: null,
          prompt: prompt.generatedPrompt,
          status: 'failed',
          generatedAt: new Date().toISOString(),
          error: result.error.message,
        });
      }
    }

    onProgress?.({
      total: prompts.length,
      completed: results.filter((r) => r.status === 'completed').length,
      failed,
      currentCardNumber: -1,
    });

    return { success: true, data: results };
  }

  cancelGeneration(): void {
    this.cancelled = true;
  }
}
