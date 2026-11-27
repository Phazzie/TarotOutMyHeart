/**
 * @fileoverview Mobile-viewport e2e checks
 * @purpose Make sure the hamburger menu works and no page scrolls sideways on a phone
 * @dataFlow Browser (Pixel 7 emulation) → app pages
 * @boundary Layout / navigation
 */
import { test, expect, gotoReady } from './fixtures'

test('hamburger menu opens and navigates', async ({ page, api }) => {
  void api
  await gotoReady(page, '/')
  await page.getByRole('button', { name: 'Toggle menu' }).click()
  await page
    .locator('.mobile-nav')
    .getByRole('link', { name: /Intake/ })
    .click()
  await expect(page).toHaveURL(/\/upload$/)
  await expect(page.locator('.mobile-nav')).toBeHidden()
})

for (const path of ['/', '/upload', '/style', '/generate', '/gallery']) {
  test(`no sideways scroll on ${path}`, async ({ page, api }) => {
    void api
    await page.goto(path)
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    )
    expect(overflow).toBeLessThanOrEqual(1)
  })
}
