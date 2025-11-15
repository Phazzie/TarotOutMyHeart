# Blueprint Templates

This directory contains templates for creating consistent, well-documented code in the TarotOutMyHeart project.

---

## 📋 Available Templates

### 1. CONTRACT-BLUEPRINT.md
**Use when**: Defining a new seam/contract

**What it provides**:
- Complete contract file template with documentation standards
- Input/Output interface patterns
- Error handling patterns
- Service interface definition
- Type guards and validation helpers
- Examples and anti-patterns

**Key sections**:
- File header documentation (PURPOSE, DATA FLOW, DEPENDENCIES)
- Input types
- Output types
- Error types
- Service interface
- Helper types and constants
- Type guards
- Export summary

---

### 2. STUB-BLUEPRINT.md
**Use when**: Implementing mock or real services

**What it provides**:
- Mock service template with realistic fake data
- Real service template with API integration
- Service factory pattern
- Complete documentation standards

**Key sections**:

**Mock Template**:
- File header documentation (PURPOSE, DATA FLOW, MOCK BEHAVIOR)
- Mock data constants
- Mock configuration (delays, error rates)
- Helper functions
- Mock service implementation
- Mock scenarios (success, errors, edge cases)

**Real Template**:
- File header documentation (PURPOSE, DATA FLOW, ERROR HANDLING)
- Configuration and environment variables
- Helper functions (backoff, error mapping)
- Real service implementation
- Retry logic with exponential backoff
- Response validation

**Factory Template**:
- USE_MOCKS flag configuration
- Service exports with lazy loading

---

## 🎯 Quick Start

### Creating a New Feature

**Step 1: Define Contract**
```bash
# Open contract blueprint
cat docs/blueprints/CONTRACT-BLUEPRINT.md

# Create contract file
touch contracts/YourFeature.ts

# Copy template structure and fill in:
# - File header with PURPOSE, DATA FLOW, DEPENDENCIES
# - Input interface
# - Output interface
# - Error codes
# - Service interface
```

**Step 2: Create Mock Service**
```bash
# Open stub blueprint
cat docs/blueprints/STUB-BLUEPRINT.md

# Create mock file
touch services/mock/YourFeatureMock.ts

# Copy mock template and fill in:
# - File header with MOCK BEHAVIOR
# - Mock data
# - Service implementation
```

**Step 3: Test Mock**
```bash
# Create test file
touch tests/contracts/YourFeature.test.ts

# Validate mock matches contract
npm run test:contracts
```

**Step 4: Build UI**
```bash
# Import contract types and service
# Use service from factory (respects USE_MOCKS)
# Build UI against mock
```

**Step 5: Create Real Service**
```bash
# Create real service file
touch services/real/YourFeatureService.ts

# Copy real service template and fill in:
# - File header with ERROR HANDLING, DEPENDENCIES
# - Configuration loading
# - API integration
# - Error handling and retry logic
```

**Step 6: Test Real Service**
```bash
# Create integration test
touch tests/integration/YourFeature.test.ts

# Test real API
npm run test:integration
```

**Step 7: Switch to Real**
```bash
# Set USE_MOCKS=false
# Integration should work first try!
```

---

## 📝 Documentation Standards

### Every File Must Have

```typescript
/**
 * @fileoverview [One-line description]
 * @module [module-path]
 * 
 * PURPOSE:
 * [2-3 sentences explaining why this file exists]
 * [What problem does it solve?]
 * [What business requirement does it fulfill?]
 * 
 * DATA FLOW:
 * Input: [What comes in and from where]
 * Transform: [What this file does to the data]
 * Output: [What goes out and to where]
 * 
 * DEPENDENCIES:
 * - Depends on: [List files/modules this imports]
 * - Used by: [List files/modules that import this]
 * 
 * @see [Related docs]
 * @updated YYYY-MM-DD
 */
```

### Why This Matters

✅ **Benefits**:
- New developers understand code faster
- AI agents have context for better code generation
- Debugging is easier with clear data flow
- Maintenance is faster with dependency tracking
- Onboarding time reduced dramatically

❌ **Without documentation**:
- "What does this file do?" (need to read entire file)
- "What depends on this?" (need to search entire codebase)
- "Can I modify this?" (unclear who uses it)
- "Why does this exist?" (lost business context)

---

## 🔍 Template Checklist

### Before Creating Any File

- [ ] Reviewed appropriate blueprint template
- [ ] Understand what sections are required
- [ ] Have all information needed to fill template

### After Creating File

- [ ] File header complete with all sections
- [ ] PURPOSE clearly explains why file exists
- [ ] DATA FLOW shows input → transform → output
- [ ] DEPENDENCIES lists what depends on what
- [ ] All code sections from template included
- [ ] File compiles (`npm run check`)
- [ ] Related docs updated (SEAMSLIST.md, etc.)

---

## 📚 Related Documentation

### Planning Phase
- `/docs/planning/DATA-BOUNDARIES.md` - Identifies all seams
- `/docs/planning/RECOMMENDATIONS.md` - Technical decisions

### Methodology
- `/seam-driven-development.md` - Complete SDD guide
- `/AGENTS.md` - Project overview and standards
- `/AI-CHECKLIST.md` - Step-by-step workflow

### Catalog
- `/SEAMSLIST.md` - All defined seams
- `/CHANGELOG.md` - Version history
- `/lessonslearned.md` - Project insights

---

## 💡 Examples

### Contract Example
See: `/contracts/CoordinationServer.ts`
- Comprehensive file header
- Multiple service interfaces
- Complete type definitions
- Error handling patterns

### Common Types Example
See: `/contracts/types/common.ts`
- ServiceResponse wrapper pattern
- Shared type definitions
- Utility types

---

## 🚫 Anti-Patterns

### DON'T Create Files Without Headers
```typescript
// ❌ BAD: No context
export interface UserInput {
  id: string
}

export class UserService {
  // ...
}
```

### DO Include Complete Documentation
```typescript
// ✅ GOOD: Clear context
/**
 * @fileoverview User Management Service Contract
 * @module contracts/User
 * 
 * PURPOSE:
 * Defines the boundary between user management UI and user API.
 * Ensures type safety for all user CRUD operations.
 * 
 * DATA FLOW:
 * Input: User data from forms (UserInput)
 * Transform: Validates and structures for API
 * Output: User records with timestamps (UserOutput)
 * 
 * DEPENDENCIES:
 * - Depends on: contracts/types/common.ts
 * - Used by: services/mock/UserMock.ts, services/real/UserService.ts
 * 
 * @see /docs/planning/DATA-BOUNDARIES.md - Seam #3
 * @updated 2025-11-07
 */
```

---

## ❓ Questions?

1. **Which template do I use?**
   - Defining a boundary/seam? → CONTRACT-BLUEPRINT.md
   - Implementing a service? → STUB-BLUEPRINT.md

2. **Do I really need all that documentation?**
   - Yes! It saves hours of confusion later
   - Makes code self-documenting
   - AI agents need context to help effectively

3. **Can I skip sections?**
   - No, all sections are required
   - Each section serves a specific purpose
   - Incomplete documentation = maintenance problems

4. **What if I don't know the dependencies?**
   - List what you know
   - Mark others as "TBD"
   - Update when dependencies become clear

5. **How do I update existing files?**
   - Add file headers to files that don't have them
   - Use the templates as reference
   - Keep documentation up to date as code changes

---

## 🎯 Success Metrics

Your file is well-documented when:

- [ ] Any developer can understand purpose in < 30 seconds
- [ ] Data flow is clear without reading implementation
- [ ] Dependencies are explicit and traceable
- [ ] Business context is preserved
- [ ] AI agents can generate related code accurately
- [ ] New team members don't need to ask "What does this do?"

---

**Remember**: Good documentation is not a burden—it's an investment that pays dividends every day.
