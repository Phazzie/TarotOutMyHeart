# SDD Quality Gates & Strict Type Safety Rule

## Overview
This rule enforces strict quality gates and type safety across all contract, mock, and service implementations in the **TarotOutMyHeart** repository.

---

## 🚫 1. Zero Type Escapes (No `as any`)
- **Strict Prohibition**: Using `as any`, `(window as any)`, or `(response as any)` to bypass TypeScript checks or satisfy tests is **STRICTLY PROHIBITED**.
- **Rationale**: Type escapes obscure structural mismatches between contracts, mocks, and real services, leading to runtime failures during live integration.
- **Verification Command**:
  ```bash
  git grep "as any" contracts/ services/ src/
  ```
  *Result MUST be empty before marking any task complete.*

---

## 🛑 2. Mandatory Validation Gate Before Task Completion
No feature, contract, mock, or service may be marked as "Complete" or committed without running static type checking and contract tests.

### Verification Checklist:
- [ ] Run `npm run check` - **Must pass with 0 errors and 0 warnings**.
- [ ] Run `npm run test:contracts` - All contract tests must pass.
- [ ] Verify mock data matches the exact TypeScript contract interface shape.
- [ ] Ensure all required fields exist and return types use the `ServiceResponse<T>` pattern.

---

## 📦 3. Normalized Service Response Pattern
All service methods (mock and real) must return structural `ServiceResponse<T>` discriminated unions:

```typescript
type ServiceResponse<T> =
  | { success: true; data: T; error?: never }
  | { success: false; error: ServiceError; data?: never };
```
*Never return `success: false` with a populated `data` object, or `success: true` with a `ServiceError`.*
