/**
 * Barrel export of all contracts
 *
 * This file exports all seam contracts for the TarotUpMyHeart application.
 * Import contracts using:
 *
 * ```typescript
 * import type { YourSeam } from '$contracts'
 * ```
 */

// Export common types
export * from './types/common'

// AI Coordination Contracts (for Claude-Copilot collaboration)
export * from './CoordinationServer'

// Tarot Application Contracts (SDD Seams #1-7)
export * from './ImageUpload'         // Seam #1: Upload reference images
export * from './StyleInput'          // Seam #2: Define deck style parameters
export * from './PromptGeneration'    // Seam #3: Generate card prompts via Grok vision
export * from './ImageGeneration'     // Seam #4: Generate card images via Grok
export * from './DeckDisplay'         // Seam #5: Display generated deck
export * from './CostCalculation'     // Seam #6: Calculate API costs
export * from './Download'            // Seam #7: Download cards as ZIP
