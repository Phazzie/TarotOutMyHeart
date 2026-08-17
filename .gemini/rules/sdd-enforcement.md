# Seam-Driven Development (SDD) Enforcement

This project strictly follows Seam-Driven Development. You must adhere to these boundaries.

## The Rules
1. **Terminology:** Always refer to it as "Seam-Driven Development". You are strictly forbidden from outputting the acronym "SDD".
2. **Contracts First:** You must NEVER write UI or service logic before the immutable TypeScript contracts are defined in `/contracts`.
3. **Immutability:** Once a contract is in use, it cannot be modified. You must create a new interface (e.g., `UserSeamV2`) if breaking changes are needed.
4. **Mock-First Dependency Injection:** All services must be injectable. Hard-coded class instantiations are forbidden. You must build and test the Mock Service before the Real Service.
5. **No Escape Hatches:** Manual data transformations (mapping `raw.user_id` to `id` without a formal adapter) are forbidden. Contract boundaries must be absolute.
