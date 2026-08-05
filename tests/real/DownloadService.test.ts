/**
 * @fileoverview TDD tests for DownloadService (real implementation).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DownloadService } from '../../services/real/DownloadService'
import type { GeneratedCard, GeneratedCardId } from '$contracts/ImageGeneration'
import type { StyleInputs } from '$contracts/StyleInput'

vi.mock('jszip', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      file: vi.fn(),
      generateAsync: vi.fn().mockResolvedValue(new Blob(['zip-content'])),
    })),
  }
})

const makeCompletedCard = (n: number): GeneratedCard => ({
  id: `card-${n}` as GeneratedCardId,
  cardNumber: n as any,
  cardName: `Card ${n}`,
  prompt: `Prompt ${n}`,
  imageUrl: `https://blob.vercel.com/card${n}.png`,
  generationStatus: 'completed',
  generatedAt: new Date(),
  retryCount: 0,
})

const styleInputs: StyleInputs = {
  theme: 'Gothic',
  tone: 'Dark',
  description: 'Test description for tarot deck',
}

describe('DownloadService', () => {
  let svc: DownloadService

  beforeEach(() => {
    svc = new DownloadService()
    vi.clearAllMocks()
  })

  describe('SSR safety', () => {
    it('returns error when window is undefined', async () => {
      const origWindow = global.window
      // @ts-expect-error simulating SSR environment
      delete global.window
      const ssrSvc = new DownloadService()
      const result = await ssrSvc.downloadDeck({
        generatedCards: [makeCompletedCard(0)],
        styleInputs,
      })
      expect(result.success).toBe(false)
      global.window = origWindow
    })
  })

  describe('downloadDeck — browser context', () => {
    beforeEach(() => {
      global.URL.createObjectURL = vi.fn().mockReturnValue('blob:fake-url')
      global.URL.revokeObjectURL = vi.fn()

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          blob: () => Promise.resolve(new Blob(['fake-image-data'], { type: 'image/png' })),
        })
      )

      const mockAnchor = {
        href: '',
        download: '',
        click: vi.fn(),
        remove: vi.fn(),
        style: {},
      }
      vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as unknown as HTMLElement)
      vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockAnchor as unknown as Node)
    })

    it('returns success with correct counts for completed cards', async () => {
      const cards = [makeCompletedCard(0), makeCompletedCard(1)]
      const result = await svc.downloadDeck({ generatedCards: cards, styleInputs })
      expect(result.success).toBe(true)
      if (result.success && result.data) {
        expect(result.data.cardCount).toBe(2)
      }
    })

    it('returns error when generatedCards is empty', async () => {
      const result = await svc.downloadDeck({ generatedCards: [], styleInputs })
      expect(result.success).toBe(false)
    })
  })
})
