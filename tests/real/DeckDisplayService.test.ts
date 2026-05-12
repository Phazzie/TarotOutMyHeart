/**
 * @fileoverview TDD tests for DeckDisplayService (real implementation).
 * Written BEFORE implementation — red phase.
 */
import { describe, it, expect } from 'vitest';
import { DeckDisplayService, type DisplayCard } from '../../services/real/DeckDisplayService';

const makeCard = (cardNumber: number, status: 'completed' | 'failed' = 'completed'): DisplayCard => ({
  id: `card-${cardNumber}`,
  cardNumber,
  cardName: `Card ${cardNumber}`,
  imageUrl: status === 'completed' ? `https://example.com/${cardNumber}.jpg` : null,
  prompt: `Prompt for card ${cardNumber}`,
  status,
  generatedAt: new Date().toISOString(),
});

describe('DeckDisplayService', () => {
  const svc = new DeckDisplayService();

  describe('getDisplayCards', () => {
    it('returns cards sorted by cardNumber ascending', async () => {
      const cards = [makeCard(21), makeCard(0), makeCard(10), makeCard(5)];
      const result = await svc.getDisplayCards(cards);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.map(c => c.cardNumber)).toEqual([0, 5, 10, 21]);
      }
    });

    it('does not mutate the input array', async () => {
      const cards = [makeCard(21), makeCard(0)];
      const original = [...cards];
      await svc.getDisplayCards(cards);
      expect(cards[0].cardNumber).toBe(original[0].cardNumber);
    });

    it('returns empty array for empty input', async () => {
      const result = await svc.getDisplayCards([]);
      expect(result.success).toBe(true);
      if (result.success) expect(result.data).toHaveLength(0);
    });
  });

  describe('filterByStatus', () => {
    const mixed = [makeCard(0, 'completed'), makeCard(1, 'failed'), makeCard(2, 'completed')];

    it('filters to completed only', async () => {
      const result = await svc.filterByStatus(mixed, 'completed');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
        expect(result.data.every(c => c.status === 'completed')).toBe(true);
      }
    });

    it('filters to failed only', async () => {
      const result = await svc.filterByStatus(mixed, 'failed');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].status).toBe('failed');
      }
    });

    it('returns all cards for "all" filter', async () => {
      const result = await svc.filterByStatus(mixed, 'all');
      expect(result.success).toBe(true);
      if (result.success) expect(result.data).toHaveLength(3);
    });
  });
});
