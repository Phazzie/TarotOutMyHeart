/**
 * @fileoverview MCP tool definitions builder
 * @purpose Generate MCP tool definitions for Model Context Protocol server
 * @boundary Copilot MCP tool interface builder
 * @dataFlow Tool definitions are built on server startup and exposed to Copilot
 * @example
 * ```typescript
 * const tools = generateMCPToolDefinitions()
 * // Returns array of 6 MCPToolDefinition objects ready for MCP server
 * ```
 * @updated 2025-11-11
 */

import type { MCPToolDefinition } from './tool-schemas'

/**
 * Generate MCP tool definitions for Copilot coordination
 *
 * Creates a complete set of tools that expose coordination server capabilities
 * to Copilot via Model Context Protocol. Each tool definition includes:
 * - Unique name for tool identification
 * - Human-readable description for Copilot understanding
 * - JSON Schema defining input parameters and validation
 *
 * All 6 tools are essential for full coordination workflow:
 * 1. checkForTasks - Query available work
 * 2. claimTask - Reserve work for execution
 * 3. submitTaskResult - Report completion
 * 4. requestFileAccess - Acquire file locks
 * 5. releaseFileAccess - Release file locks
 * 6. getCollaborationStatus - Monitor session state
 *
 * @returns Array of 6 MCPToolDefinition objects, one per coordination capability
 */
export function generateMCPToolDefinitions(): MCPToolDefinition[] {
  return [
    {
      name: 'checkForTasks',
      description: 'Check for available tasks matching agent capabilities',
      inputSchema: {
        type: 'object',
        properties: {
          agentId: { type: 'string', enum: ['claude-code', 'github-copilot'] },
          capabilities: { type: 'array', items: { type: 'string' } }
        },
        required: ['agentId', 'capabilities']
      }
    },
    {
      name: 'claimTask',
      description: 'Claim a task for execution',
      inputSchema: {
        type: 'object',
        properties: {
          taskId: { type: 'string' },
          agentId: { type: 'string' }
        },
        required: ['taskId', 'agentId']
      }
    },
    {
      name: 'submitTaskResult',
      description: 'Submit task execution result',
      inputSchema: {
        type: 'object',
        properties: {
          taskId: { type: 'string' },
          agentId: { type: 'string' },
          success: { type: 'boolean' },
          output: { type: 'string' },
          filesModified: { type: 'array', items: { type: 'string' } },
          error: { type: 'string' }
        },
        required: ['taskId', 'agentId', 'success', 'output']
      }
    },
    {
      name: 'requestFileAccess',
      description: 'Request permission to access a file',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          operation: { type: 'string', enum: ['read', 'write', 'delete'] },
          agentId: { type: 'string' }
        },
        required: ['path', 'operation', 'agentId']
      }
    },
    {
      name: 'releaseFileAccess',
      description: 'Release file access lock',
      inputSchema: {
        type: 'object',
        properties: {
          lockToken: { type: 'string' },
          agentId: { type: 'string' }
        },
        required: ['lockToken', 'agentId']
      }
    },
    {
      name: 'getCollaborationStatus',
      description: 'Get current collaboration session status',
      inputSchema: {
        type: 'object',
        properties: {
          sessionId: { type: 'string' }
        }
      }
    }
  ]
}
