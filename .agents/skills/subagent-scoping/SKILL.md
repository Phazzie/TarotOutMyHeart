---
name: subagent-scoping
description: Guidelines and ticket templates for micro-scoping tasks and deploying parallel subagents with strict file boundaries in TarotOutMyHeart.
---

# Subagent Ticket Specification & Micro-Scoping Skill

Use this skill whenever orchestrating subagents for parallel development in **TarotOutMyHeart**.

---

## 🎟️ Subagent Work Ticket Template

Every subagent prompt MUST be structured as an explicit Work Ticket containing the following 7 required fields:

```markdown
# 🎫 SUBAGENT TICKET: [TICK-ID] - [Task Title]

### 1. Role & Specialty
- **Role Title**: [e.g., UI Component Specialist]
- **Target Seam**: [e.g., UI Gallery Component]

### 2. What To Do (Goal & Requirements)
- [Explicit requirement 1]
- [Explicit requirement 2]
- [Explicit requirement 3]

### 3. What NOT To Do (Prohibitions & Anti-Patterns)
- ❌ Do NOT use `as any` or type assertions.
- ❌ Do NOT modify any files outside your allowed file list.
- ❌ Do NOT modify frozen contracts in `contracts/`.
- ❌ Do NOT invent dummy data fallbacks.

### 4. What To Touch (Allowed Scope / File Allowlist)
- ✅ `[file basename](file:///absolute/path/to/allowed/file)` (EDIT)
- ✅ `[file basename](file:///absolute/path/to/new/file)` (NEW)

### 5. What NOT To Touch (Forbidden Files)
- 🚫 All files outside your allowed list are STRICTLY READ-ONLY.

### 6. Data Contracts & Interfaces
- **Inputs**: [Prop types, store dependencies, or CSS tokens]
- **Outputs**: [Exported component name or CSS classes]

### 7. Definition of Done & Verification
- Run `npm run check` -> Must pass with 0 errors.
- Run `git grep "as any" [allowed files]` -> Must be empty.
```
