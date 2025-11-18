# Lessons Learned - TarotUpMyHeart

_This document captures insights specific to applying Seam-Driven Development (SDD) to the TarotUpMyHeart project._

## Project Context

- **Methodology**: Seam-Driven Development (SDD)
- **Framework**: SvelteKit + TypeScript
- **AI Integration**: Grok-4-fast-reasoning (X.AI)
- **Deployment**: Vercel
- **Started**: 2025-11-07
- **Status**: Scaffolding complete, implementation pending

---

## SDD Application Insights

### Lesson #1: Don't Skip the IDENTIFY Phase! 🚨

**Date**: 2025-11-07  
**Phase**: Sprint 1 Start  
**What happened**: Almost jumped straight to defining contracts without doing proper data boundary analysis first.

**What we learned**:

- The 8-step SDD process exists for a reason!
- Step 2 (IDENTIFY) is critical - can't define good contracts without identifying ALL data boundaries first
- Creating a `DATA-BOUNDARIES.md` document BEFORE writing any contracts helps ensure nothing is missed
- Also need to create a "Contract Blueprint" template to ensure consistency across all contracts

**What we did**:

1. Created `DATA-BOUNDARIES.md` to document:
   - All 10 data boundaries identified from user flow
   - Open questions to resolve before defining contracts
   - Contract blueprint template for consistency
2. Mapped user flow → data boundaries systematically
3. Identified 7 primary seams + 3 secondary seams

**Reusable pattern**:

```
Before defining contracts:
1. Read PRD completely
2. Map user flow step-by-step
3. Identify EVERY data boundary (where data crosses system/component/layer)
4. Document open questions
5. Create contract blueprint template
6. THEN start defining contracts
```

**Prevention**:

- Add "Create DATA-BOUNDARIES.md" as first item in Sprint 1 checklist
- Reference this in AI-CHECKLIST.md before contract definition
- Don't let urgency skip the IDENTIFY phase!

---

### Lesson #2: Every File Needs Top-Level Documentation! 📝

**Date**: 2025-11-07  
**Phase**: Contract Definition Preparation  
**What happened**: Started creating contract and stub files without establishing documentation standards first.

**What we learned**:

- Every file should have comprehensive top-level comments explaining:
  - **What**: What this file does
  - **Why**: Purpose and business context
  - **How**: Data flow direction and transformation
  - **Dependencies**: What it depends on and what depends on it
- Without this, contracts become "black boxes" that are hard to understand
- Documentation should be part of the blueprint template, not an afterthought
- Makes onboarding, debugging, and maintenance dramatically easier

**What we did**:

1. Created contract blueprint template with required documentation sections
2. Created stub blueprint template for mock and real implementations
3. Added file documentation standards to lessons learned
4. Will enforce this pattern for ALL files (contracts, services, components, utilities)

**Required file header format**:

```typescript
/**
 * @fileoverview [One-line description of file purpose]
 * @module [Module name if applicable]
 *
 * PURPOSE:
 * [2-3 sentences explaining why this file exists and what problem it solves]
 *
 * DATA FLOW:
 * [Describe how data enters and exits this module]
 * Input: [What comes in and from where]
 * Transform: [What this file does to the data]
 * Output: [What goes out and to where]
 *
 * DEPENDENCIES:
 * - Depends on: [List files/modules this file imports]
 * - Used by: [List files/modules that import this file]
 *
 * @see Related documentation or contracts
 * @updated YYYY-MM-DD
 */
```

**Prevention**:

- Add file documentation checklist to contract definition phase
- Include documentation templates in all blueprints
- AI agents must follow documentation template for every file created
- Pre-commit hook to warn on missing file documentation (future)

---

### Lesson #3: Mock Services MUST Be Validated Before "Complete" ⚠️

**Date**: 2025-11-08
**Phase**: Phase 3 - Build Mock Service
**What happened**: Tarot app mock services were created but marked "complete" without running type checks. When `npm run check` was finally run, discovered **122 TypeScript errors** initially, later reduced to 13 after fixes.

**What went wrong**:

1. AI agent saw mock files existed and assumed they were correct
2. Marked mocks as "completed" without validation
3. Didn't run `npm run check` to verify mocks compile
4. Didn't test that mocks return data matching contracts exactly
5. Moved to commit/push without ensuring Phase 3 was truly complete

**Root cause**:

- **AI-CHECKLIST.md Phase 3 is too permissive** - says "Build Mock Service" but doesn't enforce validation
- No hard requirement to run `npm run check` before marking complete
- Contract tests mentioned but not enforced (can skip without consequence)
- "Test Mock Data Shape" is Step 14 but easy to skip if rushing

**Why this is critical**:
The entire SDD methodology is built on the principle that **mocks must match contracts exactly**. If this fails:

- UI development will be blocked (type errors prevent compilation)
- Integration will fail (mock shape ≠ contract shape ≠ real service shape)
- The core SDD promise ("integration works first try") is violated
- You lose all the benefits of contract-first development

**Common errors found in our mocks**:

1. **Import errors**: Enums imported as `import type` but used as values
2. **Missing methods**: Mocks don't implement all interface methods
3. **Field mismatches**: Mock outputs have wrong field names vs contract
4. **Extra/missing fields**: Mocks return data not in contract or miss required fields
5. **Type assertions**: Using `as any` to bypass type checking

**What we should have done**:

```bash
# After creating EACH mock service file:
npm run check              # Must pass with 0 errors
npm run test:contracts     # Must pass (if tests exist)

# Before marking Phase 3 "complete":
npm run check              # One final verification
git grep "as any" services/mock/  # Must return nothing
```

**Solution**:

1. Update AI-CHECKLIST.md Phase 3 to be more strict:
   - Make `npm run check` a hard requirement after Step 12
   - Add explicit validation step: "Step 12.5: Validate Mock Compiles"
   - Add pre-completion checklist that MUST pass
2. Update AGENTS.md to emphasize: **Never mark mocks complete without validation**
3. Add this lesson to lessonslearned.md as a critical pattern
4. Consider pre-commit hook that fails if mocks have type errors

**Prevention checklist** (add to Phase 3):

```markdown
### Step 12.5: Validate Mock Compiles (REQUIRED)

- [ ] Run `npm run check` - **Must pass with 0 errors**
- [ ] Search for type escapes: `git grep "as any" services/mock/[Feature]Mock.ts` - **Must be empty**
- [ ] Verify all interface methods implemented
- [ ] Verify return types match contract exactly
- [ ] No extra fields in output
- [ ] No missing required fields

⚠️ **DO NOT PROCEED** if any check fails. Fix errors first.
```

**Reusable pattern**:

- **Mocks are not "done" until they compile without errors**
- Run type checking after creating EACH file, not at the end
- Type errors compound - fix them immediately
- "Looks right" ≠ "compiles correctly" - always verify

**Impact**:

- Lost time: ~30 minutes marking things "complete" that weren't
- Technical debt: 115 errors to fix before proceeding
- Broken SDD flow: Can't build UI (Phase 4) until Phase 3 is truly complete
- Trust issue: Commits claimed "mocks implemented" when they weren't working

**Key takeaway**:

> **In SDD, a mock service is NOT complete until it:**
>
> 1. Implements the interface exactly
> 2. Compiles with zero type errors
> 3. Passes contract tests (shape validation)
> 4. Returns realistic data matching contract structure
>
> **If npm run check fails, the mock is NOT done. Period.**

---

### Lesson #4: Following SDD Strictly = Success! 🎉

**Date**: 2025-11-08
**Phase**: Phase 3 complete (AI Coordination Server)
**What happened**: AI Coordination Server completed Phase 3 with **100% success** - all contracts, mocks, and tests working perfectly.

**What we did RIGHT**:

1. ✅ Defined all 5 contracts completely before any implementation
2. ✅ Ran `npm run check` after EACH mock service file created
3. ✅ Wrote comprehensive tests (143 tests total: 117 contract + 18 mock + 8 integration)
4. ✅ Validated mocks match contracts exactly before marking "complete"
5. ✅ Used TypeScript strict mode throughout - caught errors immediately
6. ✅ No `as any` type escapes anywhere in the codebase

**Results**:

- **Zero integration issues** - contracts, mocks, and tests all align perfectly
- **143 tests passing** with no failures
- **TypeScript strict mode compliance** (only 20 cosmetic unused variable warnings)
- **Ready for Phase 4** (real implementation) with high confidence
- **Documentation complete** - other developers can understand the system immediately

**Why it worked**:

- We **learned from Lesson #3** and enforced validation at every step
- We **didn't skip any SDD phases** - IDENTIFY → DEFINE → BUILD MOCKS → TEST
- We **ran type checks continuously** - caught errors immediately, not in batch
- We **wrote tests alongside mocks** - proved mocks match contracts

**Key difference from Tarot app mistakes**:
| Aspect | Tarot App (Failed) | AI Coordination (Success) |
|--------|-------------------|---------------------------|
| Type checking | Skipped until end | After each file |
| Tests | Not written | 143 tests passing |
| Validation | "Looks right" | Proven by tests |
| TypeScript errors | 122 initially | 0 errors (20 warnings only) |
| Phase 3 status | Blocked | Complete ✅ |

**Reusable pattern** - The "Green Path" for SDD Phase 3:

```bash
# For EACH mock service:
1. Create mock file (services/mock/[Feature]Mock.ts)
2. Implement interface exactly
3. npm run check                    # MUST PASS
4. Write contract test
5. Write mock behavior test
6. npm run test:contracts           # MUST PASS
7. npm run test:mocks               # MUST PASS
8. git grep "as any" [file]         # MUST BE EMPTY
9. Mark as complete ✅

# Before marking Phase 3 complete:
10. All mocks compile (npm run check - 0 errors)
11. All tests pass (npm test)
12. No type escapes (git grep "as any" services/mock/)
13. SEAMSLIST.md updated
14. CHANGELOG.md updated
```

**Impact**:

- **Confidence level**: 95%+ that Phase 4 will integrate smoothly
- **Time saved**: Zero debugging time wasted on contract mismatches
- **Documentation quality**: Excellent - other AIs/devs can pick this up easily
- **Proof SDD works**: When followed strictly, it delivers on promises

**Key takeaway**:

> **SDD Phase 3 done correctly looks like:**
>
> - All tests passing (100+ tests is great!)
> - Zero TypeScript errors (warnings ok)
> - Mocks match contracts exactly (proven by tests, not assumptions)
> - Documentation complete and accurate
> - Ready to build UI with confidence
>
> **The AI Coordination Server is the GOLD STANDARD example for this project.**

**Contrast with Lesson #3**:

- Lesson #3: What happens when you skip validation (122 errors, blocked progress)
- Lesson #4: What happens when you follow SDD strictly (0 errors, smooth sailing)

**Recommendation**:

- Use AI Coordination Server as the reference implementation
- When in doubt about "is Phase 3 complete?", compare to coordination server status
- Apply the same rigor to Tarot app Phase 3 completion

---

### Lesson #5: Mocks Written Without Referencing Contracts = Technical Debt 💸

**Date**: 2025-11-11
**Phase**: Phase 3 - Fixing Mock Services
**What happened**: Returned to Tarot app after 3 days. Ran `npm run check` expecting ~13 errors. Got **96 TypeScript errors** across all 6 mock files.

**What went wrong**:

1. Mock files were created in commit `316856f` but never validated against contracts
2. Mocks have wrong field names (`cardMeaning` instead of `traditionalMeaning`, `prompt` instead of `generatedPrompt`)
3. Mocks have extra fields not in contracts (`currency` in `ApiUsage`, `total` in `GenerationProgress`)
4. Mocks are missing required fields from contracts
5. Enums imported with `import type` keyword (can't be used as values)
6. The initial "13 errors" was just truncated terminal output - real count was always 96

**Root cause**:

- **Mocks were written by AI without carefully reading contracts**
- AI likely guessed field names instead of copying from contract definitions
- No validation step before marking "complete"
- No contract tests written to catch mismatches
- The phrase "mock files exist" was confused with "mocks are correct"

**Error distribution**:

```
24 errors: ImageGenerationMock.ts
19 errors: PromptGenerationMock.ts
14 errors: DownloadMock.ts
14 errors: DeckDisplayMock.ts
10 errors: StyleInputMock.ts
10 errors: CostCalculationMock.ts
 5 errors: factory.ts (fixed)
---
96 total errors
```

**Common pattern of errors**:

```typescript
// Contract defines:
export interface CardPrompt {
  generatedPrompt: string
  traditionalMeaning: string
  confidence: number
}

// Mock returns:
return {
  prompt: '...', // ❌ Wrong field name!
  cardMeaning: '...', // ❌ Wrong field name!
  // ❌ Missing confidence!
}
```

**Why this is worse than Lesson #3**:

- Lesson #3: Mocks created but not validated (type errors caught late)
- Lesson #5: Mocks created **incorrectly** (didn't even read contracts!)
- This is double failure: skipped validation AND didn't reference source of truth

**What should have happened**:

```bash
# When creating mock:
1. Open contract file side-by-side
2. Read interface definition carefully
3. Copy exact field names from contract
4. Implement interface with exact types
5. npm run check (MUST PASS)
6. Write contract test to prove shape match
7. npm run test:contracts (MUST PASS)
```

**Impact**:

- **Cannot build UI** - TypeScript compilation blocked
- **Lost 3 days** - Mocks marked "complete" but actually broken
- **96 fixes required** - Each error must be manually corrected
- **Trust broken** - Can't trust that mocks work without tests
- **Integration will fail** - Even if we fix mocks, real services may have same issue

**Solution implemented**:

1. Created comprehensive `GITHUB_AGENT_TASK.md` with:
   - List of all 7 missing contract tests
   - Detailed test requirements for each seam
   - Examples from working AI Coordination tests
   - Success criteria (all tests pass, 0 TypeScript errors)
2. Plan to fix all 96 mock errors systematically
3. Deploy GitHub Coding Agent to write contract tests
4. Use tests to validate fixes are correct

**Prevention checklist** (add to AI-CHECKLIST.md Phase 3):

```markdown
### Step 11.5: Reference Contract While Coding (CRITICAL)

⚠️ **NEVER write mock code without contract open in editor!**

- [ ] Open contract file (`/contracts/[Feature].ts`)
- [ ] Find the interface definition (e.g., `IFeatureService`)
- [ ] Copy exact field names from contract types
- [ ] Copy exact method signatures from interface
- [ ] Use contract's type definitions, don't invent new ones
- [ ] If contract has enum, import WITHOUT 'type' keyword

**Rule**: Mock must be a pixel-perfect implementation of contract.
```

**Key differences from Lesson #3 vs #5**:

| Aspect     | Lesson #3 (Validation)  | Lesson #5 (Implementation) |
| ---------- | ----------------------- | -------------------------- |
| Problem    | Skipped `npm run check` | Didn't read contract       |
| Symptom    | Type errors on fields   | Wrong field names          |
| Fix time   | 15 minutes (validation) | 2+ hours (rewrite mocks)   |
| Prevention | Run type check          | Reference contract         |
| Impact     | Caught late             | Fundamentally wrong        |

**Reusable pattern**:

```
Contract = Single Source of Truth
  ↓
Mock = Pixel-Perfect Copy of Contract
  ↓
Test = Proof Mock Matches Contract
  ↓
UI = Built Against Validated Mock
  ↓
Real Service = Drop-in Replacement
  ↓
Integration = Works First Try ✅

❌ Break any step = SDD fails
```

**Key takeaway**:

> **Three levels of SDD compliance:**
>
> 1. ❌ **Bad**: Mocks written, not validated, don't match contracts (Lesson #5)
> 2. ⚠️ **Better**: Mocks match contracts, but not validated (Lesson #3)
> 3. ✅ **Best**: Mocks match contracts, tests prove it (Lesson #4)
>
> **Always aim for level 3. Never accept level 1.**

**Action items**:

1. ✅ Fix critical TypeScript errors (env vars, imports) - DONE
2. ⏳ Fix all 96 mock-contract mismatches - IN PROGRESS
3. ⏳ Write 7 contract tests (via GitHub Coding Agent)
4. ⏳ Validate all tests pass before marking Phase 3 complete

**Success will look like**:

- 0 TypeScript errors (down from 96)
- 7 contract test files written
- All tests passing (following AI Coordination pattern)
- Ready to build UI with confidence

---

### Lesson #6: Enum Imports Must Not Use 'import type' 🔧

**Date**: 2025-11-15
**Phase**: PR Review - Addressing Type Safety Issues
**What happened**: PR review comments on PR#20 and PR#21 identified that enums were imported with `import type` but used as values, causing TypeScript errors.

**The problem**:

```typescript
// ❌ WRONG: Enum imported as type
import type { StyleInputErrorCode } from '$contracts/StyleInput'

// This causes error because enum is used as value:
errors.push({ code: StyleInputErrorCode.THEME_INVALID })
//                   ^^^^^^^^^^^^^^^^^^^ Cannot use as value!
```

**Why this happens**:

- TypeScript's `import type` is for **type-only imports** (interfaces, type aliases)
- Enums are **runtime values** in JavaScript, not just compile-time types
- When you import an enum with `import type`, TypeScript strips it from the output
- At runtime, the enum reference becomes `undefined`, causing errors

**The fix**:

```typescript
// ✅ CORRECT: Separate type and value imports
import type {
  IStyleInputService,
  StyleInputValidationError,
  // ... other types
} from '$contracts/StyleInput'

// Import enum separately as a value
import { StyleInputErrorCode } from '$contracts/StyleInput'

// Now this works:
errors.push({ code: StyleInputErrorCode.THEME_INVALID }) // ✅
```

**Files affected**:

- `StyleInputMock.ts`: `StyleInputErrorCode` import fixed
- `PromptGenerationMock.ts`: `PromptGenerationErrorCode` import fixed

**Related contract field fixes** (from same PR):

- Changed `prompt` → `generatedPrompt` (correct field name per `CardPrompt` interface)
- Changed `cardMeaning` → `traditionalMeaning` (correct field name per `CardPrompt` interface)
- Removed `total` from `GenerationProgress` (field doesn't exist in contract)
- Removed `currency` from `ApiUsage` (field doesn't exist in contract)
- Added missing `confidence` field to `CardPrompt` objects
- Added missing `estimateCost` method to `PromptGenerationMockService`

**Prevention**:

```markdown
### When importing from contracts:

✅ DO:

- `import type { Interface, Type }` for interfaces and type aliases
- `import { Enum, CONSTANT }` for enums and constants (no 'type' keyword)
- Check contract: if it's defined with `enum`, import without 'type'

❌ DON'T:

- `import type { Enum }` - Enums are values!
- Guess field names - copy exact names from contract
- Add fields not in contract (like `currency`, `total`)
- Miss required fields (like `confidence`)
```

**Rule of thumb**:

> **If you can use it with a dot (`.`), don't import it with `import type`**
>
> - `ErrorCode.INVALID` → import without 'type'
> - `CONSTANTS.MAX_SIZE` → import without 'type'
> - `UserType` (interface) → import with 'type'

**Key takeaway**:

> **Enums and constants are JavaScript runtime values that exist at runtime.**
> **Types and interfaces are TypeScript compile-time constructs that disappear.**
> **Import accordingly: values without 'type', types with 'type'.**

**Testing validation**:

- Ran `npm run check` - 0 TypeScript errors in fixed files ✅
- All 143 tests passing ✅
- CodeQL security scan - 0 vulnerabilities ✅

**Documentation updated**:

- Added to CHANGELOG.md under "Fixed" section
- Created `docs/planning/PR20-REVIEW-FIXES.md` for PR#20 branch fixes

---

### What Worked Well

_To be filled during development_

**Template for entries:**

```markdown
#### [Feature/Decision Name]

- **What**: [Brief description]
- **Why it worked**: [Explanation]
- **Impact**: [Measurable result]
- **Reusable pattern**: [Yes/No - if yes, describe]
```

**Example:**

```markdown
#### Mock-First Image Upload

- **What**: Built image upload UI against mock file validation service
- **Why it worked**: Could iterate on UX without waiting for real upload implementation
- **Impact**: Saved 2 days of blocked time
- **Reusable pattern**: Yes - all file upload features should use mock-first approach
```

---

### What Didn't Work

_To be filled during development_

**Template for entries:**

```markdown
#### [Issue Name]

- **What went wrong**: [Description]
- **Context**: [When/where it happened]
- **Root cause**: [Why it failed]
- **Impact**: [What broke or was delayed]
- **Solution**: [How we fixed it]
- **Prevention**: [How to avoid in future]
```

**Example:**

```markdown
#### Contract Changed Mid-Development

- **What went wrong**: Developer modified contract after UI implementation started
- **Context**: Week 2, adding email field to UserSeam
- **Root cause**: Didn't understand contract immutability principle
- **Impact**: UI components broke, lost 4 hours refactoring
- **Solution**: Reverted contract change, created UserSeamV2 instead
- **Prevention**: Added pre-commit hook to detect contract modifications
```

---

### What We'd Do Differently

_To be filled during development_

**Template for entries:**

```markdown
#### [Decision/Approach]

- **What we did**: [Original approach]
- **What we learned**: [Insight gained]
- **What we'd do instead**: [Better approach]
- **When to apply**: [Situations where new approach is better]
```

---

## Technical Decisions

### Decision Log

_Document significant technical decisions using this template_

#### Decision: [Name]

- **Date**: YYYY-MM-DD
- **Status**: Proposed | Accepted | Rejected | Superseded
- **Context**: Why we faced this decision
- **Options Considered**:
  1. **Option A**:
     - Pros: [List benefits]
     - Cons: [List drawbacks]
  2. **Option B**:
     - Pros: [List benefits]
     - Cons: [List drawbacks]
- **Decision Made**: [What we chose]
- **Rationale**: [Why we chose it]
- **Consequences**: [Positive and negative outcomes]
- **Outcome**: [How it turned out - fill in later]
- **Lesson**: [What we learned - fill in later]

---

**Example Decision Entry:**

#### Decision: Grok API Integration Strategy

- **Date**: 2025-11-07
- **Status**: Accepted
- **Context**: Need to integrate Grok AI for both prompt generation (text) and image generation. Could build as single service or separate services.
- **Options Considered**:
  1. **Single GrokService**:
     - Pros: One API key, simpler configuration, shared error handling
     - Cons: Violates single responsibility, mixes text and image concerns
  2. **Separate Services (GrokTextService + GrokImageService)**:
     - Pros: Clear seam boundaries, independent mocking, follows SDD principles
     - Cons: Two service implementations, potential code duplication
- **Decision Made**: Separate services (GrokTextService + GrokImageService)
- **Rationale**: Better aligns with SDD - each service has one seam, easier to mock independently for parallel development
- **Consequences**: Need to implement two services but gain better testability and clearer contracts
- **Outcome**: [To be filled after implementation]
- **Lesson**: [To be filled after implementation]

---

## Seam-Specific Learnings

### Contract Design

_To be filled as contracts are defined_

**Template:**

```markdown
#### [Seam Name]

- **Challenge**: [What was hard about defining this contract]
- **Solution**: [How we solved it]
- **Pattern**: [Contract structure we settled on]
- **Lesson**: [What we learned for future contracts]
```

---

### Mock Development

_To be filled as mocks are implemented_

**Template:**

```markdown
#### [Mock Service Name]

- **Challenge**: [Difficulty in mocking]
- **Approach**: [What we tried]
- **Result**: [What worked]
- **Reusable Pattern**: [Extract for other projects]
```

**Example:**

```markdown
#### MockGrokImageService

- **Challenge**: How to mock image generation without real AI calls
- **Approach**: Used placeholder images from Lorem Picsum API with deterministic IDs
- **Result**: Realistic mock that generates unique "images" for each card
- **Reusable Pattern**: For any image generation mock, use deterministic placeholders keyed to input hash
```

---

### Integration Challenges

_To be filled during integration phase_

**Template:**

```markdown
#### [Integration Issue]

- **Issue**: [What broke during integration]
- **Root Cause**: [Why it broke]
- **Contract Problem**: [Was the contract wrong or implementation?]
- **Fix**: [Solution]
- **Prevention**: [Contract change or pattern to prevent recurrence]
```

---

## AI Coding Agent Insights

### Working with Claude

_To be filled as we use Claude for development_

**What works well:**

- [Patterns that Claude handles effectively]

**What doesn't work:**

- [Areas where Claude struggles]

**Best practices:**

- [How to get best results from Claude]

---

### Working with GitHub Copilot

_To be filled as we use Copilot_

**What works well:**

- [Patterns that Copilot handles effectively]

**What doesn't work:**

- [Areas where Copilot struggles]

**Best practices:**

- [How to get best results from Copilot]

---

### Working with Gemini

_To be filled as we use Gemini_

**What works well:**

- [Patterns that Gemini handles effectively]

**What doesn't work:**

- [Areas where Gemini struggles]

**Best practices:**

- [How to get best results from Gemini]

---

### Common AI Pitfalls

_Document AI-specific issues encountered_

**Template:**

```markdown
- **Pitfall**: [What the AI did wrong]
- **Why it happens**: [Root cause]
- **How to prevent**: [Instruction or pattern to avoid it]
```

**Example:**

```markdown
- **Pitfall**: AI modified contract during implementation
- **Why it happens**: AI doesn't understand SDD contract immutability
- **How to prevent**: Add "NEVER modify contracts in /contracts" to AGENTS.md and remind before each task
```

---

## SDD Methodology Refinements

### Improvements to SDD Process

_Document any adjustments we made to standard SDD_

**Template:**

```markdown
#### [Improvement Name]

- **Standard SDD approach**: [What the methodology says]
- **Our modification**: [What we changed]
- **Why we changed it**: [Rationale]
- **Result**: [Did it help?]
- **Recommendation**: [Should this be incorporated into seam-driven-development.md?]
```

---

### Tooling Gaps

_What tools would have helped?_

**Template:**

```markdown
#### [Tool Name/Purpose]

- **Gap**: [What was missing]
- **Impact**: [How it slowed us down]
- **Workaround**: [What we did instead]
- **Ideal tool**: [Describe desired tool]
- **Built our own?**: [Yes/No - if yes, link to it]
```

**Example:**

```markdown
#### Contract Validation Tool

- **Gap**: No automated way to verify mocks match contracts
- **Impact**: Manual verification was error-prone, caught issues late
- **Workaround**: Wrote tests manually for each contract
- **Ideal tool**: Auto-generate contract tests from TypeScript interfaces
- **Built our own?**: Yes - see /scripts/generate-contract-tests.ts
```

---

## Performance Observations

### Development Velocity

_To be filled during and after development_

**Metrics to track:**

- Time to first integration: [TBD]
- Integration success rate: [TBD]
- Debugging time percentage: [TBD]
- Contract definition time: [TBD]
- Mock implementation time: [TBD]
- Real service implementation time: [TBD]

**Comparison to expectations:**

- Expected: [Based on SDD metrics - 95% success rate, 70% faster integration]
- Actual: [To be filled]
- Analysis: [Why different, if at all]

---

### Comparison to Previous Projects

_If applicable - compare to non-SDD projects_

**Template:**

```markdown
| Metric                    | Previous Project | TarotUpMyHeart (SDD) | Improvement |
| ------------------------- | ---------------- | -------------------- | ----------- |
| Time to first integration | [X days]         | [Y days]             | [+/-Z%]     |
| Integration bugs          | [X bugs]         | [Y bugs]             | [+/-Z%]     |
| Refactoring time          | [X hours]        | [Y hours]            | [+/-Z%]     |
```

---

## Team Collaboration

### Communication Patterns

_How did we communicate around contracts?_

**What worked:**

- [Effective communication patterns]

**What didn't work:**

- [Communication failures]

**Recommendations:**

- [Patterns to adopt for future]

---

### Handling Contract Disputes

_When team disagreed on contract design_

**Template:**

```markdown
#### [Contract Name] Dispute

- **Disagreement**: [What people disagreed on]
- **Viewpoints**:
  - Option A: [Reasoning]
  - Option B: [Reasoning]
- **Resolution**: [How we decided]
- **Outcome**: [Was it the right call?]
```

---

### Onboarding New Developers

_If we onboard anyone mid-project_

**How easy was it?**

- Time to productivity: [TBD]
- What helped most: [Documentation, pairing, etc.]
- What was confusing: [Areas that needed better docs]

**Improvements needed:**

- [What would make onboarding faster]

---

## Grok AI Integration Learnings

_Specific insights about working with Grok API_

### Prompt Generation (grok-4-fast-reasoning)

**What we learned:**

- [Insights about the text model]

**Best practices:**

- [How to structure prompts for best results]

**Gotchas:**

- [Unexpected behaviors or limitations]

---

### Image Generation (grok-image-generator)

**What we learned:**

- [Insights about the image model]

**Best practices:**

- [How to structure prompts for best results]

**Gotchas:**

- [Unexpected behaviors or limitations]

---

### API Quirks

**Differences from OpenAI/Anthropic:**

- [Unique aspects of Grok API]

**Cost optimization:**

- [Strategies to reduce API costs]

**Rate limiting:**

- [How we handled rate limits]

---

## Future Improvements

### For Next Project

1. [Specific improvement to apply to future projects]
2. [Specific improvement to apply to future projects]

---

### For This Project (Phase 2)

_What to add in next iteration_

1. [Feature or improvement for this project]
2. [Feature or improvement for this project]

---

## Emergency Protocol Usage

### Times We Used Emergency Protocols

_Document any times integration failed_

**Template:**

```markdown
#### Incident: [Brief description]

- **Date**: YYYY-MM-DD
- **What failed**: [Integration that broke]
- **Which protocol step caught it**: [Contract validation? Mock tests? etc.]
- **Root cause**: [What was wrong]
- **Time to fix**: [Hours]
- **Prevention**: [How we'll prevent in future]
```

---

### Protocol Effectiveness

**Did the emergency protocols work?**

- [Analysis of protocol effectiveness]

**What's missing from the protocols?**

- [Gaps we discovered]

**Improvements to protocols:**

- [Suggested additions]

---

## Quotes & Moments

### "Aha!" Moments

_Insights that changed our understanding_

- _"[Quote or insight]"_ - [Context: when, why it mattered]

---

### "Oh No!" Moments

_Things that went wrong and how we recovered_

- _"[What went wrong]"_ - [Context: how we recovered, what we learned]

---

### Funny Moments

_Lighten the mood - development has humor too_

- [Funny bugs, interesting edge cases, etc.]

---

## Metrics Summary

_To be filled at project completion_

### SDD Effectiveness

- Contract immutability maintained: [Yes/No - any violations?]
- Integration success rate: [Percentage]
- Time saved vs traditional development: [Percentage or days]
- Developer satisfaction with SDD: [Scale of 1-10]

### Project Success

- Completed features: [Count]
- Bugs in production: [Count]
- Performance vs expectations: [Analysis]

---

## References

- See `/seam-driven-development.md` for full SDD methodology
- See `/SEAMSLIST.md` for project seams
- See `/CHANGELOG.md` for version history
- See `/AGENTS.md` for AI agent instructions

---

## Contributing to This Document

When adding lessons learned:

1. Use the provided templates
2. Be specific (avoid vague generalizations)
3. Include measurable impacts when possible
4. Link to related code/commits/PRs
5. Tag entries with dates
6. Update summary metrics at project milestones

**This is a living document** - update it throughout the project, not just at the end!
