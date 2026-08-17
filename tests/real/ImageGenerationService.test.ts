/**
 * @fileoverview TDD tests for ImageGenerationService (real implementation).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ImageGenerationService } from '../../services/real/ImageGenerationService'
import type { CardPrompt, PromptId, CardNumber } from '$contracts/PromptGeneration'

const makePrompt = (cardNumber: number): CardPrompt => ({
  id: `prompt-${cardNumber}` as PromptId,
  cardNumber: cardNumber as CardNumber,
  cardName: `Card ${cardNumber}`,
  traditionalMeaning: `Meaning ${cardNumber}`,
  generatedPrompt: `Image prompt for card ${cardNumber}`,
  confidence: 0.9,
  generatedAt: new Date(),
})

describe('ImageGenerationService', () => {
  let svc: ImageGenerationService

  beforeEach(() => {
    svc = new ImageGenerationService()
    vi.restoreAllMocks()
  })

  describe('generateImages — success', () => {
    it('returns generated cards on success', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          json: () =>
            Promise.resolve({
              success: true,
              data: { imageUrl: 'https://blob.vercel.com/card0.png' },
            }),
        })
      )

      const result = await svc.generateImages({ prompts: [makePrompt(0)] })
      expect(result.success).toBe(true)
      if (result.success && result.data && result.data.generatedCards[0]) {
        expect(result.data.generatedCards).toHaveLength(1)
        expect(result.data.generatedCards[0].generationStatus).toBe('completed')
      }
    })

    it('returns error when prompts array is empty', async () => {
      const result = await svc.generateImages({ prompts: [] })
      expect(result.success).toBe(false)
    })
  })

  describe('estimateCost', () => {
    it('calculates cost for specified image count', async () => {
      const result = await svc.estimateCost({ imageCount: 22 })
      expect(result.success).toBe(true)
      if (result.success && result.data) {
        expect(result.data.totalEstimatedCost).toBe(0.88)
      }
    })
  })
})
