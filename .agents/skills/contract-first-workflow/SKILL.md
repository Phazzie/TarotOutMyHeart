---
name: contract-first-workflow
description: Step-by-step workflow guide for implementing new features in TarotOutMyHeart using Seam-Driven Development (SDD), contract blueprints, mock validation, and TDD contract testing.
---

# Contract-First Development Workflow Skill

Use this skill whenever you are adding a new feature, API service, or data boundary to **TarotOutMyHeart**.

---

## 8-Step SDD Workflow

### Step 1: Identify Data Boundaries
- Map out the exact data inputs, transformations, and outputs before writing code.
- Ensure the boundary is listed in [`SEAMSLIST.md`](file:///C:/Users/shiva/.gemini/antigravity/scratch/tarotoutmyheart/SEAMSLIST.md).

### Step 2: Define frozen TypeScript Contract (`contracts/`)
- Define explicit TS interfaces, input types, and output types.
- Wrap all async returns in `Promise<ServiceResponse<T>>`.
- Ensure zero `any` types or loose `Record<string, any>` structures.

### Step 3: Write Contract Tests (`tests/contracts/`)
- Write unit/contract tests for success cases and error conditions using Vitest.
- Ensure test expectations reflect strict contract type guarantees.

### Step 4: Implement Mock Service (`services/mock/`)
- Create mock service returning realistic data matching the contract shape.
- Include realistic network delays (`setTimeout` / async promise delays).

### Step 5: Validate Mock Compilation
- Run `npm run check` to verify 0 TypeScript errors.
- Run `git grep "as any" services/mock/` to ensure zero type escapes.

### Step 6: Integrate with Factory (`services/factory.ts`)
- Register mock and real services in the factory module.
- Allow seamless switching via `USE_MOCKS=true|false`.

### Step 7: Build UI Component (`src/lib/components/`)
- Build Svelte 5 component using Runes (`$state`, `$derived`, `$effect`).
- Bind component to `appStore` or service factory instances.

### Step 8: Build Real API Service (`services/real/` & `src/routes/api/`)
- Implement live endpoint proxying to external LLM/Vision APIs.
- Handle PreMortem failure modes (`UNAUTHORIZED`, `INVALID_INPUT`, `API_ERROR`, `TIMEOUT`).
