/**
 * @fileoverview TDD tests for DeckDisplayService (real implementation).
 */
import { describe, it, expect } from 'vitest'
import { DeckDisplayService } from '../../services/real/DeckDisplayService'
import type { GeneratedCard, GeneratedCardId } from '$contracts/ImageGeneration'

const makeGeneratedCard = (
  cardNumber: number,
  status: 'completed' | 'failed' = 'completed'
): GeneratedCard => ({
  id: `card-${cardNumber}` as GeneratedCardId,
  cardNumber: cardNumber as any,
  cardName: `Card ${cardNumber}`,
  prompt: `Prompt for card ${cardNumber}`,
  imageUrl: status === 'completed' ? `https://example.com/${cardNumber}.jpg` : undefined,
  generationStatus: status,
  generatedAt: new Date(),
  retryCount: 0,
})

describe('DeckDisplayService', () => {
  const svc = new DeckDisplayService()

  describe('initializeDisplay', () => {
    it('initializes display cards and state', async () => {
      const cards = [makeGeneratedCard(21), makeGeneratedCard(0)]
      const result = await svc.initializeDisplay({ generatedCards: cards })
      expect(result.success).toBe(true)
      if (result.success && result.data) {
        expect(result.data.displayCards).toHaveLength(2)
        expect(result.data.state.layout).toBe('grid')
      }
    })

    it('returns error when no cards provided', async () => {
      const result = await svc.initializeDisplay({ generatedCards: [] })
      expect(result.success).toBe(false)
    })
  })

  describe('sortCards', () => {
    it('sorts cards by number ascending', async () => {
      const cards = [makeGeneratedCard(21), makeGeneratedCard(0), makeGeneratedCard(5)]
      await svc.initializeDisplay({ generatedCards: cards })
      const result = await svc.sortCards({ sortBy: 'number', ascending: true })
      expect(result.success).toBe(true)
      if (result.success && result.data) {
        const numbers = result.data.displayCards.map(c => c.card.cardNumber)
        expect(numbers).toEqual([0, 5, 21])
      }
    })
  })

  describe('filterCards', () => {
    it('filters cards by search term', async () => {
      const cards = [makeGeneratedCard(0), makeGeneratedCard(1)]
      await svc.initializeDisplay({ generatedCards: cards })
      const result = await svc.filterCards({ filter: 'Card 0' })
      expect(result.success).toBe(true)
      if (result.success && result.data) {
        expect(result.data.visibleCount).toBe(1)
      }
    })
  })
})
