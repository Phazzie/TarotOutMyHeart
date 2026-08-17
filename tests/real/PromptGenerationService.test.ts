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
})
