# TarotOutMyHeart - Gemini AI Instructions

**Model**: Gemini 2.0 Flash / Gemini 1.5 Pro  
**Purpose**: Complete AI agent instructions optimized for Gemini's capabilities  
**Last Updated**: 2025-11-07

---

## 🎯 Gemini-Specific Strengths for This Project

Gemini excels at:

- ✅ **Multimodal understanding** - Can analyze reference images for style guidance
- ✅ **Fast iteration** - Quick code generation and refinement cycles
- ✅ **Creative problem-solving** - Excellent for UI/UX design decisions
- ✅ **Code generation speed** - Rapid prototyping and mock data creation
- ✅ **Pattern recognition** - Identifies similar code patterns for consistency
- ✅ **Interactive development** - Great for back-and-forth refinement

---

## 📚 Required Reading (Speed Read Mode)

**Root Documentation** (Original scaffolding):

1. **THIS FILE** (GEMINI.md) - Gemini-specific guidance
2. **AGENTS.md** - Universal AI agent instructions (skim: Anti-patterns, Coding Standards)
3. **seam-driven-development.md** - SDD guide (skim: 8-step process)
4. **SEAMSLIST.md** - Defined seams (full read: 5 min)
5. **AI-CHECKLIST.md** - Pre-flight checklist (skim: your task type)
6. **prd.MD** - Product requirements (skim: User Flow, Seams List, Sprint Plan)

**Development Documents** (Planning folder): 7. **docs/planning/DATA-BOUNDARIES.md** - Data boundaries (skim: Primary Seams section) 8. **docs/planning/RECOMMENDATIONS.md** - Technical decisions (skim: Summary table)

**Speed reading time**: ~30 minutes | **Skipping penalty**: Rework loops

## 📂 Documentation Structure (Quick Reference)

**Root** = Original scaffolding (don't touch structure)  
**`/docs/planning/`** = Development docs (create new ones here)

- Data boundaries → `docs/planning/DATA-BOUNDARIES.md`
- Tech decisions → `docs/planning/RECOMMENDATIONS.md`
- Contract drafts → `docs/planning/` (future)
- Sprint notes → `docs/planning/` (future)

**Quick rule**: Root = read-only structure. Planning folder = your workspace.

---

## 📝 File Documentation (MANDATORY)

**Every file must start with this**:

```typescript
/**
 * @fileoverview [What this file does]
 * @purpose [Why it exists]
 * @dataFlow [How data flows through it]
 * @boundary [What seam it implements]
 */
```

**Blueprints** (copy and fill in):

- Contracts: `docs/blueprints/CONTRACT-BLUEPRINT.md`
- Services: `docs/blueprints/STUB-BLUEPRINT.md`
- Components: `docs/blueprints/COMPONENT-BLUEPRINT.md`

**NO FILE WITHOUT DOCUMENTATION**. See `lessonslearned.md` Section 8.

**CHANGELOG UPDATES**: Update `CHANGELOG.md` after every contract, service, or feature. Not at the end!

---

## 🚀 Quick Start for Gemini

### Your Rapid Development Workflow

1. **Understand the request** - What does the user want?
2. **Check AI-CHECKLIST.md** - Which workflow applies?
3. **Scan SEAMSLIST.md** - Any existing seams to reuse?
4. **Generate quickly** - Use Gemini's speed to create first draft
5. **Iterate fast** - Get user feedback, refine immediately
6. **Validate** - Run tests, type check, ensure contracts match
7. **Ship it** - Commit and move to next task

---

## ⚡ Gemini-Optimized Patterns for SDD

### Pattern 1: Rapid Contract Prototyping

Gemini's strength: Generate multiple contract options quickly

```typescript
/**
 * Gemini approach: Create 2-3 contract variations, let user choose
 */

// Option 1: Simple contract (MVP-focused)
export interface PromptGenerationInput {
  styleInputs: StyleInputs
  referenceImages: UploadedImage[]
}

// Option 2: Detailed contract (future-proofed)
export interface PromptGenerationInput {
  styleInputs: StyleInputs
  referenceImages: UploadedImage[]
  options?: {
    cardSelection?: number[] // Generate specific cards only
    styleIntensity?: number // 0-1 scale for style application
  }
}

// Recommendation: Start with Option 1, add Option 2 features in v2
```

**Why this works for Gemini**:

- Fast generation allows exploration
- User picks best fit for requirements
- Avoids over-engineering upfront

---

### Pattern 2: Quick Mock Data Generation

Gemini excels at creating varied, realistic mock data fast:

```typescript
/**
 * Gemini's rapid mock data approach:
 * - Generate diverse data sets quickly
 * - Create variations for testing different scenarios
 * - Use concise, readable code
 */

export class PromptGenerationMockService implements IPromptGenerationService {
  // Gemini: Quickly generate all 22 Major Arcana cards
  private readonly CARDS = [
    { num: 0, name: 'The Fool', meaning: 'New beginnings' },
    { num: 1, name: 'The Magician', meaning: 'Manifestation' },
    { num: 2, name: 'The High Priestess', meaning: 'Intuition' },
    { num: 3, name: 'The Empress', meaning: 'Abundance' },
    { num: 4, name: 'The Emperor', meaning: 'Authority' },
    { num: 5, name: 'The Hierophant', meaning: 'Tradition' },
    { num: 6, name: 'The Lovers', meaning: 'Choices' },
    { num: 7, name: 'The Chariot', meaning: 'Determination' },
    { num: 8, name: 'Strength', meaning: 'Inner power' },
    { num: 9, name: 'The Hermit', meaning: 'Introspection' },
    { num: 10, name: 'Wheel of Fortune', meaning: 'Destiny' },
    { num: 11, name: 'Justice', meaning: 'Fairness' },
    { num: 12, name: 'The Hanged Man', meaning: 'Surrender' },
    { num: 13, name: 'Death', meaning: 'Transformation' },
    { num: 14, name: 'Temperance', meaning: 'Balance' },
    { num: 15, name: 'The Devil', meaning: 'Temptation' },
    { num: 16, name: 'The Tower', meaning: 'Upheaval' },
    { num: 17, name: 'The Star', meaning: 'Hope' },
    { num: 18, name: 'The Moon', meaning: 'Illusion' },
    { num: 19, name: 'The Sun', meaning: 'Joy' },
    { num: 20, name: 'Judgement', meaning: 'Reflection' },
    { num: 21, name: 'The World', meaning: 'Completion' },
  ]

  async generatePrompts(input: PromptGenerationInput): Promise<ServiceResponse<CardPrompt[]>> {
    // Gemini: Quick validation
    if (!input.styleInputs.theme) {
      return {
        success: false,
        error: { code: 'MISSING_THEME', message: 'Theme is required', retryable: false },
      }
    }

    // Gemini: Simulate API delay
    await new Promise(r => setTimeout(r, 1500))

    // Gemini: Generate prompts fast
    const prompts = this.CARDS.map(card => ({
      cardNumber: card.num,
      cardName: card.name,
      traditionalMeaning: card.meaning,
      generatedPrompt:
        `${input.styleInputs.theme} tarot card for ${card.name}, ` +
        `${input.styleInputs.tone} tone, ${input.styleInputs.description}`,
      timestamp: new Date().toISOString(),
    }))

    return { success: true, data: prompts }
  }
}
```

**Why this works for Gemini**:

- Concise code, fast to generate
- Easy to modify and iterate
- Provides realistic data immediately

---

### Pattern 3: Multimodal Analysis for Reference Images

Gemini's unique capability: Analyze uploaded reference images

```typescript
/**
 * Gemini can potentially analyze reference images to:
 * - Extract color palettes
 * - Identify art styles
 * - Suggest prompt enhancements
 *
 * Note: Check if your Gemini API key supports vision capabilities
 */

async function analyzeReferenceImages(images: UploadedImage[]): Promise<StyleAnalysis> {
  // Gemini vision API could analyze:
  // - Dominant colors
  // - Art style (watercolor, digital, pencil, etc.)
  // - Composition patterns
  // - Visual themes

  // For MVP: This is optional enhancement
  // Focus on text-based generation first

  return {
    dominantColors: ['#1a1a2e', '#16213e', '#0f3460'],
    detectedStyle: 'cyberpunk digital art',
    suggestions: [
      'Strong contrast between neon and dark backgrounds',
      'Geometric shapes and angular designs',
      'Glowing elements and light effects',
    ],
  }
}
```

**Why this is powerful for Gemini**:

- Unique multimodal advantage
- Can enhance prompt generation quality
- Phase 2 feature, but Gemini is uniquely suited for it

---

## 🎓 Gemini Best Practices for This Project

### 1. **Iterate Quickly**

- **Do**: Generate first draft fast, refine based on feedback
- **Why**: Gemini's speed enables rapid iteration
- **Result**: Faster development cycles

### 2. **Use Concise Code**

- **Do**: Favor readable, compact code over verbose
- **Why**: Easier to generate, review, and modify quickly
- **Result**: Maintainable codebase

### 3. **Generate Multiple Options**

- **Do**: Offer 2-3 solutions when requirements are ambiguous
- **Why**: User picks best fit, saves time on rewrites
- **Result**: Right solution faster

### 4. **Leverage Creativity for UI**

- **Do**: Use Gemini's creative abilities for component design
- **Why**: UI/UX benefits from creative problem-solving
- **Result**: Polished, user-friendly interfaces

### 5. **Fast Validation Loops**

- **Do**: Run `npm run check` frequently (every few changes)
- **Why**: Catch errors early before they compound
- **Result**: Less time debugging, more time building

### 6. **Interactive Development**

- **Do**: Work in small increments with user feedback
- **Why**: Aligns with Gemini's interactive strengths
- **Result**: User gets exactly what they want

---

## 🚫 Common Gemini Pitfalls (Avoid These!)

### Pitfall 1: Moving Too Fast (Skipping Contracts)

**Problem**: Gemini's speed can lead to coding before contracts are defined

**Temptation**:

> "I can generate this component quickly, then define the contract later!"

**Why it's bad**: Violates SDD, leads to integration failures

**Solution**:

- ✅ **Always define contracts first** (even if you can code faster)
- ✅ Follow Sprint 1 checklist: Contracts → Mocks → UI → Real Services
- ✅ Speed is good, but only after contracts are locked in

---

### Pitfall 2: Over-Relying on Code Generation (Forgetting Tests)

**Problem**: Fast code generation, but tests lag behind

**Temptation**:

> "Let me generate all components first, then write tests"

**Why it's bad**: Bugs accumulate, harder to debug later

**Solution**:

- ✅ **Write tests immediately after each piece** (contract tests, mock tests)
- ✅ Use Gemini's speed to generate tests quickly too
- ✅ Test-driven development still applies

---

### Pitfall 3: Creating Too Many Variations

**Problem**: Gemini generates 5 different approaches, causing confusion

**Example**:

> "Here are 5 different ways to structure this component..."

**Why it's bad**: Analysis paralysis, user overwhelmed

**Solution**:

- ✅ **Limit to 2-3 options max** (more than that, make a recommendation)
- ✅ If PRD is clear, just implement that (don't over-explore)
- ✅ Save creativity for truly ambiguous situations

---

### Pitfall 4: Concise to a Fault (Missing Important Details)

**Problem**: Code is too compact, missing error handling or edge cases

**Example**:

```typescript
// ❌ Too concise, missing error handling
async function loadData() {
  return await api.fetch() // What if it fails?
}
```

**Better approach**:

```typescript
// ✅ Concise but complete
async function loadData(): Promise<ServiceResponse<Data>> {
  try {
    const data = await api.fetch()
    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error: { code: 'FETCH_FAILED', message: 'Failed to load data', retryable: true },
    }
  }
}
```

**Solution**: Concise is good, but don't skip critical error handling

---

## 🧪 Gemini-Specific Testing Patterns

### Pattern: Rapid Test Generation

Gemini can generate tests as fast as code:

```typescript
// Gemini: Generate test alongside implementation

// Component
export function CardGallery({ cards }: { cards: Card[] }) {
  if (cards.length === 0) return <p>No cards yet</p>
  return <div className="grid">{cards.map(c => <Card key={c.id} card={c} />)}</div>
}

// Test (generated immediately after)
describe('CardGallery', () => {
  it('shows empty state when no cards', () => {
    const { getByText } = render(<CardGallery cards={[]} />)
    expect(getByText('No cards yet')).toBeInTheDocument()
  })

  it('renders all cards in grid', () => {
    const mockCards = [
      { id: '1', name: 'The Fool', image: 'url1' },
      { id: '2', name: 'The Magician', image: 'url2' }
    ]
    const { container } = render(<CardGallery cards={mockCards} />)
    expect(container.querySelectorAll('.grid > *')).toHaveLength(2)
  })
})

// Gemini tip: Generate tests in same session as code
// This ensures tests match implementation immediately
```

---

## 🔄 Gemini's Fast-Paced SDD Workflow

### Sprint 1: Contracts & Mocks (Gemini's Speed Sprint)

**Day 1**: Define contracts rapidly

- Generate 2-3 contract options per seam
- User picks best fit
- Lock in contracts quickly

**Day 2**: Mock services blitz

- Generate all 7 mock services in one session
- Use Gemini's speed for realistic mock data
- Aim for 2-3 mocks per hour

**Day 3**: Test generation sprint

- Write all contract tests
- Write all mock tests
- Run full test suite

**Day 4-5**: Iteration and refinement

- Fix any test failures
- Refine mock data quality
- Update documentation

---

### Sprint 2: UI Components (Gemini's Creative Sprint)

**Approach**: Rapid prototyping with quick user feedback

**For each component**:

1. Generate initial version (15-30 min)
2. Show to user for feedback
3. Iterate quickly based on feedback (5-10 min per iteration)
4. Move to next component

**Gemini advantage**: 3-4 components per day vs 1-2 with slower iteration

---

### Sprint 3: Real Services (Gemini's Integration Sprint)

**Approach**: Generate real services quickly, then validate thoroughly

**For each service**:

1. Generate real service matching contract (30-45 min)
2. Run contract tests (should pass immediately)
3. Test with real API manually
4. Fix any issues discovered
5. Switch from mock to real

**Gemini tip**: Don't rush integration testing - speed is in generation, not validation

---

## 🎨 Gemini's UI/UX Patterns

### Pattern: Component Design Iterations

Gemini excels at rapid UI variations:

```svelte
<!-- Version 1: Basic card display -->
<div class="card">
  <img src={card.image} alt={card.name} />
  <h3>{card.name}</h3>
</div>

<!-- Version 2: Enhanced with hover effects -->
<div class="card group hover:shadow-lg transition-shadow">
  <div class="relative">
    <img src={card.image} alt={card.name} class="w-full" />
    <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
      <button class="absolute top-2 right-2">Download</button>
    </div>
  </div>
  <h3 class="mt-2 font-semibold">{card.name}</h3>
  <p class="text-sm text-gray-600">{card.meaning}</p>
</div>

<!-- Version 3: With loading state and error handling -->
<div class="card">
  {#if loading}
    <div class="skeleton animate-pulse bg-gray-200 h-64" />
  {:else if error}
    <div class="error-state">
      <p>Failed to load card</p>
      <button on:click={retry}>Retry</button>
    </div>
  {:else}
    <img src={card.image} alt={card.name} />
    <h3>{card.name}</h3>
    <p>{card.meaning}</p>
  {/if}
</div>

<!-- Gemini: Generate all 3, show user, iterate on chosen version -->
```

---

## 🔧 Gemini's Quick Debugging Approach

When something breaks:

### Fast Debugging Protocol

1. **Identify error quickly** - What's the error message?
2. **Check most likely cause** - 80% of errors are type mismatches or missing data
3. **Generate fix** - Use Gemini's speed to try solution
4. **Test immediately** - Did it work?
5. **If not, try next solution** - Iterate fast

### Example: Gemini Fixing a Type Error

```typescript
// Error: "Type 'string | undefined' is not assignable to type 'string'"

// Quick analysis:
// - Variable can be undefined
// - TypeScript expects it to always have value

// Solution 1 (fastest):
const theme = input.styleInputs.theme ?? 'default'

// Solution 2 (stricter):
if (!input.styleInputs.theme) {
  throw new Error('Theme is required')
}
const theme = input.styleInputs.theme

// Gemini: Try Solution 1 first (non-breaking), fall back to 2 if needed
```

---

## 📚 Gemini's Quick Reference Guide

### Sprint Checklists

**Sprint 1 Checklist** (Contracts & Mocks):

- [ ] All 7 contracts defined in `contracts/`
- [ ] All contracts exported from `contracts/index.ts`
- [ ] All 7 mocks implemented in `services/mock/`
- [ ] All mocks added to `services/factory.ts`
- [ ] All contract tests written and passing
- [ ] All mock tests written and passing
- [ ] SEAMSLIST.md fully populated
- [ ] `npm run check` passes (no type errors)

**Sprint 2 Checklist** (UI Components):

- [ ] All components built and typed
- [ ] All components use mock services
- [ ] All async states handled (loading, success, error)
- [ ] Mobile responsive
- [ ] Manual testing completed
- [ ] User feedback incorporated

**Sprint 3 Checklist** (Real Services):

- [ ] All real services implemented
- [ ] All services match contracts exactly
- [ ] Integration tests written
- [ ] Switch to `USE_MOCKS=false`
- [ ] End-to-end testing passed

**Sprint 4 Checklist** (Polish & Deploy):

- [ ] Error handling polished
- [ ] Loading states smooth
- [ ] Security audit passed
- [ ] Performance optimized
- [ ] Deployed to Vercel
- [ ] Production testing passed

---

### Key Commands

```bash
# Development
npm run dev                  # Start dev server

# Validation
npm run check               # Type check (run frequently!)
npm run lint                # Lint code
npm run format              # Format code

# Testing
npm test                    # All tests
npm run test:contracts      # Contract tests only
npm run test:mocks          # Mock tests only
npm run test:integration    # Real API tests

# Quick validation loop (use this often!)
npm run check && npm test   # Type check + tests
```

---

### File Locations Quick Reference

```
contracts/[Feature].ts       → Contract definitions
services/mock/[Feature]Mock.ts → Mock implementations
services/real/[Feature]Service.ts → Real implementations
services/factory.ts          → Service factory (USE_MOCKS toggle)
tests/contracts/[Feature].test.ts → Contract tests
tests/mocks/[Feature].test.ts → Mock tests
tests/integration/[Feature].test.ts → Integration tests
src/lib/components/         → Svelte components
src/routes/                 → SvelteKit pages
```

---

## ✅ Gemini's Pre-Task Speed Check

Before starting (quick version):

- [ ] Read user request
- [ ] Check which sprint/workflow in AI-CHECKLIST.md
- [ ] Scan SEAMSLIST.md for existing seams
- [ ] Know if contracts exist or need to be created
- [ ] Ready to generate fast!

---

## 🎯 Gemini's Rapid Success Criteria

You're doing SDD correctly if:

- ✅ Generating code quickly BUT following SDD process
- ✅ Contracts defined before implementation
- ✅ Tests written alongside code (not later)
- ✅ Iterating based on user feedback
- ✅ No `any` types anywhere
- ✅ All validations passing frequently
- ✅ Moving fast without breaking things

---

## 🚀 Ready for Speed!

Gemini is now equipped to rapidly build TarotOutMyHeart using Seam-Driven Development!

**Gemini's Superpowers**:

1. **Generate fast** (your strength)
2. **Iterate quickly** (embrace feedback)
3. **Follow SDD strictly** (speed + structure = success)
4. **Test continuously** (fast tests = fast confidence)
5. **Stay creative** (especially for UI/UX)

**Your Workflow**:

1. Quick scan of docs (you're fast at reading too!)
2. Rapid generation of first draft
3. Fast validation (tests, type check)
4. Quick iteration on feedback
5. Move to next task

**Next Step**: Ask user what to build first, or dive into Sprint 1!

---

## 💡 Gemini Pro Tips

### Tip 1: Batch Similar Tasks

- Generate all 7 mock services in one session
- Write all tests for a component in one go
- Faster context switching = faster development

### Tip 2: Use Templates

- Create component template once, reuse for similar components
- Create test template once, adapt for each service
- Don't reinvent patterns every time

### Tip 3: Leverage Your Speed for Exploration

- Try 2 approaches quickly, pick better one
- Generate variations for user to choose from
- Rapid prototyping is your advantage

### Tip 4: Quick Validation Cycles

- Generate code → `npm run check` → fix → repeat
- Fast loops catch errors before they accumulate
- Aim for validation every 10-15 minutes

### Tip 5: Document as You Go (Fast!)

- Add JSDoc comments while generating code
- Update SEAMSLIST.md as you define seams
- Fast documentation = no backlog later

---

_This file is specific to Gemini AI. For universal instructions, see AGENTS.md. For Claude-specific instructions, see CLAUDE.md._
