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

// AI Coordination contracts
export * from './StateStore'
export * from './ClaudeCoordination'
export * from './CopilotCoordination'
export * from './UserCoordination'
export * from './FileSystemCoordination'

// Seam contracts will be exported here as they are defined
// Example:
// export * from './ImageUpload'
// export * from './PromptGeneration'
// export * from './ImageGeneration'
// export * from './DeckState'
