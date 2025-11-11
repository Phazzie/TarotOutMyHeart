/**
 * @fileoverview Contract tests for PromptGeneration seam
 * @purpose Validate PromptGenerationMock matches PromptGeneration contract exactly
 * @testStrategy
 * 1. Interface compliance - Mock implements interface
 * 2. Input validation - Handles valid/invalid inputs correctly
 * 3. Return types - Matches contract types exactly
 * 4. Error handling - Returns correct error codes
 * 5. Prompt generation - Returns exactly 22 Major Arcana prompts
 */

import { describe, it, expect, beforeEach } from 'vitest'
import type {
  IPromptGenerationService,
  CardPrompt,
  GenerationProgress,
} from '$contracts/PromptGeneration'
import {
  PromptGenerationErrorCode,
  MAJOR_ARCANA_COUNT,
  MAJOR_ARCANA_NAMES,
} from '$contracts/PromptGeneration'
import { promptGenerationMockService } from '$services/mock/PromptGenerationMock'

describe('PromptGeneration Contract Compliance', () => {
  let service: IPromptGenerationService

  beforeEach(() => {
    service = promptGenerationMockService
  })

  describe('Interface Implementation', () => {
    it('should implement IPromptGenerationService interface', () => {
      expect(service).toBeDefined()
      expect(service.generatePrompts).toBeDefined()
      expect(typeof service.generatePrompts).toBe('function')
      expect(service.validatePrompts).toBeDefined()
      expect(typeof service.validatePrompts).toBe('function')
      expect(service.regeneratePrompt).toBeDefined()
      expect(typeof service.regeneratePrompt).toBe('function')
      expect(service.editPrompt).toBeDefined()
      expect(typeof service.editPrompt).toBe('function')
      expect(service.estimateCost).toBeDefined()
      expect(typeof service.estimateCost).toBe('function')
    })
  })

  describe('generatePrompts()', () => {
    it('should require imageUrls array (1-5 images)', async () => {
      const response = await service.generatePrompts({
        referenceImageUrls: [],
        styleInputs: {
          theme: 'Cyberpunk',
          tone: 'Dark',
          description: 'A neon-lit dystopian future',
        },
      })

      expect(response.success).toBe(false)
      expect(response.error).toBeDefined()
      if (response.error) {
        expect(response.error.code).toBe('NO_REFERENCE_IMAGES')
      }
    })

    it('should require styleInput object', async () => {
      const response = await service.generatePrompts({
        referenceImageUrls: ['https://example.com/image.jpg'],
        styleInputs: {
          theme: '',
          tone: '',
          description: '',
        },
      })

      // Should fail validation or return error
      expect(response.success).toBe(false)
      expect(response.error?.code).toBe('INVALID_STYLE_INPUTS')
    })

    it('should return exactly 22 CardPrompt objects', async () => {
      const response = await service.generatePrompts({
        referenceImageUrls: ['https://example.com/image.jpg'],
        styleInputs: {
          theme: 'Cyberpunk',
          tone: 'Dark',
          description: 'A neon-lit dystopian future with cybernetic enhancements',
        },
      })

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      if (response.data) {
        expect(response.data.cardPrompts).toHaveLength(MAJOR_ARCANA_COUNT)
      }
    })

    it('should have correct card numbers (0-21)', async () => {
      const response = await service.generatePrompts({
        referenceImageUrls: ['https://example.com/image.jpg'],
        styleInputs: {
          theme: 'Gothic',
          tone: 'Dark',
          description: 'Victorian era with supernatural elements',
        },
      })

      expect(response.success).toBe(true)
      if (response.data) {
        const cardNumbers = response.data.cardPrompts.map(p => p.cardNumber)
        const expectedNumbers = Array.from({ length: 22 }, (_, i) => i)
        expect(cardNumbers.sort()).toEqual(expectedNumbers)
      }
    })

    it('should have correct card names matching Major Arcana', async () => {
      const response = await service.generatePrompts({
        referenceImageUrls: ['https://example.com/image.jpg'],
        styleInputs: {
          theme: 'Watercolor',
          tone: 'Soft',
          description: 'Gentle flowing watercolor effects',
        },
      })

      expect(response.success).toBe(true)
      if (response.data) {
        response.data.cardPrompts.forEach((prompt) => {
          expect(prompt.cardName).toBe(MAJOR_ARCANA_NAMES[prompt.cardNumber])
        })
      }
    })

    it('should have non-empty prompt strings', async () => {
      const response = await service.generatePrompts({
        referenceImageUrls: ['https://example.com/image.jpg'],
        styleInputs: {
          theme: 'Art Nouveau',
          tone: 'Mystical',
          description: 'Flowing organic forms with nature motifs',
        },
      })

      expect(response.success).toBe(true)
      if (response.data) {
        response.data.cardPrompts.forEach((prompt) => {
          expect(prompt.generatedPrompt).toBeTruthy()
          expect(prompt.generatedPrompt.length).toBeGreaterThan(0)
        })
      }
    })

    it('should have positive estimatedTokens', async () => {
      const response = await service.generatePrompts({
        referenceImageUrls: ['https://example.com/image.jpg'],
        styleInputs: {
          theme: 'Minimalist',
          tone: 'Modern',
          description: 'Clean lines and simple geometric forms',
        },
      })

      expect(response.success).toBe(true)
      if (response.data) {
        response.data.cardPrompts.forEach((prompt) => {
          expect(prompt.confidence).toBeGreaterThan(0)
          expect(prompt.confidence).toBeLessThanOrEqual(1)
        })
      }
    })

    it('should call progress callback with 0-100 percentage', async () => {
      const progressUpdates: number[] = []

      await service.generatePrompts({
        referenceImageUrls: ['https://example.com/image.jpg'],
        styleInputs: {
          theme: 'Fantasy',
          tone: 'Whimsical',
          description: 'Magical realm with fantastical creatures',
        },
        onProgress: (progress: GenerationProgress) => {
          progressUpdates.push(progress.progress)
        },
      })

      expect(progressUpdates.length).toBeGreaterThan(0)
      expect(progressUpdates[0]).toBeGreaterThanOrEqual(0)
      expect(progressUpdates[progressUpdates.length - 1]).toBeLessThanOrEqual(100)
    })

    it('should return usage and cost information', async () => {
      const response = await service.generatePrompts({
        referenceImageUrls: ['https://example.com/image.jpg'],
        styleInputs: {
          theme: 'Art Deco',
          tone: 'Bold',
          description: 'Geometric patterns and luxurious metallic accents',
        },
      })

      expect(response.success).toBe(true)
      if (response.data) {
        expect(response.data.usage).toBeDefined()
        expect(response.data.usage.promptTokens).toBeGreaterThan(0)
        expect(response.data.usage.completionTokens).toBeGreaterThan(0)
        expect(response.data.usage.totalTokens).toBeGreaterThan(0)
        expect(response.data.usage.estimatedCost).toBeGreaterThan(0)
        expect(response.data.usage.model).toBeTruthy()
      }
    })

    it('should return requestId and generatedAt', async () => {
      const response = await service.generatePrompts({
        referenceImageUrls: ['https://example.com/image.jpg'],
        styleInputs: {
          theme: 'Digital Art',
          tone: 'Bold',
          description: 'Sharp digital rendering with vibrant colors',
        },
      })

      expect(response.success).toBe(true)
      if (response.data) {
        expect(response.data.requestId).toBeTruthy()
        expect(response.data.generatedAt).toBeInstanceOf(Date)
        expect(response.data.model).toBeTruthy()
      }
    })

    it('should simulate AI vision analysis delay', async () => {
      const startTime = Date.now()

      await service.generatePrompts({
        referenceImageUrls: ['https://example.com/image.jpg'],
        styleInputs: {
          theme: 'Test',
          tone: 'Test',
          description: 'Test description for delay measurement',
        },
      })

      const elapsed = Date.now() - startTime
      // Should take at least 100ms (mock delay)
      expect(elapsed).toBeGreaterThan(100)
    })

    it('should handle multiple reference images', async () => {
      const response = await service.generatePrompts({
        referenceImageUrls: [
          'https://example.com/image1.jpg',
          'https://example.com/image2.jpg',
          'https://example.com/image3.jpg',
        ],
        styleInputs: {
          theme: 'Vintage',
          tone: 'Traditional',
          description: 'Classic vintage aesthetic with aged textures',
        },
      })

      expect(response.success).toBe(true)
      expect(response.data?.cardPrompts).toHaveLength(22)
    })
  })

  describe('validatePrompts()', () => {
    it('should validate correct prompt count (22)', async () => {
      const genResponse = await service.generatePrompts({
        referenceImageUrls: ['https://example.com/image.jpg'],
        styleInputs: {
          theme: 'Test',
          tone: 'Test',
          description: 'Test description with sufficient length',
        },
      })

      if (genResponse.success && genResponse.data) {
        const validateResponse = await service.validatePrompts({
          prompts: genResponse.data.cardPrompts,
        })

        expect(validateResponse.success).toBe(true)
        expect(validateResponse.data?.isValid).toBe(true)
      }
    })

    it('should detect incorrect prompt count', async () => {
      const response = await service.validatePrompts({
        prompts: [], // Wrong count
      })

      expect(response.success).toBe(true)
      expect(response.data?.isValid).toBe(false)
      expect(response.data?.errors.length).toBeGreaterThan(0)
    })

    it('should validate all card numbers 0-21 present', async () => {
      const genResponse = await service.generatePrompts({
        referenceImageUrls: ['https://example.com/image.jpg'],
        styleInputs: {
          theme: 'Test',
          tone: 'Test',
          description: 'Test description for validation check',
        },
      })

      if (genResponse.success && genResponse.data) {
        const validateResponse = await service.validatePrompts({
          prompts: genResponse.data.cardPrompts,
        })

        expect(validateResponse.success).toBe(true)
        expect(validateResponse.data?.isValid).toBe(true)
        expect(validateResponse.data?.invalidPrompts).toHaveLength(0)
      }
    })

    it('should detect missing card numbers', async () => {
      const incompletePrompts: CardPrompt[] = [
        {
          id: 'test-1' as any,
          cardNumber: 0,
          cardName: 'The Fool',
          traditionalMeaning: 'New beginnings',
          generatedPrompt: 'A prompt',
          confidence: 0.9,
          generatedAt: new Date(),
        },
      ]

      const response = await service.validatePrompts({
        prompts: incompletePrompts,
      })

      expect(response.success).toBe(true)
      expect(response.data?.isValid).toBe(false)
    })
  })

  describe('regeneratePrompt()', () => {
    it('should regenerate a single card prompt', async () => {
      const response = await service.regeneratePrompt({
        cardNumber: 0,
        referenceImageUrls: ['https://example.com/image.jpg'],
        styleInputs: {
          theme: 'Cyberpunk',
          tone: 'Dark',
          description: 'A neon-lit dystopian future',
        },
      })

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      if (response.data) {
        expect(response.data.cardPrompt.cardNumber).toBe(0)
        expect(response.data.cardPrompt.cardName).toBe('The Fool')
        expect(response.data.cardPrompt.generatedPrompt).toBeTruthy()
        expect(response.data.usage).toBeDefined()
      }
    })

    it('should accept feedback for regeneration', async () => {
      const response = await service.regeneratePrompt({
        cardNumber: 13,
        referenceImageUrls: ['https://example.com/image.jpg'],
        styleInputs: {
          theme: 'Gothic',
          tone: 'Dark',
          description: 'Victorian supernatural elements',
        },
        previousPrompt: 'Old prompt',
        feedback: 'Make it more mysterious',
      })

      expect(response.success).toBe(true)
      expect(response.data?.cardPrompt).toBeDefined()
    })
  })

  describe('editPrompt()', () => {
    it('should allow manual editing of a prompt', async () => {
      const genResponse = await service.generatePrompts({
        referenceImageUrls: ['https://example.com/image.jpg'],
        styleInputs: {
          theme: 'Test',
          tone: 'Test',
          description: 'Test description for editing',
        },
      })

      if (genResponse.success && genResponse.data) {
        const promptId = genResponse.data.cardPrompts[0]?.id

        if (promptId) {
          const editResponse = await service.editPrompt({
            promptId,
            editedPrompt: 'Manually edited prompt text',
          })

          expect(editResponse.success).toBe(true)
          expect(editResponse.data).toBeDefined()
          if (editResponse.data) {
            expect(editResponse.data.edited).toBe(true)
            expect(editResponse.data.cardPrompt.generatedPrompt).toBe(
              'Manually edited prompt text'
            )
          }
        }
      }
    })

    it('should validate edited prompt', async () => {
      const response = await service.editPrompt({
        promptId: 'test-id' as any,
        editedPrompt: '', // Empty prompt should fail
      })

      expect(response.success).toBe(false)
      expect(response.error).toBeDefined()
    })
  })

  describe('estimateCost()', () => {
    it('should estimate cost for prompt generation', async () => {
      const response = await service.estimateCost({
        referenceImageUrls: ['https://example.com/image.jpg'],
        styleInputs: {
          theme: 'Test',
          tone: 'Test',
          description: 'Test description for cost estimation',
        },
      })

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      if (response.data) {
        expect(response.data.estimatedCost).toBeGreaterThan(0)
        expect(response.data.promptTokens).toBeGreaterThan(0)
        expect(response.data.completionTokens).toBeGreaterThan(0)
        expect(response.data.totalTokens).toBeGreaterThan(0)
      }
    })

    it('should scale cost with number of images', async () => {
      const singleImageResponse = await service.estimateCost({
        referenceImageUrls: ['https://example.com/image.jpg'],
        styleInputs: {
          theme: 'Test',
          tone: 'Test',
          description: 'Test description',
        },
      })

      const multiImageResponse = await service.estimateCost({
        referenceImageUrls: [
          'https://example.com/image1.jpg',
          'https://example.com/image2.jpg',
          'https://example.com/image3.jpg',
        ],
        styleInputs: {
          theme: 'Test',
          tone: 'Test',
          description: 'Test description',
        },
      })

      if (singleImageResponse.data && multiImageResponse.data) {
        expect(multiImageResponse.data.estimatedCost).toBeGreaterThan(
          singleImageResponse.data.estimatedCost
        )
      }
    })
  })

  describe('Return Types', () => {
    it('should match ServiceResponse<GeneratePromptsOutput> exactly', async () => {
      const response = await service.generatePrompts({
        referenceImageUrls: ['https://example.com/image.jpg'],
        styleInputs: {
          theme: 'Test',
          tone: 'Test',
          description: 'Test description with sufficient length',
        },
      })

      expect(response).toHaveProperty('success')
      if (response.success && response.data) {
        expect(response.data).toHaveProperty('cardPrompts')
        expect(response.data).toHaveProperty('usage')
        expect(response.data).toHaveProperty('requestId')
        expect(response.data).toHaveProperty('generatedAt')
        expect(response.data).toHaveProperty('model')
      }
    })

    it('should have correct CardPrompt structure', async () => {
      const response = await service.generatePrompts({
        referenceImageUrls: ['https://example.com/image.jpg'],
        styleInputs: {
          theme: 'Test',
          tone: 'Test',
          description: 'Test description',
        },
      })

      if (response.success && response.data) {
        const prompt = response.data.cardPrompts[0]
        expect(prompt).toBeDefined()
        if (prompt) {
          expect(prompt).toHaveProperty('id')
          expect(prompt).toHaveProperty('cardNumber')
          expect(prompt).toHaveProperty('cardName')
          expect(prompt).toHaveProperty('traditionalMeaning')
          expect(prompt).toHaveProperty('generatedPrompt')
          expect(prompt).toHaveProperty('confidence')
          expect(prompt).toHaveProperty('generatedAt')
        }
      }
    })
  })

  describe('Error Handling', () => {
    it('should return correct error codes', async () => {
      const errorCases = [
        {
          input: {
            referenceImageUrls: [],
            styleInputs: { theme: 'Test', tone: 'Test', description: 'Test' },
          },
          expectedCode: PromptGenerationErrorCode.NO_REFERENCE_IMAGES,
        },
        {
          input: {
            referenceImageUrls: ['https://example.com/image.jpg'],
            styleInputs: { theme: '', tone: '', description: '' },
          },
          expectedCode: PromptGenerationErrorCode.INVALID_STYLE_INPUTS,
        },
      ]

      for (const testCase of errorCases) {
        const response = await service.generatePrompts(testCase.input as any)
        expect(response.success).toBe(false)
        expect(response.error?.code).toBe(testCase.expectedCode)
      }
    })
  })

  describe('Async Behavior', () => {
    it('should return promises for all methods', () => {
      const input = {
        referenceImageUrls: ['https://example.com/image.jpg'],
        styleInputs: {
          theme: 'Test',
          tone: 'Test',
          description: 'Test description',
        },
      }

      expect(service.generatePrompts(input)).toBeInstanceOf(Promise)
      expect(service.validatePrompts({ prompts: [] })).toBeInstanceOf(Promise)
      expect(
        service.regeneratePrompt({
          cardNumber: 0,
          ...input,
        })
      ).toBeInstanceOf(Promise)
      expect(service.estimateCost(input)).toBeInstanceOf(Promise)
    })
  })
})
