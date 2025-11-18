# GitHub Coding Agent Task: Write Missing Tarot Contract Tests

## Objective

Write contract validation tests for 7 Tarot application seams following the existing test patterns from AI Coordination tests. All mocks exist and need validation tests to prove they match contracts exactly per SDD Phase 3 requirements.

## Context

- **Project**: TarotUpMyHeart - Seam-Driven Development (SDD) Tarot deck generator
- **Phase**: Phase 3 - Mock validation (REQUIRED before UI development)
- **Methodology**: See `/seam-driven-development.md` and `/AGENTS.md`
- **Test Framework**: Vitest
- **Location**: `/tests/contracts/`

## Existing Test Examples (FOLLOW THESE PATTERNS)

Study these existing tests as templates:

- `/tests/contracts/StateStore.test.ts` - Shows async operations, error handling
- `/tests/contracts/ClaudeCoordination.test.ts` - Shows interface compliance
- `/tests/contracts/CopilotCoordination.test.ts` - Shows MCP tools testing
- `/tests/contracts/UserCoordination.test.ts` - Shows simple CRUD operations
- `/tests/contracts/FileSystemCoordination.test.ts` - Shows file operations

## Missing Test Files (CREATE THESE 7 FILES)

### 1. `/tests/contracts/ImageUpload.test.ts`

**Contract**: `/contracts/ImageUpload.ts`  
**Mock**: `/services/mock/ImageUploadMock.ts`  
**Test Requirements**:

- ✅ Mock implements `IImageUploadService` interface
- ✅ `uploadImages()` validates MIN_IMAGES (1) and MAX_IMAGES (5)
- ✅ `uploadImages()` validates file size <= MAX_IMAGE_SIZE_BYTES (10MB)
- ✅ `uploadImages()` validates image types (JPEG, PNG, WebP)
- ✅ `uploadImages()` rejects duplicate images
- ✅ `uploadImages()` returns `UploadedImage[]` with id, url, fileName, fileSize, uploadedAt
- ✅ `uploadImages()` returns errors with correct `ImageUploadErrorCode` enum values
- ✅ `deleteImage()` removes image and returns success
- ✅ `deleteImage()` returns error for non-existent image
- ✅ `getUploadedImages()` returns current images array
- ✅ `clearAllImages()` removes all images
- ✅ All async methods return Promises
- ✅ All return types match contract exactly

### 2. `/tests/contracts/StyleInput.test.ts`

**Contract**: `/contracts/StyleInput.ts`  
**Mock**: `/services/mock/StyleInputMock.ts`  
**Test Requirements**:

- ✅ Mock implements `IStyleInputService` interface
- ✅ `saveStyleInput()` validates theme (not empty, <= MAX_THEME_LENGTH)
- ✅ `saveStyleInput()` validates tone (not empty, <= MAX_TONE_LENGTH)
- ✅ `saveStyleInput()` validates description (<= MAX_DESCRIPTION_LENGTH)
- ✅ `saveStyleInput()` validates concept (<= MAX_CONCEPT_LENGTH)
- ✅ `saveStyleInput()` validates characters (<= MAX_CHARACTERS_LENGTH)
- ✅ `saveStyleInput()` returns saved `StyleInput` with all fields
- ✅ `saveStyleInput()` returns errors with correct `StyleInputErrorCode` enum values
- ✅ `getStyleInput()` returns null when no input saved
- ✅ `getStyleInput()` returns saved input after `saveStyleInput()`
- ✅ `clearStyleInput()` removes saved input
- ✅ Return types match contract exactly

### 3. `/tests/contracts/PromptGeneration.test.ts`

**Contract**: `/contracts/PromptGeneration.ts`  
**Mock**: `/services/mock/PromptGenerationMock.ts`  
**Test Requirements**:

- ✅ Mock implements `IPromptGenerationService` interface
- ✅ `generatePrompts()` requires imageUrls array (1-5 images)
- ✅ `generatePrompts()` requires styleInput object
- ✅ `generatePrompts()` returns exactly 22 `CardPrompt` objects (Major Arcana)
- ✅ Each `CardPrompt` has: cardNumber (0-21), cardName, prompt, estimatedTokens
- ✅ `cardName` values match Major Arcana sequence (Fool, Magician, High Priestess, etc.)
- ✅ `prompt` is non-empty string
- ✅ `estimatedTokens` is positive number
- ✅ `generatePrompts()` returns errors with `PromptGenerationErrorCode` enum values
- ✅ Mock simulates AI vision analysis delay (100-300ms)
- ✅ Return type matches `ServiceResponse<CardPrompt[]>` exactly

### 4. `/tests/contracts/ImageGeneration.test.ts`

**Contract**: `/contracts/ImageGeneration.ts`  
**Mock**: `/services/mock/ImageGenerationMock.ts`  
**Test Requirements**:

- ✅ Mock implements `IImageGenerationService` interface
- ✅ `generateImage()` requires cardNumber (0-21)
- ✅ `generateImage()` requires prompt (non-empty string)
- ✅ `generateImage()` returns `GeneratedCard` with: cardNumber, cardName, imageUrl, prompt, generatedAt, dimensions
- ✅ `imageUrl` is valid URL format
- ✅ `dimensions` has width and height (both positive numbers)
- ✅ `generatedAt` is ISO 8601 timestamp
- ✅ `generateImage()` returns errors with `ImageGenerationErrorCode` enum values
- ✅ Mock simulates image generation delay (1-3 seconds)
- ✅ `generateBatch()` generates multiple cards (1-22)
- ✅ `generateBatch()` calls progress callback with 0-100 percentage
- ✅ `generateBatch()` returns array of `GeneratedCard` objects
- ✅ All return types match contract exactly

### 5. `/tests/contracts/DeckDisplay.test.ts`

**Contract**: `/contracts/DeckDisplay.ts`  
**Mock**: `/services/mock/DeckDisplayMock.ts`  
**Test Requirements**:

- ✅ Mock implements `IDeckDisplayService` interface
- ✅ `saveDeck()` requires cards array (1-22 cards)
- ✅ `saveDeck()` requires deckMetadata with name, createdAt, styleInput
- ✅ `saveDeck()` returns saved `DeckData` with id, cards, metadata
- ✅ `getDeck()` returns null when no deck saved
- ✅ `getDeck()` returns saved deck after `saveDeck()`
- ✅ `updateDeck()` modifies existing deck
- ✅ `updateDeck()` returns error if deck doesn't exist
- ✅ `deleteDeck()` removes deck
- ✅ `listDecks()` returns array of `DeckMetadata` objects
- ✅ All return types match contract exactly

### 6. `/tests/contracts/CostCalculation.test.ts`

**Contract**: `/contracts/CostCalculation.ts`  
**Mock**: `/services/mock/CostCalculationMock.ts`  
**Test Requirements**:

- ✅ Mock implements `ICostCalculationService` interface
- ✅ `calculatePromptCost()` returns cost for prompt generation (vision API)
- ✅ `calculatePromptCost()` includes: imageCount, estimatedTokens, costUSD, breakdown
- ✅ `breakdown` has per-item costs (imageAnalysis, tokenGeneration)
- ✅ `calculateImageCost()` returns cost for single image generation
- ✅ `calculateImageCost()` includes: estimatedTokens, costUSD, breakdown
- ✅ `calculateTotalDeckCost()` returns combined cost for full deck (22 cards)
- ✅ `calculateTotalDeckCost()` includes: promptGenerationCost, imageGenerationCost (22 images), totalCostUSD
- ✅ All costs are positive numbers with realistic values
- ✅ USD amounts have 2-4 decimal precision
- ✅ All return types match contract exactly

### 7. `/tests/contracts/Download.test.ts`

**Contract**: `/contracts/Download.ts`  
**Mock**: `/services/mock/DownloadMock.ts`  
**Test Requirements**:

- ✅ Mock implements `IDownloadService` interface
- ✅ `downloadDeck()` requires cards array (1-22 cards)
- ✅ `downloadDeck()` requires format ('zip' or 'individual')
- ✅ `downloadDeck()` returns `DownloadResult` with url, fileName, fileSize, format
- ✅ `url` is blob URL or download link format
- ✅ `fileName` has correct extension (.zip for 'zip' format)
- ✅ `fileSize` is positive number (bytes)
- ✅ `downloadDeck()` returns errors with `DownloadErrorCode` enum values
- ✅ `downloadImage()` downloads single card image
- ✅ `downloadImage()` returns `DownloadResult` for individual card
- ✅ Mock simulates file preparation delay (100-500ms)
- ✅ All return types match contract exactly

## Test Pattern Template

```typescript
/**
 * @fileoverview Contract tests for [Feature] seam
 * @purpose Validate [FeatureMock] matches [Feature] contract exactly
 * @testStrategy
 * 1. Interface compliance - Mock implements interface
 * 2. Input validation - Handles valid/invalid inputs correctly
 * 3. Return types - Matches contract types exactly
 * 4. Error handling - Returns correct error codes
 * 5. State management - CRUD operations work correctly
 */

import { describe, it, expect, beforeEach } from 'vitest'
import type { IFeatureService, FeatureRequest, FeatureResponse } from '$contracts/Feature'
import { FeatureErrorCode } from '$contracts/Feature'
import { featureService } from '$services/factory'

describe('[Feature] Contract Compliance', () => {
  let service: IFeatureService

  beforeEach(() => {
    service = featureService // Uses mock from factory
  })

  describe('Interface Implementation', () => {
    it('should implement IFeatureService interface', () => {
      expect(service).toBeDefined()
      expect(service.methodName).toBeDefined()
      expect(typeof service.methodName).toBe('function')
    })
  })

  describe('methodName()', () => {
    it('should return valid response for valid input', async () => {
      const request: FeatureRequest = {
        /* valid data */
      }
      const response = await service.methodName(request)

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      // Validate data shape matches contract
      if (response.data) {
        expect(response.data).toHaveProperty('requiredField')
        expect(typeof response.data.requiredField).toBe('string')
      }
    })

    it('should return error for invalid input', async () => {
      const request: FeatureRequest = {
        /* invalid data */
      }
      const response = await service.methodName(request)

      expect(response.success).toBe(false)
      expect(response.error).toBeDefined()
      if (response.error) {
        expect(response.error.code).toBe(FeatureErrorCode.INVALID_INPUT)
        expect(response.error.message).toBeTruthy()
      }
    })

    it('should validate constraints (e.g., array length, string length)', async () => {
      // Test min/max constraints
      const tooMany: FeatureRequest = { items: new Array(100) } // Over MAX
      const response = await service.methodName(tooMany)

      expect(response.success).toBe(false)
      expect(response.error?.code).toBe(FeatureErrorCode.TOO_MANY_ITEMS)
    })
  })

  // Add tests for each method in the interface
})
```

## Implementation Guidelines

### 1. Import Patterns

```typescript
// ✅ CORRECT: Import types with 'type', enums without
import type { IFeatureService, FeatureData } from '$contracts/Feature'
import { FeatureErrorCode } from '$contracts/Feature' // Enum - no 'type'

// ❌ WRONG: Importing enum with 'type'
import type { FeatureErrorCode } from '$contracts/Feature' // Error: cannot use as value
```

### 2. Service Factory Pattern

```typescript
// ✅ CORRECT: Get service from factory (uses mock by default)
import { featureService } from '$services/factory'

describe('Feature Tests', () => {
  let service: IFeatureService

  beforeEach(() => {
    service = featureService // Mock instance
  })
})
```

### 3. Test Organization

- One `describe` block per contract interface
- One `describe` block per interface method
- Multiple `it` blocks for: success case, error cases, edge cases, validation

### 4. Async Testing

```typescript
// All service methods are async
it('should handle async operation', async () => {
  const result = await service.doSomething()
  expect(result).toBeDefined()
})
```

### 5. Type Narrowing for ServiceResponse

```typescript
const response = await service.getData()

expect(response.success).toBe(true)
if (response.data) {
  // TypeScript now knows response.data is defined
  expect(response.data.field).toBe('value')
}

// For error cases
expect(response.success).toBe(false)
if (response.error) {
  expect(response.error.code).toBe(ErrorCode.INVALID)
}
```

## Success Criteria

✅ **All 7 test files created** in `/tests/contracts/`  
✅ **All tests pass**: `npm run test:contracts` exits with 0  
✅ **100% interface coverage**: Every method in each interface has tests  
✅ **Error path coverage**: All error codes tested  
✅ **Type safety**: No `as any` or unsafe type assertions  
✅ **Follows existing patterns**: Matches AI coordination test style  
✅ **Comprehensive validation**: Input validation, return types, state management all tested

## Commands to Run

```bash
# After writing tests, validate:
npm run test:contracts        # Must pass all tests
npm run check                 # Must have 0 TypeScript errors
git grep "as any" tests/      # Must return nothing

# Run specific test file during development:
npm test tests/contracts/ImageUpload.test.ts
npm test tests/contracts/StyleInput.test.ts
# etc.
```

## Reference Documentation

- **SDD Methodology**: `/seam-driven-development.md`
- **AI Agent Instructions**: `/AGENTS.md`
- **Contract Definitions**: `/contracts/[Feature].ts`
- **Mock Implementations**: `/services/mock/[Feature]Mock.ts`
- **Existing Tests**: `/tests/contracts/StateStore.test.ts` (best example)

## Notes

- **Mock services are already implemented** - you're validating they match contracts
- **USE_MOCKS=true by default** - factory returns mock services
- Tests prove "mock-first" development works - if tests pass, UI can be built with confidence
- These tests are **Phase 3 gate** - UI development blocked until all pass
- Follow TypeScript strict mode - no `any`, explicit types everywhere

## Questions/Clarifications

If anything is unclear:

1. Check existing AI coordination tests for patterns
2. Read the contract file to understand expected behavior
3. Run the mock in isolation to see what it returns
4. Reference `/AGENTS.md` Section: "Testing Patterns"

---

**Priority**: HIGH - Blocking UI development  
**Estimated Time**: 2-3 hours for all 7 test files  
**Dependencies**: None - all contracts and mocks exist  
**Deliverable**: 7 passing test files proving mocks match contracts exactly
