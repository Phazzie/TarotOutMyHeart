# Original User Request

## 2026-08-17T15:12:53Z

Implement 9 detailed tickets to harden the TarotOutMyHeart application by fixing 11 review comments, resolving asynchronous memory leaks, updating Svelte 5 reactivity logic, and switching the Grok image generation model to the cheaper `grok-imagine-image-2.0` endpoint.

Working directory: `C:\Users\shiva\.gemini\antigravity\scratch\tarotoutmyheart`
Integrity mode: development

## Requirements

### R1. Resolve Generation Async Leaks
Update `src/routes/generate/+page.svelte` with an `onDestroy` hook that explicitly cancels the active `imageGenerationService` session to prevent zombie API requests.

### R2. Svelte 5 Reactivity Bug Fix
Fix the `PromptListComponent.svelte` Map mutation reactivity bug by ensuring `editedPromptTexts` reassignments trigger Svelte 5 reactive updates correctly during edits.

### R3. Harden Image Generation Service
Refactor `cancelGeneration` to use an `AbortController` and catch `AbortError` to prevent retry loops. Ensure `saveToStorage` is passed to the API. Switch the base model to `grok-imagine-image-2.0` and update pricing to $0.02.

### R4. Component & Service Hardening
- Route prompt regeneration through the AI proxy.
- Fix image duplicate detection using `file.size` and `lastModified`.
- Ensure download logic includes metadata JSON when requested and respects `'individual'` format constraints.
- Fix UI formatting branching for cost display.
- Catch `localStorage` exceptions in `StyleInputService`.

## Acceptance Criteria

### Verification
- [ ] All requirements are successfully implemented in their respective files.
- [ ] `npm run check` compiles with 0 errors.
- [ ] `npm run test` executes successfully and all 600+ contract and mock tests pass (including updated cost tests).
