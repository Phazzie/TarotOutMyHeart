/**
 * @fileoverview MCP Server implementation for GitHub Copilot integration
 * @purpose Exposes coordination tools as MCP endpoints for Copilot to autonomously invoke
 * @dataFlow Copilot → MCP Protocol → Tool Handlers → Coordination Services
 * @boundary MCP protocol boundary for Copilot integration
 * @example
 * const server = new MCPCoordinationServer(services)
 * await server.start(3000)
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
  TextContent,
} from '@modelcontextprotocol/sdk/types.js'
import type { CoordinationServices } from '../services/factory'
import { generateMCPToolDefinitions } from '@contracts'

/**
 * MCP Server for GitHub Copilot coordination
 * Exposes coordination capabilities as MCP tools
 */
export class MCPCoordinationServer {
  private services: CoordinationServices
  private server: Server
  private isRunning = false

  constructor(services: CoordinationServices) {
    this.services = services
    this.server = new Server(
      {
        name: 'coordination-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    )

    this.setupHandlers()
  }

  /**
   * Sets up MCP request handlers
   */
  private setupHandlers(): void {
    // Handle tool listing
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const toolDefinitions = generateMCPToolDefinitions()

      const tools: Tool[] = toolDefinitions.map(def => ({
        name: def.name,
        description: def.description,
        inputSchema: def.inputSchema as any,
      }))

      console.log(`[MCPServer] Listing ${tools.length} available tools`)

      return { tools }
    })

    // Handle tool invocation
    this.server.setRequestHandler(CallToolRequestSchema, async request => {
      const { name, arguments: args } = request.params

      console.log(`[MCPServer] Tool invoked: ${name}`)
      console.log('[MCPServer] Arguments:', JSON.stringify(args, null, 2))

      try {
        let result: any

        switch (name) {
          case 'checkForTasks':
            result = await this.handleCheckForTasks(args as any)
            break

          case 'claimTask':
            result = await this.handleClaimTask(args as any)
            break

          case 'submitTaskResult':
            result = await this.handleSubmitTaskResult(args as any)
            break

          case 'requestFileAccess':
            result = await this.handleRequestFileAccess(args as any)
            break

          case 'releaseFileAccess':
            result = await this.handleReleaseFileAccess(args as any)
            break

          case 'getCollaborationStatus':
            result = await this.handleGetCollaborationStatus(args as any)
            break

          default:
            throw new Error(`Unknown tool: ${name}`)
        }

        // Format response
        const content: TextContent = {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        }

        return {
          content: [content],
          isError: false,
        }
      } catch (error) {
        console.error(`[MCPServer] Tool error: ${name}`, error)

        const errorContent: TextContent = {
          type: 'text',
          text: JSON.stringify(
            {
              success: false,
              error: {
                code: 'TOOL_ERROR',
                message: error instanceof Error ? error.message : 'Unknown error',
                retryable: true,
              },
            },
            null,
            2
          ),
        }

        return {
          content: [errorContent],
          isError: true,
        }
      }
    })
  }

  /**
   * Handles checkForTasks tool invocation
   */
  private async handleCheckForTasks(args: { agentId: string; capabilities: string[] }) {
    const result = await this.services.copilot.checkForTasks({
      agentId: args.agentId as any,
      capabilities: args.capabilities as any,
    })

    if (result.success && result.data) {
      console.log(`[MCPServer] Found ${result.data.length} tasks for Copilot`)
    }

    return result
  }

  /**
   * Handles claimTask tool invocation
   */
  private async handleClaimTask(args: { taskId: string; agentId: string }) {
    const result = await this.services.copilot.claimTaskTool({
      taskId: args.taskId as any,
      agentId: args.agentId as any,
    })

    if (result.success && result.data) {
      console.log(`[MCPServer] Task claimed: ${result.data.description}`)
    }

    return result
  }

  /**
   * Handles submitTaskResult tool invocation
   */
  private async handleSubmitTaskResult(args: {
    taskId: string
    agentId: string
    success: boolean
    output: string
    filesModified?: string[]
    error?: string
  }) {
    const result = await this.services.copilot.submitTaskResult({
      taskId: args.taskId as any,
      agentId: args.agentId as any,
      success: args.success,
      output: args.output,
      filesModified: args.filesModified,
      error: args.error,
    })

    console.log(`[MCPServer] Task result submitted: ${args.success ? 'SUCCESS' : 'FAILED'}`)

    return result
  }

  /**
   * Handles requestFileAccess tool invocation
   */
  private async handleRequestFileAccess(args: {
    path: string
    operation: string
    agentId: string
  }) {
    const result = await this.services.copilot.requestFileAccess({
      path: args.path,
      operation: args.operation as 'read' | 'write' | 'delete',
      agentId: args.agentId as any,
    })

    if (result.success && result.data) {
      console.log(
        `[MCPServer] File access ${result.data.granted ? 'GRANTED' : 'DENIED'}: ${args.path}`
      )
    }

    return result
  }

  /**
   * Handles releaseFileAccess tool invocation
   */
  private async handleReleaseFileAccess(args: { lockToken: string; agentId: string }) {
    const result = await this.services.copilot.releaseFileAccess({
      lockToken: args.lockToken as any,
      agentId: args.agentId as any,
    })

    console.log(`[MCPServer] File lock released: ${args.lockToken}`)

    return result
  }

  /**
   * Handles getCollaborationStatus tool invocation
   */
  private async handleGetCollaborationStatus(args: { sessionId?: string }) {
    const result = await this.services.copilot.getCollaborationStatus({
      sessionId: args.sessionId as any,
    })

    if (result.success && result.data) {
      const progress = result.data.progress
      console.log(
        `[MCPServer] Collaboration status: ${progress.percentComplete}% complete (${progress.tasksCompleted}/${progress.tasksTotal})`
      )
    }

    return result
  }

  /**
   * Starts the MCP server using stdio transport
   */
  async startStdio(): Promise<void> {
    if (this.isRunning) {
      console.warn('[MCPServer] Server already running')
      return
    }

    console.log('[MCPServer] Starting MCP server on stdio...')

    const transport = new StdioServerTransport()
    await this.server.connect(transport)

    this.isRunning = true

    console.log('[MCPServer] MCP server started on stdio')
    console.log('[MCPServer] Copilot can now connect using MCP protocol')
    console.log('[MCPServer] Available tools:')

    const tools = generateMCPToolDefinitions()
    for (const tool of tools) {
      console.log(`  - ${tool.name}: ${tool.description}`)
    }
  }

  /**
   * Stops the MCP server
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return
    }

    console.log('[MCPServer] Stopping MCP server...')
    await this.server.close()
    this.isRunning = false
    console.log('[MCPServer] MCP server stopped')
  }

  /**
   * Gets server status
   */
  getStatus(): { isRunning: boolean; tools: number } {
    return {
      isRunning: this.isRunning,
      tools: generateMCPToolDefinitions().length,
    }
  }
}

/**
 * Standalone function to start MCP server with stdio
 * Used when running as a separate process
 */
export async function startMCPServerStandalone(): Promise<void> {
  console.log('[MCPServer] Initializing standalone MCP server...')

  // Import services
  const { createServices } = await import('../services/factory')

  // Create services (will use mocks by default)
  const services = await createServices({
    useMocks: true,
    debug: true,
  })

  // Seed some test data
  const { seedMockData } = await import('../services/factory')
  await seedMockData({
    tasks: [
      {
        type: 'implement-feature',
        description: 'Build user authentication system',
        priority: 'high',
      },
      {
        type: 'write-tests',
        description: 'Write tests for auth module',
        priority: 'medium',
      },
      {
        type: 'update-docs',
        description: 'Update API documentation',
        priority: 'low',
      },
    ],
  })

  // Create and start MCP server
  const mcpServer = new MCPCoordinationServer(services)
  await mcpServer.startStdio()

  // Keep process alive
  process.stdin.resume()

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n[MCPServer] Received SIGINT, shutting down...')
    await mcpServer.stop()
    process.exit(0)
  })

  process.on('SIGTERM', async () => {
    console.log('\n[MCPServer] Received SIGTERM, shutting down...')
    await mcpServer.stop()
    process.exit(0)
  })
}

// Run standalone if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startMCPServerStandalone().catch(error => {
    console.error('[MCPServer] Fatal error:', error)
    process.exit(1)
  })
}
