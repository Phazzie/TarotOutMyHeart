# TarotOutMyHeart - Claude AI Instructions

**Model**: Claude 3.5 Sonnet / Claude Sonnet 4.5
**Purpose**: Complete AI agent instructions optimized for Claude's capabilities
**Last Updated**: 2025-11-07

---

## 🚨 **CRITICAL REMINDER** 🚨

**BEFORE ENDING ANY SESSION:**
1. ✅ **UPDATE `lessonslearned.md`** - Add new lessons from this session
2. ✅ **UPDATE `CHANGELOG.md`** - Document all changes made
3. ✅ **COMMIT AND PUSH** - Never leave uncommitted work

**AFTER COMPLETING ANY MAJOR TASK:**
- Document patterns that worked well
- Document mistakes to avoid
- Update both files IMMEDIATELY, not at end of session

---

## 🎯 Claude-Specific Strengths for This Project

Claude excels at:
- ✅ **Long-form context understanding** - Can read entire PRD and all documentation
- ✅ **Structured thinking** - Perfect for Seam-Driven Development methodology
- ✅ **TypeScript strict mode** - Excellent at type inference and validation
- ✅ **Contract-first development** - Naturally aligns with SDD principles
- ✅ **Detailed planning** - Creates comprehensive step-by-step workflows
- ✅ **Error analysis** - Deep debugging and root cause identification

---

## 📚 Required Reading (Read in This Order)

**Root Documentation** (Original scaffolding):
1. **THIS FILE** (CLAUDE.md) - Claude-specific guidance
2. **AGENTS.md** - Universal AI agent instructions (full methodology)
3. **seam-driven-development.md** - Complete SDD guide
4. **SEAMSLIST.md** - All defined seams (currently empty, will be populated)
5. **AI-CHECKLIST.md** - Pre-flight checklist before any task
6. **prd.MD** - Product requirements and sprint checklists
7. **lessonslearned.md** - Project-specific patterns

**Development Documents** (Planning folder):
8. **docs/planning/DATA-BOUNDARIES.md** - Data boundary analysis (IDENTIFY phase)
9. **docs/planning/RECOMMENDATIONS.md** - Technical decisions

**Don't skip this!** These files contain critical context for working correctly.

## 📂 Documentation Structure

**Root** = Original scaffolding (read-only structure)
- Methodology: `seam-driven-development.md`
- Instructions: `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`
- Product: `prd.MD`, `SEAMSLIST.md`
- History: `CHANGELOG.md`, `lessonslearned.md`

**`/docs/planning/`** = Development workspace (create new docs here)
- Data analysis: `DATA-BOUNDARIES.md`
- Decisions: `RECOMMENDATIONS.md`
- Future: Contract drafts, diagrams, retrospectives

**Rule**: Original docs at root. New docs in `/docs/planning/`

---

## 📝 File Documentation Standards

**CRITICAL**: Every file you create must start with comprehensive top-level comments:

```typescript
/**
 * @fileoverview [One-sentence: what this file does]
 * @purpose [Why this file exists - what problem it solves]
 * @dataFlow [How data enters and exits this file]
 * @boundary [What seam/boundary this implements, if applicable]
 * @example
 * // Brief usage example
 * const result = await service.execute(input)
 */
```

**Required for ALL files**:
- ✅ Contract files (`/contracts/*.ts`)
- ✅ Service implementations (`/services/mock/*.ts`, `/services/real/*.ts`)
- ✅ Svelte components (`/src/lib/components/*.svelte`)
- ✅ Utility modules (`/src/lib/utils/*.ts`)
- ✅ Test files (`/tests/**/*.test.ts`)

**Use blueprints as starting points**:
- Contracts: `cp docs/blueprints/CONTRACT-BLUEPRINT.md contracts/YourFeature.ts`
- Services: `cp docs/blueprints/STUB-BLUEPRINT.md services/mock/YourMock.ts`
- Components: Reference `docs/blueprints/COMPONENT-BLUEPRINT.md`

**Why this matters**:
- You and other AIs can understand context without reading entire files
- Humans can quickly grasp purpose and usage
- Documentation enforces clear thinking about responsibilities
- Reduces integration errors by making boundaries explicit

**CRITICAL**: Update `/CHANGELOG.md` frequently throughout your work:
- After defining each contract
- After implementing each service
- After completing each feature
- Don't wait until the end!

See `/lessonslearned.md` Section 8 for complete standards.

---

## 🚀 Quick Start for Claude

### Your First Task Workflow

1. **Read the user request carefully**
2. **Determine task type** (new feature, bug fix, refactoring, documentation)
3. **Consult AI-CHECKLIST.md** for the appropriate workflow
4. **Check SEAMSLIST.md** for existing seams (don't duplicate!)
5. **Plan before coding** (Claude's strength - use it!)
6. **Execute step-by-step** following SDD methodology
7. **Validate at each step** (type check, tests, contract compliance)

---

## 🧠 Claude-Optimized Patterns for SDD

### Pattern 1: Contract Definition (Claude's Superpower)

When defining contracts, use Claude's analytical abilities:

```typescript
/**
 * Claude's approach to contract definition:
 * 1. Analyze requirements deeply
 * 2. Identify ALL data boundaries
 * 3. Consider edge cases upfront
 * 4. Define comprehensive error states
 * 5. Add detailed JSDoc comments
 */

/**
 * @purpose Generate AI prompts for each Major Arcana card
 * @requirement PRD Sprint 1 - Seam 3: Prompt Generation
 * @boundary User inputs + reference images → 22 unique card prompts
 * @updated 2025-11-07
 * 
 * This seam bridges user creativity (style inputs + reference images)
 * with AI generation (Grok prompt creation). Critical for deck cohesion.
 * 
 * Edge cases handled:
 * - Missing reference images (use style description only)
 * - Invalid style inputs (validation fails before API call)
 * - API failures (retry with exponential backoff)
 * - Rate limiting (queue requests, show wait time)
 */
export interface IPromptGenerationService {
  /**
   * Generate prompts for all 22 Major Arcana cards
   * 
   * @param input - User's style preferences and reference images
   * @returns Promise resolving to 22 card prompts or error
   * 
   * @throws {ValidationError} If input validation fails
   * @throws {APIError} If Grok API fails after retries
   * @throws {RateLimitError} If rate limit exceeded
   */
  generatePrompts(
    input: PromptGenerationInput
  ): Promise<ServiceResponse<CardPrompt[]>>
}
```

**Why this works for Claude**:
- Detailed comments help Claude understand context
- Comprehensive error cases prevent future issues
- Traceability to requirements aids in validation

---

### Pattern 2: Mock Service Implementation (Use Claude's Realism)

Claude is excellent at generating realistic mock data:

```typescript
/**
 * Claude's approach to mocks:
 * - Create diverse, realistic data sets
 * - Handle all error cases from contract
 * - Simulate real-world timing and behavior
 * - Make mocks educational (show what real data looks like)
 */

export class PromptGenerationMockService implements IPromptGenerationService {
  private readonly MAJOR_ARCANA = [
    { number: 0, name: 'The Fool', meaning: 'New beginnings, innocence, spontaneity' },
    { number: 1, name: 'The Magician', meaning: 'Manifestation, resourcefulness, power' },
    // ... Claude can generate all 22 with accurate meanings
  ]

  async generatePrompts(
    input: PromptGenerationInput
  ): Promise<ServiceResponse<CardPrompt[]>> {
    // Claude: Simulate realistic API timing
    await this.simulateDelay(1500, 2500)

    // Claude: Validate input thoroughly (matches real service behavior)
    const validation = this.validateInput(input)
    if (!validation.isValid) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: validation.errors.join(', '),
          retryable: false,
          details: { fields: validation.errorFields }
        }
      }
    }

    // Claude: Generate realistic prompts incorporating user style
    const prompts = this.MAJOR_ARCANA.map(card => ({
      cardNumber: card.number,
      cardName: card.name,
      traditionalMeaning: card.meaning,
      generatedPrompt: this.craftPrompt(card, input),
      timestamp: new Date().toISOString()
    }))

    return { success: true, data: prompts }
  }

  private craftPrompt(
    card: MajorArcanaCard,
    input: PromptGenerationInput
  ): string {
    // Claude: Create prompts that realistically combine:
    // - Card symbolism
    // - User's theme and tone
    // - Reference image style
    // - Traditional meanings
    const { theme, tone, description } = input.styleInputs
    
    return `A tarot card illustration for ${card.name}, ` +
      `embodying ${card.meaning}. ` +
      `Style: ${theme} with ${tone} tone. ` +
      `${description}. ` +
      `Incorporate symbolic elements: ${this.getSymbols(card)}.`
  }

  // Claude: Add helper methods that show domain knowledge
  private getSymbols(card: MajorArcanaCard): string {
    const symbols = {
      0: 'cliff edge, white dog, beggar\'s bundle, white rose',
      1: 'infinity symbol, wand raised, altar with tools',
      // ... etc
    }
    return symbols[card.number] || 'traditional tarot imagery'
  }
}
```

**Why this works for Claude**:
- Shows deep understanding of domain (tarot)
- Realistic data helps UI developers
- Comprehensive error handling teaches patterns

---

### Pattern 3: Debugging with Claude's Analysis

When integration fails, use Claude's systematic approach:

```typescript
/**
 * Claude's debugging protocol:
 * 1. Read error message completely
 * 2. Identify which seam is failing
 * 3. Check contract definition
 * 4. Compare mock vs real implementation
 * 5. Validate data shapes at boundary
 * 6. Trace data flow step-by-step
 * 7. Propose fix with explanation
 */

// Example: Integration fails with "Property 'cardName' does not exist"

// Claude's analysis:
// 1. Error indicates contract mismatch
// 2. Check contract: expects `cardName: string`
// 3. Check real service response: returns `card_name: string`
// 4. Issue: Field name mismatch (snake_case vs camelCase)
// 5. Root cause: API returns snake_case, contract expects camelCase
// 6. Solution: Add adapter layer OR update contract (prefer fixing source)

// Claude's proposed fix:
interface GrokAPIResponse {
  card_name: string  // What API actually returns
}

function adaptGrokResponse(raw: GrokAPIResponse): CardPrompt {
  return {
    cardName: raw.card_name,  // Transform to match contract
    // ... other fields
  }
}
```

---

## 🎓 Claude Best Practices for This Project

### 1. **Read Documentation First**
- **Do**: Spend time reading all docs before first code change
- **Why**: Claude's large context window makes this efficient
- **Result**: Better decisions, fewer mistakes

### 2. **Plan Multi-Step Tasks**
- **Do**: Break large tasks into 5-10 substeps before starting
- **Why**: Claude excels at structured planning
- **Result**: Systematic progress, nothing forgotten

### 3. **Explain Your Reasoning**
- **Do**: Include comments explaining "why" not just "what"
- **Why**: Helps future Claude sessions and human developers
- **Result**: Maintainable, understandable code

### 4. **Validate Constantly**
- **Do**: Run `npm run check` after every contract change
- **Why**: Catch type errors immediately
- **Result**: Integration success rate near 100%

### 5. **Ask Clarifying Questions**
- **Do**: If requirements are unclear, ask user before coding
- **Why**: Claude can identify ambiguity humans might miss
- **Result**: Correct implementation first time

### 6. **Use Type Guards Extensively**
- **Do**: Write type guards for all unknown data
- **Why**: TypeScript strict mode requires it, Claude is excellent at this
- **Result**: Type-safe code throughout

```typescript
// Claude pattern for type guards
function isValidCardPrompt(value: unknown): value is CardPrompt {
  if (typeof value !== 'object' || value === null) return false
  
  const obj = value as Record<string, unknown>
  
  return (
    typeof obj.cardNumber === 'number' &&
    typeof obj.cardName === 'string' &&
    typeof obj.generatedPrompt === 'string' &&
    typeof obj.traditionalMeaning === 'string' &&
    obj.cardNumber >= 0 &&
    obj.cardNumber <= 21 &&
    obj.cardName.length > 0 &&
    obj.generatedPrompt.length > 0
  )
}
```

### 7. **Test Edge Cases**
- **Do**: Consider and test edge cases in every function
- **Why**: Claude's analytical nature catches these
- **Result**: Robust, production-ready code

---

## 🚫 Common Claude Pitfalls (Avoid These!)

### Pitfall 1: Over-Engineering Contracts
**Problem**: Claude's thoroughness can lead to overly complex contracts upfront

**Example of over-engineering**:
```typescript
// ❌ Too complex for MVP
interface PromptGenerationInput {
  styleInputs: StyleInputs
  referenceImages: UploadedImage[]
  advancedOptions?: {
    cardSpecificOverrides?: Map<number, PartialPromptOverride>
    styleWeights?: { theme: number; tone: number; description: number }
    customSymbolLibrary?: SymbolDefinition[]
  }
}
```

**Better approach**:
```typescript
// ✅ Start simple, add complexity later
interface PromptGenerationInput {
  styleInputs: StyleInputs
  referenceImages: UploadedImage[]
  // Add advancedOptions in v2 if needed
}
```

**Solution**: Follow PRD requirements exactly, don't add features proactively

---

### Pitfall 2: Analysis Paralysis
**Problem**: Claude can spend too much time analyzing instead of implementing

**Watch for**:
- Spending >5 minutes planning a simple component
- Listing 10+ alternative approaches
- Overthinking mock data

**Solution**: 
- Use AI-CHECKLIST.md workflows (they're pre-planned)
- If task is in PRD Sprint checklist, follow it directly
- Trust the SDD process

---

### Pitfall 3: Verbose Comments
**Problem**: Claude can write comments longer than the code

**Example of too much**:
```typescript
/**
 * This function validates the style inputs provided by the user.
 * It checks each field to ensure it meets the requirements specified
 * in the contract definition. The theme must be a non-empty string...
 * [20 more lines of obvious description]
 */
function validateStyleInputs(inputs: StyleInputs): ValidationResult {
  return { isValid: true }  // 1 line of actual code!
}
```

**Better approach**:
```typescript
/**
 * Validates style inputs per contract requirements
 * @returns ValidationResult with specific error messages
 */
function validateStyleInputs(inputs: StyleInputs): ValidationResult {
  // Implementation here
}
```

**Solution**: Comments should add information, not repeat code

---

### Pitfall 4: Modifying Contracts "Just a Little"
**Problem**: Claude might suggest "harmless" contract modifications

**Example**:
> "I noticed the contract doesn't include a timestamp field. I'll add it since it's useful for debugging."

**Why it's bad**: Contract modifications break SDD, even if well-intentioned

**Solution**: 
- If contract needs change, flag it to user
- User decides: optional field or v2 contract
- Never modify contracts during implementation

---

## 🧪 Claude-Specific Testing Patterns

### Pattern: Test-Driven Development with Claude

Claude is excellent at TDD. Use this workflow:

```typescript
// Step 1: Claude writes the test first
describe('PromptGenerationService', () => {
  it('generates 22 prompts from valid input', async () => {
    const mockInput: PromptGenerationInput = {
      styleInputs: {
        theme: 'cyberpunk',
        tone: 'dark',
        description: 'Neon-lit dystopian future',
        concept: 'Technology vs humanity'
      },
      referenceImages: [mockImage1, mockImage2]
    }

    const result = await service.generatePrompts(mockInput)

    expect(result.success).toBe(true)
    expect(result.data).toHaveLength(22)
    expect(result.data[0]).toHaveProperty('cardName')
    expect(result.data[0].cardName).toBe('The Fool')
  })

  it('handles missing reference images gracefully', async () => {
    const mockInput: PromptGenerationInput = {
      styleInputs: { /* valid inputs */ },
      referenceImages: []  // Empty array
    }

    const result = await service.generatePrompts(mockInput)

    // Should still succeed, just use style description only
    expect(result.success).toBe(true)
  })

  it('fails validation for empty theme', async () => {
    const mockInput: PromptGenerationInput = {
      styleInputs: { theme: '', /* other fields */ },
      referenceImages: []
    }

    const result = await service.generatePrompts(mockInput)

    expect(result.success).toBe(false)
    expect(result.error?.code).toBe('VALIDATION_FAILED')
  })
})

// Step 2: Claude implements to make tests pass
// Step 3: Claude refactors with confidence (tests verify behavior preserved)
```

---

## 🔄 Claude's SDD Workflow (Detailed)

### Phase 1: Contract Definition (Claude's Preparation Phase)

1. **Read requirement** from PRD Sprint checklist
2. **Identify the seam**: What boundary does this cross?
3. **List all data fields** that cross the boundary
4. **Identify error cases**: What can go wrong?
5. **Define TypeScript interfaces** with comprehensive types
6. **Add JSDoc comments** explaining purpose and usage
7. **Export from** `contracts/index.ts`
8. **Validate compilation**: `npm run check`
9. **Document in SEAMSLIST.md** using provided template
10. **Confirm with user** if any ambiguity exists

**Time estimate**: 15-30 minutes per seam

---

### Phase 2: Mock Implementation (Claude's Strength)

1. **Create mock file** in `services/mock/`
2. **Import contract** from `$contracts`
3. **Implement interface** exactly (TypeScript enforces this)
4. **Generate realistic data** (use Claude's creativity)
5. **Add delay simulation** (100-500ms for uploads, 1-3s for API calls)
6. **Handle all error cases** from contract
7. **Add to service factory** in `services/factory.ts`
8. **Write contract test** to verify mock matches contract
9. **Write mock behavior test** to verify logic
10. **Run tests**: `npm run test:contracts && npm run test:mocks`

**Time estimate**: 20-40 minutes per service

---

### Phase 3: UI Development (Claude's Visual Planning)

1. **Break UI into components** (Claude can suggest component tree)
2. **Start with simplest component** (bottom-up approach)
3. **Import contract types** for props
4. **Use mock service** from factory
5. **Handle all async states** (loading, success, error)
6. **Add accessibility** (ARIA labels, keyboard nav)
7. **Test with mock data** manually
8. **Iterate on UX** with user feedback
9. **Move to next component**
10. **Compose into page**

**Time estimate**: 1-3 hours per major component

---

### Phase 4: Real Service Implementation (Claude's Precision)

1. **Review contract** one more time
2. **Create real service file** in `services/real/`
3. **Import contract** (same interface as mock)
4. **Configure API client** (Grok SDK)
5. **Implement contract method** exactly
6. **Transform API response** to match contract (adapter pattern if needed)
7. **Handle errors** (network, API, validation)
8. **Implement retries** with exponential backoff
9. **Add to real service factory**
10. **Write integration test** with real API
11. **Test manually** with real API key
12. **Compare behavior** to mock (should be identical from UI perspective)

**Time estimate**: 1-2 hours per service

---

### Phase 5: Integration (Claude's Validation)

1. **Pre-flight checks**: All tests passing, no `any` types
2. **Switch factory**: `USE_MOCKS=false`
3. **Test complete flow** end-to-end
4. **If it breaks**: Run Emergency Protocols from AGENTS.md
5. **If it works**: Celebrate! (This should be 95%+ of the time)
6. **Update CHANGELOG.md**
7. **Commit with descriptive message**

**Time estimate**: 30 minutes if SDD followed correctly

---

## 🎯 Claude's Sprint Execution Strategy

### Sprint 1: Contracts & Mocks (Claude's Planning Sprint)

**Day 1**: Define all 7 seam contracts
- Use Claude's analytical abilities to identify all boundaries
- Spend time getting contracts right (they're immutable after this!)
- Ask user for clarification on any ambiguity

**Day 2-3**: Implement all mock services
- Use Claude's creativity for realistic mock data
- Make mocks educational (other developers learn from them)

**Day 4**: Write all tests
- Use Claude's thoroughness for comprehensive test coverage
- Test contracts, mocks, and mock behavior

**Day 5**: Validation and documentation
- Run full test suite
- Update SEAMSLIST.md
- Demo to user

---

### Sprint 2: UI Components (Claude's Iterative Sprint)

**Approach**: One component at a time, fully complete before moving to next

**For each component**:
1. Plan component structure (props, state, events)
2. Implement with TypeScript types
3. Test manually with mock service
4. Get user feedback
5. Iterate if needed
6. Move to next component

**Claude tip**: Don't build all components then test. Build → Test → Iterate per component.

---

### Sprint 3: Real Services (Claude's Precision Sprint)

**Critical**: This is where SDD proves itself

**Approach**: 
1. Implement real service matching contract exactly
2. Test against contract (should pass immediately if contract correct)
3. Switch from mock to real
4. Integration should work first try

**If integration fails**: 
- Don't panic
- Run Emergency Protocols
- Claude will systematically identify the issue
- Fix contract or implementation
- Integration will work after fix

---

## 🔧 Claude's Debugging Superpowers

When things go wrong, Claude's analytical approach shines:

### Debugging Protocol

1. **Read error message completely** - Don't skim
2. **Identify the seam** that's failing
3. **Check contract definition** - Is it clear and complete?
4. **Compare mock vs real** - Do both implement contract identically?
5. **Validate data shapes** - Use type guards to inspect runtime data
6. **Trace data flow** - Follow data from source to destination
7. **Identify root cause** - Contract issue or implementation issue?
8. **Propose fix with explanation** - Why did it break? How does fix prevent recurrence?

### Example: Claude Debugging a Contract Mismatch

```typescript
// Error: "Cannot read property 'cardName' of undefined"

// Claude's systematic analysis:

// 1. Error location: UI component trying to display card data
// 2. What's undefined?: response.data (should be CardPrompt[])
// 3. Check API response shape:
console.log(JSON.stringify(response, null, 2))
// Output: { success: true, data: null } // 🚨 data is null, not array!

// 4. Check contract:
interface ServiceResponse<T> {
  success: boolean
  data?: T  // Optional - can be undefined!
  error?: ServiceError
}

// 5. Root cause identified: Contract allows undefined data even on success
// 6. Two solutions:
//    A. Fix contract (breaking change - need v2)
//    B. Fix UI to handle undefined data

// 7. Claude's recommendation:
// Option B (non-breaking): Add null check in UI
if (response.success && response.data) {
  // Safe to use response.data
} else {
  // Handle missing data case
}

// 8. Future improvement: Contract v2 should enforce data exists when success=true
```

---

## 📚 Additional Resources for Claude

### When to Reference Each Doc:

- **Planning a new feature?** → Read PRD Sprint checklist for that sprint
- **Confused about SDD?** → Read seam-driven-development.md
- **Starting any task?** → Read AI-CHECKLIST.md for workflow
- **Need contract examples?** → Read contracts/types/common.ts
- **Integration failing?** → Read AGENTS.md Emergency Protocols
- **Forgot a pattern?** → Read lessonslearned.md (as it gets populated)

### Key Files Quick Reference:

```
📁 Essential Reading
├── CLAUDE.md (this file) ← Claude-specific guidance
├── AGENTS.md ← Universal AI instructions
├── seam-driven-development.md ← Full SDD methodology
├── AI-CHECKLIST.md ← Task workflows
├── prd.MD ← Requirements & sprint checklists
└── SEAMSLIST.md ← All seams (to be populated)

📁 Contracts
├── contracts/index.ts ← Barrel export
└── contracts/types/common.ts ← Shared types

📁 Services
├── services/factory.ts ← Service factory (USE_MOCKS toggle)
├── services/mock/ ← Mock implementations
└── services/real/ ← Real implementations

📁 Tests
├── tests/contracts/ ← Contract validation tests
├── tests/mocks/ ← Mock behavior tests
└── tests/integration/ ← Real API tests
```

---

## ✅ Claude's Pre-Task Checklist

Before starting ANY task, Claude should verify:

- [ ] I've read the user's request completely
- [ ] I understand which sprint this belongs to (check PRD)
- [ ] I've consulted AI-CHECKLIST.md for the workflow
- [ ] I've checked SEAMSLIST.md for existing seams
- [ ] I know if this requires a new contract or uses existing
- [ ] I have a clear plan (5-10 steps)
- [ ] I know how to validate success (tests, type check)
- [ ] I'm ready to ask clarifying questions if anything is unclear

---

## 🎉 Claude's Success Criteria

You're doing SDD correctly if:

- ✅ All contracts defined before implementation starts
- ✅ All mocks match contracts exactly (tests prove it)
- ✅ All real services match contracts exactly (tests prove it)
- ✅ No `any` types in codebase (`git grep "as any"` returns nothing)
- ✅ Integration works first try (95%+ success rate)
- ✅ SEAMSLIST.md is always up to date
- ✅ You can explain "why" for every design decision

---

## 🚀 Ready to Start!

Claude is now equipped to build TarotOutMyHeart using Seam-Driven Development!

**Remember**:
1. **Read first, code second** (use your large context window)
2. **Plan systematically** (your strength)
3. **Follow SDD strictly** (integration will work!)
4. **Ask when unclear** (better than guessing)
5. **Validate constantly** (npm run check, tests)

**Next Step**: Ask user what task to tackle first, or start with Sprint 1 Contract Definition!

---

*This file is specific to Claude AI. For universal instructions, see AGENTS.md. For Gemini-specific instructions, see GEMINI.md.*
