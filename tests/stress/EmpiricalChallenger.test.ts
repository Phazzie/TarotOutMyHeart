/**
 * @fileoverview Empirical Challenger & Stress Tests
 * @purpose Stress test AbortController cancellation, duplicate image detection,
 *          download deck format validation & metadata JSON, Svelte 5 Map reactivity,
 *          cost formatting branching, prompt regeneration proxying, and localStorage resilience.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ImageGenerationService } from '../../services/real/ImageGenerationService'
import { ImageUploadService } from '../../services/real/ImageUploadService'
import { DownloadService } from '../../services/real/DownloadService'
import { CostCalculationService } from '../../services/real/CostCalculationService'
import { PromptGenerationService } from '../../services/real/PromptGenerationService'
import { StyleInputService } from '../../services/real/StyleInputService'
import { GROK_IMAGE_MODEL } from '../../contracts/ImageGeneration'
import { type CardPrompt } from '../../contracts/PromptGeneration'
import { ImageUploadErrorCode } from '../../contracts/ImageUpload'
import { DownloadErrorCode } from '../../contracts/Download'
import JSZip from 'jszip'

describe('Empirical Challenger Stress Test Suite', () => {
  // ==========================================================================
  // TARGET 1: AbortController Cancellation & Model Pricing in ImageGenerationService
  // ==========================================================================
  describe('Target 1: ImageGenerationService AbortController Cancellation & Pricing', () => {
    let service: ImageGenerationService
    let mockPrompts: CardPrompt[]

    beforeEach(() => {
      service = new ImageGenerationService()
      mockPrompts = Array.from({ length: 5 }, (_, i) => ({
        id: `prompt-${i}` as any,
        cardNumber: i as any,
        cardName: `Card ${i}`,
        traditionalMeaning: `Meaning ${i}`,
        generatedPrompt: `A vibrant tarot card prompt for card ${i}`,
        confidence: 0.95,
        generatedAt: new Date(),
      }))
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('Scenario 1.1: Immediate abort before first fetch completes', async () => {
      let fetchCallCount = 0

      // Mock fetch with artificial latency
      vi.spyOn(globalThis, 'fetch').mockImplementation((_url, init) => {
        fetchCallCount++
        const signal = init?.signal
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            resolve(
              new Response(
                JSON.stringify({
                  success: true,
                  data: { imageUrl: 'https://storage.example.com/card.png' },
                }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
              )
            )
          }, 100)

          signal?.addEventListener('abort', () => {
            clearTimeout(timeout)
            const err = new Error('The user aborted a request.')
            err.name = 'AbortError'
            reject(err)
          })
        })
      })

      // Start generation and immediately cancel
      const genPromise = service.generateImages({
        prompts: mockPrompts,
      })

      // Immediate cancel call
      const cancelRes = await service.cancelGeneration({ sessionId: 'session-test' })
      expect(cancelRes.success).toBe(true)
      expect(cancelRes.data?.canceled).toBe(true)

      const result = await genPromise
      expect(result.success).toBe(true)
      expect(result.data?.fullySuccessful).toBe(false)
      // Since it was cancelled immediately, 0 completed
      expect(result.data?.totalUsage.successfulImages).toBe(0)
      // Verify no zombie retries took place
      expect(fetchCallCount).toBeLessThanOrEqual(1)
    })

    it('Scenario 1.2: Delayed abort during middle of multi-card batch with simulated latency', async () => {
      let fetchCallCount = 0
      const fetchedCards: number[] = []

      vi.spyOn(globalThis, 'fetch').mockImplementation((_url, init) => {
        fetchCallCount++
        const body = JSON.parse(init?.body as string)
        fetchedCards.push(body.cardNumber)
        const signal = init?.signal

        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            resolve(
              new Response(
                JSON.stringify({
                  success: true,
                  data: { imageUrl: `https://storage.example.com/card-${body.cardNumber}.png` },
                }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
              )
            )
          }, 60)

          signal?.addEventListener('abort', () => {
            clearTimeout(timeout)
            const err = new Error('The user aborted a request.')
            err.name = 'AbortError'
            reject(err)
          })
        })
      })

      const progressSnapshots: any[] = []
      const genPromise = service.generateImages({
        prompts: mockPrompts, // 5 cards
        onProgress: p => progressSnapshots.push({ ...p }),
      })

      // Wait until card 0 finishes (~60ms) and card 1 is in-flight (~90ms), then cancel
      await new Promise(r => setTimeout(r, 90))
      const cancelRes = await service.cancelGeneration({ sessionId: 'session-test' })
      expect(cancelRes.success).toBe(true)

      const result = await genPromise
      expect(result.success).toBe(true)
      expect(result.data?.fullySuccessful).toBe(false)
      // Only card 0 should be completed
      expect(result.data?.generatedCards.length).toBe(1)
      expect(result.data?.totalUsage.successfulImages).toBe(1)
      // Cards 2, 3, 4 must never have been requested
      expect(fetchedCards).not.toContain(2)
      expect(fetchedCards).not.toContain(3)
      expect(fetchedCards).not.toContain(4)
      // Check final progress status indicates cancellation
      const lastProgress = progressSnapshots[progressSnapshots.length - 1]
      expect(lastProgress?.status).toContain('canceled')
    })

    it('Scenario 1.3: Abort on in-flight request prevents retry attempts', async () => {
      let attempts = 0

      vi.spyOn(globalThis, 'fetch').mockImplementation((_url, init) => {
        attempts++
        const signal = init?.signal
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            resolve(
              new Response(
                JSON.stringify({
                  success: true,
                  data: { imageUrl: 'https://storage.example.com/card.png' },
                }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
              )
            )
          }, 200)

          signal?.addEventListener('abort', () => {
            clearTimeout(timeout)
            const err = new Error('The user aborted a request.')
            err.name = 'AbortError'
            reject(err)
          })
        })
      })

      const genPromise = service.generateImages({
        prompts: mockPrompts.slice(0, 3),
      })

      // Cancel after 20ms during first card fetch
      await new Promise(r => setTimeout(r, 20))
      await service.cancelGeneration({ sessionId: 'session-test' })

      const result = await genPromise
      expect(result.success).toBe(true)
      expect(result.data?.fullySuccessful).toBe(false)
      // Should terminate immediately on abort with exactly 1 attempt, not retry 3 times
      expect(attempts).toBe(1)
    })

    it('Scenario 1.4: saveToStorage parameter is propagated correctly to API payload', async () => {
      let capturedPayload: any = null

      vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
        capturedPayload = JSON.parse(init?.body as string)
        return new Response(
          JSON.stringify({
            success: true,
            data: { imageUrl: 'https://storage.example.com/card.png' },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      })

      await service.generateImages({
        prompts: mockPrompts.slice(0, 1),
        saveToStorage: true,
      })

      expect(capturedPayload).not.toBeNull()
      expect(capturedPayload.saveToStorage).toBe(true)
    })

    it('Scenario 1.5: Model default is grok-imagine-image-2.0 and pricing is $0.02 per card', async () => {
      expect(GROK_IMAGE_MODEL).toBe('grok-imagine-image-2.0')

      const estimate = await service.estimateCost({ imageCount: 22 })
      expect(estimate.success).toBe(true)
      expect(estimate.data?.costPerImage).toBe(0.02)
      expect(estimate.data?.totalEstimatedCost).toBe(0.44)
    })
  })

  // ==========================================================================
  // TARGET 2: Duplicate Image Upload Detection Edge Cases
  // ==========================================================================
  describe('Target 2: Duplicate Image Upload Detection Edge Cases', () => {
    let service: ImageUploadService

    beforeEach(() => {
      service = new ImageUploadService()
      // Mock fetch for upload API
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: { url: 'https://storage.example.com/mock-upload.png' },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    function createMockFile(
      name: string,
      size: number,
      type: string = 'image/png',
      lastModified: number = 1700000000000
    ): File {
      const buffer = new Uint8Array(size)
      const file = new File([buffer], name, { type, lastModified })
      Object.defineProperty(file, 'size', { value: size })
      Object.defineProperty(file, 'lastModified', { value: lastModified })
      return file
    }

    it('Scenario 2.1: Identical file names with DIFFERENT byte sizes are ALLOWED', async () => {
      const file1 = createMockFile('card-art.png', 1024, 'image/png', 1700000000000)
      const file2 = createMockFile('card-art.png', 2048, 'image/png', 1700000000000)

      const result = await service.uploadImages({ files: [file1, file2] })

      expect(result.success).toBe(true)
      expect(result.data?.totalUploaded).toBe(2)
      expect(result.data?.totalFailed).toBe(0)
      expect(result.data?.uploadedImages.length).toBe(2)
    })

    it('Scenario 2.2: Identical file names, SAME size, DIFFERENT lastModified timestamps are ALLOWED', async () => {
      const file1 = createMockFile('hero.png', 5000, 'image/png', 1700000001000)
      const file2 = createMockFile('hero.png', 5000, 'image/png', 1700000009999)

      const result = await service.uploadImages({ files: [file1, file2] })

      expect(result.success).toBe(true)
      expect(result.data?.totalUploaded).toBe(2)
      expect(result.data?.totalFailed).toBe(0)
    })

    it('Scenario 2.3: Identical file names, SAME size, SAME lastModified timestamps are REJECTED as duplicates', async () => {
      const file1 = createMockFile('duplicate.png', 4096, 'image/png', 1700000000000)
      const file2 = createMockFile('duplicate.png', 4096, 'image/png', 1700000000000)

      const result = await service.uploadImages({ files: [file1, file2] })

      expect(result.success).toBe(true)
      expect(result.data?.totalUploaded).toBe(1)
      expect(result.data?.totalFailed).toBe(1)
      expect(result.data?.failedImages[0]?.code).toBe(ImageUploadErrorCode.DUPLICATE_IMAGE)
      expect(result.data?.failedImages[0]?.fileName).toBe('duplicate.png')
    })

    it('Scenario 2.4: DIFFERENT file names with IDENTICAL byte sizes and timestamps are ALLOWED', async () => {
      const file1 = createMockFile('card_a.png', 3000, 'image/png', 1700000000000)
      const file2 = createMockFile('card_b.png', 3000, 'image/png', 1700000000000)

      const result = await service.uploadImages({ files: [file1, file2] })

      expect(result.success).toBe(true)
      expect(result.data?.totalUploaded).toBe(2)
      expect(result.data?.totalFailed).toBe(0)
    })

    it('Scenario 2.5: Sequential duplicate detection across separate uploadImages calls', async () => {
      const file1 = createMockFile('solo.png', 8192, 'image/png', 1700000000000)
      const file1Copy = createMockFile('solo.png', 8192, 'image/png', 1700000000000)

      const call1 = await service.uploadImages({ files: [file1] })
      expect(call1.data?.totalUploaded).toBe(1)

      const call2 = await service.uploadImages({ files: [file1Copy] })
      expect(call2.data?.totalUploaded).toBe(0)
      expect(call2.data?.totalFailed).toBe(1)
      expect(call2.data?.failedImages[0]?.code).toBe(ImageUploadErrorCode.DUPLICATE_IMAGE)
    })
  })

  // ==========================================================================
  // TARGET 3: Download Deck Format Constraints & Deck Metadata JSON
  // ==========================================================================
  describe('Target 3: Download Deck Format Constraints & Deck Metadata JSON', () => {
    let service: DownloadService
    let mockCards: any[]
    let mockStyleInputs: any

    beforeEach(() => {
      service = new DownloadService()
      mockCards = Array.from({ length: 3 }, (_, i) => ({
        id: `card-${i}`,
        cardNumber: i,
        cardName: `Card ${i}`,
        prompt: `Prompt ${i}`,
        imageUrl: `https://storage.example.com/card-${i}.png`,
        generationStatus: 'completed',
        generatedAt: new Date(),
        retryCount: 0,
      }))

      mockStyleInputs = {
        theme: 'Gothic Mysticism',
        tone: 'Dark Gold',
        description: 'Antique gothic tarot with celestial filigree',
        concept: 'Transformation and mystery',
        characters: 'Ethereal figures',
      }

      // Mock browser fetch for card image blobs
      vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
        const dummyPng = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])
        return new Response(dummyPng, {
          status: 200,
          headers: { 'Content-Type': 'image/png' },
        })
      })

      // Mock URL.createObjectURL and URL.revokeObjectURL
      if (typeof window !== 'undefined') {
        window.URL.createObjectURL = vi.fn(() => 'blob:mock-url-123')
        window.URL.revokeObjectURL = vi.fn()
      }
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('Scenario 3.1: Valid format "zip" packages images and includes valid deck-metadata.json', async () => {
      let zipInstance: JSZip | null = null
      const originalGenerateAsync = JSZip.prototype.generateAsync

      vi.spyOn(JSZip.prototype, 'generateAsync').mockImplementation(function (this: JSZip, options) {
        zipInstance = this
        return originalGenerateAsync.call(this, options)
      })

      const res = await service.downloadDeck({
        generatedCards: mockCards,
        styleInputs: mockStyleInputs,
        deckName: 'Mystic Deck',
        format: 'zip',
        includeMetadata: true,
      })

      expect(res.success).toBe(true)
      expect(res.data?.downloaded).toBe(true)
      expect(res.data?.includedMetadata).toBe(true)
      expect(res.data?.filename).toBe('mystic-deck.zip')

      // Verify ZIP contents
      expect(zipInstance).not.toBeNull()
      if (zipInstance) {
        const metadataFile = (zipInstance as JSZip).file('deck-metadata.json')
        expect(metadataFile).not.toBeNull()
        const metaText = await metadataFile!.async('string')
        const parsedMeta = JSON.parse(metaText)

        // Validate JSON Schema
        expect(parsedMeta).toHaveProperty('generatedAt')
        expect(parsedMeta).toHaveProperty('deckName', 'Mystic Deck')
        expect(parsedMeta).toHaveProperty('styleInputs')
        expect(parsedMeta.styleInputs.theme).toBe('Gothic Mysticism')
        expect(parsedMeta).toHaveProperty('cardCount', 3)
        expect(parsedMeta).toHaveProperty('version', '1.0.0')
      }
    })

    it('Scenario 3.2: Valid format "individual" handles card downloads and metadata JSON anchor', async () => {
      let createdAnchors: HTMLAnchorElement[] = []
      const originalCreateElement = document.createElement.bind(document)

      vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        const el = originalCreateElement(tagName)
        if (tagName.toLowerCase() === 'a') {
          createdAnchors.push(el as HTMLAnchorElement)
        }
        return el
      })

      const res = await service.downloadDeck({
        generatedCards: mockCards,
        styleInputs: mockStyleInputs,
        deckName: 'Solo Deck',
        format: 'individual',
        includeMetadata: true,
      })

      expect(res.success).toBe(true)
      expect(res.data?.downloaded).toBe(true)
      expect(res.data?.filename).toBe('solo-deck-individual')

      // Verify download anchors triggered for all cards + deck-metadata.json
      const downloadedFiles = createdAnchors.map(a => a.download)
      expect(downloadedFiles).toContain('00-card-0.png')
      expect(downloadedFiles).toContain('01-card-1.png')
      expect(downloadedFiles).toContain('02-card-2.png')
      expect(downloadedFiles).toContain('deck-metadata.json')
    })

    it('Scenario 3.3: Invalid formats ("tar", "pdf", "rar", "7z", "custom") are rejected with INVALID_FORMAT', async () => {
      const invalidFormats = ['tar', 'pdf', 'rar', '7z', 'custom', 'iso']

      for (const fmt of invalidFormats) {
        const res = await service.downloadDeck({
          generatedCards: mockCards,
          styleInputs: mockStyleInputs,
          format: fmt as any,
        })

        expect(res.success).toBe(false)
        expect(res.error?.code).toBe(DownloadErrorCode.INVALID_FORMAT)
      }
    })

    it('Scenario 3.4: includeMetadata: false omits deck-metadata.json from zip', async () => {
      let zipInstance: JSZip | null = null
      const originalGenerateAsync = JSZip.prototype.generateAsync

      vi.spyOn(JSZip.prototype, 'generateAsync').mockImplementation(function (this: JSZip, options) {
        zipInstance = this
        return originalGenerateAsync.call(this, options)
      })

      const res = await service.downloadDeck({
        generatedCards: mockCards,
        styleInputs: mockStyleInputs,
        format: 'zip',
        includeMetadata: false,
      })

      expect(res.success).toBe(true)
      expect(res.data?.includedMetadata).toBe(false)

      if (zipInstance) {
        const metadataFile = (zipInstance as JSZip).file('deck-metadata.json')
        expect(metadataFile).toBeNull()
      }
    })
  })

  // ==========================================================================
  // TARGET 4: Svelte 5 Map Reactivity & Cost Calculation Format Branching
  // ==========================================================================
  describe('Target 4: Svelte 5 Map Reactivity & Cost Calculation Format Branching', () => {
    let costService: CostCalculationService

    beforeEach(() => {
      costService = new CostCalculationService()
    })

    it('Scenario 4.1: Cost formatting branching ("detailed", "summary", "minimal")', async () => {
      const cost = 0.44

      // Detailed
      const detailedRes = await costService.formatCost({ cost, format: 'detailed' })
      expect(detailedRes.success).toBe(true)
      expect(detailedRes.data?.formatted).toBe('Total: $0.44')

      // Summary
      const summaryRes = await costService.formatCost({ cost, format: 'summary' })
      expect(summaryRes.success).toBe(true)
      expect(summaryRes.data?.formatted).toBe('$0.44')

      // Minimal
      const minimalRes = await costService.formatCost({ cost, format: 'minimal' })
      expect(minimalRes.success).toBe(true)
      expect(minimalRes.data?.formatted).toBe('~$0')

      // Minimal with larger number
      const minimalRes2 = await costService.formatCost({ cost: 1.85, format: 'minimal' })
      expect(minimalRes2.success).toBe(true)
      expect(minimalRes2.data?.formatted).toBe('~$2')

      // Default (when format is not specified)
      const defaultRes = await costService.formatCost({ cost })
      expect(defaultRes.success).toBe(true)
      expect(defaultRes.data?.formatted).toBe('$0.44')
    })

    it('Scenario 4.2: Cost warning thresholds across boundaries', async () => {
      // Nominal (< 5.00)
      const nominal = await costService.formatCost({ cost: 0.44, includeWarning: true })
      expect(nominal.data?.warningLevel).toBe('none')
      expect(nominal.data?.warningMessage).toBeUndefined()

      // Warning (>= 5.00 and < 10.00)
      const warning = await costService.formatCost({ cost: 6.50, includeWarning: true })
      expect(warning.data?.warningLevel).toBe('warning')
      expect(warning.data?.warningMessage).toContain('above normal range')

      // High (>= 10.00 and < 20.00)
      const high = await costService.formatCost({ cost: 12.00, includeWarning: true })
      expect(high.data?.warningLevel).toBe('high')
      expect(high.data?.warningMessage).toContain('High cost alert')

      // Maximum (>= 20.00)
      const max = await costService.formatCost({ cost: 25.00, includeWarning: true })
      expect(max.data?.warningLevel).toBe('maximum')
      expect(max.data?.warningMessage).toContain('exceeds maximum allowed')
    })

    it('Scenario 4.3: Svelte 5 Map immutability pattern verification', () => {
      // Simulate PromptListComponent Map reassignment pattern:
      let editedPromptTexts = new Map<number, string>()
      const initialRef = editedPromptTexts

      // Update text
      editedPromptTexts.set(0, 'Updated The Fool Prompt')
      editedPromptTexts = new Map(editedPromptTexts)

      // Reference must change for Svelte 5 $state trigger
      expect(editedPromptTexts).not.toBe(initialRef)
      expect(editedPromptTexts.get(0)).toBe('Updated The Fool Prompt')

      // Delete text
      const secondRef = editedPromptTexts
      editedPromptTexts.delete(0)
      editedPromptTexts = new Map(editedPromptTexts)

      expect(editedPromptTexts).not.toBe(secondRef)
      expect(editedPromptTexts.has(0)).toBe(false)
    })
  })

  // ==========================================================================
  // TARGET 5: Prompt Regeneration Proxy & LocalStorage Hardening
  // ==========================================================================
  describe('Target 5: Prompt Regeneration Proxy & LocalStorage Hardening', () => {
    let promptService: PromptGenerationService
    let styleService: StyleInputService

    beforeEach(() => {
      promptService = new PromptGenerationService()
      styleService = new StyleInputService()
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('Scenario 5.1: Prompt regeneration routes through AI proxy /api/prompts with full payload', async () => {
      let capturedUrl = ''
      let capturedBody: any = null

      vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
        capturedUrl = url.toString()
        capturedBody = JSON.parse(init?.body as string)

        return new Response(
          JSON.stringify({
            success: true,
            data: {
              prompt: {
                id: 'prompt-fool-regen',
                cardNumber: 0,
                cardName: 'The Fool',
                traditionalMeaning: 'Beginnings, innocence, spontaneity',
                generatedPrompt: 'Regenerated fool prompt with starry cloak',
                confidence: 0.98,
              },
              usage: {
                promptTokens: 200,
                completionTokens: 150,
                totalTokens: 350,
                estimatedCost: 0.002,
              },
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      })

      const res = await promptService.regeneratePrompt({
        cardNumber: 0,
        referenceImageUrls: ['https://example.com/ref.png'],
        styleInputs: {
          theme: 'Celestial',
          tone: 'Mystical',
          description: 'Deep indigo and gold celestial aesthetic',
        },
        previousPrompt: 'Old fool prompt',
        feedback: 'Make it more cosmic',
      })

      expect(res.success).toBe(true)
      expect(capturedUrl).toBe('/api/prompts')
      expect(capturedBody.cardNumber).toBe(0)
      expect(capturedBody.previousPrompt).toBe('Old fool prompt')
      expect(capturedBody.feedback).toBe('Make it more cosmic')
      expect(res.data?.cardPrompt.generatedPrompt).toBe('Regenerated fool prompt with starry cloak')
    })

    it('Scenario 5.2: StyleInputService safely suppresses localStorage QuotaExceededError and SecurityError exceptions', async () => {
      // Mock window.localStorage throwing exceptions
      const throwingStorage: Storage = {
        length: 0,
        clear: vi.fn(() => {
          throw new DOMException('Security error', 'SecurityError')
        }),
        getItem: vi.fn(() => {
          throw new DOMException('Quota error', 'QuotaExceededError')
        }),
        key: vi.fn(() => null),
        removeItem: vi.fn(() => {
          throw new DOMException('Security error', 'SecurityError')
        }),
        setItem: vi.fn(() => {
          throw new DOMException('Quota exceeded', 'QuotaExceededError')
        }),
      }

      vi.spyOn(window, 'localStorage', 'get').mockReturnValue(throwingStorage)

      // saveStyleInputs with saveAsDraft: true
      const saveRes = await styleService.saveStyleInputs({
        styleInputs: {
          theme: 'Solar Punk',
          tone: 'Bright',
          description: 'Verdant eco-futuristic tarot cards with sunlight',
        },
        saveAsDraft: true,
      })
      expect(saveRes.success).toBe(true)
      expect(saveRes.data?.saved).toBe(true)

      // loadStyleInputs with loadFromDraft: true
      const loadRes = await styleService.loadStyleInputs({ loadFromDraft: true })
      expect(loadRes.success).toBe(true)
      expect(loadRes.data?.found).toBe(false)

      // clearDraft
      const clearRes = await styleService.clearDraft()
      expect(clearRes.success).toBe(true)
    })
  })
})
