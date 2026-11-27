/**
 * @fileoverview Shared Playwright fixtures: stubbed server routes and console-error capture
 * @purpose Let every e2e test run the real client services without calling xAI or Vercel Blob
 * @dataFlow Test → page.route stubs → JSON shaped exactly like src/routes/api/* responses
 * @boundary Browser ⇄ /api/upload, /api/prompts, /api/generate/card
 * @example
 * test('flow', async ({ page, api }) => { api.failCards = [3]; await page.goto('/upload') })
 */
import { test as base, expect, type Page } from '@playwright/test'
import { deflateSync } from 'node:zlib'

export const CARD_NAMES = [
  'The Fool',
  'The Magician',
  'The High Priestess',
  'The Empress',
  'The Emperor',
  'The Hierophant',
  'The Lovers',
  'The Chariot',
  'Strength',
  'The Hermit',
  'Wheel of Fortune',
  'Justice',
  'The Hanged Man',
  'Death',
  'Temperance',
  'The Devil',
  'The Tower',
  'The Star',
  'The Moon',
  'The Sun',
  'Judgement',
  'The World',
] as const

/** Build a small solid-colour PNG so uploads and card images are real decodable images. */
export function makePng(size = 32, rgb: [number, number, number] = [120, 60, 200]): Buffer {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    return c >>> 0
  })
  const crc32 = (buf: Buffer): number => {
    let c = 0xffffffff
    for (const byte of buf) c = (crcTable[(c ^ byte) & 0xff] ?? 0) ^ (c >>> 8)
    return (c ^ 0xffffffff) >>> 0
  }
  const chunk = (type: string, data: Buffer): Buffer => {
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length)
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(body))
    return Buffer.concat([len, body, crc])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 2
  const row = Buffer.concat([Buffer.from([0]), Buffer.from(Array(size).fill(rgb).flat())])
  const raw = Buffer.concat(Array(size).fill(row))
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const PNG = makePng()
const CARD_IMAGE_HOST = 'https://cards.e2e.test'

/** Knobs a test can turn to change how the stubbed API behaves. */
export interface ApiStub {
  /** Response for /api/prompts; 'ok' returns 22 prompts. */
  prompts: 'ok' | 'missing-key'
  /** Card numbers whose first image request fails. */
  failCards: number[]
  /** Card numbers that always fail, even on retry. */
  alwaysFailCards: number[]
  /** Counts of calls per route, for assertions. */
  calls: { upload: number; prompts: number; card: number }
  /** Bodies sent to /api/prompts. */
  promptBodies: unknown[]
}

async function installStubs(page: Page, api: ApiStub): Promise<void> {
  // Third-party assets are not part of the app under test.
  await page.route(/fonts\.(googleapis|gstatic)\.com/, route =>
    route.fulfill({ status: 200, contentType: 'text/css', body: '' })
  )
  await page.route(/placehold\.co/, route =>
    route.fulfill({ status: 200, contentType: 'image/png', body: PNG })
  )
  await page.route(`${CARD_IMAGE_HOST}/**`, route =>
    route.fulfill({
      status: 200,
      contentType: 'image/png',
      body: PNG,
      headers: { 'access-control-allow-origin': '*' },
    })
  )

  await page.route('**/api/upload', async route => {
    api.calls.upload++
    await route.fulfill({
      json: {
        success: true,
        data: { url: `data:image/png;base64,${PNG.toString('base64')}` },
      },
    })
  })

  await page.route('**/api/prompts', async route => {
    api.calls.prompts++
    const body: unknown = route.request().postDataJSON()
    api.promptBodies.push(body)
    if (api.prompts === 'missing-key') {
      await route.fulfill({
        status: 500,
        json: {
          success: false,
          error: { code: 'API_KEY_MISSING', message: 'API key not configured.' },
        },
      })
      return
    }
    await route.fulfill({
      json: {
        success: true,
        data: {
          prompts: CARD_NAMES.map((cardName, cardNumber) => ({
            id: `prompt-${cardNumber}`,
            cardNumber,
            cardName,
            traditionalMeaning: 'meaning',
            generatedPrompt: `E2E prompt for ${cardName}: a luminous tarot illustration.`,
            confidence: 0.9,
            generatedAt: new Date().toISOString(),
          })),
          usage: {
            promptTokens: 1,
            completionTokens: 1,
            totalTokens: 2,
            estimatedCost: 0.04,
            model: 'grok-e2e',
          },
          requestId: 'req-e2e',
        },
      },
    })
  })

  const attempts = new Map<number, number>()
  await page.route('**/api/generate/card', async route => {
    api.calls.card++
    const body = route.request().postDataJSON() as { cardNumber: number }
    const n = body.cardNumber
    const attempt = (attempts.get(n) ?? 0) + 1
    attempts.set(n, attempt)
    const fails = api.alwaysFailCards.includes(n) || (api.failCards.includes(n) && attempt === 1)
    if (fails) {
      await route.fulfill({
        status: 502,
        json: {
          success: false,
          error: { code: 'GENERATION_FAILED', message: 'xAI returned no image data.' },
        },
      })
      return
    }
    await route.fulfill({
      json: { success: true, data: { imageUrl: `${CARD_IMAGE_HOST}/card-${n}.png` } },
    })
  })
}

export const test = base.extend<{ api: ApiStub; consoleErrors: string[] }>({
  api: async ({ page }, use) => {
    const api: ApiStub = {
      prompts: 'ok',
      failCards: [],
      alwaysFailCards: [],
      calls: { upload: 0, prompts: 0, card: 0 },
      promptBodies: [],
    }
    await installStubs(page, api)
    await use(api)
  },
  consoleErrors: async ({ page }, use) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(`pageerror: ${err.message}`))
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(`console: ${msg.text()}`)
    })
    await use(errors)
  },
})

export { expect }

/** Navigate and wait until the page has hydrated (event handlers attached). */
export async function gotoReady(page: Page, path: string): Promise<void> {
  await page.goto(path)
  await page.waitForLoadState('networkidle')
}

/** Upload one reference image and save a preset style on /upload. */
export async function completeUploadStep(page: Page): Promise<void> {
  await gotoReady(page, '/upload')
  await page.locator('input[type=file]').setInputFiles({
    name: 'reference.png',
    mimeType: 'image/png',
    buffer: PNG,
  })
  await expect(page.getByText('reference.png')).toBeVisible()
  await page.getByRole('button', { name: /Cyberpunk Neon/ }).click()
  await page.getByRole('button', { name: 'Save style preferences' }).click()
  await expect(page.getByText(/saved successfully/i)).toBeVisible()
}
