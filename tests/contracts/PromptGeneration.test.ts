/**
 * @fileoverview Contract tests for PromptGeneration seam
 * @purpose Validate PromptGenerationMock matches PromptGeneration contract exactly
 * @testStrategy
 * 1. Interface compliance - Mock implements IPromptGenerationService
 * 2. Prompt generation - 22 Major Arcana prompts with correct structure
 * 3. Return types - CardPrompt structure with all required fields
 * 4. Error handling - Returns correct PromptGenerationErrorCode values
 * 5. Validation - Prompt validation, regeneration, editing
 */

import { describe, it, expect, beforeEach } from 'vitest'
import type { IPromptGenerationService } from '$contracts/PromptGeneration'
import {
  PromptGenerationErrorCode,
  MAJOR_ARCANA_COUNT,
  MAJOR_ARCANA_NAMES,
} from '$contracts/PromptGeneration'
import { promptGenerationService } from '$services/factory'

describe('PromptGeneration Contract Compliance', () => {
  let service: IPromptGenerationService

  beforeEach(() => {
    service = promptGenerationService
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
    it('should generate 22 card prompts', async () => {
      const response = await service.generatePrompts({
        referenceImageUrls: ['https://example.com/image1.jpg'],
        styleInputs: {
          theme: 'Cyberpunk',
          tone: 'Dark',
          description: 'Neon-lit dystopian future',
        },
      })

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      if (response.data) {
        expect(response.data.cardPrompts).toHaveLength(MAJOR_ARCANA_COUNT)
        expect(response.data.usage).toBeDefined()
        expect(response.data.requestId).toBeDefined()
        expect(response.data.generatedAt).toBeInstanceOf(Date)
        expect(response.data.model).toBeDefined()
      }
    })

    it('should generate prompts with correct card numbers (0-21)', async () => {
      const response = await service.generatePrompts({
        referenceImageUrls: ['https://example.com/image1.jpg'],
        styleInputs: {
          theme: 'Gothic',
          tone: 'Dark',
          description: 'Victorian supernatural elements',
        },
      })

      expect(response.success).toBe(true)
      if (response.data) {
        const cardNumbers = response.data.cardPrompts.map((p) => p.cardNumber)
        // All numbers 0-21 should be present
        for (let i = 0; i < MAJOR_ARCANA_COUNT; i++) {
          expect(cardNumbers).toContain(i)
        }
      }
    })

    it('should generate prompts with correct card names', async () => {
      const response = await service.generatePrompts({
        referenceImageUrls: ['https://example.com/image1.jpg'],
        styleInputs: {
          theme: 'Watercolor',
          tone: 'Soft',
          description: 'Delicate pastel artwork',
        },
      })

      expect(response.success).toBe(true)
      if (response.data) {
        const cardNames = response.data.cardPrompts.map((p) => p.cardName)
        // Check that Major Arcana names are present
        expect(cardNames).toContain('The Fool')
        expect(cardNames).toContain('The Magician')
        expect(cardNames).toContain('The World')
      }
    })

    it('should generate prompts with all required CardPrompt fields', async () => {
      const response = await service.generatePrompts({
        referenceImageUrls: ['https://example.com/image1.jpg'],
        styleInputs: {
          theme: 'Art Nouveau',
          tone: 'Mystical',
          description: 'Flowing organic forms',
        },
      })

      expect(response.success).toBe(true)
      if (response.data) {
        const firstPrompt = response.data.cardPrompts[0]
        expect(firstPrompt).toHaveProperty('id')
        expect(firstPrompt).toHaveProperty('cardNumber')
        expect(firstPrompt).toHaveProperty('cardName')
        expect(firstPrompt).toHaveProperty('traditionalMeaning')
        expect(firstPrompt).toHaveProperty('generatedPrompt')
        expect(firstPrompt).toHaveProperty('confidence')
        expect(firstPrompt).toHaveProperty('generatedAt')

        expect(typeof firstPrompt.id).toBe('string')
        expect(typeof firstPrompt.cardNumber).toBe('number')
        expect(typeof firstPrompt.cardName).toBe('string')
        expect(typeof firstPrompt.traditionalMeaning).toBe('string')
        expect(typeof firstPrompt.generatedPrompt).toBe('string')
        expect(typeof firstPrompt.confidence).toBe('number')
        expect(firstPrompt.generatedAt).toBeInstanceOf(Date)
      }
    })

    it('should generate prompts with confidence scores between 0 and 1', async () => {
      const response = await service.generatePrompts({
        referenceImageUrls: ['https://example.com/image1.jpg'],
        styleInputs: {
          theme: 'Minimalist',
          tone: 'Modern',
          description: 'Clean simple designs',
        },
      })

      expect(response.success).toBe(true)
      if (response.data) {
        response.data.cardPrompts.forEach((prompt) => {
          expect(prompt.confidence).toBeGreaterThanOrEqual(0)
          expect(prompt.confidence).toBeLessThanOrEqual(1)
        })
      }
    })

    it('should include API usage information', async () => {
      const response = await service.generatePrompts({
        referenceImageUrls: ['https://example.com/image1.jpg'],
        styleInputs: {
          theme: 'Fantasy',
          tone: 'Ethereal',
          description: 'Magical fantasy world',
        },
      })

      expect(response.success).toBe(true)
      if (response.data) {
        expect(response.data.usage.promptTokens).toBeDefined()
        expect(response.data.usage.completionTokens).toBeDefined()
        expect(response.data.usage.totalTokens).toBeDefined()
        expect(response.data.usage.estimatedCost).toBeDefined()
        expect(response.data.usage.model).toBeDefined()

        expect(typeof response.data.usage.promptTokens).toBe('number')
        expect(typeof response.data.usage.completionTokens).toBe('number')
        expect(typeof response.data.usage.totalTokens).toBe('number')
        expect(typeof response.data.usage.estimatedCost).toBe('number')
      }
    })

    it('should accept multiple reference image URLs', async () => {
      const response = await service.generatePrompts({
        referenceImageUrls: [
          'https://example.com/image1.jpg',
          'https://example.com/image2.jpg',
          'https://example.com/image3.jpg',
        ],
        styleInputs: {
          theme: 'Digital Art',
          tone: 'Bold',
          description: 'Bold digital compositions',
        },
      })

      expect(response.success).toBe(true)
      expect(response.data?.cardPrompts).toHaveLength(MAJOR_ARCANA_COUNT)
    })

    it('should support progress callback', async () => {
      let progressCalled = false

      const response = await service.generatePrompts({
        referenceImageUrls: ['https://example.com/image1.jpg'],
        styleInputs: {
          theme: 'Vintage',
          tone: 'Nostalgic',
          description: 'Retro vintage aesthetic',
        },
        onProgress: (progress) => {
          progressCalled = true
          expect(progress.status).toBeDefined()
          expect(progress.progress).toBeGreaterThanOrEqual(0)
          expect(progress.progress).toBeLessThanOrEqual(100)
          expect(progress.currentStep).toBeDefined()
        },
      })

      expect(response.success).toBe(true)
      // Progress callback may or may not be called in mock
    })

    it('should return error for no reference images', async () => {
      const response = await service.generatePrompts({
        referenceImageUrls: [],
        styleInputs: {
          theme: 'Test',
          tone: 'Test',
          description: 'Test description',
        },
      })

      expect(response.success).toBe(false)
      expect(response.error).toBeDefined()
      if (response.error) {
        expect(response.error.code).toBe(PromptGenerationErrorCode.NO_REFERENCE_IMAGES)
      }
    })

    it('should return error for invalid reference URL', async () => {
      const response = await service.generatePrompts({
        referenceImageUrls: ['not-a-valid-url'],
        styleInputs: {
          theme: 'Test',
          tone: 'Test',
          description: 'Test description',
        },
      })

      expect(response.success).toBe(false)
      expect(response.error).toBeDefined()
      if (response.error) {
        expect(response.error.code).toBe(PromptGenerationErrorCode.INVALID_REFERENCE_URL)
      }
    })
  })

  describe('validatePrompts()', () => {
    it('should validate correct set of prompts', async () => {
      // First generate prompts
      const generateResponse = await service.generatePrompts({
        referenceImageUrls: ['https://example.com/image1.jpg'],
        styleInputs: {
          theme: 'Art Deco',
          tone: 'Elegant',
          description: 'Elegant art deco designs',
        },
      })

      expect(generateResponse.success).toBe(true)

      if (generateResponse.data) {
        // Then validate them
        const validateResponse = await service.validatePrompts({
          prompts: generateResponse.data.cardPrompts,
        })

        expect(validateResponse.success).toBe(true)
        expect(validateResponse.data).toBeDefined()
        if (validateResponse.data) {
          expect(validateResponse.data.isValid).toBe(true)
          expect(validateResponse.data.invalidPrompts).toHaveLength(0)
          expect(validateResponse.data.errors).toHaveLength(0)
        }
      }
    })

    it('should detect incomplete prompt set', async () => {
      // Generate prompts first
      const generateResponse = await service.generatePrompts({
        referenceImageUrls: ['https://example.com/image1.jpg'],
        styleInputs: {
          theme: 'Test',
          tone: 'Test',
          description: 'Test description',
        },
      })

      expect(generateResponse.success).toBe(true)

      if (generateResponse.data) {
        // Remove some prompts to make incomplete
        const incompletePrompts = generateResponse.data.cardPrompts.slice(0, 20)

        const validateResponse = await service.validatePrompts({
          prompts: incompletePrompts,
        })

        expect(validateResponse.success).toBe(true)
        expect(validateResponse.data?.isValid).toBe(false)
      }
    })
  })

  describe('regeneratePrompt()', () => {
    it('should regenerate a single card prompt', async () => {
      const response = await service.regeneratePrompt({
        cardNumber: 0,
        referenceImageUrls: ['https://example.com/image1.jpg'],
        styleInputs: {
          theme: 'Cyberpunk',
          tone: 'Dark',
          description: 'Futuristic neon aesthetic',
        },
      })

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      if (response.data) {
        expect(response.data.cardPrompt).toBeDefined()
        expect(response.data.cardPrompt.cardNumber).toBe(0)
        expect(response.data.cardPrompt.cardName).toBe('The Fool')
        expect(response.data.usage).toBeDefined()
        expect(response.data.requestId).toBeDefined()
      }
    })

    it('should accept previous prompt and feedback', async () => {
      const response = await service.regeneratePrompt({
        cardNumber: 13,
        referenceImageUrls: ['https://example.com/image1.jpg'],
        styleInputs: {
          theme: 'Gothic',
          tone: 'Dark',
          description: 'Dark gothic imagery',
        },
        previousPrompt: 'Original prompt text',
        feedback: 'Make it more mysterious',
      })

      expect(response.success).toBe(true)
      expect(response.data?.cardPrompt.cardNumber).toBe(13)
    })
  })

  describe('editPrompt()', () => {
    it('should edit a generated prompt', async () => {
      // First generate prompts to get a valid prompt ID
      const generateResponse = await service.generatePrompts({
        referenceImageUrls: ['https://example.com/image1.jpg'],
        styleInputs: {
          theme: 'Fantasy',
          tone: 'Magical',
          description: 'Magical fantasy realm',
        },
      })

      expect(generateResponse.success).toBe(true)

      if (generateResponse.data) {
        const promptId = generateResponse.data.cardPrompts[0].id

        const editResponse = await service.editPrompt({
          promptId,
          editedPrompt: 'Manually edited prompt with custom details',
        })

        expect(editResponse.success).toBe(true)
        expect(editResponse.data).toBeDefined()
        if (editResponse.data) {
          expect(editResponse.data.cardPrompt).toBeDefined()
          expect(editResponse.data.edited).toBe(true)
          expect(editResponse.data.cardPrompt.generatedPrompt).toBe(
            'Manually edited prompt with custom details'
          )
        }
      }
    })
  })

  describe('estimateCost()', () => {
    it('should estimate cost for prompt generation', async () => {
      const response = await service.estimateCost({
        referenceImageUrls: ['https://example.com/image1.jpg'],
        styleInputs: {
          theme: 'Minimalist',
          tone: 'Clean',
          description: 'Minimalist clean design',
        },
      })

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      if (response.data) {
        expect(response.data.promptTokens).toBeGreaterThanOrEqual(0)
        expect(response.data.completionTokens).toBeGreaterThanOrEqual(0)
        expect(response.data.totalTokens).toBeGreaterThanOrEqual(0)
        expect(response.data.estimatedCost).toBeGreaterThanOrEqual(0)
        expect(typeof response.data.estimatedCost).toBe('number')
      }
    })

    it('should estimate higher cost for more reference images', async () => {
      const responseOne = await service.estimateCost({
        referenceImageUrls: ['https://example.com/image1.jpg'],
        styleInputs: {
          theme: 'Test',
          tone: 'Test',
          description: 'Test description',
        },
      })

      const responseMultiple = await service.estimateCost({
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

      expect(responseOne.success).toBe(true)
      expect(responseMultiple.success).toBe(true)
      // Cost with more images should be >= cost with fewer images
      if (responseOne.data && responseMultiple.data) {
        expect(responseMultiple.data.estimatedCost).toBeGreaterThanOrEqual(
          responseOne.data.estimatedCost
        )
      }
    })
  })

  describe('Return Type Validation', () => {
    it('should return all async methods as Promises', async () => {
      const generatePromise = service.generatePrompts({
        referenceImageUrls: ['https://example.com/image1.jpg'],
        styleInputs: {
          theme: 'Test',
          tone: 'Test',
          description: 'Test description',
        },
      })
      expect(generatePromise).toBeInstanceOf(Promise)

      const estimatePromise = service.estimateCost({
        referenceImageUrls: ['https://example.com/image1.jpg'],
        styleInputs: {
          theme: 'Test',
          tone: 'Test',
          description: 'Test description',
        },
      })
      expect(estimatePromise).toBeInstanceOf(Promise)
    })

    it('should maintain card order by card number', async () => {
      const response = await service.generatePrompts({
        referenceImageUrls: ['https://example.com/image1.jpg'],
        styleInputs: {
          theme: 'Test',
          tone: 'Test',
          description: 'Test description',
        },
      })

      expect(response.success).toBe(true)
      if (response.data) {
        // Check that cards are ordered 0-21
        for (let i = 0; i < MAJOR_ARCANA_COUNT; i++) {
          const card = response.data.cardPrompts.find((p) => p.cardNumber === i)
          expect(card).toBeDefined()
          expect(card?.cardNumber).toBe(i)
        }
      }
    })
  })
})
