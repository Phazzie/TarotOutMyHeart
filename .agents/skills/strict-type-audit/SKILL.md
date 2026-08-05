---
name: strict-type-audit
description: Audits the codebase for type assertions (as Type) and non-null assertions (!), and replaces them with strict Type Guards and Zod schemas.
---

# Strict Type Audit Skill

This skill is designed to help agents methodically hunt down and eliminate TypeScript shortcuts (`as Type` and `!`) from the codebase, replacing them with runtime-safe validation.

## When to use this skill
- When the user asks to "clean up type assertions" or "fix type escapes".
- When `eslint` fails due to `@typescript-eslint/consistent-type-assertions` or `@typescript-eslint/no-non-null-assertion`.
- As a final polish step before completing a feature in Seam-Driven Development.

## How to Execute the Audit

### Step 1: Discover Violations
Run the following `grep_search` patterns (or equivalent terminal commands) to find violations:
1. **Type Assertions**: Search for ` as [A-Z]` (e.g., ` as string`, ` as HTMLElement`).
   - *Note*: Ignore `as const` as it is permitted.
2. **Non-Null Assertions**: Search for `!\.` or `!\[` (e.g., `obj!.property`).
3. **Blind Parsing**: Search for `JSON.parse`.

### Step 2: Categorize and Fix
For each violation found, determine its category and apply the standard fix:

#### Category A: Blind Data Parsing
**Signature**: `JSON.parse(...) as Type`
**Fix**: 
- Import or create a Zod schema.
- Replace with `Schema.parse(JSON.parse(...))`.

#### Category B: DOM Event Coercion
**Signature**: `event.target as HTMLInputElement`
**Fix**:
- Add an early return runtime check.
- `if (!(event.target instanceof HTMLInputElement)) return;`

#### Category C: Enum/Union Coercion
**Signature**: `value as MyEnum`
**Fix**:
- Create a Type Guard function: 
  ```typescript
  function isMyEnum(val: unknown): val is MyEnum {
    return Object.values(MyEnum).includes(val as MyEnum);
  }
  ```
- Use the predicate to validate before assignment.

#### Category D: "Trust Me Bro" Non-Nulls
**Signature**: `data!.property`
**Fix**:
- Add safe truthiness checks:
  `if (!data) throw new Error("Missing data payload");`

#### Category E: Loop Index Coercion
**Signature**: `i as CardNumber`
**Fix**:
- Create a bounds-checking Type Guard:
  ```typescript
  function isCardNumber(num: number): num is CardNumber {
    return num >= 0 && num <= 21;
  }
  ```

#### Category F: Forcing Service Errors in Components
**Signature**: `result.error.code as ErrorCode`
**Fix**:
- **DO NOT** just patch the UI. This indicates a broken Service Contract.
- Go to the source interface (e.g., `contracts/ImageUpload.ts`) and ensure the return type specifically guarantees `error: { code: ErrorCode }` instead of a generic string.

### Step 3: Validate
Run `npm run check` and `npm run lint` to verify that all violations have been successfully replaced without breaking the build.
