# Svelte 5 Runes & State Management Rule

## Overview
This rule defines standard state management patterns for UI components and routes using Svelte 5 Runes in **TarotOutMyHeart**.

---

## ⚡ 1. Svelte 5 Runes Usage
- Use `$state()` for local component reactive state.
- Use `$derived()` for computed/derived values (auto-memoized).
- Use `$effect()` for side effects and DOM synchronization.
- **Do NOT** use legacy Svelte 4 store subscriptions (`writable`, `derived`, `subscribe`, `$store` syntax) inside UI components.

---

## 🏛️ 2. Clear State Boundaries

### Global Store (`appStore.svelte.ts`)
- Use `appStore` ONLY for cross-page persistent application state:
  - Reference images
  - Saved style preferences
  - 22 Major Arcana prompts list
  - Generated deck cards
  - Overall generation cost tracking

### Component-Local Runes (`Component.svelte`)
- Keep UI-only view state local to the component:
  - Active tab / selected card index
  - Lightbox open/close state
  - Local form validation error messages
  - Loading spinner states
