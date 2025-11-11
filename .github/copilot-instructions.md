# GitHub Copilot Instructions - TarotOutMyHeart

## Project Summary

Major Arcana tarot deck generator built with SvelteKit and TypeScript. Users upload reference images and define style parameters, then AI (Grok) generates 22 unique card designs. Uses Seam-Driven Development (SDD) methodology for contract-first development.

## Tech Stack

- **Framework**: SvelteKit 2.x
- **Language**: TypeScript (strict mode)
- **AI**: Grok (X.AI) - grok-4-fast-reasoning, grok-image-generator
- **Deployment**: Vercel
- **Testing**: Vitest
- **Node**: 20.x

## Critical: Seam-Driven Development

This project follows SDD methodology. **Key principle**: Define contracts before code.

### Contract Rules

1. All contracts in `/contracts` directory
2. **NEVER modify existing contracts** - create v2 instead
3. No `any` types - use `unknown` and validate
4. All contracts must have corresponding mocks in `/services/mock`
5. Real services in `/services/real` must match contracts exactly

### Before Writing Code

```typescript
// ✅ CORRECT: Import contract first
import type { UserSeam } from '$contracts/User'

function processUser(user: UserSeam) {
  // Implementation
}

// ❌ WRONG: Defining types inline
function processUser(user: { id: string; name: string }) {
  // Should use contract type
}
```

### 🚨 CRITICAL: Mock Validation (Phase 3)

**Mock services are NOT complete until they pass validation.** This is the #1 cause of SDD failures.

#### Required Validation Steps:

```bash
# After creating/editing ANY mock service file:
npm run check                          # MUST pass with 0 errors
git grep "as any" services/mock/       # MUST return nothing

# Before marking Phase 3 "complete":
npm run check                          # Final verification
npm run test:contracts                 # If tests exist, must pass
```

#### Mock Completion Checklist:

A mock is complete when ALL of these are true:
- [ ] Implements the contract interface EXACTLY
- [ ] `npm run check` passes with 0 TypeScript errors
- [ ] No `as any` type escapes
- [ ] All interface methods implemented
- [ ] Return types match contract exactly
- [ ] No extra fields in outputs
- [ ] No missing required fields
- [ ] Returns realistic mock data
- [ ] Includes delay simulation (100-300ms)

#### Common Mock Errors:

```typescript
// ❌ WRONG: Enum imported as type but used as value
import type { ErrorCode } from '$contracts/Feature'
return { code: ErrorCode.INVALID }  // ERROR!

// ✅ CORRECT: Import enums without 'type'
import { ErrorCode } from '$contracts/Feature'
return { code: ErrorCode.INVALID }  // Works!

// ❌ WRONG: Missing required interface methods
class FeatureMock implements IFeatureService {
  method1() { }  // Missing method2, method3
}

// ✅ CORRECT: All methods implemented
class FeatureMock implements IFeatureService {
  method1() { }
  method2() { }
  method3() { }
}

// ❌ WRONG: Fields don't match contract
interface Output { userId: string }
return { user_id: '123' }  // Wrong field name!

// ✅ CORRECT: Exact field match
return { userId: '123' }
```

#### Why This Matters:

- **UI development blocked**: TypeScript errors prevent compilation
- **Integration will fail**: Mock shape ≠ contract shape ≠ real service shape
- **SDD promise broken**: "Integration works first try" only works if mocks match contracts
- **Wasted time**: Fixing 100+ type errors after the fact takes longer than validating as you go

**Rule**: If `npm run check` fails, the mock is NOT done. Fix it immediately, don't proceed.

## TypeScript Standards

### Strict Mode Compliance

```typescript
// ✅ CORRECT: Explicit types
const cards: MajorArcanaCard[] = getCards()

// ❌ WRONG: Implicit any
const cards = getCards() // Type unclear

// ✅ CORRECT: Type guards
function isUser(value: unknown): value is UserSeam {
  return typeof value === 'object' && value !== null && 'id' in value
}

// ❌ WRONG: Using 'any'
function isUser(value: any): boolean {
  return value.id !== undefined
}

// ✅ CORRECT: Optional chaining
const email = user?.profile?.email

// ✅ CORRECT: Nullish coalescing
const name = user.name ?? 'Unknown'

// ✅ CORRECT: Non-null assertion (only when certain)
const element = document.getElementById('app')!
```

### No Type Escapes

```typescript
// ❌ FORBIDDEN: 'any' type
const data: any = response

// ❌ FORBIDDEN: 'as' without validation
const user = data as UserSeam

// ✅ CORRECT: Validate then narrow
if (isValidUser(data)) {
  const user: UserSeam = data // Type is proven
}
```

## SvelteKit Conventions

### Path Aliases

```typescript
// ✅ CORRECT: Use aliases
import { formatDate } from '$lib/utils/date'
import type { CardSeam } from '$contracts/Card'
import { cardService } from '$services/factory'

// ❌ WRONG: Relative paths
import { formatDate } from '../../lib/utils/date'
import type { CardSeam } from '../../../contracts/Card'
```

### File Naming

```
+page.svelte        // Route page component
+page.server.ts     // Server-side data loading
+layout.svelte      // Layout component
+layout.server.ts   // Layout server code
+server.ts          // API endpoint
+error.svelte       // Error page
```

### Data Loading

```typescript
// ✅ CORRECT: Server-side load
// +page.server.ts
export async function load({ params }) {
  const data = await service.getData(params.id)
  return { data }
}

// +page.svelte
<script lang="ts">
  export let data
</script>

// ❌ WRONG: Mixing server/client
// +page.svelte
<script lang="ts">
  import { onMount } from 'svelte'
  onMount(async () => {
    // Avoid this - use load function instead
    const data = await serverFunction()
  })
</script>
```

## Code Style Preferences

### Variable Declarations

```typescript
// ✅ Prefer const
const cards = getCards()

// ✅ Use let when reassignment needed
let count = 0
count++

// ❌ NEVER use var
var x = 10 // Forbidden
```

### Function Style

```typescript
// ✅ CORRECT: Named functions for clarity
function generatePrompt(card: MajorArcanaCard): string {
  return `Generate ${card.name}`
}

// ✅ CORRECT: Arrow functions for callbacks
const names = cards.map(card => card.name)

// ✅ CORRECT: Async/await over promises
async function fetchData() {
  const data = await api.fetch()
  return data
}

// ❌ AVOID: Unnecessary promise chains
function fetchData() {
  return api.fetch().then(data => data)
}
```

### Error Handling

```typescript
// ✅ CORRECT: Specific error types
try {
  await api.call()
} catch (error) {
  if (error instanceof ApiError) {
    handleApiError(error)
  } else {
    throw error
  }
}

// ❌ WRONG: Swallowing errors
try {
  await api.call()
} catch {
  // Silent failure
}
```

## Testing Patterns

### Contract Tests

```typescript
// ✅ CORRECT: Test mock matches contract
import { describe, it, expect } from 'vitest'
import type { UserSeam } from '$contracts/User'
import { mockUserService } from '$services/mock/UserMock'

describe('UserSeam Contract', () => {
  it('mock returns valid UserSeam', async () => {
    const user = await mockUserService.getUser('1')

    expect(user).toHaveProperty('id')
    expect(user).toHaveProperty('name')
    expect(typeof user.id).toBe('string')
    expect(typeof user.name).toBe('string')
  })
})
```

### Component Tests

```typescript
// ✅ CORRECT: Test with mocks
import { render } from '@testing-library/svelte'
import CardDisplay from '$lib/components/CardDisplay.svelte'
import { mockCard } from '$lib/test-utils/fixtures'

it('renders card name', () => {
  const { getByText } = render(CardDisplay, { card: mockCard })
  expect(getByText(mockCard.name)).toBeInTheDocument()
})
```

## Svelte Component Patterns

### Props and Types

```svelte
<!-- ✅ CORRECT: Typed props -->
<script lang="ts">
  import type { MajorArcanaCard } from '$contracts/MajorArcana'

  export let card: MajorArcanaCard
  export let onSelect: (card: MajorArcanaCard) => void
</script>

<!-- ❌ WRONG: Untyped props -->
<script>
  export let card
  export let onSelect
</script>
```

### Reactivity

```svelte
<script lang="ts">
  export let count: number

  // ✅ CORRECT: Reactive statement
  $: doubled = count * 2

  // ✅ CORRECT: Reactive block
  $: {
    console.log(`Count is ${count}`)
  }
</script>
```

### Event Handling

```svelte
<script lang="ts">
  import { createEventDispatcher } from 'svelte'

  const dispatch = createEventDispatcher<{ select: MajorArcanaCard }>()

  function handleClick() {
    dispatch('select', card)
  }
</script>

<button on:click={handleClick}>Select</button>
```

## Common Patterns

### Service Factory Pattern

```typescript
// ✅ CORRECT: Use factory for mocks
import { userService } from '$services/factory'

async function loadUser(id: string) {
  return await userService.getUser(id)
}

// Factory handles mock vs real based on USE_MOCKS flag
```

### Async State Management

```typescript
// ✅ CORRECT: Handle all async states
interface AsyncState<T> {
  loading: boolean
  data?: T
  error?: Error
}

let state: AsyncState<User> = { loading: true }

async function loadData() {
  state = { loading: true }
  try {
    const data = await service.getData()
    state = { loading: false, data }
  } catch (error) {
    state = { loading: false, error: error as Error }
  }
}
```

### Form Handling

```typescript
// ✅ CORRECT: Validate with type guards
function validateForm(data: unknown): data is FormData {
  return (
    typeof data === 'object' && data !== null && 'email' in data && typeof data.email === 'string'
  )
}

async function handleSubmit(event: SubmitEvent) {
  event.preventDefault()
  const formData = new FormData(event.target as HTMLFormElement)

  if (validateForm(formData)) {
    await submitForm(formData)
  }
}
```

## File Organization

### Component Structure

```
src/lib/components/
  Card/
    Card.svelte           // Main component
    CardImage.svelte      // Subcomponent
    CardPrompt.svelte     // Subcomponent
    index.ts              // Barrel export
```

### Contract Organization

```
contracts/
  types/
    common.ts            // Shared types
    majorArcana.ts       // Major Arcana types
  ImageUpload.ts         // Image upload seam
  PromptGeneration.ts    // Prompt generation seam
  index.ts               // Barrel export
```

## What NOT to Do

### Anti-Patterns

```typescript
// ❌ Modifying contracts
// NEVER edit files in /contracts once implementation starts

// ❌ Using 'any'
const data: any = response

// ❌ Type assertions without validation
const user = data as UserSeam

// ❌ Mixing concerns in contracts
interface UserAndOrdersSeam {
  user: User
  orders: Order[]
}

// ❌ Optional everything
interface DataSeam {
  id?: string
  name?: string
  email?: string
}

// ❌ Relative imports when aliases exist
import { utils } from '../../lib/utils'

// ❌ Inline styles in Svelte
<div style="color: red">  <!-- Use classes -->
```

## Environment Variables

```typescript
// ✅ CORRECT: Type environment variables
import { env } from '$env/dynamic/private'

const apiKey: string = env.XAI_API_KEY || ''

// ✅ CORRECT: Public env vars
import { env as publicEnv } from '$env/static/public'

const appUrl: string = publicEnv.PUBLIC_APP_URL
```

## Key Commands

```bash
# Type checking (run frequently)
npm run check

# Tests
npm test
npm run test:contracts
npm run test:mocks

# Lint and format
npm run lint
npm run format
```

## Remember

1. **Contracts first** - Never code before defining contracts
2. **Mock first** - Build UI against mocks
3. **Type safety** - No `any`, no unsafe assertions
4. **Path aliases** - Always use `$lib`, `$contracts`, `$services`
5. **Test contracts** - Mocks must match contracts exactly
6. **Documentation** - Update SEAMSLIST.md when adding seams

## Documentation Structure

### Root Files (Original Scaffolding)
- `/AGENTS.md` - Complete AI agent instructions
- `/seam-driven-development.md` - SDD methodology
- `/SEAMSLIST.md` - Project seams catalog
- `/prd.MD` - Product requirements
- `/lessonslearned.md` - Project insights

### Development Documents
All new planning documents go in `/docs/planning/`:
- `docs/planning/DATA-BOUNDARIES.md` - Data boundary analysis
- `docs/planning/RECOMMENDATIONS.md` - Technical decisions
- Future: Contract drafts, diagrams, retrospectives

**Rule**: Root = original structure. Planning folder = development workspace.
