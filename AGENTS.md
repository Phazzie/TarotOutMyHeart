# TarotOutMyHeart - AI Agent Instructions Index

---

## 🚨 **CRITICAL REMINDER FOR ALL AI AGENTS** 🚨

**BEFORE ENDING YOUR SESSION:**
1. ✅ **UPDATE `lessonslearned.md`** - Add new lessons from this session
2. ✅ **UPDATE `CHANGELOG.md`** - Document all changes made
3. ✅ **COMMIT AND PUSH** - Never leave uncommitted work

These files are the project's institutional memory. Keep them updated!

---

## Project Overview

Major Arcana tarot deck generator built with SvelteKit and TypeScript. Users upload 1-5 reference images, provide style inputs (theme/tone/description/concept/characters), and the app generates 22 unique tarot card designs.

## Tech Stack
- **Framework**: SvelteKit 2.x
- **Language**: TypeScript (strict mode enabled)
- **Deployment**: Vercel
- **Testing**: Vitest
- **Package Manager**: npm

## ⚠️ CRITICAL: Dynamic Rule Injection

This project uses **Just-In-Time Context** rules to prevent context window bloat and enforce zero-trust security. You are strictly forbidden from writing code without first reviewing the relevant rules located in the `.gemini/rules/` directory.

### Core Rule Files
Before starting any task, read the rule file that applies to your domain:
- **If building Contracts or Mocks:** Read `.gemini/rules/sdd-enforcement.md`
- **If building Svelte UI:** Read `.gemini/rules/svelte-conventions.md`
- **If writing logic/parsing data:** Read `.gemini/rules/strict-types.md`
- **If planning or delegating implementation:** Read `.agents/rules/subagent-ticketing.md` (MUST format as Work Tickets)

### Definition of Done
You are forbidden from running your own validation tests to declare a task complete. 
**You MUST read `.gemini/rules/definition-of-done.md` to learn how to invoke the "Invisible Auditor" subagent to verify your work.**

## Project Structure

```
/contracts/           # Immutable TypeScript contracts
  /types/            # Shared types
  [Feature].ts       # One file per seam contract
  index.ts           # Barrel export

/services/
  /mock/             # Mock service implementations
  /real/             # Real service implementations
  factory.ts         # Service factory with USE_MOCKS toggle

/src/
  /lib/              # Reusable components and utilities
  /routes/           # SvelteKit file-based routing

/tests/              # Vitest tests
/.gemini/rules/      # Strict architectural constraints for AI agents
```

## Setup Commands

```bash
# Clone repository
git clone https://github.com/Phazzie/TarotUpMyHeart.git
cd TarotUpMyHeart

# Install dependencies
npm install

# Start development server (uses mocks by default)
npm run dev
```

---
*Note: All bloated instructions, "Creative Variations", and SDD tutorials have been stripped from this file. Adhere strictly to the `.gemini/rules/` constraints.*
