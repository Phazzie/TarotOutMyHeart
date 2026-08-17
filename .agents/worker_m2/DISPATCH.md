## 2026-08-17T15:21:15Z

You are worker_m2 for the TarotOutMyHeart hardening project.
Your working directory is: C:\Users\shiva\.gemini\antigravity\scratch\tarotoutmyheart\.agents\worker_m2
Project root: C:\Users\shiva\.gemini\antigravity\scratch\tarotoutmyheart

Please read:
- C:\Users\shiva\.gemini\antigravity\scratch\tarotoutmyheart\.agents\ORIGINAL_REQUEST.md
- C:\Users\shiva\.gemini\antigravity\scratch\tarotoutmyheart\PROJECT.md
- C:\Users\shiva\.gemini\antigravity\scratch\tarotoutmyheart\.agents\survey_explorer_2\handoff.md

Your exclusive write ownership for this task:
- `contracts/ImageGeneration.ts`
- `services/real/ImageGenerationService.ts`
- `src/routes/api/generate/card/+server.ts`
- `services/mock/CostCalculationMock.ts`
- `tests/real/ImageGenerationService.test.ts`

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Mission:
Implement Requirement R3:
1. Update `contracts/ImageGeneration.ts`:
   - Switch `GROK_IMAGE_MODEL` constant to `'grok-imagine-image-2.0' as const`.
   - Update related JSDoc comments.
2. Refactor `services/real/ImageGenerationService.ts`:
   - Refactor `cancelGeneration` to use an `AbortController` (e.g., store active session controller) and abort in-flight requests immediately.
   - Catch `AbortError` (`DOMException` or `Error` with `name === 'AbortError'`). When generation is cancelled or aborted by user, immediately return `{ success: false, error: { code: ImageGenerationErrorCode.SESSION_CANCELED, message: 'Canceled' } }` without entering retry loops.
   - Pass `saveToStorage` (received in `GenerateImagesInput`) into `generateSingleCardWithRetry` and include it in the POST body to `/api/generate/card`.
   - Switch model pricing from $0.04 to $0.02 per image ($0.44 for 22 cards) in cost estimations and card generation tracking.
3. Update `src/routes/api/generate/card/+server.ts`:
   - Parse `saveToStorage?: boolean` from the incoming request body.
   - Only perform Vercel Blob upload when `body.saveToStorage !== false && blobToken`. If `saveToStorage === false`, return the base64 data URL directly without attempting blob upload.
4. Update `services/mock/CostCalculationMock.ts` and `tests/real/ImageGenerationService.test.ts`:
   - In `tests/real/ImageGenerationService.test.ts`, update `estimateCost` test expectation for 22 images from `0.88` to `0.44`.
   - Add test(s) in `tests/real/ImageGenerationService.test.ts` verifying that `cancelGeneration()` aborts active generation cleanly.
5. Verification:
   - Run `npm.cmd run check` to verify 0 errors, 0 warnings.
   - Run `npm.cmd run test` to verify all tests pass.
6. Write your comprehensive report to `C:\Users\shiva\.gemini\antigravity\scratch\tarotoutmyheart\.agents\worker_m2\handoff.md` and send a message back to parent (conversation ID: 8a8c29e0-e4de-401f-8142-9540c11be054).
