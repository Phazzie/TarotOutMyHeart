/**
 * @fileoverview MCP tool module barrel export
 * @purpose Central export point for MCP tool schemas and builders
 * @boundary MCP tool contract interface
 * @dataFlow All MCP-related exports flow through this barrel
 * @example
 * ```typescript
 * import { MCPToolDefinition, generateMCPToolDefinitions } from './mcp'
 * ```
 * @updated 2025-11-11
 */

export * from './tool-schemas'
export * from './tool-builder'
