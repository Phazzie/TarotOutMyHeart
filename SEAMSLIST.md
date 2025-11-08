# Seams List - TarotUpMyHeart

**Last Updated**: 2025-11-08
**Total Seams**: 5 (AI Coordination Server)
**Status**: ✅ AI Coordination seams defined and tested

---

## What is a Seam?

A **seam** is any boundary where data crosses between systems, components, or layers. In Seam-Driven Development (SDD), we identify ALL seams BEFORE coding, define contracts for each, build with mocks first, then integrate.

**Key principle**: **Seams = Integration Points = Contracts Required**

---

## Seam Categories

### 1. External API Seams

Boundaries between our application and external services (Grok AI, image generation APIs, etc.)

### 2. Data Input Seams

Boundaries where user input enters the application (forms, file uploads, etc.)

### 3. State Management Seams

Boundaries between UI state and component logic

### 4. Internal Service Seams

Boundaries between application services

---

## Seam Overview Table

| #   | Seam Name                 | Type                     | Priority | Contract Location                    | Mock Status | Real Status |
| --- | ------------------------- | ------------------------ | -------- | ------------------------------------ | ----------- | ----------- |
| 1   | StateStore                | Internal Service Seams   | High     | `/contracts/StateStore.ts`           | ✅ Complete | ⏸️ Pending  |
| 2   | ClaudeCoordination        | Internal Service Seams   | High     | `/contracts/ClaudeCoordination.ts`   | ✅ Complete | ⏸️ Pending  |
| 3   | CopilotCoordination       | Internal Service Seams   | High     | `/contracts/CopilotCoordination.ts`  | ✅ Complete | ⏸️ Pending  |
| 4   | UserCoordination          | Internal Service Seams   | High     | `/contracts/UserCoordination.ts`     | ✅ Complete | ⏸️ Pending  |
| 5   | FileSystemCoordination    | Internal Service Seams   | High     | `/contracts/FileSystemCoordination.ts` | ✅ Complete | ⏸️ Pending  |

---

## Seam Details

### 1. StateStore

**Boundary**: Application Services → Shared State
**Contract**: `/contracts/StateStore.ts`
**Purpose**: Provides coordination primitives for multiple AI agents including task queue management, file locking, and shared context storage.
**Priority**: High

#### Input Contract

Manages tasks, file locks, and agent contexts with methods for:
- Task queue operations (enqueue, dequeue, update status)
- File lock operations (acquire, release, check status)
- Context operations (set, get, delete, list)

#### Output Contract

Returns managed state including:
- Task objects with status, priority, and metadata
- FileLock objects with agent, timestamp, and expiration
- AgentContext objects with key-value data and persistence flags

#### Dependencies

- **Depends on**: None (core service)
- **Used by**: ClaudeCoordination, CopilotCoordination, UserCoordination, FileSystemCoordination

#### Status Checklist

- [x] Contract defined (`/contracts/StateStore.ts`)
- [x] Contract compiles (TypeScript validation passes)
- [x] Mock service implemented (`/services/mock/StateStoreMock.ts`)
- [x] Contract tests written (`/tests/contracts/StateStore.test.ts`)
- [x] Contract tests passing (24 tests)
- [x] Mock tests written (`/tests/mocks/StateStore.mock.test.ts`)
- [x] Mock tests passing (18 tests)
- [ ] Real service implemented
- [ ] Integration tests passing
- [x] Documented in SEAMSLIST.md (this file)

---

### 2. ClaudeCoordination

**Boundary**: Application → Claude AI Agent
**Contract**: `/contracts/ClaudeCoordination.ts`
**Purpose**: Interface for coordinating with Claude AI agent, handling task assignment, status monitoring, and result retrieval.
**Priority**: High

#### Input Contract

Task requests including:
- Task type (code review, generation, documentation, refactoring, testing, analysis)
- Prompt text
- Context files
- Priority level

#### Output Contract

Task results including:
- Generated content/response
- Modified files list
- Agent status information
- Completion metadata

#### Dependencies

- **Depends on**: StateStore (for coordination)
- **Used by**: Application workflow orchestration

#### Status Checklist

- [x] Contract defined (`/contracts/ClaudeCoordination.ts`)
- [x] Contract compiles (TypeScript validation passes)
- [x] Mock service implemented (`/services/mock/ClaudeCoordinationMock.ts`)
- [x] Contract tests written (`/tests/contracts/ClaudeCoordination.test.ts`)
- [x] Contract tests passing (21 tests)
- [ ] Mock tests written (basic behavior tested in integration)
- [ ] Real service implemented
- [ ] Integration tests passing
- [x] Documented in SEAMSLIST.md (this file)

---

### 3. CopilotCoordination

**Boundary**: Application → GitHub Copilot Agent
**Contract**: `/contracts/CopilotCoordination.ts`
**Purpose**: Interface for coordinating with GitHub Copilot agent for code completion, suggestions, and unit test generation.
**Priority**: High

#### Input Contract

Task requests including:
- Task type (completion, suggestion, inline chat, workspace edit, unit test)
- Prompt text
- File path and code context
- Priority level

#### Output Contract

Task results including:
- Generated code/content
- Suggested file path
- Confidence score (0-1)
- Completion metadata

#### Dependencies

- **Depends on**: StateStore (for coordination)
- **Used by**: Application workflow orchestration

#### Status Checklist

- [x] Contract defined (`/contracts/CopilotCoordination.ts`)
- [x] Contract compiles (TypeScript validation passes)
- [x] Mock service implemented (`/services/mock/CopilotCoordinationMock.ts`)
- [x] Contract tests written (`/tests/contracts/CopilotCoordination.test.ts`)
- [x] Contract tests passing (20 tests)
- [ ] Mock tests written (basic behavior tested in integration)
- [ ] Real service implemented
- [ ] Integration tests passing
- [x] Documented in SEAMSLIST.md (this file)

---

### 4. UserCoordination

**Boundary**: AI Agents → User
**Contract**: `/contracts/UserCoordination.ts`
**Purpose**: Interface for user interaction in the AI coordination system, handling requests requiring user input and sending notifications.
**Priority**: High

#### Input Contract

User requests including:
- Request type (approve change, provide input, resolve conflict, select option, review output)
- Title and description
- Options (for selection requests)
- Expiration time

Notifications including:
- Level (info, warning, error, success)
- Message text
- Source agent
- Additional data

#### Output Contract

User responses including:
- Approval/rejection status
- Selected value or input text
- User comments
- Notification read status

#### Dependencies

- **Depends on**: StateStore (for request tracking)
- **Used by**: ClaudeCoordination, CopilotCoordination, FileSystemCoordination

#### Status Checklist

- [x] Contract defined (`/contracts/UserCoordination.ts`)
- [x] Contract compiles (TypeScript validation passes)
- [x] Mock service implemented (`/services/mock/UserCoordinationMock.ts`)
- [x] Contract tests written (`/tests/contracts/UserCoordination.test.ts`)
- [x] Contract tests passing (24 tests)
- [ ] Mock tests written (basic behavior tested in integration)
- [ ] Real service implemented
- [ ] Integration tests passing
- [x] Documented in SEAMSLIST.md (this file)

---

### 5. FileSystemCoordination

**Boundary**: AI Agents → File System
**Contract**: `/contracts/FileSystemCoordination.ts`
**Purpose**: Provides safe, coordinated file system operations for multiple agents with change tracking and conflict detection.
**Priority**: High

#### Input Contract

File operations including:
- Read, write, create, delete operations
- Agent identifier
- Change description
- File paths

#### Output Contract

File operations results including:
- File content
- File metadata (size, modified time, hash)
- Change history
- Conflict information

#### Dependencies

- **Depends on**: StateStore (for file locks)
- **Used by**: ClaudeCoordination, CopilotCoordination

#### Status Checklist

- [x] Contract defined (`/contracts/FileSystemCoordination.ts`)
- [x] Contract compiles (TypeScript validation passes)
- [x] Mock service implemented (`/services/mock/FileSystemCoordinationMock.ts`)
- [x] Contract tests written (`/tests/contracts/FileSystemCoordination.test.ts`)
- [x] Contract tests passing (28 tests)
- [ ] Mock tests written (basic behavior tested in integration)
- [ ] Real service implemented
- [ ] Integration tests passing
- [x] Documented in SEAMSLIST.md (this file)

---

## Integration Tests

**Integration Test Suite**: `/tests/integration/Integration.test.ts`
**Status**: ✅ Complete (8 tests passing)

The integration tests verify:
- Multi-agent workflow coordination
- File conflict detection and resolution
- Task coordination between state store and agents
- File locking to prevent concurrent modifications
- Context sharing between agents
- Error handling and agent unavailability
- Complete feature development workflow

---

## Seam Details (Template for Future Seams)

> **Instructions**: For each identified seam, add a section using the template below.

### Template for Each Seam:

````markdown
### [Number]. [Seam Name]

**Boundary**: [Source] → [Destination]
**Contract**: `/contracts/[FileName].ts`
**Purpose**: [1-2 sentence description of what this seam does]
**Priority**: Critical | High | Medium | Low

#### Input Contract

```typescript
// TypeScript interface for input
interface [SeamName]Input {
  // Fields that cross this boundary
}
```
````

#### Output Contract

```typescript
// TypeScript interface for output
interface [SeamName]Output {
  // Fields returned across this boundary
}
```

#### Dependencies

- **Depends on**: [List other seams this seam requires]
- **Used by**: [List components/services that use this seam]

#### Status Checklist

- [ ] Contract defined (`/contracts/[FileName].ts`)
- [ ] Contract compiles (TypeScript validation passes)
- [ ] Mock service implemented (`/services/mock/[FileName]Mock.ts`)
- [ ] Contract tests written (`/tests/contracts/[FileName].test.ts`)
- [ ] Contract tests passing
- [ ] Mock tests written (`/tests/mocks/[FileName].test.ts`)
- [ ] Mock tests passing
- [ ] Real service implemented (`/services/real/[FileName]Service.ts`)
- [ ] Integration tests written (`/tests/integration/[FileName].test.ts`)
- [ ] Integration tests passing
- [ ] Documented in SEAMSLIST.md (this file)

#### Error Cases

Document expected error scenarios:

- **[Error Type]**: [Description, HTTP code, user message]
- **[Error Type]**: [Description, HTTP code, user message]

#### Example Usage

```typescript
// Example of how this seam is used in the application
```

#### Notes

- [Any special considerations, gotchas, or implementation details]
- [Links to relevant requirements or design docs]

```

---

## Seam Dependency Graph

> **Status**: To be created once seams are defined

```

[Placeholder for dependency graph]
[Use Mermaid, ASCII art, or link to diagram]

```

**Example Format**:

```

User Input Seam ────┐
├──→ Grok Prompt Generation Seam ──→ Deck State Seam
Image Upload Seam ──┘ │
│
↓
Reference Selection Seam ──→ Grok Image Generation Seam ──→ Deck State Seam

````

---

## Integration Readiness Checklist

This checklist must be 100% complete before switching from mocks to real services.

### Contract Phase
- [ ] All seams identified
- [ ] All contracts defined
- [ ] All contracts documented in this file
- [ ] All contracts compile without errors
- [ ] No `any` types in contracts
- [ ] All contracts exported from `/contracts/index.ts`

### Mock Phase
- [ ] All mock services implemented
- [ ] All mocks satisfy contracts (TypeScript validates)
- [ ] All contract tests written
- [ ] All contract tests passing
- [ ] All mock tests written
- [ ] All mock tests passing
- [ ] Mock service factory configured

### Implementation Phase
- [ ] All real services implemented
- [ ] All real services satisfy contracts
- [ ] No manual data transformations
- [ ] No `as any` type escapes (`git grep "as any"` returns nothing)
- [ ] Integration tests written
- [ ] Integration tests passing

### Documentation Phase
- [ ] All seams documented in SEAMSLIST.md
- [ ] All requirements traced to contracts
- [ ] All error cases documented
- [ ] CHANGELOG.md updated
- [ ] lessonslearned.md updated (if applicable)

---

## How to Add a New Seam

Follow this process exactly:

### Step 1: Identify the Boundary

Ask yourself:
- Where does data cross from one component to another?
- Is this an input (user → app), output (app → user), or internal (service → service)?
- What are the exact data requirements at this boundary?

### Step 2: Define the Contract

```bash
# Create contract file
touch contracts/[FeatureName].ts

# Define TypeScript interfaces
# Example:
cat > contracts/[FeatureName].ts << 'EOF'
/**
 * @purpose: [What this seam does]
 * @requirement: [JIRA-123, REQUIREMENT-ID]
 * @updated: $(date +%Y-%m-%d)
 */

export interface [Feature]Input {
  // Input fields with types
}

export interface [Feature]Output {
  // Output fields with types
}

export interface I[Feature]Service {
  execute(input: [Feature]Input): Promise<[Feature]Output>
}
EOF

# Export from contracts/index.ts
echo "export * from './[FeatureName]'" >> contracts/index.ts

# Validate contract compiles
npm run check
````

### Step 3: Document in This File

Add a new section using the template above with:

- Seam number (increment from last)
- Clear boundary description
- Input/output contracts
- Dependencies
- Status checklist (all unchecked initially)

### Step 4: Generate Mock Service

```bash
# Create mock implementation
touch services/mock/[FeatureName]Mock.ts

# Implement the contract interface
# Mock must return realistic data matching contract exactly

# Add to mock service factory
# Edit services/factory.ts
```

### Step 5: Write Tests

```bash
# Contract tests
touch tests/contracts/[FeatureName].test.ts

# Mock tests
touch tests/mocks/[FeatureName].test.ts

# Run tests
npm run test:contracts
npm run test:mocks
```

### Step 6: Build Against Mock

- Use mock service in UI development
- Iterate on UI without waiting for real implementation
- Mock should provide all success and error cases

### Step 7: Implement Real Service

```bash
# Create real service
touch services/real/[FeatureName]Service.ts

# Implement the SAME contract interface
# NO deviations allowed

# Add to real service factory
# Edit services/factory.ts
```

### Step 8: Integrate

```bash
# Run integration readiness check
npm run check:integration-readiness

# Switch to real service
# Set USE_MOCKS=false

# Run integration tests
npm run test:integration

# If tests pass → Done!
# If tests fail → See Emergency Protocols in seam-driven-development.md
```

---

## SDD Compliance Notes

Per Seam-Driven Development methodology:

### Contract Immutability

Once a contract is defined and implementation begins, it is **frozen**.

**Rules**:

- ❌ NEVER modify existing contract interfaces
- ✅ Create new versions (V2, V3) if breaking changes needed
- ✅ Add optional fields for non-breaking enhancements
- ✅ Use adapters for external APIs that don't match contracts

**Example**:

```typescript
// ❌ WRONG: Modifying existing contract
interface UserSeam {
  id: string
  name: string
  email: string // Added later - BREAKS EVERYTHING
}

// ✅ CORRECT: Create new version
interface UserSeamV1 {
  id: string
  name: string
}

interface UserSeamV2 extends UserSeamV1 {
  email: string
}

// ✅ CORRECT: Optional field (non-breaking)
interface UserSeam {
  id: string
  name: string
  email?: string // Optional addition is safe
}
```

### Mock-First Development

**Never blocked waiting for dependencies**.

- UI team builds against mocks immediately
- Backend team implements contracts in parallel
- Integration happens at the end (and works first try!)

### Type Safety Throughout

- No `any` types allowed
- Use `unknown` and validate instead
- No `as` type assertions without validation
- Full TypeScript strict mode coverage

### Regeneration Over Debugging

If integration fails:

1. Fix the contract (it was wrong)
2. Regenerate both mock and real services
3. Integration should now work

Don't debug integration issues - fix the contract that caused them.

### Requirements Traceability

Every contract must trace back to a requirement:

```typescript
/**
 * @requirement AUTH-001: User authentication via email/password
 * @requirement SEC-015: Password must be hashed before transmission
 */
interface LoginSeam {
  // ...
}
```

This allows:

- Finding orphan fields (no requirement)
- Finding missing features (requirement without seam)
- Impact analysis when requirements change

---

## Seam Metrics & Health

> **Status**: To be tracked once seams are implemented

### Coverage Metrics

- **Total Seams Identified**: TBD
- **Contracts Defined**: 0 / TBD
- **Mocks Implemented**: 0 / TBD
- **Real Services Implemented**: 0 / TBD
- **Integration Tests Passing**: 0 / TBD

### Quality Metrics

- **Contract Test Pass Rate**: N/A
- **Mock Test Pass Rate**: N/A
- **Integration Success Rate**: N/A
- **Contract Drift Incidents**: 0

### Velocity Metrics

- **Average Time: Seam Identification → Contract Definition**: TBD
- **Average Time: Contract → Mock Implementation**: TBD
- **Average Time: Mock → Real Service**: TBD
- **Average Time: Real Service → Integration**: TBD

---

## Common Patterns

> **Note**: As we identify recurring seam patterns, document them here for reuse.

### Pattern: Async Data Fetching

```typescript
interface AsyncDataSeam<T> {
  loading: boolean
  data?: T
  error?: Error
  lastFetch?: Date
  isStale: () => boolean
  invalidate: () => void
}
```

### Pattern: Paginated Results

```typescript
interface PaginatedSeam<T> {
  items: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    hasMore: boolean
  }
}
```

### Pattern: Form Submission

```typescript
interface FormSubmissionSeam<TInput, TOutput> {
  input: TInput
  validation: {
    isValid: boolean
    errors: Record<keyof TInput, string>
  }
  submit: () => Promise<TOutput>
  reset: () => void
}
```

---

## References

- **Full SDD Methodology**: `/seam-driven-development.md`
- **AI Agent Instructions**: `/AGENTS.md`
- **Project Lessons**: `/lessonslearned.md`
- **Version History**: `/CHANGELOG.md`

---

## Change Log

| Date       | Author        | Change                        |
| ---------- | ------------- | ----------------------------- |
| 2025-11-07 | Initial Setup | Created SEAMSLIST.md template |

---

**⚠️ IMPORTANT**: This file will be populated during the IDENTIFY phase of SDD implementation. Do not populate prematurely - let requirements drive seam discovery.
