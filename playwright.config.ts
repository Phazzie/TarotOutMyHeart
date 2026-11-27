/**
 * @fileoverview Playwright end-to-end test configuration
 * @purpose Drive the built app in a real browser through every screen
 * @dataFlow Builds the app with REAL client services (VITE_USE_MOCKS=false), serves it with
 *   `vite preview`, and each test stubs the three server routes (/api/upload, /api/prompts,
 *   /api/generate/card) with page.route, so no test ever calls xAI or Vercel Blob.
 * @boundary Browser ⇄ SvelteKit API routes (the same path production users hit)
 * @example
 * npm run test:e2e
 */
import { defineConfig, devices } from '@playwright/test'

const PORT = 4173

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? [['list'], ['html', { open: 'never' }]] : 'list',
  timeout: 60_000,
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'off',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: /mobile\.spec\.ts/,
    },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, testMatch: /mobile\.spec\.ts/ },
  ],
  webServer: {
    command: `npx vite build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env['CI'],
    timeout: 180_000,
    env: { VITE_USE_MOCKS: 'false' },
  },
})
