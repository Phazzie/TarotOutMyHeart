/**
 * @fileoverview Image Generation Service - Real implementation using per-card backend API proxy calls to Grok Image API.
 * @purpose Connect client to server proxy /api/generate/card to generate all 22 Major Arcana card images with retries and progress tracking.
 * @dataFlow 22 Prompts → /api/generate/card → Grok Image Generator → ServiceResponse<GenerateImagesOutput>
 * @boundary Seam #4: ImageGenerationSeam
 */

import type { ServiceResponse } from '$contracts/types/common';
import type {
  IImageGenerationService,
  GenerateImagesInput,
  GenerateImagesOutput,
  RegenerateImageInput,
  RegenerateImageOutput,
  CancelGenerationInput,
  CancelGenerationOutput,
  GetGenerationStatusInput,
  GetGenerationStatusOutput,
  EstimateImageCostOutput,
  GeneratedCard,
  ImageGenerationProgress,
  ImageGenerationUsage,
  TotalImageGenerationUsage,
  GeneratedCardId,
} from '$contracts/ImageGeneration';
import { ImageGenerationErrorCode, GROK_IMAGE_MODEL } from '$contracts/ImageGeneration';
import type { CardPrompt, PromptId } from '$contracts/PromptGeneration';

const CARD_TIMEOUT_MS = 55_000;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 3_000;

interface SessionState {
  id: string;
  progress: ImageGenerationProgress;
  isComplete: boolean;
  isCanceled: boolean;
  cards: GeneratedCard[];
}

export class ImageGenerationService implements IImageGenerationService {
  private sessions: Map<string, SessionState> = new Map();
  private cancelRequested = false;

  private generateId(): GeneratedCardId {
    return crypto.randomUUID() as GeneratedCardId;
  }

  async generateImages(
    input: GenerateImagesInput,
  ): Promise<ServiceResponse<GenerateImagesOutput>> {
    const { prompts, onProgress, allowPartialSuccess = true } = input;

    if (!prompts || prompts.length === 0) {
      return {
        success: false,
        error: {
          code: ImageGenerationErrorCode.INVALID_PROMPTS,
          message: 'No card prompts provided',
          retryable: false,
        },
      };
    }

    const sessionId = `session-${Date.now()}`;
    this.cancelRequested = false;

    const generatedCards: GeneratedCard[] = [];
    const usagePerCard: ImageGenerationUsage[] = [];
    let completedCount = 0;
    let failedCount = 0;
    let totalCost = 0;
    const startTime = Date.now();

    const initialProgress: ImageGenerationProgress = {
      total: prompts.length,
      completed: 0,
      failed: 0,
      current: 0,
      percentComplete: 0,
      estimatedTimeRemaining: prompts.length * 15,
      status: 'Starting image generation session...',
    };

    const sessionState: SessionState = {
      id: sessionId,
      progress: initialProgress,
      isComplete: false,
      isCanceled: false,
      cards: generatedCards,
    };
    this.sessions.set(sessionId, sessionState);

    for (let index = 0; index < prompts.length; index++) {
      if (this.cancelRequested) {
        sessionState.isCanceled = true;
        break;
      }

      const promptObj = prompts[index];
      if (!promptObj) continue;
      const cardNum = promptObj.cardNumber;

      const progress: ImageGenerationProgress = {
        total: prompts.length,
        completed: completedCount,
        failed: failedCount,
        current: cardNum,
        percentComplete: Math.round((index / prompts.length) * 100),
        estimatedTimeRemaining: (prompts.length - index) * 15,
        status: `Generating card ${index + 1}/${prompts.length}: ${promptObj.cardName}...`,
      };
      sessionState.progress = progress;
      onProgress?.(progress);

      const cardResult = await this.generateSingleCardWithRetry(promptObj);

      if (cardResult.success) {
        completedCount++;
        generatedCards.push(cardResult.card);
        totalCost += 0.04;
        usagePerCard.push({
          cardNumber: cardNum,
          model: GROK_IMAGE_MODEL,
          estimatedCost: 0.04,
          generationTime: 12000,
          requestId: `req-img-${cardNum}-${Date.now()}`,
        });
      } else {
        failedCount++;
        const failedCard: GeneratedCard = {
          id: this.generateId(),
          cardNumber: cardNum,
          cardName: promptObj.cardName,
          prompt: promptObj.generatedPrompt,
          generationStatus: 'failed',
          retryCount: MAX_RETRIES,
          error: cardResult.error,
        };
        generatedCards.push(failedCard);
        if (!allowPartialSuccess && failedCount > 0) {
          break;
        }
      }
    }

    const finalProgress: ImageGenerationProgress = {
      total: prompts.length,
      completed: completedCount,
      failed: failedCount,
      current: -1,
      percentComplete: 100,
      estimatedTimeRemaining: 0,
      status: this.cancelRequested
        ? 'Generation session canceled.'
        : `Generation complete! ${completedCount} succeeded, ${failedCount} failed.`,
    };
    sessionState.progress = finalProgress;
    sessionState.isComplete = true;
    onProgress?.(finalProgress);

    const totalUsage: TotalImageGenerationUsage = {
      totalImages: prompts.length,
      successfulImages: completedCount,
      failedImages: failedCount,
      estimatedCost: Number(totalCost.toFixed(4)),
      totalGenerationTime: Math.round((Date.now() - startTime) / 1000),
      usagePerCard,
    };

    return {
      success: true,
      data: {
        generatedCards,
        totalUsage,
        sessionId,
        startedAt: new Date(startTime),
        completedAt: new Date(),
        fullySuccessful: failedCount === 0 && !this.cancelRequested,
      },
    };
  }

  private async generateSingleCardWithRetry(
    promptObj: CardPrompt,
  ): Promise<{ success: true; card: GeneratedCard } | { success: false; error: string }> {
    let lastError = '';

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (this.cancelRequested) {
        return { success: false, error: 'Canceled' };
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
            cardNumber: promptObj.cardNumber,
            cardName: promptObj.cardName,
            generatedPrompt: promptObj.generatedPrompt,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const json = (await response.json()) as {
          success: boolean;
          data?: { imageUrl: string; imageDataUrl?: string };
          error?: { code: string; message: string };
        };

        if (json.success && (json.data?.imageUrl || json.data?.imageDataUrl)) {
          const card: GeneratedCard = {
            id: this.generateId(),
            cardNumber: promptObj.cardNumber,
            cardName: promptObj.cardName,
            prompt: promptObj.generatedPrompt,
            imageUrl: json.data.imageUrl,
            imageDataUrl: json.data.imageDataUrl,
            generationStatus: 'completed',
            generatedAt: new Date(),
            retryCount: attempt,
          };
          return { success: true, card };
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

    return { success: false, error: lastError };
  }

  async regenerateImage(
    input: RegenerateImageInput,
  ): Promise<ServiceResponse<RegenerateImageOutput>> {
    const { cardNumber, prompt } = input;
    const cardName = `Card ${cardNumber}`;

    const fakePromptObj: CardPrompt = {
      id: crypto.randomUUID() as PromptId,
      cardNumber,
      cardName,
      traditionalMeaning: '',
      generatedPrompt: prompt,
      confidence: 1,
      generatedAt: new Date(),
    };

    const res = await this.generateSingleCardWithRetry(fakePromptObj);
    if (res.success) {
      return {
        success: true,
        data: {
          generatedCard: res.card,
          usage: {
            cardNumber,
            model: GROK_IMAGE_MODEL,
            estimatedCost: 0.04,
            generationTime: 12000,
            requestId: `req-regen-${cardNumber}-${Date.now()}`,
          },
        },
      };
    }

    return {
      success: false,
      error: {
        code: ImageGenerationErrorCode.GENERATION_FAILED,
        message: res.error ?? 'Regeneration failed',
        retryable: true,
      },
    };
  }

  async cancelGeneration(
    input: CancelGenerationInput,
  ): Promise<ServiceResponse<CancelGenerationOutput>> {
    this.cancelRequested = true;
    const session = this.sessions.get(input.sessionId);

    return {
      success: true,
      data: {
        canceled: true,
        completedBeforeCancel: session ? session.progress.completed : 0,
        sessionId: input.sessionId,
      },
    };
  }

  async getGenerationStatus(
    input: GetGenerationStatusInput,
  ): Promise<ServiceResponse<GetGenerationStatusOutput>> {
    const session = this.sessions.get(input.sessionId);
    if (!session) {
      return {
        success: false,
        error: {
          code: ImageGenerationErrorCode.SESSION_NOT_FOUND,
          message: 'Session not found',
          retryable: false,
        },
      };
    }

    return {
      success: true,
      data: {
        sessionId: session.id,
        progress: session.progress,
        isComplete: session.isComplete,
        isCanceled: session.isCanceled,
      },
    };
  }

  async estimateCost(input: {
    imageCount: number;
  }): Promise<ServiceResponse<EstimateImageCostOutput>> {
    const count = input.imageCount ?? 22;
    const totalCost = Number((count * 0.04).toFixed(4));
    const estimatedTime = count * 15;

    return {
      success: true,
      data: {
        totalImages: count,
        costPerImage: 0.04,
        totalEstimatedCost: totalCost,
        estimatedTime,
      },
    };
  }
}
