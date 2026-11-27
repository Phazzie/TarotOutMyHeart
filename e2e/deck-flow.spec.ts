/**
 * @fileoverview End-to-end tests for the main deck-creation flow
 * @purpose Prove a user can go Home → Upload → Generate → Gallery → Download with the
 *   real client services, and that failures are shown instead of silently swallowed
 * @dataFlow Browser actions → real services → stubbed /api/* routes (see fixtures.ts)
 * @boundary Whole app, as a user sees it
 */
import { test, expect, completeUploadStep, gotoReady, makePng, CARD_NAMES } from './fixtures'

test('home page leads into the upload step', async ({ page, api, consoleErrors }) => {
  void api
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /You may now apply for one/ })).toBeVisible()
  await page.getByRole('link', { name: 'Take a number' }).click()
  await expect(page).toHaveURL(/\/upload$/)
  await expect(
    page.getByRole('heading', { name: /Application for issuance of a Major Arcana deck/ })
  ).toBeVisible()
  expect(consoleErrors).toEqual([])
})

test('continue stays disabled until an image and a style are both saved', async ({ page, api }) => {
  void api
  await gotoReady(page, '/upload')
  const proceed = page.getByRole('button', { name: /Submit to Window 2/ })
  await expect(proceed).toBeDisabled()
  await page.locator('input[type=file]').setInputFiles({
    name: 'only-image.png',
    mimeType: 'image/png',
    buffer: makePng(),
  })
  await expect(page.getByText('only-image.png')).toBeVisible()
  await expect(proceed).toBeDisabled()
  await page.getByRole('button', { name: /Botanical Gothic/ }).click()
  await page.getByRole('button', { name: 'Save style preferences' }).click()
  await expect(proceed).toBeEnabled()
})

test('full flow: upload, prompts, 22 cards, gallery, zip download', async ({
  page,
  api,
  consoleErrors,
}) => {
  await completeUploadStep(page)
  expect(api.calls.upload).toBe(1)

  await page.getByRole('button', { name: /Submit to Window 2/ }).click()
  await expect(page).toHaveURL(/\/generate$/)

  await page.getByRole('button', { name: /Draft all 22 case files/ }).click()
  await expect(page.getByText('E2E prompt for The World', { exact: false })).toBeVisible()
  expect(api.calls.prompts).toBe(1)
  const sent = api.promptBodies[0] as {
    referenceImageUrls: string[]
    styleInputs: { theme: string }
  }
  expect(sent.referenceImageUrls).toHaveLength(1)
  expect(sent.referenceImageUrls[0]).toMatch(/^data:image\/png;base64,/)
  expect(sent.styleInputs.theme).toBeTruthy()

  await page.getByRole('button', { name: /Approve all 22 for illustration/ }).click()
  await expect(page).toHaveURL(/\/gallery$/, { timeout: 30_000 })
  expect(api.calls.card).toBe(22)

  await expect(page.getByText('22/22')).toBeVisible()
  for (const name of CARD_NAMES) {
    await expect(page.getByText(name, { exact: true }).first()).toBeAttached()
  }

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: /Download all .* as ZIP/i }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/\.zip$/)

  // Inspect one card and take a single copy from the lightbox.
  await page.getByRole('gridcell', { name: /The Magician/ }).click()
  const dialog = page.getByRole('dialog', { name: 'Card detail view' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText('grok-imagine-image-2.0')).toBeVisible()
  const single = page.waitForEvent('download')
  await dialog.getByRole('button', { name: 'Download The Magician' }).click()
  expect((await single).suggestedFilename()).toMatch(/\.png$/)
  await dialog.getByRole('button', { name: 'Close lightbox' }).click()
  await expect(dialog).toBeHidden()

  expect(consoleErrors).toEqual([])
})

test('a prompt-generation failure is shown to the user', async ({ page, api }) => {
  api.prompts = 'missing-key'
  await completeUploadStep(page)
  await page.getByRole('button', { name: /Submit to Window 2/ }).click()
  await page.getByRole('button', { name: /Draft all 22 case files/ }).click()
  const alert = page.getByRole('alert').filter({ hasText: /API key not configured/ })
  await expect(alert).toBeVisible()
  await alert.getByRole('button', { name: /Dismiss/ }).click()
  await expect(alert).toBeHidden()
})

test('cards that are returned can be resubmitted after generation finishes', async ({
  page,
  api,
}) => {
  api.alwaysFailCards = [3]
  await completeUploadStep(page)
  await page.getByRole('button', { name: /Submit to Window 2/ }).click()
  await page.getByRole('button', { name: /Draft all 22 case files/ }).click()
  await expect(page.getByText('E2E prompt for The World')).toBeVisible()
  await page.getByRole('button', { name: /Approve all 22 for illustration/ }).click()

  const retry = page.getByRole('button', { name: /Resubmit The Empress/ })
  await expect(retry).toBeVisible({ timeout: 30_000 })
  await expect(page).toHaveURL(/\/generate$/)

  api.alwaysFailCards = []
  await retry.click()
  await expect(retry).toBeHidden()
  await page.getByRole('button', { name: /Proceed to Window 3/ }).click()
  await expect(page).toHaveURL(/\/gallery$/)
  await expect(page.getByText('22/22')).toBeVisible()
  // A resubmitted card must keep its real name, not a generic "Card 3".
  await expect(page.getByRole('gridcell', { name: /^The Empress, card 3$/ })).toBeVisible()
  await expect(page.getByText('Card 3', { exact: true })).toHaveCount(0)
})

test('the upload limit matches what the server accepts (5 images)', async ({ page, api }) => {
  void api
  await gotoReady(page, '/upload')
  const files = Array.from({ length: 6 }, (_, i) => ({
    name: `ref-${i}.png`,
    mimeType: 'image/png',
    buffer: makePng(),
  }))
  await page.locator('input[type=file]').setInputFiles(files)
  await expect(page.getByText(/Maximum is 5 images/)).toBeVisible()

  await page.locator('input[type=file]').setInputFiles(files.slice(0, 5))
  await expect(page.getByText('ref-4.png')).toBeVisible()
})

test('start over clears the deck and lets a new deck be uploaded', async ({ page, api }) => {
  await completeUploadStep(page)
  await page.getByRole('button', { name: /Submit to Window 2/ }).click()
  await page.getByRole('button', { name: /Draft all 22 case files/ }).click()
  await expect(page.getByText('E2E prompt for The World')).toBeVisible()
  await page.getByRole('button', { name: /Approve all 22 for illustration/ }).click()
  await expect(page).toHaveURL(/\/gallery$/, { timeout: 30_000 })

  page.once('dialog', dialog => dialog.accept())
  await page.getByRole('button', { name: 'Withdraw application' }).click()
  await expect(page).toHaveURL(/\/$/)

  // Navigate inside the app (no page reload), so in-memory state from the old deck would
  // still be here if Withdraw failed to clear it.
  const nav = page.locator('.desktop-nav')
  await nav.getByRole('link', { name: /Issuance/ }).click()
  await expect(page.getByRole('heading', { name: 'No record found' })).toBeVisible()

  // Five fresh images must be accepted: the old deck's image must not count against the limit.
  await nav.getByRole('link', { name: /Intake/ }).click()
  await expect(page.getByText('reference.png')).toHaveCount(0)
  await page.locator('input[type=file]').setInputFiles(
    Array.from({ length: 5 }, (_, i) => ({
      name: `fresh-${i}.png`,
      mimeType: 'image/png',
      buffer: makePng(),
    }))
  )
  await expect(page.getByText('fresh-4.png')).toBeVisible()
  expect(api.calls.upload).toBeGreaterThanOrEqual(6)
})

test('gallery shows an empty state before any cards exist', async ({ page, api }) => {
  void api
  await gotoReady(page, '/gallery')
  await expect(page.getByRole('heading', { name: 'No record found' })).toBeVisible()
  await page.getByRole('button', { name: /Go to Window 2/ }).click()
  await expect(page).toHaveURL(/\/generate$/)
  await expect(page.getByText(/Complete Form MA-22/)).toBeVisible()
})

test('style page continues to the next step', async ({ page, api }) => {
  void api
  await gotoReady(page, '/style')
  await page.getByRole('button', { name: /Alchemical Gold/ }).click()
  await page.getByRole('button', { name: 'Save style preferences' }).click()
  await page.getByRole('button', { name: /Add exhibits next|Submit to Window 2/ }).click()
  await expect(page).not.toHaveURL(/\/style$/)
})

test('every internal link on every page resolves', async ({ page, api, request }) => {
  void api
  const broken: string[] = []
  for (const path of ['/', '/upload', '/style', '/generate', '/gallery']) {
    await page.goto(path)
    const hrefs = await page
      .locator('a[href]')
      .evaluateAll(els => els.map(el => el.getAttribute('href') ?? ''))
    for (const href of new Set(hrefs)) {
      if (href.startsWith('/')) {
        const res = await request.get(href)
        if (res.status() >= 400) broken.push(`${path} → ${href} (${res.status()})`)
      } else if (href.includes('github.com/')) {
        expect(href, `GitHub link on ${path}`).toContain('github.com/Phazzie/TarotOutMyHeart')
      }
    }
  }
  expect(broken).toEqual([])
})

test('the test bench that spends real credits is not served in production', async ({ request }) => {
  const res = await request.get('/test-progress')
  expect(res.status()).toBe(404)
})
