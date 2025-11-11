/**
 * @fileoverview Contract tests for CostCalculation seam
 * @purpose Validate CostCalculationMock matches CostCalculation contract exactly
 * @testStrategy
 * 1. Interface compliance - Mock implements ICostCalculationService
 * 2. Cost calculation - Text, image, vision API costs with breakdowns
 * 3. Return types - CostSummary, CostEstimate structures with USD formatting
 * 4. Error handling - Returns correct CostCalculationErrorCode values
 * 5. Validation - Cost thresholds, warnings, formatting
 */

import { describe, it, expect, beforeEach } from 'vitest'
import type { ICostCalculationService } from '$contracts/CostCalculation'
import { CostCalculationErrorCode, COST_THRESHOLDS } from '$contracts/CostCalculation'
import { costCalculationService } from '$services/factory'
import { promptGenerationService } from '$services/factory'
import { imageGenerationService } from '$services/factory'

describe('CostCalculation Contract Compliance', () => {
  let service: ICostCalculationService

  beforeEach(() => {
    service = costCalculationService
  })

  describe('Interface Implementation', () => {
    it('should implement ICostCalculationService interface', () => {
      expect(service).toBeDefined()
      expect(service.calculateTotalCost).toBeDefined()
      expect(typeof service.calculateTotalCost).toBe('function')
      expect(service.estimateCost).toBeDefined()
      expect(typeof service.estimateCost).toBe('function')
      expect(service.formatCost).toBeDefined()
      expect(typeof service.formatCost).toBe('function')
    })
  })

  describe('calculateTotalCost()', () => {
    it('should calculate total cost from usage data', async () => {
      // Generate prompts to get real usage data
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
        // Generate images to get image usage data
        const imageResponse = await imageGenerationService.generateImages({
          prompts: promptResponse.data.cardPrompts,
        })

        expect(imageResponse.success).toBe(true)

        if (imageResponse.data) {
          const response = await service.calculateTotalCost({
            promptUsage: promptResponse.data.usage,
            imageUsage: imageResponse.data.totalUsage,
          })

          expect(response.success).toBe(true)
          expect(response.data).toBeDefined()
          if (response.data) {
            expect(response.data.summary).toBeDefined()
            expect(response.data.summary.totalCost).toBeGreaterThanOrEqual(0)
            expect(typeof response.data.exceeded).toBe('boolean')
            expect(typeof response.data.canProceed).toBe('boolean')
          }
        }
      }
    })

    it('should include text cost breakdown', async () => {
      const promptResponse = await promptGenerationService.generatePrompts({
        referenceImageUrls: ['https://example.com/image1.jpg'],
        styleInputs: {
          theme: 'Gothic',
          tone: 'Dark',
          description: 'Victorian supernatural',
        },
      })

      if (promptResponse.success && promptResponse.data) {
        const imageResponse = await imageGenerationService.generateImages({
          prompts: promptResponse.data.cardPrompts,
        })

        if (imageResponse.success && imageResponse.data) {
          const response = await service.calculateTotalCost({
            promptUsage: promptResponse.data.usage,
            imageUsage: imageResponse.data.totalUsage,
          })

          expect(response.success).toBe(true)
          if (response.data) {
            expect(response.data.summary.textCost).toBeDefined()
            expect(response.data.summary.textCost.inputTokens).toBeGreaterThanOrEqual(0)
            expect(response.data.summary.textCost.outputTokens).toBeGreaterThanOrEqual(0)
            expect(response.data.summary.textCost.inputCost).toBeGreaterThanOrEqual(0)
            expect(response.data.summary.textCost.outputCost).toBeGreaterThanOrEqual(0)
            expect(response.data.summary.textCost.totalCost).toBeGreaterThanOrEqual(0)
          }
        }
      }
    })

    it('should include image cost breakdown', async () => {
      const promptResponse = await promptGenerationService.generatePrompts({
        referenceImageUrls: ['https://example.com/image1.jpg'],
        styleInputs: {
          theme: 'Watercolor',
          tone: 'Soft',
          description: 'Delicate watercolor art',
        },
      })

      if (promptResponse.success && promptResponse.data) {
        const imageResponse = await imageGenerationService.generateImages({
          prompts: promptResponse.data.cardPrompts,
        })

        if (imageResponse.success && imageResponse.data) {
          const response = await service.calculateTotalCost({
            promptUsage: promptResponse.data.usage,
            imageUsage: imageResponse.data.totalUsage,
          })

          expect(response.success).toBe(true)
          if (response.data) {
            expect(response.data.summary.imageCost).toBeDefined()
            expect(response.data.summary.imageCost.imagesGenerated).toBe(22)
            expect(response.data.summary.imageCost.imagesFailed).toBeGreaterThanOrEqual(0)
            expect(response.data.summary.imageCost.imagesRetried).toBeGreaterThanOrEqual(0)
            expect(response.data.summary.imageCost.generationCost).toBeGreaterThan(0)
            expect(response.data.summary.imageCost.totalCost).toBeGreaterThan(0)
          }
        }
      }
    })

    it('should include vision cost breakdown', async () => {
      const promptResponse = await promptGenerationService.generatePrompts({
        referenceImageUrls: ['https://example.com/image1.jpg'],
        styleInputs: {
          theme: 'Art Nouveau',
          tone: 'Elegant',
          description: 'Flowing organic forms',
        },
      })

      if (promptResponse.success && promptResponse.data) {
        const imageResponse = await imageGenerationService.generateImages({
          prompts: promptResponse.data.cardPrompts,
        })

        if (imageResponse.success && imageResponse.data) {
          const response = await service.calculateTotalCost({
            promptUsage: promptResponse.data.usage,
            imageUsage: imageResponse.data.totalUsage,
          })

          expect(response.success).toBe(true)
          if (response.data) {
            expect(response.data.summary.visionCost).toBeDefined()
            expect(response.data.summary.visionCost.requestCount).toBeGreaterThanOrEqual(0)
            expect(response.data.summary.visionCost.requestCost).toBeGreaterThanOrEqual(0)
            expect(response.data.summary.visionCost.totalCost).toBeGreaterThanOrEqual(0)
          }
        }
      }
    })

    it('should determine warning level correctly', async () => {
      const promptResponse = await promptGenerationService.generatePrompts({
        referenceImageUrls: ['https://example.com/image1.jpg'],
        styleInputs: {
          theme: 'Fantasy',
          tone: 'Magical',
          description: 'Magical fantasy realm',
        },
      })

      if (promptResponse.success && promptResponse.data) {
        const imageResponse = await imageGenerationService.generateImages({
          prompts: promptResponse.data.cardPrompts,
        })

        if (imageResponse.success && imageResponse.data) {
          const response = await service.calculateTotalCost({
            promptUsage: promptResponse.data.usage,
            imageUsage: imageResponse.data.totalUsage,
          })

          expect(response.success).toBe(true)
          if (response.data) {
            expect(response.data.summary.warningLevel).toBeDefined()
            expect(['none', 'warning', 'high', 'maximum']).toContain(
              response.data.summary.warningLevel
            )
          }
        }
      }
    })

    it('should include formatted cost string', async () => {
      const promptResponse = await promptGenerationService.generatePrompts({
        referenceImageUrls: ['https://example.com/image1.jpg'],
        styleInputs: {
          theme: 'Minimalist',
          tone: 'Clean',
          description: 'Clean minimalist design',
        },
      })

      if (promptResponse.success && promptResponse.data) {
        const imageResponse = await imageGenerationService.generateImages({
          prompts: promptResponse.data.cardPrompts,
        })

        if (imageResponse.success && imageResponse.data) {
          const response = await service.calculateTotalCost({
            promptUsage: promptResponse.data.usage,
            imageUsage: imageResponse.data.totalUsage,
          })

          expect(response.success).toBe(true)
          if (response.data) {
            expect(response.data.summary.formattedCost).toBeDefined()
            expect(typeof response.data.summary.formattedCost).toBe('string')
            expect(response.data.summary.formattedCost).toMatch(/^\$/)
          }
        }
      }
    })

    it('should set canProceed based on maximum threshold', async () => {
      const promptResponse = await promptGenerationService.generatePrompts({
        referenceImageUrls: ['https://example.com/image1.jpg'],
        styleInputs: {
          theme: 'Digital Art',
          tone: 'Bold',
          description: 'Bold digital compositions',
        },
      })

      if (promptResponse.success && promptResponse.data) {
        const imageResponse = await imageGenerationService.generateImages({
          prompts: promptResponse.data.cardPrompts,
        })

        if (imageResponse.success && imageResponse.data) {
          const response = await service.calculateTotalCost({
            promptUsage: promptResponse.data.usage,
            imageUsage: imageResponse.data.totalUsage,
          })

          expect(response.success).toBe(true)
          if (response.data) {
            // If cost is under maximum threshold, should be able to proceed
            if (response.data.summary.totalCost < COST_THRESHOLDS.maximum) {
              expect(response.data.canProceed).toBe(true)
            } else {
              expect(response.data.canProceed).toBe(false)
            }
          }
        }
      }
    })
  })

  describe('estimateCost()', () => {
    it('should estimate cost before generation', async () => {
      const response = await service.estimateCost({
        imageCount: 22,
        referenceImageCount: 3,
      })

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      if (response.data) {
        expect(response.data.estimate).toBeDefined()
        expect(response.data.estimate.estimatedCost).toBeGreaterThan(0)
        expect(response.data.estimate.breakdown).toBeDefined()
        expect(response.data.estimate.breakdown.promptGeneration).toBeGreaterThanOrEqual(0)
        expect(response.data.estimate.breakdown.imageGeneration).toBeGreaterThan(0)
        expect(Array.isArray(response.data.estimate.assumptions)).toBe(true)
        expect(typeof response.data.canAfford).toBe('boolean')
      }
    })

    it('should scale estimate with image count', async () => {
      const response10 = await service.estimateCost({
        imageCount: 10,
        referenceImageCount: 2,
      })

      const response22 = await service.estimateCost({
        imageCount: 22,
        referenceImageCount: 2,
      })

      expect(response10.success).toBe(true)
      expect(response22.success).toBe(true)

      if (response10.data && response22.data) {
        expect(response22.data.estimate.estimatedCost).toBeGreaterThan(
          response10.data.estimate.estimatedCost
        )
      }
    })

    it('should scale estimate with reference image count', async () => {
      const response1 = await service.estimateCost({
        imageCount: 22,
        referenceImageCount: 1,
      })

      const response5 = await service.estimateCost({
        imageCount: 22,
        referenceImageCount: 5,
      })

      expect(response1.success).toBe(true)
      expect(response5.success).toBe(true)

      if (response1.data && response5.data) {
        expect(response5.data.estimate.estimatedCost).toBeGreaterThanOrEqual(
          response1.data.estimate.estimatedCost
        )
      }
    })

    it('should include warning message if cost exceeds threshold', async () => {
      // Estimate for a large number to potentially trigger warning
      const response = await service.estimateCost({
        imageCount: 100,
        referenceImageCount: 5,
      })

      expect(response.success).toBe(true)
      if (response.data && response.data.estimate.estimatedCost >= COST_THRESHOLDS.warning) {
        expect(response.data.warningMessage).toBeDefined()
      }
    })

    it('should return error for invalid image count', async () => {
      const response = await service.estimateCost({
        imageCount: 0,
        referenceImageCount: 1,
      })

      expect(response.success).toBe(false)
      expect(response.error).toBeDefined()
      if (response.error) {
        expect(response.error.code).toBe(CostCalculationErrorCode.INVALID_IMAGE_COUNT)
      }
    })

    it('should accept optional estimated prompt length', async () => {
      const response = await service.estimateCost({
        imageCount: 22,
        referenceImageCount: 3,
        estimatedPromptLength: 1000,
      })

      expect(response.success).toBe(true)
      expect(response.data?.estimate).toBeDefined()
    })
  })

  describe('formatCost()', () => {
    it('should format cost with default format', async () => {
      const response = await service.formatCost({
        cost: 2.345,
      })

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      if (response.data) {
        expect(response.data.formatted).toBeDefined()
        expect(typeof response.data.formatted).toBe('string')
        expect(response.data.formatted).toMatch(/^\$/)
        expect(response.data.warningLevel).toBeDefined()
      }
    })

    it('should support detailed format', async () => {
      const response = await service.formatCost({
        cost: 5.67,
        format: 'detailed',
      })

      expect(response.success).toBe(true)
      expect(response.data?.formatted).toBeDefined()
    })

    it('should support summary format', async () => {
      const response = await service.formatCost({
        cost: 3.45,
        format: 'summary',
      })

      expect(response.success).toBe(true)
      expect(response.data?.formatted).toBeDefined()
    })

    it('should support minimal format', async () => {
      const response = await service.formatCost({
        cost: 1.23,
        format: 'minimal',
      })

      expect(response.success).toBe(true)
      expect(response.data?.formatted).toBeDefined()
    })

    it('should determine warning level based on cost', async () => {
      // Test cost below warning threshold
      const lowResponse = await service.formatCost({
        cost: 1.0,
      })
      expect(lowResponse.success).toBe(true)
      expect(lowResponse.data?.warningLevel).toBe('none')

      // Test cost at warning threshold
      const warningResponse = await service.formatCost({
        cost: COST_THRESHOLDS.warning,
      })
      expect(warningResponse.success).toBe(true)
      expect(['warning', 'high', 'maximum']).toContain(warningResponse.data?.warningLevel || '')

      // Test cost at high threshold
      const highResponse = await service.formatCost({
        cost: COST_THRESHOLDS.high,
      })
      expect(highResponse.success).toBe(true)
      expect(['high', 'maximum']).toContain(highResponse.data?.warningLevel || '')
    })

    it('should include warning message when requested', async () => {
      const response = await service.formatCost({
        cost: COST_THRESHOLDS.warning + 1,
        includeWarning: true,
      })

      expect(response.success).toBe(true)
      if (response.data && response.data.warningLevel !== 'none') {
        expect(response.data.warningMessage).toBeDefined()
      }
    })

    it('should format zero cost correctly', async () => {
      const response = await service.formatCost({
        cost: 0,
      })

      expect(response.success).toBe(true)
      expect(response.data?.formatted).toBeDefined()
    })

    it('should format large costs correctly', async () => {
      const response = await service.formatCost({
        cost: 99.99,
      })

      expect(response.success).toBe(true)
      expect(response.data?.formatted).toBeDefined()
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
        const imageResponse = await imageGenerationService.generateImages({
          prompts: promptResponse.data.cardPrompts,
        })

        if (imageResponse.success && imageResponse.data) {
          const calculatePromise = service.calculateTotalCost({
            promptUsage: promptResponse.data.usage,
            imageUsage: imageResponse.data.totalUsage,
          })
          expect(calculatePromise).toBeInstanceOf(Promise)
        }
      }

      const estimatePromise = service.estimateCost({
        imageCount: 22,
        referenceImageCount: 3,
      })
      expect(estimatePromise).toBeInstanceOf(Promise)

      const formatPromise = service.formatCost({
        cost: 1.23,
      })
      expect(formatPromise).toBeInstanceOf(Promise)
    })

    it('should ensure total cost equals sum of component costs', async () => {
      const promptResponse = await promptGenerationService.generatePrompts({
        referenceImageUrls: ['https://example.com/image1.jpg'],
        styleInputs: {
          theme: 'Test',
          tone: 'Test',
          description: 'Test description',
        },
      })

      if (promptResponse.success && promptResponse.data) {
        const imageResponse = await imageGenerationService.generateImages({
          prompts: promptResponse.data.cardPrompts,
        })

        if (imageResponse.success && imageResponse.data) {
          const response = await service.calculateTotalCost({
            promptUsage: promptResponse.data.usage,
            imageUsage: imageResponse.data.totalUsage,
          })

          expect(response.success).toBe(true)
          if (response.data) {
            const { textCost, imageCost, visionCost, totalCost } = response.data.summary
            const sum = textCost.totalCost + imageCost.totalCost + visionCost.totalCost
            // Allow small floating point differences
            expect(Math.abs(totalCost - sum)).toBeLessThan(0.01)
          }
        }
      }
    })
  })
})
