# Remaining Work for Copilot — PR #32

> This file documents all outstanding tasks after the mock service rewrite.
> Branch: `claude/review-project-status-01XK2KG3BFvDGLQZmdRcAj6G`
> Status at time of writing: 436 tests passing / 116 failing

---

## 🔴 Critical — Fix Before Merge

### 1. StyleInput Mock — `loadedFrom` returns `'none'` instead of `'default'`

**File:** `services/mock/StyleInputMock.ts`  
**Method:** `loadStyleInputs()`  
**Symptom:** When no saved draft exists, returns `{ found: false, loadedFrom: 'none', data: null }` but contract tests expect `{ found: false, loadedFrom: 'default', data: DEFAULT_STYLE_INPUTS }`.

**Fix needed:**
```typescript
// When no draft found, return defaults:
return {
  success: true,
  data: {
    found: false,
    loadedFrom: 'default',   // ← must be 'default', not 'none'
    data: DEFAULT_STYLE_INPUTS,
  },
}
```

**Failing tests:** 3 in `tests/contracts/StyleInput.test.ts`

---

### 2. StyleInput Mock — Validation error codes wrong

**File:** `services/mock/StyleInputMock.ts`  
**Methods:** `validateStyleInputs()`

**Fix needed:** Return specific error codes per field:
- Theme > 50 chars → `THEME_TOO_LONG`
- Tone > 50 chars → `TONE_TOO_LONG`
- Description < 10 chars → `DESCRIPTION_TOO_SHORT`
- Description > 500 chars → `DESCRIPTION_TOO_LONG`

**Failing tests:** 4 in `tests/contracts/StyleInput.test.ts`

---

### 3. DeckDisplay Mock — `initializeDisplay()` not validating `initialLayout`/`initialSize`

**File:** `services/mock/DeckDisplayMock.ts`  
**Method:** `initializeDisplay()`  
**Symptom:** Invalid values for `initialLayout` (e.g. `'invalid'`) and `initialSize` (e.g. `'extra-large'`) are accepted without returning error codes `INVALID_LAYOUT` / `INVALID_SIZE`.

**Fix needed:**
```typescript
if (input.initialLayout && !DISPLAY_LAYOUTS.includes(input.initialLayout)) {
  return { success: false, error: { code: DeckDisplayErrorCode.INVALID_LAYOUT, ... } }
}
if (input.initialSize && !CARD_SIZES.includes(input.initialSize)) {
  return { success: false, error: { code: DeckDisplayErrorCode.INVALID_SIZE, ... } }
}
```

**Failing tests:** 4 in `tests/contracts/DeckDisplay.test.ts`

---

### 4. CostCalculation Mock — `canAfford` threshold

**File:** `services/mock/CostCalculationMock.ts`  
**Method:** `estimateCost()`  
**Symptom:** Test expects `canAfford: false` for 250 images (~$25) but mock always returns `true`.

**Fix needed:** Lower the `canAfford` threshold or ensure the estimate for 250 images exceeds the budget cap.

**Failing tests:** 1 in `tests/contracts/CostCalculation.test.ts`

---

## 🟡 Medium — Test Environment Configuration

### 5. Configure Vitest with JSDOM Environment

**File:** `vitest.config.ts`  
**Problem:** ~100 tests for Download, ImageUpload, ImageGeneration, PromptGeneration fail because they rely on browser APIs (`File`, `Blob`, `URL.createObjectURL`) that don't exist in Node.js.

**Fix needed:**
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: {
    environment: 'jsdom',  // ← add this
    // ... rest of config
  },
})
```

Or use per-file override with `// @vitest-environment jsdom` at top of each affected test file.

**Affected test files:**
- `tests/contracts/Download.test.ts` (~38 failures)
- `tests/contracts/ImageUpload.test.ts` (~25 failures)
- `tests/contracts/ImageGeneration.test.ts` (~30 failures)
- `tests/contracts/PromptGeneration.test.ts` (~8 failures)

---

### 6. Remove 17 `as any` Escapes from Test Files

Replace with `as unknown as X` pattern or `// @ts-expect-error` for intentionally invalid test inputs:

| File | Line(s) | Fix |
|------|---------|-----|
| `tests/contracts/DeckDisplay.test.ts` | 145, 155, 210, 263, 360, 901, 910, 920 | `'invalid' as unknown as DisplayLayout` |
| `tests/contracts/Download.test.ts` | 32, 33, 37, 234, 248, 347, 494 | `'completed' as unknown as GenerationStatus` etc. |
| `tests/contracts/PromptGeneration.test.ts` | 332 | `'invalid-model' as unknown as GrokModel` |
| `tests/contracts/ImageGeneration.test.ts` | 257 | `[{ invalid: 'data' }] as unknown as CardPrompt[]` |

---

## 🟢 Future Work (Not Blocking)

### 7. Implement 7 Real Services

Create matching real implementations in `services/real/`:
- `ImageUploadService.ts` — needs Vercel Blob token (`BLOB_READ_WRITE_TOKEN`)
- `StyleInputService.ts` — uses localStorage/session storage
- `PromptGenerationService.ts` — needs Grok API key (`GROK_API_KEY`) + `grok-vision-beta` model
- `ImageGenerationService.ts` — needs Grok API key + `grok-2-image-alpha` model
- `DeckDisplayService.ts` — pure state management, no external deps
- `CostCalculationService.ts` — pure calculation, no external deps
- `DownloadService.ts` — needs JSZip for ZIP creation

Each real service must implement the same interface as its mock (contracts are immutable).

### 8. Write Integration Tests

In `tests/integration/`:
- One test file per seam testing the real service against the live API
- Gate with `process.env.RUN_INTEGRATION_TESTS === 'true'`
- Requires `GROK_API_KEY` and `BLOB_READ_WRITE_TOKEN` env vars

### 9. Build UI Components

SvelteKit components needed (Sprint 2 in PRD):
- `ImageUpload.svelte` — drag-and-drop, preview, 5-image max
- `StyleInputForm.svelte` — theme/tone/description/concept fields with validation
- `PromptReview.svelte` — show/edit 22 generated prompts
- `GenerationProgress.svelte` — progress bar, cancel button
- `DeckDisplay.svelte` — grid/list/carousel layouts, sort/filter
- `DownloadButton.svelte` — ZIP download with progress

### 10. Production Deployment (Vercel)

- Set env vars: `GROK_API_KEY`, `BLOB_READ_WRITE_TOKEN`, `USE_MOCKS=false`
- Configure Vercel Blob storage for uploaded reference images
- Configure Vercel Blob storage for generated card images
- Update `README.md` with live demo URL and cost estimate per deck (~$10-15)

---

## Test Count Summary

```
Total tests:    578
Passing:        436 (75%)
Failing:        116 (25%)

By root cause:
  JSDOM missing:      ~100  (fix: vitest environment)
  Wrong mock logic:   ~16   (fix: items 1-4 above)
```

---

## File Reference

```
services/mock/
├── ImageUploadMock.ts      ✅ complete
├── StyleInputMock.ts       ⚠️  loadedFrom + error codes wrong  
├── PromptGenerationMock.ts ⚠️  needs JSDOM for URL tests
├── ImageGenerationMock.ts  ⚠️  needs JSDOM for File/Blob tests
├── DeckDisplayMock.ts      ⚠️  initializeDisplay validation missing
├── CostCalculationMock.ts  ⚠️  canAfford threshold
└── DownloadMock.ts         ⚠️  needs JSDOM for Blob/URL tests

contracts/                  ✅ all 7 contracts finalized (do not modify)
tests/contracts/            ⚠️  116 failures (see above)
services/real/              ❌ not yet implemented
```
