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
import { logInfo, logError, setCorrelationId } from './observability/logger'
import { metricsMiddleware, getMetrics } from './observability/metrics'
import { createRateLimiter, RateLimitConfig } from './middleware/rate-limiter'
import { v4 as uuidv4 } from 'uuid'
import type {
  TaskId,
  ContextId,
  SessionId,
  AgentCapability,
  TaskProgress,
  TaskResult,
  ConflictResolution
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
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
    defaultRequestsPerMinute: parseInt(process.env.RATE_LIMIT_DEFAULT_REQUESTS || '100'),
    agentLimits: {
      'claude-code': parseInt(process.env.RATE_LIMIT_CLAUDE_REQUESTS || '100'),
      'github-copilot': parseInt(process.env.RATE_LIMIT_COPILOT_REQUESTS || '50')
    },
    excludePaths: (process.env.RATE_LIMIT_EXCLUDE_PATHS || '/health,/status').split(',').map(p => p.trim())
  }
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
let mcpServer: MCPCoordinationServer | null = null as MCPCoordinationServer | null

// ========== Middleware ==========

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// CORS for development
if (config.debug) {
  app.use((_req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    next()
  })
}

// Request logging with correlation ID
app.use((req, _res, next) => {
  // Set correlation ID from request header or generate new one
  const correlationIdHeader = req.get('x-correlation-id')
  if (correlationIdHeader) {
    setCorrelationId(correlationIdHeader)
  } else {
    setCorrelationId(uuidv4())
  }

  logInfo('HTTP Request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('user-agent')
  })
  next()
})

// Metrics middleware (tracks all API requests)
app.use(metricsMiddleware)

// Rate limiting middleware
const rateLimitConfig: RateLimitConfig = {
  defaultRequestsPerMinute: config.rateLimit.defaultRequestsPerMinute,
  windowMs: config.rateLimit.windowMs,
  agentLimits: config.rateLimit.agentLimits,
  excludePaths: config.rateLimit.excludePaths,
  debug: config.debug
}
app.use(createRateLimiter(rateLimitConfig))

// ========== Health & Status Endpoints ==========

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    config: {
      useMocks: config.useMocks,
      mcpEnabled: config.enableMCP,
      webSocketEnabled: config.enableWebSocket
    }
  })
})

app.get('/metrics', async (_req: Request, res: Response) => {
  try {
    res.set('Content-Type', 'text/plain; version=0.0.4')
    const metrics = await getMetrics()
    res.send(metrics)
  } catch (error) {
    logError('Failed to collect metrics', error as Error, { component: 'Metrics' })
    res.status(500).send('Error collecting metrics')
  }
})

app.get('/status', async (_req: Request, res: Response) => {
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
        fileSystem: 'ready'
      },
      metrics: {
        activeLocks: locksResult.success ? locksResult.data?.length : 0,
        mcpTools: mcpStatus.tools,
        wsConnections
      }
    })
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
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
        retryable: true
      }
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
        retryable: true
      }
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
        retryable: true
      }
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
        retryable: true
      }
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
        retryable: true
      }
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
        retryable: true
      }
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
        retryable: true
      }
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
        retryable: true
      }
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
        retryable: true
      }
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
        retryable: true
      }
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
        retryable: true
      }
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
        retryable: true
      }
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
        retryable: true
      }
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
        retryable: true
      }
    })
  }
})

// ========== WebSocket Setup (for real-time updates) ==========

function setupWebSocketServer(): void {
  if (!config.enableWebSocket) {
    logInfo('WebSocket server disabled', { reason: 'ENABLE_WEBSOCKET=false' })
    return
  }

  wsServer = new WebSocketServer({ server: httpServer })

  wsServer.on('connection', (ws, req) => {
    logInfo('WebSocket connection established', {
      component: 'WebSocket',
      remoteAddress: req.socket.remoteAddress,
      connectedClients: wsServer?.clients.size
    })

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString())
        logInfo('WebSocket message received', {
          component: 'WebSocket',
          messageType: message.type,
          hasSessionId: !!message.sessionId
        })

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
        logError('WebSocket message handling error', error as Error, {
          component: 'WebSocket'
        })
        ws.send(JSON.stringify({
          type: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        }))
      }
    })

    ws.on('close', () => {
      logInfo('WebSocket connection closed', {
        component: 'WebSocket',
        remainingClients: wsServer?.clients.size
      })
    })

    ws.on('error', (error) => {
      logError('WebSocket connection error', error, {
        component: 'WebSocket'
      })
    })

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connected',
      timestamp: new Date().toISOString()
    }))
  })

  logInfo('WebSocket server initialized', {
    component: 'WebSocket',
    port: config.port
  })
}

// ========== Server Initialization ==========

async function initializeServer(): Promise<void> {
  logInfo('╔════════════════════════════════════════════════╗')
  logInfo('║        AI Coordination Server v0.1.0           ║')
  logInfo('╚════════════════════════════════════════════════╝')

  logInfo('Starting server initialization', { component: 'Init' })

  try {
    // Create services
    logInfo('Creating services', {
      component: 'Init',
      useMocks: config.useMocks,
      debug: config.debug
    })
    await createServices({
      useMocks: config.useMocks,
      debug: config.debug
    })

    // Seed test data if using mocks
    if (config.useMocks && config.debug) {
      logInfo('Seeding mock data for testing', { component: 'Init' })
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
    }

    // Setup WebSocket server
    setupWebSocketServer()

    // Start HTTP server
    httpServer.listen(config.port, () => {
      logInfo('╔════════════════════════════════════════════════╗')
      logInfo('║          Server Started Successfully           ║')
      logInfo('╚════════════════════════════════════════════════╝')
      logInfo('HTTP API server started', {
        component: 'Init',
        port: config.port,
        endpoints: {
          api: `http://localhost:${config.port}`,
          health: `http://localhost:${config.port}/health`,
          status: `http://localhost:${config.port}/status`,
          websocket: config.enableWebSocket ? `ws://localhost:${config.port}` : 'disabled',
          mcp: config.enableMCP ? 'Run "npm run mcp"' : 'disabled'
        }
      })

      if (config.enableWebSocket) {
        logInfo('WebSocket enabled', { component: 'Init', url: `ws://localhost:${config.port}` })
      }

      logInfo('API endpoints registered', {
        component: 'Init',
        endpoints: ['claude', 'user', 'health', 'status']
      })

      if (config.enableMCP) {
        logInfo('MCP server available', {
          component: 'Init',
          instruction: 'Run "npm run mcp" to start'
        })
      }

      logInfo('Server ready for AI collaboration', { component: 'Init', status: 'ready' })
    })

    // Handle graceful shutdown
    process.on('SIGINT', gracefulShutdown)
    process.on('SIGTERM', gracefulShutdown)

  } catch (error) {
    logError('Failed to initialize server', error as Error, { component: 'Init' })
    process.exit(1)
  }
}

async function gracefulShutdown(signal: string): Promise<void> {
  logInfo('Graceful shutdown initiated', {
    component: 'Shutdown',
    signal,
    time: new Date().toISOString()
  })

  // Close WebSocket server
  if (wsServer) {
    logInfo('Closing WebSocket connections', {
      component: 'Shutdown',
      clientCount: wsServer.clients.size
    })
    wsServer.clients.forEach(ws => ws.close())
    wsServer.close()
  }

  // Close HTTP server
  logInfo('Closing HTTP server', { component: 'Shutdown' })
  httpServer.close()

  // Close MCP server if running
  if (mcpServer) {
    logInfo('Closing MCP server', { component: 'Shutdown' })
    await mcpServer.stop()
  }

  logInfo('Server shutdown complete', {
    component: 'Shutdown',
    status: 'stopped'
  })
  process.exit(0)
}

// Start the server
initializeServer().catch(error => {
  logError('Server initialization failed', error, { component: 'Fatal' })
  process.exit(1)
})