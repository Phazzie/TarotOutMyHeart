# Data Boundaries Analysis - TarotOutMyHeart

**Created**: 2025-11-07  
**Purpose**: Identify ALL data boundaries before defining contracts (SDD IDENTIFY phase)  
**Status**: 🔍 Analysis Phase

---

## What is a Data Boundary?

A **data boundary** is any point where data crosses from one system/component/layer to another. In SDD, we identify ALL boundaries BEFORE writing any code to ensure complete contract coverage.

---

## User Flow → Data Boundaries Mapping

### Flow Step 1: User Uploads Reference Images

**Boundary 1: Browser → Application**
- **From**: User's file system (via browser file input)
- **To**: Application's image upload handler
- **Data crossing**: File objects (1-5 images)
- **Direction**: Inbound (user → app)
- **Validation needed**: File type, file size, file count
- **State change**: No images → Images uploaded

**Questions to answer**:
- What file formats are accepted? (JPG, PNG per PRD)
- What's the max size per file? (10MB per PRD)
- What happens if user tries to upload 6 images? (Block/Error)
- Where are images stored? (Client-side for now, URLs needed)
- Are images validated immediately or on form submit?

---

### Flow Step 2: User Defines Style Parameters

**Boundary 2: Form Input → Application State**
- **From**: HTML form fields
- **To**: Application's style validation/storage
- **Data crossing**: 
  - Theme (string)
  - Tone (string)
  - Description (string, max 500 chars)
  - Concept (string)
  - Characters (string, optional)
- **Direction**: Inbound (user → app)
- **Validation needed**: Required fields, character limits
- **State change**: Empty form → Validated style inputs

**Questions to answer**:
- Are theme/tone free text or dropdown selections?
- Is description required or optional?
- What happens if description exceeds 500 characters?
- Is there default values for any fields?
- Are style inputs saved locally (localStorage)?

---

### Flow Step 3: Generate Card Prompts (AI Processing)

**Boundary 3: Application → Grok Text API**
- **From**: Application (with uploaded images + style inputs)
- **To**: Grok text API (grok-4-fast-reasoning)
- **Data crossing outbound**:
  - Reference image URLs or base64
  - Style parameters (theme, tone, description, concept, characters)
  - Request for 22 prompts (Major Arcana cards)
- **Data crossing inbound**:
  - 22 card prompts (one per Major Arcana card)
  - Metadata (card names, numbers, traditional meanings)
  - Token usage (for cost calculation)
  - Request ID (for tracking)
- **Direction**: Bidirectional (request → response)
- **Error cases**: API failure, rate limit, timeout, invalid response
- **State change**: Inputs ready → Prompts generated

**Questions to answer**:
- How are reference images sent to Grok? (URLs vs base64?)
- What format does Grok expect for the request?
- What format does Grok return for prompts?
- How long does this take? (Need progress indicator?)
- Can user edit prompts before image generation?
- What if Grok returns <22 or >22 prompts?
- How do we handle partial failures?

---

### Flow Step 4: User Reviews/Edits Prompts

**Boundary 4: Prompt Display → User Editing**
- **From**: Generated prompts (from Grok)
- **To**: Editable prompt preview component
- **Data crossing**: 22 CardPrompt objects
- **Direction**: Bidirectional (display → edit → save)
- **Validation needed**: Ensure edited prompts aren't empty
- **State change**: Generated prompts → User-reviewed/edited prompts

**Questions to answer**:
- Can user edit all fields or just the prompt text?
- Are edits saved immediately or on "confirm"?
- Can user reset to original AI-generated prompt?
- Is there a character limit on edited prompts?

---

### Flow Step 5: Generate Card Images (AI Processing)

**Boundary 5: Application → Grok Image API**
- **From**: Application (with finalized prompts)
- **To**: Grok image API (grok-image-generator)
- **Data crossing outbound**:
  - 22 card prompts (text)
  - Image generation parameters (size, format, quality?)
  - Batch or individual requests?
- **Data crossing inbound**:
  - 22 generated images (as URLs or base64)
  - Metadata (generation time, seed, parameters used)
  - Token/credit usage (for cost tracking)
  - Generation status (success/failed per card)
- **Direction**: Bidirectional (request → response)
- **Error cases**: API failure, rate limit, timeout, generation failure, partial batch failure
- **State change**: Prompts ready → Images generated

**Questions to answer**:
- Are all 22 images generated at once or sequentially?
- How long does each image take? (Need progress: X/22 complete)
- What if some images fail but others succeed?
- Can user cancel generation mid-process?
- What image format/size is returned?
- How are images stored? (Temporary URLs? Permanent storage?)
- Can user regenerate individual cards?

---

### Flow Step 6: Display Card Gallery

**Boundary 6: Generated Images → UI Display**
- **From**: Generated card data (images + metadata)
- **To**: Gallery component for display
- **Data crossing**: GeneratedCard[] (22 cards)
- **Direction**: Unidirectional (data → display)
- **Rendering options**: Grid view, list view, zoom/lightbox
- **State change**: Images available → Gallery displayed

**Questions to answer**:
- What metadata is displayed per card? (Name, meaning, prompt used?)
- Is gallery sortable/filterable?
- Are images lazy-loaded?
- What's the grid layout? (Responsive breakpoints?)
- Is there a "select all" for bulk actions?

---

### Flow Step 7: Calculate and Display Costs

**Boundary 7: Token Usage → Cost Display**
- **From**: API responses (token counts from Grok)
- **To**: Cost calculator → UI display
- **Data crossing**: 
  - Input tokens used (prompt generation + image generation)
  - Output tokens used (responses)
  - Cost per token (pricing from PRD)
- **Direction**: Unidirectional (usage → calculation → display)
- **Calculation**: Input tokens × $0.20/1M + Output tokens × $0.50/1M
- **State change**: API calls made → Cost calculated and displayed

**Questions to answer**:
- Is cost shown before generation (estimate) or after (actual)?
- Is cost per API call or total for entire deck?
- Is there a cost warning/confirmation before expensive operations?
- Where is cost displayed? (Widget? Banner? Modal?)

---

### Flow Step 8: Download Cards

**Boundary 8: Generated Cards → User's File System**
- **From**: Application (GeneratedCard data)
- **To**: User's downloads folder (via browser download)
- **Data crossing outbound**:
  - Individual card image (PNG)
  - OR full deck (ZIP with 22 PNGs + metadata file?)
- **Direction**: Outbound (app → user's system)
- **File formats**: PNG for images, ZIP for batch download
- **State change**: Cards in app → Cards downloaded

**Questions to answer**:
- What's the filename format? (e.g., "the-fool.png", "card-00-the-fool.png")
- Does ZIP include metadata file? (Prompts, style inputs, generation details?)
- What image quality/resolution? (Default or user-configurable?)
- Are images watermarked?
- Can user download while generation is in progress?

---

## Additional Internal Boundaries

### Boundary 9: Client State Management

**From**: Various components  
**To**: Application state store (Svelte stores? Context?)  
**Data**: 
- Uploaded images
- Style inputs
- Generated prompts
- Generated cards
- Current step in flow
- Loading states
- Error states

**Questions**:
- Do we use Svelte stores for global state?
- Is state persisted in localStorage?
- How do we handle state across page refreshes?

---

### Boundary 10: Error Handling

**From**: Any service (upload, API calls, download)  
**To**: Error display component  
**Data**: Error objects with:
- Error code (for programmatic handling)
- User-friendly message
- Retryable flag
- Technical details (for debugging)

**Questions**:
- Where are errors displayed? (Toast? Modal? Inline?)
- Are errors logged/tracked?
- Can user report errors?

---

## Seams Identified (7 Primary + 3 Secondary)

### Primary Seams (Must implement for MVP):

1. **ImageUploadSeam** - Browser files → Application storage
2. **StyleInputSeam** - Form data → Validated inputs
3. **PromptGenerationSeam** - App data → Grok API → Prompts
4. **ImageGenerationSeam** - Prompts → Grok API → Images
5. **GalleryDisplaySeam** - Generated cards → UI display
6. **CostCalculationSeam** - Token usage → Cost estimate
7. **DownloadSeam** - Generated cards → File download

### Secondary Seams (Internal, may not need separate contracts):

8. **StateManagementSeam** - Component state → Global state
9. **ErrorHandlingSeam** - Errors → User display
10. **ProgressTrackingSeam** - Async operations → Progress indicators

---

## Contract Blueprint Template

For each seam, contracts should include:

```typescript
/**
 * @purpose: [What this seam does - one sentence]
 * @requirement: [PRD reference - e.g., "PRD Seam 1: Image Upload"]
 * @boundary: [Source → Destination]
 * @updated: 2025-11-07
 */

// Input interface (data going INTO the seam)
export interface [Feature]Input {
  // All fields with types
  // Required fields first, optional fields after
  // JSDoc comments for non-obvious fields
}

// Output interface (data coming OUT of the seam)
export interface [Feature]Output {
  // All fields with types
  // Consider pagination if list can be large
  // Include metadata (timestamps, IDs, etc.)
}

// Error codes enum (all possible errors)
export enum [Feature]ErrorCode {
  ERROR_TYPE_1 = 'ERROR_TYPE_1',
  ERROR_TYPE_2 = 'ERROR_TYPE_2',
  // ... etc
}

// Service interface (the contract itself)
export interface I[Feature]Service {
  /**
   * [Description of what this method does]
   * 
   * @param input - [Description of input parameter]
   * @returns Promise<ServiceResponse<Output>> - Success or error
   * 
   * @throws Never throws - always returns ServiceResponse
   */
  [methodName](input: [Feature]Input): Promise<ServiceResponse<[Feature]Output>>
}
```

---

## Open Questions to Resolve Before Contracts

### Image Upload:
- [ ] Client-side storage or immediate upload to server/CDN?
- [ ] Generate preview URLs immediately or after validation?
- [ ] Max file size per image? (PRD says 10MB)
- [ ] Image preprocessing needed? (Resize, compress, convert format?)

### Style Input:
- [ ] Theme/tone: Free text or predefined options?
- [ ] Are there default values?
- [ ] Validation: Required vs optional fields?
- [ ] Save draft inputs to localStorage?

### Prompt Generation:
- [ ] Send reference images as URLs or base64 to Grok?
- [ ] Grok request format (need API docs)?
- [ ] Grok response format (need API docs)?
- [ ] Timeout duration (how long to wait for Grok)?
- [ ] Retry strategy (how many retries, backoff timing)?

### Image Generation:
- [ ] Batch generation (all 22 at once) or sequential?
- [ ] Progress tracking strategy?
- [ ] Cancellation support needed?
- [ ] Image storage: Temporary URLs or permanent?
- [ ] Regenerate individual cards: New seam or part of this one?

### Gallery Display:
- [ ] Lazy loading images?
- [ ] Virtual scrolling for performance?
- [ ] Image optimization (thumbnails vs full size)?

### Cost Calculation:
- [ ] Show estimate BEFORE generation or actual AFTER?
- [ ] Warn user if cost exceeds threshold?
- [ ] Cost breakdown (prompt gen vs image gen)?

### Download:
- [ ] Client-side ZIP creation library?
- [ ] Include metadata file in ZIP?
- [ ] Filename conventions?
- [ ] Image format (PNG only or options)?

---

## Next Steps

1. **Resolve open questions** - Discuss with user/stakeholders
2. **Define contracts** - Create TypeScript interfaces in `/contracts`
3. **Validate contracts** - Run `npm run check` to ensure they compile
4. **Document in SEAMSLIST.md** - Add all seams with details
5. **Build mocks** - Implement mock services matching contracts
6. **Test contracts** - Write tests to validate mocks match contracts

---

## Notes

- This analysis follows SDD Phase 2: IDENTIFY
- All boundaries identified from PRD user flow
- Contracts must be IMMUTABLE once development starts
- If questions arise during implementation, create contract v2 instead of modifying v1
- Use `ServiceResponse<T>` wrapper for all async operations (defined in contracts/types/common.ts)

