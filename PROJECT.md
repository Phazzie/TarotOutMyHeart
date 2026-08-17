# Project: TarotOutMyHeart Hardening

## Architecture
TarotOutMyHeart is a SvelteKit 2 + Svelte 5 application providing AI-assisted Major Arcana tarot deck creation with style customization, Vision AI prompt generation, Grok image generation, and deck downloading.

- **Frontend Routes & Components**:
  - `src/routes/generate/+page.svelte`: Generation orchestrator UI, lifecycle management, progress tracking.
  - `src/lib/components/PromptListComponent.svelte`: Svelte 5 reactive prompt editor and management list.
  - `src/lib/components/CostDisplayComponent.svelte`: Cost calculation and breakdown display.
- **Services (Real & Mock via Factory)**:
  - `services/real/ImageGenerationService.ts`: Grok image generation, abort controller cancellation, retry logic.
  - `services/real/PromptGenerationService.ts`: AI prompt generation & single card regeneration via proxy.
  - `services/real/ImageUploadService.ts`: Reference image upload with duplicate detection (`name`, `size`, `lastModified`).
  - `services/real/DownloadService.ts`: ZIP / individual format deck packager with metadata JSON inclusion.
  - `services/real/CostCalculationService.ts`: Multi-format cost calculation and warning thresholds.
  - `services/real/StyleInputService.ts`: LocalStorage style persistence with safe error suppression.
- **API Proxy Routes**:
  - `src/routes/api/generate/card/+server.ts`: Server-side Grok vision / image generation proxy with Vercel Blob storage.
  - `src/routes/api/prompts/+server.ts`: Server-side prompt generation AI proxy.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | R1: Async Unmount Cleanup | Add `onDestroy` in `/generate/+page.svelte` to cancel active image generation and clear navigation timers | M1 | ORIGINAL_REQUEST.md |
| 2 | R2: Svelte 5 Map Reactivity | Fix `PromptListComponent.svelte` Map/Set mutation reactivity by reassigning collections on updates | M1 | ORIGINAL_REQUEST.md |
| 3 | R3.1: Model & Pricing Update | Switch `GROK_IMAGE_MODEL` to `grok-imagine-image-2.0` and cost per image to $0.02 | M2 | ORIGINAL_REQUEST.md |
| 4 | R3.2: AbortController Cancel | Refactor `cancelGeneration` to use `AbortController` and catch `AbortError` without retry loops | M2 | ORIGINAL_REQUEST.md |
| 5 | R3.3: Storage Param Propagation | Pass `saveToStorage` to API `/api/generate/card` and honor it in server endpoint | M2 | ORIGINAL_REQUEST.md |
| 6 | R4.1: AI Proxy Prompt Regen | Route prompt regeneration through the server AI proxy in `PromptGenerationService` | M3 | ORIGINAL_REQUEST.md |
| 7 | R4.2: Duplicate Detection | Identify duplicate images using `file.size` and `lastModified` alongside `fileName` | M3 | ORIGINAL_REQUEST.md |
| 8 | R4.3: Download Format & Metadata | Validate format against `['zip', 'individual']` and ensure metadata JSON inclusion | M3 | ORIGINAL_REQUEST.md |
| 9 | R4.4: Cost Format Branching | Implement `'detailed'`, `'summary'`, `'minimal'` format branching and update UI price labels | M3 | ORIGINAL_REQUEST.md |
| 10 | R4.5: Safe LocalStorage | Catch `localStorage` exceptions in `StyleInputService` across all methods | M3 | ORIGINAL_REQUEST.md |
| 11 | Final Verification | Run `npm run check` (0 errors) and `npm run test` (600+ tests pass) | M4 | ORIGINAL_REQUEST.md |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: Lifecycle & Reactivity Hardening | R1 (`+page.svelte` `onDestroy`) & R2 (`PromptListComponent.svelte` Svelte 5 reactivity) | none | DONE |
| 2 | M2: Image Generation Service & Model | R3 (AbortController, Grok 2.0 model, $0.02 pricing, saveToStorage) | M1 | DONE |
| 3 | M3: Component & Supporting Services | R4 (Prompt regen proxy, duplicate detection, download logic, cost format, localStorage) | M2 | DONE |
| 4 | M4: Comprehensive Verification | Full test suite execution & svelte-check diagnostics verification | M1, M2, M3 | DONE |

## Interface Contracts
### ImageGenerationService ↔ `/api/generate/card`
- POST `/api/generate/card` body: `{ cardNumber: number, cardName: string, generatedPrompt: string, model?: string, saveToStorage?: boolean }`
- Response: `{ success: boolean, card?: GeneratedCard, error?: { code: string, message: string } }`

### PromptGenerationService ↔ `/api/prompts`
- `regeneratePrompt` input: `{ cardNumber: CardNumber, referenceImageUrls?: string[], styleInputs: StyleInputs, previousPrompt?: string, feedback?: string }`
- Calls `/api/prompts` with single-card payload or targeted prompt generation options.

## Code Layout
- `src/routes/generate/+page.svelte` (M1)
- `src/lib/components/PromptListComponent.svelte` (M1)
- `contracts/ImageGeneration.ts` (M2)
- `services/real/ImageGenerationService.ts` (M2)
- `src/routes/api/generate/card/+server.ts` (M2)
- `services/real/PromptGenerationService.ts` (M3)
- `src/routes/api/prompts/+server.ts` (M3)
- `services/real/ImageUploadService.ts` & `services/mock/ImageUploadMock.ts` (M3)
- `contracts/Download.ts`, `services/real/DownloadService.ts`, `services/mock/DownloadMock.ts` (M3)
- `services/real/CostCalculationService.ts` & `src/lib/components/CostDisplayComponent.svelte` (M3)
- `services/real/StyleInputService.ts` (M3)
- `tests/**` (M1, M2, M3, M4)
