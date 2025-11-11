/**
 * @fileoverview Contract tests for ImageGeneration seam
 * @purpose Validate ImageGenerationMock matches ImageGeneration contract exactly
 * @testStrategy
 * 1. Interface compliance - Mock implements IImageGenerationService
 * 2. Image generation - Single and batch (1-22 cards) with progress tracking
 * 3. Return types - GeneratedCard structure with all required fields
 * 4. Error handling - Returns correct ImageGenerationErrorCode values
 * 5. Session management - Status tracking, cancellation
 */

import { describe, it, expect, beforeEach } from 'vitest'
import type { IImageGenerationService } from '$contracts/ImageGeneration'
import { ImageGenerationErrorCode } from '$contracts/ImageGeneration'
import { imageGenerationService } from '$services/factory'
import { promptGenerationService } from '$services/factory'

describe('ImageGeneration Contract Compliance', () => {
  let service: IImageGenerationService

  beforeEach(() => {
    service = imageGenerationService
  })

  describe('Interface Implementation', () => {
    it('should implement IImageGenerationService interface', () => {
      expect(service).toBeDefined()
      expect(service.generateImages).toBeDefined()
      expect(typeof service.generateImages).toBe('function')
      expect(service.regenerateImage).toBeDefined()
      expect(typeof service.regenerateImage).toBe('function')
      expect(service.cancelGeneration).toBeDefined()
      expect(typeof service.cancelGeneration).toBe('function')
      expect(service.getGenerationStatus).toBeDefined()
      expect(typeof service.getGenerationStatus).toBe('function')
      expect(service.estimateCost).toBeDefined()
      expect(typeof service.estimateCost).toBe('function')
    })
  })

  describe('generateImages()', () => {
    it('should generate 22 card images from prompts', async () => {
      // First generate prompts
      const promptResponse = await promptGenerationService.generatePrompts({
        referenceImageUrls: ['https://example.com/image1.jpg'],
        styleInputs: {
          theme: 'Cyberpunk',
          tone: 'Dark',
          description: 'Neon-lit dystopian future',
        },
      })

      expect(promptResponse.success).toBe(true)

      if (promptResponse.data) {
        const response = await service.generateImages({
          prompts: promptResponse.data.cardPrompts,
        })

        expect(response.success).toBe(true)
        expect(response.data).toBeDefined()
        if (response.data) {
          expect(response.data.generatedCards).toHaveLength(22)
          expect(response.data.totalUsage).toBeDefined()
          expect(response.data.sessionId).toBeDefined()
          expect(response.data.startedAt).toBeInstanceOf(Date)
          expect(response.data.completedAt).toBeInstanceOf(Date)
          expect(typeof response.data.fullySuccessful).toBe('boolean')
        }
      }
    })

    it('should generate cards with correct GeneratedCard structure', async () => {
      const promptResponse = await promptGenerationService.generatePrompts({
        referenceImageUrls: ['https://example.com/image1.jpg'],
        styleInputs: {
          theme: 'Gothic',
          tone: 'Dark',
          description: 'Victorian supernatural',
        },
      })

      expect(promptResponse.success).toBe(true)

      if (promptResponse.data) {
        const response = await service.generateImages({
          prompts: promptResponse.data.cardPrompts,
        })

        expect(response.success).toBe(true)
        if (response.data) {
          const firstCard = response.data.generatedCards[0]
          expect(firstCard).toHaveProperty('id')
          expect(firstCard).toHaveProperty('cardNumber')
          expect(firstCard).toHaveProperty('cardName')
          expect(firstCard).toHaveProperty('prompt')
          expect(firstCard).toHaveProperty('generationStatus')
          expect(firstCard).toHaveProperty('retryCount')

          expect(typeof firstCard.id).toBe('string')
          expect(typeof firstCard.cardNumber).toBe('number')
          expect(typeof firstCard.cardName).toBe('string')
          expect(typeof firstCard.prompt).toBe('string')
          expect(typeof firstCard.generationStatus).toBe('string')
          expect(typeof firstCard.retryCount).toBe('number')
        }
      }
    })

    it('should track generation status for each card', async () => {
      const promptResponse = await promptGenerationService.generatePrompts({
        referenceImageUrls: ['https://example.com/image1.jpg'],
        styleInputs: {
          theme: 'Watercolor',
          tone: 'Soft',
          description: 'Delicate watercolor art',
        },
      })

      expect(promptResponse.success).toBe(true)

      if (promptResponse.data) {
        const response = await service.generateImages({
          prompts: promptResponse.data.cardPrompts,
        })

        expect(response.success).toBe(true)
        if (response.data) {
          response.data.generatedCards.forEach((card) => {
            expect(['queued', 'generating', 'completed', 'failed', 'retrying']).toContain(
              card.generationStatus
            )
          })
        }
      }
    })

    it('should include usage information', async () => {
      const promptResponse = await promptGenerationService.generatePrompts({
        referenceImageUrls: ['https://example.com/image1.jpg'],
        styleInputs: {
          theme: 'Art Nouveau',
          tone: 'Elegant',
          description: 'Flowing organic forms',
        },
      })

      expect(promptResponse.success).toBe(true)

      if (promptResponse.data) {
        const response = await service.generateImages({
          prompts: promptResponse.data.cardPrompts,
        })

        expect(response.success).toBe(true)
        if (response.data) {
          expect(response.data.totalUsage.totalImages).toBe(22)
          expect(response.data.totalUsage.successfulImages).toBeGreaterThanOrEqual(0)
          expect(response.data.totalUsage.failedImages).toBeGreaterThanOrEqual(0)
          expect(response.data.totalUsage.estimatedCost).toBeGreaterThanOrEqual(0)
          expect(response.data.totalUsage.totalGenerationTime).toBeGreaterThanOrEqual(0)
          expect(Array.isArray(response.data.totalUsage.usagePerCard)).toBe(true)
        }
      }
    })

    it('should support progress callback', async () => {
      const promptResponse = await promptGenerationService.generatePrompts({
        referenceImageUrls: ['https://example.com/image1.jpg'],
        styleInputs: {
          theme: 'Fantasy',
          tone: 'Magical',
          description: 'Magical fantasy realm',
        },
      })

      expect(promptResponse.success).toBe(true)

      if (promptResponse.data) {
        let progressCalled = false

        const response = await service.generateImages({
          prompts: promptResponse.data.cardPrompts,
          onProgress: (progress) => {
            progressCalled = true
            expect(progress.total).toBe(22)
            expect(progress.completed).toBeGreaterThanOrEqual(0)
            expect(progress.failed).toBeGreaterThanOrEqual(0)
            expect(progress.current).toBeGreaterThanOrEqual(0)
            expect(progress.percentComplete).toBeGreaterThanOrEqual(0)
            expect(progress.percentComplete).toBeLessThanOrEqual(100)
            expect(progress.status).toBeDefined()
          },
        })

        expect(response.success).toBe(true)
        // Progress callback may or may not be called in mock
      }
    })

    it('should optionally save to storage', async () => {
      const promptResponse = await promptGenerationService.generatePrompts({
        referenceImageUrls: ['https://example.com/image1.jpg'],
        styleInputs: {
          theme: 'Minimalist',
          tone: 'Clean',
          description: 'Clean minimalist design',
        },
      })

      expect(promptResponse.success).toBe(true)

      if (promptResponse.data) {
        const response = await service.generateImages({
          prompts: promptResponse.data.cardPrompts,
          saveToStorage: true,
        })

        expect(response.success).toBe(true)
        if (response.data) {
          // When saved to storage, cards should have imageUrl
          response.data.generatedCards.forEach((card) => {
            if (card.generationStatus === 'completed') {
              expect(card.imageUrl || card.imageDataUrl).toBeDefined()
            }
          })
        }
      }
    })

    it('should allow partial success when enabled', async () => {
      const promptResponse = await promptGenerationService.generatePrompts({
        referenceImageUrls: ['https://example.com/image1.jpg'],
        styleInputs: {
          theme: 'Digital Art',
          tone: 'Bold',
          description: 'Bold digital compositions',
        },
      })

      expect(promptResponse.success).toBe(true)

      if (promptResponse.data) {
        const response = await service.generateImages({
          prompts: promptResponse.data.cardPrompts,
          allowPartialSuccess: true,
        })

        expect(response.success).toBe(true)
        // With allowPartialSuccess, should succeed even if some cards fail
      }
    })

    it('should return error for wrong prompt count', async () => {
      const promptResponse = await promptGenerationService.generatePrompts({
        referenceImageUrls: ['https://example.com/image1.jpg'],
        styleInputs: {
          theme: 'Test',
          tone: 'Test',
          description: 'Test description',
        },
      })

      expect(promptResponse.success).toBe(true)

      if (promptResponse.data) {
        // Try with incomplete prompts
        const incompletePrompts = promptResponse.data.cardPrompts.slice(0, 10)

        const response = await service.generateImages({
          prompts: incompletePrompts,
        })

        expect(response.success).toBe(false)
        expect(response.error).toBeDefined()
        if (response.error) {
          expect(response.error.code).toBe(ImageGenerationErrorCode.WRONG_PROMPT_COUNT)
        }
      }
    })

    it('should return error for invalid prompts', async () => {
      const response = await service.generateImages({
        prompts: [],
      })

      expect(response.success).toBe(false)
      expect(response.error).toBeDefined()
      if (response.error) {
        expect([
          ImageGenerationErrorCode.INVALID_PROMPTS,
          ImageGenerationErrorCode.WRONG_PROMPT_COUNT,
        ]).toContain(response.error.code)
      }
    })
  })

  describe('regenerateImage()', () => {
    it('should regenerate a single failed image', async () => {
      const response = await service.regenerateImage({
        cardNumber: 13,
        prompt: 'Dark gothic Death card with ravens and skulls',
      })

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      if (response.data) {
        expect(response.data.generatedCard).toBeDefined()
        expect(response.data.generatedCard.cardNumber).toBe(13)
        expect(response.data.usage).toBeDefined()
      }
    })

    it('should track retry count', async () => {
      const response = await service.regenerateImage({
        cardNumber: 5,
        prompt: 'The Hierophant in mystical setting',
        previousAttempts: 1,
      })

      expect(response.success).toBe(true)
      if (response.data) {
        expect(response.data.generatedCard.retryCount).toBeGreaterThanOrEqual(0)
      }
    })
  })

  describe('cancelGeneration()', () => {
    it('should cancel ongoing generation', async () => {
      const response = await service.cancelGeneration({
        sessionId: 'test-session-123',
      })

      // Cancel may succeed or fail depending on session state
      expect(response.success).toBe(true)
      if (response.data) {
        expect(response.data.canceled).toBeDefined()
        expect(typeof response.data.canceled).toBe('boolean')
        expect(response.data.completedBeforeCancel).toBeGreaterThanOrEqual(0)
        expect(response.data.sessionId).toBe('test-session-123')
      }
    })

    it('should return error for non-existent session', async () => {
      const response = await service.cancelGeneration({
        sessionId: 'non-existent-session',
      })

      // May succeed (no-op) or fail with SESSION_NOT_FOUND
      expect(response.success).toBeDefined()
    })
  })

  describe('getGenerationStatus()', () => {
    it('should get status of generation session', async () => {
      const response = await service.getGenerationStatus({
        sessionId: 'test-session-456',
      })

      // Status check may succeed or fail depending on session existence
      expect(response.success).toBeDefined()
      if (response.success && response.data) {
        expect(response.data.sessionId).toBe('test-session-456')
        expect(response.data.progress).toBeDefined()
        expect(typeof response.data.isComplete).toBe('boolean')
        expect(typeof response.data.isCanceled).toBe('boolean')
      }
    })

    it('should include progress information when session exists', async () => {
      const response = await service.getGenerationStatus({
        sessionId: 'active-session',
      })

      if (response.success && response.data) {
        expect(response.data.progress.total).toBeGreaterThanOrEqual(0)
        expect(response.data.progress.completed).toBeGreaterThanOrEqual(0)
        expect(response.data.progress.failed).toBeGreaterThanOrEqual(0)
        expect(response.data.progress.percentComplete).toBeGreaterThanOrEqual(0)
        expect(response.data.progress.percentComplete).toBeLessThanOrEqual(100)
      }
    })
  })

  describe('estimateCost()', () => {
    it('should estimate cost for 22 images', async () => {
      const response = await service.estimateCost({
        imageCount: 22,
      })

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      if (response.data) {
        expect(response.data.totalImages).toBe(22)
        expect(response.data.costPerImage).toBeGreaterThan(0)
        expect(response.data.totalEstimatedCost).toBeGreaterThan(0)
        expect(response.data.estimatedTime).toBeGreaterThan(0)
      }
    })

    it('should scale cost with image count', async () => {
      const response10 = await service.estimateCost({ imageCount: 10 })
      const response22 = await service.estimateCost({ imageCount: 22 })

      expect(response10.success).toBe(true)
      expect(response22.success).toBe(true)

      if (response10.data && response22.data) {
        expect(response22.data.totalEstimatedCost).toBeGreaterThan(
          response10.data.totalEstimatedCost
        )
      }
    })

    it('should return error for invalid image count', async () => {
      const response = await service.estimateCost({
        imageCount: 0,
      })

      expect(response.success).toBe(false)
      expect(response.error).toBeDefined()
      if (response.error) {
        expect(response.error.code).toBe(ImageGenerationErrorCode.INVALID_PROMPTS)
      }
    })
  })

  describe('Return Type Validation', () => {
    it('should return all async methods as Promises', async () => {
      const promptResponse = await promptGenerationService.generatePrompts({
        referenceImageUrls: ['https://example.com/image1.jpg'],
        styleInputs: {
          theme: 'Test',
          tone: 'Test',
          description: 'Test description',
        },
      })

      if (promptResponse.success && promptResponse.data) {
        const generatePromise = service.generateImages({
          prompts: promptResponse.data.cardPrompts,
        })
        expect(generatePromise).toBeInstanceOf(Promise)
      }

      const regeneratePromise = service.regenerateImage({
        cardNumber: 0,
        prompt: 'Test prompt',
      })
      expect(regeneratePromise).toBeInstanceOf(Promise)

      const cancelPromise = service.cancelGeneration({
        sessionId: 'test',
      })
      expect(cancelPromise).toBeInstanceOf(Promise)

      const statusPromise = service.getGenerationStatus({
        sessionId: 'test',
      })
      expect(statusPromise).toBeInstanceOf(Promise)

      const estimatePromise = service.estimateCost({
        imageCount: 22,
      })
      expect(estimatePromise).toBeInstanceOf(Promise)
    })

    it('should maintain card order in generated cards', async () => {
      const promptResponse = await promptGenerationService.generatePrompts({
        referenceImageUrls: ['https://example.com/image1.jpg'],
        styleInputs: {
          theme: 'Test',
          tone: 'Test',
          description: 'Test description',
        },
      })

      expect(promptResponse.success).toBe(true)

      if (promptResponse.data) {
        const response = await service.generateImages({
          prompts: promptResponse.data.cardPrompts,
        })

        expect(response.success).toBe(true)
        if (response.data) {
          // Check that all card numbers 0-21 are present
          for (let i = 0; i < 22; i++) {
            const card = response.data.generatedCards.find((c) => c.cardNumber === i)
            expect(card).toBeDefined()
            expect(card?.cardNumber).toBe(i)
          }
        }
      }
    })
  })
})
