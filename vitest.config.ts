import { defineConfig } from 'vitest/config'
import { sveltekit } from '@sveltejs/kit/vite'

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    // Use node environment for tests (not jsdom)
    // This is needed for OpenAI SDK to work in tests
    environment: 'node',

    // Include patterns
    include: ['tests/**/*.test.ts'],

    // Global test timeout (2 minutes default)
    testTimeout: 120_000,

    // Hook timeout for async setup/teardown
    hookTimeout: 30_000,

    // Disable threads for more predictable test execution
    // (especially important for API tests with rate limiting)
    threads: false,

    // Show detailed output
    reporters: ['verbose'],
  },
})
