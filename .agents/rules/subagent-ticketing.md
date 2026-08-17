---
name: Subagent Ticketing Standard
description: Enforces a strict, standardized "Work Ticket" format for all implementation plans to ensure explicit guardrails and safe execution by ANY agent (including the primary agent and subagents).
---

# Work Ticketing Standard

Whenever you create an `implementation_plan.md` or delegate work, you must break down the proposed changes into standardized **Work Tickets**. This format guarantees that ANY model—whether it's a junior/flash subagent or you (the primary agent)—can perfectly execute the task sequentially without hallucinations or context bleeding.

## Ticket Format Requirements
Every single file change, component feature, or logical seam MUST be encapsulated in its own distinct ticket using the exact template below:

```markdown
### TICK-[ID]: [Brief Title]

**Role Title**: [The persona the subagent should adopt, e.g. "Svelte 5 Interactivity Specialist"]
**Target Seam**: [The specific component or module]

**What To Do:**
- [Explicit, step-by-step instruction 1]
- [Explicit, step-by-step instruction 2]

**Edge Cases & Error Handling:**
- [Identify what happens on network failure, unmount, or malformed data]
- [Explicitly specify how the code should catch and recover from these edge cases]

**What NOT To Do:**
- [Explicit guardrail 1, e.g. "Do NOT edit any other component files"]
- [Explicit guardrail 2, e.g. "Do NOT use `as any` type escapes"]

**What To Touch:**
- [Exact absolute path of the file(s) to be edited or created]

**What NOT To Touch:**
- All other files in the codebase are READ-ONLY.

**Definition of Done:**
- [How to verify success, e.g. "Run `npm run check` and `npm run test` and verify all pass"]
```

## Rules for Ticket Generation
1. **Zero Ambiguity:** Tickets must not require the subagent to "figure out" the architecture. You must provide the exact logic, variables, and styling required.
2. **File Isolation:** A single ticket should touch a maximum of 1-3 highly coupled files. If a task touches both the frontend layout and a backend service, split it into two tickets.
3. **Strict Boundaries:** The "What NOT To Touch" and "What NOT To Do" sections are mandatory to prevent eager subagents from attempting to "helpfully" refactor unrelated code.
