# Stub Blueprint Template

Use this template when creating mock or real service implementations.

---

## Mock Service Template

Location: `/services/mock/[Feature]Mock.ts`

```typescript
/**
 * @fileoverview Mock implementation of [Feature] Service
 * @module services/mock/[Feature]Mock
 *
 * PURPOSE:
 * Provides a mock implementation of I[Feature]Service for development and testing.
 * Returns realistic fake data that matches the contract exactly.
 * Allows UI development without waiting for real API integration.
 *
 * DATA FLOW:
 * Input: [Feature]Input from UI components or tests
 * Mock Logic: [Describe how mock generates responses - e.g., "Returns hardcoded success response with realistic data"]
 * Output: ServiceResponse<[Feature]Output> matching contract exactly
 *
 * MOCK BEHAVIOR:
 * - [Describe success case behavior]
 * - [Describe error case simulation]
 * - [Describe edge cases handled]
 * - Delays: [Any artificial delays to simulate network?]
 * - State: [Stateful or stateless?]
 *
 * DEPENDENCIES:
 * - Implements: contracts/[Feature].ts (I[Feature]Service)
 * - Uses: contracts/types/common.ts (ServiceResponse)
 * - Used by: services/factory.ts (when USE_MOCKS=true)
 *
 * @see /contracts/[Feature].ts - Contract definition
 * @see /tests/mocks/[Feature].test.ts - Mock validation tests
 * @updated YYYY-MM-DD
 */

// ============================================================================
// IMPORTS
// ============================================================================

import type {
  I[Feature]Service,
  [Feature]Input,
  [Feature]Output,
  [Feature]Error,
  [Feature]ErrorCode
} from '$contracts/[Feature]'
import type { ServiceResponse } from '$contracts/types/common'

// ============================================================================
// MOCK DATA - Realistic fake data
// ============================================================================

/**
 * Sample successful output data
 * Should represent realistic, valid data
 */
const MOCK_SUCCESS_DATA: [Feature]Output = {
  id: 'mock-id-12345',
  result: 'Mock result data',
  completedAt: new Date('2025-11-07T12:00:00Z')
}

/**
 * Sample error scenarios
 * Should cover all error codes from contract
 */
const MOCK_ERRORS: Record<[Feature]ErrorCode, [Feature]Error> = {
  VALIDATION_ERROR: {
    code: 'VALIDATION_ERROR',
    message: 'Validation failed: Invalid input',
    userMessage: 'Please check your input and try again',
    retryable: false,
    details: { field: 'requiredField', reason: 'Field is required' }
  },
  NETWORK_ERROR: {
    code: 'NETWORK_ERROR',
    message: 'Network request failed',
    userMessage: 'Connection error. Please try again.',
    retryable: true
  },
  NOT_FOUND: {
    code: 'NOT_FOUND',
    message: 'Resource not found',
    userMessage: 'The requested item could not be found',
    retryable: false
  }
}

// ============================================================================
// MOCK CONFIGURATION
// ============================================================================

/**
 * Configuration for mock behavior
 * Adjust these to simulate different scenarios
 */
const MOCK_CONFIG = {
  /**
   * Artificial delay to simulate network latency (milliseconds)
   */
  delay: 300,

  /**
   * Probability of random errors (0.0 = never, 1.0 = always)
   * Set to 0.0 for predictable behavior
   */
  errorRate: 0.0,

  /**
   * Whether to log mock calls to console
   */
  verbose: false
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Simulates network delay
 * @param ms - Milliseconds to delay
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Logs mock service calls if verbose mode enabled
 * @param method - Name of method called
 * @param input - Input parameters
 */
function logMockCall(method: string, input: unknown): void {
  if (MOCK_CONFIG.verbose) {
    console.log(`[MOCK] [Feature].${method}`, input)
  }
}

/**
 * Creates a successful ServiceResponse
 * @param data - Success data
 */
function createSuccessResponse<T>(data: T): ServiceResponse<T, [Feature]Error> {
  return {
    success: true,
    data,
    timestamp: new Date()
  }
}

/**
 * Creates an error ServiceResponse
 * @param error - Error details
 */
function createErrorResponse(error: [Feature]Error): ServiceResponse<[Feature]Output, [Feature]Error> {
  return {
    success: false,
    error,
    timestamp: new Date()
  }
}

// ============================================================================
// MOCK SERVICE IMPLEMENTATION
// ============================================================================

/**
 * Mock implementation of I[Feature]Service
 *
 * BEHAVIOR:
 * - Returns realistic fake data matching contract
 * - Simulates network delay if configured
 * - Can simulate random errors if errorRate > 0
 * - Logs calls if verbose mode enabled
 *
 * TESTING:
 * Run mock validation tests with: npm run test:mocks
 */
export class Mock[Feature]Service implements I[Feature]Service {
  /**
   * Mock implementation of methodName
   *
   * Returns success response with mock data by default.
   * Can return error if configured or if input triggers error condition.
   *
   * @param input - Input parameters
   * @returns Promise resolving to mock response
   */
  async methodName(input: [Feature]Input): Promise<ServiceResponse<[Feature]Output, [Feature]Error>> {
    logMockCall('methodName', input)

    // Simulate network delay
    if (MOCK_CONFIG.delay > 0) {
      await delay(MOCK_CONFIG.delay)
    }

    // Simulate random errors (if configured)
    if (MOCK_CONFIG.errorRate > 0 && Math.random() < MOCK_CONFIG.errorRate) {
      return createErrorResponse(MOCK_ERRORS.NETWORK_ERROR)
    }

    // Validate input (basic validation for realistic mock behavior)
    if (!input.requiredField || input.requiredField.trim() === '') {
      return createErrorResponse(MOCK_ERRORS.VALIDATION_ERROR)
    }

    // Return mock success response
    // In real implementation, generate unique IDs, timestamps, etc.
    const mockOutput: [Feature]Output = {
      ...MOCK_SUCCESS_DATA,
      id: `mock-${Date.now()}`, // Generate unique ID
      completedAt: new Date()
    }

    return createSuccessResponse(mockOutput)
  }
}

// ============================================================================
// MOCK SCENARIOS - For testing different cases
// ============================================================================

/**
 * Pre-configured mock instances for specific scenarios
 * Useful for testing error handling, edge cases, etc.
 */
export const mockScenarios = {
  /**
   * Always succeeds with valid data
   */
  success: new Mock[Feature]Service(),

  /**
   * Always returns validation error
   */
  validationError: {
    async methodName(): Promise<ServiceResponse<[Feature]Output, [Feature]Error>> {
      await delay(MOCK_CONFIG.delay)
      return createErrorResponse(MOCK_ERRORS.VALIDATION_ERROR)
    }
  } as I[Feature]Service,

  /**
   * Always returns network error (retryable)
   */
  networkError: {
    async methodName(): Promise<ServiceResponse<[Feature]Output, [Feature]Error>> {
      await delay(MOCK_CONFIG.delay)
      return createErrorResponse(MOCK_ERRORS.NETWORK_ERROR)
    }
  } as I[Feature]Service,

  /**
   * Returns not found error
   */
  notFound: {
    async methodName(): Promise<ServiceResponse<[Feature]Output, [Feature]Error>> {
      await delay(MOCK_CONFIG.delay)
      return createErrorResponse(MOCK_ERRORS.NOT_FOUND)
    }
  } as I[Feature]Service,

  /**
   * Very slow response (for testing timeouts)
   */
  slow: {
    async methodName(input: [Feature]Input): Promise<ServiceResponse<[Feature]Output, [Feature]Error>> {
      await delay(5000) // 5 second delay
      return createSuccessResponse({
        ...MOCK_SUCCESS_DATA,
        id: `mock-slow-${Date.now()}`,
        completedAt: new Date()
      })
    }
  } as I[Feature]Service
}

// ============================================================================
// EXPORTS
// ============================================================================

/**
 * Default mock instance for normal usage
 */
export const mock[Feature]Service = new Mock[Feature]Service()

/**
 * Export type for mock service
 */
export type Mock[Feature]ServiceType = Mock[Feature]Service
```

---

## Real Service Template

Location: `/services/real/[Feature]Service.ts`

```typescript
/**
 * @fileoverview Real implementation of [Feature] Service
 * @module services/real/[Feature]Service
 *
 * PURPOSE:
 * Provides the production implementation of I[Feature]Service.
 * Integrates with [external API/database/service name].
 * Handles authentication, error recovery, retries, and rate limiting.
 *
 * DATA FLOW:
 * Input: [Feature]Input from UI components
 * API Call: Makes [HTTP/gRPC/database] request to [external service]
 *   - Endpoint: [URL or connection details]
 *   - Auth: [How authentication works]
 *   - Format: [Request/response format - JSON, protobuf, etc.]
 * Transform: Converts API response to [Feature]Output format
 * Output: ServiceResponse<[Feature]Output> matching contract
 *
 * ERROR HANDLING:
 * - Network errors: Retry with exponential backoff
 * - Validation errors: Return immediately (no retry)
 * - Rate limits: [How rate limiting is handled]
 * - Timeouts: [Timeout values and behavior]
 *
 * DEPENDENCIES:
 * - Implements: contracts/[Feature].ts (I[Feature]Service)
 * - Uses: [External API library, SDK, etc.]
 * - Environment: Requires [ENV_VAR_NAME] environment variable
 * - Used by: services/factory.ts (when USE_MOCKS=false)
 *
 * @see /contracts/[Feature].ts - Contract definition
 * @see /tests/integration/[Feature].test.ts - Integration tests
 * @see [External API documentation URL]
 * @updated YYYY-MM-DD
 */

// ============================================================================
// IMPORTS
// ============================================================================

import type {
  I[Feature]Service,
  [Feature]Input,
  [Feature]Output,
  [Feature]Error,
  [Feature]ErrorCode
} from '$contracts/[Feature]'
import type { ServiceResponse } from '$contracts/types/common'

// External dependencies (e.g., API client libraries)
// import { ExternalAPIClient } from 'external-sdk'

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Service configuration loaded from environment variables
 */
interface [Feature]ServiceConfig {
  /**
   * API endpoint URL
   */
  apiUrl: string

  /**
   * API authentication key
   */
  apiKey: string

  /**
   * Request timeout in milliseconds
   */
  timeout: number

  /**
   * Maximum retry attempts for retryable errors
   */
  maxRetries: number

  /**
   * Initial retry delay in milliseconds
   */
  retryDelay: number

  /**
   * Whether to log API calls (debug mode)
   */
  verbose: boolean
}

/**
 * Loads configuration from environment variables
 * Throws if required environment variables are missing
 */
function loadConfig(): [Feature]ServiceConfig {
  const apiKey = process.env.[FEATURE]_API_KEY

  if (!apiKey) {
    throw new Error('[FEATURE]_API_KEY environment variable is required')
  }

  return {
    apiUrl: process.env.[FEATURE]_API_URL || 'https://api.example.com/v1',
    apiKey,
    timeout: parseInt(process.env.[FEATURE]_TIMEOUT || '30000', 10),
    maxRetries: parseInt(process.env.[FEATURE]_MAX_RETRIES || '3', 10),
    retryDelay: parseInt(process.env.[FEATURE]_RETRY_DELAY || '1000', 10),
    verbose: process.env.NODE_ENV === 'development'
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Exponential backoff delay calculation
 * @param attempt - Current retry attempt (0-indexed)
 * @param baseDelay - Base delay in milliseconds
 * @returns Delay in milliseconds with jitter
 */
function calculateBackoff(attempt: number, baseDelay: number): number {
  const exponentialDelay = baseDelay * Math.pow(2, attempt)
  const jitter = Math.random() * 0.3 * exponentialDelay // 30% jitter
  return Math.min(exponentialDelay + jitter, 30000) // Max 30 seconds
}

/**
 * Logs API calls if verbose mode enabled
 * @param method - Service method name
 * @param details - Call details
 */
function logAPICall(method: string, details: unknown): void {
  if (config.verbose) {
    console.log(`[API] [Feature].${method}`, details)
  }
}

/**
 * Creates a successful ServiceResponse
 * @param data - Success data
 */
function createSuccessResponse<T>(data: T): ServiceResponse<T, [Feature]Error> {
  return {
    success: true,
    data,
    timestamp: new Date()
  }
}

/**
 * Creates an error ServiceResponse
 * @param error - Error details
 */
function createErrorResponse(error: [Feature]Error): ServiceResponse<[Feature]Output, [Feature]Error> {
  return {
    success: false,
    error,
    timestamp: new Date()
  }
}

/**
 * Maps external API error to contract error
 * @param apiError - Error from external API
 * @returns Standardized contract error
 */
function mapAPIError(apiError: unknown): [Feature]Error {
  // Parse external API error format
  // Map to contract error codes
  // Determine if retryable
  // Generate user-friendly message

  if (apiError instanceof Error) {
    // Network error
    if (apiError.message.includes('network') || apiError.message.includes('timeout')) {
      return {
        code: 'NETWORK_ERROR',
        message: apiError.message,
        userMessage: 'Connection error. Please try again.',
        retryable: true
      }
    }

    // Default error
    return {
      code: 'VALIDATION_ERROR',
      message: apiError.message,
      userMessage: 'An error occurred. Please check your input.',
      retryable: false
    }
  }

  // Unknown error
  return {
    code: 'VALIDATION_ERROR',
    message: 'Unknown error occurred',
    userMessage: 'An unexpected error occurred',
    retryable: false
  }
}

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

// Load configuration at module initialization
const config = loadConfig()

/**
 * Real implementation of I[Feature]Service
 *
 * INTEGRATION:
 * - Connects to [external service name] at [endpoint]
 * - Uses [authentication method]
 * - Implements retry logic with exponential backoff
 * - Handles rate limiting via [strategy]
 *
 * PERFORMANCE:
 * - Typical response time: [X ms]
 * - Timeout: [configured timeout]
 * - Rate limit: [X requests per minute]
 *
 * ERROR RECOVERY:
 * - Retries transient failures up to [maxRetries] times
 * - Uses exponential backoff with jitter
 * - Logs errors in development mode
 */
export class [Feature]Service implements I[Feature]Service {
  /**
   * [Feature] service configuration
   */
  private readonly config: [Feature]ServiceConfig

  /**
   * [Optional: API client instance]
   */
  // private readonly client: ExternalAPIClient

  /**
   * Creates new [Feature]Service instance
   * @param customConfig - Optional custom configuration (for testing)
   */
  constructor(customConfig?: Partial<[Feature]ServiceConfig>) {
    this.config = { ...config, ...customConfig }

    // Initialize API client
    // this.client = new ExternalAPIClient({
    //   apiKey: this.config.apiKey,
    //   baseURL: this.config.apiUrl
    // })
  }

  /**
   * Real implementation of methodName
   *
   * Makes [HTTP POST/GET/etc.] request to [endpoint].
   * Retries on transient failures with exponential backoff.
   *
   * @param input - Input parameters
   * @returns Promise resolving to API response
   */
  async methodName(input: [Feature]Input): Promise<ServiceResponse<[Feature]Output, [Feature]Error>> {
    logAPICall('methodName', { input })

    // Input validation (defensive programming)
    if (!input.requiredField || input.requiredField.trim() === '') {
      return createErrorResponse({
        code: 'VALIDATION_ERROR',
        message: 'Required field is missing or empty',
        userMessage: 'Please provide all required information',
        retryable: false,
        details: { field: 'requiredField' }
      })
    }

    // Retry loop with exponential backoff
    let lastError: [Feature]Error | null = null

    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        // Make API call
        // const response = await this.client.callEndpoint({
        //   ...input
        // })

        // PLACEHOLDER: Replace with real API call
        const response = {
          id: `real-${Date.now()}`,
          result: 'Real API result',
          completedAt: new Date()
        }

        // Validate response matches contract
        if (!this.isValidOutput(response)) {
          throw new Error('API returned invalid response format')
        }

        // Success!
        logAPICall('methodName.success', { attempt, response })
        return createSuccessResponse(response as [Feature]Output)

      } catch (error) {
        lastError = mapAPIError(error)

        // Don't retry non-retryable errors
        if (!lastError.retryable) {
          logAPICall('methodName.error', { attempt, error: lastError, retry: false })
          return createErrorResponse(lastError)
        }

        // Calculate backoff delay
        if (attempt < this.config.maxRetries - 1) {
          const delay = calculateBackoff(attempt, this.config.retryDelay)
          logAPICall('methodName.retry', { attempt, delay, error: lastError })
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    // All retries exhausted
    logAPICall('methodName.failed', { error: lastError })
    return createErrorResponse(
      lastError || {
        code: 'NETWORK_ERROR',
        message: 'Maximum retry attempts exceeded',
        userMessage: 'Service unavailable. Please try again later.',
        retryable: true
      }
    )
  }

  /**
   * Validates that API response matches contract output type
   * @param value - Response from API
   * @returns true if valid [Feature]Output
   */
  private isValidOutput(value: unknown): value is [Feature]Output {
    return (
      typeof value === 'object' &&
      value !== null &&
      'id' in value &&
      'result' in value &&
      typeof (value as [Feature]Output).id === 'string' &&
      typeof (value as [Feature]Output).result === 'string'
    )
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

/**
 * Default service instance for production usage
 */
export const [feature]Service = new [Feature]Service()

/**
 * Export type for service class
 */
export type [Feature]ServiceType = [Feature]Service
```

---

## Service Factory Template

Location: `/services/factory.ts`

````typescript
/**
 * @fileoverview Service Factory - Routes to mock or real services
 * @module services/factory
 *
 * PURPOSE:
 * Central factory that provides either mock or real service implementations
 * based on USE_MOCKS configuration flag. Allows easy switching between
 * development (mocks) and production (real) without changing consumer code.
 *
 * DATA FLOW:
 * Configuration: USE_MOCKS flag determines which implementation to return
 * Import: Lazy-loads either mock or real service module
 * Export: Returns service instance matching contract interface
 *
 * USAGE:
 * ```typescript
 * import { featureService } from '$services/factory'
 * // Gets mock OR real implementation transparently
 * const result = await featureService.methodName(input)
 * ```
 *
 * DEPENDENCIES:
 * - Imports: All service contracts from $contracts
 * - Imports: Mock services from services/mock/*
 * - Imports: Real services from services/real/*
 * - Used by: All application code that needs services
 *
 * @updated YYYY-MM-DD
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Determines whether to use mock or real services
 *
 * - true: Use mocks (development, testing, offline work)
 * - false: Use real services (production, integration testing)
 *
 * Can be overridden via environment variable: USE_MOCKS=false
 */
export const USE_MOCKS = process.env.USE_MOCKS !== 'false'

// ============================================================================
// SERVICE EXPORTS
// ============================================================================

/**
 * [Feature] Service
 * Returns mock or real implementation based on USE_MOCKS flag
 */
export const featureService: I[Feature]Service = USE_MOCKS
  ? (await import('./mock/[Feature]Mock')).mock[Feature]Service
  : (await import('./real/[Feature]Service')).[feature]Service

// Add exports for all services...

// ============================================================================
// LOGGING
// ============================================================================

if (USE_MOCKS) {
  console.log('[Services] Using MOCK implementations')
} else {
  console.log('[Services] Using REAL implementations')
}
````

---

## Checklist for New Service Stubs

### Mock Service

- [ ] File header with @fileoverview and all sections
- [ ] Implements contract interface exactly
- [ ] Mock data constants defined
- [ ] Mock configuration (delay, errorRate, verbose)
- [ ] Helper functions (delay, logging, response creators)
- [ ] Main service class implementing interface
- [ ] All contract methods implemented
- [ ] Mock scenarios exported (success, errors, edge cases)
- [ ] Default mock instance exported
- [ ] File compiles with `npm run check`
- [ ] Mock matches contract (validate with tests)

### Real Service

- [ ] File header with @fileoverview and all sections
- [ ] Implements contract interface exactly
- [ ] Configuration interface and loader function
- [ ] Environment variable validation
- [ ] Helper functions (backoff, logging, error mapping)
- [ ] Main service class implementing interface
- [ ] All contract methods implemented
- [ ] Retry logic with exponential backoff
- [ ] Error handling and mapping
- [ ] Response validation
- [ ] Default service instance exported
- [ ] File compiles with `npm run check`
- [ ] Integration tests pass

### Factory

- [ ] USE_MOCKS flag configured
- [ ] All services exported with correct type
- [ ] Lazy loading for tree-shaking
- [ ] Logging indicates which mode (mock/real)

---

## Testing the Stub

See `/docs/blueprints/TEST-BLUEPRINT.md` for test templates.

Quick validation:

```bash
# Compile check
npm run check

# Contract tests (validate mock matches contract)
npm run test:contracts

# Mock tests (validate mock behavior)
npm run test:mocks

# Integration tests (validate real service)
npm run test:integration
```
