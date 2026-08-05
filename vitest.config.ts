/**
 * Vitest configuration for TarotOutMyHeart real service tests.
 * Uses jsdom environment (browser-like) for localStorage and DOM APIs.
 * Resolves $contracts and $services path aliases so tests import the same
 * paths that SvelteKit builds use.
 */
import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    // jsdom gives us localStorage, window, document, etc.
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules', '.svelte-kit'],
    // Each test file gets a fresh module registry
    isolate: true,
    // Reasonable timeout for tests that mock network calls
    testTimeout: 10_000,
    // Longer timeout for integration-style tests (image gen retries, etc.)
    // Individual tests can override with { timeout: N }
  },
  resolve: {
    alias: {
      // Mirror the path aliases in svelte.config.js / tsconfig.json
      $contracts: resolve(__dirname, './contracts'),
      $services: resolve(__dirname, './services'),
      $lib: resolve(__dirname, './src/lib'),
    },
  },
})
