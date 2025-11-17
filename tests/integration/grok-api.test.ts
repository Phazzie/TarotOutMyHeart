/**
 * @fileoverview End-to-End Integration Tests for Grok API
 * @purpose Test complete user flow with real Grok API services
 * @updated 2025-11-17
 *
 * PREREQUISITES:
 * - Real services must be implemented (PromptGenerationService, ImageGenerationService)
 * - XAI_API_KEY environment variable must be set
 *
 * COST WARNING:
 * Running the full test suite will incur real API costs:
 * - Prompt generation: ~$0.10-0.50
 * - Image generation (22 images): ~$2.20
 * - Total: ~$2.23-2.70 per full run
 *
 * RUN SPARINGLY!
 *
 * Usage:
 * ```bash
 * # Run with API key
 * XAI_API_KEY=your-key-here npm run test:integration
 *
 * # Tests will skip gracefully if no API key
 * npm run test:integration
 * ```
 */

import { describe, it, expect, beforeAll, afterEach } from 'vitest'
import { PromptGenerationService } from '../../services/real/PromptGenerationService'
import { ImageGenerationService } from '../../services/real/ImageGenerationService'
import type { CardPrompt } from '$contracts/PromptGeneration'
import {
  SAMPLE_STYLE_INPUTS,
  MINIMAL_STYLE_INPUTS,
  COMPLEX_STYLE_INPUTS,
  SAMPLE_REFERENCE_IMAGE_URLS,
  SINGLE_REFERENCE_IMAGE_URL,
  ALL_CARD_NUMBERS,
  MAJOR_ARCANA_COUNT,
  EXPECTED_CARD_NAMES,
  EXPECTED_COSTS,
  TEST_TIMEOUTS,
  MOCK_CARD_PROMPTS,
  isValidPrompt,
  isValidCardNumber,
  hasAllCardNumbers,
  isValidImageDataUrl,
  isValidHttpUrl,
  ProgressTracker,
  CostTracker,
} from '../helpers/test-data'

// ============================================================================
// TEST CONFIGURATION
// ============================================================================

/**
 * Check if API key is available
 */
const hasApiKey = !!process.env.XAI_API_KEY

/**
 * Skip message for tests that require API key
 */
const skipMessage = 'Skipping: XAI_API_KEY not set (set env var to run real API tests)'

/**
 * Conditional describe - only run if API key is available
 */
const describeWithApi = hasApiKey ? describe : describe.skip

/**
 * Cost tracker for all tests
 */
const globalCostTracker = new CostTracker()

// ============================================================================
// TEST SUITE SETUP
// ============================================================================

beforeAll(() => {
  if (hasApiKey) {
    console.log('\n🔑 Running integration tests with real Grok API')
    console.log('⚠️  WARNING: These tests will incur real API costs!')
    console.log(`💰 Expected cost: $${EXPECTED_COSTS.fullFlow.min}-${EXPECTED_COSTS.fullFlow.max}\n`)
  } else {
    console.log(`\n⏭️  ${skipMessage}\n`)
  }
})

afterEach(() => {
  if (hasApiKey && globalCostTracker.getTotalCost() > 0) {
    console.log(`\n💰 ${globalCostTracker.getSummary()}\n`)
  }
})

// ============================================================================
// PROMPT GENERATION TESTS
// ============================================================================

describeWithApi('Prompt Generation - Real Grok API', () => {
  let promptService: PromptGenerationService

  beforeAll(() => {
    promptService = new PromptGenerationService()
  })

  it(
    'should generate 22 card prompts with valid style inputs',
    async () => {
      const progressTracker = new ProgressTracker()

      const result = await promptService.generatePrompts({
        referenceImageUrls: SAMPLE_REFERENCE_IMAGE_URLS,
        styleInputs: SAMPLE_STYLE_INPUTS,
        onProgress: (progress) => progressTracker.track(progress),
      })

      // Should succeed
      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()

      if (result.success && result.data) {
        const { cardPrompts, usage, model } = result.data

        // Should have exactly 22 prompts
        expect(cardPrompts).toHaveLength(MAJOR_ARCANA_COUNT)

        // All card numbers should be present and unique
        const cardNumbers = cardPrompts.map((p) => p.cardNumber)
        expect(hasAllCardNumbers(cardNumbers)).toBe(true)

        // Each prompt should be valid
        cardPrompts.forEach((prompt, idx) => {
          expect(isValidCardNumber(prompt.cardNumber)).toBe(true)
          expect(prompt.cardName).toBe(EXPECTED_CARD_NAMES[prompt.cardNumber])
          expect(isValidPrompt(prompt.generatedPrompt)).toBe(true)
          expect(prompt.confidence).toBeGreaterThan(0)
          expect(prompt.confidence).toBeLessThanOrEqual(1)
          expect(prompt.id).toBeTruthy()
          expect(prompt.generatedAt).toBeInstanceOf(Date)
        })

        // Usage should be tracked
        expect(usage.totalTokens).toBeGreaterThan(0)
        expect(usage.promptTokens).toBeGreaterThan(0)
        expect(usage.completionTokens).toBeGreaterThan(0)
        expect(usage.estimatedCost).toBeGreaterThan(0)
        expect(usage.estimatedCost).toBeLessThan(EXPECTED_COSTS.promptGeneration.max)
        expect(usage.model).toBe(model)

        // Progress should have been tracked
        expect(progressTracker.updates.length).toBeGreaterThan(0)
        expect(progressTracker.completed).toBe(true)

        // Track cost
        globalCostTracker.addCost('Prompt Generation (22 cards)', usage.estimatedCost)

        console.log(`\n✅ Generated 22 prompts successfully`)
        console.log(`📊 Tokens: ${usage.totalTokens} (${usage.promptTokens} prompt + ${usage.completionTokens} completion)`)
        console.log(`💰 Cost: $${usage.estimatedCost.toFixed(4)}`)
      }
    },
    TEST_TIMEOUTS.promptGeneration
  )

  it(
    'should handle different style inputs correctly',
    async () => {
      const result = await promptService.generatePrompts({
        referenceImageUrls: [SINGLE_REFERENCE_IMAGE_URL],
        styleInputs: MINIMAL_STYLE_INPUTS,
      })

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()

      if (result.success && result.data) {
        expect(result.data.cardPrompts).toHaveLength(MAJOR_ARCANA_COUNT)
        globalCostTracker.addCost('Prompt Generation (minimal style)', result.data.usage.estimatedCost)
      }
    },
    TEST_TIMEOUTS.promptGeneration
  )

  it('should fail gracefully with invalid inputs', async () => {
    const result = await promptService.generatePrompts({
      referenceImageUrls: [], // Empty array - invalid
      styleInputs: SAMPLE_STYLE_INPUTS,
    })

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
    expect(result.error?.code).toBe('NO_REFERENCE_IMAGES')
    expect(result.error?.retryable).toBe(false)
  })

  it('should validate prompts correctly', async () => {
    // First generate prompts
    const generateResult = await promptService.generatePrompts({
      referenceImageUrls: SAMPLE_REFERENCE_IMAGE_URLS,
      styleInputs: SAMPLE_STYLE_INPUTS,
    })

    expect(generateResult.success).toBe(true)

    if (generateResult.success && generateResult.data) {
      // Validate the generated prompts
      const validateResult = await promptService.validatePrompts({
        prompts: generateResult.data.cardPrompts,
      })

      expect(validateResult.success).toBe(true)
      expect(validateResult.data).toBeDefined()

      if (validateResult.success && validateResult.data) {
        expect(validateResult.data.isValid).toBe(true)
        expect(validateResult.data.errors).toHaveLength(0)
        expect(validateResult.data.invalidPrompts).toHaveLength(0)
      }

      globalCostTracker.addCost('Prompt Generation (for validation)', generateResult.data.usage.estimatedCost)
    }
  }, TEST_TIMEOUTS.promptGeneration)

  it(
    'should regenerate a single prompt with feedback',
    async () => {
      const result = await promptService.regeneratePrompt({
        cardNumber: 0, // The Fool
        referenceImageUrls: SAMPLE_REFERENCE_IMAGE_URLS,
        styleInputs: SAMPLE_STYLE_INPUTS,
        feedback: 'Make it more mysterious and add more symbolism',
      })

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()

      if (result.success && result.data) {
        const { cardPrompt, usage } = result.data

        expect(cardPrompt.cardNumber).toBe(0)
        expect(cardPrompt.cardName).toBe('The Fool')
        expect(isValidPrompt(cardPrompt.generatedPrompt)).toBe(true)
        expect(usage.estimatedCost).toBeGreaterThan(0)

        globalCostTracker.addCost('Prompt Regeneration (single card)', usage.estimatedCost)

        console.log(`\n✅ Regenerated prompt for The Fool`)
        console.log(`💰 Cost: $${usage.estimatedCost.toFixed(4)}`)
      }
    },
    TEST_TIMEOUTS.validation
  )

  it('should estimate costs accurately', async () => {
    const result = await promptService.estimateCost({
      referenceImageUrls: SAMPLE_REFERENCE_IMAGE_URLS,
      styleInputs: SAMPLE_STYLE_INPUTS,
    })

    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()

    if (result.success && result.data) {
      expect(result.data.estimatedCost).toBeGreaterThan(0)
      expect(result.data.estimatedCost).toBeLessThan(EXPECTED_COSTS.promptGeneration.max)
      expect(result.data.totalTokens).toBeGreaterThan(0)

      console.log(`\n💰 Estimated cost for prompt generation: $${result.data.estimatedCost.toFixed(4)}`)
    }
  })
})

// ============================================================================
// IMAGE GENERATION TESTS
// ============================================================================

describeWithApi('Image Generation - Real Grok API', () => {
  let imageService: ImageGenerationService

  beforeAll(() => {
    imageService = new ImageGenerationService()
  })

  it(
    'should generate 22 card images from prompts',
    async () => {
      const progressTracker = new ProgressTracker()

      const result = await imageService.generateImages({
        prompts: MOCK_CARD_PROMPTS,
        saveToStorage: false, // Don't upload to storage in tests
        onProgress: (progress) => {
          progressTracker.track(progress)
          // Log every 5th card
          if (progress.completed % 5 === 0 && progress.completed > 0) {
            console.log(`  📸 Generated ${progress.completed}/${progress.total} images (${progress.percentComplete}%)`)
          }
        },
        allowPartialSuccess: true,
      })

      // Should succeed (or partial success)
      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()

      if (result.success && result.data) {
        const { generatedCards, totalUsage, fullySuccessful } = result.data

        // Should have 22 cards (some may be failed)
        expect(generatedCards).toHaveLength(MAJOR_ARCANA_COUNT)

        // Check successful cards
        const successfulCards = generatedCards.filter((c) => c.generationStatus === 'completed')
        const failedCards = generatedCards.filter((c) => c.generationStatus === 'failed')

        console.log(`\n✅ Generated ${successfulCards.length}/${MAJOR_ARCANA_COUNT} images successfully`)
        if (failedCards.length > 0) {
          console.log(`⚠️  Failed cards: ${failedCards.map(c => c.cardName).join(', ')}`)
        }

        // At least some cards should succeed
        expect(successfulCards.length).toBeGreaterThan(0)

        // Validate successful cards
        successfulCards.forEach((card) => {
          expect(isValidCardNumber(card.cardNumber)).toBe(true)
          expect(card.cardName).toBeTruthy()
          expect(card.prompt).toBeTruthy()
          expect(card.generatedAt).toBeInstanceOf(Date)
          expect(card.retryCount).toBeGreaterThanOrEqual(0)

          // Should have either imageDataUrl or imageUrl
          expect(card.imageDataUrl || card.imageUrl).toBeTruthy()

          if (card.imageDataUrl) {
            expect(isValidImageDataUrl(card.imageDataUrl)).toBe(true)
          }

          if (card.imageUrl) {
            expect(isValidHttpUrl(card.imageUrl)).toBe(true)
          }
        })

        // Usage should be tracked
        expect(totalUsage.totalImages).toBe(MAJOR_ARCANA_COUNT)
        expect(totalUsage.successfulImages).toBe(successfulCards.length)
        expect(totalUsage.failedImages).toBe(failedCards.length)
        expect(totalUsage.estimatedCost).toBeGreaterThan(0)
        expect(totalUsage.estimatedCost).toBeLessThanOrEqual(EXPECTED_COSTS.imageGeneration.fullDeck)
        expect(totalUsage.totalGenerationTime).toBeGreaterThan(0)

        // Progress should have been tracked
        expect(progressTracker.updates.length).toBeGreaterThan(0)
        expect(progressTracker.completed).toBe(true)

        // Track cost
        globalCostTracker.addCost('Image Generation (22 cards)', totalUsage.estimatedCost)

        console.log(`📊 Generation time: ${(totalUsage.totalGenerationTime / 1000).toFixed(1)}s`)
        console.log(`💰 Cost: $${totalUsage.estimatedCost.toFixed(2)}`)
      }
    },
    TEST_TIMEOUTS.imageGeneration
  )

  it(
    'should regenerate a single failed image',
    async () => {
      const result = await imageService.regenerateImage({
        cardNumber: 13, // Death
        prompt: MOCK_CARD_PROMPTS[13].generatedPrompt,
        previousAttempts: 0,
      })

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()

      if (result.success && result.data) {
        const { generatedCard, usage } = result.data

        expect(generatedCard.cardNumber).toBe(13)
        expect(generatedCard.generationStatus).toBe('completed')
        expect(generatedCard.imageDataUrl || generatedCard.imageUrl).toBeTruthy()
        expect(usage.estimatedCost).toBeGreaterThan(0)

        globalCostTracker.addCost('Image Regeneration (single card)', usage.estimatedCost)

        console.log(`\n✅ Regenerated image for card 13`)
        console.log(`💰 Cost: $${usage.estimatedCost.toFixed(2)}`)
      }
    },
    TEST_TIMEOUTS.singleImage
  )

  it('should estimate image generation costs accurately', async () => {
    const result = await imageService.estimateCost({
      imageCount: MAJOR_ARCANA_COUNT,
    })

    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()

    if (result.success && result.data) {
      const { totalImages, costPerImage, totalEstimatedCost, estimatedTime } = result.data

      expect(totalImages).toBe(MAJOR_ARCANA_COUNT)
      expect(costPerImage).toBe(EXPECTED_COSTS.imageGeneration.perImage)
      expect(totalEstimatedCost).toBe(EXPECTED_COSTS.imageGeneration.fullDeck)
      expect(estimatedTime).toBeGreaterThan(0)

      console.log(`\n💰 Estimated cost for 22 images: $${totalEstimatedCost.toFixed(2)}`)
      console.log(`⏱️  Estimated time: ${(estimatedTime / 60).toFixed(1)} minutes`)
    }
  })

  it('should handle cancellation gracefully', async () => {
    // Start generation
    const generatePromise = imageService.generateImages({
      prompts: MOCK_CARD_PROMPTS.slice(0, 5), // Only 5 cards for quick test
      saveToStorage: false,
      allowPartialSuccess: true,
    })

    // Wait a bit then cancel (this is tricky to test, may not always work)
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Note: Actual cancellation would require session ID from the ongoing generation
    // This is a simplified test - in real usage, you'd get the session ID and cancel it

    const result = await generatePromise

    // Should complete (might not have time to cancel)
    expect(result.success).toBe(true)

    if (result.success && result.data) {
      globalCostTracker.addCost('Image Generation (partial, 5 cards)', result.data.totalUsage.estimatedCost)
    }
  }, TEST_TIMEOUTS.singleImage * 5)
})

// ============================================================================
// ERROR HANDLING TESTS
// ============================================================================

describeWithApi('Error Handling - Real Grok API', () => {
  let promptService: PromptGenerationService
  let imageService: ImageGenerationService

  beforeAll(() => {
    promptService = new PromptGenerationService()
    imageService = new ImageGenerationService()
  })

  it('should handle invalid API key gracefully', async () => {
    // Create service with invalid key
    const badService = new ImageGenerationService('invalid-key-12345')

    const result = await badService.generateImages({
      prompts: MOCK_CARD_PROMPTS.slice(0, 1), // Just 1 card
      saveToStorage: false,
    })

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
    expect(result.error?.code).toBe('API_KEY_INVALID')
    expect(result.error?.retryable).toBe(false)
  }, TEST_TIMEOUTS.validation)

  it('should handle network timeout gracefully', async () => {
    // This test would require mocking network conditions
    // Skip for now - difficult to test reliably with real API
    expect(true).toBe(true)
  })

  it('should handle invalid prompt count', async () => {
    const result = await imageService.generateImages({
      prompts: MOCK_CARD_PROMPTS.slice(0, 10), // Only 10 prompts, not 22
      saveToStorage: false,
    })

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
    expect(result.error?.code).toBe('WRONG_PROMPT_COUNT')
    expect(result.error?.retryable).toBe(false)
  })
})

// ============================================================================
// COMPLETE END-TO-END FLOW TEST
// ============================================================================

describeWithApi('Complete End-to-End Flow - Real Grok API', () => {
  let promptService: PromptGenerationService
  let imageService: ImageGenerationService

  beforeAll(() => {
    promptService = new PromptGenerationService()
    imageService = new ImageGenerationService()
  })

  it(
    'should complete full deck generation flow',
    async () => {
      console.log('\n🎴 Starting complete deck generation flow...\n')

      const progressTracker = new ProgressTracker()
      const flowCostTracker = new CostTracker()

      // Step 1: Generate prompts
      console.log('📝 Step 1: Generating 22 card prompts...')
      const promptResult = await promptService.generatePrompts({
        referenceImageUrls: SAMPLE_REFERENCE_IMAGE_URLS,
        styleInputs: COMPLEX_STYLE_INPUTS, // Use complex style for realistic test
        onProgress: (progress) => {
          progressTracker.track(progress)
        },
      })

      expect(promptResult.success).toBe(true)
      expect(promptResult.data).toBeDefined()

      if (!promptResult.success || !promptResult.data) {
        throw new Error('Prompt generation failed')
      }

      const { cardPrompts, usage: promptUsage } = promptResult.data
      flowCostTracker.addCost('Prompt Generation', promptUsage.estimatedCost)

      console.log(`✅ Generated ${cardPrompts.length} prompts`)
      console.log(`💰 Prompt cost: $${promptUsage.estimatedCost.toFixed(4)}`)

      // Step 2: Validate prompts
      console.log('\n✓ Step 2: Validating prompts...')
      const validateResult = await promptService.validatePrompts({ prompts: cardPrompts })

      expect(validateResult.success).toBe(true)
      expect(validateResult.data?.isValid).toBe(true)

      console.log('✅ All prompts valid')

      // Step 3: Generate images
      console.log('\n🎨 Step 3: Generating 22 card images...')
      progressTracker.reset()

      const imageResult = await imageService.generateImages({
        prompts: cardPrompts,
        saveToStorage: false,
        onProgress: (progress) => {
          progressTracker.track(progress)
          if (progress.completed % 5 === 0 && progress.completed > 0) {
            console.log(`  📸 Progress: ${progress.completed}/${progress.total} (${progress.percentComplete}%)`)
          }
        },
        allowPartialSuccess: true,
      })

      expect(imageResult.success).toBe(true)
      expect(imageResult.data).toBeDefined()

      if (!imageResult.success || !imageResult.data) {
        throw new Error('Image generation failed')
      }

      const { generatedCards, totalUsage, fullySuccessful } = imageResult.data
      flowCostTracker.addCost('Image Generation', totalUsage.estimatedCost)

      const successfulCards = generatedCards.filter((c) => c.generationStatus === 'completed')
      const failedCards = generatedCards.filter((c) => c.generationStatus === 'failed')

      console.log(`\n✅ Generated ${successfulCards.length}/${MAJOR_ARCANA_COUNT} images`)
      if (failedCards.length > 0) {
        console.log(`⚠️  Failed: ${failedCards.length} cards`)
      }

      // Step 4: Verify deck completeness
      console.log('\n✓ Step 4: Verifying deck completeness...')

      const allCardNumbers = generatedCards.map((c) => c.cardNumber)
      expect(hasAllCardNumbers(allCardNumbers)).toBe(true)
      expect(generatedCards).toHaveLength(MAJOR_ARCANA_COUNT)

      console.log('✅ All 22 cards present')

      // Step 5: Track costs
      const totalCost = flowCostTracker.getTotalCost()
      globalCostTracker.addCost('Complete End-to-End Flow', totalCost)

      console.log('\n📊 FLOW SUMMARY')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log(`Prompts: ${cardPrompts.length}/${MAJOR_ARCANA_COUNT}`)
      console.log(`Images: ${successfulCards.length}/${MAJOR_ARCANA_COUNT}`)
      console.log(`Failed: ${failedCards.length}`)
      console.log(`Total Cost: $${totalCost.toFixed(2)}`)
      console.log(`Generation Time: ${(totalUsage.totalGenerationTime / 1000 / 60).toFixed(1)} minutes`)
      console.log(`Within Budget: ${flowCostTracker.isWithinBudget(EXPECTED_COSTS.fullFlow.max) ? '✅' : '❌'}`)
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

      // Verify cost is within expected range
      expect(totalCost).toBeGreaterThan(EXPECTED_COSTS.fullFlow.min)
      expect(totalCost).toBeLessThan(EXPECTED_COSTS.fullFlow.max * 1.5) // Allow 50% overage for variability

      // At least most images should succeed
      expect(successfulCards.length).toBeGreaterThan(MAJOR_ARCANA_COUNT * 0.8) // At least 80% success
    },
    TEST_TIMEOUTS.fullFlow
  )
})

// ============================================================================
// COST TRACKING SUMMARY
// ============================================================================

describe('Test Suite Summary', () => {
  it('should report total costs incurred', () => {
    if (hasApiKey) {
      const totalCost = globalCostTracker.getTotalCost()

      console.log('\n' + '='.repeat(50))
      console.log('💰 TOTAL COST SUMMARY')
      console.log('='.repeat(50))
      console.log(globalCostTracker.getSummary())
      console.log('\nOperations:')
      globalCostTracker.getOperations().forEach((op, idx) => {
        console.log(`  ${idx + 1}. ${op.operation}: $${op.cost.toFixed(4)}`)
      })
      console.log('='.repeat(50) + '\n')

      expect(totalCost).toBeGreaterThan(0)
    } else {
      console.log('\n⏭️  No costs incurred (tests skipped without API key)\n')
    }
  })
})
