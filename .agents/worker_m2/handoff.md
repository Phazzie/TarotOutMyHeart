# Requirement R3 Handoff Report: Image Generation Service Hardening

**Agent**: `worker_m2`  
**Milestone**: M2 (Requirement R3)  
**Date**: 2026-08-17  
**Project**: TarotOutMyHeart Hardening  

---

## 1. Observation

### 1.1 Pre-Modification Observations
1. **Model Constant**:
   In `contracts/ImageGeneration.ts` (line 33), `GROK_IMAGE_MODEL` was set to `'grok-2-image-alpha' as const` and referenced in JSDoc comments at lines 4, 148, and 539.
2. **Cancellation Mechanism & Retries**:
   In `services/real/ImageGenerationService.ts`:
   - `cancelGeneration` only flipped a boolean `cancelRequested = true` without aborting in-flight `fetch` requests.
   - When an `AbortError` was encountered, the catch block converted it to `API_TIMEOUT` and entered a retry loop (up to 2 additional attempts with 3-second delays), instead of immediately stopping and returning `SESSION_CANCELED`.
3. **Storage Option Propagation**:
   - `GenerateImagesInput` specified `saveToStorage?: boolean`, but `services/real/ImageGenerationService.ts` never passed `saveToStorage` to `generateSingleCardWithRetry` nor included it in the `/api/generate/card` POST body.
   - `src/routes/api/generate/card/+server.ts` did not parse `saveToStorage` from `request.json()`, unconditionally attempting Vercel Blob uploads if `BLOB_READ_WRITE_TOKEN` was present.
4. **Pricing Discrepancy**:
   - In `services/real/ImageGenerationService.ts`, per-image pricing was hardcoded at `$0.04` ($0.88 for 22 cards) across `generateImages`, `usagePerCard`, `regenerateImage`, and `estimateCost`.
   - In `tests/real/ImageGenerationService.test.ts`, `estimateCost` asserted `totalEstimatedCost` of `0.88` for 22 cards.

### 1.2 Implemented Changes
- **`contracts/ImageGeneration.ts`**:
  - Updated `GROK_IMAGE_MODEL = 'grok-imagine-image-2.0' as const`.
  - Updated JSDoc comments to reference `grok-imagine-image-2.0`.
- **`services/real/ImageGenerationService.ts`**:
  - Added `activeAbortController: AbortController | null` to track active generation sessions.
  - In `cancelGeneration`, called `this.activeAbortController?.abort()` and set `session.isCanceled = true`.
  - In `generateSingleCardWithRetry`, linked child fetch request controller signal to `parentController`'s abort signal so in-flight requests abort immediately on cancellation.
  - Handled `AbortError` (both `DOMException` and `Error` with `name === 'AbortError'`): when `cancelRequested` or signal aborted, immediately returned `{ success: false, error: { code: ImageGenerationErrorCode.SESSION_CANCELED, message: 'Canceled' } }` to bypass all retry loops and backoff delays.
  - Forwarded `saveToStorage` from `GenerateImagesInput` into `generateSingleCardWithRetry` and included it in the POST body to `/api/generate/card`.
  - Updated pricing from `$0.04` to `$0.02` per image ($0.44 for 22 cards) in `generateImages`, `usagePerCard`, `regenerateImage`, and `estimateCost`.
- **`src/routes/api/generate/card/+server.ts`**:
  - Added `saveToStorage?: boolean` and `model?: string` to request body type parsing.
  - Conditioned Vercel Blob uploads on `saveToStorage !== false && blobToken && imageData.b64_json`. When `saveToStorage === false`, returns the base64 data URL directly without attempting blob upload.
- **`services/mock/CostCalculationMock.ts`**:
  - Updated image model assumption text from `grok-2-image-alpha` to `grok-imagine-image-2.0`.
- **`tests/real/ImageGenerationService.test.ts`**:
  - Updated `estimateCost` assertion from `0.88` to `0.44` (and `costPerImage` to `0.02`).
  - Added tests for `cancelGeneration()` with active AbortController abort, verifying in-flight cancellation with 0 retry attempts.
  - Added tests verifying retention of cards generated before cancellation.
  - Added tests verifying `saveToStorage: false` is correctly forwarded in the fetch request payload.
  - Added tests verifying `$0.02` cost tracking per card in `totalUsage`.

---

## 2. Logic Chain

1. **AbortController Immediate Termination**:
   - `activeAbortController` is created when `generateImages` starts.
   - When `cancelGeneration` is called, `activeAbortController.abort()` immediately triggers the `abort` event on active fetch operations.
   - In `generateSingleCardWithRetry`, the catch block detects `AbortError` with `isCanceled` true, returning `ImageGenerationErrorCode.SESSION_CANCELED`.
   - The loop in `generateImages` detects `SESSION_CANCELED` and breaks immediately, setting `session.isCanceled = true` and `progress.status = 'Generation session canceled.'`.
2. **Storage Bypassing**:
   - Passing `saveToStorage: false` down to `/api/generate/card` ensures the server handler skips `put(...)` to Vercel Blob and returns `{ success: true, data: { imageUrl: dataUrl, imageDataUrl: dataUrl } }`.
3. **Model & Pricing Consistency**:
   - Updating `GROK_IMAGE_MODEL` to `grok-imagine-image-2.0` aligns contract specifications, mock assumptions, and server proxy defaults.
   - Updating unit pricing to `$0.02` ensures 22 cards cost exactly `$0.44`, matching project requirements.

---

## 3. Caveats

- In serverless / Node environments without `BLOB_READ_WRITE_TOKEN` configured, the API handler gracefully falls back to returning the base64 data URL.
- When `saveToStorage` is not explicitly passed (or `undefined`), it defaults to `saveToStorage !== false` (true), preserving backward compatibility.

---

## 4. Conclusion

Requirement R3 is fully implemented and tested according to all requirements and constraints:
- `contracts/ImageGeneration.ts` uses `'grok-imagine-image-2.0' as const`.
- `services/real/ImageGenerationService.ts` cleanly cancels in-flight operations via `AbortController`, skips retry loops on abort, forwards `saveToStorage`, and uses `$0.02` per image pricing.
- `src/routes/api/generate/card/+server.ts` respects `saveToStorage: false` by skipping Blob uploads and returning data URLs.
- All 606 tests pass across 21 test files, and `svelte-check` reports 0 errors and 0 warnings.

---

## 5. Verification Method

### 5.1 Run Typecheck / Diagnostics
```powershell
npm.cmd run check
```
**Expected Output**: `svelte-check found 0 errors and 0 warnings`.

### 5.2 Run Complete Test Suite
```powershell
npm.cmd test
```
**Expected Output**: All 21 test files passed, 606+ tests passed with 0 failures.

### 5.3 Verify Specific Real Service Tests
```powershell
npx.cmd vitest run tests/real/ImageGenerationService.test.ts
```
**Expected Output**: All 7 tests in `tests/real/ImageGenerationService.test.ts` pass.
