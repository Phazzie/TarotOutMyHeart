# Requirement R3 Survey Report: Harden Image Generation Service

**Investigator**: `survey_explorer_2`  
**Date**: 2026-08-17  
**Scope**: Detailed investigation of Requirement R3 (Image Generation Service Hardening, Model Switch, Pricing Update, AbortController/Cancel Logic, and `saveToStorage` Parameter Propagation)

---

## Executive Summary

This report covers Requirement R3 of the TarotOutMyHeart hardening project:
1. **Service Architecture & Path Mapping**: In this codebase, the image generation service implementation is at `services/real/ImageGenerationService.ts` (aliased via `services/factory.ts` as `imageGenerationService`), the contract interface is in `contracts/ImageGeneration.ts`, and the per-card proxy endpoint is at `src/routes/api/generate/card/+server.ts`.
2. **`cancelGeneration` & `AbortController`**: Currently, `cancelGeneration` only sets a flag `cancelRequested = true` without aborting in-flight `fetch` requests. Furthermore, when `fetch` is aborted or times out, the `catch` block treats `AbortError` as `API_TIMEOUT` and enters a retry loop (up to 2 additional retries with 3-second delays). Refactoring is needed to bind session/request `AbortController`s, immediately abort active fetch calls on cancellation, and catch `AbortError` to return `SESSION_CANCELED` without retrying.
3. **`saveToStorage` Parameter**: `saveToStorage` is specified in `GenerateImagesInput` (`contracts/ImageGeneration.ts`) and passed by `src/routes/generate/+page.svelte` (`saveToStorage: true`), but `ImageGenerationService.ts` fails to pass it to `generateSingleCardWithRetry`, omitting it from the `/api/generate/card` POST body. Additionally, `src/routes/api/generate/card/+server.ts` does not parse `saveToStorage` from `request.json()`, unconditionally attempting Vercel Blob uploads if `imageData.b64_json && blobToken`.
4. **Model Migration**: `GROK_IMAGE_MODEL` constant in `contracts/ImageGeneration.ts` is currently `'grok-2-image-alpha'`. It must be updated to `'grok-imagine-image-2.0'`.
5. **Pricing Update**: Pricing in `services/real/ImageGenerationService.ts` currently hardcodes `$0.04` per image ($0.88 for 22 cards). It must be updated to `$0.02` per image ($0.44 for 22 cards), and `tests/real/ImageGenerationService.test.ts` cost assertion updated from `0.88` to `0.44`.
6. **Current Test Status**: Baseline test suite passes with 21 test files and 602 passing tests. `svelte-check` passes with 0 errors and 0 warnings.

---

## 1. Observation

### 1.1 File Locations and Architectural Layout
- **Contract & Types**: `contracts/ImageGeneration.ts`
- **Real Service**: `services/real/ImageGenerationService.ts`
- **Mock Service**: `services/mock/ImageGenerationMock.ts`
- **Service Factory**: `services/factory.ts` (exports `imageGenerationService` mapped to real or mock based on `USE_MOCKS`)
- **Backend API Endpoint**: `src/routes/api/generate/card/+server.ts`
- **Frontend Page**: `src/routes/generate/+page.svelte`
- **Pricing Contract**: `contracts/CostCalculation.ts`
- **Pricing Services**: `services/real/CostCalculationService.ts`, `services/mock/CostCalculationMock.ts`
- **Test Files**:
  - `tests/contracts/ImageGeneration.test.ts` (68 tests)
  - `tests/real/ImageGenerationService.test.ts` (3 tests)
  - `tests/contracts/CostCalculation.test.ts` (45 tests)
  - `tests/real/CostCalculationService.test.ts` (3 tests)

### 1.2 Verbatim Code Observations

#### A. Model Constant in `contracts/ImageGeneration.ts`
Lines 30-34:
```typescript
/**
 * Grok image generation model
 */
export const GROK_IMAGE_MODEL = 'grok-2-image-alpha' as const
```
And metadata comments at lines 4, 148, 539 referencing `grok-2-image-alpha`.

#### B. `cancelGeneration` and Retry Loop in `services/real/ImageGenerationService.ts`
Lines 54-57:
```typescript
export class ImageGenerationService implements IImageGenerationService {
  private sessions: Map<string, SessionState> = new Map()
  private cancelRequested = false
```
Lines 127-130 in `generateImages`:
```typescript
      const cardResult = await this.generateSingleCardWithRetry(
        promptObj,
        input.model || GROK_IMAGE_MODEL
      )
```
Lines 198-284 in `generateSingleCardWithRetry`:
```typescript
  private async generateSingleCardWithRetry(
    promptObj: CardPrompt,
    model: string
  ): Promise<
    | { success: true; card: GeneratedCard }
    | { success: false; error: { code: ImageGenerationErrorCode; message: string } }
  > {
    let lastError = {
      code: ImageGenerationErrorCode.GENERATION_FAILED,
      message: 'Image generation failed.',
    }

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (this.cancelRequested) {
        return {
          success: false,
          error: { code: ImageGenerationErrorCode.SESSION_CANCELED, message: 'Canceled' },
        }
      }

      if (attempt > 0) {
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS * attempt))
      }

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), CARD_TIMEOUT_MS)

      try {
        const response = await fetch('/api/generate/card', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cardNumber: promptObj.cardNumber,
            cardName: promptObj.cardName,
            generatedPrompt: promptObj.generatedPrompt,
            model,
          }),
          signal: controller.signal,
        })

        clearTimeout(timeoutId)
        ...
      } catch (err) {
        clearTimeout(timeoutId)
        if (err instanceof Error && err.name === 'AbortError') {
          lastError = { code: ImageGenerationErrorCode.API_TIMEOUT, message: 'Request timed out.' }
        } else {
          lastError = {
            code: ImageGenerationErrorCode.NETWORK_ERROR,
            message: err instanceof Error ? err.message : 'Network error.',
          }
        }
      }
    }

    return { success: false, error: lastError }
  }
```
Lines 329-343 in `cancelGeneration`:
```typescript
  async cancelGeneration(
    input: CancelGenerationInput
  ): Promise<ServiceResponse<CancelGenerationOutput>> {
    this.cancelRequested = true
    const session = this.sessions.get(input.sessionId)

    return {
      success: true,
      data: {
        canceled: true,
        completedBeforeCancel: session ? session.progress.completed : 0,
        sessionId: input.sessionId,
      },
    }
  }
```

#### C. `saveToStorage` Parameter Handling
1. In `services/real/ImageGenerationService.ts` (lines 62-63, 127-130, 226-236):
   - `input.saveToStorage` is received in `generateImages(input: GenerateImagesInput)` but never passed down to `generateSingleCardWithRetry`.
   - The fetch body only passes `{ cardNumber, cardName, generatedPrompt, model }`.
2. In `src/routes/api/generate/card/+server.ts` (lines 29-42, 93-114):
   - Body type: `let body: { cardNumber: number; cardName: string; generatedPrompt: string }` (lacks `saveToStorage`).
   - Line 93: `const blobToken = process.env['BLOB_READ_WRITE_TOKEN']`
   - Line 94: `if (imageData.b64_json && blobToken) {` -> Unconditionally uploads to Vercel Blob if token is set, ignoring user preference.

#### D. Pricing in `services/real/ImageGenerationService.ts`
- Line 135: `totalCost += 0.04`
- Line 139: `estimatedCost: 0.04`
- Line 311: `estimatedCost: 0.04`
- Line 375: `const totalCost = Number((count * 0.04).toFixed(4))`
- Line 382: `costPerImage: 0.04`
- In `tests/real/ImageGenerationService.test.ts` (lines 53-61):
  ```typescript
  describe('estimateCost', () => {
    it('calculates cost for specified image count', async () => {
      const result = await svc.estimateCost({ imageCount: 22 })
      expect(result.success).toBe(true)
      if (result.success && result.data) {
        expect(result.data.totalEstimatedCost).toBe(0.88)
      }
    })
  })
  ```

### 1.3 Test Suite and Diagnostics Results
- Command `npm.cmd test`:
  - Output: 21 test files passed, 602 tests passed.
  - Duration: 37.00s.
- Command `npm.cmd run check`:
  - Output: `svelte-check found 0 errors and 0 warnings`.

---

## 2. Logic Chain

```
[Observation: cancelGeneration only sets boolean flag cancelRequested]
  → In-flight HTTP request to /api/generate/card is not aborted.
  → If abort is triggered, catch (err) converts AbortError into API_TIMEOUT and loops to attempt+1.
  → RESULT: Cancellation fails to stop network requests immediately and triggers 3 retry cycles (6-9s delay).
  → FIX:
      1. Store active session AbortController (e.g. this.activeAbortController).
      2. In cancelGeneration, trigger this.activeAbortController?.abort().
      3. In generateSingleCardWithRetry, link request signal to session signal.
      4. In catch block, inspect if cancellation caused AbortError or cancelRequested is true:
         If canceled → immediately return { success: false, error: { code: SESSION_CANCELED, message: 'Canceled' } }, bypassing retry loop.

[Observation: saveToStorage is omitted from ImageGenerationService fetch payload and /api/generate/card body]
  → Client request with saveToStorage: false still attempts blob storage if BLOB_READ_WRITE_TOKEN is present.
  → FIX:
      1. ImageGenerationService passes saveToStorage (default true) in fetch JSON body.
      2. /api/generate/card parses saveToStorage?: boolean from body.
      3. /api/generate/card only uploads to Vercel Blob if (saveToStorage !== false && blobToken).
      4. If saveToStorage is false, return dataUrl directly.

[Observation: GROK_IMAGE_MODEL constant is 'grok-2-image-alpha']
  → API calls and fallback configurations use obsolete alpha model.
  → FIX: Update GROK_IMAGE_MODEL in contracts/ImageGeneration.ts to 'grok-imagine-image-2.0'.

[Observation: ImageGenerationService prices each image at $0.04 ($0.88 for 22 cards)]
  → Requirement specifies updated pricing of $0.02 per image ($0.44 for 22 cards).
  → FIX:
      1. Update pricing constants/literals in ImageGenerationService.ts from 0.04 to 0.02.
      2. Update test assertion in tests/real/ImageGenerationService.test.ts from 0.88 to 0.44.
```

---

## 3. Caveats

1. **Service Path Convention**:
   The requirement description refers to `src/lib/services/imageGenerationService.ts`. In this repository, services reside in `services/real/ImageGenerationService.ts` and `services/mock/ImageGenerationMock.ts`, exposed through `$services/factory` and typed via `contracts/ImageGeneration.ts`. The implementation must be applied to `services/real/ImageGenerationService.ts` (and contracts/endpoints), rather than creating redundant duplicate files under `src/lib/services/`.
2. **DOMException vs Error for `AbortError`**:
   Depending on Node/browser fetch environment, an aborted signal throws either `DOMException` (`err.name === 'AbortError'`) or standard `Error` (`err.name === 'AbortError'`). Both must be caught:
   `(err instanceof DOMException && err.name === 'AbortError') || (err instanceof Error && err.name === 'AbortError')`.
3. **Distinguishing Timeout from Cancellation**:
   A card request can abort due to per-card timeout (`CARD_TIMEOUT_MS` = 55s) OR explicit user cancellation (`cancelGeneration()`).
   - If timeout occurred and `!this.cancelRequested`: treat as `API_TIMEOUT` and allow retry.
   - If cancelled (`this.cancelRequested` or session signal aborted): immediately exit without retrying.
4. **Environment Variables**:
   `.env` has `GROK_IMAGE_MODEL=grok-imagine-image`. When `model` is passed explicitly or defaulted via `GROK_IMAGE_MODEL`, verify that `process.env['GROK_IMAGE_MODEL']` in `/api/generate/card/+server.ts` does not override contract expectations if set to an unexpected string.
5. **Contract Test vs Real Service Test Alignment**:
   `tests/contracts/ImageGeneration.test.ts` tests `ImageGenerationMockService`, which currently passes with 68 tests. `tests/real/ImageGenerationService.test.ts` tests `ImageGenerationService`. Ensure both mock and real services remain fully aligned with contract interfaces.

---

## 4. Conclusion & Action Plan

### Changes Required

| Target File | Lines / Area | Description of Change |
|---|---|---|
| `contracts/ImageGeneration.ts` | Line 33, comments | Update `GROK_IMAGE_MODEL = 'grok-imagine-image-2.0' as const`. Update JSDocs. |
| `services/real/ImageGenerationService.ts` | Fields, `generateImages`, `generateSingleCardWithRetry`, `cancelGeneration`, `estimateCost` | 1. Add `activeAbortController: AbortController \| null = null`.<br>2. On `cancelGeneration`, set `cancelRequested = true` and call `activeAbortController?.abort()`.<br>3. In `generateSingleCardWithRetry`, link signal and pass `saveToStorage`.<br>4. In `catch (err)`, detect `AbortError` with cancellation to immediately return `SESSION_CANCELED` and avoid retry loop.<br>5. Update pricing from `0.04` to `0.02` ($0.02/image, 22 * 0.02 = $0.44). |
| `src/routes/api/generate/card/+server.ts` | Body parsing, Blob storage | 1. Add `saveToStorage?: boolean` to body schema.<br>2. Only upload to Vercel Blob if `body.saveToStorage !== false && blobToken`.<br>3. Return `imageDataUrl` / base64 dataUrl if `saveToStorage === false`. |
| `services/mock/CostCalculationMock.ts` | Line 164 | Update assumption text to `'Using grok-imagine-image-2.0 for images'`. |
| `tests/real/ImageGenerationService.test.ts` | Line 58 | Update expected total cost for 22 images from `0.88` to `0.44`. |

---

## 5. Verification Method

1. **Unit & Contract Tests**:
   Run the full vitest test suite:
   ```powershell
   npm.cmd test
   ```
   Specific test target:
   ```powershell
   npx.cmd vitest run tests/real/ImageGenerationService.test.ts
   npx.cmd vitest run tests/contracts/ImageGeneration.test.ts
   ```
   Expect all 602+ tests to pass with 0 failures.

2. **TypeScript & Svelte Diagnostics**:
   Run svelte-check:
   ```powershell
   npm.cmd run check
   ```
   Expect 0 errors and 0 warnings.

3. **Manual Code Verification Checklist**:
   - [ ] `GROK_IMAGE_MODEL` is `'grok-imagine-image-2.0'`.
   - [ ] `ImageGenerationService.estimateCost({ imageCount: 22 })` returns `costPerImage: 0.02` and `totalEstimatedCost: 0.44`.
   - [ ] Calling `cancelGeneration()` aborts active in-flight fetch and resolves without retrying.
   - [ ] `saveToStorage: false` passes to `/api/generate/card` and skips blob upload, returning base64 data URL.
