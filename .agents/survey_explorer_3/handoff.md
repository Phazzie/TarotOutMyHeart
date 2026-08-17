# Survey Explorer 3: Requirement R4 & Repo Health Survey Report

## 1. Observation

### 1.1 Repo Health & Build / Test Baseline
- **Execution Command**: `npm.cmd run check`
  - Output: `svelte-check found 0 errors and 0 warnings` (Exit code: 0)
- **Execution Command**: `npm.cmd run test`
  - Output: `Test Files: 21 passed (21)`, `Tests: 602 passed (602)` (Duration: ~32.6s, Exit code: 0)
- **Environment Note**: On Windows PowerShell, running `npm run ...` directly may fail with `PSSecurityException` due to script execution policies on `npm.ps1`. Invoking via `npm.cmd run <script>` executes seamlessly.

---

### 1.2 Item 1: Prompt Regeneration Through AI Proxy
- **File**: `services/real/PromptGenerationService.ts` (lines 424–484)
  - Current implementation of `regeneratePrompt`:
    ```typescript
    // lines 454-455:
    const newPromptText = `A ${styleInputs.tone.toLowerCase()} ${styleInputs.theme.toLowerCase()} tarot card illustration of "${cardName}". ${styleInputs.description} ${feedback ? `Adjustments: ${feedback}.` : ''} Symbolic elements for ${meaning.toLowerCase()} prominently featured. Highly detailed.`

    const newCardPrompt: CardPrompt = {
      id: createPromptId(crypto.randomUUID()),
      cardNumber,
      cardName,
      traditionalMeaning: meaning,
      generatedPrompt: newPromptText,
      confidence: 0.9,
      generatedAt: new Date(),
    }
    ```
  - Observation: `regeneratePrompt` performs purely local string interpolation. It does NOT call `/api/prompts` or any server AI proxy.
  - Server Route: `src/routes/api/prompts/+server.ts` (lines 19–186) currently handles batch generation of 22 prompts via xAI Grok vision API (`POST /api/prompts`).
  - Caller Component: `src/lib/components/PromptListComponent.svelte` (lines 209–251) calls `promptService.regeneratePrompt({ cardNumber, referenceImageUrls, styleInputs, previousPrompt, feedback })`.

---

### 1.3 Item 2: Image Duplicate Detection via `file.size` and `lastModified`
- **File**: `services/real/ImageUploadService.ts` (lines 220–230)
  ```typescript
  for (const file of files) {
    const isDuplicate = Array.from(this.uploadedImages.values()).some(
      img => img.fileName === file.name
    )
    if (isDuplicate) {
      failedList.push({
        code: ImageUploadErrorCode.DUPLICATE_IMAGE,
        message: `Duplicate image detected: ${file.name}`,
        fileName: file.name,
      })
      continue
    }
  ```
- **File**: `services/mock/ImageUploadMock.ts` (lines 125–135)
  ```typescript
  const isDuplicate = Array.from(this.uploadedImages.values()).some(
    img => img.fileName === file.name
  )
  ```
- **Observation**: Both real and mock services check duplicate status strictly by `img.fileName === file.name`. If a user uploads two distinct files that share the same filename (or an updated version), it is falsely flagged as a duplicate; conversely, a duplicate file with a renamed filename is not caught. Combining `file.name`, `file.size`, and `file.lastModified` (or stored `file.size` and `file.lastModified`) ensures robust identification.

---

### 1.4 Item 3: Download Logic Metadata JSON & `'individual'` Format Constraints
- **File**: `contracts/Download.ts` (lines 31, 122–129)
  ```typescript
  export const DOWNLOAD_FORMATS = ['zip', 'individual'] as const
  export interface DownloadDeckInput {
    generatedCards: GeneratedCard[]
    styleInputs: StyleInputs
    deckName?: string
    format?: DownloadFormat
    includeMetadata?: boolean
    onProgress?: (progress: DownloadProgress) => void
  }
  ```
- **File**: `services/real/DownloadService.ts` (lines 26–164)
  - `downloadDeck` does not validate `input.format` or handle `'individual'` format constraints (it unconditionally creates a ZIP). If an invalid format is passed, it fails to reject with `DownloadErrorCode.INVALID_FORMAT`.
  - Metadata inclusion logic (lines 108–117):
    ```typescript
    if (includeMetadata && styleInputs) {
      const metadata: DeckMetadata = {
        generatedAt: new Date(),
        deckName,
        styleInputs,
        cardCount: completedCards.length,
        version: '1.0.0',
      }
      zip.file('deck-metadata.json', JSON.stringify(metadata, null, 2))
    }
    ```
- **File**: `services/mock/DownloadMock.ts` (lines 56–65)
  ```typescript
  if (input.format && !['zip', 'json', 'pdf'].includes(input.format)) {
    return {
      success: false,
      error: {
        code: DownloadErrorCode.INVALID_FORMAT,
        message: 'Invalid download format',
        retryable: false,
      },
    }
  }
  ```
  - Observation: `DownloadMock.ts` checks against `['zip', 'json', 'pdf']` which does NOT match the contract definition `['zip', 'individual']`.

---

### 1.5 Item 4: UI Formatting Branching for Cost Display
- **File**: `services/real/CostCalculationService.ts` (lines 156–171)
  ```typescript
  async formatCost(input: FormatCostInput): Promise<ServiceResponse<FormatCostOutput>> {
    const { cost, includeWarning = true } = input

    const formatted = formatCurrency(cost)
    const warningLevel = getWarningLevel(cost)
    const warningMessage = includeWarning ? getWarningMessage(warningLevel, cost) : undefined

    return {
      success: true,
      data: {
        formatted,
        warningLevel,
        warningMessage: warningMessage || undefined,
      },
    }
  }
  ```
  - Observation: `formatCost` ignores `input.format` ('detailed', 'summary', 'minimal').
- **File**: `src/lib/components/CostDisplayComponent.svelte`
  - Line 415: `({actualCostData.imageCost.imagesGenerated} images @ $0.10 each)` (hardcoded pricing)
  - Line 529: `<li><strong>Image Generation:</strong> $0.10 per image</li>` (hardcoded pricing)
  - Observation: In Requirement R3/R4, pricing is transitioning to `$0.02` for `grok-imagine-image-2.0`. Hardcoded `$0.10` UI text in `CostDisplayComponent.svelte` should be updated or made dynamic.

---

### 1.6 Item 5: Catch `localStorage` Exceptions in `StyleInputService`
- **File**: `services/real/StyleInputService.ts` (lines 37–39, 183–189, 202–252, 273–282)
  ```typescript
  private isSSR(): boolean {
    return typeof localStorage === 'undefined'
  }
  ```
  - In private browsing mode, sandboxed iframes, or restricted security contexts, evaluating or interacting with `localStorage` (or `window.localStorage`) throws `DOMException` / `SecurityError` rather than returning `undefined`.
  - In `saveStyleInputs`, `loadStyleInputs`, and `clearDraft`, unhandled property access or quota errors can leak if not safely guarded by a helper function.

---

## 2. Logic Chain

1. **AI Proxy Prompt Regeneration**:
   - `PromptListComponent.svelte` allows users to regenerate individual card prompts with user feedback.
   - `PromptGenerationService.regeneratePrompt` currently bypasses the AI proxy by constructing a template literal string locally.
   - Routing this through `/api/prompts` (or a dedicated single-card prompt generation request to the AI proxy) allows real vision AI refinement while keeping the API key secure on the server side.

2. **Duplicate Image Detection**:
   - Uploading different files that happen to share a common filename (e.g., `image.png`) currently fails with `DUPLICATE_IMAGE`.
   - Conversely, re-uploading an exact duplicate under a new name is not detected if only checking names.
   - Comparing `file.name`, `file.size`, and `file.lastModified` (available on browser `File` objects) provides exact identification of true duplicate files without false positives on distinct files with common names.

3. **Download Logic & Format Constraints**:
   - `contracts/Download.ts` defines `DOWNLOAD_FORMATS = ['zip', 'individual']`.
   - `DownloadService.ts` and `DownloadMock.ts` must validate that requested format conforms to `['zip', 'individual']` and return `DownloadErrorCode.INVALID_FORMAT` for disallowed formats.
   - For `downloadDeck`, when `includeMetadata: true` (default), `deck-metadata.json` must be reliably injected into the zip archive and reported in `includedMetadata`.

4. **Cost Display Formatting**:
   - `CostCalculationService.formatCost` must support all three `CostFormat` values (`'detailed'`, `'summary'`, `'minimal'`).
   - `CostDisplayComponent.svelte` must reflect the new `$0.02` per image pricing for `grok-imagine-image-2.0` instead of stale `$0.10` hardcoded references.

5. **StyleInputService LocalStorage Resilience**:
   - Wrapping `localStorage` lookup in a safe accessor `getLocalStorage(): Storage | null` with `try/catch` guarantees that `isSSR()` and storage methods never throw uncaught `SecurityError` or `DOMException` in restricted browser environments.

---

## 3. Caveats

1. **Proxy Endpoint Architecture**: In `src/routes/api/prompts/+server.ts`, the current POST handler generates all 22 cards by default. If `regeneratePrompt` sends a request for a single card (or if `/api/prompts` is extended to accept a `cardNumber` / `singleCard: true` payload), `/api/prompts` should handle single card prompt generation cleanly.
2. **Pricing Synchronization**: Pricing changes from `$0.10` to `$0.02` affect `contracts/CostCalculation.ts` (`GROK_PRICING.imageGeneration`), `contracts/ImageGeneration.ts`, `CostDisplayComponent.svelte`, and associated contract/mock tests.

---

## 4. Conclusion

- **Baseline Repo Health**: Fully functional and healthy (0 TypeScript/Svelte check errors, 602/602 tests passing).
- **R4 Implementation Targets**:
  1. `services/real/PromptGenerationService.ts`: Refactor `regeneratePrompt` to send an API request to the server proxy `/api/prompts`.
  2. `services/real/ImageUploadService.ts` & `services/mock/ImageUploadMock.ts`: Update duplicate check to use `file.size` and `file.lastModified` in conjunction with `file.name`.
  3. `services/real/DownloadService.ts` & `services/mock/DownloadMock.ts`: Validate `format` against `['zip', 'individual']`, ensure `deck-metadata.json` is packaged when requested, and return `DownloadErrorCode.INVALID_FORMAT` for invalid formats.
  4. `services/real/CostCalculationService.ts` & `src/lib/components/CostDisplayComponent.svelte`: Implement `formatCost` format branching (`detailed`, `summary`, `minimal`) and update pricing labels to reflect `$0.02`.
  5. `services/real/StyleInputService.ts`: Implement safe `localStorage` helper with `try/catch` error suppression.

---

## 5. Verification Method

- **Build Check**:
  ```powershell
  npm.cmd run check
  ```
  Expected: 0 errors and 0 warnings.
- **Unit & Contract Test Suite**:
  ```powershell
  npm.cmd run test
  ```
  Expected: All test suites pass (all 600+ tests).
- **Specific Test Targets for R4**:
  - `tests/contracts/PromptGeneration.test.ts` & `tests/real/PromptGenerationService.test.ts`
  - `tests/contracts/ImageUpload.test.ts` & `tests/real/ImageUploadService.test.ts`
  - `tests/contracts/Download.test.ts` & `tests/real/DownloadService.test.ts`
  - `tests/contracts/CostCalculation.test.ts` & `tests/real/CostCalculationService.test.ts`
  - `tests/contracts/StyleInput.test.ts` & `tests/real/StyleInputService.test.ts`
