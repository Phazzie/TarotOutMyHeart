/**
 * @fileoverview Rate limiting middleware for API endpoints
 * @purpose Prevent abuse by limiting requests per agent and endpoint
 * @dataFlow Request → Rate Limiter → Check request count → Allow/Deny
 * @boundary Enforces per-agent and per-endpoint request limits using sliding window algorithm
 * @example
 * app.use(createRateLimiter(config))
 * // Returns 429 when limit exceeded, includes rate limit headers
 */

import { Request, Response, NextFunction, RequestHandler } from 'express'

/**
 * Request metadata stored in rate limiter
 */
interface RequestRecord {
  timestamp: number
  endpoint: string
}

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  /**
   * Global default requests per minute
   */
  defaultRequestsPerMinute: number

  /**
   * Window size in milliseconds (default: 60000 = 1 minute)
   */
  windowMs: number

  /**
   * Per-agent limits (overrides default)
   */
  agentLimits?: {
    [agentId: string]: number
  }

  /**
   * Per-endpoint limits (requests per minute)
   */
  endpointLimits?: {
    [endpoint: string]: number
  }

  /**
   * Endpoints that are excluded from rate limiting
   */
  excludePaths?: string[]

  /**
   * Enable debug logging
   */
  debug?: boolean
}

/**
 * Per-agent request tracking
 */
interface AgentRateLimitState {
  [endpoint: string]: RequestRecord[]
}

/**
 * Global rate limit state
 */
interface RateLimitState {
  [agentId: string]: AgentRateLimitState
}

/**
 * Rate limiter state storage
 */
const rateLimitState: RateLimitState = {}

/**
 * Clean up old requests from the tracking map
 */
function cleanOldRequests(
  records: RequestRecord[],
  windowMs: number,
  now: number
): RequestRecord[] {
  return records.filter(record => now - record.timestamp < windowMs)
}

/**
 * Extract agent ID from request
 * Priority: Authorization header > X-Agent-ID header > IP address
 */
function extractAgentId(req: Request): string {
  // Try to get from Authorization header (Bearer token)
  const authHeader = req.get('authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7) // Return token as agent ID
  }

  // Try to get from X-Agent-ID header
  const agentIdHeader = req.get('x-agent-id')
  if (agentIdHeader) {
    return agentIdHeader
  }

  // Fall back to IP address
  return req.ip || 'unknown'
}

/**
 * Get endpoint identifier from request
 */
function getEndpointId(req: Request): string {
  return `${req.method.toUpperCase()} ${req.baseUrl}${req.path}`
}

/**
 * Check if path should be excluded from rate limiting
 */
function isExcludedPath(path: string, excludePaths?: string[]): boolean {
  if (!excludePaths) return false

  return excludePaths.some(excludePath => {
    // Support wildcard patterns like /health, /status
    if (excludePath.endsWith('*')) {
      const prefix = excludePath.slice(0, -1)
      return path.startsWith(prefix)
    }
    return path === excludePath
  })
}

/**
 * Get the rate limit for a specific agent
 */
function getAgentLimit(
  agentId: string,
  config: RateLimitConfig
): number | undefined {
  return config.agentLimits?.[agentId]
}

/**
 * Get the rate limit for a specific endpoint
 */
function getEndpointLimit(
  endpoint: string,
  config: RateLimitConfig
): number | undefined {
  return config.endpointLimits?.[endpoint]
}

/**
 * Calculate the effective rate limit based on agent and endpoint limits
 * Priority: agent-specific limit > endpoint-specific limit > default
 */
function getEffectiveLimit(
  agentId: string,
  endpoint: string,
  config: RateLimitConfig
): number {
  // Agent limit takes priority over endpoint limit
  const agentLimit = getAgentLimit(agentId, config)
  if (agentLimit !== undefined) {
    return agentLimit
  }

  // Then check endpoint limit
  const endpointLimit = getEndpointLimit(endpoint, config)
  if (endpointLimit !== undefined) {
    return endpointLimit
  }

  // Fall back to default
  return config.defaultRequestsPerMinute
}

/**
 * Create rate limiter middleware
 */
export function createRateLimiter(config: RateLimitConfig): RequestHandler {
  const windowMs = config.windowMs || 60000 // Default: 1 minute
  const excludePaths = config.excludePaths || ['/health', '/status']

  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now()
    const agentId = extractAgentId(req)
    const endpoint = getEndpointId(req)
    const fullPath = req.baseUrl + req.path

    // Skip rate limiting for excluded paths
    if (isExcludedPath(fullPath, excludePaths)) {
      if (config.debug) {
        console.log(`[RateLimit] Skipping excluded path: ${fullPath}`)
      }
      next()
      return
    }

    // Initialize agent tracking if needed
    if (!rateLimitState[agentId]) {
      rateLimitState[agentId] = {}
    }

    // Get or create endpoint records
    if (!rateLimitState[agentId][endpoint]) {
      rateLimitState[agentId][endpoint] = []
    }

    // Clean up old requests
    const records = rateLimitState[agentId][endpoint]
    rateLimitState[agentId][endpoint] = cleanOldRequests(records, windowMs, now)

    // Get the effective rate limit
    const limit = getEffectiveLimit(agentId, endpoint, config)

    // Check if limit exceeded
    if (rateLimitState[agentId][endpoint].length >= limit) {
      if (config.debug) {
        console.log(
          `[RateLimit] Rate limit exceeded for agent ${agentId} on ${endpoint}. ` +
          `Current: ${rateLimitState[agentId][endpoint].length}, Limit: ${limit}`
        )
      }

      // Calculate reset time
      const oldestRequest = rateLimitState[agentId][endpoint][0]
      const resetTime = oldestRequest.timestamp + windowMs

      // Set rate limit headers
      res.set({
        'X-RateLimit-Limit': String(limit),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(resetTime),
        'Retry-After': String(Math.ceil((resetTime - now) / 1000))
      })

      // Return 429 Too Many Requests
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Rate limit exceeded. Limit: ${limit} requests per minute`,
          retryable: true,
          details: {
            limit,
            window: 'minute',
            resetTime: new Date(resetTime).toISOString(),
            retryAfterSeconds: Math.ceil((resetTime - now) / 1000)
          }
        }
      })
      return
    }

    // Record this request
    rateLimitState[agentId][endpoint].push({
      timestamp: now,
      endpoint
    })

    // Set rate limit headers
    const remaining = Math.max(0, limit - rateLimitState[agentId][endpoint].length)
    const oldestRequest = rateLimitState[agentId][endpoint][0]
    const resetTime = oldestRequest.timestamp + windowMs

    res.set({
      'X-RateLimit-Limit': String(limit),
      'X-RateLimit-Remaining': String(remaining),
      'X-RateLimit-Reset': String(resetTime)
    })

    if (config.debug) {
      console.log(
        `[RateLimit] Agent ${agentId} on ${endpoint}: ${rateLimitState[agentId][endpoint].length}/${limit}`
      )
    }

    next()
  }
}

/**
 * Reset rate limit state (useful for testing)
 */
export function resetRateLimitState(): void {
  for (const agent in rateLimitState) {
    delete rateLimitState[agent]
  }
}

/**
 * Get current rate limit state (useful for debugging/testing)
 */
export function getRateLimitState(): RateLimitState {
  return JSON.parse(JSON.stringify(rateLimitState))
}

/**
 * Get request count for an agent on an endpoint
 */
export function getRequestCount(agentId: string, endpoint: string): number {
  return rateLimitState[agentId]?.[endpoint]?.length ?? 0
}
