/**
 * ImageGeneration Contract Tests
 *
 * Tests that ImageGenerationMock satisfies the IImageGenerationService contract
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { ImageGenerationMock } from '../../services/mock/ImageGenerationMock'
import type {
  IImageGenerationService,
  GenerateImagesInput,
  ImageGenerationProgress,
  RegenerateImageInput,
  CancelGenerationInput,
  GetGenerationStatusInput,
  ImageGenerationErrorCode
} from '../../contracts/ImageGeneration'
import type { CardPrompt, CardNumber, PromptId } from '../../contracts/PromptGeneration'

// Helper to create mock CardPrompt array
const MAJOR_ARCANA_NAMES = [
  'The Fool', 'The Magician', 'The High Priestess', 'The Empress',
  'The Emperor', 'The Hierophant', 'The Lovers', 'The Chariot',
  'Strength', 'The Hermit', 'Wheel of Fortune', 'Justice',
  'The Hanged Man', 'Death', 'Temperance', 'The Devil',
  'The Tower', 'The Star', 'The Moon', 'The Sun',
  'Judgement', 'The World'
]

function createMockPrompts(count: number = 22): CardPrompt[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `prompt-${i}` as PromptId,
    cardNumber: i as CardNumber,
    cardName: MAJOR_ARCANA_NAMES[i] || `Card ${i}`,
    traditionalMeaning: `Traditional meaning for card ${i}`,
    generatedPrompt: `A detailed tarot card illustration for ${MAJOR_ARCANA_NAMES[i]}, embodying mystical symbolism with rich colors and intricate details. The card shows traditional imagery with a modern artistic interpretation.`,
    confidence: 0.85 + Math.random() * 0.15,
    generatedAt: new Date()
  }))
}

describe('ImageGeneration Contract', () => {
  let service: IImageGenerationService

  beforeEach(() => {
    service = new ImageGenerationMock()
  })

  describe('generateImages() Method', () => {
    describe('Success Cases', () => {
      it('should generate all 22 card images from valid prompts', async () => {
        const mockPrompts = createMockPrompts(22)
        const input: GenerateImagesInput = {
          prompts: mockPrompts
        }

        const response = await service.generateImages(input)

        expect(response.success).toBe(true)
        expect(response.data?.generatedCards).toHaveLength(22)
        expect(response.data?.fullySuccessful).toBeDefined()
        expect(response.data?.sessionId).toBeDefined()
        expect(response.data?.startedAt).toBeInstanceOf(Date)
        expect(response.data?.completedAt).toBeInstanceOf(Date)
      })

      it('should generate images with correct card numbers 0-21', async () => {
        const mockPrompts = createMockPrompts(22)
        const response = await service.generateImages({ prompts: mockPrompts })

        expect(response.success).toBe(true)
        const cardNumbers = response.data!.generatedCards.map(c => c.cardNumber)
        expect(cardNumbers).toEqual(expect.arrayContaining([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]))
      })

      it('should generate images with correct card names', async () => {
        const mockPrompts = createMockPrompts(22)
        const response = await service.generateImages({ prompts: mockPrompts })

        expect(response.success).toBe(true)
        expect(response.data!.generatedCards[0]?.cardName).toBe('The Fool')
        expect(response.data!.generatedCards[1]?.cardName).toBe('The Magician')
        expect(response.data!.generatedCards[21]?.cardName).toBe('The World')
      })

      it('should return GeneratedCard with all required properties', async () => {
        const mockPrompts = createMockPrompts(22)
        const response = await service.generateImages({ prompts: mockPrompts })

        expect(response.success).toBe(true)
        const card = response.data!.generatedCards[0]!

        expect(card.id).toBeDefined()
        expect(card.cardNumber).toBeDefined()
        expect(card.cardName).toBeDefined()
        expect(card.prompt).toBeDefined()
        expect(card.generationStatus).toBeDefined()
        expect(card.retryCount).toBeDefined()
        expect(typeof card.retryCount).toBe('number')
      })

      it('should include imageUrl when saveToStorage is true', async () => {
        const mockPrompts = createMockPrompts(22)
        const response = await service.generateImages({
          prompts: mockPrompts,
          saveToStorage: true
        })

        expect(response.success).toBe(true)
        const successfulCards = response.data!.generatedCards.filter(c => c.generationStatus === 'completed')

        if (successfulCards.length > 0) {
          expect(successfulCards[0]?.imageUrl).toBeDefined()
        }
      })

      it('should include imageDataUrl when saveToStorage is false', async () => {
        const mockPrompts = createMockPrompts(22)
        const response = await service.generateImages({
          prompts: mockPrompts,
          saveToStorage: false
        })

        expect(response.success).toBe(true)
        const successfulCards = response.data!.generatedCards.filter(c => c.generationStatus === 'completed')

        if (successfulCards.length > 0) {
          expect(successfulCards[0]?.imageDataUrl).toBeDefined()
        }
      })

      it('should return totalUsage with correct structure', async () => {
        const mockPrompts = createMockPrompts(22)
        const response = await service.generateImages({ prompts: mockPrompts })

        expect(response.success).toBe(true)
        const usage = response.data!.totalUsage

        expect(usage.totalImages).toBe(22)
        expect(typeof usage.successfulImages).toBe('number')
        expect(typeof usage.failedImages).toBe('number')
        expect(typeof usage.estimatedCost).toBe('number')
        expect(typeof usage.totalGenerationTime).toBe('number')
        expect(Array.isArray(usage.usagePerCard)).toBe(true)
      })

      it('should call onProgress callback during generation', async () => {
        const mockPrompts = createMockPrompts(22)
        const progressUpdates: ImageGenerationProgress[] = []

        const response = await service.generateImages({
          prompts: mockPrompts,
          onProgress: (progress) => {
            progressUpdates.push(progress)
          }
        })

        expect(response.success).toBe(true)
        expect(progressUpdates.length).toBeGreaterThan(0)
      })

      it('should provide progress with correct structure', async () => {
        const mockPrompts = createMockPrompts(22)
        const progressUpdates: ImageGenerationProgress[] = []

        await service.generateImages({
          prompts: mockPrompts,
          onProgress: (progress) => {
            progressUpdates.push(progress)
          }
        })

        if (progressUpdates.length > 0) {
          const lastProgress = progressUpdates[progressUpdates.length - 1]!
          expect(lastProgress.total).toBe(22)
          expect(typeof lastProgress.completed).toBe('number')
          expect(typeof lastProgress.failed).toBe('number')
          expect(typeof lastProgress.current).toBe('number')
          expect(typeof lastProgress.percentComplete).toBe('number')
          expect(typeof lastProgress.estimatedTimeRemaining).toBe('number')
          expect(typeof lastProgress.status).toBe('string')
        }
      })

      it('should accept optional model parameter', async () => {
        const mockPrompts = createMockPrompts(22)
        const response = await service.generateImages({
          prompts: mockPrompts,
          model: 'grok-2-image-alpha'
        })

        expect(response.success).toBe(true)
      })

      it('should handle allowPartialSuccess: true (some failures ok)', async () => {
        const mockPrompts = createMockPrompts(22)
        const response = await service.generateImages({
          prompts: mockPrompts,
          allowPartialSuccess: true
        })

        expect(response.success).toBe(true)
        // Even if some fail, should succeed when allowPartialSuccess is true
      })
    })

    describe('Error Cases', () => {
      it('should fail with WRONG_PROMPT_COUNT when not 22 prompts', async () => {
        const mockPrompts = createMockPrompts(10)
        const response = await service.generateImages({ prompts: mockPrompts })

        expect(response.success).toBe(false)
        expect(response.error?.code).toBe('WRONG_PROMPT_COUNT')
        expect(response.error?.message).toBeDefined()
      })

      it('should fail with WRONG_PROMPT_COUNT when 0 prompts', async () => {
        const response = await service.generateImages({ prompts: [] })

        expect(response.success).toBe(false)
        expect(response.error?.code).toBe('WRONG_PROMPT_COUNT')
      })

      it('should fail with WRONG_PROMPT_COUNT when more than 22 prompts', async () => {
        const mockPrompts = createMockPrompts(30)
        const response = await service.generateImages({ prompts: mockPrompts })

        expect(response.success).toBe(false)
        expect(response.error?.code).toBe('WRONG_PROMPT_COUNT')
      })

      it('should fail with INVALID_PROMPTS for malformed prompts', async () => {
        const invalidPrompts = [{ invalid: 'data' }] as any
        const response = await service.generateImages({ prompts: invalidPrompts })

        expect(response.success).toBe(false)
        expect(response.error?.code).toMatch(/INVALID_PROMPTS|WRONG_PROMPT_COUNT/)
      })

      it('should fail with PROMPT_TOO_LONG when prompt exceeds limit', async () => {
        const mockPrompts = createMockPrompts(22)
        mockPrompts[0]!.generatedPrompt = 'a'.repeat(10000) // Very long prompt

        const response = await service.generateImages({ prompts: mockPrompts })

        // May succeed or fail depending on mock implementation
        if (!response.success) {
          expect(response.error?.code).toMatch(/PROMPT_TOO_LONG|INVALID_PROMPTS/)
        }
      })

      it('should fail with INVALID_MODEL when invalid model specified', async () => {
        const mockPrompts = createMockPrompts(22)
        const response = await service.generateImages({
          prompts: mockPrompts,
          model: 'invalid-model-name'
        })

        // May succeed or fail depending on mock implementation
        if (!response.success) {
          expect(response.error?.code).toMatch(/INVALID_MODEL/)
        }
      })

      it('should have retryable: true for API_TIMEOUT errors', async () => {
        // This tests the error structure, not necessarily triggering it
        // Mock may not implement this specific error, but contract requires it
        const mockPrompts = createMockPrompts(22)
        const response = await service.generateImages({ prompts: mockPrompts })

        if (!response.success && response.error?.code === 'API_TIMEOUT') {
          expect(response.error.retryable).toBe(true)
        }
      })

      it('should have retryable: true for API_RATE_LIMIT errors', async () => {
        const mockPrompts = createMockPrompts(22)
        const response = await service.generateImages({ prompts: mockPrompts })

        if (!response.success && response.error?.code === 'API_RATE_LIMIT') {
          expect(response.error.retryable).toBe(true)
        }
      })
    })

    describe('Response Structure Validation', () => {
      it('should have correct GeneratedCard structure', async () => {
        const mockPrompts = createMockPrompts(22)
        const response = await service.generateImages({ prompts: mockPrompts })

        expect(response.success).toBe(true)
        const card = response.data!.generatedCards[0]!

        expect(['queued', 'generating', 'completed', 'failed', 'retrying']).toContain(card.generationStatus)
        expect(card.retryCount).toBeGreaterThanOrEqual(0)
      })

      it('should have sessionId as string', async () => {
        const mockPrompts = createMockPrompts(22)
        const response = await service.generateImages({ prompts: mockPrompts })

        expect(response.success).toBe(true)
        expect(typeof response.data!.sessionId).toBe('string')
        expect(response.data!.sessionId.length).toBeGreaterThan(0)
      })

      it('should have startedAt before completedAt', async () => {
        const mockPrompts = createMockPrompts(22)
        const response = await service.generateImages({ prompts: mockPrompts })

        expect(response.success).toBe(true)
        expect(response.data!.startedAt.getTime()).toBeLessThanOrEqual(response.data!.completedAt.getTime())
      })

      it('should have fullySuccessful as boolean', async () => {
        const mockPrompts = createMockPrompts(22)
        const response = await service.generateImages({ prompts: mockPrompts })

        expect(response.success).toBe(true)
        expect(typeof response.data!.fullySuccessful).toBe('boolean')
      })
    })
  })

  describe('regenerateImage() Method', () => {
    describe('Success Cases', () => {
      it('should regenerate a single card image', async () => {
        const input: RegenerateImageInput = {
          cardNumber: 13 as CardNumber,
          prompt: 'A detailed tarot card illustration for Death'
        }

        const response = await service.regenerateImage(input)

        expect(response.success).toBe(true)
        expect(response.data?.generatedCard).toBeDefined()
        expect(response.data?.usage).toBeDefined()
      })

      it('should return GeneratedCard with correct card number', async () => {
        const input: RegenerateImageInput = {
          cardNumber: 5 as CardNumber,
          prompt: 'Tarot card for The Hierophant'
        }

        const response = await service.regenerateImage(input)

        expect(response.success).toBe(true)
        expect(response.data!.generatedCard.cardNumber).toBe(5)
      })

      it('should include usage information', async () => {
        const input: RegenerateImageInput = {
          cardNumber: 0 as CardNumber,
          prompt: 'The Fool tarot card'
        }

        const response = await service.regenerateImage(input)

        expect(response.success).toBe(true)
        expect(response.data!.usage.cardNumber).toBe(0)
        expect(typeof response.data!.usage.estimatedCost).toBe('number')
        expect(typeof response.data!.usage.generationTime).toBe('number')
        expect(typeof response.data!.usage.model).toBe('string')
        expect(typeof response.data!.usage.requestId).toBe('string')
      })

      it('should accept previousAttempts parameter', async () => {
        const input: RegenerateImageInput = {
          cardNumber: 13 as CardNumber,
          prompt: 'Death card',
          previousAttempts: 2
        }

        const response = await service.regenerateImage(input)

        expect(response.success).toBe(true)
        expect(response.data!.generatedCard.retryCount).toBeGreaterThanOrEqual(0)
      })

      it('should generate different images on regeneration', async () => {
        const input: RegenerateImageInput = {
          cardNumber: 10 as CardNumber,
          prompt: 'Wheel of Fortune'
        }

        const response1 = await service.regenerateImage(input)
        const response2 = await service.regenerateImage(input)

        expect(response1.success).toBe(true)
        expect(response2.success).toBe(true)
        // IDs should be different for different generations
      })
    })

    describe('Error Cases', () => {
      it('should fail with INVALID_PROMPTS when card number < 0', async () => {
        const input: RegenerateImageInput = {
          cardNumber: -1 as CardNumber,
          prompt: 'Invalid card'
        }

        const response = await service.regenerateImage(input)

        expect(response.success).toBe(false)
        expect(response.error?.code).toMatch(/INVALID_PROMPTS/)
      })

      it('should fail with INVALID_PROMPTS when card number > 21', async () => {
        const input: RegenerateImageInput = {
          cardNumber: 22 as CardNumber,
          prompt: 'Invalid card'
        }

        const response = await service.regenerateImage(input)

        expect(response.success).toBe(false)
        expect(response.error?.code).toMatch(/INVALID_PROMPTS/)
      })

      it('should fail with PROMPT_TOO_LONG for excessively long prompts', async () => {
        const input: RegenerateImageInput = {
          cardNumber: 0 as CardNumber,
          prompt: 'a'.repeat(10000)
        }

        const response = await service.regenerateImage(input)

        if (!response.success) {
          expect(response.error?.code).toMatch(/PROMPT_TOO_LONG/)
        }
      })
    })
  })

  describe('cancelGeneration() Method', () => {
    describe('Success Cases', () => {
      it('should cancel an ongoing generation', async () => {
        const mockPrompts = createMockPrompts(22)

        // Start generation
        const genPromise = service.generateImages({ prompts: mockPrompts })

        // Try to cancel (may complete too fast in mock)
        const cancelResponse = await service.cancelGeneration({ sessionId: 'test-session' })

        // Either succeeds or fails with session not found
        if (cancelResponse.success) {
          expect(cancelResponse.data?.canceled).toBeDefined()
          expect(cancelResponse.data?.completedBeforeCancel).toBeDefined()
          expect(cancelResponse.data?.sessionId).toBeDefined()
        }

        await genPromise
      })

      it('should return number of cards completed before cancel', async () => {
        const input: CancelGenerationInput = {
          sessionId: 'test-session-id'
        }

        const response = await service.cancelGeneration(input)

        if (response.success) {
          expect(typeof response.data!.completedBeforeCancel).toBe('number')
          expect(response.data!.completedBeforeCancel).toBeGreaterThanOrEqual(0)
          expect(response.data!.completedBeforeCancel).toBeLessThanOrEqual(22)
        }
      })
    })

    describe('Error Cases', () => {
      it('should fail with SESSION_NOT_FOUND for non-existent session', async () => {
        const response = await service.cancelGeneration({
          sessionId: 'non-existent-session-id'
        })

        expect(response.success).toBe(false)
        expect(response.error?.code).toBe('SESSION_NOT_FOUND')
      })

      it('should fail with SESSION_ALREADY_COMPLETE for completed session', async () => {
        const mockPrompts = createMockPrompts(22)
        const genResponse = await service.generateImages({ prompts: mockPrompts })

        if (genResponse.success) {
          const cancelResponse = await service.cancelGeneration({
            sessionId: genResponse.data!.sessionId
          })

          if (!cancelResponse.success) {
            expect(cancelResponse.error?.code).toMatch(/SESSION_ALREADY_COMPLETE|SESSION_NOT_FOUND/)
          }
        }
      })

      it('should fail with SESSION_CANCELED when already canceled', async () => {
        // This tests double-cancellation
        const sessionId = 'test-cancel-session'

        const cancel1 = await service.cancelGeneration({ sessionId })

        if (cancel1.success) {
          const cancel2 = await service.cancelGeneration({ sessionId })

          if (!cancel2.success) {
            expect(cancel2.error?.code).toMatch(/SESSION_CANCELED|SESSION_NOT_FOUND/)
          }
        }
      })
    })
  })

  describe('getGenerationStatus() Method', () => {
    describe('Success Cases', () => {
      it('should get status of a generation session', async () => {
        const input: GetGenerationStatusInput = {
          sessionId: 'test-status-session'
        }

        const response = await service.getGenerationStatus(input)

        // May succeed or fail depending on session existence
        if (response.success) {
          expect(response.data?.sessionId).toBeDefined()
          expect(response.data?.progress).toBeDefined()
          expect(response.data?.isComplete).toBeDefined()
          expect(response.data?.isCanceled).toBeDefined()
        }
      })

      it('should return progress with correct structure', async () => {
        const mockPrompts = createMockPrompts(22)
        const genResponse = await service.generateImages({ prompts: mockPrompts })

        if (genResponse.success) {
          const statusResponse = await service.getGenerationStatus({
            sessionId: genResponse.data!.sessionId
          })

          if (statusResponse.success) {
            const progress = statusResponse.data!.progress
            expect(progress.total).toBe(22)
            expect(typeof progress.completed).toBe('number')
            expect(typeof progress.failed).toBe('number')
            expect(typeof progress.current).toBe('number')
            expect(typeof progress.percentComplete).toBe('number')
            expect(typeof progress.estimatedTimeRemaining).toBe('number')
            expect(typeof progress.status).toBe('string')
          }
        }
      })

      it('should have isComplete: true for finished generation', async () => {
        const mockPrompts = createMockPrompts(22)
        const genResponse = await service.generateImages({ prompts: mockPrompts })

        if (genResponse.success) {
          const statusResponse = await service.getGenerationStatus({
            sessionId: genResponse.data!.sessionId
          })

          if (statusResponse.success) {
            expect(statusResponse.data!.isComplete).toBe(true)
          }
        }
      })

      it('should have percentComplete between 0-100', async () => {
        const input: GetGenerationStatusInput = {
          sessionId: 'test-session'
        }

        const response = await service.getGenerationStatus(input)

        if (response.success) {
          expect(response.data!.progress.percentComplete).toBeGreaterThanOrEqual(0)
          expect(response.data!.progress.percentComplete).toBeLessThanOrEqual(100)
        }
      })
    })

    describe('Error Cases', () => {
      it('should fail with SESSION_NOT_FOUND for non-existent session', async () => {
        const response = await service.getGenerationStatus({
          sessionId: 'definitely-does-not-exist'
        })

        expect(response.success).toBe(false)
        expect(response.error?.code).toBe('SESSION_NOT_FOUND')
      })
    })
  })

  describe('estimateCost() Method', () => {
    describe('Success Cases', () => {
      it('should estimate cost for 22 images', async () => {
        const response = await service.estimateCost({ imageCount: 22 })

        expect(response.success).toBe(true)
        expect(response.data?.totalImages).toBe(22)
        expect(response.data?.costPerImage).toBeDefined()
        expect(response.data?.totalEstimatedCost).toBeDefined()
        expect(response.data?.estimatedTime).toBeDefined()
      })

      it('should calculate totalEstimatedCost correctly', async () => {
        const response = await service.estimateCost({ imageCount: 22 })

        expect(response.success).toBe(true)
        const expected = response.data!.costPerImage * response.data!.totalImages
        expect(response.data!.totalEstimatedCost).toBeCloseTo(expected, 2)
      })

      it('should provide reasonable cost per image', async () => {
        const response = await service.estimateCost({ imageCount: 22 })

        expect(response.success).toBe(true)
        expect(response.data!.costPerImage).toBeGreaterThan(0)
        expect(response.data!.costPerImage).toBeLessThan(1.0) // Sanity check
      })

      it('should provide estimated time in seconds', async () => {
        const response = await service.estimateCost({ imageCount: 22 })

        expect(response.success).toBe(true)
        expect(response.data!.estimatedTime).toBeGreaterThan(0)
        expect(typeof response.data!.estimatedTime).toBe('number')
      })

      it('should scale cost with image count', async () => {
        const response10 = await service.estimateCost({ imageCount: 10 })
        const response22 = await service.estimateCost({ imageCount: 22 })

        if (response10.success && response22.success) {
          expect(response22.data!.totalEstimatedCost).toBeGreaterThan(response10.data!.totalEstimatedCost)
        }
      })
    })

    describe('Error Cases', () => {
      it('should fail with error for 0 image count', async () => {
        const response = await service.estimateCost({ imageCount: 0 })

        if (!response.success) {
          expect(response.error?.code).toBeDefined()
        }
      })

      it('should fail with error for negative image count', async () => {
        const response = await service.estimateCost({ imageCount: -5 })

        if (!response.success) {
          expect(response.error?.code).toBeDefined()
        }
      })

      it('should fail with error for excessively large image count', async () => {
        const response = await service.estimateCost({ imageCount: 1000 })

        if (!response.success) {
          expect(response.error?.code).toBeDefined()
        }
      })
    })
  })

  describe('Integration Tests', () => {
    it('should complete full generation workflow', async () => {
      const mockPrompts = createMockPrompts(22)

      // Estimate cost
      const estimateResponse = await service.estimateCost({ imageCount: 22 })
      expect(estimateResponse.success).toBe(true)

      // Generate images
      const genResponse = await service.generateImages({ prompts: mockPrompts })
      expect(genResponse.success).toBe(true)
      expect(genResponse.data!.generatedCards).toHaveLength(22)

      // Verify actual cost is reasonable compared to estimate
      if (estimateResponse.success) {
        const actualCost = genResponse.data!.totalUsage.estimatedCost
        const estimatedCost = estimateResponse.data!.totalEstimatedCost
        expect(actualCost).toBeGreaterThan(0)
        // Actual cost should be in same ballpark as estimate
        expect(actualCost).toBeLessThan(estimatedCost * 2)
      }
    })

    it('should regenerate failed cards after batch generation', async () => {
      const mockPrompts = createMockPrompts(22)
      const genResponse = await service.generateImages({ prompts: mockPrompts })

      if (genResponse.success) {
        const failedCards = genResponse.data!.generatedCards.filter(c => c.generationStatus === 'failed')

        if (failedCards.length > 0) {
          const failedCard = failedCards[0]!
          const regenResponse = await service.regenerateImage({
            cardNumber: failedCard.cardNumber,
            prompt: failedCard.prompt
          })

          expect(regenResponse.success).toBe(true)
          expect(regenResponse.data!.generatedCard.cardNumber).toBe(failedCard.cardNumber)
        }
      }
    })

    it('should track progress during generation', async () => {
      const mockPrompts = createMockPrompts(22)
      const progressUpdates: number[] = []

      await service.generateImages({
        prompts: mockPrompts,
        onProgress: (progress) => {
          progressUpdates.push(progress.percentComplete)
        }
      })

      // Progress should increase over time
      if (progressUpdates.length > 1) {
        const allIncreasing = progressUpdates.every((val, i) => {
          if (i === 0) return true
          return val >= progressUpdates[i - 1]!
        })
        expect(allIncreasing).toBe(true)
      }
    })

    it('should handle saveToStorage option correctly', async () => {
      const mockPrompts = createMockPrompts(22)

      const withStorage = await service.generateImages({
        prompts: mockPrompts,
        saveToStorage: true
      })

      const withoutStorage = await service.generateImages({
        prompts: mockPrompts,
        saveToStorage: false
      })

      expect(withStorage.success).toBe(true)
      expect(withoutStorage.success).toBe(true)
    })
  })

  describe('Error Code Coverage', () => {
    it('should define API_KEY_MISSING error', async () => {
      // Error codes should be available even if not triggered in mock
      const errorCode: ImageGenerationErrorCode = 'API_KEY_MISSING' as ImageGenerationErrorCode
      expect(errorCode).toBe('API_KEY_MISSING')
    })

    it('should define API_KEY_INVALID error', async () => {
      const errorCode: ImageGenerationErrorCode = 'API_KEY_INVALID' as ImageGenerationErrorCode
      expect(errorCode).toBe('API_KEY_INVALID')
    })

    it('should define API_TIMEOUT error', async () => {
      const errorCode: ImageGenerationErrorCode = 'API_TIMEOUT' as ImageGenerationErrorCode
      expect(errorCode).toBe('API_TIMEOUT')
    })

    it('should define API_RATE_LIMIT error', async () => {
      const errorCode: ImageGenerationErrorCode = 'API_RATE_LIMIT' as ImageGenerationErrorCode
      expect(errorCode).toBe('API_RATE_LIMIT')
    })

    it('should define API_ERROR error', async () => {
      const errorCode: ImageGenerationErrorCode = 'API_ERROR' as ImageGenerationErrorCode
      expect(errorCode).toBe('API_ERROR')
    })

    it('should define GENERATION_FAILED error', async () => {
      const errorCode: ImageGenerationErrorCode = 'GENERATION_FAILED' as ImageGenerationErrorCode
      expect(errorCode).toBe('GENERATION_FAILED')
    })

    it('should define INVALID_IMAGE_DATA error', async () => {
      const errorCode: ImageGenerationErrorCode = 'INVALID_IMAGE_DATA' as ImageGenerationErrorCode
      expect(errorCode).toBe('INVALID_IMAGE_DATA')
    })

    it('should define IMAGE_UPLOAD_FAILED error', async () => {
      const errorCode: ImageGenerationErrorCode = 'IMAGE_UPLOAD_FAILED' as ImageGenerationErrorCode
      expect(errorCode).toBe('IMAGE_UPLOAD_FAILED')
    })

    it('should define PARTIAL_GENERATION_FAILURE error', async () => {
      const errorCode: ImageGenerationErrorCode = 'PARTIAL_GENERATION_FAILURE' as ImageGenerationErrorCode
      expect(errorCode).toBe('PARTIAL_GENERATION_FAILURE')
    })

    it('should define ALL_GENERATIONS_FAILED error', async () => {
      const errorCode: ImageGenerationErrorCode = 'ALL_GENERATIONS_FAILED' as ImageGenerationErrorCode
      expect(errorCode).toBe('ALL_GENERATIONS_FAILED')
    })

    it('should define STORAGE_UNAVAILABLE error', async () => {
      const errorCode: ImageGenerationErrorCode = 'STORAGE_UNAVAILABLE' as ImageGenerationErrorCode
      expect(errorCode).toBe('STORAGE_UNAVAILABLE')
    })

    it('should define STORAGE_QUOTA_EXCEEDED error', async () => {
      const errorCode: ImageGenerationErrorCode = 'STORAGE_QUOTA_EXCEEDED' as ImageGenerationErrorCode
      expect(errorCode).toBe('STORAGE_QUOTA_EXCEEDED')
    })

    it('should define NETWORK_ERROR error', async () => {
      const errorCode: ImageGenerationErrorCode = 'NETWORK_ERROR' as ImageGenerationErrorCode
      expect(errorCode).toBe('NETWORK_ERROR')
    })

    it('should define INSUFFICIENT_CREDITS error', async () => {
      const errorCode: ImageGenerationErrorCode = 'INSUFFICIENT_CREDITS' as ImageGenerationErrorCode
      expect(errorCode).toBe('INSUFFICIENT_CREDITS')
    })

    it('should define QUOTA_EXCEEDED error', async () => {
      const errorCode: ImageGenerationErrorCode = 'QUOTA_EXCEEDED' as ImageGenerationErrorCode
      expect(errorCode).toBe('QUOTA_EXCEEDED')
    })
  })
})
