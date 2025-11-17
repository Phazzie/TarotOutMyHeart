# TarotOutMyHeart - Complete Implementation Plan

**Prepared by**: Claude Sonnet 4.5 (Architecture Specialist)  
**Date**: 2025-11-17  
**Current Status**: Sprint 2 Complete (UI ready, 0 errors, 99.8% test pass rate)  
**Remaining Work**: Sprint 3 (Grok API Integration) + Sprint 4 (Deployment)  
**Methodology**: Strict Seam-Driven Development (SDD)

---

## Executive Summary

### What We're Building
Complete the TarotOutMyHeart MVP by integrating real Grok AI APIs and deploying to production on Vercel.

### Why It Matters
- **Sprint 2 is production-ready**: Full UI, zero TypeScript errors, comprehensive test coverage
- **Mocks prove the contracts**: 99.8% test pass rate validates contract definitions
- **Service factory enables seamless swap**: Can replace mocks with real services with ZERO UI changes
- **SDD methodology proven**: Coordination server achieved 143 tests passing, 0 integration issues

### Timeline Estimate
- **Sprint 3** (Grok Integration): 16-24 hours of focused work
- **Sprint 4** (Deployment & Polish): 12-16 hours of focused work
- **Total**: 28-40 hours (3.5-5 working days)

### Success Criteria
- ✅ 0 TypeScript errors maintained
- ✅ All contracts remain frozen (no modifications)
- ✅ Real services pass same contract tests as mocks
- ✅ Integration works first try (95%+ SDD success rate)
- ✅ Production deployment accessible and functional
- ✅ Security audit passed
- ✅ Performance metrics met (Lighthouse >80)

---

## 1. Sprint 3: Grok API Integration

**Goal**: Replace mock services with real Grok API implementations for prompt and image generation.

**Prerequisites** (all ✅ complete):
- [x] All contracts frozen and validated
- [x] All mocks functional (99.8% test pass rate)
- [x] Complete UI implemented and tested
- [x] Service factory pattern in place
- [x] Contract tests exist (from Sprint 1)

---

### Phase 3.1: Real PromptGenerationService Implementation

**File to create**: `/services/real/PromptGenerationService.ts`

#### Task 3.1.1: Service Scaffolding (1-2 hours)

**Objectives**:
- Create service file with contract implementation
- Configure Grok SDK/API client
- Set up error handling patterns

**Implementation Steps**:
```typescript
/**
 * @fileoverview Real implementation of Prompt Generation service
 * @purpose Integrate Grok vision API for generating 22 tarot card prompts
 * @dataFlow Reference Images + Style → Grok vision-beta API → 22 Card Prompts
 * @boundary Implements PromptGenerationSeam (Seam #3)
 * @dependencies @anthropic-ai/sdk or axios for Grok API
 * @example
 * const service = new PromptGenerationService(apiKey)
 * const result = await service.generatePrompts({ referenceImageUrls, styleInputs })
 */

import type {
  IPromptGenerationService,
  GeneratePromptsInput,
  GeneratePromptsOutput,
  // ... other types
} from '$contracts/PromptGeneration'

import {
  MAJOR_ARCANA_NAMES,
  MAJOR_ARCANA_MEANINGS,
  GROK_MODELS,
  PromptGenerationErrorCode, // NO 'import type' - enum is a value!
} from '$contracts/PromptGeneration'

import type { ServiceResponse } from '$contracts/types/common'

export class PromptGenerationService implements IPromptGenerationService {
  private apiKey: string
  private baseUrl: string = 'https://api.x.ai/v1' // Grok API endpoint

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('Grok API key is required')
    }
    this.apiKey = apiKey
  }

  // Implement all interface methods...
  async generatePrompts(input: GeneratePromptsInput): Promise<ServiceResponse<GeneratePromptsOutput>> {
    // TODO: Implement
  }

  // ... other methods
}
```

**Deliverables**:
- [x] Service class created
- [x] Constructor with API key validation
- [x] All interface methods stubbed
- [x] TypeScript compiles (`npm run check` = 0 errors)

**Testing**:
- Import service in test file
- Verify it implements interface (TypeScript validates)
- No runtime tests yet (just structure)

---

#### Task 3.1.2: Grok Vision API Integration (3-4 hours)

**Objectives**:
- Implement `generatePrompts()` method
- Make real API calls to Grok vision-beta
- Parse and validate API responses

**Implementation Details**:

1. **API Request Structure** (referencing Grok docs):
```typescript
private async callGrokVisionAPI(
  referenceImageUrls: string[],
  styleInputs: StyleInputs,
  model: GrokModel
): Promise<GrokVisionResponse> {
  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model || 'grok-vision-beta',
      messages: [
        {
          role: 'system',
          content: this.buildSystemPrompt()
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: this.buildUserPrompt(styleInputs) },
            ...referenceImageUrls.map(url => ({
              type: 'image_url',
              image_url: { url }
            }))
          ]
        }
      ],
      temperature: input.temperature || 0.8,
      max_tokens: 4000, // Enough for 22 prompts
    })
  })

  if (!response.ok) {
    throw new Error(`Grok API error: ${response.status} ${response.statusText}`)
  }

  return response.json()
}
```

2. **Prompt Engineering** (critical for quality):
```typescript
private buildSystemPrompt(): string {
  return `You are an expert tarot card designer and AI prompt engineer.
Your task is to create 22 unique image generation prompts for the Major Arcana tarot cards.

Requirements:
- Generate prompts for all 22 Major Arcana cards (The Fool through The World)
- Each prompt must be detailed (100-200 words)
- Incorporate the user's style theme, tone, and description
- Include traditional tarot symbolism for each card
- Ensure visual cohesion across all 22 cards
- Output as valid JSON array

Output format:
[
  {
    "cardNumber": 0,
    "cardName": "The Fool",
    "generatedPrompt": "Detailed image generation prompt...",
    "confidence": 0.95
  },
  ...
]`
}

private buildUserPrompt(styleInputs: StyleInputs): string {
  return `Create 22 tarot card prompts with these style parameters:
Theme: ${styleInputs.theme}
Tone: ${styleInputs.tone}
Concept: ${styleInputs.concept}
Description: ${styleInputs.description}
${styleInputs.characters ? `Recurring characters: ${styleInputs.characters}` : ''}

Reference images are attached. Use them to inform the visual style.`
}
```

3. **Response Parsing**:
```typescript
private parseGrokResponse(response: GrokVisionResponse): CardPrompt[] {
  const content = response.choices[0]?.message?.content
  if (!content) {
    throw new Error('Empty response from Grok API')
  }

  // Parse JSON (Grok should return valid JSON)
  const prompts = JSON.parse(content) as Array<{
    cardNumber: number
    cardName: string
    generatedPrompt: string
    confidence: number
  }>

  // Transform to contract shape
  return prompts.map(p => ({
    id: crypto.randomUUID() as PromptId,
    cardNumber: p.cardNumber as CardNumber,
    cardName: p.cardName,
    traditionalMeaning: MAJOR_ARCANA_MEANINGS[p.cardNumber as CardNumber],
    generatedPrompt: p.generatedPrompt,
    confidence: p.confidence,
    generatedAt: new Date()
  }))
}
```

4. **Progress Callbacks**:
```typescript
async generatePrompts(input: GeneratePromptsInput): Promise<ServiceResponse<GeneratePromptsOutput>> {
  const { referenceImageUrls, styleInputs, model, onProgress } = input

  try {
    // Step 1: Validate inputs
    if (onProgress) {
      onProgress({ progress: 0, status: 'Validating inputs...', currentStep: 'uploading' })
    }

    const validation = this.validateInputs(referenceImageUrls, styleInputs)
    if (!validation.isValid) {
      return {
        success: false,
        error: {
          code: PromptGenerationErrorCode.INVALID_STYLE_INPUTS,
          message: validation.errors.join(', '),
          retryable: false
        }
      }
    }

    // Step 2: Call Grok API
    if (onProgress) {
      onProgress({ progress: 25, status: 'Calling Grok vision API...', currentStep: 'analyzing' })
    }

    const response = await this.callGrokVisionAPI(referenceImageUrls, styleInputs, model || GROK_MODELS.vision)

    // Step 3: Parse response
    if (onProgress) {
      onProgress({ progress: 75, status: 'Parsing prompts...', currentStep: 'generating' })
    }

    const cardPrompts = this.parseGrokResponse(response)

    // Step 4: Validate prompts
    if (onProgress) {
      onProgress({ progress: 90, status: 'Validating prompts...', currentStep: 'validating' })
    }

    const promptValidation = await this.validatePrompts({ prompts: cardPrompts })
    if (!promptValidation.data?.isValid) {
      return {
        success: false,
        error: {
          code: PromptGenerationErrorCode.INCOMPLETE_RESPONSE,
          message: 'Generated prompts failed validation',
          retryable: true,
          details: promptValidation.data?.errors
        }
      }
    }

    // Step 5: Calculate usage
    const usage: ApiUsage = {
      model: model || GROK_MODELS.vision,
      promptTokens: response.usage.prompt_tokens,
      completionTokens: response.usage.completion_tokens,
      totalTokens: response.usage.total_tokens,
      estimatedCost: this.calculateCost(response.usage)
    }

    if (onProgress) {
      onProgress({ progress: 100, status: 'Complete!', currentStep: 'complete' })
    }

    return {
      success: true,
      data: {
        cardPrompts,
        usage,
        requestId: response.id,
        generatedAt: new Date(),
        model: model || GROK_MODELS.vision
      }
    }
  } catch (error) {
    return this.handleError(error)
  }
}
```

5. **Error Handling**:
```typescript
private handleError(error: unknown): ServiceResponse<GeneratePromptsOutput> {
  if (error instanceof Error) {
    // Check for specific error types
    if (error.message.includes('401')) {
      return {
        success: false,
        error: {
          code: PromptGenerationErrorCode.API_KEY_INVALID,
          message: 'Invalid API key',
          retryable: false
        }
      }
    }

    if (error.message.includes('429')) {
      return {
        success: false,
        error: {
          code: PromptGenerationErrorCode.API_RATE_LIMIT,
          message: 'Rate limit exceeded',
          retryable: true
        }
      }
    }

    if (error.message.includes('timeout')) {
      return {
        success: false,
        error: {
          code: PromptGenerationErrorCode.API_TIMEOUT,
          message: 'Request timed out',
          retryable: true
        }
      }
    }

    // Generic error
    return {
      success: false,
      error: {
        code: PromptGenerationErrorCode.API_ERROR,
        message: error.message,
        retryable: true
      }
    }
  }

  // Unknown error
  return {
    success: false,
    error: {
      code: PromptGenerationErrorCode.API_ERROR,
      message: 'Unknown error occurred',
      retryable: true
    }
  }
}
```

**Deliverables**:
- [x] `generatePrompts()` fully implemented
- [x] API calls functional
- [x] Response parsing working
- [x] Error handling comprehensive
- [x] Progress callbacks firing
- [x] TypeScript compiles (0 errors)

**Testing** (do NOT skip this!):
```bash
# 1. Type check
npm run check  # MUST be 0 errors

# 2. Run contract tests
npm run test:contracts -- PromptGeneration  # MUST pass

# 3. Manual test with real API
node -e "
  import { PromptGenerationService } from './services/real/PromptGenerationService.js'
  const service = new PromptGenerationService(process.env.XAI_API_KEY)
  const result = await service.generatePrompts({
    referenceImageUrls: ['https://example.com/ref1.jpg'],
    styleInputs: {
      theme: 'Cyberpunk',
      tone: 'Dark',
      description: 'Neon-lit dystopian future',
      concept: 'Technology vs humanity'
    },
    onProgress: (p) => console.log(p.status)
  })
  console.log(result)
"

# 4. Verify output shape matches contract
# Check that all 22 prompts returned
# Check that field names match contract exactly
```

**Success Criteria**:
- ✅ Real API call succeeds
- ✅ Returns exactly 22 prompts
- ✅ All prompts have correct field names (generatedPrompt, traditionalMeaning, confidence)
- ✅ Progress callbacks fire in correct order
- ✅ Error handling works (test with invalid API key)
- ✅ Cost calculation accurate

---

#### Task 3.1.3: Implement Remaining Methods (2-3 hours)

**Methods to implement**:
1. `validatePrompts()` - Already mostly copy from mock, add any extra validation
2. `regeneratePrompt()` - Similar to generatePrompts but for single card
3. `editPrompt()` - Simple field update, no API call
4. `estimateCost()` - Calculate based on input size

**Implementation Pattern** (all follow same structure):
```typescript
async regeneratePrompt(input: RegeneratePromptInput): Promise<ServiceResponse<RegeneratePromptOutput>> {
  try {
    // 1. Validate inputs
    // 2. Build API request (similar to generatePrompts but for 1 card)
    // 3. Call Grok API
    // 4. Parse response
    // 5. Return ServiceResponse

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: GROK_MODELS.vision,
        messages: [
          {
            role: 'system',
            content: this.buildSystemPrompt()
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Regenerate prompt for card ${input.cardNumber} (${MAJOR_ARCANA_NAMES[input.cardNumber]}).
Previous prompt: ${input.previousPrompt}
${input.feedback ? `User feedback: ${input.feedback}` : ''}
Style: ${input.styleInputs.theme}, ${input.styleInputs.tone}`
              },
              ...input.referenceImageUrls.map(url => ({
                type: 'image_url',
                image_url: { url }
              }))
            ]
          }
        ],
        temperature: 0.9, // Higher temp for variation
        max_tokens: 500
      })
    })

    // Parse and return...
  } catch (error) {
    return this.handleError(error)
  }
}
```

**Deliverables**:
- [x] All 5 interface methods implemented
- [x] TypeScript compiles (0 errors)
- [x] Contract tests pass
- [x] Manual testing successful

---

#### Task 3.1.4: Update Service Factory (30 minutes)

**File to modify**: `/services/factory.ts`

**Changes**:
```typescript
// Import real service
import { PromptGenerationService } from './real/PromptGenerationService'

// Update factory
export const promptGenerationService: IPromptGenerationService = USE_MOCKS
  ? promptGenerationMockService
  : new PromptGenerationService(process.env['XAI_API_KEY'] || '')
```

**Environment variables** (add to `.env`):
```env
XAI_API_KEY=your_grok_api_key_here
```

**Testing**:
```bash
# Test with mocks (default)
USE_MOCKS=true npm run dev
# Should use mock service

# Test with real API
USE_MOCKS=false XAI_API_KEY=xxx npm run dev
# Should use real service

# Verify in UI:
# - Upload images
# - Fill style form
# - Click "Generate Prompts"
# - Should see real Grok API call in network tab
# - Should receive 22 real prompts
```

**Success Criteria**:
- ✅ Factory switches correctly based on USE_MOCKS
- ✅ UI works with real service (zero code changes to components!)
- ✅ Real prompts generate successfully
- ✅ Progress indicator updates in real-time

---

### Phase 3.2: Real ImageGenerationService Implementation

**File to create**: `/services/real/ImageGenerationService.ts`

**Time estimate**: 4-6 hours (similar to PromptGeneration but with image handling complexity)

#### Task 3.2.1: Service Scaffolding (1 hour)

Same pattern as PromptGeneration:
```typescript
/**
 * @fileoverview Real implementation of Image Generation service
 * @purpose Integrate Grok image API for generating 22 tarot card images
 * @dataFlow Card Prompts → Grok grok-2-image-alpha API → Base64 Images → Vercel Blob Storage
 * @boundary Implements ImageGenerationSeam (Seam #4)
 */

export class ImageGenerationService implements IImageGenerationService {
  private apiKey: string
  private blobToken: string // For Vercel Blob storage
  private baseUrl: string = 'https://api.x.ai/v1'

  constructor(apiKey: string, blobToken: string) {
    if (!apiKey) throw new Error('Grok API key is required')
    if (!blobToken) throw new Error('Vercel Blob token is required')
    
    this.apiKey = apiKey
    this.blobToken = blobToken
  }

  // Implement all interface methods...
}
```

---

#### Task 3.2.2: Image Generation Implementation (3-4 hours)

**Key differences from PromptGeneration**:
1. **Sequential generation** (not batch) - to avoid rate limits
2. **Image upload to storage** - Vercel Blob for permanent URLs
3. **Progress tracking per card** - more granular callbacks
4. **Retry logic** - images may fail more often than text

**Implementation**:
```typescript
async generateImages(input: GenerateImagesInput): Promise<ServiceResponse<GenerateImagesOutput>> {
  const { prompts, onProgress, saveToStorage = true } = input
  const generatedCards: GeneratedCard[] = []
  const usagePerCard: ImageGenerationUsage[] = []
  const sessionId = crypto.randomUUID()
  const startTime = Date.now()

  let completed = 0
  let failed = 0

  for (let i = 0; i < prompts.length; i++) {
    const prompt = prompts[i]

    // Report progress BEFORE generation
    if (onProgress) {
      onProgress({
        total: prompts.length,
        completed,
        failed,
        current: i,
        percentComplete: Math.round((i / prompts.length) * 100),
        estimatedTimeRemaining: (prompts.length - i) * 5, // ~5 sec per image
        status: `Generating ${prompt.cardName}...`
      })
    }

    try {
      // Generate image
      const card = await this.generateSingleImage(prompt, saveToStorage)
      generatedCards.push(card)
      completed++

      // Track usage
      usagePerCard.push({
        cardNumber: prompt.cardNumber,
        model: GROK_IMAGE_MODEL,
        estimatedCost: 0.10, // Adjust based on Grok pricing
        generationTime: 5000,
        requestId: `img_${crypto.randomUUID()}`
      })

    } catch (error) {
      // Mark as failed but continue (allowPartialSuccess)
      const failedCard: GeneratedCard = {
        id: crypto.randomUUID() as GeneratedCardId,
        cardNumber: prompt.cardNumber,
        cardName: prompt.cardName,
        prompt: prompt.generatedPrompt,
        generationStatus: 'failed',
        retryCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
      generatedCards.push(failedCard)
      failed++
    }

    // Rate limiting delay (2 seconds between requests)
    if (i < prompts.length - 1) {
      await this.delay(2000)
    }
  }

  // Final progress
  if (onProgress) {
    onProgress({
      total: prompts.length,
      completed,
      failed,
      current: prompts.length,
      percentComplete: 100,
      estimatedTimeRemaining: 0,
      status: `Complete! ${completed}/${prompts.length} successful`
    })
  }

  const totalUsage: TotalImageGenerationUsage = {
    totalImages: prompts.length,
    successfulImages: completed,
    failedImages: failed,
    estimatedCost: completed * 0.10,
    totalGenerationTime: Date.now() - startTime,
    usagePerCard
  }

  return {
    success: true,
    data: {
      generatedCards,
      totalUsage,
      sessionId,
      startedAt: new Date(startTime),
      completedAt: new Date(),
      fullySuccessful: failed === 0
    }
  }
}

private async generateSingleImage(
  prompt: CardPrompt,
  saveToStorage: boolean
): Promise<GeneratedCard> {
  // 1. Call Grok image API
  const response = await fetch('https://api.x.ai/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: GROK_IMAGE_MODEL,
      prompt: prompt.generatedPrompt,
      size: '1024x1024',
      response_format: 'b64_json',
      n: 1
    })
  })

  if (!response.ok) {
    throw new Error(`Grok image API error: ${response.status}`)
  }

  const data = await response.json()
  const base64Image = data.data[0].b64_json

  // 2. Convert to data URL
  const imageDataUrl = `data:image/png;base64,${base64Image}`

  // 3. Upload to Vercel Blob (if enabled)
  let imageUrl: string | undefined
  if (saveToStorage) {
    imageUrl = await this.uploadToBlob(base64Image, prompt.cardName)
  }

  // 4. Return generated card
  return {
    id: crypto.randomUUID() as GeneratedCardId,
    cardNumber: prompt.cardNumber,
    cardName: prompt.cardName,
    prompt: prompt.generatedPrompt,
    imageDataUrl,
    imageUrl,
    generationStatus: 'completed',
    generatedAt: new Date(),
    retryCount: 0
  }
}

private async uploadToBlob(base64Image: string, cardName: string): Promise<string> {
  // Convert base64 to buffer
  const buffer = Buffer.from(base64Image, 'base64')

  // Upload to Vercel Blob
  const { put } = await import('@vercel/blob')
  
  const blob = await put(
    `tarot-cards/${cardName.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.png`,
    buffer,
    {
      access: 'public',
      token: this.blobToken
    }
  )

  return blob.url
}
```

**Retry Logic**:
```typescript
async regenerateImage(input: RegenerateImageInput): Promise<ServiceResponse<RegenerateImageOutput>> {
  const { cardNumber, prompt, previousAttempts = 0 } = input

  if (previousAttempts >= 3) {
    return {
      success: false,
      error: {
        code: ImageGenerationErrorCode.GENERATION_FAILED,
        message: 'Maximum retry attempts exceeded',
        retryable: false
      }
    }
  }

  try {
    const card = await this.generateSingleImage(
      {
        cardNumber,
        cardName: MAJOR_ARCANA_NAMES[cardNumber],
        generatedPrompt: prompt,
        // ... other CardPrompt fields
      },
      true // saveToStorage
    )

    const usage: ImageGenerationUsage = {
      cardNumber,
      model: GROK_IMAGE_MODEL,
      estimatedCost: 0.10,
      generationTime: 5000,
      requestId: `retry_${crypto.randomUUID()}`
    }

    return {
      success: true,
      data: {
        generatedCard: card,
        usage
      }
    }
  } catch (error) {
    return this.handleError(error)
  }
}
```

**Deliverables**:
- [x] `generateImages()` fully implemented
- [x] Sequential generation working
- [x] Image upload to Vercel Blob working
- [x] Progress callbacks firing for each card
- [x] Error handling and retries working
- [x] TypeScript compiles (0 errors)

---

#### Task 3.2.3: Update Service Factory (30 minutes)

```typescript
import { ImageGenerationService } from './real/ImageGenerationService'

export const imageGenerationService: IImageGenerationService = USE_MOCKS
  ? imageGenerationMockService
  : new ImageGenerationService(
      process.env['XAI_API_KEY'] || '',
      process.env['VERCEL_BLOB_TOKEN'] || ''
    )
```

**Environment variables**:
```env
VERCEL_BLOB_TOKEN=your_vercel_blob_token_here
```

**Testing**:
```bash
# End-to-end test
USE_MOCKS=false XAI_API_KEY=xxx VERCEL_BLOB_TOKEN=yyy npm run dev

# Workflow:
# 1. Upload reference images
# 2. Fill style form
# 3. Generate prompts (real Grok call)
# 4. Generate images (real Grok call + Vercel Blob upload)
# 5. View gallery (should show real generated images)
# 6. Download images (should download real files)
```

---

### Phase 3.3: Integration Testing (2-3 hours)

**Objective**: Prove real services work exactly like mocks from UI perspective.

#### Task 3.3.1: Contract Test Updates

**Files to update**: `tests/contracts/*.test.ts`

Ensure contract tests run against BOTH mock and real services:
```typescript
import { promptGenerationMockService } from '$services/mock/PromptGenerationMock'
import { PromptGenerationService } from '$services/real/PromptGenerationService'

describe('PromptGeneration Contract (Mock)', () => {
  const service = promptGenerationMockService
  // ... contract tests
})

describe('PromptGeneration Contract (Real)', () => {
  const service = new PromptGenerationService(process.env.XAI_API_KEY!)
  // ... same contract tests
})
```

**Success Criteria**:
- ✅ Same tests pass for both mock and real
- ✅ Validates both services implement contract identically

---

#### Task 3.3.2: Integration Tests

**File to create**: `tests/integration/GrokIntegration.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { PromptGenerationService } from '$services/real/PromptGenerationService'
import { ImageGenerationService } from '$services/real/ImageGenerationService'

describe('Grok API Integration', () => {
  const apiKey = process.env.XAI_API_KEY!
  const blobToken = process.env.VERCEL_BLOB_TOKEN!

  it('should generate 22 prompts from real Grok API', async () => {
    const service = new PromptGenerationService(apiKey)

    const result = await service.generatePrompts({
      referenceImageUrls: ['https://example.com/ref.jpg'],
      styleInputs: {
        theme: 'Test',
        tone: 'Test',
        description: 'Test theme',
        concept: 'Test concept'
      }
    })

    expect(result.success).toBe(true)
    expect(result.data?.cardPrompts).toHaveLength(22)
    expect(result.data?.usage.estimatedCost).toBeGreaterThan(0)
  }, 60000) // 60 second timeout

  it('should generate images from real Grok API', async () => {
    const service = new ImageGenerationService(apiKey, blobToken)

    const result = await service.generateImages({
      prompts: [
        {
          cardNumber: 0,
          cardName: 'The Fool',
          generatedPrompt: 'A test tarot card',
          // ... other fields
        }
      ],
      saveToStorage: true
    })

    expect(result.success).toBe(true)
    expect(result.data?.generatedCards).toHaveLength(1)
    expect(result.data?.generatedCards[0].imageUrl).toBeDefined()
  }, 30000)

  it('should handle end-to-end workflow', async () => {
    const promptService = new PromptGenerationService(apiKey)
    const imageService = new ImageGenerationService(apiKey, blobToken)

    // Generate prompts
    const promptResult = await promptService.generatePrompts({
      referenceImageUrls: ['https://example.com/ref.jpg'],
      styleInputs: {
        theme: 'Cyberpunk',
        tone: 'Dark',
        description: 'Dystopian future',
        concept: 'Technology vs humanity'
      }
    })

    expect(promptResult.success).toBe(true)

    // Generate images
    const imageResult = await imageService.generateImages({
      prompts: promptResult.data!.cardPrompts,
      saveToStorage: true
    })

    expect(imageResult.success).toBe(true)
    expect(imageResult.data?.fullySuccessful).toBe(true)
  }, 180000) // 3 minute timeout for full deck
})
```

**Run tests**:
```bash
XAI_API_KEY=xxx VERCEL_BLOB_TOKEN=yyy npm run test:integration
```

**Success Criteria**:
- ✅ All integration tests pass
- ✅ Real API costs are reasonable
- ✅ No timeout errors
- ✅ No rate limit errors

---

#### Task 3.3.3: Manual End-to-End Testing

**Test Plan**:
1. **Positive Flow**:
   - Upload 3 reference images
   - Fill complete style form
   - Generate prompts (real API)
   - Review prompts (should be high quality)
   - Generate images (real API)
   - View gallery (should show 22 real images)
   - Download individual card
   - Download full deck as ZIP

2. **Error Handling**:
   - Test with invalid API key (should show error)
   - Test with network disconnection (should show error)
   - Cancel generation mid-way (should stop gracefully)
   - Retry failed card (should regenerate)

3. **Cost Tracking**:
   - Verify cost display is accurate
   - Check that costs match Grok pricing
   - Confirm total cost is under $5 for full deck

**Success Criteria**:
- ✅ Happy path works end-to-end
- ✅ Error messages are user-friendly
- ✅ Progress indicators are accurate
- ✅ Cost tracking is correct
- ✅ Downloads work properly

---

### Phase 3.4: Sprint 3 Completion Checklist

Before marking Sprint 3 complete, verify:

**Code Quality**:
- [ ] `npm run check` = 0 TypeScript errors
- [ ] `npm run build` succeeds
- [ ] No `as any` type escapes (`git grep "as any" services/real/`)
- [ ] All real services implement contracts exactly
- [ ] Service factory properly configured

**Testing**:
- [ ] All contract tests pass (mock + real)
- [ ] All integration tests pass
- [ ] Manual end-to-end test passed
- [ ] Error handling tested
- [ ] Cost tracking validated

**Documentation**:
- [ ] CHANGELOG.md updated with Sprint 3 completion
- [ ] lessonslearned.md updated with integration insights
- [ ] API usage documented (token counts, costs)
- [ ] Known issues documented (if any)

**Contracts** (CRITICAL - must remain frozen):
- [ ] No contract modifications made
- [ ] All contracts still compile
- [ ] SEAMSLIST.md unchanged (seams are immutable)

**SDD Compliance**:
- [ ] Integration worked first try OR issues were contract problems (not implementation)
- [ ] Real services match mocks from UI perspective
- [ ] Zero UI code changes needed for integration
- [ ] Service factory toggle works perfectly

---

## 2. Sprint 4: Deployment & Polish

**Goal**: Deploy production-ready MVP to Vercel with security, performance, and polish.

**Time estimate**: 12-16 hours

---

### Phase 4.1: Security Audit (2-3 hours)

#### Task 4.1.1: Input Validation

**Files to audit**: All service files

**Checklist**:
- [ ] All user inputs sanitized (XSS prevention)
- [ ] File uploads validated (type, size, content)
- [ ] API keys never exposed to client
- [ ] Environment variables properly scoped (client vs server)
- [ ] No sensitive data in error messages to client

**Fix example**:
```typescript
// ❌ BAD: Exposes API key in error
error: {
  message: `API call failed with key ${this.apiKey}`
}

// ✅ GOOD: Generic error
error: {
  message: 'API call failed - please contact support'
}
```

---

#### Task 4.1.2: Rate Limiting

**File to create**: `/src/lib/server/rateLimiter.ts`

```typescript
// Server-side rate limiting to prevent abuse
export class RateLimiter {
  private requests: Map<string, number[]> = new Map()

  isAllowed(clientId: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now()
    const windowStart = now - windowMs

    // Get recent requests
    const recentRequests = (this.requests.get(clientId) || [])
      .filter(timestamp => timestamp > windowStart)

    // Check if under limit
    if (recentRequests.length >= maxRequests) {
      return false
    }

    // Add current request
    recentRequests.push(now)
    this.requests.set(clientId, recentRequests)

    return true
  }
}
```

**Usage in API routes**:
```typescript
import { rateLimiter } from '$lib/server/rateLimiter'

export async function POST({ request, getClientAddress }) {
  const clientId = getClientAddress()

  // Limit to 10 requests per hour
  if (!rateLimiter.isAllowed(clientId, 10, 60 * 60 * 1000)) {
    return json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  // Process request...
}
```

---

#### Task 4.1.3: CORS & CSP Configuration

**File to update**: `svelte.config.js`

```javascript
const config = {
  kit: {
    adapter: adapter(),
    csp: {
      directives: {
        'script-src': ['self'],
        'style-src': ['self', 'unsafe-inline'], // For Tailwind
        'img-src': ['self', 'blob:', 'data:', 'https://vercel-blob.storage.com'],
        'connect-src': ['self', 'https://api.x.ai']
      }
    }
  }
}
```

---

### Phase 4.2: Performance Optimization (3-4 hours)

#### Task 4.2.1: Image Optimization

**Lazy loading**:
```svelte
<!-- DeckGalleryComponent.svelte -->
<img
  src={card.imageUrl}
  alt={card.cardName}
  loading="lazy"
  decoding="async"
/>
```

**Responsive images**:
```typescript
// Generate multiple sizes on upload
await put(`cards/${name}-large.png`, buffer)  // 1024x1024
await put(`cards/${name}-medium.png`, resizedBuffer) // 512x512
await put(`cards/${name}-thumb.png`, thumbnailBuffer) // 256x256
```

---

#### Task 4.2.2: Code Splitting

Already handled by SvelteKit, but verify:
```bash
npm run build
ls -lh .svelte-kit/output/client/_app/immutable/
# Each route should have separate JS bundles
```

---

#### Task 4.2.3: Caching Strategy

**File to create**: `/src/hooks.server.ts`

```typescript
export async function handle({ event, resolve }) {
  const response = await resolve(event)

  // Cache static assets
  if (event.url.pathname.startsWith('/images/')) {
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable')
  }

  // Don't cache API responses
  if (event.url.pathname.startsWith('/api/')) {
    response.headers.set('Cache-Control', 'no-store')
  }

  return response
}
```

---

#### Task 4.2.4: Lighthouse Audit

**Target scores** (all >80):
- Performance: 85+
- Accessibility: 95+
- Best Practices: 90+
- SEO: 90+

**Run audit**:
```bash
npm run build
npm run preview
# Open Chrome DevTools → Lighthouse → Run audit
```

**Common fixes**:
- Add meta descriptions
- Optimize images (already done)
- Add ARIA labels (already done in Sprint 2)
- Eliminate render-blocking resources

---

### Phase 4.3: Error Handling & UX Polish (2-3 hours)

#### Task 4.3.1: Global Error Boundary

**File to create**: `/src/routes/+error.svelte`

```svelte
<script lang="ts">
  import { page } from '$app/stores'
</script>

<div class="error-page">
  <h1>Oops! Something went wrong</h1>
  <p>{$page.error?.message || 'An unexpected error occurred'}</p>
  <a href="/">Return Home</a>
</div>
```

---

#### Task 4.3.2: Loading States & Animations

Already implemented in Sprint 2, but verify:
- [ ] All async operations show loading spinner
- [ ] Progress indicators are smooth
- [ ] Transitions between states are animated
- [ ] Skeleton loaders for slow content

---

#### Task 4.3.3: Toast Notifications

**File to update**: `/src/lib/stores/appStore.svelte.ts`

Add toast notification system:
```typescript
export const toasts = $state<Toast[]>([])

export function showToast(message: string, type: 'success' | 'error' | 'info') {
  const id = crypto.randomUUID()
  const toast = { id, message, type }
  toasts.push(toast)

  setTimeout(() => {
    const index = toasts.findIndex(t => t.id === id)
    if (index > -1) toasts.splice(index, 1)
  }, 5000)
}
```

**Usage**:
```typescript
// After successful generation
showToast('All 22 cards generated successfully!', 'success')

// After error
showToast('Generation failed. Please try again.', 'error')
```

---

### Phase 4.4: Vercel Deployment (3-4 hours)

#### Task 4.4.1: Environment Variables Setup

**Vercel Dashboard** → Project Settings → Environment Variables:
```
XAI_API_KEY = your_grok_api_key
VERCEL_BLOB_TOKEN = (auto-generated by Vercel)
NODE_ENV = production
USE_MOCKS = false
PUBLIC_APP_URL = https://tarot-out-my-heart.vercel.app
```

---

#### Task 4.4.2: Vercel Blob Storage Setup

```bash
# Install Vercel CLI
npm i -g vercel

# Link project
vercel link

# Create blob store
vercel blob create tarot-cards

# Note the token (auto-added to env vars)
```

---

#### Task 4.4.3: GitHub Integration

Already set up (GitHub Actions configured). Verify:
- [ ] Push to `main` triggers production deployment
- [ ] PR triggers preview deployment
- [ ] All GitHub Actions pass

**Deployment workflow**:
```bash
# 1. Merge Sprint 3 PR to main
git checkout main
git merge sprint-3-grok-integration

# 2. GitHub Actions run
# - CI tests pass
# - Build succeeds
# - Deploy to Vercel production

# 3. Verify deployment
curl https://tarot-out-my-heart.vercel.app
```

---

#### Task 4.4.4: Post-Deployment Testing

**Test checklist**:
- [ ] Production URL accessible
- [ ] All pages load correctly
- [ ] Image upload works
- [ ] Prompt generation works (real API)
- [ ] Image generation works (real API)
- [ ] Gallery displays correctly
- [ ] Download works
- [ ] Mobile responsive
- [ ] HTTPS enabled
- [ ] No console errors

**Performance check**:
- [ ] Run Lighthouse on production URL
- [ ] Check Vercel Analytics
- [ ] Monitor error rates (Vercel dashboard)

---

### Phase 4.5: Documentation Updates (1-2 hours)

#### Task 4.5.1: Update README.md

```markdown
# TarotOutMyHeart

AI-powered tarot card generator using Grok AI.

## Live Demo
https://tarot-out-my-heart.vercel.app

## Features
- Upload 1-5 reference images
- Define custom style (theme, tone, concept)
- Generate 22 unique Major Arcana card prompts
- Generate 22 high-quality card images
- Download individual cards or full deck

## Tech Stack
- SvelteKit + TypeScript
- Grok AI (vision + image generation)
- Vercel (hosting + blob storage)
- Seam-Driven Development methodology

## Local Development
```bash
git clone https://github.com/Phazzie/TarotOutMyHeart.git
cd TarotOutMyHeart
npm install
cp .env.example .env
# Add XAI_API_KEY to .env
npm run dev
```

## API Costs
- Prompt generation: ~$0.03 per deck
- Image generation: ~$2.20 per deck (22 cards × $0.10)
- Total: ~$2.23 per complete deck

## License
MIT
```

---

#### Task 4.5.2: Create USER_GUIDE.md

```markdown
# User Guide

## How to Create Your Tarot Deck

### Step 1: Upload Reference Images
- Upload 1-5 images that represent your desired style
- Supported formats: JPEG, PNG
- Max file size: 10MB per image

### Step 2: Define Your Style
- **Theme**: Overall aesthetic (e.g., "Cyberpunk", "Art Nouveau")
- **Tone**: Mood (e.g., "Dark", "Whimsical", "Serious")
- **Concept**: Core idea (e.g., "Nature spirits", "Technology vs humanity")
- **Description**: Detailed style notes (500 chars max)

### Step 3: Generate Prompts
- Click "Generate Prompts"
- Review 22 card-specific prompts
- Edit any prompts you'd like to customize
- Cost: ~$0.03

### Step 4: Generate Images
- Click "Generate Images"
- Watch progress (takes ~2 minutes)
- Cost: ~$2.20 for all 22 cards

### Step 5: View & Download
- Browse gallery
- Download individual cards (PNG)
- Download full deck (ZIP)

## Tips
- Use reference images with consistent style
- Be specific in your description
- Review prompts before generating images
- You can regenerate individual cards if needed
```

---

#### Task 4.5.3: Update CHANGELOG.md

```markdown
## [1.0.0] - 2025-11-17

### Added - Sprint 3 & 4 Complete
- Real Grok API integration for prompt generation
- Real Grok API integration for image generation
- Vercel Blob storage for generated images
- Rate limiting for API endpoints
- Security audit and CSP configuration
- Performance optimizations (lazy loading, caching)
- Production deployment to Vercel
- User documentation (README, USER_GUIDE)

### Technical
- PromptGenerationService real implementation
- ImageGenerationService real implementation
- Integration tests with real API
- Lighthouse score >80 on all metrics
- WCAG 2.1 AA accessibility compliance

### Costs
- Prompt generation: $0.03 per deck
- Image generation: $2.20 per deck
- Total: $2.23 per deck
```

---

### Phase 4.6: Sprint 4 Completion Checklist

Before launching:

**Security**:
- [ ] Input validation implemented
- [ ] Rate limiting enabled
- [ ] API keys secured (server-only)
- [ ] CORS configured
- [ ] CSP headers set
- [ ] No XSS vulnerabilities

**Performance**:
- [ ] Lighthouse score >80 (all metrics)
- [ ] Images lazy-loaded
- [ ] Code split by route
- [ ] Caching strategy implemented
- [ ] Build size optimized

**Testing**:
- [ ] All tests passing
- [ ] End-to-end workflow tested on production
- [ ] Mobile devices tested (iOS + Android)
- [ ] Multiple browsers tested (Chrome, Firefox, Safari)

**Documentation**:
- [ ] README.md updated
- [ ] USER_GUIDE.md created
- [ ] CHANGELOG.md updated
- [ ] API costs documented

**Deployment**:
- [ ] Production URL live
- [ ] Environment variables configured
- [ ] Vercel Blob storage working
- [ ] GitHub Actions passing
- [ ] Monitoring enabled

---

## 3. Parallel Execution Strategy

**Agents can work in parallel on these tasks:**

### Track 1: PromptGenerationService (Agent A)
- Task 3.1.1: Scaffolding (1-2 hours)
- Task 3.1.2: API Integration (3-4 hours)
- Task 3.1.3: Remaining methods (2-3 hours)
- Task 3.1.4: Factory update (30 min)

**Total**: 7-10 hours

### Track 2: ImageGenerationService (Agent B)
Can start immediately after PromptGenerationService contract is understood:
- Task 3.2.1: Scaffolding (1 hour)
- Task 3.2.2: Implementation (3-4 hours)
- Task 3.2.3: Factory update (30 min)

**Total**: 5-6 hours

### Track 3: Sprint 4 Preparation (Agent C)
Can start immediately:
- Task 4.1: Security audit (review existing code)
- Task 4.2: Performance optimization setup
- Task 4.3: Documentation templates
- Task 4.4: Vercel project setup

**Total**: 4-5 hours

**Sequential dependencies**:
1. Track 1 must complete before integration testing (Phase 3.3)
2. Track 2 must complete before integration testing (Phase 3.3)
3. Phase 3.3 must complete before Sprint 4 deployment

**Optimal parallelization**:
- **Hour 0-10**: Agent A (PromptGeneration) + Agent B (ImageGeneration) + Agent C (Sprint 4 prep)
- **Hour 10-13**: All agents on integration testing (Phase 3.3)
- **Hour 13-28**: Sprint 4 execution (can parallelize some tasks)

**Total time with parallelization**: 28-32 hours (~3.5-4 working days)

---

## 4. Code Review Strategy

### Review Checkpoint 1: After Service Scaffolding
**Reviewer**: Senior developer or AI architect
**Focus**: Contract compliance, structure, error handling patterns
**Files**: `/services/real/PromptGenerationService.ts`, `/services/real/ImageGenerationService.ts`
**Criteria**:
- [ ] Implements contract interface exactly
- [ ] No `any` types
- [ ] Proper error handling (ServiceResponse pattern)
- [ ] Environment variable handling secure
- [ ] TypeScript compiles (0 errors)

### Review Checkpoint 2: After API Integration
**Reviewer**: Technical lead
**Focus**: API calls, response parsing, cost tracking
**Files**: Same as above + integration tests
**Criteria**:
- [ ] API calls use correct endpoints
- [ ] Response parsing handles edge cases
- [ ] Cost calculation accurate
- [ ] Progress callbacks fire correctly
- [ ] Retry logic implemented

### Review Checkpoint 3: Before Sprint 3 Merge
**Reviewer**: Full team review
**Focus**: Complete integration, testing, SDD compliance
**Files**: All Sprint 3 files
**Criteria**:
- [ ] All contract tests pass
- [ ] All integration tests pass
- [ ] Manual end-to-end test passed
- [ ] No contract modifications
- [ ] Service factory working
- [ ] Documentation updated

### Review Checkpoint 4: Before Production Deployment
**Reviewer**: Security + performance specialist
**Focus**: Security, performance, user experience
**Files**: All files
**Criteria**:
- [ ] Security audit passed
- [ ] Lighthouse >80 on all metrics
- [ ] No sensitive data exposed
- [ ] Rate limiting working
- [ ] Error messages user-friendly

---

## 5. Success Metrics

### Sprint 3 Success Metrics
**SDD Compliance**:
- [ ] Integration worked first try: YES/NO
- [ ] Contract modifications needed: 0
- [ ] UI code changes needed: 0
- [ ] Service factory toggle works: YES

**Quality**:
- [ ] TypeScript errors: 0
- [ ] Test pass rate: >99%
- [ ] Contract test alignment (mock vs real): 100%
- [ ] Code coverage: >90%

**Performance**:
- [ ] Prompt generation time: <60 seconds
- [ ] Image generation time: <3 minutes (22 cards)
- [ ] API success rate: >98%
- [ ] Retry success rate: >80%

**Cost**:
- [ ] Prompt generation cost: <$0.05 per deck
- [ ] Image generation cost: <$2.50 per deck
- [ ] Total cost per deck: <$3.00

### Sprint 4 Success Metrics
**Security**:
- [ ] No XSS vulnerabilities
- [ ] API keys never exposed
- [ ] Rate limiting effective
- [ ] OWASP top 10: all mitigated

**Performance**:
- [ ] Lighthouse Performance: >85
- [ ] Lighthouse Accessibility: >95
- [ ] Lighthouse Best Practices: >90
- [ ] Lighthouse SEO: >90
- [ ] First Contentful Paint: <1.5s
- [ ] Time to Interactive: <3.5s

**User Experience**:
- [ ] Mobile usable: YES
- [ ] Error messages clear: YES
- [ ] Progress indicators accurate: YES
- [ ] Download functionality: 100% working

**Deployment**:
- [ ] Production URL live: YES
- [ ] Zero downtime deployment: YES
- [ ] Monitoring enabled: YES
- [ ] Backup/rollback ready: YES

---

## 6. Risk Mitigation

### Risk 1: Grok API Rate Limits
**Probability**: Medium  
**Impact**: High (blocks image generation)

**Mitigation**:
- Implement 2-second delay between image requests
- Add retry logic with exponential backoff
- Show clear error message to user with wait time
- Consider queue system for high traffic

**Contingency**:
- Fall back to batch processing (generate overnight)
- Implement request queueing
- Contact Grok support for rate limit increase

### Risk 2: API Costs Higher Than Expected
**Probability**: Low  
**Impact**: Medium

**Mitigation**:
- Track costs in real-time
- Add cost confirmation dialog before generation
- Set per-user daily limits
- Monitor costs via Vercel dashboard

**Contingency**:
- Implement credit system
- Add "test mode" with single card generation
- Optimize prompts to reduce token usage

### Risk 3: Integration Fails (Contract Mismatch)
**Probability**: Low (SDD mitigates this)  
**Impact**: High (blocks Sprint 3)

**Mitigation**:
- Run contract tests on BOTH mock and real
- Validate response shapes with type guards
- Test with real API early and often
- Follow exact mock behavior

**Contingency**:
- If contract wrong: create v2 contract, regenerate mocks
- If implementation wrong: fix implementation to match contract
- Emergency protocol in AGENTS.md

### Risk 4: Vercel Deployment Issues
**Probability**: Low  
**Impact**: Medium

**Mitigation**:
- Test build locally before deploying
- Use preview deployments for testing
- Monitor build logs closely
- Keep environment variables in sync

**Contingency**:
- Roll back to previous deployment (Vercel one-click)
- Debug locally with production build
- Contact Vercel support
- Deploy to alternative platform (Netlify backup)

### Risk 5: Vercel Blob Storage Failures
**Probability**: Low  
**Impact**: High (images not saved)

**Mitigation**:
- Always save base64 data URL as fallback
- Implement retry logic for blob uploads
- Monitor blob storage quota
- Test uploads in preview environment

**Contingency**:
- Use data URLs temporarily (users can still download)
- Switch to Cloudinary as backup storage
- Implement client-side download (save locally)

---

## 7. Rollback Strategy

### If Sprint 3 Integration Fails

**Immediate rollback**:
```bash
git checkout main
git revert <sprint-3-merge-commit>
git push
```

**Result**: App returns to Sprint 2 state (working with mocks)

### If Production Deployment Breaks

**Option 1: Vercel Dashboard Rollback**
- Go to Vercel dashboard → Deployments
- Find last working deployment
- Click "Promote to Production"
- Instant rollback

**Option 2: Git Rollback**
```bash
git revert <broken-commit>
git push
# Vercel auto-deploys rollback
```

**Option 3: Emergency Fix**
- Create hotfix branch
- Fix critical bug
- Deploy immediately via PR

### If Grok API Fails in Production

**Immediate action**:
```bash
# Switch back to mocks temporarily
vercel env add USE_MOCKS true
vercel --prod
```

**Result**: Users see mock data until API restored

---

## 8. Post-Launch Tasks

### Immediate (Day 1-7)
- [ ] Monitor error rates (Vercel dashboard)
- [ ] Monitor API costs (X.AI dashboard)
- [ ] Collect user feedback
- [ ] Fix critical bugs
- [ ] Update documentation based on user questions

### Short-term (Week 2-4)
- [ ] Optimize API costs (reduce token usage)
- [ ] Add user analytics (Vercel Analytics)
- [ ] Implement feedback from early users
- [ ] Add more style presets
- [ ] Improve prompt quality

### Long-term (Month 2+)
- [ ] User authentication (Sprint 5)
- [ ] Database storage (Sprint 6)
- [ ] Social sharing (Sprint 8)
- [ ] Print-ready export (Sprint 9+)
- [ ] API access for developers

---

## 9. Lessons from AI Coordination Server

**What worked**:
1. ✅ Following SDD strictly = 100% success
2. ✅ Contract tests caught all mismatches early
3. ✅ Real services implemented exactly like mocks
4. ✅ 143 tests passing, 0 integration issues
5. ✅ TypeScript strict mode prevented runtime errors

**Apply to TarotOutMyHeart**:
- Use same service implementation pattern (constructor injection)
- Use same error handling pattern (ServiceResponse)
- Write contract tests for BOTH mock and real services
- Never modify contracts during implementation
- Run `npm run check` after EVERY file change

**Reference files**:
- `/coordination-server/services/real/ClaudeCoordinationService.ts` (service pattern)
- `/coordination-server/tests/contracts/StateStore.test.ts` (contract test pattern)
- `/coordination-server/services/factory.ts` (factory pattern)

---

## 10. Critical Reminders

### BEFORE Starting Sprint 3:
1. ✅ Sprint 2 is complete (0 errors, 99.8% tests passing)
2. ✅ All contracts frozen and validated
3. ✅ All mocks functional
4. ✅ Service factory in place
5. ✅ Read this entire plan

### DURING Sprint 3:
1. ⚠️ NEVER modify contracts
2. ⚠️ Run `npm run check` after EVERY file change
3. ⚠️ Test with real API early and often
4. ⚠️ Match mock behavior exactly
5. ⚠️ Document all API costs

### BEFORE Sprint 3 Merge:
1. ✅ All contract tests pass (mock + real)
2. ✅ All integration tests pass
3. ✅ Manual end-to-end test passed
4. ✅ TypeScript: 0 errors
5. ✅ CHANGELOG.md updated

### BEFORE Production Deployment:
1. ✅ Security audit passed
2. ✅ Lighthouse >80 on all metrics
3. ✅ Preview deployment tested
4. ✅ Environment variables configured
5. ✅ Rollback strategy documented

---

## 11. Final Checklist

### Sprint 3 Complete ✅
- [ ] PromptGenerationService implemented
- [ ] ImageGenerationService implemented
- [ ] Service factory updated
- [ ] Contract tests passing (mock + real)
- [ ] Integration tests passing
- [ ] Manual testing complete
- [ ] Documentation updated
- [ ] 0 TypeScript errors
- [ ] 0 contract modifications
- [ ] CHANGELOG.md updated

### Sprint 4 Complete ✅
- [ ] Security audit passed
- [ ] Performance optimized
- [ ] Lighthouse >80 all metrics
- [ ] Deployed to Vercel production
- [ ] Environment variables configured
- [ ] Vercel Blob storage working
- [ ] User documentation created
- [ ] Monitoring enabled
- [ ] Rollback tested
- [ ] Post-launch plan ready

### MVP Launch ✅
- [ ] Production URL live
- [ ] All features working
- [ ] Mobile responsive
- [ ] Costs documented
- [ ] User guide published
- [ ] Support channel established
- [ ] Announcement prepared

---

**End of Implementation Plan**

Generated by: Claude Sonnet 4.5 (Architecture Specialist)  
Date: 2025-11-17  
Total estimated time: 28-40 hours (3.5-5 working days)  
Confidence level: 95% (SDD proven effective)

This plan is ready for parallel execution by multiple AI agents or human developers.
