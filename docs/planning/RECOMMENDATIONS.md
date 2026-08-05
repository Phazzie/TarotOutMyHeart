# Technical Recommendations - TarotOutMyHeart

**Created**: 2025-11-07  
**Purpose**: Technical decisions and recommendations for open questions  
**Status**: 📋 Decision Document

---

## Image Upload Implementation

### Recommendation: **Client-Side Preview with Deferred Upload**

**Approach**:

- Store uploaded files in browser memory during session
- Generate preview URLs using `URL.createObjectURL()`
- Convert to base64 for Grok API calls (only when needed)
- No server storage needed for MVP

**Why**:

- ✅ Simpler implementation (no backend upload endpoint)
- ✅ Free (no storage costs)
- ✅ Fast preview (instant, no upload delay)
- ✅ Privacy-friendly (images never leave user's browser unless generating)
- ❌ Images lost on page refresh (acceptable for MVP, adthe grok image api isuniqued localStorage in Phase 2)

**Implementation**:

```typescript
interface UploadedImage {
  id: string // UUID
  file: File // Original file object
  previewUrl: string // URL.createObjectURL() result
  fileName: string // Original filename
  fileSize: number // Bytes
  mimeType: string // 'image/jpeg' | 'image/png'
  uploadedAt: Date // Timestamp
}

// Validation
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png']
const MAX_FILES = 5
```

**Image Preprocessing**:

- ✅ Validate on upload (type, size, count)
- ✅ Generate thumbnail for preview (optional, use CSS for now)
- ❌ No server-side resize/compress for MVP
- Phase 2: Add image optimization if Grok API has size limits

---

## Style Input Implementation

### Recommendation: **Hybrid Approach (Predefined + Custom)**

**Approach**:

- **Theme**: Dropdown with common options + "Custom" option
- **Tone**: Dropdown with common options + "Custom" option
- **Description**: Free text area (500 char limit, required)
- **Concept**: Free text input (optional)
- **Characters**: Free text input (optional)

**Why**:

- ✅ Guides users with suggestions (better UX)
- ✅ Allows creativity (custom options)
- ✅ Reduces typos (predefined options)
- ✅ Easy to implement (standard form inputs)

**Predefined Options**:

**Themes** (Add "Custom" as last option):

- Art Nouveau
- Cyberpunk
- Watercolor
- Minimalist
- Gothic
- Art Deco
- Fantasy
- Vintage
- Digital Art
- Hand-Drawn
- Custom (opens text input)

**Tones** (Add "Custom" as last option):

- Dark
- Light
- Whimsical
- Serious
- Mystical
- Modern
- Traditional
- Ethereal
- Bold
- Soft
- Custom (opens text input)

**Default Values**:

```typescript
const DEFAULT_STYLE_INPUTS = {
  theme: 'Art Nouveau', // First option as default
  tone: 'Mystical', // Tarot-appropriate default
  description: '', // Empty, user must fill
  concept: '', // Optional
  characters: '', // Optional
}
```

**Validation**:

```typescript
interface StyleInputValidation {
  theme: {
    required: true
    maxLength: 50
  }
  tone: {
    required: true
    maxLength: 50
  }
  description: {
    required: true
    minLength: 10
    maxLength: 500
  }
  concept: {
    required: false
    maxLength: 200
  }
  characters: {
    required: false
    maxLength: 200
  }
}
```

**localStorage**: Save draft inputs on every change (Phase 1, simple feature)

---

## Grok API Integration

### API Overview

**Status**: ✅ Verified with X.AI documentation

**API Details**:

- **Text API**: OpenAI-compatible Chat Completions format
- **Image API**: Uses `grok-2-vision-1212` model (NOT a separate image generation endpoint)
- **Base URL**: `https://api.x.ai/v1/`
- **Key Difference**: Image generation happens through chat completions with vision model, not DALL-E-style endpoint

**Reference Images to Grok**:

**Recommendation: URL-based (Required by Grok)**

**Why URLs (Not Base64)**:

- ⚠️ Grok vision API requires publicly accessible URLs
- ❌ Does NOT support base64 data URIs in messages
- ✅ Must upload images to temporary storage first

**Implementation Strategy**:

```typescript
// Option 1: Vercel Blob (Recommended - integrated with deployment)
import { put } from '@vercel/blob'

async function uploadReferenceImage(file: File): Promise<string> {
  const blob = await put(file.name, file, {
    access: 'public',
    addRandomSuffix: true,
  })
  return blob.url // Returns: https://xyz.public.blob.vercel-storage.com/...
}

// Option 2: Cloudinary (Free tier: 25GB storage, 25GB bandwidth/month)
import { Cloudinary } from '@cloudinary/url-gen'

async function uploadToCloudinary(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', 'tarot_references') // Unsigned upload

  const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: formData,
  })
  const data = await response.json()
  return data.secure_url
}
```

**Cleanup Strategy**:

- Images only needed for prompt generation (single API call)
- Delete from storage after prompts are generated
- For Vercel Blob: Use `del()` function
- For Cloudinary: Use delete API or set auto-expiry (24 hours)

---

### Prompt Generation API Call

**Recommendation**: Single API call using `grok-vision-beta` model

```typescript
interface GrokVisionMessage {
  role: 'system' | 'user' | 'assistant'
  content:
    | string
    | Array<{
        type: 'text' | 'image_url'
        text?: string
        image_url?: { url: string }
      }>
}

interface GrokPromptRequest {
  model: 'grok-vision-beta' // Vision-capable model
  messages: GrokVisionMessage[]
  temperature: 0.8 // Creative but consistent
  max_tokens: 4000 // ~180 tokens per card prompt
  stream: false
}

// Example request structure
const promptRequest: GrokPromptRequest = {
  model: 'grok-vision-beta',
  messages: [
    {
      role: 'system',
      content: 'You are an expert tarot card designer specializing in Major Arcana imagery...',
    },
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: `Based on these reference images and style parameters:
          Theme: ${styleInputs.theme}
          Tone: ${styleInputs.tone}
          Description: ${styleInputs.description}
          
          Generate 22 unique, detailed image generation prompts for the Major Arcana cards (0-21).
          Return as JSON array with format: [{"cardNumber": 0, "cardName": "The Fool", "prompt": "..."}]`,
        },
        ...referenceImageUrls.map(url => ({
          type: 'image_url' as const,
          image_url: { url },
        })),
      ],
    },
  ],
  temperature: 0.8,
  max_tokens: 4000,
}

interface GrokPromptResponse {
  id: string
  object: 'chat.completion'
  created: number
  model: string
  choices: [
    {
      index: 0
      message: {
        role: 'assistant'
        content: string // JSON string with 22 prompts
      }
      finish_reason: 'stop' | 'length'
    },
  ]
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}
```

**Timeout**: 60 seconds (generating 22 prompts may take time)

**Retry Strategy**:

```typescript
const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2, // Exponential backoff
}
```

---

### Image Generation API Call

**✅ Grok Image Generation API**: `grok-2-image-alpha`

**API Details**:

- **Model**: `grok-2-image-alpha` (separate from vision model)
- **Endpoint**: `https://api.x.ai/v1/images/generations`
- **Input**: Text prompt only (does NOT accept reference images)
- **Output**: Base64-encoded image data
- **Size**: 1024x1024 (fixed)
- **Limitations**: Cannot use reference images for style transfer

**Request Format**:

```typescript
interface GrokImageRequest {
  model: 'grok-2-image-alpha'
  prompt: string // Text prompt only
  size?: '1024x1024' // Currently only supported size
  response_format?: 'b64_json' // Returns base64 or 'url' (if supported)
}

interface GrokImageResponse {
  created: number
  data: [
    {
      b64_json: string // Base64-encoded PNG image
      // OR
      url?: string // If URL format is requested/supported
    },
  ]
}
```

**Implementation** (Sequential with progress tracking):

```typescript
import fetch from 'node-fetch'

async function generateCardImage(prompt: string): Promise<string> {
  const response = await fetch('https://api.x.ai/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.XAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'grok-2-image-alpha',
      prompt: prompt,
      size: '1024x1024',
    }),
  })

  const data = await response.json()

  // Convert base64 to data URL or save to storage
  const base64Image = data.data[0].b64_json
  return `data:image/png;base64,${base64Image}`
}

async function generateAllCards(prompts: CardPrompt[]) {
  const results: GeneratedCard[] = []

  for (let i = 0; i < prompts.length; i++) {
    updateProgress(i + 1, prompts.length) // Update UI

    try {
      const imageDataUrl = await generateCardImage(prompts[i].generatedPrompt)

      // Save base64 image to Vercel Blob for permanent storage
      const imageBlob = dataURLtoBlob(imageDataUrl)
      const uploadedUrl = await uploadToStorage(
        imageBlob,
        `card-${prompts[i].cardNumber}-${Date.now()}.png`
      )

      results.push({
        cardNumber: prompts[i].cardNumber,
        cardName: prompts[i].cardName,
        imageUrl: uploadedUrl, // Permanent storage URL
        prompt: prompts[i].generatedPrompt,
        generatedAt: new Date(),
      })
    } catch (error) {
      results.push({
        cardNumber: prompts[i].cardNumber,
        cardName: prompts[i].cardName,
        error: error.message,
        failed: true,
      })
    }

    // Rate limit: Small delay between requests
    if (i < prompts.length - 1) {
      await delay(2000) // 2 second delay to avoid rate limits
    }
  }

  return results
}

// Helper function to convert data URL to Blob
function dataURLtoBlob(dataURL: string): Blob {
  const [header, base64] = dataURL.split(',')
  const binary = atob(base64)
  const array = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i)
  }
  return new Blob([array], { type: 'image/png' })
}
```

**Why Sequential (not batch)**:

- ✅ Better progress feedback (1/22, 2/22, etc.)
- ✅ Easier error handling (if card 5 fails, cards 1-4 still succeed)
- ✅ Allows cancellation mid-generation
- ✅ Avoids rate limits

**Timeout per card**: 30 seconds  
**Total time for 22 cards**: ~11-12 minutes (30s max per card + 2s delay)

**⚠️ Important Limitation**: Grok image generation does NOT accept reference images. The vision model (`grok-vision-beta`) can analyze reference images to create detailed text prompts, but the image generation model (`grok-2-image-alpha`) only accepts text prompts.

**Workflow**:

1. User uploads reference images → stored client-side or in temporary storage
2. Upload references to Vercel Blob → get public URLs
3. Send URLs to `grok-vision-beta` → generates 22 detailed text prompts
4. Send each text prompt to `grok-2-image-alpha` → generates images
5. Save generated images to permanent storage → return URLs to user

**Cancellation Support**: Yes, track AbortController

**Image Storage**:

- URLs from Grok are temporary (expire in 1 hour)
- For MVP: Use temporary URLs, user must download before expiry
- Phase 2: Upload to permanent storage (Vercel Blob, Cloudinary)

---

## Gallery Display

### Recommendation: **Simple Grid with Lazy Loading**

**Layout**:

```css
/* Responsive grid */
.gallery {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
}

@media (min-width: 640px) {
  .gallery {
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  }
}

@media (min-width: 1024px) {
  .gallery {
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  }
}
```

**Lazy Loading**:

- Use native `loading="lazy"` on `<img>` tags
- No virtual scrolling for MVP (22 cards is manageable)

**Image Optimization**:

- Display Grok-generated images as-is (no thumbnails for MVP)
- Add `width` and `height` attributes to prevent layout shift
- Use CSS `object-fit: cover` for consistent aspect ratios

**Zoom/Lightbox**:

- Simple modal overlay on click
- Show full-size image + metadata
- Keyboard navigation (←/→ arrows, ESC to close)
- Library: Build custom or use lightweight option (like `svelte-lightbox`)

---

## Cost Calculation

### Recommendation: **Show Both Estimate and Actual**

**Display Strategy**:

**Before Generation (Estimate)**:

```typescript
interface CostEstimate {
  promptGeneration: {
    model: 'grok-vision-beta'
    estimatedInputTokens: 2000 // Reference images (via vision) + style inputs
    estimatedOutputTokens: 4000 // 22 card prompts
    estimatedCost: 0.03 // Grok vision pricing
  }
  imageGeneration: {
    service: 'grok-2-image-alpha'
    estimatedImages: 22
    costPerImage: 0.0025 // Estimate based on typical AI image pricing
    estimatedCost: 0.055 // 22 * $0.0025 (verify actual Grok pricing)
  }
  imageStorage: {
    service: 'Vercel Blob'
    storageSize: '22MB' // ~1MB per image
    estimatedCost: 0.0 // Free tier: 500MB included
  }
  totalEstimated: 0.085 // ~$0.09 per deck (verify Grok pricing)
}
```

**After Generation (Actual)**:

```typescript
interface ActualCost {
  promptGeneration: {
    actualInputTokens: 2347
    actualOutputTokens: 3891
    actualCost: 0.028
  }
  imageGeneration: {
    actualImages: 22
    failedImages: 0
    actualCost: 0.055 // Actual Grok image pricing
  }
  imageStorage: {
    uploadedImages: 5 // Reference images (temporary)
    generatedImages: 22 // Permanent storage
    storageDuration: 'permanent'
    actualCost: 0.0 // Within free tier
  }
  totalActual: 0.083
}
```

**Note**: Verify actual Grok image generation pricing from X.AI billing documentation

**Warning Threshold**:

- Show warning modal if estimated cost > $1.00
- Require user confirmation to proceed

**Display Location**:

- Sticky widget in corner during generation
- Expandable for detailed breakdown
- Final summary after generation completes

---

## Download Implementation

### Recommendation: **Client-Side ZIP with JSZip**

**Library**: [JSZip](https://stoodley.github.io/jszip/)

```bash
npm install jszip
```

**Implementation**:

```typescript
import JSZip from 'jszip'

async function downloadDeckAsZip(cards: GeneratedCard[], deckInfo: DeckMetadata) {
  const zip = new JSZip()

  // Add images
  for (const card of cards) {
    const imageBlob = await fetch(card.imageUrl).then(r => r.blob())
    const filename = `${String(card.cardNumber).padStart(2, '0')}-${card.cardName.toLowerCase().replace(/\s+/g, '-')}.png`
    zip.file(filename, imageBlob)
  }

  // Add metadata file
  const metadata = {
    generatedAt: new Date().toISOString(),
    deckName: deckInfo.name || 'My Tarot Deck',
    styleInputs: deckInfo.styleInputs,
    cards: cards.map(c => ({
      number: c.cardNumber,
      name: c.cardName,
      prompt: c.prompt,
      traditionalMeaning: c.traditionalMeaning,
    })),
  }

  zip.file('deck-info.json', JSON.stringify(metadata, null, 2))

  // Generate and download
  const blob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${deckInfo.name || 'tarot-deck'}-${Date.now()}.zip`
  a.click()
  URL.revokeObjectURL(url)
}
```

**Filename Conventions**:

- Individual card: `00-the-fool.png`, `01-the-magician.png`, etc.
- ZIP file: `my-cyberpunk-deck-1699382400000.zip`

**Metadata File (`deck-info.json`)**:

```json
{
  "generatedAt": "2025-11-07T15:30:00.000Z",
  "deckName": "Cyberpunk Tarot",
  "styleInputs": {
    "theme": "Cyberpunk",
    "tone": "Dark",
    "description": "Neon-lit dystopian future with technology vs humanity themes",
    "concept": "Megacorporation control",
    "characters": "Augmented humans"
  },
  "cards": [
    {
      "number": 0,
      "name": "The Fool",
      "prompt": "A cyberpunk character standing at edge of neon abyss...",
      "traditionalMeaning": "New beginnings, innocence, spontaneity"
    }
  ]
}
```

**Image Format**:

- PNG (lossless, supports transparency)
- Quality: As generated by Grok (typically 1024x1024)
- No watermark for MVP

---

## State Management

### Recommendation: **Svelte Stores (Simple and Effective)**

**Why Svelte Stores**:

- ✅ Built-in to Svelte (no extra dependencies)
- ✅ Simple API (`writable`, `derived`, `readable`)
- ✅ Reactive by default
- ✅ Easy to persist with localStorage
- ✅ Sufficient for MVP (no complex state machines needed)

**Store Structure**:

```typescript
// stores/deckState.ts
import { writable, derived } from 'svelte/store'

interface DeckState {
  uploadedImages: UploadedImage[]
  styleInputs: StyleInputs | null
  generatedPrompts: CardPrompt[] | null
  generatedCards: GeneratedCard[] | null
  currentStep: 'upload' | 'style' | 'prompts' | 'generate' | 'gallery'
  isGenerating: boolean
  generationProgress: { current: number; total: number }
  error: Error | null
  costs: CostTracking
}

export const deckState = writable<DeckState>({
  uploadedImages: [],
  styleInputs: null,
  generatedPrompts: null,
  generatedCards: null,
  currentStep: 'upload',
  isGenerating: false,
  generationProgress: { current: 0, total: 0 },
  error: null,
  costs: { estimated: 0, actual: 0 },
})

// Derived store for computed values
export const isReadyToGenerate = derived(
  deckState,
  $state => $state.uploadedImages.length > 0 && $state.styleInputs !== null
)
```

**localStorage Persistence** (for draft inputs):

```typescript
import { writable } from 'svelte/store'

function persistentWritable<T>(key: string, initialValue: T) {
  const stored = localStorage.getItem(key)
  const initial = stored ? JSON.parse(stored) : initialValue

  const store = writable(initial)

  store.subscribe(value => {
    localStorage.setItem(key, JSON.stringify(value))
  })

  return store
}

// Usage
export const styleInputs = persistentWritable<StyleInputs>('draft_style_inputs', {
  theme: '',
  tone: '',
  description: '',
  concept: '',
  characters: '',
})
```

---

## Error Handling

### Recommendation: **Toast Notifications + Error Boundaries**

**Library**: [svelte-sonner](https://svelte-sonner.vercel.app/) (lightweight toast library)

```bash
npm install svelte-sonner
```

**Error Display Strategy**:

**Toast for non-critical errors**:

- File upload validation failures
- Form validation errors
- Network timeouts (with retry option)

**Modal for critical errors**:

- API key missing/invalid
- Generation complete failure (all cards failed)
- Payment required errors

**Inline for field validation**:

- Invalid input in forms
- Real-time validation feedback

**Implementation**:

```typescript
// lib/utils/errorHandler.ts
import { toast } from 'svelte-sonner'

export function handleError(error: unknown) {
  if (error instanceof ValidationError) {
    toast.error(error.message)
  } else if (error instanceof APIError) {
    if (error.retryable) {
      toast.error(error.message, {
        action: {
          label: 'Retry',
          onClick: () => error.retryFn(),
        },
      })
    } else {
      toast.error(error.message)
    }
  } else {
    toast.error('An unexpected error occurred')
    console.error(error)
  }
}
```

**Error Logging** (Phase 2):

- Add Sentry for production error tracking
- Log to console in development
- Include context (user action, state, request details)

---

## Summary of Recommendations

| Decision              | Recommendation                   | Rationale                              |
| --------------------- | -------------------------------- | -------------------------------------- |
| **Image Upload**      | Client-side with preview URLs    | Simple, fast, no server needed         |
| **Style Input**       | Hybrid (predefined + custom)     | Better UX with flexibility             |
| **Reference Images**  | Upload to Vercel Blob/Cloudinary | Grok vision requires public URLs       |
| **Prompt Generation** | Grok `grok-vision-beta`          | Vision model analyzes reference images |
| **Image Generation**  | Grok `grok-2-image-alpha`        | Native Grok image generation           |
| **Generation Flow**   | Sequential with progress         | Better UX, error handling              |
| **Image Format**      | Base64 → Blob → Vercel storage   | Grok returns base64, save permanently  |
| **Gallery**           | Simple grid + lazy loading       | Sufficient for 22 cards                |
| **Cost Display**      | Both estimate and actual         | Transparency + confirmation            |
| **Download**          | JSZip client-side                | No server, includes metadata           |
| **State Management**  | Svelte stores                    | Built-in, simple, reactive             |
| **Error Handling**    | Toast + modal mix                | Appropriate for error severity         |

**Estimated Cost per Deck**: ~$0.08-0.10 (Grok vision + Grok image generation)

**Important**: Grok image generation (`grok-2-image-alpha`) does NOT accept reference images directly. Reference images must be analyzed by `grok-vision-beta` first to create detailed text prompts.

---

## Next Actions

1. ✅ ~~Verify Grok API documentation~~ (Complete)
2. ✅ ~~Update recommendations with correct API info~~ (Complete)
3. ⏭️ Verify Grok image generation pricing from X.AI
4. ⏭️ Define contracts based on these recommendations
5. ⏭️ Set up Vercel Blob for image storage (reference + generated)
6. ⏭️ Begin contract implementation in `/contracts`
