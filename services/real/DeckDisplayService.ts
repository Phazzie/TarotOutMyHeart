/**
 * DeckDisplayService — real implementation.
 * Pure functions. Sorts and filters GeneratedCard arrays.
 * Design: never mutates the input array.
 */

// Minimal card shape this service cares about — compatible with the full GeneratedCard contract.
export interface DisplayCard {
  cardNumber: number;
  status: 'completed' | 'failed';
  [key: string]: unknown;
}

type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

export class DeckDisplayService {
  /**
   * Returns a new array sorted by cardNumber ascending (0 → 21).
   * Never mutates the input.
   */
  async getDisplayCards<T extends DisplayCard>(cards: T[]): Promise<ServiceResult<T[]>> {
    const sorted = [...cards].sort((a, b) => a.cardNumber - b.cardNumber);
    return { success: true, data: sorted };
  }

  /**
   * Filters cards by status.
   * @param status 'completed' | 'failed' | 'all'
   */
  async filterByStatus<T extends DisplayCard>(
    cards: T[],
    status: 'completed' | 'failed' | 'all',
  ): Promise<ServiceResult<T[]>> {
    if (status === 'all') {
      return { success: true, data: [...cards] };
    }
    const filtered = cards.filter((c) => c.status === status);
    return { success: true, data: filtered };
  }
}
