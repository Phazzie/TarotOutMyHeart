/**
 * @fileoverview MCP tool schema definitions
 * @purpose JSON Schema types for Model Context Protocol tools
 * @boundary Copilot MCP tool interface
 * @dataFlow Tool schemas flow from this module to MCP server implementation
 * @example
 * ```typescript
 * const toolDef: MCPToolDefinition = {
 *   name: 'checkForTasks',
 *   description: 'Check for available tasks',
 *   inputSchema: { ... }
 * }
 * ```
 * @updated 2025-11-11
 */

/**
 * MCP tool definition structure
 * Defines the shape of tools exposed to Copilot via Model Context Protocol
 * Each tool must have a name, description, and JSON schema for inputs
 */
export interface MCPToolDefinition {
  /**
   * Unique identifier for the tool
   * Used by MCP server to route tool calls
   */
  name: string

  /**
   * Human-readable description of what the tool does
   * Displayed to Copilot to help it understand when to use this tool
   */
  description: string

  /**
   * JSON Schema defining the tool's input parameters
   * Must be of type 'object' with properties and optional required array
   */
  inputSchema: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
}
