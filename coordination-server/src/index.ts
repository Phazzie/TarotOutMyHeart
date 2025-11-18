/**
 * @fileoverview Main entry point for AI Coordination Server
 * @purpose Orchestrates HTTP API, MCP server, and WebSocket connections for AI collaboration
 * @dataFlow Entry Point → Service Creation → Server Initialization → Request Handling
 * @boundary System entry point coordinating all server components
 * @example
 * npm run dev   # Development mode with hot reload
 * npm run build # Build for production
 * npm start     # Run production server
 */

import express, { Express, Request, Response } from 'express'
import { createServer } from 'http'
import { WebSocketServer } from 'ws'
import * as dotenv from 'dotenv'
import { createServices, getServices, seedMockData } from '../services/factory'
import { MCPCoordinationServer } from './mcp-server'
import type {
  TaskId,
  ContextId,
  SessionId,
  AgentId,
  AgentCapability,
  TaskProgress,
  TaskResult,
  ConflictResolution,
} from '@contracts'

// Load environment variables
dotenv.config()

/**
 * Configuration from environment
 */
const config = {
  port: parseInt(process.env.PORT || '3456'),
  useMocks: process.env.USE_MOCKS !== 'false',
  debug: process.env.DEBUG === 'true',
  enableMCP: process.env.ENABLE_MCP !== 'false',
  enableWebSocket: process.env.ENABLE_WEBSOCKET !== 'false',
}

/**
 * Express application instance
 */
const app: Express = express()

/**
 * HTTP server for Express and WebSocket
 */
const httpServer = createServer(app)

/**
 * WebSocket server for real-time updates
 */
let wsServer: WebSocketServer | null = null

/**
 * MCP server instance
 */
const mcpServer: MCPCoordinationServer | null = null as MCPCoordinationServer | null

// ========== Middleware ==========

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// CORS for development
if (config.debug) {
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    next()
  })
}

// Request logging
app.use((req, res, next) => {
  console.log(`[API] ${req.method} ${req.path}`)
  next()
})

// ========== Health & Status Endpoints ==========

app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    config: {
      useMocks: config.useMocks,
      mcpEnabled: config.enableMCP,
      webSocketEnabled: config.enableWebSocket,
    },
  })
})

app.get('/status', async (req: Request, res: Response) => {
  try {
    const services = getServices()

    // Get all locks
    const locksResult = await services.stateStore.getAllLocks()

    // Get MCP server status
    const mcpStatus = mcpServer?.getStatus() || { isRunning: false, tools: 0 }

    // Get WebSocket connections
    const wsConnections = wsServer?.clients.size || 0

    res.json({
      status: 'operational',
      services: {
        stateStore: 'connected',
        claude: 'ready',
        copilot: mcpStatus.isRunning ? 'ready' : 'not started',
        user: 'ready',
        fileSystem: 'ready',
      },
      metrics: {
        activeLocks: locksResult.success ? locksResult.data?.length : 0,
        mcpTools: mcpStatus.tools,
        wsConnections,
      },
    })
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

// ========== Claude Code API Endpoints ==========

app.post('/api/claude/register', async (req: Request, res: Response) => {
  try {
    const services = getServices()
    const result = await services.claude.registerAgent(req.body)

    if (result.success) {
      res.json(result)
    } else {
      res.status(400).json(result)
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        retryable: true,
      },
    })
  }
})

app.get('/api/claude/tasks', async (req: Request, res: Response) => {
  try {
    const services = getServices()
    const capabilities = req.query.capabilities as string[]
    const result = await services.claude.getAvailableTasks(capabilities as AgentCapability[])

    if (result.success) {
      res.json(result)
    } else {
      res.status(400).json(result)
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        retryable: true,
      },
    })
  }
})

app.post('/api/claude/tasks/:taskId/claim', async (req: Request, res: Response) => {
  try {
    const services = getServices()
    const taskId = req.params.taskId as TaskId
    const result = await services.claude.claimTask(taskId)

    if (result.success) {
      res.json(result)
    } else {
      res.status(400).json(result)
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        retryable: true,
      },
    })
  }
})

app.post('/api/claude/tasks/:taskId/progress', async (req: Request, res: Response) => {
  try {
    const services = getServices()
    const taskId = req.params.taskId as TaskId
    const progress: TaskProgress = req.body
    const result = await services.claude.reportProgress(taskId, progress)

    if (result.success) {
      res.json(result)
    } else {
      res.status(400).json(result)
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        retryable: true,
      },
    })
  }
})

app.post('/api/claude/tasks/:taskId/complete', async (req: Request, res: Response) => {
  try {
    const services = getServices()
    const taskId = req.params.taskId as TaskId
    const result: TaskResult = req.body
    const response = await services.claude.completeTask(taskId, result)

    if (response.success) {
      res.json(response)
    } else {
      res.status(400).json(response)
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        retryable: true,
      },
    })
  }
})

app.get('/api/claude/context/:contextId', async (req: Request, res: Response) => {
  try {
    const services = getServices()
    const contextId = req.params.contextId as ContextId
    const result = await services.claude.retrieveContext(contextId)

    if (result.success) {
      res.json(result)
    } else {
      res.status(404).json(result)
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        retryable: true,
      },
    })
  }
})

app.put('/api/claude/context/:contextId', async (req: Request, res: Response) => {
  try {
    const services = getServices()
    const contextId = req.params.contextId as ContextId
    const result = await services.claude.saveContext(contextId, req.body)

    if (result.success) {
      res.json(result)
    } else {
      res.status(400).json(result)
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        retryable: true,
      },
    })
  }
})

app.post('/api/claude/handoff', async (req: Request, res: Response) => {
  try {
    const services = getServices()
    const result = await services.claude.requestHandoff(req.body)

    if (result.success) {
      res.json(result)
    } else {
      res.status(400).json(result)
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        retryable: true,
      },
    })
  }
})

// ========== User Control API Endpoints ==========

app.post('/api/user/collaboration/start', async (req: Request, res: Response) => {
  try {
    const services = getServices()
    const result = await services.user.startCollaboration(req.body)

    if (result.success) {
      res.json(result)
    } else {
      res.status(400).json(result)
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        retryable: true,
      },
    })
  }
})

app.post('/api/user/collaboration/:sessionId/pause', async (req: Request, res: Response) => {
  try {
    const services = getServices()
    const sessionId = req.params.sessionId as SessionId
    const result = await services.user.pauseCollaboration(sessionId)

    if (result.success) {
      res.json(result)
    } else {
      res.status(400).json(result)
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        retryable: true,
      },
    })
  }
})

app.post('/api/user/collaboration/:sessionId/resume', async (req: Request, res: Response) => {
  try {
    const services = getServices()
    const sessionId = req.params.sessionId as SessionId
    const result = await services.user.resumeCollaboration(sessionId)

    if (result.success) {
      res.json(result)
    } else {
      res.status(400).json(result)
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        retryable: true,
      },
    })
  }
})

app.post('/api/user/collaboration/:sessionId/cancel', async (req: Request, res: Response) => {
  try {
    const services = getServices()
    const sessionId = req.params.sessionId as SessionId
    const result = await services.user.cancelCollaboration(sessionId)

    if (result.success) {
      res.json(result)
    } else {
      res.status(400).json(result)
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        retryable: true,
      },
    })
  }
})

app.get('/api/user/collaboration/:sessionId/status', async (req: Request, res: Response) => {
  try {
    const services = getServices()
    const sessionId = req.params.sessionId as SessionId
    const result = await services.user.getCollaborationStatus(sessionId)

    if (result.success) {
      res.json(result)
    } else {
      res.status(404).json(result)
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        retryable: true,
      },
    })
  }
})

app.post('/api/user/conflict/:conflictId/resolve', async (req: Request, res: Response) => {
  try {
    const services = getServices()
    const conflictId = req.params.conflictId as any
    const resolution: ConflictResolution = req.body
    const result = await services.user.resolveConflict(conflictId, resolution)

    if (result.success) {
      res.json(result)
    } else {
      res.status(400).json(result)
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        retryable: true,
      },
    })
  }
})

// ========== WebSocket Setup (for real-time updates) ==========

function setupWebSocketServer(): void {
  if (!config.enableWebSocket) {
    console.log('[WebSocket] WebSocket server disabled')
    return
  }

  wsServer = new WebSocketServer({ server: httpServer })

  wsServer.on('connection', (ws, req) => {
    console.log(`[WebSocket] New connection from ${req.socket.remoteAddress}`)

    ws.on('message', async data => {
      try {
        const message = JSON.parse(data.toString())
        console.log('[WebSocket] Received message:', message)

        // Handle subscription requests
        if (message.type === 'subscribe' && message.sessionId) {
          const services = getServices()
          const sessionId = message.sessionId as SessionId

          // Start streaming events
          for await (const event of services.user.subscribeToUpdates(sessionId)) {
            if (ws.readyState === ws.OPEN) {
              ws.send(JSON.stringify(event))
            } else {
              break
            }
          }
        }
      } catch (error) {
        console.error('[WebSocket] Error handling message:', error)
        ws.send(
          JSON.stringify({
            type: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        )
      }
    })

    ws.on('close', () => {
      console.log('[WebSocket] Connection closed')
    })

    ws.on('error', error => {
      console.error('[WebSocket] Connection error:', error)
    })

    // Send welcome message
    ws.send(
      JSON.stringify({
        type: 'connected',
        timestamp: new Date().toISOString(),
      })
    )
  })

  console.log('[WebSocket] WebSocket server initialized')
}

// ========== Server Initialization ==========

async function initializeServer(): Promise<void> {
  console.log('╔════════════════════════════════════════════════╗')
  console.log('║        AI Coordination Server v0.1.0           ║')
  console.log('╚════════════════════════════════════════════════╝')
  console.log()

  console.log('[Init] Starting server initialization...')

  try {
    // Create services
    console.log(`[Init] Creating services (USE_MOCKS=${config.useMocks})...`)
    const services = await createServices({
      useMocks: config.useMocks,
      debug: config.debug,
    })

    // Seed test data if using mocks
    if (config.useMocks && config.debug) {
      console.log('[Init] Seeding mock data for testing...')
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
    }

    // Setup WebSocket server
    setupWebSocketServer()

    // Start HTTP server
    httpServer.listen(config.port, () => {
      console.log()
      console.log('╔════════════════════════════════════════════════╗')
      console.log('║          Server Started Successfully           ║')
      console.log('╚════════════════════════════════════════════════╝')
      console.log()
      console.log(`📡 HTTP API:    http://localhost:${config.port}`)
      console.log(`📊 Health:      http://localhost:${config.port}/health`)
      console.log(`📈 Status:      http://localhost:${config.port}/status`)

      if (config.enableWebSocket) {
        console.log(`🔌 WebSocket:   ws://localhost:${config.port}`)
      }

      console.log()
      console.log('API Endpoints:')
      console.log('  Claude Code:  /api/claude/*')
      console.log('  User Control: /api/user/*')
      console.log()

      if (config.enableMCP) {
        console.log('⚠️  To start MCP server for Copilot:')
        console.log('    npm run mcp')
        console.log()
      }

      console.log('Ready for AI collaboration! 🤖🤝🤖')
    })

    // Handle graceful shutdown
    process.on('SIGINT', gracefulShutdown)
    process.on('SIGTERM', gracefulShutdown)
  } catch (error) {
    console.error('[Init] Failed to initialize server:', error)
    process.exit(1)
  }
}

async function gracefulShutdown(signal: string): Promise<void> {
  console.log(`\n[Shutdown] Received ${signal}, starting graceful shutdown...`)

  // Close WebSocket server
  if (wsServer) {
    console.log('[Shutdown] Closing WebSocket connections...')
    wsServer.clients.forEach(ws => ws.close())
    wsServer.close()
  }

  // Close HTTP server
  console.log('[Shutdown] Closing HTTP server...')
  httpServer.close()

  // Close MCP server if running
  if (mcpServer) {
    console.log('[Shutdown] Closing MCP server...')
    await mcpServer.stop()
  }

  console.log('[Shutdown] Server stopped successfully')
  process.exit(0)
}

// Start the server
initializeServer().catch(error => {
  console.error('[Fatal] Server initialization failed:', error)
  process.exit(1)
})
