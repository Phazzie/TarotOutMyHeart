# Hand-off / Turnover Document for Next AI Agent

**Project:** TarotOutMyHeart (Major Arcana Tarot Deck Generator)
**Path:** `C:\Users\shiva\.gemini\antigravity\scratch\tarotoutmyheart`
**Last Updated:** August 8, 2026

## 🚨 CRITICAL CONTEXT FOR THE NEXT AGENT 🚨

You are inheriting this project after a massive, zero-trust AI Workflow Re-Architecture. The previous bloated instruction files (`GEMINI.md` and the 800-line `AGENTS.md`) have been destroyed. 

You must strictly adhere to the new **Just-In-Time Context** rules and the **Adversarial Pairing** workflow.

### 1. The New Rule Structure
You are strictly forbidden from writing code without first reading the highly-focused 10-line rule files located in `.gemini/rules/`. 
- [`AGENTS.md`](file:///C:/Users/shiva/.gemini/antigravity/scratch/tarotoutmyheart/AGENTS.md) is now just a brief structural index.
- If you are building UI, you MUST read `.gemini/rules/svelte-conventions.md`.
- If you are building Contracts/Mocks, you MUST read `.gemini/rules/sdd-enforcement.md`.
- If you are writing any logic, you MUST read `.gemini/rules/strict-types.md`.

### 2. The Invisible Auditor (Definition of Done)
You are **strictly forbidden** from running your own validation tests (like `npm run check` or `npm run test`) and telling the user a task is complete. 
- You MUST read [`.gemini/rules/definition-of-done.md`](file:///C:/Users/shiva/.gemini/antigravity/scratch/tarotoutmyheart/.gemini/rules/definition-of-done.md).
- Whenever you finish a task, you MUST use the `invoke_subagent` tool to spawn a `research` subagent named "Invisible Auditor". 
- You will instruct the Auditor to run the tests and actively scan your code for `as any` or `// @ts-ignore` cheating. 
- You cannot report the task as complete until the Auditor explicitly replies to you with "GREEN LIGHT".

## Next Steps for the Application

We have spent the last session entirely on meta-architecture and AI rule enforcement. The application codebase itself is ready for development using Seam-Driven Development (SDD).

1. **Review the PRD:** The next agent should review `prd.MD` (if it exists) or ask the user what specific feature of TarotOutMyHeart to start building.
2. **Follow SDD:** Remember to start with Phase 1: Define the TypeScript Contracts first. Do not touch UI or Real Services until the mock contracts are locked in.

---
**To the Next Agent:** Read `AGENTS.md` to get your bearings, then ask the user what the first SDD Contract should be!
