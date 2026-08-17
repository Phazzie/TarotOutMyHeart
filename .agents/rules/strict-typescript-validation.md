# Strict TypeScript Validation

When writing or refactoring TypeScript code, you MUST adhere to the following strict type safety rules. 

1. **NO TYPE ASSERTIONS**: You are strictly forbidden from using `as` casting (e.g., `as unknown`, `as HTMLElement`, `as MyType`).
   - *Exception*: `as const` is permitted for literal inference.
   - *Fix*: Use standard JavaScript runtime checks (e.g., `if (event.target instanceof HTMLInputElement)`) or write custom Type Guard predicates (`function isMyType(val: unknown): val is MyType`).
2. **NO NON-NULL ASSERTIONS**: You are strictly forbidden from using the `!` operator to bypass null checks (e.g., `data!.property`).
   - *Fix*: Use safe truthiness checks and early returns (e.g., `if (!data) throw new Error("Missing data");`).
3. **NO BLIND PARSING**: You must never blindly parse data from external boundaries (e.g., `JSON.parse(apiResponse) as MyType`).
   - *Fix*: Use Zod schemas (`Schema.parse()`) or rigorous Type Guards to validate the structural integrity of the parsed object before trusting its shape.
4. **NO LOOP INDEX COERCION**: You must not force array indices into branded types (e.g., `i as CardNumber`).
   - *Fix*: Create a bounds-checking type guard (`isCardNumber(num)`) and validate before assignment.
5. **NO FORCING SERVICE ERRORS IN UI**: You must not use `as` to coerce a generic service error into a typed enum in the UI (e.g., `error.code as MyErrorCode`).
   - *Fix*: This indicates a broken Service Contract. Go to the interface definitions and ensure the service explicitly guarantees the typed error object in its return signature.
6. **PLANNING IMPLICATION**: When tasked with implementing a new feature or service that handles external data or DOM events, you must explicitly declare how you will validate the data using Type Guards or schemas in your Implementation Plan *before* writing the code.
