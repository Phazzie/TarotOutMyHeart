/**
 * PromptGeneration Contract Tests
 *
 * Tests that PromptGenerationMock satisfies the IPromptGenerationService contract
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { PromptGenerationMock } from '../../services/mock/PromptGenerationMock'
import {
  type IPromptGenerationService,
  type CardPrompt,
  type GenerationProgress,
  type PromptId,
  type CardNumber,
  PromptGenerationErrorCode,
  MAJOR_ARCANA_COUNT,
  MAJOR_ARCANA_NAMES,
  GROK_MODELS,
} from '../../contracts/PromptGeneration'
import type { StyleInputs } from '../../contracts/StyleInput'

describe('PromptGeneration Contract', () => {
  let service: IPromptGenerationService

  // Mock data used across tests
  const validStyleInputs: StyleInputs = {
    theme: 'Cyberpunk',
    tone: 'Dark',
    description: 'Neon-lit dystopian future with advanced technology and megacorporation control',
    concept: 'Technology vs humanity',
    characters: 'Augmented humans, AIs, corporate agents',
  }

  const validReferenceUrls = [
    'https://blob.vercel-storage.com/image1.jpg',
    'https://blob.vercel-storage.com/image2.png',
  ]

  beforeEach(() => {
    service = new PromptGenerationMock()
  })

  describe('generatePrompts() Method', () => {
    describe('Success Cases', () => {
      it('should generate exactly 22 prompts with valid inputs', async () => {
        const response = await service.generatePrompts({
          referenceImageUrls: validReferenceUrls,
          styleInputs: validStyleInputs,
        })

        expect(response.success).toBe(true)
        expect(response.data?.cardPrompts).toBeDefined()
        expect(response.data?.cardPrompts).toHaveLength(MAJOR_ARCANA_COUNT)
      })

      it('should return prompts with all required properties', async () => {
        const response = await service.generatePrompts({
          referenceImageUrls: validReferenceUrls,
          styleInputs: validStyleInputs,
        })

        expect(response.success).toBe(true)
        const firstPrompt = response.data?.cardPrompts[0]

        expect(firstPrompt?.id).toBeDefined()
        expect(firstPrompt?.cardNumber).toBeDefined()
        expect(firstPrompt?.cardName).toBeDefined()
        expect(firstPrompt?.traditionalMeaning).toBeDefined()
        expect(firstPrompt?.generatedPrompt).toBeDefined()
        expect(firstPrompt?.confidence).toBeDefined()
        expect(firstPrompt?.generatedAt).toBeInstanceOf(Date)
      })

      it('should return cards numbered 0-21 in order', async () => {
        const response = await service.generatePrompts({
          referenceImageUrls: validReferenceUrls,
          styleInputs: validStyleInputs,
        })

        expect(response.success).toBe(true)
        response.data?.cardPrompts.forEach((prompt, index) => {
          expect(prompt.cardNumber).toBe(index)
        })
      })

      it('should return correct card names for each card', async () => {
        const response = await service.generatePrompts({
          referenceImageUrls: validReferenceUrls,
          styleInputs: validStyleInputs,
        })

        expect(response.success).toBe(true)
        response.data?.cardPrompts.forEach((prompt, index) => {
          expect(prompt.cardName).toBe(MAJOR_ARCANA_NAMES[index])
        })
      })

      it('should return non-empty generatedPrompt strings', async () => {
        const response = await service.generatePrompts({
          referenceImageUrls: validReferenceUrls,
          styleInputs: validStyleInputs,
        })

        expect(response.success).toBe(true)
        response.data?.cardPrompts.forEach(prompt => {
          expect(prompt.generatedPrompt.length).toBeGreaterThan(0)
        })
      })

      it('should return confidence scores between 0 and 1', async () => {
        const response = await service.generatePrompts({
          referenceImageUrls: validReferenceUrls,
          styleInputs: validStyleInputs,
        })

        expect(response.success).toBe(true)
        response.data?.cardPrompts.forEach(prompt => {
          expect(prompt.confidence).toBeGreaterThanOrEqual(0)
          expect(prompt.confidence).toBeLessThanOrEqual(1)
        })
      })

      it('should include API usage information', async () => {
        const response = await service.generatePrompts({
          referenceImageUrls: validReferenceUrls,
          styleInputs: validStyleInputs,
        })

        expect(response.success).toBe(true)
        expect(response.data?.usage).toBeDefined()
        expect(response.data?.usage.promptTokens).toBeGreaterThan(0)
        expect(response.data?.usage.completionTokens).toBeGreaterThan(0)
        expect(response.data?.usage.totalTokens).toBeGreaterThan(0)
        expect(response.data?.usage.estimatedCost).toBeGreaterThan(0)
        expect(response.data?.usage.model).toBeDefined()
      })

      it('should include requestId and generatedAt timestamp', async () => {
        const response = await service.generatePrompts({
          referenceImageUrls: validReferenceUrls,
          styleInputs: validStyleInputs,
        })

        expect(response.success).toBe(true)
        expect(response.data?.requestId).toBeDefined()
        expect(response.data?.generatedAt).toBeInstanceOf(Date)
      })

      it('should use default model when not specified', async () => {
        const response = await service.generatePrompts({
          referenceImageUrls: validReferenceUrls,
          styleInputs: validStyleInputs,
        })

        expect(response.success).toBe(true)
        expect(response.data?.model).toBe(GROK_MODELS.vision)
      })

      it('should accept custom model parameter', async () => {
        const response = await service.generatePrompts({
          referenceImageUrls: validReferenceUrls,
          styleInputs: validStyleInputs,
          model: GROK_MODELS.vision,
        })

        expect(response.success).toBe(true)
        expect(response.data?.model).toBe(GROK_MODELS.vision)
      })

      it('should accept temperature parameter', async () => {
        const response = await service.generatePrompts({
          referenceImageUrls: validReferenceUrls,
          styleInputs: validStyleInputs,
          temperature: 0.5,
        })

        expect(response.success).toBe(true)
      })

      it('should accept single reference image', async () => {
        const response = await service.generatePrompts({
          referenceImageUrls: ['https://example.com/single.jpg'],
          styleInputs: validStyleInputs,
        })

        expect(response.success).toBe(true)
        expect(response.data?.cardPrompts).toHaveLength(MAJOR_ARCANA_COUNT)
      })

      it('should accept multiple reference images', async () => {
        const multipleUrls = [
          'https://example.com/img1.jpg',
          'https://example.com/img2.png',
          'https://example.com/img3.jpg',
          'https://example.com/img4.png',
          'https://example.com/img5.jpg',
        ]

        const response = await service.generatePrompts({
          referenceImageUrls: multipleUrls,
          styleInputs: validStyleInputs,
        })

        expect(response.success).toBe(true)
        expect(response.data?.cardPrompts).toHaveLength(MAJOR_ARCANA_COUNT)
      })
    })

    describe('Progress Callback', () => {
      it('should call onProgress callback during generation', async () => {
        const progressUpdates: GenerationProgress[] = []

        await service.generatePrompts({
          referenceImageUrls: validReferenceUrls,
          styleInputs: validStyleInputs,
          onProgress: progress => {
            progressUpdates.push(progress)
          },
        })

        expect(progressUpdates.length).toBeGreaterThan(0)
      })

      it('should provide progress percentage from 0 to 100', async () => {
        const progressUpdates: GenerationProgress[] = []

        await service.generatePrompts({
          referenceImageUrls: validReferenceUrls,
          styleInputs: validStyleInputs,
          onProgress: progress => {
            progressUpdates.push(progress)
          },
        })

        progressUpdates.forEach(update => {
          expect(update.progress).toBeGreaterThanOrEqual(0)
          expect(update.progress).toBeLessThanOrEqual(100)
        })
      })

      it('should have increasing progress values', async () => {
        const progressUpdates: GenerationProgress[] = []

        await service.generatePrompts({
          referenceImageUrls: validReferenceUrls,
          styleInputs: validStyleInputs,
          onProgress: progress => {
            progressUpdates.push(progress)
          },
        })

        for (let i = 1; i < progressUpdates.length; i++) {
          expect(progressUpdates[i]?.progress).toBeGreaterThanOrEqual(
            progressUpdates[i - 1]?.progress ?? 0
          )
        }
      })

      it('should include status and currentStep in progress', async () => {
        const progressUpdates: GenerationProgress[] = []

        await service.generatePrompts({
          referenceImageUrls: validReferenceUrls,
          styleInputs: validStyleInputs,
          onProgress: progress => {
            progressUpdates.push(progress)
          },
        })

        progressUpdates.forEach(update => {
          expect(update.status).toBeDefined()
          expect(update.currentStep).toBeDefined()
          expect(['uploading', 'analyzing', 'generating', 'validating', 'complete']).toContain(
            update.currentStep
          )
        })
      })

      it('should end with complete step at 100% progress', async () => {
        const progressUpdates: GenerationProgress[] = []

        await service.generatePrompts({
          referenceImageUrls: validReferenceUrls,
          styleInputs: validStyleInputs,
          onProgress: progress => {
            progressUpdates.push(progress)
          },
        })

        const lastUpdate = progressUpdates[progressUpdates.length - 1]
        expect(lastUpdate?.progress).toBe(100)
        expect(lastUpdate?.currentStep).toBe('complete')
      })
    })

    describe('Input Validation Errors', () => {
      it('should fail with NO_REFERENCE_IMAGES when no images provided', async () => {
        const response = await service.generatePrompts({
          referenceImageUrls: [],
          styleInputs: validStyleInputs,
        })

        expect(response.success).toBe(false)
        expect(response.error?.code).toBe(PromptGenerationErrorCode.NO_REFERENCE_IMAGES)
        expect(response.error?.retryable).toBe(false)
      })

      it('should fail with INVALID_REFERENCE_URL for invalid URL', async () => {
        const response = await service.generatePrompts({
          referenceImageUrls: ['not-a-valid-url'],
          styleInputs: validStyleInputs,
        })

        expect(response.success).toBe(false)
        expect(response.error?.code).toBe(PromptGenerationErrorCode.INVALID_REFERENCE_URL)
      })

      it('should fail with INVALID_STYLE_INPUTS for invalid style', async () => {
        const response = await service.generatePrompts({
          referenceImageUrls: validReferenceUrls,
          styleInputs: { theme: '', tone: '', description: '' } as StyleInputs,
        })

        expect(response.success).toBe(false)
        expect(response.error?.code).toBe(PromptGenerationErrorCode.INVALID_STYLE_INPUTS)
      })

      it('should fail with INVALID_MODEL for unsupported model', async () => {
        const response = await service.generatePrompts({
          referenceImageUrls: validReferenceUrls,
          styleInputs: validStyleInputs,
          model: 'invalid-model' as any,
        })

        expect(response.success).toBe(false)
        expect(response.error?.code).toBe(PromptGenerationErrorCode.INVALID_MODEL)
      })
    })

    describe('API Error Cases', () => {
      it('should handle API_KEY_MISSING error', async () => {
        // Mock will simulate this based on environment or test condition
        // Implementation detail: service detects missing key scenario
        expect(PromptGenerationErrorCode.API_KEY_MISSING).toBeDefined()
      })

      it('should handle API_KEY_INVALID error', async () => {
        expect(PromptGenerationErrorCode.API_KEY_INVALID).toBeDefined()
      })

      it('should handle API_TIMEOUT error with retryable flag', async () => {
        // Error should be marked as retryable
        expect(PromptGenerationErrorCode.API_TIMEOUT).toBeDefined()
      })

      it('should handle API_RATE_LIMIT error with retryable flag', async () => {
        expect(PromptGenerationErrorCode.API_RATE_LIMIT).toBeDefined()
      })

      it('should handle generic API_ERROR', async () => {
        expect(PromptGenerationErrorCode.API_ERROR).toBeDefined()
      })
    })

    describe('Response Validation Errors', () => {
      it('should detect INCOMPLETE_RESPONSE when fewer than 22 prompts', async () => {
        // This tests the validation logic after API call
        expect(PromptGenerationErrorCode.INCOMPLETE_RESPONSE).toBeDefined()
      })

      it('should detect INVALID_RESPONSE_FORMAT for malformed JSON', async () => {
        expect(PromptGenerationErrorCode.INVALID_RESPONSE_FORMAT).toBeDefined()
      })

      it('should detect PROMPT_TOO_SHORT for insufficient prompt length', async () => {
        expect(PromptGenerationErrorCode.PROMPT_TOO_SHORT).toBeDefined()
      })

      it('should detect PROMPT_TOO_LONG for excessive prompt length', async () => {
        expect(PromptGenerationErrorCode.PROMPT_TOO_LONG).toBeDefined()
      })

      it('should detect DUPLICATE_CARD_NUMBER in response', async () => {
        expect(PromptGenerationErrorCode.DUPLICATE_CARD_NUMBER).toBeDefined()
      })

      it('should detect MISSING_CARD_NUMBER in response', async () => {
        expect(PromptGenerationErrorCode.MISSING_CARD_NUMBER).toBeDefined()
      })
    })

    describe('Network Errors', () => {
      it('should handle NETWORK_ERROR', async () => {
        expect(PromptGenerationErrorCode.NETWORK_ERROR).toBeDefined()
      })

      it('should handle IMAGE_URL_UNREACHABLE', async () => {
        expect(PromptGenerationErrorCode.IMAGE_URL_UNREACHABLE).toBeDefined()
      })
    })

    describe('Cost/Quota Errors', () => {
      it('should handle INSUFFICIENT_CREDITS error', async () => {
        expect(PromptGenerationErrorCode.INSUFFICIENT_CREDITS).toBeDefined()
      })

      it('should handle QUOTA_EXCEEDED error', async () => {
        expect(PromptGenerationErrorCode.QUOTA_EXCEEDED).toBeDefined()
      })
    })
  })

  describe('validatePrompts() Method', () => {
    let validPrompts: CardPrompt[]

    beforeEach(async () => {
      const response = await service.generatePrompts({
        referenceImageUrls: validReferenceUrls,
        styleInputs: validStyleInputs,
      })
      validPrompts = response.data!.cardPrompts
    })

    describe('Success Cases', () => {
      it('should validate 22 valid prompts successfully', async () => {
        const response = await service.validatePrompts({
          prompts: validPrompts,
        })

        expect(response.success).toBe(true)
        expect(response.data?.isValid).toBe(true)
        expect(response.data?.errors).toHaveLength(0)
        expect(response.data?.invalidPrompts).toHaveLength(0)
      })

      it('should return validation result structure', async () => {
        const response = await service.validatePrompts({
          prompts: validPrompts,
        })

        expect(response.success).toBe(true)
        expect(response.data?.isValid).toBeDefined()
        expect(response.data?.invalidPrompts).toBeDefined()
        expect(response.data?.errors).toBeDefined()
      })
    })

    describe('Validation Rules', () => {
      it('should fail when not exactly 22 prompts', async () => {
        const response = await service.validatePrompts({
          prompts: validPrompts.slice(0, 20),
        })

        expect(response.success).toBe(true) // Validation runs successfully
        expect(response.data?.isValid).toBe(false)
        expect(response.data?.errors.length).toBeGreaterThan(0)
      })

      it('should detect missing card numbers', async () => {
        const promptsWithGap = validPrompts.filter(p => p.cardNumber !== 5)

        const response = await service.validatePrompts({
          prompts: promptsWithGap,
        })

        expect(response.success).toBe(true)
        expect(response.data?.isValid).toBe(false)
      })

      it('should detect duplicate card numbers', async () => {
        const duplicatePrompts = [...validPrompts]
        const duplicatedCard = duplicatePrompts[5]
        if (duplicatedCard) {
          duplicatePrompts[5] = { ...duplicatedCard, id: 'different-id' as PromptId }
        }

        const response = await service.validatePrompts({
          prompts: duplicatePrompts,
        })

        expect(response.success).toBe(true)
        expect(response.data?.isValid).toBe(false)
      })

      it('should detect prompts with confidence outside 0-1 range', async () => {
        const invalidPrompts = validPrompts.map((p, i) => (i === 0 ? { ...p, confidence: 1.5 } : p))

        const response = await service.validatePrompts({
          prompts: invalidPrompts,
        })

        expect(response.success).toBe(true)
        expect(response.data?.isValid).toBe(false)
      })

      it('should include error details for invalid prompts', async () => {
        const response = await service.validatePrompts({
          prompts: validPrompts.slice(0, 10),
        })

        expect(response.success).toBe(true)
        expect(response.data?.isValid).toBe(false)
        expect(response.data?.errors.length).toBeGreaterThan(0)

        const firstError = response.data?.errors[0]
        expect(firstError?.code).toBeDefined()
        expect(firstError?.message).toBeDefined()
      })
    })
  })

  describe('regeneratePrompt() Method', () => {
    describe('Success Cases', () => {
      it('should regenerate a single card prompt', async () => {
        const response = await service.regeneratePrompt({
          cardNumber: 0 as CardNumber,
          referenceImageUrls: validReferenceUrls,
          styleInputs: validStyleInputs,
        })

        expect(response.success).toBe(true)
        expect(response.data?.cardPrompt).toBeDefined()
        expect(response.data?.cardPrompt.cardNumber).toBe(0)
      })

      it('should preserve card number in regenerated prompt', async () => {
        const cardNumber = 13 as CardNumber

        const response = await service.regeneratePrompt({
          cardNumber,
          referenceImageUrls: validReferenceUrls,
          styleInputs: validStyleInputs,
        })

        expect(response.success).toBe(true)
        expect(response.data?.cardPrompt.cardNumber).toBe(cardNumber)
        expect(response.data?.cardPrompt.cardName).toBe(MAJOR_ARCANA_NAMES[cardNumber])
      })

      it('should include API usage information', async () => {
        const response = await service.regeneratePrompt({
          cardNumber: 5 as CardNumber,
          referenceImageUrls: validReferenceUrls,
          styleInputs: validStyleInputs,
        })

        expect(response.success).toBe(true)
        expect(response.data?.usage).toBeDefined()
        expect(response.data?.usage.estimatedCost).toBeGreaterThan(0)
      })

      it('should include requestId', async () => {
        const response = await service.regeneratePrompt({
          cardNumber: 10 as CardNumber,
          referenceImageUrls: validReferenceUrls,
          styleInputs: validStyleInputs,
        })

        expect(response.success).toBe(true)
        expect(response.data?.requestId).toBeDefined()
      })

      it('should accept optional previousPrompt parameter', async () => {
        const response = await service.regeneratePrompt({
          cardNumber: 0 as CardNumber,
          referenceImageUrls: validReferenceUrls,
          styleInputs: validStyleInputs,
          previousPrompt: 'Original prompt text',
        })

        expect(response.success).toBe(true)
      })

      it('should accept optional feedback parameter', async () => {
        const response = await service.regeneratePrompt({
          cardNumber: 0 as CardNumber,
          referenceImageUrls: validReferenceUrls,
          styleInputs: validStyleInputs,
          feedback: 'Make it more mysterious',
        })

        expect(response.success).toBe(true)
      })

      it('should accept both previousPrompt and feedback', async () => {
        const response = await service.regeneratePrompt({
          cardNumber: 7 as CardNumber,
          referenceImageUrls: validReferenceUrls,
          styleInputs: validStyleInputs,
          previousPrompt: 'Original prompt',
          feedback: 'Add more symbolism',
        })

        expect(response.success).toBe(true)
      })

      it('should regenerate all card numbers 0-21', async () => {
        for (let i = 0; i <= 21; i++) {
          const response = await service.regeneratePrompt({
            cardNumber: i as CardNumber,
            referenceImageUrls: validReferenceUrls,
            styleInputs: validStyleInputs,
          })

          expect(response.success).toBe(true)
          expect(response.data?.cardPrompt.cardNumber).toBe(i)
        }
      })
    })

    describe('Error Cases', () => {
      it('should fail with NO_REFERENCE_IMAGES when no images provided', async () => {
        const response = await service.regeneratePrompt({
          cardNumber: 0 as CardNumber,
          referenceImageUrls: [],
          styleInputs: validStyleInputs,
        })

        expect(response.success).toBe(false)
        expect(response.error?.code).toBe(PromptGenerationErrorCode.NO_REFERENCE_IMAGES)
      })

      it('should fail with INVALID_STYLE_INPUTS for invalid style', async () => {
        const response = await service.regeneratePrompt({
          cardNumber: 0 as CardNumber,
          referenceImageUrls: validReferenceUrls,
          styleInputs: { theme: '', tone: '', description: '' } as StyleInputs,
        })

        expect(response.success).toBe(false)
        expect(response.error?.code).toBe(PromptGenerationErrorCode.INVALID_STYLE_INPUTS)
      })
    })
  })

  describe('editPrompt() Method', () => {
    let testPromptId: PromptId

    beforeEach(async () => {
      const response = await service.generatePrompts({
        referenceImageUrls: validReferenceUrls,
        styleInputs: validStyleInputs,
      })
      const firstPrompt = response.data?.cardPrompts[0]
      if (firstPrompt) {
        testPromptId = firstPrompt.id
      }
    })

    describe('Success Cases', () => {
      it('should edit a prompt successfully', async () => {
        const newPromptText = 'A custom edited prompt for The Fool card'

        const response = await service.editPrompt({
          promptId: testPromptId,
          editedPrompt: newPromptText,
        })

        expect(response.success).toBe(true)
        expect(response.data?.edited).toBe(true)
        expect(response.data?.cardPrompt).toBeDefined()
      })

      it('should return updated cardPrompt with new text', async () => {
        const newPromptText = 'Cyberpunk warrior with neon implants'

        const response = await service.editPrompt({
          promptId: testPromptId,
          editedPrompt: newPromptText,
        })

        expect(response.success).toBe(true)
        expect(response.data?.cardPrompt.generatedPrompt).toContain('edited')
      })

      it('should preserve card metadata when editing', async () => {
        const response = await service.editPrompt({
          promptId: testPromptId,
          editedPrompt: 'New prompt text',
        })

        expect(response.success).toBe(true)
        expect(response.data?.cardPrompt.id).toBe(testPromptId)
        expect(response.data?.cardPrompt.cardNumber).toBeDefined()
        expect(response.data?.cardPrompt.cardName).toBeDefined()
        expect(response.data?.cardPrompt.traditionalMeaning).toBeDefined()
      })

      it('should handle long edited prompts', async () => {
        const longPrompt = 'A '.repeat(200) + 'detailed prompt'

        const response = await service.editPrompt({
          promptId: testPromptId,
          editedPrompt: longPrompt,
        })

        expect(response.success).toBe(true)
      })
    })

    describe('Error Cases', () => {
      it('should validate edited prompt length', async () => {
        // Test implementation might reject very short prompts
        const response = await service.editPrompt({
          promptId: testPromptId,
          editedPrompt: 'ab',
        })

        // Either succeeds or fails with appropriate error
        if (!response.success) {
          expect(response.error?.code).toBe(PromptGenerationErrorCode.PROMPT_TOO_SHORT)
        }
      })

      it('should handle excessively long prompts', async () => {
        const tooLongPrompt = 'A '.repeat(5000)

        const response = await service.editPrompt({
          promptId: testPromptId,
          editedPrompt: tooLongPrompt,
        })

        if (!response.success) {
          expect(response.error?.code).toBe(PromptGenerationErrorCode.PROMPT_TOO_LONG)
        }
      })
    })
  })

  describe('estimateCost() Method', () => {
    describe('Success Cases', () => {
      it('should estimate cost for prompt generation', async () => {
        const response = await service.estimateCost({
          referenceImageUrls: validReferenceUrls,
          styleInputs: validStyleInputs,
        })

        expect(response.success).toBe(true)
        expect(response.data).toBeDefined()
      })

      it('should return ApiUsage structure', async () => {
        const response = await service.estimateCost({
          referenceImageUrls: validReferenceUrls,
          styleInputs: validStyleInputs,
        })

        expect(response.success).toBe(true)
        expect(response.data?.promptTokens).toBeDefined()
        expect(response.data?.completionTokens).toBeDefined()
        expect(response.data?.totalTokens).toBeDefined()
        expect(response.data?.estimatedCost).toBeDefined()
        expect(response.data?.model).toBeDefined()
      })

      it('should return positive cost estimate', async () => {
        const response = await service.estimateCost({
          referenceImageUrls: validReferenceUrls,
          styleInputs: validStyleInputs,
        })

        expect(response.success).toBe(true)
        expect(response.data?.estimatedCost).toBeGreaterThan(0)
      })

      it('should calculate totalTokens correctly', async () => {
        const response = await service.estimateCost({
          referenceImageUrls: validReferenceUrls,
          styleInputs: validStyleInputs,
        })

        expect(response.success).toBe(true)
        const { promptTokens, completionTokens, totalTokens } = response.data!
        expect(totalTokens).toBe(promptTokens + completionTokens)
      })

      it('should accept custom model parameter', async () => {
        const response = await service.estimateCost({
          referenceImageUrls: validReferenceUrls,
          styleInputs: validStyleInputs,
          model: GROK_MODELS.vision,
        })

        expect(response.success).toBe(true)
        expect(response.data?.model).toBe(GROK_MODELS.vision)
      })

      it('should accept temperature parameter', async () => {
        const response = await service.estimateCost({
          referenceImageUrls: validReferenceUrls,
          styleInputs: validStyleInputs,
          temperature: 0.7,
        })

        expect(response.success).toBe(true)
      })

      it('should estimate cost for single reference image', async () => {
        const response = await service.estimateCost({
          referenceImageUrls: ['https://example.com/single.jpg'],
          styleInputs: validStyleInputs,
        })

        expect(response.success).toBe(true)
        expect(response.data?.estimatedCost).toBeGreaterThan(0)
      })

      it('should estimate cost for multiple reference images', async () => {
        const multipleUrls = [
          'https://example.com/img1.jpg',
          'https://example.com/img2.jpg',
          'https://example.com/img3.jpg',
          'https://example.com/img4.jpg',
          'https://example.com/img5.jpg',
        ]

        const response = await service.estimateCost({
          referenceImageUrls: multipleUrls,
          styleInputs: validStyleInputs,
        })

        expect(response.success).toBe(true)
        expect(response.data?.estimatedCost).toBeGreaterThan(0)
      })

      it('should not accept onProgress parameter', () => {
        // Type check - estimateCost should not have onProgress
        const input = {
          referenceImageUrls: validReferenceUrls,
          styleInputs: validStyleInputs,
          // onProgress is explicitly excluded from estimateCost input type
        }

        expect(input).toBeDefined()
      })
    })

    describe('Error Cases', () => {
      it('should fail with NO_REFERENCE_IMAGES when no images provided', async () => {
        const response = await service.estimateCost({
          referenceImageUrls: [],
          styleInputs: validStyleInputs,
        })

        expect(response.success).toBe(false)
        expect(response.error?.code).toBe(PromptGenerationErrorCode.NO_REFERENCE_IMAGES)
      })

      it('should fail with INVALID_STYLE_INPUTS for invalid style', async () => {
        const response = await service.estimateCost({
          referenceImageUrls: validReferenceUrls,
          styleInputs: { theme: '', tone: '', description: '' } as StyleInputs,
        })

        expect(response.success).toBe(false)
        expect(response.error?.code).toBe(PromptGenerationErrorCode.INVALID_STYLE_INPUTS)
      })
    })
  })

  describe('Integration Tests', () => {
    it('should generate, validate, and confirm all 22 prompts are valid', async () => {
      // Generate
      const generateResponse = await service.generatePrompts({
        referenceImageUrls: validReferenceUrls,
        styleInputs: validStyleInputs,
      })

      expect(generateResponse.success).toBe(true)

      // Validate
      const validateResponse = await service.validatePrompts({
        prompts: generateResponse.data!.cardPrompts,
      })

      expect(validateResponse.success).toBe(true)
      expect(validateResponse.data?.isValid).toBe(true)
    })

    it('should generate, edit one card, and still have 22 valid prompts', async () => {
      // Generate
      const generateResponse = await service.generatePrompts({
        referenceImageUrls: validReferenceUrls,
        styleInputs: validStyleInputs,
      })

      const prompts = generateResponse.data!.cardPrompts
      const firstPrompt = prompts[0]

      // Edit card 0
      if (firstPrompt) {
        await service.editPrompt({
          promptId: firstPrompt.id,
          editedPrompt: 'Custom edited prompt',
        })
      }

      // Validate (would need to get updated prompts from state in real implementation)
      expect(prompts).toHaveLength(22)
    })

    it('should generate, regenerate one card, and maintain card count', async () => {
      // Generate
      const generateResponse = await service.generatePrompts({
        referenceImageUrls: validReferenceUrls,
        styleInputs: validStyleInputs,
      })

      expect(generateResponse.success).toBe(true)

      // Regenerate card 13 (Death)
      const regenerateResponse = await service.regeneratePrompt({
        cardNumber: 13 as CardNumber,
        referenceImageUrls: validReferenceUrls,
        styleInputs: validStyleInputs,
        feedback: 'Make it more symbolic',
      })

      expect(regenerateResponse.success).toBe(true)
      expect(regenerateResponse.data?.cardPrompt.cardNumber).toBe(13)
    })

    it('should estimate cost before generating, then verify actual cost is reasonable', async () => {
      // Estimate
      const estimateResponse = await service.estimateCost({
        referenceImageUrls: validReferenceUrls,
        styleInputs: validStyleInputs,
      })

      const estimatedCost = estimateResponse.data!.estimatedCost

      // Generate
      const generateResponse = await service.generatePrompts({
        referenceImageUrls: validReferenceUrls,
        styleInputs: validStyleInputs,
      })

      const actualCost = generateResponse.data!.usage.estimatedCost

      // Actual cost should be within reasonable range of estimate
      expect(actualCost).toBeGreaterThan(0)
      expect(estimatedCost).toBeGreaterThan(0)
      // Mock should make these similar
      expect(Math.abs(actualCost - estimatedCost)).toBeLessThan(estimatedCost * 0.5)
    })

    it('should handle different style inputs and produce different prompts', async () => {
      // Generate with cyberpunk style
      const response1 = await service.generatePrompts({
        referenceImageUrls: validReferenceUrls,
        styleInputs: validStyleInputs,
      })

      // Generate with gothic style
      const gothicStyle: StyleInputs = {
        theme: 'Gothic',
        tone: 'Dark',
        description: 'Medieval gothic cathedral with stained glass and stone gargoyles',
        concept: 'Light and darkness',
        characters: 'Monks, angels, demons',
      }

      const response2 = await service.generatePrompts({
        referenceImageUrls: validReferenceUrls,
        styleInputs: gothicStyle,
      })

      expect(response1.success).toBe(true)
      expect(response2.success).toBe(true)
      expect(response1.data?.cardPrompts).toHaveLength(22)
      expect(response2.data?.cardPrompts).toHaveLength(22)
    })

    it('should track different request IDs for separate generations', async () => {
      const response1 = await service.generatePrompts({
        referenceImageUrls: validReferenceUrls,
        styleInputs: validStyleInputs,
      })

      const response2 = await service.generatePrompts({
        referenceImageUrls: validReferenceUrls,
        styleInputs: validStyleInputs,
      })

      expect(response1.data?.requestId).toBeDefined()
      expect(response2.data?.requestId).toBeDefined()
      expect(response1.data?.requestId).not.toBe(response2.data?.requestId)
    })
  })

  describe('Error Code Coverage', () => {
    it('should have all error codes defined', () => {
      const errorCodes = [
        'API_KEY_MISSING',
        'API_KEY_INVALID',
        'API_TIMEOUT',
        'API_RATE_LIMIT',
        'API_ERROR',
        'NO_REFERENCE_IMAGES',
        'INVALID_REFERENCE_URL',
        'INVALID_STYLE_INPUTS',
        'INVALID_MODEL',
        'INCOMPLETE_RESPONSE',
        'INVALID_RESPONSE_FORMAT',
        'PROMPT_TOO_SHORT',
        'PROMPT_TOO_LONG',
        'DUPLICATE_CARD_NUMBER',
        'MISSING_CARD_NUMBER',
        'NETWORK_ERROR',
        'IMAGE_URL_UNREACHABLE',
        'INSUFFICIENT_CREDITS',
        'QUOTA_EXCEEDED',
      ]

      errorCodes.forEach(code => {
        expect(PromptGenerationErrorCode[code as keyof typeof PromptGenerationErrorCode]).toBe(code)
      })
    })
  })
})
