/**
 * @fileoverview Circuit Breaker Pattern Implementation for fault tolerance
 * @purpose Prevent cascading failures by failing fast when service is unhealthy
 * @dataFlow Service calls → Circuit Breaker → Protected service or fallback
 * @boundary Resilience layer wrapping external service calls
 * @example
 * const breaker = new CircuitBreaker({ failureThreshold: 5, resetTimeout: 30000 })
 * const result = await breaker.execute(() => externalService.call(), fallbackFn)
 */

import type { ServiceResponse, ServiceError } from '@contracts'

/**
 * Circuit breaker states
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Too many failures, requests fail immediately
 * - HALF_OPEN: Testing if service recovered, limited requests allowed
 */
export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

/**
 * Configuration options for circuit breaker
 */
export interface CircuitBreakerConfig {
  /** Number of consecutive failures before opening circuit */
  failureThreshold: number

  /** Time in ms to wait before attempting recovery (OPEN → HALF_OPEN) */
  resetTimeout: number

  /** Number of successful calls in HALF_OPEN before closing circuit */
  successThreshold?: number

  /** Custom function to determine if error should count as failure */
  isFailure?: (error: ServiceError) => boolean

  /** Name for logging/debugging */
  name?: string
}

/**
 * Circuit breaker statistics for monitoring
 */
export interface CircuitBreakerStats {
  state: CircuitState
  failureCount: number
  successCount: number
  totalCalls: number
  lastFailureTime?: Date
  lastStateChange: Date
}

/**
 * Circuit Breaker implementation
 *
 * Protects services from cascading failures by monitoring success/failure rates
 * and automatically cutting off traffic when failure threshold exceeded.
 *
 * State transitions:
 * - CLOSED → OPEN: After N consecutive failures
 * - OPEN → HALF_OPEN: After reset timeout expires
 * - HALF_OPEN → CLOSED: After M consecutive successes
 * - HALF_OPEN → OPEN: On any failure
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED
  private failureCount = 0
  private successCount = 0
  private totalCalls = 0
  private lastFailureTime?: Date
  private lastStateChange: Date = new Date()
  private resetTimer?: NodeJS.Timeout

  private readonly config: Required<CircuitBreakerConfig>

  constructor(config: CircuitBreakerConfig) {
    this.config = {
      successThreshold: 2,
      isFailure: (error) => error.retryable !== false,
      name: 'CircuitBreaker',
      ...config
    }
  }

  /**
   * Execute a protected operation through the circuit breaker
   *
   * @param operation - Async operation to execute
   * @param fallback - Optional fallback function if circuit is open
   * @returns Result from operation or fallback
   */
  async execute<T>(
    operation: () => Promise<ServiceResponse<T>>,
    fallback?: () => Promise<ServiceResponse<T>>
  ): Promise<ServiceResponse<T>> {
    this.totalCalls++

    // If circuit is OPEN, fail fast
    if (this.state === CircuitState.OPEN) {
      console.warn(`[${this.config.name}] Circuit is OPEN, failing fast`)

      if (fallback) {
        return await fallback()
      }

      return {
        success: false,
        error: {
          code: 'CIRCUIT_OPEN',
          message: 'Service unavailable due to repeated failures',
          retryable: true,
          details: {
            state: this.state,
            failureCount: this.failureCount,
            lastFailureTime: this.lastFailureTime?.toISOString()
          }
        }
      }
    }

    try {
      const result = await operation()

      if (result.success) {
        this.onSuccess()
      } else if (result.error && this.config.isFailure(result.error)) {
        this.onFailure()
      }

      return result
    } catch (error) {
      // Unexpected error (not ServiceResponse)
      this.onFailure()

      return {
        success: false,
        error: {
          code: 'UNEXPECTED_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          retryable: true
        }
      }
    }
  }

  /**
   * Handle successful operation
   * Increments success counter and may transition HALF_OPEN → CLOSED
   */
  private onSuccess(): void {
    this.successCount++

    if (this.state === CircuitState.HALF_OPEN) {
      if (this.successCount >= this.config.successThreshold) {
        console.log(`[${this.config.name}] Service recovered, closing circuit`)
        this.transitionTo(CircuitState.CLOSED)
        this.resetCounters()
      }
    } else if (this.state === CircuitState.CLOSED) {
      // Reset failure count on success in CLOSED state
      this.failureCount = 0
    }
  }

  /**
   * Handle failed operation
   * Increments failure counter and may transition CLOSED → OPEN or HALF_OPEN → OPEN
   */
  private onFailure(): void {
    this.failureCount++
    this.lastFailureTime = new Date()

    if (this.state === CircuitState.CLOSED) {
      if (this.failureCount >= this.config.failureThreshold) {
        console.error(
          `[${this.config.name}] Failure threshold reached (${this.failureCount}/${this.config.failureThreshold}), opening circuit`
        )
        this.transitionTo(CircuitState.OPEN)
        this.scheduleReset()
      }
    } else if (this.state === CircuitState.HALF_OPEN) {
      console.warn(`[${this.config.name}] Failure in HALF_OPEN state, reopening circuit`)
      this.transitionTo(CircuitState.OPEN)
      this.scheduleReset()
    }
  }

  /**
   * Transition to new state and update timestamp
   */
  private transitionTo(newState: CircuitState): void {
    const oldState = this.state
    this.state = newState
    this.lastStateChange = new Date()

    console.log(`[${this.config.name}] State transition: ${oldState} → ${newState}`)
  }

  /**
   * Schedule automatic reset from OPEN → HALF_OPEN
   */
  private scheduleReset(): void {
    if (this.resetTimer) {
      clearTimeout(this.resetTimer)
    }

    this.resetTimer = setTimeout(() => {
      console.log(`[${this.config.name}] Reset timeout expired, entering HALF_OPEN state`)
      this.transitionTo(CircuitState.HALF_OPEN)
      this.resetCounters()
    }, this.config.resetTimeout)
  }

  /**
   * Reset all counters (called when closing circuit or entering HALF_OPEN)
   */
  private resetCounters(): void {
    this.failureCount = 0
    this.successCount = 0
  }

  /**
   * Get current circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      totalCalls: this.totalCalls,
      lastFailureTime: this.lastFailureTime,
      lastStateChange: this.lastStateChange
    }
  }

  /**
   * Manually reset circuit to CLOSED state
   * Use with caution - typically for testing or admin override
   */
  reset(): void {
    console.log(`[${this.config.name}] Manual reset to CLOSED state`)

    if (this.resetTimer) {
      clearTimeout(this.resetTimer)
      this.resetTimer = undefined
    }

    this.transitionTo(CircuitState.CLOSED)
    this.resetCounters()
  }

  /**
   * Manually open circuit
   * Use for maintenance or forced shutdown
   */
  forceOpen(): void {
    console.warn(`[${this.config.name}] Manually forcing circuit OPEN`)
    this.transitionTo(CircuitState.OPEN)
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state
  }

  /**
   * Check if circuit is allowing requests
   */
  isOpen(): boolean {
    return this.state === CircuitState.OPEN
  }

  /**
   * Cleanup resources (clear timers)
   */
  destroy(): void {
    if (this.resetTimer) {
      clearTimeout(this.resetTimer)
      this.resetTimer = undefined
    }
  }
}
