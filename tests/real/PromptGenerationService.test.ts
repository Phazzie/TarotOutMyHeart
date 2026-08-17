/**
 * @fileoverview TDD tests for PromptGenerationService (real implementation).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PromptGenerationService } from '../../services/real/PromptGenerationService'
import type { PromptId, CardNumber } from '$contracts/PromptGeneration'

const MOCK_PROMPTS = Array.from({ length: 22 }, (_, i) => ({
  id: `prompt-${i}` as PromptId,
  cardNumber: i as CardNumber,
  cardName: `Card ${i}`,
  traditionalMeaning: `Meaning ${i}`,
  generatedPrompt: `Detailed image prompt for card ${i}`,
  confidence: 0.9,
  generatedAt: new Date().toISOString(),
}))

const VALID_PARAMS = {
  referenceImageUrls: ['https://blob.vercel.com/ref1.jpg'],
  styleInputs: { theme: 'Gothic', tone: 'Dark', description: 'Moody and mysterious' },
}

describe('PromptGenerationService', () => {
  let svc: PromptGenerationService

  beforeEach(() => {
    svc = new PromptGenerationService()
    vi.restoreAllMocks()
  })

  describe('generatePrompts — success', () => {
    it('returns 22 CardPrompt objects on success', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          json: () => Promise.resolve({ success: true, data: { prompts: MOCK_PROMPTS } }),
        })
      )
      const result = await svc.generatePrompts(VALID_PARAMS)
      expect(result.success).toBe(true)
      if (result.success && result.data && result.data.cardPrompts[0]) {
        expect(result.data.cardPrompts).toHaveLength(22)
        expect(result.data.cardPrompts[0].cardName).toBe('Card 0')
      }
    })

    it('returns error when no reference images provided', async () => {
      const result = await svc.generatePrompts({ ...VALID_PARAMS, referenceImageUrls: [] })
      expect(result.success).toBe(false)
    })
  })

  describe('validatePrompts', () => {
    it('validates 22 card prompts', async () => {
      const prompts = MOCK_PROMPTS.map(p => ({
        ...p,
        generatedAt: new Date(),
      }))
      const result = await svc.validatePrompts({ prompts })
      expect(result.success).toBe(true)
      if (result.success && result.data) {
        expect(result.data.isValid).toBe(true)
      }
    })
  })

  describe('regeneratePrompt — AI proxy endpoint', () => {
    it('sends POST request to /api/prompts and returns regenerated CardPrompt', async () => {
      const singlePrompt = {
        id: 'prompt-regen-1',
        cardNumber: 0,
        cardName: 'The Fool',
        traditionalMeaning: 'New beginnings',
        generatedPrompt: 'An enigmatic traveler at the edge of a cyber cliff.',
        confidence: 0.95,
        generatedAt: new Date().toISOString(),
      }

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              prompt: singlePrompt,
              usage: {
                promptTokens: 120,
                completionTokens: 80,
                totalTokens: 200,
                estimatedCost: 0.002,
                model: 'grok-vision-beta',
              },
              requestId: 'req-test-123',
            },
          }),
      })
      vi.stubGlobal('fetch', fetchMock)

      const result = await svc.regeneratePrompt({
        cardNumber: 0 as CardNumber,
        referenceImageUrls: ['https://blob.vercel.com/ref1.jpg'],
        styleInputs: { theme: 'Cyberpunk', tone: 'Dark', description: 'Futuristic city' },
        feedback: 'Make it more mysterious',
      })

      expect(result.success).toBe(true)
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/prompts',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      )
      if (result.success && result.data) {
        expect(result.data.cardPrompt.cardNumber).toBe(0)
        expect(result.data.cardPrompt.generatedPrompt).toBe(
          'An enigmatic traveler at the edge of a cyber cliff.'
        )
        expect(result.data.usage.estimatedCost).toBe(0.002)
      }
    })

    it('rejects invalid card number', async () => {
      const result = await svc.regeneratePrompt({
        cardNumber: 99 as any,
        referenceImageUrls: [],
        styleInputs: { theme: 'Cyberpunk', tone: 'Dark', description: 'Futuristic city' },
      })

      expect(result.success).toBe(false)
    })

    it('handles server proxy error gracefully', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 502,
          json: () =>
            Promise.resolve({
              success: false,
              error: { code: 'API_ERROR', message: 'Model unavailable', retryable: true },
            }),
        })
      )

      const result = await svc.regeneratePrompt({
        cardNumber: 1 as CardNumber,
        referenceImageUrls: [],
        styleInputs: { theme: 'Cyberpunk', tone: 'Dark', description: 'Futuristic city' },
      })

      expect(result.success).toBe(false)
      expect(result.error?.message).toBe('Model unavailable')
    })
  })
})
