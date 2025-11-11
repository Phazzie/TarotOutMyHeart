/**
 * @fileoverview Agent types for coordination server
 * @purpose Define all agent-related types for AI coordination
 * @boundary Shared types used across coordination contracts
 * @updated 2025-11-11
 */

/**
 * Unique identifier for AI agents in the system
 *
 * Supports two primary AI agents:
 * - 'claude-code': Claude Code AI assistant
 * - 'github-copilot': GitHub Copilot assistant
 *
 * Conflict Resolution: Merged from CoordinationServer.ts and StateStore.ts
 * - CoordinationServer.ts used: 'claude-code' | 'github-copilot'
 * - StateStore.ts used: 'claude' | 'copilot' | 'user'
 * - Resolution: Using CoordinationServer.ts values (more specific), adding 'user'
 */
export type AgentId = 'claude-code' | 'github-copilot' | 'user'

/**
 * Branded type for agent registration tokens
 * Prevents mixing up registration tokens with other string IDs
 */
export type RegistrationToken = string & { readonly __brand: 'RegistrationToken' }

/**
 * Capabilities an AI agent can declare
 * Used for intelligent task routing
 *
 * Each capability represents a specific skill or function:
 * - typescript-development: TypeScript coding expertise
 * - svelte-development: Svelte/UI component development
 * - testing: Test writing and validation
 * - code-review: Code review and quality checks
 * - refactoring: Code refactoring and optimization
 * - documentation: Documentation writing
 * - debugging: Debugging and troubleshooting
 * - contract-definition: API contract definition
 * - mock-implementation: Mock service implementation
 */
export type AgentCapability =
  | 'typescript-development'
  | 'svelte-development'
  | 'testing'
  | 'code-review'
  | 'refactoring'
  | 'documentation'
  | 'debugging'
  | 'contract-definition'
  | 'mock-implementation'

/**
 * Collaboration modes supported by the system
 *
 * Defines how multiple agents work together:
 * - orchestrator-worker: One lead agent coordinates others
 * - peer-to-peer: Equal partners with task handoffs
 * - parallel: Both agents work simultaneously on different tasks
 */
export type CollaborationMode =
  | 'orchestrator-worker'
  | 'peer-to-peer'
  | 'parallel'
