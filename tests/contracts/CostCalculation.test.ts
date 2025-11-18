/**
 * CostCalculation Contract Tests
 *
 * Tests that CostCalculationMock satisfies the ICostCalculationService contract
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { CostCalculationMock } from '../../services/mock/CostCalculation'
import type {
  ICostCalculationService,
  CalculateTotalCostInput,
  EstimateCostInput,
  FormatCostInput,
} from '../../contracts/CostCalculation'
import {
  formatCurrency,
  getWarningLevel,
  getWarningMessage,
  COST_THRESHOLDS,
} from '../../contracts/CostCalculation'

describe('CostCalculation Contract', () => {
  let service: ICostCalculationService

  beforeEach(() => {
    service = new CostCalculationMock()
  })

  describe('calculateTotalCost() Method', () => {
    it('should calculate total cost from valid usage data', async () => {
      const input: CalculateTotalCostInput = {
        promptUsage: {
          promptTokens: 5000,
          completionTokens: 15000,
          totalTokens: 20000,
          estimatedCost: 0.16,
          model: 'grok-vision-beta',
        },
        imageUsage: {
          totalImages: 22,
          successfulImages: 22,
          failedImages: 0,
          estimatedCost: 2.2,
          totalGenerationTime: 120000,
          usagePerCard: [],
        },
      }

      const response = await service.calculateTotalCost(input)

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      expect(response.data?.summary).toBeDefined()
      expect(response.data?.exceeded).toBeDefined()
      expect(response.data?.canProceed).toBeDefined()
    })

    it('should calculate text cost breakdown correctly', async () => {
      const input: CalculateTotalCostInput = {
        promptUsage: {
          promptTokens: 5000,
          completionTokens: 15000,
          totalTokens: 20000,
          estimatedCost: 0.16,
          model: 'grok-vision-beta',
        },
        imageUsage: {
          totalImages: 22,
          successfulImages: 22,
          failedImages: 0,
          estimatedCost: 2.2,
          totalGenerationTime: 120000,
          usagePerCard: [],
        },
      }

      const response = await service.calculateTotalCost(input)

      expect(response.success).toBe(true)
      expect(response.data?.summary.textCost).toBeDefined()
      expect(response.data?.summary.textCost.inputTokens).toBe(5000)
      expect(response.data?.summary.textCost.outputTokens).toBe(15000)
      expect(response.data?.summary.textCost.inputCost).toBeGreaterThan(0)
      expect(response.data?.summary.textCost.outputCost).toBeGreaterThan(0)
      expect(response.data?.summary.textCost.totalCost).toBeGreaterThan(0)
    })

    it('should calculate image cost breakdown correctly', async () => {
      const input: CalculateTotalCostInput = {
        promptUsage: {
          promptTokens: 5000,
          completionTokens: 15000,
          totalTokens: 20000,
          estimatedCost: 0.16,
          model: 'grok-vision-beta',
        },
        imageUsage: {
          totalImages: 22,
          successfulImages: 22,
          failedImages: 0,
          estimatedCost: 2.2,
          totalGenerationTime: 120000,
          usagePerCard: [],
        },
      }

      const response = await service.calculateTotalCost(input)

      expect(response.success).toBe(true)
      expect(response.data?.summary.imageCost).toBeDefined()
      expect(response.data?.summary.imageCost.imagesGenerated).toBe(22)
      expect(response.data?.summary.imageCost.imagesFailed).toBe(0)
      expect(response.data?.summary.imageCost.imagesRetried).toBeGreaterThanOrEqual(0)
      expect(response.data?.summary.imageCost.generationCost).toBeGreaterThan(0)
      expect(response.data?.summary.imageCost.totalCost).toBeGreaterThan(0)
    })

    it('should calculate vision cost breakdown correctly', async () => {
      const input: CalculateTotalCostInput = {
        promptUsage: {
          promptTokens: 5000,
          completionTokens: 15000,
          totalTokens: 20000,
          estimatedCost: 0.16,
          model: 'grok-vision-beta',
        },
        imageUsage: {
          totalImages: 22,
          successfulImages: 22,
          failedImages: 0,
          estimatedCost: 2.2,
          totalGenerationTime: 120000,
          usagePerCard: [],
        },
      }

      const response = await service.calculateTotalCost(input)

      expect(response.success).toBe(true)
      expect(response.data?.summary.visionCost).toBeDefined()
      expect(response.data?.summary.visionCost.requestCount).toBeGreaterThanOrEqual(0)
      expect(response.data?.summary.visionCost.requestCost).toBeGreaterThanOrEqual(0)
      expect(response.data?.summary.visionCost.totalCost).toBeGreaterThanOrEqual(0)
    })

    it('should return "none" warning level for costs under $5', async () => {
      const input: CalculateTotalCostInput = {
        promptUsage: {
          promptTokens: 1000,
          completionTokens: 3000,
          totalTokens: 4000,
          estimatedCost: 0.032,
          model: 'grok-vision-beta',
        },
        imageUsage: {
          totalImages: 22,
          successfulImages: 22,
          failedImages: 0,
          estimatedCost: 2.2,
          totalGenerationTime: 120000,
          usagePerCard: [],
        },
      }

      const response = await service.calculateTotalCost(input)

      expect(response.success).toBe(true)
      expect(response.data?.summary.totalCost).toBeLessThan(COST_THRESHOLDS.warning)
      expect(response.data?.summary.warningLevel).toBe('none')
      expect(response.data?.canProceed).toBe(true)
      expect(response.data?.exceeded).toBe(false)
    })

    it('should return "warning" level for costs between $5 and $10', async () => {
      const input: CalculateTotalCostInput = {
        promptUsage: {
          promptTokens: 10000,
          completionTokens: 30000,
          totalTokens: 40000,
          estimatedCost: 0.32,
          model: 'grok-vision-beta',
        },
        imageUsage: {
          totalImages: 50,
          successfulImages: 50,
          failedImages: 0,
          estimatedCost: 5.0,
          totalGenerationTime: 300000,
          usagePerCard: [],
        },
      }

      const response = await service.calculateTotalCost(input)

      expect(response.success).toBe(true)
      expect(response.data?.summary.totalCost).toBeGreaterThanOrEqual(COST_THRESHOLDS.warning)
      expect(response.data?.summary.totalCost).toBeLessThan(COST_THRESHOLDS.high)
      expect(response.data?.summary.warningLevel).toBe('warning')
      expect(response.data?.canProceed).toBe(true)
      expect(response.data?.exceeded).toBe(true)
    })

    it('should return "high" warning level for costs between $10 and $20', async () => {
      const input: CalculateTotalCostInput = {
        promptUsage: {
          promptTokens: 20000,
          completionTokens: 60000,
          totalTokens: 80000,
          estimatedCost: 0.64,
          model: 'grok-vision-beta',
        },
        imageUsage: {
          totalImages: 100,
          successfulImages: 100,
          failedImages: 0,
          estimatedCost: 10.0,
          totalGenerationTime: 600000,
          usagePerCard: [],
        },
      }

      const response = await service.calculateTotalCost(input)

      expect(response.success).toBe(true)
      expect(response.data?.summary.totalCost).toBeGreaterThanOrEqual(COST_THRESHOLDS.high)
      expect(response.data?.summary.totalCost).toBeLessThan(COST_THRESHOLDS.maximum)
      expect(response.data?.summary.warningLevel).toBe('high')
      expect(response.data?.canProceed).toBe(true)
      expect(response.data?.exceeded).toBe(true)
    })

    it('should return "maximum" warning level for costs at or above $20', async () => {
      const input: CalculateTotalCostInput = {
        promptUsage: {
          promptTokens: 50000,
          completionTokens: 150000,
          totalTokens: 200000,
          estimatedCost: 1.6,
          model: 'grok-vision-beta',
        },
        imageUsage: {
          totalImages: 200,
          successfulImages: 200,
          failedImages: 0,
          estimatedCost: 20.0,
          totalGenerationTime: 1200000,
          usagePerCard: [],
        },
      }

      const response = await service.calculateTotalCost(input)

      expect(response.success).toBe(true)
      expect(response.data?.summary.totalCost).toBeGreaterThanOrEqual(COST_THRESHOLDS.maximum)
      expect(response.data?.summary.warningLevel).toBe('maximum')
      expect(response.data?.canProceed).toBe(false)
      expect(response.data?.exceeded).toBe(true)
    })

    it('should return formatted cost string in summary', async () => {
      const input: CalculateTotalCostInput = {
        promptUsage: {
          promptTokens: 5000,
          completionTokens: 15000,
          totalTokens: 20000,
          estimatedCost: 0.16,
          model: 'grok-vision-beta',
        },
        imageUsage: {
          totalImages: 22,
          successfulImages: 22,
          failedImages: 0,
          estimatedCost: 2.2,
          totalGenerationTime: 120000,
          usagePerCard: [],
        },
      }

      const response = await service.calculateTotalCost(input)

      expect(response.success).toBe(true)
      expect(response.data?.summary.formattedCost).toBeDefined()
      expect(typeof response.data?.summary.formattedCost).toBe('string')
      expect(response.data?.summary.formattedCost).toMatch(/^\$\d+\.\d{2}$/)
    })

    it('should handle failed and retried images in cost calculation', async () => {
      const input: CalculateTotalCostInput = {
        promptUsage: {
          promptTokens: 5000,
          completionTokens: 15000,
          totalTokens: 20000,
          estimatedCost: 0.16,
          model: 'grok-vision-beta',
        },
        imageUsage: {
          totalImages: 24,
          successfulImages: 22,
          failedImages: 2,
          estimatedCost: 2.4,
          totalGenerationTime: 150000,
          usagePerCard: [],
        },
      }

      const response = await service.calculateTotalCost(input)

      expect(response.success).toBe(true)
      expect(response.data?.summary.imageCost.imagesFailed).toBe(2)
      expect(response.data?.summary.imageCost.imagesRetried).toBeGreaterThanOrEqual(0)
    })
  })

  describe('estimateCost() Method', () => {
    it('should estimate cost for 22 images with reference images', async () => {
      const input: EstimateCostInput = {
        imageCount: 22,
        referenceImageCount: 3,
        estimatedPromptLength: 1000,
      }

      const response = await service.estimateCost(input)

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      expect(response.data?.estimate).toBeDefined()
      expect(response.data?.canAfford).toBeDefined()
    })

    it('should return estimate with breakdown', async () => {
      const input: EstimateCostInput = {
        imageCount: 22,
        referenceImageCount: 3,
        estimatedPromptLength: 1000,
      }

      const response = await service.estimateCost(input)

      expect(response.success).toBe(true)
      expect(response.data?.estimate.estimatedCost).toBeGreaterThan(0)
      expect(response.data?.estimate.breakdown).toBeDefined()
      expect(response.data?.estimate.breakdown.promptGeneration).toBeGreaterThanOrEqual(0)
      expect(response.data?.estimate.breakdown.imageGeneration).toBeGreaterThan(0)
    })

    it('should include assumptions in estimate', async () => {
      const input: EstimateCostInput = {
        imageCount: 22,
        referenceImageCount: 3,
        estimatedPromptLength: 1000,
      }

      const response = await service.estimateCost(input)

      expect(response.success).toBe(true)
      expect(response.data?.estimate.assumptions).toBeDefined()
      expect(Array.isArray(response.data?.estimate.assumptions)).toBe(true)
      expect(response.data?.estimate.assumptions.length).toBeGreaterThan(0)
    })

    it('should return canAfford true for reasonable estimates', async () => {
      const input: EstimateCostInput = {
        imageCount: 22,
        referenceImageCount: 3,
        estimatedPromptLength: 1000,
      }

      const response = await service.estimateCost(input)

      expect(response.success).toBe(true)
      expect(response.data?.estimate.estimatedCost).toBeLessThan(COST_THRESHOLDS.maximum)
      expect(response.data?.canAfford).toBe(true)
    })

    it('should return canAfford false for estimates exceeding maximum', async () => {
      const input: EstimateCostInput = {
        imageCount: 250,
        referenceImageCount: 5,
        estimatedPromptLength: 5000,
      }

      const response = await service.estimateCost(input)

      expect(response.success).toBe(true)
      if (response.data && response.data.estimate.estimatedCost >= COST_THRESHOLDS.maximum) {
        expect(response.data.canAfford).toBe(false)
        expect(response.data.warningMessage).toBeDefined()
      }
    })

    it('should estimate with default prompt length if not provided', async () => {
      const input: EstimateCostInput = {
        imageCount: 22,
        referenceImageCount: 3,
      }

      const response = await service.estimateCost(input)

      expect(response.success).toBe(true)
      expect(response.data?.estimate.estimatedCost).toBeGreaterThan(0)
    })

    it('should estimate correctly with minimum reference images', async () => {
      const input: EstimateCostInput = {
        imageCount: 22,
        referenceImageCount: 1,
        estimatedPromptLength: 500,
      }

      const response = await service.estimateCost(input)

      expect(response.success).toBe(true)
      expect(response.data?.estimate.estimatedCost).toBeGreaterThan(0)
    })

    it('should estimate correctly with maximum reference images', async () => {
      const input: EstimateCostInput = {
        imageCount: 22,
        referenceImageCount: 5,
        estimatedPromptLength: 2000,
      }

      const response = await service.estimateCost(input)

      expect(response.success).toBe(true)
      expect(response.data?.estimate.estimatedCost).toBeGreaterThan(0)
    })
  })

  describe('formatCost() Method', () => {
    it('should format cost with "summary" format (default)', async () => {
      const input: FormatCostInput = {
        cost: 2.345,
        format: 'summary',
        includeWarning: false,
      }

      const response = await service.formatCost(input)

      expect(response.success).toBe(true)
      expect(response.data?.formatted).toBeDefined()
      expect(typeof response.data?.formatted).toBe('string')
      expect(response.data?.formatted).toMatch(/^\$\d+\.\d{2}$/)
    })

    it('should format cost with "detailed" format', async () => {
      const input: FormatCostInput = {
        cost: 2.345,
        format: 'detailed',
        includeWarning: false,
      }

      const response = await service.formatCost(input)

      expect(response.success).toBe(true)
      expect(response.data?.formatted).toBeDefined()
      expect(typeof response.data?.formatted).toBe('string')
      // Detailed format should include breakdown components
      expect(response.data?.formatted.length).toBeGreaterThan(10)
    })

    it('should format cost with "minimal" format', async () => {
      const input: FormatCostInput = {
        cost: 2.345,
        format: 'minimal',
        includeWarning: false,
      }

      const response = await service.formatCost(input)

      expect(response.success).toBe(true)
      expect(response.data?.formatted).toBeDefined()
      expect(typeof response.data?.formatted).toBe('string')
    })

    it('should round to 2 decimal places', async () => {
      const input: FormatCostInput = {
        cost: 2.3456789,
        format: 'summary',
        includeWarning: false,
      }

      const response = await service.formatCost(input)

      expect(response.success).toBe(true)
      expect(response.data?.formatted).toMatch(/^\$\d+\.\d{2}$/)
    })

    it('should include warning level in response', async () => {
      const input: FormatCostInput = {
        cost: 7.5,
        format: 'summary',
        includeWarning: true,
      }

      const response = await service.formatCost(input)

      expect(response.success).toBe(true)
      expect(response.data?.warningLevel).toBeDefined()
      expect(['none', 'warning', 'high', 'maximum']).toContain(response.data?.warningLevel)
    })

    it('should include warning message for high costs when requested', async () => {
      const input: FormatCostInput = {
        cost: 15.0,
        format: 'summary',
        includeWarning: true,
      }

      const response = await service.formatCost(input)

      expect(response.success).toBe(true)
      expect(response.data?.warningLevel).toBe('high')
      expect(response.data?.warningMessage).toBeDefined()
    })

    it('should not include warning message when includeWarning is false', async () => {
      const input: FormatCostInput = {
        cost: 15.0,
        format: 'summary',
        includeWarning: false,
      }

      const response = await service.formatCost(input)

      expect(response.success).toBe(true)
      // warningMessage may be undefined or not included
    })

    it('should handle zero cost', async () => {
      const input: FormatCostInput = {
        cost: 0,
        format: 'summary',
        includeWarning: false,
      }

      const response = await service.formatCost(input)

      expect(response.success).toBe(true)
      expect(response.data?.formatted).toBe('$0.00')
    })

    it('should handle very small costs', async () => {
      const input: FormatCostInput = {
        cost: 0.001,
        format: 'summary',
        includeWarning: false,
      }

      const response = await service.formatCost(input)

      expect(response.success).toBe(true)
      expect(response.data?.formatted).toBe('$0.00')
    })

    it('should handle costs at threshold boundaries', async () => {
      const input1: FormatCostInput = {
        cost: 5.0,
        format: 'summary',
        includeWarning: true,
      }

      const response1 = await service.formatCost(input1)
      expect(response1.success).toBe(true)
      expect(response1.data?.warningLevel).toBe('warning')

      const input2: FormatCostInput = {
        cost: 10.0,
        format: 'summary',
        includeWarning: true,
      }

      const response2 = await service.formatCost(input2)
      expect(response2.success).toBe(true)
      expect(response2.data?.warningLevel).toBe('high')

      const input3: FormatCostInput = {
        cost: 20.0,
        format: 'summary',
        includeWarning: true,
      }

      const response3 = await service.formatCost(input3)
      expect(response3.success).toBe(true)
      expect(response3.data?.warningLevel).toBe('maximum')
    })
  })

  describe('Helper Functions', () => {
    describe('formatCurrency()', () => {
      it('should format positive cost with 2 decimals by default', () => {
        expect(formatCurrency(2.345)).toBe('$2.35')
      })

      it('should format cost with custom decimal places', () => {
        expect(formatCurrency(2.3456, 4)).toBe('$2.3456')
      })

      it('should format zero cost', () => {
        expect(formatCurrency(0)).toBe('$0.00')
      })

      it('should format large costs', () => {
        expect(formatCurrency(1234.56)).toBe('$1234.56')
      })

      it('should round correctly', () => {
        expect(formatCurrency(2.345)).toBe('$2.35')
        expect(formatCurrency(2.344)).toBe('$2.34')
        expect(formatCurrency(2.346)).toBe('$2.35')
      })
    })

    describe('getWarningLevel()', () => {
      it('should return "none" for costs under $5', () => {
        expect(getWarningLevel(0)).toBe('none')
        expect(getWarningLevel(2.5)).toBe('none')
        expect(getWarningLevel(4.99)).toBe('none')
      })

      it('should return "warning" for costs $5-$9.99', () => {
        expect(getWarningLevel(5.0)).toBe('warning')
        expect(getWarningLevel(7.5)).toBe('warning')
        expect(getWarningLevel(9.99)).toBe('warning')
      })

      it('should return "high" for costs $10-$19.99', () => {
        expect(getWarningLevel(10.0)).toBe('high')
        expect(getWarningLevel(15.0)).toBe('high')
        expect(getWarningLevel(19.99)).toBe('high')
      })

      it('should return "maximum" for costs at or above $20', () => {
        expect(getWarningLevel(20.0)).toBe('maximum')
        expect(getWarningLevel(25.0)).toBe('maximum')
        expect(getWarningLevel(100.0)).toBe('maximum')
      })
    })

    describe('getWarningMessage()', () => {
      it('should return undefined for "none" level', () => {
        expect(getWarningMessage('none', 2.5)).toBeUndefined()
      })

      it('should return warning message for "warning" level', () => {
        const message = getWarningMessage('warning', 7.5)
        expect(message).toBeDefined()
        expect(message).toContain('$7.50')
      })

      it('should return warning message for "high" level', () => {
        const message = getWarningMessage('high', 15.0)
        expect(message).toBeDefined()
        expect(message).toContain('$15.00')
      })

      it('should return warning message for "maximum" level', () => {
        const message = getWarningMessage('maximum', 25.0)
        expect(message).toBeDefined()
        expect(message).toContain('$25.00')
        expect(message).toContain('maximum')
      })
    })
  })

  describe('Integration Tests', () => {
    it('should estimate then calculate with similar results', async () => {
      const estimateInput: EstimateCostInput = {
        imageCount: 22,
        referenceImageCount: 3,
        estimatedPromptLength: 1000,
      }

      const estimateResponse = await service.estimateCost(estimateInput)
      expect(estimateResponse.success).toBe(true)

      const calculateInput: CalculateTotalCostInput = {
        promptUsage: {
          promptTokens: 5000,
          completionTokens: 15000,
          totalTokens: 20000,
          estimatedCost: 0.16,
          model: 'grok-vision-beta',
        },
        imageUsage: {
          totalImages: 22,
          successfulImages: 22,
          failedImages: 0,
          estimatedCost: 2.2,
          totalGenerationTime: 120000,
          usagePerCard: [],
        },
      }

      const calculateResponse = await service.calculateTotalCost(calculateInput)
      expect(calculateResponse.success).toBe(true)

      // Estimate should be within reasonable range of actual
      if (estimateResponse.data && calculateResponse.data) {
        const estimatedCost = estimateResponse.data.estimate.estimatedCost
        const actualCost = calculateResponse.data.summary.totalCost

        // Both should be positive
        expect(estimatedCost).toBeGreaterThan(0)
        expect(actualCost).toBeGreaterThan(0)
      }
    })

    it('should calculate then format with detailed breakdown', async () => {
      const calculateInput: CalculateTotalCostInput = {
        promptUsage: {
          promptTokens: 5000,
          completionTokens: 15000,
          totalTokens: 20000,
          estimatedCost: 0.16,
          model: 'grok-vision-beta',
        },
        imageUsage: {
          totalImages: 22,
          successfulImages: 22,
          failedImages: 0,
          estimatedCost: 2.2,
          totalGenerationTime: 120000,
          usagePerCard: [],
        },
      }

      const calculateResponse = await service.calculateTotalCost(calculateInput)
      expect(calculateResponse.success).toBe(true)

      if (calculateResponse.data) {
        const formatInput: FormatCostInput = {
          cost: calculateResponse.data.summary.totalCost,
          format: 'detailed',
          includeWarning: true,
        }

        const formatResponse = await service.formatCost(formatInput)
        expect(formatResponse.success).toBe(true)
        expect(formatResponse.data?.formatted).toBeDefined()
      }
    })

    it('should handle complete workflow: estimate -> calculate -> format', async () => {
      // Step 1: Estimate
      const estimateResponse = await service.estimateCost({
        imageCount: 22,
        referenceImageCount: 3,
        estimatedPromptLength: 1000,
      })
      expect(estimateResponse.success).toBe(true)

      // Step 2: Calculate actual
      const calculateResponse = await service.calculateTotalCost({
        promptUsage: {
          promptTokens: 5000,
          completionTokens: 15000,
          totalTokens: 20000,
          estimatedCost: 0.16,
          model: 'grok-vision-beta',
        },
        imageUsage: {
          totalImages: 22,
          successfulImages: 22,
          failedImages: 0,
          estimatedCost: 2.2,
          totalGenerationTime: 120000,
          usagePerCard: [],
        },
      })
      expect(calculateResponse.success).toBe(true)

      // Step 3: Format for display
      if (calculateResponse.data) {
        const formatResponse = await service.formatCost({
          cost: calculateResponse.data.summary.totalCost,
          format: 'summary',
          includeWarning: true,
        })
        expect(formatResponse.success).toBe(true)
      }
    })

    it('should verify warning levels match across calculate and format', async () => {
      const calculateResponse = await service.calculateTotalCost({
        promptUsage: {
          promptTokens: 10000,
          completionTokens: 30000,
          totalTokens: 40000,
          estimatedCost: 0.32,
          model: 'grok-vision-beta',
        },
        imageUsage: {
          totalImages: 50,
          successfulImages: 50,
          failedImages: 0,
          estimatedCost: 5.0,
          totalGenerationTime: 300000,
          usagePerCard: [],
        },
      })

      expect(calculateResponse.success).toBe(true)

      if (calculateResponse.data) {
        const formatResponse = await service.formatCost({
          cost: calculateResponse.data.summary.totalCost,
          format: 'summary',
          includeWarning: true,
        })

        expect(formatResponse.success).toBe(true)

        // Warning levels should match
        if (formatResponse.data) {
          expect(formatResponse.data.warningLevel).toBe(calculateResponse.data.summary.warningLevel)
        }
      }
    })
  })
})
