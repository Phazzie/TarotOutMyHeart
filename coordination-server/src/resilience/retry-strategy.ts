/**
 * @fileoverview Retry Strategy with exponential backoff and jitter
 * @purpose Automatically retry failed operations with intelligent backoff
 * @dataFlow Failed operation → Retry Strategy → Wait → Retry operation
 * @boundary Resilience layer wrapping retryable operations
 * @example
 * const strategy = new RetryStrategy({ maxRetries: 3, baseDelay: 1000 })
 * const result = await strategy.execute(() => unreliableService.call())
 */

import type { ServiceResponse, ServiceError } from '@contracts'

/**
 * Configuration for retry strategy
 */
export interface RetryConfig {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries: number

  /** Base delay in milliseconds before first retry (default: 1000ms) */
  baseDelay: number

  /** Maximum delay in milliseconds (caps exponential growth, default: 30000ms) */
  maxDelay?: number

  /** Multiplier for exponential backoff (default: 2) */
  backoffMultiplier?: number

  /** Whether to add random jitter to prevent thundering herd (default: true) */
  enableJitter?: boolean

  /** Custom function to determine if error is retryable */
  isRetryable?: (error: ServiceError) => boolean

  /** Callback invoked before each retry */
  onRetry?: (attempt: number, delay: number, error: ServiceError) => void

  /** Name for logging/debugging */
  name?: string
}

/**
 * Retry attempt metadata
 */
export interface RetryAttempt {
  attemptNumber: number
  totalAttempts: number
  delay: number
  error?: ServiceError
}

/**
 * Retry strategy statistics
 */
export interface RetryStats {
  totalExecutions: number
  totalRetries: number
  successfulRetries: number
  failedRetries: number
  averageAttempts: number
}

/**
 * Retry Strategy implementation
 *
 * Implements exponential backoff with jitter to retry failed operations.
 * Automatically distinguishes between retryable and non-retryable errors.
 *
 * Backoff formula:
 * delay = min(baseDelay * (multiplier ^ attempt), maxDelay) + jitter
 * where jitter = random(0, delay * 0.3)
 */
export class RetryStrategy {
  private readonly config: Required<RetryConfig>
  private stats: RetryStats = {
    totalExecutions: 0,
    totalRetries: 0,
    successfulRetries: 0,
    failedRetries: 0,
    averageAttempts: 0
  }

  constructor(config: RetryConfig) {
    this.config = {
      maxDelay: 30000,
      backoffMultiplier: 2,
      enableJitter: true,
      isRetryable: (error) => error.retryable !== false,
      onRetry: () => {},
      name: 'RetryStrategy',
      ...config
    }
  }

  /**
   * Execute operation with retry logic
   *
   * @param operation - Async operation to execute
   * @param customConfig - Optional config overrides for this execution
   * @returns Result from operation after retries exhausted or success
   */
  async execute<T>(
    operation: () => Promise<ServiceResponse<T>>,
    customConfig?: Partial<RetryConfig>
  ): Promise<ServiceResponse<T>> {
    const config = { ...this.config, ...customConfig }
    this.stats.totalExecutions++

    let lastError: ServiceError | undefined
    let attempt = 0

    while (attempt <= config.maxRetries) {
      try {
        const result = await operation()

        if (result.success) {
          // Success!
          if (attempt > 0) {
            this.stats.successfulRetries++
            console.log(
              `[${config.name}] Operation succeeded after ${attempt} retries`
            )
          }
          this.updateAverageAttempts(attempt + 1)
          return result
        }

        // Operation returned error response
        if (!result.error) {
          // No error details but success=false (shouldn't happen, but handle it)
          return result
        }

        lastError = result.error

        // Check if error is retryable
        if (!config.isRetryable(result.error)) {
          console.log(
            `[${config.name}] Non-retryable error: ${result.error.code}`
          )
          return result
        }

        // Check if we have retries left
        if (attempt >= config.maxRetries) {
          console.error(
            `[${config.name}] Max retries (${config.maxRetries}) exhausted`
          )
          this.stats.failedRetries++
          this.updateAverageAttempts(attempt + 1)
          return result
        }

        // Calculate delay and retry
        const delay = this.calculateDelay(attempt, config)
        config.onRetry(attempt + 1, delay, result.error)

        console.log(
          `[${config.name}] Retry ${attempt + 1}/${config.maxRetries} after ${delay}ms (error: ${result.error.code})`
        )

        this.stats.totalRetries++
        await this.sleep(delay)
        attempt++
      } catch (error) {
        // Unexpected error (not ServiceResponse)
        const serviceError: ServiceError = {
          code: 'UNEXPECTED_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          retryable: true
        }

        lastError = serviceError

        if (!config.isRetryable(serviceError) || attempt >= config.maxRetries) {
          this.stats.failedRetries++
          this.updateAverageAttempts(attempt + 1)
          return {
            success: false,
            error: serviceError
          }
        }

        const delay = this.calculateDelay(attempt, config)
        config.onRetry(attempt + 1, delay, serviceError)

        console.log(
          `[${config.name}] Retry ${attempt + 1}/${config.maxRetries} after ${delay}ms (unexpected error)`
        )

        this.stats.totalRetries++
        await this.sleep(delay)
        attempt++
      }
    }

    // Should never reach here, but handle gracefully
    return {
      success: false,
      error: lastError || {
        code: 'RETRY_EXHAUSTED',
        message: 'All retry attempts exhausted',
        retryable: false
      }
    }
  }

  /**
   * Calculate delay for next retry using exponential backoff with jitter
   *
   * @param attempt - Current attempt number (0-indexed)
   * @param config - Retry configuration
   * @returns Delay in milliseconds
   */
  private calculateDelay(attempt: number, config: Required<RetryConfig>): number {
    // Exponential backoff: baseDelay * (multiplier ^ attempt)
    const exponentialDelay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt)

    // Cap at maxDelay
    const cappedDelay = Math.min(exponentialDelay, config.maxDelay)

    // Add jitter to prevent thundering herd
    if (config.enableJitter) {
      // Jitter: random value between 0 and 30% of delay
      const jitter = Math.random() * cappedDelay * 0.3
      return Math.floor(cappedDelay + jitter)
    }

    return cappedDelay
  }

  /**
   * Sleep for specified milliseconds
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Update running average of attempts per execution
   */
  private updateAverageAttempts(attempts: number): void {
    const totalAttempts = this.stats.averageAttempts * (this.stats.totalExecutions - 1) + attempts
    this.stats.averageAttempts = totalAttempts / this.stats.totalExecutions
  }

  /**
   * Get retry statistics
   */
  getStats(): RetryStats {
    return { ...this.stats }
  }

  /**
   * Reset statistics (useful for testing)
   */
  resetStats(): void {
    this.stats = {
      totalExecutions: 0,
      totalRetries: 0,
      successfulRetries: 0,
      failedRetries: 0,
      averageAttempts: 0
    }
  }
}

/**
 * Helper: Create retry strategy with common presets
 */
export const RetryPresets = {
  /**
   * Quick retries for transient errors (3 retries, 1s base delay)
   */
  quick: (): RetryStrategy =>
    new RetryStrategy({
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 8000,
      name: 'QuickRetry'
    }),

  /**
   * Standard retries for API calls (3 retries, 2s base delay)
   */
  standard: (): RetryStrategy =>
    new RetryStrategy({
      maxRetries: 3,
      baseDelay: 2000,
      maxDelay: 16000,
      name: 'StandardRetry'
    }),

  /**
   * Aggressive retries for critical operations (5 retries, 1s base delay)
   */
  aggressive: (): RetryStrategy =>
    new RetryStrategy({
      maxRetries: 5,
      baseDelay: 1000,
      maxDelay: 32000,
      name: 'AggressiveRetry'
    }),

  /**
   * Patient retries for slow external services (3 retries, 5s base delay)
   */
  patient: (): RetryStrategy =>
    new RetryStrategy({
      maxRetries: 3,
      baseDelay: 5000,
      maxDelay: 60000,
      name: 'PatientRetry'
    })
}
