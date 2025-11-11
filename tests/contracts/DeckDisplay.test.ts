/**
 * @fileoverview Contract tests for DeckDisplay seam
 * @purpose Validate DeckDisplayMock matches DeckDisplay contract exactly
 * @testStrategy
 * 1. Interface compliance - Mock implements interface
 * 2. Input validation - Handles valid/invalid inputs correctly
 * 3. Return types - Matches contract types exactly
 * 4. Error handling - Returns correct error codes
 * 5. CRUD operations - Save, get, update, delete work correctly
 */

import { describe, it, expect, beforeEach } from 'vitest'
import type {
  IDeckDisplayService,
  DeckData,
  DeckMetadata,
} from '$contracts/DeckDisplay'
import { deckDisplayMockService } from '$services/mock/DeckDisplayMock'

describe('DeckDisplay Contract Compliance', () => {
  let service: IDeckDisplayService

  beforeEach(async () => {
    service = deckDisplayMockService
    // Clear all decks before each test
    const decks = await service.listDecks()
    if (decks.success && decks.data) {
      for (const deck of decks.data) {
        await service.deleteDeck({ deckId: deck.id })
      }
    }
  })

  // Helper to create mock generated cards
  const createMockCards = (count: number) => {
    return Array.from({ length: count }, (_, i) => ({
      id: `card-${i}` as any,
      cardNumber: i as any,
      cardName: `Card ${i}`,
      prompt: `Prompt ${i}`,
      generationStatus: 'completed' as const,
      retryCount: 0,
      generatedAt: new Date(),
      imageUrl: `https://example.com/card-${i}.png`,
    }))
  }

  describe('Interface Implementation', () => {
    it('should implement IDeckDisplayService interface', () => {
      expect(service).toBeDefined()
      expect(service.saveDeck).toBeDefined()
      expect(typeof service.saveDeck).toBe('function')
      expect(service.getDeck).toBeDefined()
      expect(typeof service.getDeck).toBe('function')
      expect(service.updateDeck).toBeDefined()
      expect(typeof service.updateDeck).toBe('function')
      expect(service.deleteDeck).toBeDefined()
      expect(typeof service.deleteDeck).toBe('function')
      expect(service.listDecks).toBeDefined()
      expect(typeof service.listDecks).toBe('function')
    })
  })

  describe('saveDeck()', () => {
    it('should require cards array (1-22 cards)', async () => {
      const response = await service.saveDeck({
        cards: [],
        metadata: {
          name: 'Empty Deck',
          createdAt: new Date(),
          styleInput: {
            theme: 'Test',
            tone: 'Test',
            description: 'Test description',
          },
        },
      })

      expect(response.success).toBe(false)
      expect(response.error).toBeDefined()
    })

    it('should require deckMetadata with name, createdAt, styleInput', async () => {
      const cards = createMockCards(22)

      const response = await service.saveDeck({
        cards,
        metadata: {
          name: 'Test Deck',
          createdAt: new Date(),
          styleInput: {
            theme: 'Cyberpunk',
            tone: 'Dark',
            description: 'A neon-lit dystopian future',
          },
        },
      })

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      if (response.data) {
        expect(response.data.metadata.name).toBe('Test Deck')
        expect(response.data.metadata.createdAt).toBeInstanceOf(Date)
        expect(response.data.metadata.styleInput).toBeDefined()
      }
    })

    it('should return saved DeckData with id, cards, metadata', async () => {
      const cards = createMockCards(22)

      const response = await service.saveDeck({
        cards,
        metadata: {
          name: 'Gothic Deck',
          createdAt: new Date(),
          styleInput: {
            theme: 'Gothic',
            tone: 'Dark',
            description: 'Victorian supernatural',
          },
        },
      })

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      if (response.data) {
        expect(response.data.id).toBeTruthy()
        expect(response.data.cards).toHaveLength(22)
        expect(response.data.metadata).toBeDefined()
        expect(response.data.metadata.name).toBe('Gothic Deck')
      }
    })

    it('should accept 1-22 cards', async () => {
      const testCases = [1, 5, 10, 22]

      for (const count of testCases) {
        const cards = createMockCards(count)
        const response = await service.saveDeck({
          cards,
          metadata: {
            name: `Deck with ${count} cards`,
            createdAt: new Date(),
            styleInput: {
              theme: 'Test',
              tone: 'Test',
              description: 'Test description',
            },
          },
        })

        expect(response.success).toBe(true)
        expect(response.data?.cards).toHaveLength(count)
      }
    })
  })

  describe('getDeck()', () => {
    it('should return null when no deck saved', async () => {
      const response = await service.getDeck({ deckId: 'non-existent-id' })

      expect(response.success).toBe(false)
      expect(response.error?.code).toBe('DECK_NOT_FOUND')
    })

    it('should return saved deck after saveDeck()', async () => {
      const cards = createMockCards(22)
      const saveResponse = await service.saveDeck({
        cards,
        metadata: {
          name: 'Saved Deck',
          createdAt: new Date(),
          styleInput: {
            theme: 'Art Nouveau',
            tone: 'Mystical',
            description: 'Flowing organic forms',
          },
        },
      })

      expect(saveResponse.success).toBe(true)

      if (saveResponse.data) {
        const getResponse = await service.getDeck({ deckId: saveResponse.data.id })

        expect(getResponse.success).toBe(true)
        expect(getResponse.data).toBeDefined()
        if (getResponse.data) {
          expect(getResponse.data.id).toBe(saveResponse.data.id)
          expect(getResponse.data.cards).toHaveLength(22)
          expect(getResponse.data.metadata.name).toBe('Saved Deck')
        }
      }
    })
  })

  describe('updateDeck()', () => {
    it('should modify existing deck', async () => {
      const cards = createMockCards(22)
      const saveResponse = await service.saveDeck({
        cards,
        metadata: {
          name: 'Original Name',
          createdAt: new Date(),
          styleInput: {
            theme: 'Original',
            tone: 'Original',
            description: 'Original description',
          },
        },
      })

      expect(saveResponse.success).toBe(true)

      if (saveResponse.data) {
        const updateResponse = await service.updateDeck({
          deckId: saveResponse.data.id,
          updates: {
            metadata: {
              name: 'Updated Name',
              createdAt: saveResponse.data.metadata.createdAt,
              styleInput: saveResponse.data.metadata.styleInput,
            },
          },
        })

        expect(updateResponse.success).toBe(true)
        expect(updateResponse.data?.metadata.name).toBe('Updated Name')
      }
    })

    it('should return error if deck doesn not exist', async () => {
      const response = await service.updateDeck({
        deckId: 'non-existent',
        updates: {
          metadata: {
            name: 'Updated',
            createdAt: new Date(),
            styleInput: {
              theme: 'Test',
              tone: 'Test',
              description: 'Test',
            },
          },
        },
      })

      expect(response.success).toBe(false)
      expect(response.error?.code).toBe('DECK_NOT_FOUND')
    })
  })

  describe('deleteDeck()', () => {
    it('should remove deck', async () => {
      const cards = createMockCards(22)
      const saveResponse = await service.saveDeck({
        cards,
        metadata: {
          name: 'To Delete',
          createdAt: new Date(),
          styleInput: {
            theme: 'Test',
            tone: 'Test',
            description: 'Test description',
          },
        },
      })

      expect(saveResponse.success).toBe(true)

      if (saveResponse.data) {
        const deleteResponse = await service.deleteDeck({ deckId: saveResponse.data.id })

        expect(deleteResponse.success).toBe(true)

        const getResponse = await service.getDeck({ deckId: saveResponse.data.id })
        expect(getResponse.success).toBe(false)
      }
    })

    it('should return error for non-existent deck', async () => {
      const response = await service.deleteDeck({ deckId: 'non-existent' })

      expect(response.success).toBe(false)
      expect(response.error?.code).toBe('DECK_NOT_FOUND')
    })
  })

  describe('listDecks()', () => {
    it('should return array of DeckMetadata objects', async () => {
      const response = await service.listDecks()

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      expect(Array.isArray(response.data)).toBe(true)
    })

    it('should return empty array when no decks', async () => {
      const response = await service.listDecks()

      expect(response.success).toBe(true)
      expect(response.data).toHaveLength(0)
    })

    it('should list all saved decks', async () => {
      const cards1 = createMockCards(22)
      const cards2 = createMockCards(22)

      await service.saveDeck({
        cards: cards1,
        metadata: {
          name: 'Deck 1',
          createdAt: new Date(),
          styleInput: {
            theme: 'Theme1',
            tone: 'Tone1',
            description: 'Description1',
          },
        },
      })

      await service.saveDeck({
        cards: cards2,
        metadata: {
          name: 'Deck 2',
          createdAt: new Date(),
          styleInput: {
            theme: 'Theme2',
            tone: 'Tone2',
            description: 'Description2',
          },
        },
      })

      const response = await service.listDecks()

      expect(response.success).toBe(true)
      expect(response.data?.length).toBe(2)
    })

    it('should return metadata only (not full cards)', async () => {
      const cards = createMockCards(22)
      await service.saveDeck({
        cards,
        metadata: {
          name: 'Test Deck',
          createdAt: new Date(),
          styleInput: {
            theme: 'Test',
            tone: 'Test',
            description: 'Test',
          },
        },
      })

      const response = await service.listDecks()

      if (response.success && response.data && response.data[0]) {
        const metadata = response.data[0]
        expect(metadata.id).toBeTruthy()
        expect(metadata.name).toBeTruthy()
        expect(metadata.createdAt).toBeInstanceOf(Date)
        // Should not include full cards array
        expect(metadata).not.toHaveProperty('cards')
      }
    })
  })

  describe('Return Types', () => {
    it('should match contract types exactly', async () => {
      const cards = createMockCards(22)

      const saveResponse = await service.saveDeck({
        cards,
        metadata: {
          name: 'Test Deck',
          createdAt: new Date(),
          styleInput: {
            theme: 'Test',
            tone: 'Test',
            description: 'Test description',
          },
        },
      })

      expect(saveResponse).toHaveProperty('success')
      if (saveResponse.success && saveResponse.data) {
        expect(saveResponse.data).toHaveProperty('id')
        expect(saveResponse.data).toHaveProperty('cards')
        expect(saveResponse.data).toHaveProperty('metadata')
        expect(saveResponse.data.metadata).toHaveProperty('name')
        expect(saveResponse.data.metadata).toHaveProperty('createdAt')
        expect(saveResponse.data.metadata).toHaveProperty('styleInput')
      }
    })
  })

  describe('Async Behavior', () => {
    it('should return promises for all methods', () => {
      const cards = createMockCards(1)
      const metadata = {
        name: 'Test',
        createdAt: new Date(),
        styleInput: {
          theme: 'Test',
          tone: 'Test',
          description: 'Test',
        },
      }

      expect(service.saveDeck({ cards, metadata })).toBeInstanceOf(Promise)
      expect(service.getDeck({ deckId: 'test' })).toBeInstanceOf(Promise)
      expect(service.updateDeck({ deckId: 'test', updates: { metadata } })).toBeInstanceOf(
        Promise
      )
      expect(service.deleteDeck({ deckId: 'test' })).toBeInstanceOf(Promise)
      expect(service.listDecks()).toBeInstanceOf(Promise)
    })
  })
})
