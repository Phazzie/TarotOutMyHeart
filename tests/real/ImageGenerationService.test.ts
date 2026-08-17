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

    it('passes saveToStorage parameter to /api/generate/card endpoint', async () => {
      let requestBody: Record<string, any> = {}
      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
          requestBody = JSON.parse(init?.body as string)
          return Promise.resolve({
            json: () =>
              Promise.resolve({
                success: true,
                data: { imageUrl: 'https://blob.vercel.com/card0.png' },
              }),
          })
        })
      )

      await svc.generateImages({ prompts: [makePrompt(0)], saveToStorage: false })
      expect(requestBody['saveToStorage']).toBe(false)
    })

    it('tracks pricing at $0.02 per generated card', async () => {
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
      expect(result.data?.totalUsage.estimatedCost).toBe(0.02)
      expect(result.data?.totalUsage.usagePerCard[0]?.estimatedCost).toBe(0.02)
    })

    it('returns error when prompts array is empty', async () => {
      const result = await svc.generateImages({ prompts: [] })
      expect(result.success).toBe(false)
    })
  })

  describe('cancelGeneration', () => {
    it('cancels active generation and aborts in-flight requests without retry loops', async () => {
      let fetchCallCount = 0
      let fetchSignal: AbortSignal | null | undefined

      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
          fetchCallCount++
          fetchSignal = init?.signal
          return new Promise((_resolve, reject) => {
            if (fetchSignal?.aborted) {
              const err = new Error('The operation was aborted.')
              err.name = 'AbortError'
              reject(err)
              return
            }
            fetchSignal?.addEventListener('abort', () => {
              const err = new Error('The operation was aborted.')
              err.name = 'AbortError'
              reject(err)
            })
          })
        })
      )

      const generatePromise = svc.generateImages({ prompts: [makePrompt(0), makePrompt(1)] })

      // Yield briefly to allow generateImages to initiate fetch
      await new Promise(r => setTimeout(r, 10))

      const cancelResult = await svc.cancelGeneration({ sessionId: 'session-test' })
      expect(cancelResult.success).toBe(true)
      expect(cancelResult.data?.canceled).toBe(true)

      const result = await generatePromise
      expect(result.success).toBe(true)
      expect(result.data?.fullySuccessful).toBe(false)
      expect(fetchSignal?.aborted).toBe(true)
      // Confirm fetch was not repeatedly retried after abort
      expect(fetchCallCount).toBe(1)
    })

    it('retains cards completed before cancellation', async () => {
      let cardCount = 0
      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation(() => {
          cardCount++
          if (cardCount === 1) {
            return Promise.resolve({
              json: () =>
                Promise.resolve({
                  success: true,
                  data: { imageUrl: 'https://blob.vercel.com/card0.png' },
                }),
            })
          }
          return new Promise((_resolve, reject) => {
            setTimeout(() => {
              const err = new Error('Aborted')
              err.name = 'AbortError'
              reject(err)
            }, 100)
          })
        })
      )

      const generatePromise = svc.generateImages({ prompts: [makePrompt(0), makePrompt(1)] })

      // Wait until card 0 succeeds and card 1 begins
      await new Promise(r => setTimeout(r, 20))
      await svc.cancelGeneration({ sessionId: 'session-test' })

      const result = await generatePromise
      expect(result.success).toBe(true)
      expect(result.data?.generatedCards).toHaveLength(1)
      expect(result.data?.generatedCards[0]?.cardNumber).toBe(0)
      expect(result.data?.fullySuccessful).toBe(false)
    })
  })

  describe('estimateCost', () => {
    it('calculates cost for specified image count at $0.02 per image', async () => {
      const result = await svc.estimateCost({ imageCount: 22 })
      expect(result.success).toBe(true)
      if (result.success && result.data) {
        expect(result.data.costPerImage).toBe(0.02)
        expect(result.data.totalEstimatedCost).toBe(0.44)
      }
    })
  })
})
