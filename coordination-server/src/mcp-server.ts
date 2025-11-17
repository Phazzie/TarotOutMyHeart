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
  TextContent
} from '@modelcontextprotocol/sdk/types.js'
import type { CoordinationServices } from '../services/factory'
import { generateMCPToolDefinitions } from '@contracts'
import { logInfo, logError, logWarn } from './observability/logger'

/**
 * MCP Server for GitHub Copilot coordination
 * Exposes coordination capabilities as MCP tools
 */
export class MCPCoordinationServer {
  public readonly services: CoordinationServices
  public readonly server: Server
  private isRunning = false

  constructor(services: CoordinationServices) {
    this.services = services
    this.server = new Server(
      {
        name: 'coordination-server',
        version: '0.1.0'
      },
      {
        capabilities: {
          tools: {}
        }
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
        inputSchema: def.inputSchema as any
      }))

      logInfo('Listing available MCP tools', {
        component: 'MCPServer',
        toolCount: tools.length,
        tools: tools.map(t => t.name)
      })

      return { tools }
    })

    // Handle tool invocation
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params

      logInfo('MCP tool invoked', {
        component: 'MCPServer',
        toolName: name,
        argumentKeys: Object.keys(args || {})
      })

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
          text: JSON.stringify(result, null, 2)
        }

        return {
          content: [content],
          isError: false
        }

      } catch (error) {
        logError('MCP tool execution error', error as Error, {
          component: 'MCPServer',
          toolName: name
        })

        const errorContent: TextContent = {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: {
              code: 'TOOL_ERROR',
              message: error instanceof Error ? error.message : 'Unknown error',
              retryable: true
            }
          }, null, 2)
        }

        return {
          content: [errorContent],
          isError: true
        }
      }
    })
  }

  /**
   * Handles checkForTasks tool invocation
   */
  private async handleCheckForTasks(args: {
    agentId: string
    capabilities: string[]
  }) {
    const result = await this.services.copilot.checkForTasks({
      agentId: args.agentId as any,
      capabilities: args.capabilities as any
    })

    if (result.success && result.data) {
      logInfo('Tasks found for Copilot', {
        component: 'MCPServer',
        agentId: args.agentId,
        taskCount: result.data.length,
        capabilities: args.capabilities
      })
    }

    return result
  }

  /**
   * Handles claimTask tool invocation
   */
  private async handleClaimTask(args: {
    taskId: string
    agentId: string
  }) {
    const result = await this.services.copilot.claimTaskTool({
      taskId: args.taskId as any,
      agentId: args.agentId as any
    })

    if (result.success && result.data) {
      logInfo('Task claimed via MCP', {
        component: 'MCPServer',
        taskId: args.taskId,
        agentId: args.agentId,
        description: result.data.description
      })
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
      error: args.error
    })

    logInfo('Task result submitted via MCP', {
      component: 'MCPServer',
      taskId: args.taskId,
      agentId: args.agentId,
      status: args.success ? 'SUCCESS' : 'FAILED',
      filesModified: args.filesModified?.length || 0
    })

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
      agentId: args.agentId as any
    })

    if (result.success && result.data) {
      logInfo('File access request via MCP', {
        component: 'MCPServer',
        agentId: args.agentId,
        path: args.path,
        operation: args.operation,
        granted: result.data.granted
      })
    }

    return result
  }

  /**
   * Handles releaseFileAccess tool invocation
   */
  private async handleReleaseFileAccess(args: {
    lockToken: string
    agentId: string
  }) {
    const result = await this.services.copilot.releaseFileAccess({
      lockToken: args.lockToken as any,
      agentId: args.agentId as any
    })

    logInfo('File lock released via MCP', {
      component: 'MCPServer',
      agentId: args.agentId,
      lockToken: args.lockToken
    })

    return result
  }

  /**
   * Handles getCollaborationStatus tool invocation
   */
  private async handleGetCollaborationStatus(args: {
    sessionId?: string
  }) {
    const result = await this.services.copilot.getCollaborationStatus({
      sessionId: args.sessionId as any
    })

    if (result.success && result.data) {
      const progress = result.data.progress
      logInfo('Collaboration status retrieved via MCP', {
        component: 'MCPServer',
        sessionId: args.sessionId,
        percentComplete: progress.percentComplete,
        tasksCompleted: progress.tasksCompleted,
        tasksTotal: progress.tasksTotal
      })
    }

    return result
  }

  /**
   * Starts the MCP server using stdio transport
   */
  async startStdio(): Promise<void> {
    if (this.isRunning) {
      logWarn('MCP server already running', {
        component: 'MCPServer'
      })
      return
    }

    logInfo('Starting MCP server on stdio', {
      component: 'MCPServer'
    })

    const transport = new StdioServerTransport()
    await this.server.connect(transport)

    this.isRunning = true

    const tools = generateMCPToolDefinitions()
    logInfo('MCP server started successfully', {
      component: 'MCPServer',
      transport: 'stdio',
      toolCount: tools.length,
      tools: tools.map(t => t.name),
      status: 'ready for Copilot'
    })
  }

  /**
   * Stops the MCP server
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return
    }

    logInfo('Stopping MCP server', {
      component: 'MCPServer'
    })
    await this.server.close()
    this.isRunning = false
    logInfo('MCP server stopped', {
      component: 'MCPServer',
      status: 'stopped'
    })
  }

  /**
   * Gets server status
   */
  getStatus(): { isRunning: boolean; tools: number } {
    return {
      isRunning: this.isRunning,
      tools: generateMCPToolDefinitions().length
    }
  }

  /**
   * Lists available MCP tools (for testing)
   */
  async listTools() {
    const toolDefinitions = generateMCPToolDefinitions()
    return toolDefinitions.map(def => ({
      name: def.name,
      description: def.description,
      inputSchema: def.inputSchema
    }))
  }

  /**
   * Invokes an MCP tool (for testing)
   */
  async callTool(name: string, args: any) {
    try {
      let result: any

      switch (name) {
        case 'checkForTasks':
          result = await this.handleCheckForTasks(args)
          break
        case 'claimTask':
          result = await this.handleClaimTask(args)
          break
        case 'submitTaskResult':
          result = await this.handleSubmitTaskResult(args)
          break
        case 'requestFileAccess':
          result = await this.handleRequestFileAccess(args)
          break
        case 'releaseFileAccess':
          result = await this.handleReleaseFileAccess(args)
          break
        case 'getCollaborationStatus':
          result = await this.handleGetCollaborationStatus(args)
          break
        default:
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                success: false,
                error: {
                  code: 'UNKNOWN_TOOL',
                  message: `Unknown tool: ${name}`,
                  retryable: false
                }
              })
            }],
            isError: true
          }
      }

      const content: TextContent = {
        type: 'text',
        text: JSON.stringify(result)
      }

      return {
        content: [content],
        isError: false
      }
    } catch (error) {
      const errorContent: TextContent = {
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: {
            code: 'TOOL_EXECUTION_ERROR',
            message: error instanceof Error ? error.message : 'Unknown error',
            retryable: false
          }
        })
      }

      return {
        content: [errorContent],
        isError: true
      }
    }
  }
}

/**
 * Standalone function to start MCP server with stdio
 * Used when running as a separate process
 */
export async function startMCPServerStandalone(): Promise<void> {
  logInfo('Initializing standalone MCP server', {
    component: 'MCPServer',
    mode: 'standalone'
  })

  // Import services
  const { createServices } = await import('../services/factory')

  // Create services (will use mocks by default)
  const services = await createServices({
    useMocks: true,
    debug: true
  })

  // Seed some test data
  const { seedMockData } = await import('../services/factory')
  await seedMockData({
    tasks: [
      {
        type: 'implement-feature',
        description: 'Build user authentication system',
        priority: 'high'
      },
      {
        type: 'write-tests',
        description: 'Write tests for auth module',
        priority: 'medium'
      },
      {
        type: 'update-docs',
        description: 'Update API documentation',
        priority: 'low'
      }
    ]
  })

  // Create and start MCP server
  const mcpServer = new MCPCoordinationServer(services)
  await mcpServer.startStdio()

  // Keep process alive
  process.stdin.resume()

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    logInfo('Received SIGINT signal, shutting down', {
      component: 'MCPServer',
      signal: 'SIGINT'
    })
    await mcpServer.stop()
    process.exit(0)
  })

  process.on('SIGTERM', async () => {
    logInfo('Received SIGTERM signal, shutting down', {
      component: 'MCPServer',
      signal: 'SIGTERM'
    })
    await mcpServer.stop()
    process.exit(0)
  })
}

// Run standalone if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startMCPServerStandalone().catch(error => {
    logError('MCP server fatal error', error, {
      component: 'MCPServer',
      level: 'fatal'
    })
    process.exit(1)
  })
}