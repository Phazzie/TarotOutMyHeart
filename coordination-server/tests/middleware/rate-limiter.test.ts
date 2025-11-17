/**
 * @fileoverview Tests for rate limiting middleware
 * @purpose Verify rate limiter enforces limits correctly
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Request, Response } from 'express'
import {
  createRateLimiter,
  RateLimitConfig,
  resetRateLimitState,
  getRateLimitState,
  getRequestCount
} from '../../src/middleware/rate-limiter'

/**
 * Mock Express Request
 */
class MockRequest {
  method: string = 'GET'
  path: string = '/api/test'
  baseUrl: string = ''
  ip: string = '127.0.0.1'
  headers: Record<string, string> = {}

  get(header: string): string | undefined {
    return this.headers[header.toLowerCase()]
  }
}

/**
 * Mock Express Response
 */
class MockResponse {
  statusCode: number = 200
  headers: Record<string, string | number> = {}
  jsonData: any = null
  sent: boolean = false

  status(code: number): this {
    this.statusCode = code
    return this
  }

  set(headers: Record<string, string | number>): this {
    this.headers = { ...this.headers, ...headers }
    return this
  }

  json(data: any): this {
    this.jsonData = data
    this.sent = true
    return this
  }
}

describe('Rate Limiter Middleware', () => {
  let config: RateLimitConfig
  let mockReq: MockRequest
  let mockRes: MockResponse
  let nextCalled: boolean

  beforeEach(() => {
    resetRateLimitState()
    config = {
      defaultRequestsPerMinute: 10,
      windowMs: 60000,
      debug: false
    }
    mockReq = new MockRequest()
    mockRes = new MockResponse()
    nextCalled = false
  })

  afterEach(() => {
    resetRateLimitState()
  })

  describe('Basic Rate Limiting', () => {
    it('should allow requests within limit', async () => {
      const middleware = createRateLimiter(config)
      const next = () => {
        nextCalled = true
      }

      // Make requests up to limit
      for (let i = 0; i < 10; i++) {
        mockReq.ip = '127.0.0.1'
        mockRes = new MockResponse()
        middleware(mockReq as any, mockRes as any, next)
        expect(nextCalled).toBe(true)
        nextCalled = false
      }

      // All should have 200-level response (not 429)
      expect(mockRes.statusCode).not.toBe(429)
    })

    it('should reject requests exceeding limit', async () => {
      const middleware = createRateLimiter(config)
      const next = () => {
        nextCalled = true
      }

      // Make requests up to limit + 1
      for (let i = 0; i < 11; i++) {
        mockReq.ip = '127.0.0.1'
        mockRes = new MockResponse()
        middleware(mockReq as any, mockRes as any, next)
      }

      // Last request should be rejected
      expect(mockRes.statusCode).toBe(429)
      expect(mockRes.jsonData.error.code).toBe('RATE_LIMIT_EXCEEDED')
      expect(mockRes.sent).toBe(true)
    })

    it('should not call next when limit exceeded', async () => {
      const middleware = createRateLimiter(config)
      const next = () => {
        nextCalled = true
      }

      // Exceed limit
      for (let i = 0; i < 11; i++) {
        mockReq.ip = '127.0.0.1'
        mockRes = new MockResponse()
        nextCalled = false
        middleware(mockReq as any, mockRes as any, next)
      }

      // Last request should not call next
      expect(nextCalled).toBe(false)
    })
  })

  describe('Rate Limit Headers', () => {
    it('should include rate limit headers in response', async () => {
      const middleware = createRateLimiter(config)
      const next = () => {}

      mockReq.ip = '127.0.0.1'
      middleware(mockReq as any, mockRes as any, next)

      expect(mockRes.headers['X-RateLimit-Limit']).toBe('10')
      expect(mockRes.headers['X-RateLimit-Remaining']).toBe('9')
      expect(mockRes.headers['X-RateLimit-Reset']).toBeDefined()
    })

    it('should decrease remaining count on each request', async () => {
      const middleware = createRateLimiter(config)
      const next = () => {}

      for (let i = 0; i < 3; i++) {
        mockReq.ip = '127.0.0.1'
        mockRes = new MockResponse()
        middleware(mockReq as any, mockRes as any, next)
        expect(mockRes.headers['X-RateLimit-Remaining']).toBe(String(10 - i - 1))
      }
    })

    it('should include reset time in headers', async () => {
      const middleware = createRateLimiter(config)
      const next = () => {}

      const before = Date.now()
      mockReq.ip = '127.0.0.1'
      middleware(mockReq as any, mockRes as any, next)
      const after = Date.now()

      const resetTime = parseInt(mockRes.headers['X-RateLimit-Reset'] as string)
      expect(resetTime).toBeGreaterThanOrEqual(before + 60000)
      expect(resetTime).toBeLessThanOrEqual(after + 60000)
    })

    it('should include Retry-After when limit exceeded', async () => {
      const middleware = createRateLimiter(config)
      const next = () => {}

      // Exceed limit
      for (let i = 0; i < 11; i++) {
        mockReq.ip = '127.0.0.1'
        mockRes = new MockResponse()
        middleware(mockReq as any, mockRes as any, next)
      }

      expect(mockRes.headers['Retry-After']).toBeDefined()
      const retryAfter = parseInt(mockRes.headers['Retry-After'] as string)
      expect(retryAfter).toBeGreaterThan(0)
      expect(retryAfter).toBeLessThanOrEqual(60)
    })

    it('should set remaining to 0 when limit exceeded', async () => {
      const middleware = createRateLimiter(config)
      const next = () => {}

      // Exceed limit
      for (let i = 0; i < 11; i++) {
        mockReq.ip = '127.0.0.1'
        mockRes = new MockResponse()
        middleware(mockReq as any, mockRes as any, next)
      }

      expect(mockRes.headers['X-RateLimit-Remaining']).toBe('0')
    })
  })

  describe('Per-Agent Limits', () => {
    it('should apply different limits per agent', async () => {
      config.agentLimits = {
        'claude-code': 20,
        'github-copilot': 5
      }
      const middleware = createRateLimiter(config)
      const next = () => {
        nextCalled = true
      }

      // Claude should allow 20 requests
      for (let i = 0; i < 20; i++) {
        mockReq.headers['x-agent-id'] = 'claude-code'
        mockReq.ip = '127.0.0.1'
        mockReq.path = '/api/test'
        mockReq.baseUrl = ''
        mockReq.method = 'GET'
        mockRes = new MockResponse()
        nextCalled = false
        middleware(mockReq as any, mockRes as any, next)
        expect(nextCalled).toBe(true)
      }

      // 21st should be rejected
      mockReq.headers['x-agent-id'] = 'claude-code'
      mockReq.path = '/api/test'
      mockReq.baseUrl = ''
      mockReq.method = 'GET'
      mockRes = new MockResponse()
      nextCalled = false
      middleware(mockReq as any, mockRes as any, next)
      expect(mockRes.statusCode).toBe(429)
      expect(nextCalled).toBe(false)

      // Reset for Copilot test
      resetRateLimitState()

      // Copilot should allow only 5 requests
      for (let i = 0; i < 5; i++) {
        mockReq.headers['x-agent-id'] = 'github-copilot'
        mockReq.ip = '127.0.0.1'
        mockReq.path = '/api/test'
        mockReq.baseUrl = ''
        mockReq.method = 'GET'
        mockRes = new MockResponse()
        nextCalled = false
        middleware(mockReq as any, mockRes as any, next)
        expect(nextCalled).toBe(true)
      }

      // 6th should be rejected
      mockReq.headers['x-agent-id'] = 'github-copilot'
      mockReq.path = '/api/test'
      mockReq.baseUrl = ''
      mockReq.method = 'GET'
      mockRes = new MockResponse()
      nextCalled = false
      middleware(mockReq as any, mockRes as any, next)
      expect(mockRes.statusCode).toBe(429)
    })
  })

  describe('Per-Endpoint Limits', () => {
    it('should apply different limits per endpoint', async () => {
      config.endpointLimits = {
        'POST /api/claude/register': 5,
        'POST /api/claude/tasks': 20
      }
      const middleware = createRateLimiter(config)
      const next = () => {
        nextCalled = true
      }

      // Register endpoint should allow only 5
      mockReq.method = 'POST'
      mockReq.path = '/api/claude/register'
      for (let i = 0; i < 5; i++) {
        mockReq.ip = '127.0.0.1'
        mockRes = new MockResponse()
        nextCalled = false
        middleware(mockReq as any, mockRes as any, next)
        expect(nextCalled).toBe(true)
      }

      // 6th should be rejected
      mockRes = new MockResponse()
      nextCalled = false
      middleware(mockReq as any, mockRes as any, next)
      expect(mockRes.statusCode).toBe(429)

      // Tasks endpoint should still allow requests (other agent)
      mockReq.method = 'POST'
      mockReq.path = '/api/claude/tasks'
      mockReq.ip = '192.168.1.1'
      mockRes = new MockResponse()
      nextCalled = false
      middleware(mockReq as any, mockRes as any, next)
      expect(nextCalled).toBe(true)
      expect(mockRes.statusCode).not.toBe(429)
    })
  })

  describe('Agent Identification', () => {
    it('should extract agent ID from Authorization header', async () => {
      const middleware = createRateLimiter(config)
      const next = () => {
        nextCalled = true
      }

      mockReq.headers['authorization'] = 'Bearer my-agent-token'
      mockReq.ip = '127.0.0.1'

      // Make a request
      middleware(mockReq as any, mockRes as any, next)
      expect(nextCalled).toBe(true)

      // Check that agent is identified
      const state = getRateLimitState()
      expect(state['my-agent-token']).toBeDefined()
    })

    it('should extract agent ID from X-Agent-ID header', async () => {
      const middleware = createRateLimiter(config)
      const next = () => {
        nextCalled = true
      }

      mockReq.headers['x-agent-id'] = 'claude-code'
      mockReq.ip = '127.0.0.1'

      // Make a request
      middleware(mockReq as any, mockRes as any, next)
      expect(nextCalled).toBe(true)

      // Check that agent is identified
      const state = getRateLimitState()
      expect(state['claude-code']).toBeDefined()
    })

    it('should fall back to IP address for agent ID', async () => {
      const middleware = createRateLimiter(config)
      const next = () => {
        nextCalled = true
      }

      mockReq.ip = '192.168.1.100'

      // Make a request
      middleware(mockReq as any, mockRes as any, next)
      expect(nextCalled).toBe(true)

      // Check that IP is used as agent ID
      const state = getRateLimitState()
      expect(state['192.168.1.100']).toBeDefined()
    })
  })

  describe('Excluded Paths', () => {
    it('should skip rate limiting for excluded paths', async () => {
      config.excludePaths = ['/health', '/status']
      const middleware = createRateLimiter(config)
      const next = () => {
        nextCalled = true
      }

      // Health check should bypass rate limit
      mockReq.path = '/health'
      mockReq.baseUrl = ''
      mockReq.ip = '127.0.0.1'

      for (let i = 0; i < 100; i++) {
        mockRes = new MockResponse()
        nextCalled = false
        middleware(mockReq as any, mockRes as any, next)
        expect(nextCalled).toBe(true)
        expect(mockRes.statusCode).not.toBe(429)
      }
    })

    it('should support wildcard excluded paths', async () => {
      config.excludePaths = ['/api/*']
      const middleware = createRateLimiter(config)
      const next = () => {
        nextCalled = true
      }

      mockReq.path = '/api/health'
      mockReq.baseUrl = ''
      mockReq.ip = '127.0.0.1'

      for (let i = 0; i < 100; i++) {
        mockRes = new MockResponse()
        nextCalled = false
        middleware(mockReq as any, mockRes as any, next)
        expect(nextCalled).toBe(true)
      }
    })
  })

  describe('Request Count Tracking', () => {
    it('should track request count per agent per endpoint', async () => {
      const middleware = createRateLimiter(config)
      const next = () => {}

      mockReq.headers['x-agent-id'] = 'claude-code'
      mockReq.method = 'GET'
      mockReq.path = '/api/test'
      mockReq.baseUrl = ''

      middleware(mockReq as any, mockRes as any, next)
      middleware(mockReq as any, mockRes as any, next)
      middleware(mockReq as any, mockRes as any, next)

      const count = getRequestCount('claude-code', 'GET /api/test')
      expect(count).toBe(3)
    })

    it('should track requests separately per endpoint', async () => {
      const middleware = createRateLimiter(config)
      const next = () => {}

      mockReq.headers['x-agent-id'] = 'claude-code'
      mockReq.baseUrl = ''

      // Make requests to /api/test
      mockReq.method = 'GET'
      mockReq.path = '/api/test'
      middleware(mockReq as any, mockRes as any, next)
      middleware(mockReq as any, mockRes as any, next)

      // Make requests to /api/other
      mockReq.path = '/api/other'
      middleware(mockReq as any, mockRes as any, next)

      const testCount = getRequestCount('claude-code', 'GET /api/test')
      const otherCount = getRequestCount('claude-code', 'GET /api/other')

      expect(testCount).toBe(2)
      expect(otherCount).toBe(1)
    })
  })

  describe('Window Reset', () => {
    it('should allow new requests after window expires', async () => {
      config.windowMs = 100 // 100ms window for testing
      const middleware = createRateLimiter(config)
      const next = () => {
        nextCalled = true
      }

      mockReq.ip = '127.0.0.1'

      // Fill up the limit
      for (let i = 0; i < 10; i++) {
        mockRes = new MockResponse()
        nextCalled = false
        middleware(mockReq as any, mockRes as any, next)
        expect(nextCalled).toBe(true)
      }

      // Next request should be rejected
      mockRes = new MockResponse()
      nextCalled = false
      middleware(mockReq as any, mockRes as any, next)
      expect(mockRes.statusCode).toBe(429)
      expect(nextCalled).toBe(false)

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150))

      // Now requests should be allowed again
      mockRes = new MockResponse()
      nextCalled = false
      middleware(mockReq as any, mockRes as any, next)
      expect(nextCalled).toBe(true)
      expect(mockRes.statusCode).not.toBe(429)
    })
  })

  describe('Error Response Format', () => {
    it('should return proper error response when limit exceeded', async () => {
      const middleware = createRateLimiter(config)
      const next = () => {}

      // Exceed limit
      for (let i = 0; i < 11; i++) {
        mockReq.ip = '127.0.0.1'
        mockRes = new MockResponse()
        middleware(mockReq as any, mockRes as any, next)
      }

      expect(mockRes.statusCode).toBe(429)
      expect(mockRes.jsonData.success).toBe(false)
      expect(mockRes.jsonData.error).toBeDefined()
      expect(mockRes.jsonData.error.code).toBe('RATE_LIMIT_EXCEEDED')
      expect(mockRes.jsonData.error.message).toContain('Rate limit exceeded')
      expect(mockRes.jsonData.error.retryable).toBe(true)
      expect(mockRes.jsonData.error.details).toBeDefined()
      expect(mockRes.jsonData.error.details.limit).toBe(10)
      expect(mockRes.jsonData.error.details.window).toBe('minute')
      expect(mockRes.jsonData.error.details.resetTime).toBeDefined()
      expect(mockRes.jsonData.error.details.retryAfterSeconds).toBeDefined()
    })
  })

  describe('Multiple Agents', () => {
    it('should track different agents separately', async () => {
      const middleware = createRateLimiter(config)
      const next = () => {
        nextCalled = true
      }

      // Agent 1 makes 5 requests
      for (let i = 0; i < 5; i++) {
        mockReq.headers['x-agent-id'] = 'agent-1'
        mockReq.ip = '127.0.0.1'
        mockRes = new MockResponse()
        nextCalled = false
        middleware(mockReq as any, mockRes as any, next)
        expect(nextCalled).toBe(true)
      }

      // Agent 2 makes 5 requests
      for (let i = 0; i < 5; i++) {
        mockReq.headers['x-agent-id'] = 'agent-2'
        mockReq.ip = '127.0.0.1'
        mockRes = new MockResponse()
        nextCalled = false
        middleware(mockReq as any, mockRes as any, next)
        expect(nextCalled).toBe(true)
      }

      // Both agents should have used 5 requests out of 10
      const count1 = getRequestCount('agent-1', 'GET /api/test')
      const count2 = getRequestCount('agent-2', 'GET /api/test')

      expect(count1).toBe(5)
      expect(count2).toBe(5)
    })
  })
})
