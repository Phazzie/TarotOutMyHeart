# Survey Explorer 1 Report: Requirements R1 & R2 Investigation

**Investigator**: `survey_explorer_1`  
**Date**: 2026-08-17  
**Scope**: 
1. **R1**: Image generation lifecycle, async leaks, unmount cancellation in `src/routes/generate/+page.svelte`
2. **R2**: Svelte 5 Map mutation reactivity bug in `src/lib/components/PromptListComponent.svelte`
3. **Test Suite**: Existing test coverage and required test additions/updates

---

## 1. Observation

### 1.1 Requirement R1: `src/routes/generate/+page.svelte`
- **File**: `src/routes/generate/+page.svelte`
- **Imports (Lines 39–46)**:
  ```svelte
  <script lang="ts">
    import PromptListComponent from '$lib/components/PromptListComponent.svelte'
    import GenerationProgressComponent from '$lib/components/GenerationProgressComponent.svelte'
    import { appStore } from '$lib/stores/appStore.svelte'
    import { goto } from '$app/navigation'
    import { imageGenerationService } from '$services/factory'
    import { isCardNumber } from '$lib/utils/types'
  ```
  `onDestroy` from `'svelte'` is **not imported** and **not used anywhere** in the file.
- **Generation Start (Lines 85–131)**:
  ```svelte
  async function startGeneration(): Promise<void> {
    if (!hasPrompts) {
      appStore.setError('Need all 22 prompts before generating images')
      return
    }

    appStore.setLoading('generatingImages', true)

    try {
      const response = await generationService.generateImages({
        prompts: appStore.generatedPrompts,
        saveToStorage: true,
        onProgress: progress => {
          appStore.updateGenerationProgress(progress)
        },
      })

      if (response.success && response.data) {
        appStore.setGeneratedCards(response.data.generatedCards)

        const failedCount = response.data.generatedCards.filter(
          card => card.generationStatus === 'failed'
        ).length

        if (failedCount === 0) {
          setTimeout(() => {
            goto('/gallery')
          }, 2000)
        }
      } else {
        appStore.setError(
          response.error?.message || 'Failed to generate images',
          response.error?.code || 'GENERATION_ERROR'
        )
      }
    } catch (error) {
      appStore.setError(
        error instanceof Error ? error.message : 'Unexpected error during generation'
      )
    } finally {
      appStore.setLoading('generatingImages', false)
    }
  }
  ```
- **Cancellation Handler (Lines 139–144)**:
  ```svelte
  function handleCancel(): void {
    // In a real implementation, we'd call generationService.cancelGeneration()
    // For now, just stop the loading state
    appStore.setLoading('generatingImages', false)
    appStore.setError('Generation canceled by user')
  }
  ```
  `handleCancel()` does **not** invoke `generationService.cancelGeneration()`.
- **Cancellation Service (`services/real/ImageGenerationService.ts` Lines 329–343)**:
  ```ts
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

---

### 1.2 Requirement R2: `src/lib/components/PromptListComponent.svelte`
- **File**: `src/lib/components/PromptListComponent.svelte`
- **Collection Declarations (Lines 74–100)**:
  ```svelte
  let expandedCards = $state<Set<number>>(new Set())
  let editingCards = $state<Set<number>>(new Set())
  const editedPromptTexts = $state<Map<number, string>>(new Map())
  const userEditedCards = $state<Set<number>>(new Set())
  let regeneratingCard = $state<number | null>(null)
  const initialPromptsMap = $state<Map<number, string>>(new Map())
  ```
- **Edit Input Handler (Lines 413–415 & 574–581)**:
  ```svelte
  function updateEditText(cardNumber: number, text: string): void {
    editedPromptTexts.set(cardNumber, text)
  }
  ```
  ```svelte
  <textarea
    id="edit-{prompt.cardNumber}"
    class="prompt-textarea"
    value={editedPromptTexts.get(prompt.cardNumber) || ''}
    oninput={e => updateEditText(prompt.cardNumber, e.currentTarget.value)}
    rows="8"
    aria-label="Edit prompt text"
  ></textarea>
  ```
- **Active Prompt Derived Expression (Lines 493–495)**:
  ```svelte
  {@const activePromptText = isEditing
    ? editedPromptTexts.get(prompt.cardNumber) || prompt.generatedPrompt
    : prompt.generatedPrompt}
  ```
- **Other In-Place Mutations without Reassignment**:
  - `startEditing` (Line 373): `editedPromptTexts.set(cardNumber, prompt.generatedPrompt)`
  - `cancelEditing` (Line 381): `editedPromptTexts.delete(cardNumber)`
  - `saveEdit` (Line 403): `editedPromptTexts.delete(cardNumber)`
  - `enhancePrompt` (Line 277): `editedPromptTexts.set(cardNumber, enhancedText)`
  - `resetToDefault` (Line 337): `editedPromptTexts.delete(cardNumber)`
  - `regeneratePrompt` (Line 235): `editedPromptTexts.delete(cardNumber)`
  - `generateAllPrompts` (Line 180): `editedPromptTexts.clear()`
  - `userEditedCards` (Line 286, 335, 401): `userEditedCards.add(cardNumber)` / `delete(cardNumber)` (declared as `const`)

---

### 1.3 Baseline Test Suite Execution
- **Command**: `npm.cmd run check`  
  - Result: `svelte-check found 0 errors and 0 warnings` (Exit code: 0)
- **Command**: `npm.cmd run test`  
  - Result: `21 passed (21 test files), 602 passed (602 tests)` (Exit code: 0)
- **Missing Coverage**:
  - `tests/real/ImageGenerationService.test.ts` only tests basic success and cost estimate; lacks tests for `cancelGeneration()` and abort handling.
  - No component tests exist for `src/routes/generate/+page.svelte` or `src/lib/components/PromptListComponent.svelte`.

---

## 2. Logic Chain

### 2.1 R1 Logic Chain: Asynchronous Zombie Requests on Unmount
1. When the user initiates deck generation on `/generate`, `startGeneration()` starts a long-running async loop in `imageGenerationService.generateImages()` across all 22 cards.
2. Each card involves a sequential network request (up to 55s timeout with retries).
3. If the user navigates away (e.g. to `/`, `/upload`, `/style`, `/gallery`) before generation finishes, the component is unmounted from the DOM.
4. Because there is no `onDestroy` hook in `+page.svelte`:
   - `generationService` continues executing the remaining card generation requests in the background ("zombie requests").
   - Progress callbacks continue mutating `appStore.generationProgress`.
   - Once all cards complete, `setTimeout(() => goto('/gallery'), 2000)` fires in the background, unexpectedly navigating the user away from whatever page they are currently on.
5. In addition, when the user explicitly clicks "Cancel Generation", `handleCancel()` only clears local loading state but never tells `generationService` to stop.
6. **Remediation**:
   - Import `onDestroy` from `'svelte'`.
   - Register `onDestroy` to call `generationService.cancelGeneration({ sessionId: 'active' })` and clear any pending `goto` timers if `appStore.isGenerating`.
   - Update `handleCancel()` to call `await generationService.cancelGeneration({ sessionId: 'active' })`.

### 2.2 R2 Logic Chain: Svelte 5 Collection Reactivity Bug
1. Svelte 5 introduces fine-grained reactivity using runes (`$state`, `$derived`, `$effect`).
2. When a JavaScript `Map` or `Set` is stored in `$state`, mutating it via instance methods (`.set()`, `.delete()`, `.clear()`, `.add()`) does NOT trigger reactivity unless the reference is reassigned (or wrapped in `SvelteMap`/`SvelteSet`).
3. `editedPromptTexts` was declared with `const`:
   `const editedPromptTexts = $state<Map<number, string>>(new Map())`
   which prevents reassignments.
4. During typing, `oninput` calls `updateEditText(cardNumber, text)`, which only calls `editedPromptTexts.set(cardNumber, text)`.
5. Because no reassignment occurs (`editedPromptTexts = new Map(editedPromptTexts)`), Svelte 5 does not invalidate derived dependencies (like `activePromptText` or copy/enhance button values).
6. Similarly, `userEditedCards` and `initialPromptsMap` are declared with `const` and mutated in-place, preventing status badges (`getCardStatus`) and default reset values from updating reactively.
7. **Remediation**:
   - Change `const editedPromptTexts = $state<Map<number, string>>(new Map())` to `let editedPromptTexts = $state<Map<number, string>>(new Map())`.
   - In `updateEditText`, `startEditing`, `cancelEditing`, `saveEdit`, `enhancePrompt`, `resetToDefault`, `regeneratePrompt`, and `generateAllPrompts`, reassign `editedPromptTexts = new Map(editedPromptTexts)` (or `new Map()`).
   - Change `userEditedCards` to `let userEditedCards = $state<Set<number>>(new Set())` and reassign on add/delete (`userEditedCards = new Set(userEditedCards)`).
   - Change `initialPromptsMap` to `let initialPromptsMap = $state<Map<number, string>>(new Map())` and reassign when updated.

---

## 3. Caveats

1. **R3 Interdependency**: `cancelGeneration` in `ImageGenerationService` is being refactored in R3 to support `AbortController` and `AbortError` catch logic. The R1 `onDestroy` hook will rely on this method to cleanly abort active fetch requests immediately.
2. **Pricing Updates in R3**: In `tests/real/ImageGenerationService.test.ts` (Line 58), `estimateCost` currently asserts `0.88` ($0.04 * 22). When R3 switches to `grok-imagine-image-2.0` at $0.02, this test must be updated to expect `0.44`.
3. **Svelte Component Testing**: The current test suite focuses on contracts, mocks, and real service units. Vitest is configured with `jsdom`, enabling unit testing for services and stores.

---

## 4. Conclusion & Concrete Proposal

### 4.1 Proposed Code Changes for R1 (`src/routes/generate/+page.svelte`)

```svelte
<!-- In script tag: -->
<script lang="ts">
  import { onDestroy } from 'svelte'
  import PromptListComponent from '$lib/components/PromptListComponent.svelte'
  import GenerationProgressComponent from '$lib/components/GenerationProgressComponent.svelte'
  import { appStore } from '$lib/stores/appStore.svelte'
  import { goto } from '$app/navigation'
  import { imageGenerationService } from '$services/factory'
  import { isCardNumber } from '$lib/utils/types'

  const generationService = imageGenerationService
  let navigationTimeout: ReturnType<typeof setTimeout> | null = null

  onDestroy(() => {
    if (navigationTimeout) {
      clearTimeout(navigationTimeout)
      navigationTimeout = null
    }
    if (appStore.isGenerating) {
      generationService.cancelGeneration({ sessionId: 'active' })
      appStore.setLoading('generatingImages', false)
    }
  })

  async function startGeneration(): Promise<void> {
    if (!hasPrompts) {
      appStore.setError('Need all 22 prompts before generating images')
      return
    }

    appStore.setLoading('generatingImages', true)

    try {
      const response = await generationService.generateImages({
        prompts: appStore.generatedPrompts,
        saveToStorage: true,
        onProgress: progress => {
          appStore.updateGenerationProgress(progress)
        },
      })

      if (response.success && response.data) {
        appStore.setGeneratedCards(response.data.generatedCards)

        const failedCount = response.data.generatedCards.filter(
          card => card.generationStatus === 'failed'
        ).length

        if (failedCount === 0 && response.data.fullySuccessful) {
          navigationTimeout = setTimeout(() => {
            goto('/gallery')
          }, 2000)
        }
      } else {
        appStore.setError(
          response.error?.message || 'Failed to generate images',
          response.error?.code || 'GENERATION_ERROR'
        )
      }
    } catch (error) {
      appStore.setError(
        error instanceof Error ? error.message : 'Unexpected error during generation'
      )
    } finally {
      appStore.setLoading('generatingImages', false)
    }
  }

  async function handleCancel(): Promise<void> {
    await generationService.cancelGeneration({ sessionId: 'active' })
    appStore.setLoading('generatingImages', false)
    appStore.setError('Generation canceled by user')
  }
```

---

### 4.2 Proposed Code Changes for R2 (`src/lib/components/PromptListComponent.svelte`)

```svelte
<!-- Declarations -->
  let expandedCards = $state<Set<number>>(new Set())
  let editingCards = $state<Set<number>>(new Set())
  let editedPromptTexts = $state<Map<number, string>>(new Map())
  let userEditedCards = $state<Set<number>>(new Set())
  let regeneratingCard = $state<number | null>(null)
  let initialPromptsMap = $state<Map<number, string>>(new Map())

<!-- Effect -->
  $effect(() => {
    let updated = false
    for (const prompt of prompts) {
      if (!initialPromptsMap.has(prompt.cardNumber)) {
        initialPromptsMap.set(prompt.cardNumber, prompt.generatedPrompt)
        updated = true
      }
    }
    if (updated) {
      initialPromptsMap = new Map(initialPromptsMap)
    }
  })

<!-- Handlers -->
  function updateEditText(cardNumber: number, text: string): void {
    editedPromptTexts.set(cardNumber, text)
    editedPromptTexts = new Map(editedPromptTexts)
  }

  function startEditing(cardNumber: number): void {
    const prompt = prompts.find(p => p.cardNumber === cardNumber)
    if (prompt) {
      editedPromptTexts.set(cardNumber, prompt.generatedPrompt)
      editedPromptTexts = new Map(editedPromptTexts)
      editingCards.add(cardNumber)
      editingCards = new Set(editingCards)
    }
  }

  function cancelEditing(cardNumber: number): void {
    editingCards.delete(cardNumber)
    editedPromptTexts.delete(cardNumber)
    editingCards = new Set(editingCards)
    editedPromptTexts = new Map(editedPromptTexts)
  }

  async function saveEdit(cardNumber: number): Promise<void> {
    const editedText = editedPromptTexts.get(cardNumber)
    const prompt = prompts.find(p => p.cardNumber === cardNumber)

    if (!editedText || !prompt) return

    appStore.clearError()

    try {
      const response = await promptService.editPrompt({
        promptId: prompt.id,
        editedPrompt: editedText,
      })

      if (response.success && response.data) {
        appStore.updatePrompt(cardNumber, response.data.cardPrompt)
        userEditedCards.add(cardNumber)
        userEditedCards = new Set(userEditedCards)
        editingCards.delete(cardNumber)
        editedPromptTexts.delete(cardNumber)
        editingCards = new Set(editingCards)
        editedPromptTexts = new Map(editedPromptTexts)
      } else {
        appStore.setError(response.error?.message || 'Failed to save edit', response.error?.code)
      }
    } catch (error) {
      appStore.setError(error instanceof Error ? error.message : 'Unexpected error saving edit')
    }
  }

  async function enhancePrompt(cardNumber: CardNumber): Promise<void> {
    const prompt = prompts.find(p => p.cardNumber === cardNumber)
    if (!prompt) return

    const enhancementSuffix =
      ', hyper-detailed tarot card artwork, metallic gold leaf linework, sacred geometry, dramatic celestial lighting, 8k resolution'
    const currentText = editingCards.has(cardNumber)
      ? editedPromptTexts.get(cardNumber) || prompt.generatedPrompt
      : prompt.generatedPrompt

    if (currentText.includes('metallic gold leaf linework')) {
      return
    }

    const enhancedText = `${currentText}${enhancementSuffix}`

    if (editingCards.has(cardNumber)) {
      editedPromptTexts.set(cardNumber, enhancedText)
      editedPromptTexts = new Map(editedPromptTexts)
    } else {
      try {
        const response = await promptService.editPrompt({
          promptId: prompt.id,
          editedPrompt: enhancedText,
        })
        if (response.success && response.data) {
          appStore.updatePrompt(cardNumber, response.data.cardPrompt)
          userEditedCards.add(cardNumber)
          userEditedCards = new Set(userEditedCards)
        } else {
          appStore.setError(
            response.error?.message || 'Failed to enhance prompt',
            response.error?.code
          )
        }
      } catch (error) {
        appStore.setError(
          error instanceof Error ? error.message : 'Unexpected error enhancing prompt'
        )
      }
    }
  }
```

---

### 4.3 Proposed Test Changes
1. **`tests/real/ImageGenerationService.test.ts`**:
   - Add test case verifying that `cancelGeneration()` stops generation of subsequent cards when called during active batch processing.
   - Add test case verifying that an aborted request throws an `AbortError` which is caught without retrying.
2. **Post-R3 Cost Update**:
   - Update `tests/real/ImageGenerationService.test.ts` line 58 expectation from `0.88` to `0.44`.

---

## 5. Verification Method

1. **Static Type & Syntax Verification**:
   ```powershell
   npm.cmd run check
   ```
   Must produce `0 errors and 0 warnings`.

2. **Automated Test Execution**:
   ```powershell
   npm.cmd run test
   ```
   Must execute and pass all contract, integration, mock, and real service tests.

3. **Code Review & Layout Verification**:
   - Inspect `src/routes/generate/+page.svelte` to ensure `onDestroy` cleanly handles active generation cancellation.
   - Inspect `src/lib/components/PromptListComponent.svelte` to ensure all Map/Set mutations reassign collections for Svelte 5 reactivity.
