---
name: seam-driven-work-scoping
description: Guides agents through scoping out complex feature work, refactors, or bug fixes under Seam-Driven Development before writing implementation code.
---

# Seam-Driven Work Scoping Skill

This skill provides a systematic process for researching, defining, and scoping out work in an `implementation_plan.md` artifact before writing any feature or service code.

## When to use this skill
- When starting any non-trivial feature, seam implementation, or refactor.
- When the user asks to "plan", "scope", or "architect" upcoming work.
- Whenever entering Planning Mode.

---

## 5-Step Scoping Protocol

### Step 1: Research & Discovery (Delegate to Subagents if Needed)
Before creating a plan, thoroughly inspect the codebase:
- **Contract Inspection**: Read `/contracts/[Feature].ts` to understand existing interfaces.
- **Seam Check**: Check `/SEAMSLIST.md` to see if the seam is already registered or requires a v2 contract.
- **Subagent Utilization**: If research requires searching multiple files or running exploratory tests, spawn a `research` subagent to gather findings without cluttering the main conversation window.

### Step 2: Define Validation Strategy (Zero Shortcuts Policy)
Explicitly declare how external/untrusted data will be validated without using `as Type` casting or `!` non-null assertions:
- **Form Inputs / LocalStorage / API Responses**: Specify the exact Zod schema or Type Guard function (`isMyType(val)`) that will validate the payload.
- **DOM Event Targets**: Specify `instanceof` checks (e.g., `event.target instanceof HTMLInputElement`).
- **Nominal Types**: Specify brand constructors (e.g., `createImageId(id)` from `$lib/utils/types.ts`).

### Step 3: Map Out File Changes
Group proposed file modifications logically and tag each file basename explicitly:
- `#### [NEW] filename.ts` - New files to be created.
- `#### [MODIFY] filename.ts` - Existing files to be modified.
- `#### [DELETE] filename.ts` - Files to be deleted.

Under each file heading, detail the exact functions, methods, or components changing.

### Step 4: Define Error Handling & State Transitions
- List all `ErrorCode` enums returned by services or proxies.
- Describe how `loading`, `success`, and `error` states are managed cleanly in Svelte components.

### Step 5: Establish Verification Criteria
Detail the automated test commands that must be executed upon completion:
- `npm run check` (SvelteKit type check)
- `npm run lint` (ESLint strict check)
- `npm run test:all` (Contract, Mock, Integration, and Real service test suites)

---

## Plan Template Structure

When creating the `implementation_plan.md` artifact, follow this structure:

```markdown
# Implementation Plan - [Goal Description]

## User Review Required
> [!IMPORTANT]
> [Highlight key architectural decisions or breaking contract considerations]

## Proposed Changes

### [Component / Layer Name]
#### [NEW] [file.ts](file:///path/to/file.ts)
#### [MODIFY] [file.ts](file:///path/to/file.ts)

## Validation Strategy
- [Detail Type Guards, Zod schemas, or instanceof checks]

## Verification Plan
- [List test commands]
```
