# Contract Blueprint Template

Use this template when creating new contract files in `/contracts/`.

---

## File Template

```typescript
/**
 * @fileoverview [One-line description - e.g., "Image Upload Service Contract"]
 * @module contracts/[FeatureName]
 * 
 * PURPOSE:
 * This contract defines the boundary between [Component A] and [Component B].
 * It ensures [specific goal or requirement from PRD].
 * [Add 1-2 more sentences about business context]
 * 
 * DATA FLOW:
 * Input: [What data enters this seam and from where]
 *   - Example: User file objects from browser file input
 *   
 * Transform: [What validation/processing happens at this boundary]
 *   - Example: Validates file type, size, count; generates preview URLs
 *   
 * Output: [What data exits this seam and to where]
 *   - Example: UploadedImage objects to application state store
 * 
 * DEPENDENCIES:
 * - Depends on: contracts/types/common.ts (ServiceResponse wrapper)
 * - Used by: 
 *   - services/mock/[Feature]Mock.ts (mock implementation)
 *   - services/real/[Feature]Service.ts (real implementation)
 *   - UI components that consume this service
 * 
 * @see /docs/planning/DATA-BOUNDARIES.md - Seam #X
 * @see /SEAMSLIST.md - Full seam documentation
 * @updated YYYY-MM-DD
 */

// ============================================================================
// IMPORTS
// ============================================================================

import type { ServiceResponse } from './types/common'

// ============================================================================
// INPUT TYPES - Data entering this seam
// ============================================================================

/**
 * Input data for [operation name]
 * 
 * @example
 * ```typescript
 * const input: [Feature]Input = {
 *   field1: 'value',
 *   field2: 123
 * }
 * ```
 */
export interface [Feature]Input {
  /**
   * [Description of this field]
   * [Any validation rules or constraints]
   */
  requiredField: string
  
  /**
   * [Description of optional field]
   * @default [default value if applicable]
   */
  optionalField?: number
}

// ============================================================================
// OUTPUT TYPES - Data exiting this seam
// ============================================================================

/**
 * Output data from [operation name]
 * 
 * Represents [what this data represents in business terms]
 */
export interface [Feature]Output {
  /**
   * [Description of this field]
   */
  id: string
  
  /**
   * [Description of this field]
   */
  result: string
  
  /**
   * ISO 8601 timestamp of when operation completed
   */
  completedAt: Date
}

// ============================================================================
// ERROR TYPES - All possible errors from this seam
// ============================================================================

/**
 * Error codes for [Feature] operations
 * 
 * Used in ServiceResponse error field
 */
export enum [Feature]ErrorCode {
  /**
   * [Description of when this error occurs]
   * @retryable false
   */
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  
  /**
   * [Description of when this error occurs]
   * @retryable true
   */
  NETWORK_ERROR = 'NETWORK_ERROR',
  
  /**
   * [Description of when this error occurs]
   * @retryable false
   */
  NOT_FOUND = 'NOT_FOUND'
}

/**
 * Error details for [Feature] failures
 */
export interface [Feature]Error {
  code: [Feature]ErrorCode
  message: string
  userMessage: string // User-friendly message for display
  retryable: boolean
  details?: Record<string, unknown> // Additional context
}

// ============================================================================
// SERVICE INTERFACE - The contract itself
// ============================================================================

/**
 * [Feature] Service Contract
 * 
 * This interface MUST be implemented by:
 * - Mock: services/mock/[Feature]Mock.ts
 * - Real: services/real/[Feature]Service.ts
 * 
 * CONTRACT RULES:
 * 1. This interface is IMMUTABLE after implementation begins
 * 2. To make breaking changes, create [Feature]ServiceV2
 * 3. All methods return ServiceResponse<T> (never throw)
 * 4. All async operations must have timeout handling
 * 5. All methods must be pure (no side effects on input params)
 */
export interface I[Feature]Service {
  /**
   * [Description of what this method does]
   * 
   * BEHAVIOR:
   * - [Specific behavior point 1]
   * - [Specific behavior point 2]
   * - [Edge cases handled]
   * 
   * ERRORS:
   * - VALIDATION_ERROR: If input fails validation
   * - NETWORK_ERROR: If external dependency fails
   * - NOT_FOUND: If requested resource doesn't exist
   * 
   * @param input - [Description of input parameter]
   * @returns Promise resolving to success result or error details
   * 
   * @example
   * ```typescript
   * const result = await service.methodName({
   *   field1: 'value',
   *   field2: 123
   * })
   * 
   * if (result.success) {
   *   console.log(result.data.result)
   * } else {
   *   console.error(result.error.message)
   * }
   * ```
   */
  methodName(input: [Feature]Input): Promise<ServiceResponse<[Feature]Output, [Feature]Error>>
}

// ============================================================================
// HELPER TYPES - Supporting types for this contract
// ============================================================================

/**
 * [Description of helper type]
 */
export type [HelperType] = 'option1' | 'option2' | 'option3'

/**
 * [Description of configuration type]
 */
export interface [Feature]Config {
  timeout: number
  maxRetries: number
  retryDelay: number
}

// ============================================================================
// CONSTANTS - Default values and constraints
// ============================================================================

/**
 * Default configuration for [Feature] operations
 */
export const DEFAULT_[FEATURE]_CONFIG: [Feature]Config = {
  timeout: 30000, // 30 seconds
  maxRetries: 3,
  retryDelay: 1000 // 1 second
}

/**
 * Validation constraints for [Feature] inputs
 */
export const [FEATURE]_CONSTRAINTS = {
  MAX_FIELD_LENGTH: 500,
  MIN_FIELD_LENGTH: 1,
  ALLOWED_VALUES: ['value1', 'value2', 'value3'] as const
} as const

// ============================================================================
// TYPE GUARDS - Runtime type validation helpers
// ============================================================================

/**
 * Type guard to check if value is valid [Feature]Input
 * 
 * @param value - Value to check
 * @returns true if value matches [Feature]Input interface
 */
export function is[Feature]Input(value: unknown): value is [Feature]Input {
  return (
    typeof value === 'object' &&
    value !== null &&
    'requiredField' in value &&
    typeof (value as [Feature]Input).requiredField === 'string'
    // Add more checks as needed
  )
}

/**
 * Type guard to check if value is valid [Feature]Output
 * 
 * @param value - Value to check
 * @returns true if value matches [Feature]Output interface
 */
export function is[Feature]Output(value: unknown): value is [Feature]Output {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'result' in value &&
    typeof (value as [Feature]Output).id === 'string' &&
    typeof (value as [Feature]Output).result === 'string'
  )
}

// ============================================================================
// EXPORT SUMMARY
// ============================================================================

/**
 * This module exports:
 * 
 * TYPES:
 * - [Feature]Input: Input data structure
 * - [Feature]Output: Output data structure
 * - [Feature]Error: Error details structure
 * - [Feature]ErrorCode: Error code enum
 * - [Feature]Config: Configuration options
 * 
 * INTERFACES:
 * - I[Feature]Service: The main contract interface
 * 
 * CONSTANTS:
 * - DEFAULT_[FEATURE]_CONFIG: Default configuration values
 * - [FEATURE]_CONSTRAINTS: Validation constraints
 * 
 * TYPE GUARDS:
 * - is[Feature]Input: Runtime input validation
 * - is[Feature]Output: Runtime output validation
 */
```

---

## Checklist for New Contracts

When creating a new contract, ensure:

### Documentation
- [ ] File header with @fileoverview
- [ ] PURPOSE section explains why this exists
- [ ] DATA FLOW section shows input → transform → output
- [ ] DEPENDENCIES section lists what depends on this
- [ ] @see references to DATA-BOUNDARIES.md and SEAMSLIST.md
- [ ] @updated timestamp is current

### Type Definitions
- [ ] Input interface defined with JSDoc for each field
- [ ] Output interface defined with JSDoc for each field
- [ ] Error enum with all possible error codes
- [ ] Error interface with code, message, userMessage, retryable
- [ ] All required fields come before optional fields
- [ ] Optional fields have @default documentation if applicable

### Service Interface
- [ ] Interface name starts with `I` (e.g., IImageUploadService)
- [ ] CONTRACT RULES comment block included
- [ ] Each method has detailed JSDoc with:
  - [ ] Description of what it does
  - [ ] BEHAVIOR section with specifics
  - [ ] ERRORS section listing all possible errors
  - [ ] @param documentation
  - [ ] @returns documentation
  - [ ] @example with working code sample
- [ ] All methods return `Promise<ServiceResponse<Output, Error>>`
- [ ] No methods throw exceptions (all errors in ServiceResponse)

### Supporting Code
- [ ] Helper types defined if needed
- [ ] Configuration interface if service is configurable
- [ ] Constants for defaults and constraints
- [ ] Type guards for runtime validation
- [ ] Export summary at end of file

### Validation
- [ ] File compiles with `npm run check`
- [ ] No `any` types used
- [ ] All imports resolve correctly
- [ ] Exported from `/contracts/index.ts`

### Traceability
- [ ] References PRD requirement
- [ ] Listed in SEAMSLIST.md
- [ ] Matches seam identified in DATA-BOUNDARIES.md

---

## Common Patterns

### Paginated Results

```typescript
export interface Paginated<T> {
  items: T[]
  pagination: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
    hasNext: boolean
    hasPrevious: boolean
  }
}
```

### Async Operations with Progress

```typescript
export interface AsyncOperation<T> {
  operationId: string
  status: 'pending' | 'in-progress' | 'completed' | 'failed'
  progress?: {
    current: number
    total: number
    percentComplete: number
  }
  result?: T
  error?: OperationError
  startedAt: Date
  completedAt?: Date
}
```

### File Upload/Download

```typescript
export interface FileUpload {
  file: File
  fileName: string
  fileSize: number
  mimeType: string
}

export interface UploadResult {
  fileId: string
  url: string
  expiresAt?: Date
}
```

---

## Anti-Patterns to Avoid

❌ **DON'T**:
- Use `any` type
- Mix multiple concerns in one contract
- Make fields optional when they should be required
- Forget error cases
- Skip examples in JSDoc
- Use abbreviations without explanation
- Create circular dependencies between contracts

✅ **DO**:
- Use `unknown` and validate with type guards
- Keep contracts focused on single seam
- Make required fields explicit
- Document all possible errors with when/why
- Provide realistic examples
- Use clear, descriptive names
- Keep dependency tree acyclic

---

## Version Management

If you need to make breaking changes to a contract:

```typescript
// OLD CONTRACT (frozen)
export interface UserSeamV1 {
  id: string
  name: string
}

export interface IUserServiceV1 {
  getUser(id: string): Promise<ServiceResponse<UserSeamV1>>
}

// NEW CONTRACT (breaking changes)
export interface UserSeamV2 extends UserSeamV1 {
  email: string // New required field = breaking change
  createdAt: Date
}

export interface IUserServiceV2 {
  getUser(id: string): Promise<ServiceResponse<UserSeamV2>>
  // Can add new methods here too
}

// ADAPTER (if both versions must coexist)
export function adaptV1ToV2(v1: UserSeamV1): UserSeamV2 {
  return {
    ...v1,
    email: 'unknown@example.com', // Provide default for new field
    createdAt: new Date()
  }
}
```

---

## Examples

See existing contracts for reference:
- `/contracts/types/common.ts` - Common types and ServiceResponse
- `/contracts/CoordinationServer.ts` - Complex multi-service contract (AI coordination)

---

## Questions?

If you're unsure about contract design:
1. Review `/seam-driven-development.md` - Contract definition section
2. Check `/docs/planning/DATA-BOUNDARIES.md` - Your seam analysis
3. Look at existing contracts for patterns
4. Ask: "Is this the minimal contract that satisfies the boundary?"
