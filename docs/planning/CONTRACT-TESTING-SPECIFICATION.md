# TarotOutMyHeart Contract Testing Specification

## Overview

This document provides a detailed specification for writing 7 contract test suites for the TarotOutMyHeart tarot generation system. These tests will validate that mock service implementations exactly match their contract interfaces.

**Gold Standard**: The coordination server has 5 contract tests with 143 passing tests and 0 failures. This specification replicates that proven pattern.

---

## Part 1: Test Pattern Analysis - What Makes Coordination Tests Successful

### File Structure Pattern

```typescript
/**
 * [ContractName] Contract Tests
 *
 * Tests that [MockClass] satisfies the [ContractInterface] contract
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { MockService } from '../../services/mock/MockService'
import { ContractTypes, ErrorCodes, Enums } from '../../contracts'

describe('[ContractName] Contract', () => {
  let service: MockService

  beforeEach(() => {
    service = new MockService()
  })

  // Test organized in feature areas using nested describe blocks
})
```

### Key Success Factors

1. **Fresh Instance Per Test** - `beforeEach()` creates new service instance
2. **Organized by Feature** - Nested `describe()` blocks group related tests
3. **Comprehensive Coverage** - Every method, error code, and edge case tested
4. **Type Safety Validation** - Tests verify response types match contract
5. **State Management Testing** - Tests verify state changes between operations
6. **Realistic Mock Data** - Data matches real-world usage patterns

---

## Part 2: Universal Testing Patterns

### Pattern 1: Success Case Testing

```typescript
it('should [operation] and return expected data', async () => {
  const response = await service.methodName({
    requiredField: value,
    optionalField: value,
  })

  expect(response.success).toBe(true)
  expect(response.data?.propertyName).toBeDefined()
  expect(response.data?.propertyName).toBe(expectedValue)
})
```

### Pattern 2: Error Case Testing

```typescript
it('should fail with [ERROR_CODE] when [condition]', async () => {
  const response = await service.methodName({ invalidInput })

  expect(response.success).toBe(false)
  expect(response.error?.code).toBe('ERROR_CODE')
  expect(response.error?.message).toBeDefined()
  expect(response.error?.retryable).toBe(false)
})
```

### Pattern 3: State Transition Testing

```typescript
it('should transition from [state] to [state]', async () => {
  // Initial state
  const before = await service.getState()
  expect(before.data?.status).toBe('INITIAL')

  // Operation
  await service.updateState({ newValue })

  // Verify state changed
  const after = await service.getState()
  expect(after.data?.status).toBe('UPDATED')
})
```

### Pattern 4: Type Safety Testing

```typescript
it('should return properly typed response', async () => {
  const response = await service.getData()

  expect(response.success).toBe(true)
  expect(response.data?.id).toBeDefined()
  expect(typeof response.data?.id).toBe('string')
  expect(response.data?.timestamp).toBeInstanceOf(Date)
  expect(Array.isArray(response.data?.items)).toBe(true)
  expect(response.data?.items).toHaveLength(22)
})
```

### Pattern 5: Input Variation Testing

```typescript
it('should accept all valid input variations', async () => {
  // Test required only
  const res1 = await service.method({ required: 'value' })
  expect(res1.success).toBe(true)

  // Test with optional parameters
  const res2 = await service.method({
    required: 'value',
    optional: 'value',
  })
  expect(res2.success).toBe(true)
})
```

---

## Part 3: Individual Contract Test Specifications

---

## Seam #1: ImageUpload Contract Test

**File**: `/tests/contracts/ImageUpload.test.ts`

**Service Interface**: `IImageUploadService`

**Mock Implementation**: `ImageUploadMock` (from `/services/mock/ImageUpload.ts`)

### Contract Overview

```typescript
interface IImageUploadService {
  uploadImages(input: UploadImagesInput): Promise<ServiceResponse<UploadImagesOutput>>
  removeImage(input: RemoveImageInput): Promise<ServiceResponse<RemoveImageOutput>>
  validateImages(input: ValidateImagesInput): Promise<ServiceResponse<ValidateImagesOutput>>
  getUploadedImages(): Promise<ServiceResponse<GetUploadedImagesOutput>>
  clearAllImages(): Promise<ServiceResponse<void>>
}
```

### Test Organization & Required Test Cases

#### Test Suite 1: uploadImages() Method

**Success Cases**:

- Upload single valid JPEG image → returns UploadedImage with previewUrl
- Upload single valid PNG image → returns UploadedImage with previewUrl
- Upload 5 images (maximum) → all uploaded successfully
- Upload with mixed JPEG and PNG → all uploaded successfully
- Uploaded image has correct properties: id (UUID format), file (File object), previewUrl (URL string), fileName, fileSize, mimeType, uploadedAt (Date)

**Validation Error Cases**:

- Upload 0 files → error code: TOO_FEW_FILES
- Upload 6 files (exceeds max) → error code: TOO_MANY_FILES
- Upload invalid file type (GIF) → error code: INVALID_FILE_TYPE
- Upload file > 10MB → error code: FILE_TOO_LARGE
- Upload when already at 5 images → error code: MAX_UPLOADS_REACHED
- Duplicate file upload → error code: DUPLICATE_IMAGE
- Corrupted file → error code: FILE_CORRUPTED

**Response Structure Validation**:

- Response has: uploadedImages (array), failedImages (array), totalUploaded (number), totalFailed (number)
- uploadedImages[].id matches ImageId type (branded string with \_\_brand property)
- uploadedImages[].previewUrl is valid URL string
- uploadedImages[].uploadedAt is instance of Date
- failedImages has correct structure: code, message, fileName

**Edge Cases**:

- Upload files with special characters in filename → accepted
- Upload simultaneously → correct behavior
- Each uploaded image gets unique ID

#### Test Suite 2: removeImage() Method

**Success Cases**:

- Remove image that exists → returns RemoveImageOutput
- remainingImages array is updated (one fewer)
- previewUrlRevoked is true
- Can immediately re-upload to fill slot

**Error Cases**:

- Remove non-existent image ID → error code: IMAGE_NOT_FOUND
- Remove with invalid image ID → error code: IMAGE_NOT_FOUND

**Response Structure Validation**:

- Response has: removedImageId, remainingImages (array), previewUrlRevoked (boolean)
- remainingImages only contains images that weren't removed
- No orphaned references remain

#### Test Suite 3: validateImages() Method

**Success Cases**:

- Validate 1-5 valid images → canProceed: true
- Validate mix of valid and invalid images → returns both validImages and invalidImages
- validImages array structure: isValid (boolean), imageId (UUID), errors (empty array)
- invalidImages array structure: code, message, fileName

**Validation Cases**:

- Validate invalid file types → detected
- Validate oversized files → detected
- Validate too many files → detected
- canProceed is false only when ALL images invalid

**Response Structure**:

- Response has: validImages (array), invalidImages (array), canProceed (boolean)

#### Test Suite 4: getUploadedImages() Method

**Success Cases**:

- Get images when none uploaded → count: 0, canAddMore: true, remainingSlots: 5
- Get images when 3 uploaded → count: 3, canAddMore: true, remainingSlots: 2
- Get images when 5 uploaded → count: 5, canAddMore: false, remainingSlots: 0
- Returns all UploadedImage objects with full properties

**Response Structure**:

- Response has: images (array), count (number), canAddMore (boolean), remainingSlots (number)
- All images in array have complete UploadedImage properties

#### Test Suite 5: clearAllImages() Method

**Success Cases**:

- Clear when images exist → success: true
- After clear, getUploadedImages returns empty array
- All preview URLs revoked (internal cleanup)

**Edge Cases**:

- Clear when no images exist → still succeeds
- Can immediately upload after clear

#### Integration Test Suite

**Combined Workflows**:

- Upload 3 images → Remove 1 → getUploadedImages returns 2 remaining
- Upload → Validate → getUploadedImages → Remove all → getUploadedImages empty
- Upload to max (5) → Remove 1 → Upload 1 more → total still 5

### Error Code Coverage

All defined error codes must be tested at least once:

- INVALID_FILE_TYPE
- FILE_TOO_LARGE
- FILE_CORRUPTED
- TOO_MANY_FILES
- TOO_FEW_FILES
- MAX_UPLOADS_REACHED
- IMAGE_NOT_FOUND
- DUPLICATE_IMAGE
- UPLOAD_FAILED
- FILE_API_NOT_SUPPORTED
- URL_API_NOT_SUPPORTED

### Mock Data Examples

```typescript
// Valid test file
const validJpeg = new File([new ArrayBuffer(1000)], 'test.jpg', { type: 'image/jpeg' })

// Oversized file
const largePng = new File([new ArrayBuffer(11 * 1024 * 1024)], 'large.png', { type: 'image/png' })

// Invalid type
const gifFile = new File([new ArrayBuffer(1000)], 'test.gif', { type: 'image/gif' })
```

---

## Seam #2: StyleInput Contract Test

**File**: `/tests/contracts/StyleInput.test.ts`

**Service Interface**: `IStyleInputService`

**Mock Implementation**: `StyleInputMock` (from `/services/mock/StyleInput.ts`)

### Contract Overview

```typescript
interface IStyleInputService {
  validateStyleInputs(
    input: ValidateStyleInputsInput
  ): Promise<ServiceResponse<ValidateStyleInputsOutput>>
  saveStyleInputs(input: SaveStyleInputsInput): Promise<ServiceResponse<SaveStyleInputsOutput>>
  loadStyleInputs(input: LoadStyleInputsInput): Promise<ServiceResponse<LoadStyleInputsOutput>>
  getDefaults(): Promise<ServiceResponse<GetDefaultsOutput>>
  getPredefinedOptions(): Promise<ServiceResponse<GetPredefinedOptionsOutput>>
  clearDraft(): Promise<ServiceResponse<void>>
}
```

### Test Organization & Required Test Cases

#### Test Suite 1: validateStyleInputs() Method

**Field Validation - Theme**:

- Valid theme from predefined list → validation passes
- Valid custom theme (non-empty, ≤50 chars) → validation passes
- Missing theme → error: THEME_REQUIRED
- Empty string theme → error: THEME_REQUIRED
- Theme > 50 chars → error: THEME_TOO_LONG

**Field Validation - Tone**:

- Valid tone from predefined list → validation passes
- Valid custom tone (non-empty, ≤50 chars) → validation passes
- Missing tone → error: TONE_REQUIRED
- Empty tone → error: TONE_REQUIRED
- Tone > 50 chars → error: TONE_TOO_LONG

**Field Validation - Description**:

- Valid description (10-500 chars) → validation passes
- Description exactly 10 chars → passes
- Description exactly 500 chars → passes
- Missing description → error: DESCRIPTION_REQUIRED
- Description < 10 chars → error: DESCRIPTION_TOO_SHORT
- Description > 500 chars → error: DESCRIPTION_TOO_LONG
- Description with special characters → passes if valid length

**Optional Fields**:

- Concept ≤ 200 chars → passes (optional, no error if omitted)
- Concept > 200 chars → error: CONCEPT_TOO_LONG
- Characters ≤ 200 chars → passes (optional)
- Characters > 200 chars → error: CHARACTERS_TOO_LONG

**Partial Validation**:

- Can validate only theme field
- Can validate only description field
- Can validate complete form with all fields
- Validation response only includes errors for provided fields

**Response Structure**:

- Response has: validation (object), errors (array), warnings (array)
- validation.isValid (boolean), validation.canProceed (boolean)
- validation.fields: Record<keyof StyleInputs, FieldValidation>
- Each FieldValidation has: fieldName, isValid, errors[]

#### Test Suite 2: saveStyleInputs() Method

**Success Cases**:

- Save valid complete StyleInputs → success: true
- saveAsDraft: true → also saves to localStorage (can load later)
- saveAsDraft: false → does not save to localStorage
- Response has: saved (true), styleInputs (validated copy), savedAt (Date), savedToDraft (boolean)

**Validation Before Save**:

- Invalid inputs rejected before save → success: false
- Save fails validation → error returned

**Edge Cases**:

- Save with minimal required fields only
- Save with all optional fields populated
- Save after previous save overwrites old data

#### Test Suite 3: loadStyleInputs() Method

**Success Cases**:

- Load when draft exists → found: true, loadedFrom: 'draft'
- Load when draft doesn't exist → found: false, loadedFrom: 'default', returns default StyleInputs
- Draft must match previous save exactly

**Error Cases**:

- loadFromDraft: false and no draft → uses default inputs
- Corrupted draft data → falls back to default

**Response Structure**:

- Response has: found (boolean), styleInputs (StyleInputs or null), loadedFrom ('draft'|'default'|'none')

#### Test Suite 4: getDefaults() Method

**Success Cases**:

- Returns GetDefaultsOutput with defaults object
- defaults.theme = 'Art Nouveau' (tarot-appropriate)
- defaults.tone = 'Mystical' (tarot-appropriate)
- defaults.description = '' (user must provide)
- defaults.concept = '' (optional)
- defaults.characters = '' (optional)
- Defaults are always the same (consistent)

**Response Structure**:

- Response has: defaults (StyleInputsDefaults)

#### Test Suite 5: getPredefinedOptions() Method

**Success Cases**:

- Returns all predefined themes
- Returns all predefined tones
- Themes array includes: 'Art Nouveau', 'Cyberpunk', 'Gothic', 'Custom', etc.
- Tones array includes: 'Dark', 'Light', 'Mystical', 'Custom', etc.
- Both arrays are readonly (immutable)

**Response Structure**:

- Response has: themes (readonly string[]), tones (readonly string[])

#### Test Suite 6: clearDraft() Method

**Success Cases**:

- Clear when draft exists → success: true
- After clear, loadStyleInputs returns default values
- Can save new draft after clearing

**Edge Cases**:

- Clear when no draft exists → still succeeds

#### Integration Test Suite

**Combined Workflows**:

- Validate → Save → Load → verify matches
- Save with draft → Clear → Load gets defaults
- Validate partial → validate complete → save
- Get defaults → modify → validate → save

### Error Code Coverage

All defined error codes must be tested:

- THEME_REQUIRED, THEME_TOO_LONG, THEME_INVALID
- TONE_REQUIRED, TONE_TOO_LONG, TONE_INVALID
- DESCRIPTION_REQUIRED, DESCRIPTION_TOO_SHORT, DESCRIPTION_TOO_LONG, DESCRIPTION_INVALID
- CONCEPT_TOO_LONG
- CHARACTERS_TOO_LONG
- SAVE_FAILED
- LOAD_FAILED
- LOCALSTORAGE_NOT_SUPPORTED
- DRAFT_NOT_FOUND

### Mock Data Examples

```typescript
// Valid inputs
const validStyle: StyleInputs = {
  theme: 'Cyberpunk',
  tone: 'Dark',
  description: 'Neon-lit dystopian future with advanced technology and megacorporation control',
  concept: 'Technology vs humanity',
  characters: 'Augmented humans, AIs, corporate agents',
}

// Invalid: description too short
const invalidShort: ValidateStyleInputsInput = {
  theme: 'Gothic',
  tone: 'Dark',
  description: 'short', // Only 5 chars, needs 10+
}

// Invalid: description too long
const invalidLong: ValidateStyleInputsInput = {
  description: 'a'.repeat(501), // 501 chars, max 500
}
```

---

## Seam #3: PromptGeneration Contract Test

**File**: `/tests/contracts/PromptGeneration.test.ts`

**Service Interface**: `IPromptGenerationService`

**Mock Implementation**: `PromptGenerationMock` (from `/services/mock/PromptGeneration.ts`)

### Contract Overview

```typescript
interface IPromptGenerationService {
  generatePrompts(input: GeneratePromptsInput): Promise<ServiceResponse<GeneratePromptsOutput>>
  validatePrompts(input: ValidatePromptsInput): Promise<ServiceResponse<ValidatePromptsOutput>>
  regeneratePrompt(input: RegeneratePromptInput): Promise<ServiceResponse<RegeneratePromptOutput>>
  editPrompt(input: EditPromptInput): Promise<ServiceResponse<EditPromptOutput>>
  estimateCost(input: Omit<GeneratePromptsInput, 'onProgress'>): Promise<ServiceResponse<ApiUsage>>
}
```

### Test Organization & Required Test Cases

#### Test Suite 1: generatePrompts() Method

**Success Cases**:

- Generate with valid reference image URLs and style inputs → returns 22 prompts
- Each prompt is a CardPrompt with required properties: id, cardNumber, cardName, traditionalMeaning, generatedPrompt, confidence, generatedAt
- cardPrompts array has exactly 22 items
- Card numbers are 0-21 in order
- All cardNames are correct (The Fool, The Magician, etc.)
- All generatedPrompt strings are non-empty and reasonable length

**Input Validation**:

- Must provide at least 1 reference image URL → error: NO_REFERENCE_IMAGES if none
- Reference URLs must be valid URLs → error: INVALID_REFERENCE_URL if invalid
- StyleInputs must be valid → error: INVALID_STYLE_INPUTS if invalid
- Model parameter defaults to 'grok-vision-beta'
- Temperature defaults to 0.8 if not provided
- Accepts optional onProgress callback

**Response Structure**:

- Response has: cardPrompts (CardPrompt[]), usage (ApiUsage), requestId (string), generatedAt (Date), model (GrokModel)
- ApiUsage has: promptTokens (number), completionTokens (number), totalTokens (number), estimatedCost (number), model (string)
- Confidence is between 0 and 1

**Progress Callback** (if provided):

- Called multiple times during generation
- Provides: status (string), progress (0-100), currentStep ('uploading'|'analyzing'|'generating'|'validating'|'complete')
- Progress increases monotonically
- Final call has progress: 100, currentStep: 'complete'

**Error Cases**:

- No reference images → error: NO_REFERENCE_IMAGES
- Unreachable reference URL → error: IMAGE_URL_UNREACHABLE
- Invalid StyleInputs → error: INVALID_STYLE_INPUTS
- API key missing → error: API_KEY_MISSING
- API key invalid → error: API_KEY_INVALID
- API timeout → error: API_TIMEOUT (retryable: true)
- API rate limit → error: API_RATE_LIMIT (retryable: true)
- Incomplete response (< 22 prompts) → error: INCOMPLETE_RESPONSE
- Invalid response format → error: INVALID_RESPONSE_FORMAT
- Missing card numbers → error: MISSING_CARD_NUMBER
- Duplicate card numbers → error: DUPLICATE_CARD_NUMBER
- Prompt too short → error: PROMPT_TOO_SHORT
- Prompt too long → error: PROMPT_TOO_LONG

#### Test Suite 2: validatePrompts() Method

**Success Cases**:

- Validate 22 valid CardPrompt objects → isValid: true, errors: []
- Validate mixed valid/invalid → captures which ones failed

**Validation Rules**:

- Must have exactly 22 prompts → error: INCOMPLETE_RESPONSE if not
- Card numbers must be 0-21 with no gaps → error: MISSING_CARD_NUMBER if gap
- No duplicate card numbers → error: DUPLICATE_CARD_NUMBER if duplicate
- All prompts have required fields → error if missing
- Confidence between 0-1 → error if outside range
- Prompt length reasonable → error: PROMPT_TOO_SHORT or PROMPT_TOO_LONG

**Response Structure**:

- Response has: isValid (boolean), invalidPrompts (CardPrompt[]), errors (PromptValidationError[])
- Each error has: code, message, cardNumber (optional), promptId (optional)

#### Test Suite 3: regeneratePrompt() Method

**Success Cases**:

- Regenerate single card with feedback → returns new CardPrompt for that card
- New prompt different from previous (mock should vary)
- Card number preserved
- New timestamp

**Input Variations**:

- cardNumber (required): 0-21
- referenceImageUrls (required): non-empty array
- styleInputs (required): valid StyleInputs
- previousPrompt (optional): string
- feedback (optional): user feedback string

**Error Cases**:

- Invalid card number → error: INVALID_CARD_NUMBER (not 0-21)
- No reference images → error: NO_REFERENCE_IMAGES
- Invalid style inputs → error: INVALID_STYLE_INPUTS

**Response Structure**:

- Response has: cardPrompt (CardPrompt), usage (ApiUsage), requestId (string)

#### Test Suite 4: editPrompt() Method

**Success Cases**:

- Edit existing prompt with new text → returns updated CardPrompt
- edited field is true
- editedPrompt text matches input

**Validation**:

- promptId must exist → error if not
- editedPrompt length must be reasonable → error if too short/long
- Preserves card metadata (number, name, meaning)

**Response Structure**:

- Response has: cardPrompt (CardPrompt), edited (boolean)

#### Test Suite 5: estimateCost() Method

**Success Cases**:

- Estimate cost for generation → returns ApiUsage with estimatedCost
- Cost is positive number
- Can estimate without actually generating
- Estimate reasonable (should be < actual generation cost, or within margin)

**Input Parameters**:

- referenceImageUrls (required): 1-5 URLs
- styleInputs (required): valid inputs
- model (optional): defaults to grok-vision-beta
- temperature (optional): defaults to 0.8
- Note: onProgress is explicitly excluded from this input

**Response Structure**:

- Response has: promptTokens, completionTokens, totalTokens, estimatedCost, model

#### Integration Test Suite

**Combined Workflows**:

- Generate → Validate → all 22 valid
- Generate → Edit card 0 → Regenerate card 13 → still 22 valid
- EstimateCost → Generate → verify actual cost near estimate
- Generate with different style inputs → different prompts generated
- Generate with different reference images → different prompts generated

### Error Code Coverage

All error codes must be tested:

- API_KEY_MISSING, API_KEY_INVALID
- API_TIMEOUT, API_RATE_LIMIT, API_ERROR
- NO_REFERENCE_IMAGES, INVALID_REFERENCE_URL
- INVALID_STYLE_INPUTS, INVALID_MODEL
- INCOMPLETE_RESPONSE, INVALID_RESPONSE_FORMAT
- PROMPT_TOO_SHORT, PROMPT_TOO_LONG
- DUPLICATE_CARD_NUMBER, MISSING_CARD_NUMBER
- NETWORK_ERROR, IMAGE_URL_UNREACHABLE
- INSUFFICIENT_CREDITS, QUOTA_EXCEEDED

### Mock Data Examples

```typescript
const mockStyleInputs: StyleInputs = {
  theme: 'Cyberpunk',
  tone: 'Dark',
  description: 'Neon-lit dystopian future',
  concept: 'Technology control',
  characters: 'Augmented humans',
}

const mockImageUrls = ['https://example.com/image1.jpg', 'https://example.com/image2.png']

const mockCardPrompt: CardPrompt = {
  id: 'prompt-123' as PromptId,
  cardNumber: 0 as CardNumber,
  cardName: 'The Fool',
  traditionalMeaning: 'New beginnings, spontaneity, free spirit',
  generatedPrompt: 'A figure at the edge of a cliff, looking outward with confidence...',
  confidence: 0.92,
  generatedAt: new Date(),
}
```

---

## Seam #4: ImageGeneration Contract Test

**File**: `/tests/contracts/ImageGeneration.test.ts`

**Service Interface**: `IImageGenerationService`

**Mock Implementation**: `ImageGenerationMock` (from `/services/mock/ImageGeneration.ts`)

### Contract Overview

```typescript
interface IImageGenerationService {
  generateImages(input: GenerateImagesInput): Promise<ServiceResponse<GenerateImagesOutput>>
  regenerateImage(input: RegenerateImageInput): Promise<ServiceResponse<RegenerateImageOutput>>
  cancelGeneration(input: CancelGenerationInput): Promise<ServiceResponse<CancelGenerationOutput>>
  getGenerationStatus(
    input: GetGenerationStatusInput
  ): Promise<ServiceResponse<GetGenerationStatusOutput>>
  estimateCost(input: { imageCount: number }): Promise<ServiceResponse<EstimateImageCostOutput>>
}
```

### Test Organization & Required Test Cases

#### Test Suite 1: generateImages() Method

**Success Cases**:

- Generate images from 22 valid CardPrompts → returns GenerateImagesOutput
- generatedCards array has 22 items (one per card)
- Each GeneratedCard has: id, cardNumber, cardName, prompt, imageUrl or imageDataUrl, generationStatus, generatedAt, retryCount, optional error
- All cardNumbers are 0-21
- fullySuccessful is true when all 22 generated
- totalUsage has: totalImages, successfulImages, failedImages, estimatedCost, totalGenerationTime, usagePerCard[]

**Input Variations**:

- prompts (required): array of 22 CardPrompt objects
- model (optional): defaults to 'grok-2-image-alpha'
- saveToStorage (optional): defaults to false
- onProgress (optional): callback for progress updates
- allowPartialSuccess (optional): defaults to true (can succeed with some failures)

**Progress Callback**:

- Called during generation
- Provides: total (22), completed (0-22), failed (number), current (card number), percentComplete (0-100), estimatedTimeRemaining (seconds), status (string)
- Progress updates as cards complete

**Error Cases**:

- Invalid prompts (not CardPrompt type) → error: INVALID_PROMPTS
- Wrong prompt count (not 22) → error: WRONG_PROMPT_COUNT
- Prompt too long → error: PROMPT_TOO_LONG
- Invalid model → error: INVALID_MODEL
- API key missing → error: API_KEY_MISSING
- API timeout → error: API_TIMEOUT (retryable)
- API rate limit → error: API_RATE_LIMIT (retryable)
- Some images fail, allowPartialSuccess: true → partial success, error: PARTIAL_GENERATION_FAILURE
- All images fail → error: ALL_GENERATIONS_FAILED
- Storage unavailable → error: STORAGE_UNAVAILABLE
- Insufficient credits → error: INSUFFICIENT_CREDITS

**Response Structure**:

- GenerateImagesOutput has: generatedCards (GeneratedCard[]), totalUsage (TotalImageGenerationUsage), sessionId (string), startedAt (Date), completedAt (Date), fullySuccessful (boolean)
- GeneratedCard.generationStatus: 'queued'|'generating'|'completed'|'failed'|'retrying'
- GeneratedCard.imageUrl: URL string or undefined
- GeneratedCard.imageDataUrl: base64 data URL or undefined
- GeneratedCard.retryCount: number of retry attempts

#### Test Suite 2: regenerateImage() Method

**Success Cases**:

- Regenerate single failed image → returns new GeneratedCard
- New image has imageUrl or imageDataUrl
- generationStatus: 'completed'
- retryCount incremented

**Input Parameters**:

- cardNumber (required): 0-21
- prompt (required): CardPrompt text
- previousAttempts (optional): number of previous attempts

**Error Cases**:

- Invalid card number → error: INVALID_PROMPTS (card not in 0-21)
- Prompt too long → error: PROMPT_TOO_LONG
- Max retries exceeded → error returned (retryable: false)

**Response Structure**:

- Response has: generatedCard (GeneratedCard), usage (ImageGenerationUsage)

#### Test Suite 3: cancelGeneration() Method

**Success Cases**:

- Cancel ongoing generation → canceled: true
- completedBeforeCancel: number of cards generated before cancellation
- Returns sessionId

**Error Cases**:

- Cancel non-existent session → error: SESSION_NOT_FOUND
- Cancel already-completed session → error: SESSION_ALREADY_COMPLETE
- Cancel already-canceled session → error: SESSION_CANCELED

**Response Structure**:

- Response has: canceled (boolean), completedBeforeCancel (number), sessionId (string)

#### Test Suite 4: getGenerationStatus() Method

**Success Cases**:

- Get status of ongoing generation → returns progress
- Returns GetGenerationStatusOutput with:
  - sessionId
  - progress (ImageGenerationProgress): total, completed, failed, current, percentComplete, estimatedTimeRemaining, status
  - isComplete (boolean)
  - isCanceled (boolean)

**Progress Tracking**:

- Progress updates correctly as generation proceeds
- percentComplete: 0 initially, increases, reaches 100
- estimatedTimeRemaining decreases over time

**Error Cases**:

- Get status of non-existent session → error: SESSION_NOT_FOUND
- Get status after cancellation → isCanceled: true

#### Test Suite 5: estimateCost() Method

**Success Cases**:

- Estimate cost for 22 images → returns EstimateImageCostOutput
- totalImages: 22
- costPerImage: reasonable (e.g., $0.10)
- totalEstimatedCost: costPerImage \* totalImages
- estimatedTime: seconds (e.g., 60-120s for 22 images)

**Input Variations**:

- imageCount: number to estimate (typically 22)

**Error Cases**:

- Invalid image count (0, >100, negative) → error: INVALID_IMAGE_COUNT

**Response Structure**:

- Response has: totalImages, costPerImage, totalEstimatedCost, estimatedTime

#### Integration Test Suite

**Combined Workflows**:

- Generate all 22 → some fail → Regenerate failed ones → all complete
- EstimateCost → Generate → verify cost near estimate
- Generate → Cancel after 10 complete → verify 10 saved
- GetGenerationStatus during generation → verify progress increases
- Generate with saveToStorage: true → images have imageUrl
- Generate with saveToStorage: false → images have imageDataUrl

### Error Code Coverage

All error codes must be tested:

- API_KEY_MISSING, API_KEY_INVALID
- API_TIMEOUT, API_RATE_LIMIT, API_ERROR
- INVALID_PROMPTS, WRONG_PROMPT_COUNT
- PROMPT_TOO_LONG, INVALID_MODEL
- GENERATION_FAILED, INVALID_IMAGE_DATA
- IMAGE_UPLOAD_FAILED
- PARTIAL_GENERATION_FAILURE, ALL_GENERATIONS_FAILED
- SESSION_NOT_FOUND, SESSION_ALREADY_COMPLETE
- SESSION_CANCELED
- STORAGE_UNAVAILABLE, STORAGE_QUOTA_EXCEEDED
- NETWORK_ERROR
- INSUFFICIENT_CREDITS, QUOTA_EXCEEDED

### Mock Data Examples

```typescript
// Valid prompts array
const mockPrompts: CardPrompt[] = Array.from({ length: 22 }, (_, i) => ({
  id: `prompt-${i}` as PromptId,
  cardNumber: i as CardNumber,
  cardName: MAJOR_ARCANA_NAMES[i],
  traditionalMeaning: MAJOR_ARCANA_MEANINGS[i],
  generatedPrompt: `A tarot card image for ${MAJOR_ARCANA_NAMES[i]}...`,
  confidence: 0.85 + Math.random() * 0.15,
  generatedAt: new Date(),
}))

// Mock generated card
const mockGeneratedCard: GeneratedCard = {
  id: 'card-uuid' as GeneratedCardId,
  cardNumber: 0 as CardNumber,
  cardName: 'The Fool',
  prompt: 'A figure at the edge of a cliff...',
  imageUrl: 'https://blob.vercel-storage.com/...',
  generationStatus: 'completed',
  generatedAt: new Date(),
  retryCount: 0,
}
```

---

## Seam #5: DeckDisplay Contract Test

**File**: `/tests/contracts/DeckDisplay.test.ts`

**Service Interface**: `IDeckDisplayService`

**Mock Implementation**: `DeckDisplayMock` (from `/services/mock/DeckDisplay.ts`)

### Contract Overview

```typescript
interface IDeckDisplayService {
  initializeDisplay(
    input: InitializeDisplayInput
  ): Promise<ServiceResponse<InitializeDisplayOutput>>
  changeLayout(input: ChangeLayoutInput): Promise<ServiceResponse<ChangeLayoutOutput>>
  changeCardSize(input: ChangeCardSizeInput): Promise<ServiceResponse<ChangeCardSizeOutput>>
  sortCards(input: SortCardsInput): Promise<ServiceResponse<SortCardsOutput>>
  filterCards(input: FilterCardsInput): Promise<ServiceResponse<FilterCardsOutput>>
  selectCard(input: SelectCardInput): Promise<ServiceResponse<SelectCardOutput>>
  openLightbox(input: OpenLightboxInput): Promise<ServiceResponse<OpenLightboxOutput>>
  closeLightbox(): Promise<ServiceResponse<CloseLightboxOutput>>
  navigateLightbox(input: NavigateLightboxInput): Promise<ServiceResponse<NavigateLightboxOutput>>
}
```

### Test Organization & Required Test Cases

#### Test Suite 1: initializeDisplay() Method

**Success Cases**:

- Initialize with 22 GeneratedCard objects → returns InitializeDisplayOutput
- state has: layout ('grid'), cardSize ('medium'), sortBy ('number'), selectedCard (null), lightboxOpen (false), showMetadata (false)
- displayCards array has 22 items
- Each DisplayCard has: card (GeneratedCard), position (0-21), visible (true), loading (false), error (undefined)
- visibleCount: 22

**Input Variations**:

- generatedCards (required): array of GeneratedCard (must be 22)
- initialLayout (optional): defaults to 'grid'
- initialSize (optional): defaults to 'medium'
- autoOpenFirst (optional): defaults to false

**Error Cases**:

- No cards provided → error: NO_CARDS_PROVIDED
- Fewer than 22 cards → error: INCOMPLETE_CARDS (or still processes, depends on mock)
- Invalid initial layout → error: INVALID_LAYOUT
- Invalid initial size → error: INVALID_SIZE

**Response Structure**:

- Response has: state (DeckDisplayState), displayCards (DisplayCard[]), visibleCount (number)

#### Test Suite 2: changeLayout() Method

**Success Cases**:

- Change from 'grid' to 'list' → state.layout: 'list'
- Change from 'list' to 'carousel' → state.layout: 'carousel'
- Change from 'carousel' to 'grid' → state.layout: 'grid'
- displayCards remain same, only layout preference changes

**Supported Layouts**:

- 'grid', 'list', 'carousel' must be supported

**Error Cases**:

- Invalid layout string → error: INVALID_LAYOUT

**Response Structure**:

- Response has: state (DeckDisplayState), layout (DisplayLayout)

#### Test Suite 3: changeCardSize() Method

**Success Cases**:

- Change from 'medium' to 'small' → state.cardSize: 'small'
- Change to 'large' → state.cardSize: 'large'
- Change back to 'medium' → state.cardSize: 'medium'

**Supported Sizes**:

- 'small', 'medium', 'large' must be supported

**Error Cases**:

- Invalid size → error: INVALID_SIZE

**Response Structure**:

- Response has: state (DeckDisplayState), size (CardSize)

#### Test Suite 4: sortCards() Method

**Success Cases**:

- Sort by 'number' ascending → cards 0-21 in order
- Sort by 'name' ascending → cards alphabetically by name
- Sort by 'generated-date' ascending → oldest first
- Sort descending: set ascending: false

**Sorting Options**:

- 'number': card number 0-21
- 'name': alphabetical by card name
- 'generated-date': by generatedAt timestamp

**Default Behavior**:

- ascending defaults to true

**Response Structure**:

- Response has: state (DeckDisplayState), displayCards (DisplayCard[])
- displayCards in new sort order

#### Test Suite 5: filterCards() Method

**Success Cases**:

- Filter by card name (e.g., 'Fool') → finds "The Fool" card
- Filter by number (e.g., '0') → finds card 0
- Filter by prompt text (e.g., 'neon') → finds cards with that in prompt
- Case-insensitive filtering
- Empty filter → shows all 22 cards
- Non-matching filter → visibleCount: 0, displayCards filtered

**Filter Behavior**:

- Searches: card name, card number, generation prompt
- Marks matching cards: visible: true
- Marks non-matching: visible: false
- visibleCount reflects visible cards

**Error Cases**:

- Invalid filter (not string) → error or no filter applied

**Response Structure**:

- Response has: state (DeckDisplayState), displayCards (DisplayCard[]), visibleCount (number)

#### Test Suite 6: selectCard() Method

**Success Cases**:

- Select card 0 → state.selectedCard: 0
- Select card 13 → state.selectedCard: 13
- Select card 21 → state.selectedCard: 21
- Can select with openLightbox: false → selectedCard updated, lightbox not opened
- Can select with openLightbox: true → selectedCard updated AND lightbox opened

**Constraints**:

- Card number must be 0-21 → error: INVALID_CARD_NUMBER if outside range

**Response Structure**:

- Response has: state (DeckDisplayState), selectedCard (DisplayCard), lightboxState (optional LightboxState if opened)

#### Test Suite 7: openLightbox() Method

**Success Cases**:

- Open lightbox for card 0 → lightboxState.currentCard: 0, open: true
- Open with showPrompt: true → showPrompt: true in lightbox
- Open with showMetadata: true → showMetadata: true
- canNavigateLeft: false (card 0, can't go left)
- canNavigateRight: true (card 0, can go right to card 1)
- Open card 13 → canNavigateLeft: true, canNavigateRight: true
- Open card 21 → canNavigateLeft: true, canNavigateRight: false

**Error Cases**:

- Invalid card number → error: INVALID_CARD_NUMBER

**Response Structure**:

- Response has: state (DeckDisplayState with lightboxOpen: true), lightboxState (LightboxState), card (DisplayCard)
- LightboxState has: open, currentCard, showPrompt, showMetadata, canNavigateLeft, canNavigateRight

#### Test Suite 8: closeLightbox() Method

**Success Cases**:

- Close lightbox → state.lightboxOpen: false
- selectedCard still preserved
- Lightbox no longer visible

**Response Structure**:

- Response has: state (DeckDisplayState with lightboxOpen: false)

#### Test Suite 9: navigateLightbox() Method

**Success Cases**:

- Navigate 'next' from card 0 → card 1 displayed
- Navigate 'next' from card 20 → card 21 displayed
- Navigate 'next' from card 21 → error: CANNOT_NAVIGATE (can't go beyond 21)
- Navigate 'previous' from card 21 → card 20 displayed
- Navigate 'previous' from card 1 → card 0 displayed
- Navigate 'previous' from card 0 → error: CANNOT_NAVIGATE

**Error Cases**:

- Navigate when lightbox not open → error: LIGHTBOX_NOT_OPEN
- Invalid direction → error or ignored

**Response Structure**:

- Response has: lightboxState (LightboxState with updated currentCard), card (DisplayCard)

#### Integration Test Suite

**Combined Workflows**:

- Initialize → Change layout → Change size → Sort → all work correctly
- Initialize → Select card → Open lightbox → Navigate 5 times → Close lightbox
- Filter → Sort by name → Select from filtered list → Open lightbox
- Multiple layout/size/sort changes → verify no data loss

### Error Code Coverage

All error codes must be tested:

- NO_CARDS_PROVIDED
- INVALID_CARD_NUMBER
- INVALID_LAYOUT
- INVALID_SIZE
- INVALID_SORT_OPTION
- NO_DISPLAY_STATE
- LIGHTBOX_NOT_OPEN
- CANNOT_NAVIGATE
- CARD_IMAGE_FAILED
- RENDER_FAILED

### Mock Data Examples

```typescript
// 22 mock generated cards
const mockGeneratedCards: GeneratedCard[] = Array.from({ length: 22 }, (_, i) => ({
  id: `card-${i}` as GeneratedCardId,
  cardNumber: i as CardNumber,
  cardName: MAJOR_ARCANA_NAMES[i],
  prompt: `Prompt for ${MAJOR_ARCANA_NAMES[i]}...`,
  imageUrl: `https://example.com/card-${String(i).padStart(2, '0')}.png`,
  generationStatus: 'completed' as GenerationStatus,
  generatedAt: new Date(),
  retryCount: 0,
}))
```

---

## Seam #6: CostCalculation Contract Test

**File**: `/tests/contracts/CostCalculation.test.ts`

**Service Interface**: `ICostCalculationService`

**Mock Implementation**: `CostCalculationMock` (from `/services/mock/CostCalculation.ts`)

### Contract Overview

```typescript
interface ICostCalculationService {
  calculateTotalCost(
    input: CalculateTotalCostInput
  ): Promise<ServiceResponse<CalculateTotalCostOutput>>
  estimateCost(input: EstimateCostInput): Promise<ServiceResponse<EstimateCostOutput>>
  formatCost(input: FormatCostInput): Promise<ServiceResponse<FormatCostOutput>>
}
```

### Test Organization & Required Test Cases

#### Test Suite 1: calculateTotalCost() Method

**Success Cases**:

- Calculate cost from prompt and image usage → returns CalculateTotalCostOutput
- Response has: summary (CostSummary), exceeded (boolean), canProceed (boolean)
- CostSummary has: textCost, imageCost, visionCost, totalCost (number), warningLevel, formattedCost (string)

**Cost Breakdown - Text Generation**:

- textCost has: inputTokens, outputTokens, inputCost, outputCost, totalCost
- Calculation: inputCost = inputTokens _ 0.000002, outputCost = outputTokens _ 0.000010
- totalCost = inputCost + outputCost

**Cost Breakdown - Image Generation**:

- imageCost has: imagesGenerated (22), imagesFailed, imagesRetried, generationCost (per image), totalCost
- Calculation: totalCost = imagesGenerated \* generationCost

**Cost Breakdown - Vision API**:

- visionCost has: requestCount, requestCost, totalCost
- Calculation: totalCost = requestCount \* costPerRequest

**Warning Levels**:

- totalCost < $5.00 → warningLevel: 'none'
- totalCost $5.00-$9.99 → warningLevel: 'warning'
- totalCost $10.00-$19.99 → warningLevel: 'high'
- totalCost >= $20.00 → warningLevel: 'maximum'

**Thresholds**:

- exceeded: false if totalCost < $20.00
- exceeded: true if totalCost >= $20.00
- canProceed: true if totalCost < $20.00
- canProceed: false if totalCost >= $20.00

**Error Cases**:

- Invalid usage data → error: INVALID_USAGE_DATA
- Missing promptUsage → error: MISSING_PROMPT_USAGE
- Missing imageUsage → error: MISSING_IMAGE_USAGE
- Negative cost calculated → error: NEGATIVE_COST
- Cost overflow → error: COST_OVERFLOW
- Cost exceeds maximum → error: COST_EXCEEDS_MAXIMUM

**Response Structure**:

- Verified above in "CostSummary" definition

#### Test Suite 2: estimateCost() Method

**Success Cases**:

- Estimate cost for 22 images, 3 reference images → returns EstimateCostOutput
- Response has: estimate (CostEstimate), canAfford (boolean), warningMessage (optional)
- CostEstimate has: estimatedCost (number), breakdown (promptGeneration, imageGeneration), assumptions (string[])

**Estimation Logic**:

- imageCount (required): 22
- referenceImageCount (required): 1-5
- estimatedPromptLength (optional): token estimate
- Calculation: estimate includes prompt generation + image generation costs

**Cost Ranges** (realistic estimates):

- Prompt generation: 1 request with images, ~1000-5000 tokens output
- Image generation: 22 images \* $0.10/image = $2.20
- Total estimate: likely $0.50-$3.00

**Threshold Checks**:

- canAfford: true if estimate < $20.00
- canAfford: false if estimate >= $20.00
- warningMessage: set if high cost

**Input Variations**:

- imageCount (required): number
- referenceImageCount (required): 1-5
- estimatedPromptLength (optional): if not provided, estimate assumes default

**Error Cases**:

- Invalid image count (0, negative, > 100) → error: INVALID_IMAGE_COUNT
- Invalid reference count (0, > 5, negative) → error

**Response Structure**:

- estimate.assumptions: array of strings explaining estimate basis

#### Test Suite 3: formatCost() Method

**Success Cases**:

- Format $2.345 with format: 'summary' → "$2.35" (2 decimals)
- Format $2.345 with format: 'detailed' → "$2.35 (prompts: $0.xx, images: $x.xx, vision: $0.xx)"
- Format $2.345 with format: 'minimal' → "~$2.35"
- Format default (no format specified) → defaults to 'summary'

**Format Options**:

- 'detailed': full breakdown with component costs
- 'summary': just total cost
- 'minimal': approximate symbol + total

**Warning Message** (if includeWarning: true):

- No warning if totalCost < $5.00
- Warning if $5.00-$9.99: "Cost is above normal range"
- Warning if $10.00-$19.99: "High cost alert"
- Warning if >= $20.00: "Cost exceeds maximum"

**Response Structure**:

- Response has: formatted (string), warningLevel ('none'|'warning'|'high'|'maximum'), warningMessage (optional)

**Decimal Precision**:

- Always exactly 2 decimal places in formatted cost
- Rounding: standard (0.5 rounds up)

**Error Cases**:

- Invalid format string → error: or defaults to 'summary'
- Invalid cost (negative) → error or returns with warning

#### Integration Test Suite

**Combined Workflows**:

- EstimateCost → CalculateTotalCost → Verify estimate ±10% of actual
- CalculateTotalCost → FormatCost with 'detailed' → all components visible
- Multiple cost calculations → verify cumulative logic correct
- Threshold testing: cost exactly at $5.00, $10.00, $20.00 boundaries

### Error Code Coverage

All error codes must be tested:

- INVALID_USAGE_DATA
- MISSING_PROMPT_USAGE
- MISSING_IMAGE_USAGE
- INVALID_IMAGE_COUNT
- NEGATIVE_COST
- COST_OVERFLOW
- CALCULATION_FAILED
- COST_EXCEEDS_MAXIMUM
- INSUFFICIENT_BUDGET

### Helper Function Tests

Test the exported helper functions:

```typescript
describe('Helper Functions', () => {
  it('formatCurrency(2.345) returns "$2.35"', () => {
    expect(formatCurrency(2.345)).toBe('$2.35')
  })

  it('getWarningLevel($15.00) returns "high"', () => {
    expect(getWarningLevel(15.0)).toBe('high')
  })

  it('getWarningMessage("maximum", $25.00) returns appropriate message', () => {
    const msg = getWarningMessage('maximum', 25.0)
    expect(msg).toContain('exceeds maximum')
  })
})
```

### Mock Data Examples

```typescript
// Typical prompt generation usage
const mockPromptUsage: ApiUsage = {
  promptTokens: 5000,
  completionTokens: 15000,
  totalTokens: 20000,
  estimatedCost: 0.2,
  model: 'grok-vision-beta',
}

// Typical image generation usage (all 22 successful)
const mockImageUsage: TotalImageGenerationUsage = {
  totalImages: 22,
  successfulImages: 22,
  failedImages: 0,
  estimatedCost: 2.2,
  totalGenerationTime: 120000,
  usagePerCard: [],
}

// Combined total: ~$2.40
```

---

## Seam #7: Download Contract Test

**File**: `/tests/contracts/Download.test.ts`

**Service Interface**: `IDownloadService`

**Mock Implementation**: `DownloadMock` (from `/services/mock/Download.ts`)

### Contract Overview

```typescript
interface IDownloadService {
  downloadDeck(input: DownloadDeckInput): Promise<ServiceResponse<DownloadDeckOutput>>
  downloadCard(input: DownloadCardInput): Promise<ServiceResponse<DownloadCardOutput>>
  prepareDownload(input: PrepareDownloadInput): Promise<ServiceResponse<PrepareDownloadOutput>>
}
```

### Test Organization & Required Test Cases

#### Test Suite 1: downloadDeck() Method

**Success Cases**:

- Download 22 cards as ZIP → returns DownloadDeckOutput
- downloaded: true
- filename follows pattern: '[deckname]-[timestamp].zip'
- fileSize > 0 (reasonable size for 22 PNG images)
- cardCount: 22
- includedMetadata: true/false based on input

**Input Variations**:

- generatedCards (required): 22 GeneratedCard objects
- styleInputs (required): StyleInputs
- deckName (optional): defaults to 'tarot-deck'
- format (optional): defaults to 'zip'
  - 'zip': all cards in ZIP file
  - 'individual': generates each card separately (or returns error if not supported)
- includeMetadata (optional): defaults to true
  - true: ZIP includes metadata.json with deck info
  - false: ZIP has only card images
- onProgress (optional): callback for download progress

**Progress Callback**:

- Called during download preparation
- Provides: status (string), progress (0-100), currentStep ('preparing'|'fetching'|'packaging'|'downloading'|'complete')

**ZIP Structure** (when format: 'zip'):

```
deck-name-12345.zip
├── 00-the-fool.png
├── 01-the-magician.png
├── ...
├── 21-the-world.png
└── metadata.json (optional, if includeMetadata: true)
```

**Metadata JSON** (if included):

- generatedAt: ISO timestamp
- deckName: string
- styleInputs: StyleInputs object
- cardCount: 22
- version: app version string

**Filename Generation**:

- Card: `00-the-fool.png` (number padded to 2 digits, name lowercased with hyphens)
- Deck: `cyberpunk-tarot-1699382400000.zip` (name lowercased with hyphens, timestamp)

**Error Cases**:

- No cards provided → error: NO_CARDS_PROVIDED
- Fewer than 22 cards → error: INCOMPLETE_CARDS
- Cards missing images → error: MISSING_IMAGES
- Invalid format → error: INVALID_FORMAT
- Cannot fetch image URLs → error: FETCH_IMAGE_FAILED
- ZIP creation fails → error: ZIP_CREATION_FAILED
- Blob creation fails → error: BLOB_CREATION_FAILED
- Download blocked by browser → error: DOWNLOAD_BLOCKED
- Blob API not supported → error: BLOB_API_NOT_SUPPORTED
- JSZip not available → error: JSZIP_NOT_AVAILABLE
- Insufficient storage → error: INSUFFICIENT_STORAGE
- Download failed → error: DOWNLOAD_FAILED

**Response Structure**:

- Response has: downloaded (boolean), filename (string), fileSize (number), cardCount (number), includedMetadata (boolean)

#### Test Suite 2: downloadCard() Method

**Success Cases**:

- Download single card image → returns DownloadCardOutput
- downloaded: true
- filename: generated or custom
- fileSize > 0

**Input Variations**:

- card (required): single GeneratedCard
- filename (optional): custom filename
  - If provided: use as-is (or sanitize)
  - If not provided: generate using pattern '00-the-fool.png'

**Error Cases**:

- Card missing image → error: MISSING_IMAGES
- Cannot fetch image → error: FETCH_IMAGE_FAILED
- Blob creation fails → error: BLOB_CREATION_FAILED
- Download blocked → error: DOWNLOAD_BLOCKED
- Insufficient storage → error: INSUFFICIENT_STORAGE

**Response Structure**:

- Response has: downloaded (boolean), filename (string), fileSize (number)

#### Test Suite 3: prepareDownload() Method

**Success Cases**:

- Prepare download without triggering → returns PrepareDownloadOutput
- Response has: blob (Blob object), filename (string), fileSize (number), url (object URL string)
- URL can be used in <a href> or for custom handling
- blob.type: 'application/zip' for deck, 'image/png' for card

**Input Variations**:

- generatedCards (required): 22 cards
- styleInputs (required)
- deckName (optional)
- includeMetadata (optional): defaults to true

**Workflow**:

- Creates ZIP or blob
- Generates object URL (URL.createObjectURL)
- Returns blob + URL for custom download handling
- Note: Caller must clean up URL with URL.revokeObjectURL() when done

**Error Cases**:

- No cards provided → error: NO_CARDS_PROVIDED
- Incomplete cards → error: INCOMPLETE_CARDS
- Missing images → error: MISSING_IMAGES
- Blob API not supported → error: BLOB_API_NOT_SUPPORTED
- Fetch fails → error: FETCH_IMAGE_FAILED
- ZIP creation fails → error: ZIP_CREATION_FAILED

**Response Structure**:

- Response has: blob (Blob), filename (string), fileSize (number), url (string)

#### Integration Test Suite

**Combined Workflows**:

- PrepareDownload → check blob size → DownloadDeck (actual download)
- DownloadCard → verify filename follows pattern
- Download with includeMetadata: true → metadata.json in ZIP
- Download with includeMetadata: false → only PNG files in ZIP
- DownloadDeck with custom deckName → filename includes custom name

### Error Code Coverage

All error codes must be tested:

- NO_CARDS_PROVIDED
- INCOMPLETE_CARDS
- MISSING_IMAGES
- INVALID_FORMAT
- FETCH_IMAGE_FAILED
- ZIP_CREATION_FAILED
- BLOB_CREATION_FAILED
- DOWNLOAD_BLOCKED
- BLOB_API_NOT_SUPPORTED
- JSZIP_NOT_AVAILABLE
- INSUFFICIENT_STORAGE
- DOWNLOAD_FAILED

### Helper Function Tests

Test the exported helper functions:

```typescript
describe('Helper Functions', () => {
  it('generateCardFilename(0, "The Fool") returns "00-the-fool.png"', () => {
    expect(generateCardFilename(0, 'The Fool')).toBe('00-the-fool.png')
  })

  it('generateCardFilename(21, "The World") returns "21-the-world.png"', () => {
    expect(generateCardFilename(21, 'The World')).toBe('21-the-world.png')
  })

  it('generateDeckFilename("Cyberpunk Tarot") returns lowercase with timestamp', () => {
    const filename = generateDeckFilename('Cyberpunk Tarot')
    expect(filename).toMatch(/^cyberpunk-tarot-\d+\.zip$/)
  })
})
```

### Mock Data Examples

```typescript
// 22 mock cards with valid imageUrls
const mockCards: GeneratedCard[] = Array.from({ length: 22 }, (_, i) => ({
  id: `card-${i}` as GeneratedCardId,
  cardNumber: i as CardNumber,
  cardName: MAJOR_ARCANA_NAMES[i],
  prompt: `Prompt for card ${i}`,
  imageUrl: `https://blob.vercel-storage.com/card-${String(i).padStart(2, '0')}.png`,
  generationStatus: 'completed',
  generatedAt: new Date(),
  retryCount: 0,
}))

// Mock blob (simulating ZIP file)
const mockZipBlob = new Blob(
  [
    /* simulated ZIP content */
  ],
  { type: 'application/zip' }
)
```

---

## Part 4: Test File Template

Use this template for each contract test file:

```typescript
/**
 * [ContractName] Contract Tests
 *
 * Tests that [MockClassName] satisfies the [InterfaceeName] contract
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { [MockClass] } from '../../services/mock/[MockFile]'
import { [Imports from contracts] } from '../../contracts'

describe('[ContractName] Contract', () => {
  let service: [InterfaceType]

  beforeEach(() => {
    service = new [MockClass]()
  })

  describe('Method Name', () => {
    it('should [behavior] and [result]', async () => {
      // Arrange
      const input = { /* test input */ }

      // Act
      const response = await service.methodName(input)

      // Assert
      expect(response.success).toBe(true)
      expect(response.data?.property).toBe(expectedValue)
    })

    it('should fail with [ERROR_CODE] when [condition]', async () => {
      // Arrange
      const input = { /* invalid input */ }

      // Act
      const response = await service.methodName(input)

      // Assert
      expect(response.success).toBe(false)
      expect(response.error?.code).toBe('ERROR_CODE')
    })
  })
})
```

---

## Part 5: Success Criteria

A contract test suite is complete when:

1. ✅ **Every method tested**: All methods in the interface have at least 3 tests (success, error, edge case)
2. ✅ **Every error code tested**: All error codes in ErrorCode enum tested at least once
3. ✅ **Response structure validated**: All properties in response objects verified for type and value
4. ✅ **State changes verified**: Tests confirm state transitions before and after operations
5. ✅ **Async behavior correct**: Tests properly handle Promises and timing
6. ✅ **Type safety**: Tests verify response types match contract (Date instances, enums, branded types)
7. ✅ **Integration workflows**: Tests verify multiple methods work together correctly
8. ✅ **Edge cases covered**: Boundary values, empty arrays, null/undefined handling
9. ✅ **0 test failures**: All tests pass with 100% success rate
10. ✅ **No duplicate tests**: Each behavior tested once, minimal redundancy

---

## Part 6: Execution Plan

### Phase 1: Test File Creation (Parallel)

All 7 agents create test files simultaneously:

- Agent 1: ImageUpload.test.ts
- Agent 2: StyleInput.test.ts
- Agent 3: PromptGeneration.test.ts
- Agent 4: ImageGeneration.test.ts
- Agent 5: DeckDisplay.test.ts
- Agent 6: CostCalculation.test.ts
- Agent 7: Download.test.ts

### Phase 2: Validation (Sequential)

1. Run `npm run test:contracts` to verify all tests pass
2. Run `npm run check` to verify no TypeScript errors
3. Verify test coverage meets success criteria above
4. Count passing tests (target: 150+ passing tests across all 7 files)

### Phase 3: Integration (Sequential)

1. All tests pass
2. 0 errors, 0 failures
3. Update SEAMSLIST.md to mark seams as "Tested"
4. Commit with message: "Add comprehensive contract tests for 7 tarot seams"

---

## Additional Resources

### Files to Reference

- Golden Standard: `/tests/contracts/ClaudeCoordination.test.ts` (59 tests, structured pattern)
- Golden Standard: `/tests/contracts/StateStore.test.ts` (35 tests, comprehensive)
- Contract definitions: `/contracts/*.ts`
- Mock implementations: `/services/mock/*.ts` (once created)

### Patterns to Copy

- Use `beforeEach()` for fresh service instances
- Organize with nested `describe()` blocks by feature
- Test success paths before error paths
- Verify response types (Date, enums, arrays)
- Use realistic mock data matching contract types
- Include integration/workflow tests at end

---

**Document Version**: 1.0.0  
**Created**: 2025-11-14  
**Target Completion**: Phase 3 integration complete  
**Gold Standard**: 143 passing coordination tests, 0 failures → Replicate with 150+ tarot tests
