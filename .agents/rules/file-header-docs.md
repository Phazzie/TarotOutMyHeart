# Mandatory File Header Documentation Rule

## Overview
Every TypeScript (`.ts`), Svelte (`.svelte`), and Server (`+server.ts`) file created in **TarotOutMyHeart** must include standard top-level JSDoc metadata header comments.

---

## 📝 Required Header Format

```typescript
/**
 * @fileoverview [One-line summary of file purpose]
 *
 * PURPOSE:
 * [2-3 sentences explaining why this file exists and its role in the application]
 *
 * DATA FLOW:
 * Input: [What data enters this file and from where]
 * Transform: [What logic or transformations are applied]
 * Output: [What data or events are emitted]
 *
 * DEPENDENCIES:
 * - Depends on: [Key imports or contracts]
 * - Used by: [UI pages, routes, or factories consuming this file]
 *
 * @boundary [Seam name from SEAMSLIST.md]
 */
```
