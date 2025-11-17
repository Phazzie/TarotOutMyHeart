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

// Export common types first
export * from './types/common'

// AI Coordination Contracts (for Claude-Copilot collaboration system)
// Export from CoordinationServer.ts which has the complete, production-ready contracts
// Note: We exclude ServiceError and ServiceResponse since they're already exported from types/common
export {
  // Core types
  type AgentId,
  type AgentCapability,
  type TaskType,
  type TaskStatus,
  type CollaborationMode,
  type TaskId,
  type LockToken,
  type ContextId,
  type SessionId,
  type ConflictId,
  type RegistrationToken,
  type HandoffId,

  // Contracts
  type ClaudeCoordinationContract,
  type CopilotCoordinationContract,
  type StateStoreContract,
  type UserCoordinationContract,
  type FileSystemCoordinationContract,

  // Data models
  type Task,
  type TaskContext,
  type TaskProgress,
  type TaskResult,
  type TaskError,
  type TestResults,
  type TestFailure,
  type FileLock,
  type FileAccessGrant,
  type FileAccessRequest,
  type FileConflict,
  type ConversationContext,
  type Message,
  type CollaborationSession,
  type CollaborationStatus,
  type CollaborationEvent,
  type ConflictResolution,

  // MCP
  type MCPToolDefinition,
  generateMCPToolDefinitions
} from './CoordinationServer'
// Note: Individual files (StateStore.ts, etc.) contain older/simpler versions - use CoordinationServer.ts instead

// Tarot Application Contracts (SDD Seams #1-7)
export * from './ImageUpload'         // Seam #1: Upload reference images
export * from './StyleInput'          // Seam #2: Define deck style parameters
export * from './PromptGeneration'    // Seam #3: Generate card prompts via Grok vision
export * from './ImageGeneration'     // Seam #4: Generate card images via Grok
export * from './DeckDisplay'         // Seam #5: Display generated deck
export * from './CostCalculation'     // Seam #6: Calculate API costs
export * from './Download'            // Seam #7: Download cards as ZIP
