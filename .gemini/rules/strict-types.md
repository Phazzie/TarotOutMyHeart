# Strict Type Validation

This project enforces absolute TypeScript strictness. You are forbidden from bypassing the type checker.

## The Rules
1. **Never use `as any` or `any`.** If you use it, your code will be rejected by the Invisible Auditor.
2. **Never use Non-Null Assertions (`!`).** Do not write `response.data!.card`. You must use safe truthiness checks (e.g., `if (!response.data) throw new Error(...)`).
3. **No Blind JSON Parsing:** You must validate parsed JSON using a Zod schema or a custom Type Guard predicate (e.g., `if (!isUserSeam(parsed)) throw Error`). `JSON.parse(raw) as Type` is strictly forbidden.
4. **No Sloppy Coercion:** Do not force DOM event targets or enums (e.g., `event.target as HTMLInputElement`). You must use `instanceof` runtime checks.
