/**
 * @fileoverview Test data and helpers for integration tests
 * @purpose Provide consistent test data for Grok API integration tests
 * @updated 2025-11-17
 */

import type { StyleInputs } from '$contracts/StyleInput'
import type { CardNumber } from '$contracts/PromptGeneration'
import { MAJOR_ARCANA_NAMES } from '$contracts/PromptGeneration'

// ============================================================================
// SAMPLE STYLE INPUTS
// ============================================================================

/**
 * Sample style inputs for testing prompt generation
 */
export const SAMPLE_STYLE_INPUTS: StyleInputs = {
  theme: 'Cyberpunk',
  tone: 'Dark',
  description: 'Neon-lit dystopian future with chrome and circuitry. High contrast, vibrant colors against dark backgrounds.',
  concept: 'Technology versus humanity, the digital divine',
}

/**
 * Minimal style inputs for basic testing
 */
export const MINIMAL_STYLE_INPUTS: StyleInputs = {
  theme: 'Minimalist',
  tone: 'Serene',
  description: 'Clean lines, soft colors, simple geometric shapes',
}

/**
 * Complex style inputs with long descriptions
 */
export const COMPLEX_STYLE_INPUTS: StyleInputs = {
  theme: 'Art Nouveau meets Sci-Fi',
  tone: 'Mystical and Ethereal',
  description: 'Flowing organic lines intertwined with futuristic elements. Pastel color palette with metallic accents. Inspiration from Alphonse Mucha meets concept art from Blade Runner. Each card should feature intricate border work with floral and technological motifs.',
  concept: 'The marriage of nature and technology, ancient wisdom in a digital age',
}

// ============================================================================
// REFERENCE IMAGE URLS
// ============================================================================

/**
 * Sample reference image URLs for testing
 *
 * NOTE: In real tests with API key, these should be replaced with actual
 * URLs to images (either test images or user-provided images)
 */
export const SAMPLE_REFERENCE_IMAGE_URLS = [
  'https://picsum.photos/seed/tarot1/512/768', // Placeholder 1
  'https://picsum.photos/seed/tarot2/512/768', // Placeholder 2
]

/**
 * Single reference image for minimal tests
 */
export const SINGLE_REFERENCE_IMAGE_URL = 'https://picsum.photos/seed/tarot-single/512/768'

// ============================================================================
// MAJOR ARCANA DATA
// ============================================================================

/**
 * All Major Arcana card numbers (0-21)
 */
export const ALL_CARD_NUMBERS: CardNumber[] = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11,
  12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
]

/**
 * Sample card numbers for quick tests (subset of Major Arcana)
 */
export const SAMPLE_CARD_NUMBERS: CardNumber[] = [0, 1, 13, 21] // Fool, Magician, Death, World

/**
 * Expected card names (for validation)
 */
export const EXPECTED_CARD_NAMES = MAJOR_ARCANA_NAMES

/**
 * Card count for full deck
 */
export const MAJOR_ARCANA_COUNT = 22

// ============================================================================
// COST ESTIMATES
// ============================================================================

/**
 * Expected cost ranges for Grok API operations
 * Based on Grok pricing as of 2025-11
 */
export const EXPECTED_COSTS = {
  // Prompt generation (vision + text)
  promptGeneration: {
    min: 0.05, // Minimum cost for 22 prompts
    max: 0.50, // Maximum expected cost
  },

  // Image generation
  imageGeneration: {
    perImage: 0.10, // $0.10 per image
    fullDeck: 2.20,  // 22 images * $0.10
  },

  // Total for full flow
  fullFlow: {
    min: 2.25, // Minimum total cost
    max: 2.70, // Maximum expected cost
  },
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate that a prompt is reasonable
 */
export function isValidPrompt(prompt: string): boolean {
  return (
    prompt.length >= 50 &&
    prompt.length <= 2000 &&
    prompt.trim().length > 0
  )
}

/**
 * Validate that a card number is in valid range
 */
export function isValidCardNumber(cardNumber: number): boolean {
  return cardNumber >= 0 && cardNumber <= 21 && Number.isInteger(cardNumber)
}

/**
 * Validate that we have all 22 unique card numbers
 */
export function hasAllCardNumbers(cardNumbers: number[]): boolean {
  if (cardNumbers.length !== MAJOR_ARCANA_COUNT) {
    return false
  }

  const uniqueNumbers = new Set(cardNumbers)
  if (uniqueNumbers.size !== MAJOR_ARCANA_COUNT) {
    return false
  }

  for (let i = 0; i < MAJOR_ARCANA_COUNT; i++) {
    if (!uniqueNumbers.has(i)) {
      return false
    }
  }

  return true
}

/**
 * Validate image data URL format
 */
export function isValidImageDataUrl(dataUrl: string): boolean {
  return dataUrl.startsWith('data:image/') && dataUrl.includes('base64,')
}

/**
 * Validate HTTP(S) URL format
 */
export function isValidHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

// ============================================================================
// TEST TIMEOUTS
// ============================================================================

/**
 * Recommended timeout values for different test types
 */
export const TEST_TIMEOUTS = {
  promptGeneration: 120_000,  // 2 minutes for generating 22 prompts
  imageGeneration: 600_000,   // 10 minutes for generating 22 images (with delays)
  singleImage: 60_000,        // 1 minute for single image
  validation: 5_000,          // 5 seconds for validation tests
  fullFlow: 720_000,          // 12 minutes for complete end-to-end flow
}

// ============================================================================
// MOCK PROMPTS (for image generation tests without prompt generation)
// ============================================================================

/**
 * Pre-generated mock prompts for testing image generation in isolation
 * These are realistic examples of what the prompt generation service would produce
 */
export const MOCK_CARD_PROMPTS = ALL_CARD_NUMBERS.map((cardNumber) => ({
  id: `mock-prompt-${cardNumber}` as any,
  cardNumber,
  cardName: EXPECTED_CARD_NAMES[cardNumber],
  traditionalMeaning: 'Mock traditional meaning',
  generatedPrompt: `A cyberpunk tarot card depicting ${EXPECTED_CARD_NAMES[cardNumber]}. Neon-lit dystopian scene with chrome and circuitry. High contrast, vibrant colors against dark backgrounds. Technology versus humanity, the digital divine. Intricate details, professional illustration.`,
  confidence: 0.95,
  generatedAt: new Date(),
}))

// ============================================================================
// PROGRESS TRACKING HELPERS
// ============================================================================

/**
 * Track progress updates during generation
 */
export class ProgressTracker {
  public updates: Array<{
    progress: number
    status: string
    timestamp: Date
  }> = []

  track(progress: { progress: number; status: string }) {
    this.updates.push({
      progress: progress.progress,
      status: progress.status,
      timestamp: new Date(),
    })
  }

  get lastProgress(): number {
    return this.updates[this.updates.length - 1]?.progress ?? 0
  }

  get progressIncreased(): boolean {
    if (this.updates.length < 2) return false
    const last = this.updates[this.updates.length - 1].progress
    const previous = this.updates[this.updates.length - 2].progress
    return last > previous
  }

  get completed(): boolean {
    return this.lastProgress === 100
  }

  reset() {
    this.updates = []
  }
}

// ============================================================================
// COST TRACKING HELPERS
// ============================================================================

/**
 * Track total costs across multiple operations
 */
export class CostTracker {
  private totalCost = 0
  private operations: Array<{
    operation: string
    cost: number
    timestamp: Date
  }> = []

  addCost(operation: string, cost: number) {
    this.totalCost += cost
    this.operations.push({
      operation,
      cost,
      timestamp: new Date(),
    })
  }

  getTotalCost(): number {
    return this.totalCost
  }

  getOperations() {
    return [...this.operations]
  }

  isWithinBudget(maxBudget: number): boolean {
    return this.totalCost <= maxBudget
  }

  reset() {
    this.totalCost = 0
    this.operations = []
  }

  getSummary(): string {
    return `Total cost: $${this.totalCost.toFixed(2)} across ${this.operations.length} operations`
  }
}
