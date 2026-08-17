/**
 * @fileoverview Empirical Challenger Stress Test Suite.
 * Rigorously tests edge cases, failure modes, boundary conditions, and sandbox restrictions.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const { mockChatCreate, mockImagesGenerate, mockBlobPut } = vi.hoisted(() => ({
  mockChatCreate: vi.fn(),
  mockImagesGenerate: vi.fn(),
  mockBlobPut: vi.fn(),
}))

vi.mock('openai', () => {
  return {
    default: class {
      chat = {
        completions: {
          create: mockChatCreate,
        },
      }
      images = {
        generate: mockImagesGenerate,
      }
    },
  }
})

vi.mock('@vercel/blob', () => {
  return {
    put: mockBlobPut,
  }
})

import { StyleInputService, STORAGE_KEY } from '../services/real/StyleInputService'
import { PromptGenerationService } from '../services/real/PromptGenerationService'
import { ImageGenerationService } from '../services/real/ImageGenerationService'
import { CostCalculationService } from '../services/real/CostCalculationService'
import { DownloadService } from '../services/real/DownloadService'
import { ImageUploadService } from '../services/real/ImageUploadService'
import { POST as promptPostHandler } from '../src/routes/api/prompts/+server'
import { POST as cardGeneratePostHandler } from '../src/routes/api/generate/card/+server'
import { DEFAULT_STYLE_INPUTS } from '$contracts/StyleInput'
import { PromptGenerationErrorCode, type CardNumber, type CardPrompt, type PromptId } from '$contracts/PromptGeneration'
import { type GeneratedCard, type GeneratedCardId } from '$contracts/ImageGeneration'
import { CostCalculationErrorCode } from '$contracts/CostCalculation'
import { DownloadErrorCode } from '$contracts/Download'

const makePrompt = (cardNumber: number): CardPrompt => ({
  id: `prompt-${cardNumber}` as PromptId,
  cardNumber: cardNumber as CardNumber,
  cardName: `Card ${cardNumber}`,
  traditionalMeaning: `Meaning ${cardNumber}`,
  generatedPrompt: `Image prompt for card ${cardNumber}`,
  confidence: 0.9,
  generatedAt: new Date(),
})

const makeCard = (cardNumber: number, status: 'completed' | 'failed' = 'completed'): GeneratedCard => ({
  id: `card-${cardNumber}` as GeneratedCardId,
  cardNumber: cardNumber as CardNumber,
  cardName: `Card ${cardNumber}`,
  prompt: `Prompt for card ${cardNumber}`,
  imageUrl: status === 'completed' ? `https://blob.vercel.com/card${cardNumber}.png` : undefined,
  imageDataUrl: status === 'completed' ? `data:image/png;base64,mock${cardNumber}` : undefined,
  generationStatus: status,
  retryCount: 0,
})

const makeFile = (name: string, type: string, sizeBytes: number, lastModified?: number): File => {
  const buffer = new ArrayBuffer(sizeBytes)
  return new File([buffer], name, { type, lastModified: lastModified ?? 1700000000000 })
}

describe('CHALLENGER 2: Empirical Stress Test Suite', () => {
  // ==========================================================================
  // 1. StyleInputService Sandbox & LocalStorage Throw Scenarios
  // ==========================================================================
  describe('1. StyleInputService LocalStorage Hardening & Exception Recovery', () => {
    let service: StyleInputService

    beforeEach(() => {
      localStorage.clear()
      vi.restoreAllMocks()
      service = new StyleInputService()
    })

    it('handles window.localStorage getter throwing a SecurityError (restricted sandbox iframe)', async () => {
      const originalDescriptor = Object.getOwnPropertyDescriptor(window, 'localStorage')
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new DOMException('Access denied in sandbox', 'SecurityError')
        },
        configurable: true,
      })

      try {
        expect(service.isSSR()).toBe(true)

        const loadRes = await service.loadStyleInputs({ loadFromDraft: true })
        expect(loadRes.success).toBe(true)
        expect(loadRes.data?.found).toBe(false)
        expect(loadRes.data?.loadedFrom).toBe('default')

        const saveRes = await service.saveStyleInputs({
          styleInputs: {
            theme: 'Cyberpunk',
            tone: 'Dark',
            description: 'Neon futuristic city with cybernetic elements',
          },
          saveAsDraft: true,
        })
        expect(saveRes.success).toBe(true)
        expect(saveRes.data?.saved).toBe(true)

        const clearRes = await service.clearDraft()
        expect(clearRes.success).toBe(true)
      } finally {
        if (originalDescriptor) {
          Object.defineProperty(window, 'localStorage', originalDescriptor)
        }
      }
    })

    it('handles localStorage.getItem throwing QuotaExceededError or DOMException', async () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new DOMException('Storage read error', 'QuotaExceededError')
      })

      const loadRes = await service.loadStyleInputs({ loadFromDraft: true })
      expect(loadRes.success).toBe(true)
      expect(loadRes.data?.found).toBe(false)
      expect(loadRes.data?.loadedFrom).toBe('default')
      expect(loadRes.data?.styleInputs?.theme).toBe(DEFAULT_STYLE_INPUTS.theme)
    })

    it('handles localStorage.setItem throwing QuotaExceededError during saveStyleInputs', async () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('The quota has been exceeded.', 'QuotaExceededError')
      })

      const saveRes = await service.saveStyleInputs({
        styleInputs: {
          theme: 'Mythological',
          tone: 'Mystic',
          description: 'Ancient Greek deities amidst stormy Olympus.',
        },
        saveAsDraft: true,
      })

      // Must succeed gracefully without blowing up the application
      expect(saveRes.success).toBe(true)
      expect(saveRes.data?.saved).toBe(true)
      expect(saveRes.data?.savedToDraft).toBe(true)
    })

    it('handles corrupted JSON or invalid data types in localStorage during loadStyleInputs', async () => {
      localStorage.setItem(STORAGE_KEY, '<<<MALFORMED JSON!>>>')
      const loadRes1 = await service.loadStyleInputs({ loadFromDraft: true })
      expect(loadRes1.success).toBe(true)
      expect(loadRes1.data?.found).toBe(false)
      expect(loadRes1.data?.loadedFrom).toBe('default')

      localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme: 12345, tone: null }))
      const loadRes2 = await service.loadStyleInputs({ loadFromDraft: true })
      expect(loadRes2.success).toBe(true)
      expect(loadRes2.data?.found).toBe(false)
      expect(loadRes2.data?.loadedFrom).toBe('default')

      localStorage.setItem(STORAGE_KEY, JSON.stringify(['array', 'instead', 'of', 'object']))
      const loadRes3 = await service.loadStyleInputs({ loadFromDraft: true })
      expect(loadRes3.success).toBe(true)
      expect(loadRes3.data?.found).toBe(false)
      expect(loadRes3.data?.loadedFrom).toBe('default')
    })
  })

  // ==========================================================================
  // 2. Prompt Regeneration Proxy Endpoint & Service
  // ==========================================================================
  describe('2. Prompt Regeneration Proxy & Service Hardening', () => {
    let promptService: PromptGenerationService
    const originalEnv = { ...process.env }

    beforeEach(() => {
      promptService = new PromptGenerationService()
      mockChatCreate.mockReset()
      mockImagesGenerate.mockReset()
      mockBlobPut.mockReset()
      process.env['XAI_API_KEY'] = 'test-valid-xai-key'
    })

    afterEach(() => {
      process.env = { ...originalEnv }
    })

    describe('/api/prompts server endpoint handler directly', () => {
      it('rejects invalid / non-JSON requests with 400', async () => {
        const req = new Request('http://localhost/api/prompts', {
          method: 'POST',
          body: 'Not a JSON',
        })
        const res = await promptPostHandler({ request: req } as any)
        expect(res.status).toBe(400)
        const json = await res.json()
        expect(json.success).toBe(false)
        expect(json.error.code).toBe(PromptGenerationErrorCode.INVALID_RESPONSE_FORMAT)
      })

      it('returns 500 when XAI_API_KEY is missing or placeholder', async () => {
        process.env['XAI_API_KEY'] = 'your_xai_api_key_here'
        const req = new Request('http://localhost/api/prompts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cardNumber: 0,
            styleInputs: { theme: 'Tarot', tone: 'Dark', description: 'Test' },
          }),
        })
        const res = await promptPostHandler({ request: req } as any)
        expect(res.status).toBe(500)
        const json = await res.json()
        expect(json.error.code).toBe(PromptGenerationErrorCode.API_KEY_MISSING)
      })

      it('processes single card regeneration payload with feedback and previousPrompt', async () => {
        process.env['XAI_API_KEY'] = 'real-secret-key'

        mockChatCreate.mockResolvedValueOnce({
          id: 'chatcmpl-test-regen',
          choices: [
            {
              message: {
                content: JSON.stringify({
                  cardNumber: 13,
                  cardName: 'Death',
                  generatedPrompt: 'A stylized skeletal figure surrounded by golden blooming lotus flowers.',
                }),
              },
            },
          ],
          usage: { prompt_tokens: 150, completion_tokens: 75, total_tokens: 225 },
        })

        const req = new Request('http://localhost/api/prompts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cardNumber: 13,
            referenceImageUrls: ['https://example.com/img1.png'],
            styleInputs: { theme: 'Gothic', tone: 'Solemn', description: 'Dark elegance' },
            previousPrompt: 'Old prompt about a skeleton',
            feedback: 'Add lotus flowers and gold accents',
          }),
        })

        const res = await promptPostHandler({ request: req } as any)
        expect(res.status).toBe(200)
        const json = await res.json()
        expect(json.success).toBe(true)
        expect(json.data.prompt.cardNumber).toBe(13)
        expect(json.data.prompt.cardName).toBe('Death')
        expect(json.data.prompt.generatedPrompt).toBe(
          'A stylized skeletal figure surrounded by golden blooming lotus flowers.'
        )
        expect(json.data.usage.estimatedCost).toBe(0.002)

        // Verify OpenAI call included previous prompt and feedback in user prompt
        expect(mockChatCreate).toHaveBeenCalledTimes(1)
        const callArgs = mockChatCreate.mock.calls[0]?.[0]
        const userMessage = callArgs?.messages?.[0]?.content
        const textContent = Array.isArray(userMessage)
          ? userMessage.find((c: any) => c.type === 'text' && c.text.includes('Death'))?.text
          : ''
        expect(textContent).toContain('Previous prompt: Old prompt about a skeleton')
        expect(textContent).toContain('User feedback / adjustments requested: Add lotus flowers and gold accents')
      })

      it('rejects invalid card numbers (e.g. 22, -1, 99) when reference images are absent', async () => {
        process.env['XAI_API_KEY'] = 'real-secret-key'

        // cardNumber 99 is not a valid CardNumber (0-21), so it falls through to batch prompt generation
        // which requires referenceImageUrls.
        const req = new Request('http://localhost/api/prompts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cardNumber: 99,
            referenceImageUrls: [],
            styleInputs: { theme: 'Gothic', tone: 'Dark', description: 'Test' },
          }),
        })

        const res = await promptPostHandler({ request: req } as any)
        expect(res.status).toBe(422)
        const json = await res.json()
        expect(json.success).toBe(false)
        expect(json.error.code).toBe(PromptGenerationErrorCode.INVALID_STYLE_INPUTS)
      })

      it('handles OpenAI model response returning raw markdown codeblock containing JSON', async () => {
        process.env['XAI_API_KEY'] = 'real-secret-key'

        const markdownContent = `Here is your prompt:
\`\`\`json
{
  "cardNumber": 0,
  "cardName": "The Fool",
  "generatedPrompt": "A wanderer stepping off a precipice into radiant neon mist."
}
\`\`\`
Hope you like it!`

        mockChatCreate.mockResolvedValueOnce({
          choices: [{ message: { content: markdownContent } }],
          usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
        })

        const req = new Request('http://localhost/api/prompts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cardNumber: 0,
            styleInputs: { theme: 'Cyberpunk', tone: 'Vibrant', description: 'Neon' },
          }),
        })

        const res = await promptPostHandler({ request: req } as any)
        expect(res.status).toBe(200)
        const json = await res.json()
        expect(json.success).toBe(true)
        expect(json.data.prompt.cardNumber).toBe(0)
        expect(json.data.prompt.generatedPrompt).toBe(
          'A wanderer stepping off a precipice into radiant neon mist.'
        )
      })
    })

    describe('PromptGenerationService.regeneratePrompt client-side method', () => {
      it('rejects invalid card numbers before making network requests', async () => {
        const fetchSpy = vi.fn()
        vi.stubGlobal('fetch', fetchSpy)

        const invalidNums = [-1, 22, 100, NaN, 3.14]
        for (const num of invalidNums) {
          const res = await promptService.regeneratePrompt({
            cardNumber: num as any,
            styleInputs: { theme: 'Cyberpunk', tone: 'Dark', description: 'Test' },
            referenceImageUrls: [],
          })
          expect(res.success).toBe(false)
          expect(res.error?.code).toBe(PromptGenerationErrorCode.INVALID_RESPONSE_FORMAT)
        }
        expect(fetchSpy).not.toHaveBeenCalled()
      })

      it('rejects missing styleInputs before making network requests', async () => {
        const fetchSpy = vi.fn()
        vi.stubGlobal('fetch', fetchSpy)

        const res = await promptService.regeneratePrompt({
          cardNumber: 0,
          styleInputs: { theme: '', tone: 'Dark', description: 'Test' },
          referenceImageUrls: [],
        })
        expect(res.success).toBe(false)
        expect(res.error?.code).toBe(PromptGenerationErrorCode.INVALID_STYLE_INPUTS)
        expect(fetchSpy).not.toHaveBeenCalled()
      })
    })
  })

  // ==========================================================================
  // 3. ImageGenerationService Pricing Calculations
  // ==========================================================================
  describe('3. ImageGenerationService Pricing Calculations ($0.02 / image)', () => {
    let imgService: ImageGenerationService

    beforeEach(() => {
      imgService = new ImageGenerationService()
      vi.restoreAllMocks()
    })

    it('accurately estimates cost for 1 card ($0.02)', async () => {
      const res = await imgService.estimateCost({ imageCount: 1 })
      expect(res.success).toBe(true)
      expect(res.data?.costPerImage).toBe(0.02)
      expect(res.data?.totalEstimatedCost).toBe(0.02)
      expect(res.data?.estimatedTime).toBe(15)
    })

    it('accurately estimates cost for 22 Major Arcana cards ($0.44)', async () => {
      const res = await imgService.estimateCost({ imageCount: 22 })
      expect(res.success).toBe(true)
      expect(res.data?.costPerImage).toBe(0.02)
      expect(res.data?.totalEstimatedCost).toBe(0.44)
      expect(res.data?.estimatedTime).toBe(330)
    })

    it('accurately estimates cost for 50 cards ($1.00)', async () => {
      const res = await imgService.estimateCost({ imageCount: 50 })
      expect(res.success).toBe(true)
      expect(res.data?.costPerImage).toBe(0.02)
      expect(res.data?.totalEstimatedCost).toBe(1.0)
      expect(res.data?.estimatedTime).toBe(750)
    })

    it('accurately accumulates cost during actual generation runs', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          json: () =>
            Promise.resolve({
              success: true,
              data: { imageUrl: 'https://blob.vercel.com/card.png' },
            }),
        })
      )

      // Test with 3 cards
      const prompts = [makePrompt(0), makePrompt(1), makePrompt(2)]
      const result = await imgService.generateImages({ prompts })

      expect(result.success).toBe(true)
      expect(result.data?.totalUsage.totalImages).toBe(3)
      expect(result.data?.totalUsage.successfulImages).toBe(3)
      expect(result.data?.totalUsage.estimatedCost).toBe(0.06)
      expect(result.data?.totalUsage.usagePerCard).toHaveLength(3)
      for (const usage of result.data?.totalUsage.usagePerCard || []) {
        expect(usage.estimatedCost).toBe(0.02)
      }
    })

    it('does not charge for failed cards in totalUsage.estimatedCost', async () => {
      let callCount = 0
      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation(() => {
          callCount++
          if (callCount === 1) {
            // First card succeeds
            return Promise.resolve({
              json: () =>
                Promise.resolve({
                  success: true,
                  data: { imageUrl: 'https://blob.vercel.com/card0.png' },
                }),
            })
          }
          // Subsequent cards fail permanently
          return Promise.resolve({
            json: () =>
              Promise.resolve({
                success: false,
                error: { code: 'GENERATION_FAILED', message: 'Failed generation' },
              }),
          })
        })
      )

      const prompts = [makePrompt(0), makePrompt(1)]
      const result = await imgService.generateImages({ prompts })

      expect(result.success).toBe(true)
      expect(result.data?.totalUsage.successfulImages).toBe(1)
      expect(result.data?.totalUsage.failedImages).toBe(1)
      expect(result.data?.totalUsage.estimatedCost).toBe(0.02)
    })
  })

  // ==========================================================================
  // 4. saveToStorage: false behaviour in ImageGenerationService & /api/generate/card
  // ==========================================================================
  describe('4. saveToStorage: false Behavior Verification', () => {
    let imgService: ImageGenerationService
    const originalEnv = { ...process.env }

    beforeEach(() => {
      imgService = new ImageGenerationService()
      mockChatCreate.mockReset()
      mockImagesGenerate.mockReset()
      mockBlobPut.mockReset()
      process.env['XAI_API_KEY'] = 'test-valid-xai-key'
      process.env['BLOB_READ_WRITE_TOKEN'] = 'vercel_blob_rw_test_token'
    })

    afterEach(() => {
      process.env = { ...originalEnv }
    })

    it('ImageGenerationService passes saveToStorage: false explicitly to the API proxy', async () => {
      let capturedBody: any
      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
          capturedBody = JSON.parse(init?.body as string)
          return Promise.resolve({
            json: () =>
              Promise.resolve({
                success: true,
                data: { imageUrl: 'data:image/png;base64,mockb64' },
              }),
          })
        })
      )

      await imgService.generateImages({
        prompts: [makePrompt(0)],
        saveToStorage: false,
      })

      expect(capturedBody).toBeDefined()
      expect(capturedBody.saveToStorage).toBe(false)
    })

    it('ImageGenerationService passes saveToStorage: true explicitly to the API proxy', async () => {
      let capturedBody: any
      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
          capturedBody = JSON.parse(init?.body as string)
          return Promise.resolve({
            json: () =>
              Promise.resolve({
                success: true,
                data: { imageUrl: 'https://blob.vercel.com/card0.png' },
              }),
          })
        })
      )

      await imgService.generateImages({
        prompts: [makePrompt(0)],
        saveToStorage: true,
      })

      expect(capturedBody).toBeDefined()
      expect(capturedBody.saveToStorage).toBe(true)
    })

    it('/api/generate/card does NOT call @vercel/blob put when saveToStorage is false', async () => {
      mockBlobPut.mockResolvedValueOnce({
        url: 'https://blob.vercel.com/should_not_be_called.png',
      })

      mockImagesGenerate.mockResolvedValueOnce({
        data: [{ b64_json: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' }],
      })

      const req = new Request('http://localhost/api/generate/card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardNumber: 0,
          cardName: 'The Fool',
          generatedPrompt: 'A traveler on the edge',
          saveToStorage: false,
        }),
      })

      const res = await cardGeneratePostHandler({ request: req } as any)
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.success).toBe(true)
      expect(mockBlobPut).not.toHaveBeenCalled()
      expect(json.data.imageUrl).toContain('data:image/png;base64,')
      expect(json.data.imageDataUrl).toContain('data:image/png;base64,')
    })

    it('/api/generate/card calls @vercel/blob put when saveToStorage is true and BLOB_READ_WRITE_TOKEN is set', async () => {
      mockBlobPut.mockResolvedValueOnce({
        url: 'https://blob.vercel.com/cards/00_The_Fool.png',
      })

      mockImagesGenerate.mockResolvedValueOnce({
        data: [{ b64_json: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' }],
      })

      const req = new Request('http://localhost/api/generate/card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardNumber: 0,
          cardName: 'The Fool',
          generatedPrompt: 'A traveler on the edge',
          saveToStorage: true,
        }),
      })

      const res = await cardGeneratePostHandler({ request: req } as any)
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.success).toBe(true)
      expect(mockBlobPut).toHaveBeenCalledTimes(1)
      expect(json.data.imageUrl).toBe('https://blob.vercel.com/cards/00_The_Fool.png')
    })
  })

  // ==========================================================================
  // 5. CostCalculationService, DownloadService, and ImageUploadService Edge Cases
  // ==========================================================================
  describe('5. Supporting Services Edge Cases & Defenses', () => {
    describe('CostCalculationService', () => {
      const costService = new CostCalculationService()

      it('rejects negative image counts', async () => {
        const res = await costService.estimateCost({
          imageCount: -5,
          referenceImageCount: 2,
        })
        expect(res.success).toBe(false)
        expect(res.error?.code).toBe(CostCalculationErrorCode.INVALID_IMAGE_COUNT)
      })

      it('formats cost according to detailed, summary, and minimal formats', async () => {
        const detRes = await costService.formatCost({ cost: 2.456, format: 'detailed' })
        expect(detRes.success).toBe(true)
        expect(detRes.data?.formatted).toBe('Total: $2.46')

        const sumRes = await costService.formatCost({ cost: 2.456, format: 'summary' })
        expect(sumRes.success).toBe(true)
        expect(sumRes.data?.formatted).toBe('$2.46')

        const minRes = await costService.formatCost({ cost: 2.456, format: 'minimal' })
        expect(minRes.success).toBe(true)
        expect(minRes.data?.formatted).toBe('~$2')
      })

      it('correctly categorizes warning levels for high amounts', async () => {
        const highRes = await costService.formatCost({ cost: 12.0 })
        expect(highRes.data?.warningLevel).toBe('high')
        expect(highRes.data?.warningMessage).toContain('High cost alert')

        const maxRes = await costService.formatCost({ cost: 25.0 })
        expect(maxRes.data?.warningLevel).toBe('maximum')
        expect(maxRes.data?.warningMessage).toContain('exceeds maximum allowed')
      })
    })

    describe('DownloadService Format & Metadata Boundaries', () => {
      const dlService = new DownloadService()

      it('rejects invalid download formats', async () => {
        const res = await dlService.downloadDeck({
          generatedCards: [makeCard(0)],
          styleInputs: DEFAULT_STYLE_INPUTS,
          format: 'invalid_format' as any,
        })
        expect(res.success).toBe(false)
        expect(res.error?.code).toBe(DownloadErrorCode.INVALID_FORMAT)
      })

      it('rejects download when cards have no valid image URLs', async () => {
        const invalidCard: GeneratedCard = {
          id: 'card-fail' as GeneratedCardId,
          cardNumber: 0,
          cardName: 'The Fool',
          prompt: 'A prompt',
          generationStatus: 'failed',
          retryCount: 2,
        }

        const res = await dlService.downloadDeck({
          generatedCards: [invalidCard],
          styleInputs: DEFAULT_STYLE_INPUTS,
          format: 'zip',
        })
        expect(res.success).toBe(false)
        expect(res.error?.code).toBe(DownloadErrorCode.MISSING_IMAGES)
      })
    })

    describe('ImageUploadService Multi-attribute Duplicate Detection', () => {
      const uploadService = new ImageUploadService()

      it('detects duplicate files by matching name, size, and timestamp', async () => {
        vi.stubGlobal(
          'fetch',
          vi.fn().mockResolvedValue({
            json: () => Promise.resolve({ success: true, data: { url: 'https://blob.vercel.com/img.jpg' } }),
          })
        )

        const fileA = makeFile('sample.png', 'image/png', 5000, 1710000000000)
        const fileDuplicate = makeFile('sample.png', 'image/png', 5000, 1710000000000)

        const res1 = await uploadService.uploadImages({ files: [fileA] })
        expect(res1.success).toBe(true)
        expect(res1.data?.uploadedImages).toHaveLength(1)

        const res2 = await uploadService.uploadImages({ files: [fileDuplicate] })
        expect(res2.success).toBe(true)
        expect(res2.data?.failedImages).toHaveLength(1)
        expect(res2.data?.failedImages[0]?.code).toBe('DUPLICATE_IMAGE')
      })
    })
  })
})
