# Seams List - TarotOutMyHeart

**Last Updated**: 2025-11-07
**Total Seams**: 5 (AI Collaboration System)
**Status**: ✅ Phase 1 Complete - Contracts defined for AI coordination seams

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

### AI Collaboration System Seams

| # | Seam Name | Type | Priority | Contract Location | Mock Status | Real Status |
|---|-----------|------|----------|-------------------|-------------|-------------|
| 1 | Coordination Server ↔ Claude Code | Internal Service | Critical | `/contracts/CoordinationServer.ts` | ⏸️ Pending | ⏸️ Pending |
| 2 | Coordination Server ↔ GitHub Copilot | Internal Service | Critical | `/contracts/CoordinationServer.ts` | ⏸️ Pending | ⏸️ Pending |
| 3 | State Store ↔ Coordination Server | Internal Service | Critical | `/contracts/CoordinationServer.ts` | ⏸️ Pending | ⏸️ Pending |
| 4 | User Interface ↔ Coordination Server | Internal Service | High | `/contracts/CoordinationServer.ts` | ⏸️ Pending | ⏸️ Pending |
| 5 | File System ↔ Both AIs | Internal Service | Critical | `/contracts/CoordinationServer.ts` | ⏸️ Pending | ⏸️ Pending |

### TarotOutMyHeart Application Seams (Future)

| # | Seam Name | Type | Priority | Contract Location | Mock Status | Real Status |
|---|-----------|------|----------|-------------------|-------------|-------------|
| - | *To be defined in Sprint 1* | - | - | - | ⏸️ Pending | ⏸️ Pending |

---

## Seam Details

### 1. Coordination Server ↔ Claude Code

**Boundary**: Claude Code Agent → Coordination Server → Task Queue/Context Storage
**Contract**: `/contracts/CoordinationServer.ts` (ClaudeCoordinationContract)
**Purpose**: Enables Claude Code to register as an agent, claim tasks, report progress, and share conversation context with Copilot through the coordination server.
**Priority**: Critical

#### Input Contract

```typescript
// Task claiming
interface ClaimTaskInput {
  taskId: TaskId
}

// Progress reporting
interface ReportProgressInput {
  taskId: TaskId
  progress: TaskProgress
}

// Task completion
interface CompleteTaskInput {
  taskId: TaskId
  result: TaskResult
}
```

#### Output Contract

```typescript
interface ClaudeCoordinationContract {
  registerAgent(params: {...}): Promise<ServiceResponse<RegistrationToken>>
  getAvailableTasks(capabilities: AgentCapability[]): Promise<ServiceResponse<Task[]>>
  claimTask(taskId: TaskId): Promise<ServiceResponse<Task>>
  reportProgress(taskId: TaskId, progress: TaskProgress): Promise<ServiceResponse<void>>
  completeTask(taskId: TaskId, result: TaskResult): Promise<ServiceResponse<void>>
  retrieveContext(contextId: ContextId): Promise<ServiceResponse<ConversationContext>>
  saveContext(contextId: ContextId, context: ConversationContext): Promise<ServiceResponse<void>>
  requestHandoff(params: {...}): Promise<ServiceResponse<HandoffId>>
}
```

#### Dependencies

- **Depends on**: Seam #3 (State Store) for persistence
- **Used by**: Claude Code CLI, task orchestration logic

#### Status Checklist

- [x] Contract defined (`/contracts/CoordinationServer.ts`)
- [ ] Contract compiles (TypeScript validation passes)
- [ ] Mock service implemented
- [ ] Contract tests written
- [ ] Contract tests passing
- [ ] Mock tests written
- [ ] Mock tests passing
- [ ] Real service implemented
- [ ] Integration tests written
- [ ] Integration tests passing
- [x] Documented in SEAMSLIST.md

#### Error Cases

- **RegistrationError**: Agent already registered or invalid capabilities → `AGENT_ALREADY_REGISTERED` / `INVALID_CAPABILITIES`
- **TaskClaimError**: Task doesn't exist or already claimed → `TASK_NOT_FOUND` / `TASK_ALREADY_CLAIMED`
- **ProgressUpdateError**: Task not in progress → `INVALID_TASK_STATE`
- **ContextNotFoundError**: Context ID doesn't exist → `CONTEXT_NOT_FOUND`

#### Example Usage

```typescript
// Claude Code registers and claims a task
const registration = await claudeService.registerAgent({
  agentId: 'claude-code',
  capabilities: ['typescript-development', 'contract-definition', 'testing'],
  version: '1.0.0'
})

const tasks = await claudeService.getAvailableTasks(['typescript-development'])
const task = await claudeService.claimTask(tasks.data[0].id)

await claudeService.reportProgress(task.data.id, {
  percentComplete: 50,
  currentStep: 'Implementing mock service',
  filesModified: ['/services/mock/Example.ts']
})

await claudeService.completeTask(task.data.id, {
  success: true,
  output: 'Mock service implemented successfully',
  filesModified: ['/services/mock/Example.ts'],
  testsRun: { total: 5, passed: 5, failed: 0, skipped: 0, duration: 1200 }
})
```

#### Notes

- Claude Code acts as primary orchestrator in orchestrator-worker mode
- Full-featured API with progress tracking and context sharing
- Supports handoff requests to transfer work to Copilot

---

### 2. Coordination Server ↔ GitHub Copilot

**Boundary**: GitHub Copilot → MCP Tools → Coordination Server
**Contract**: `/contracts/CoordinationServer.ts` (CopilotCoordinationContract)
**Purpose**: Exposes coordination capabilities as MCP tools that GitHub Copilot can autonomously invoke to claim and complete tasks.
**Priority**: Critical

#### Input Contract

```typescript
// MCP Tool inputs
interface CheckForTasksInput {
  agentId: 'github-copilot'
  capabilities: AgentCapability[]
}

interface ClaimTaskToolInput {
  taskId: TaskId
  agentId: 'github-copilot'
}

interface SubmitTaskResultInput {
  taskId: TaskId
  agentId: 'github-copilot'
  success: boolean
  output: string
  filesModified?: string[]
  error?: string
}
```

#### Output Contract

```typescript
interface CopilotCoordinationContract {
  checkForTasks(params: CheckForTasksInput): Promise<ServiceResponse<Task[]>>
  claimTaskTool(params: ClaimTaskToolInput): Promise<ServiceResponse<Task>>
  submitTaskResult(params: SubmitTaskResultInput): Promise<ServiceResponse<void>>
  requestFileAccess(params: {...}): Promise<ServiceResponse<FileAccessGrant>>
  releaseFileAccess(params: {...}): Promise<ServiceResponse<void>>
  getCollaborationStatus(params: {...}): Promise<ServiceResponse<CollaborationStatus>>
}
```

#### Dependencies

- **Depends on**: Seam #3 (State Store), Seam #5 (File System coordination)
- **Used by**: GitHub Copilot via MCP client in VS Code

#### Status Checklist

- [x] Contract defined (`/contracts/CoordinationServer.ts`)
- [ ] Contract compiles (TypeScript validation passes)
- [ ] Mock service implemented
- [ ] Contract tests written
- [ ] Contract tests passing
- [ ] Mock tests written
- [ ] Mock tests passing
- [ ] Real MCP server implemented
- [ ] MCP tool registration configured
- [ ] Integration tests with Copilot
- [ ] Integration tests passing
- [x] Documented in SEAMSLIST.md

#### Error Cases

- **TaskNotFoundError**: Task ID invalid → `TASK_NOT_FOUND`
- **FileAccessDeniedError**: File already locked by other agent → `FILE_LOCKED`
- **InvalidAgentError**: Agent ID not 'github-copilot' → `INVALID_AGENT`

#### Example Usage

```typescript
// Copilot autonomously calls MCP tools
const tasks = await checkForTasks({
  agentId: 'github-copilot',
  capabilities: ['svelte-development', 'testing']
})

const task = await claimTaskTool({
  taskId: tasks.data[0].id,
  agentId: 'github-copilot'
})

const fileAccess = await requestFileAccess({
  path: '/src/components/Example.svelte',
  operation: 'write',
  agentId: 'github-copilot'
})

// Copilot implements feature...

await submitTaskResult({
  taskId: task.data.id,
  agentId: 'github-copilot',
  success: true,
  output: 'Svelte component implemented',
  filesModified: ['/src/components/Example.svelte']
})

await releaseFileAccess({
  lockToken: fileAccess.data.lockToken,
  agentId: 'github-copilot'
})
```

#### Notes

- Designed for autonomous invocation (no user approval per call after setup)
- Simpler interface than Claude's (Copilot optimized for execution, not orchestration)
- MCP tools auto-discovered by Copilot in VS Code

---

### 3. State Store ↔ Coordination Server

**Boundary**: Coordination Server → Persistence Layer (SQLite/Redis/Memory)
**Contract**: `/contracts/CoordinationServer.ts` (StateStoreContract)
**Purpose**: Abstract persistence layer for task queue, file locks, and conversation context. Allows swapping between SQLite (local), Redis (distributed), or in-memory (testing).
**Priority**: Critical

#### Input Contract

```typescript
// Task operations
interface EnqueueTaskInput {
  task: Omit<Task, 'id'>  // ID generated by store
}

interface UpdateTaskStatusInput {
  taskId: TaskId
  status: TaskStatus
}

// Lock operations
interface AcquireLockInput {
  path: string
  owner: AgentId
}

// Context operations
interface SaveContextInput {
  contextId: ContextId
  context: ConversationContext
}
```

#### Output Contract

```typescript
interface StateStoreContract {
  // Task Queue
  enqueueTask(task: Omit<Task, 'id'>): Promise<ServiceResponse<TaskId>>
  dequeueTask(capabilities: AgentCapability[]): Promise<ServiceResponse<Task | null>>
  getTask(taskId: TaskId): Promise<ServiceResponse<Task | null>>
  updateTaskStatus(taskId: TaskId, status: TaskStatus): Promise<ServiceResponse<void>>
  updateTaskResult(taskId: TaskId, result: TaskResult): Promise<ServiceResponse<void>>
  getSessionTasks(sessionId: SessionId): Promise<ServiceResponse<Task[]>>

  // File Locks
  acquireLock(path: string, owner: AgentId): Promise<ServiceResponse<LockToken>>
  releaseLock(lockToken: LockToken): Promise<ServiceResponse<void>>
  isLocked(path: string): Promise<ServiceResponse<FileLock | null>>
  getAllLocks(): Promise<ServiceResponse<FileLock[]>>
  releaseAllLocksForAgent(owner: AgentId): Promise<ServiceResponse<number>>

  // Context
  saveContext(contextId: ContextId, context: ConversationContext): Promise<ServiceResponse<void>>
  loadContext(contextId: ContextId): Promise<ServiceResponse<ConversationContext | null>>
  appendMessage(contextId: ContextId, message: Message): Promise<ServiceResponse<void>>
}
```

#### Dependencies

- **Depends on**: File system (for SQLite file), network (for Redis)
- **Used by**: Coordination Server (Seams #1, #2, #4)

#### Status Checklist

- [x] Contract defined (`/contracts/CoordinationServer.ts`)
- [ ] Contract compiles (TypeScript validation passes)
- [ ] Mock service implemented (in-memory)
- [ ] Contract tests written
- [ ] Contract tests passing
- [ ] Mock tests written
- [ ] Mock tests passing
- [ ] Real service implemented (SQLite)
- [ ] Integration tests written
- [ ] Integration tests passing
- [x] Documented in SEAMSLIST.md

#### Error Cases

- **LockError**: File already locked → `FILE_ALREADY_LOCKED`
- **TaskNotFoundError**: Task ID doesn't exist → `TASK_NOT_FOUND`
- **ContextNotFoundError**: Context ID doesn't exist → `CONTEXT_NOT_FOUND`
- **DatabaseError**: Persistence layer failure → `DB_ERROR` (retryable: true)

#### Example Usage

```typescript
// Enqueue task
const taskId = await stateStore.enqueueTask({
  type: 'implement-feature',
  description: 'Build user authentication',
  priority: 'high',
  context: { files: [], conversationHistory: [], requirements: '...' },
  status: 'queued',
  createdAt: new Date(),
  updatedAt: new Date(),
  sessionId: sessionId
})

// Acquire file lock
const lockToken = await stateStore.acquireLock('/src/auth/Login.svelte', 'claude-code')

// Save context
await stateStore.saveContext(contextId, {
  id: contextId,
  messages: [...],
  sharedState: { currentFeature: 'authentication' },
  lastUpdated: new Date()
})
```

#### Notes

- Three implementations planned: MockStateStore (memory), SQLiteStateStore, RedisStateStore
- All three must satisfy identical contract
- Lock expiration prevents deadlocks from crashed agents

---

### 4. User Interface ↔ Coordination Server

**Boundary**: User (CLI/Web UI) → Coordination Server → Session Management
**Contract**: `/contracts/CoordinationServer.ts` (UserCoordinationContract)
**Purpose**: Allows users to start collaboration sessions, monitor progress, resolve conflicts, and control AI teamwork.
**Priority**: High

#### Input Contract

```typescript
interface StartCollaborationInput {
  task: string
  preferredLead?: AgentId | 'auto'
  mode: CollaborationMode
  contextId?: ContextId
}

interface ResolveConflictInput {
  conflictId: ConflictId
  resolution: ConflictResolution
}
```

#### Output Contract

```typescript
interface UserCoordinationContract {
  startCollaboration(params: StartCollaborationInput): Promise<ServiceResponse<CollaborationSession>>
  pauseCollaboration(sessionId: SessionId): Promise<ServiceResponse<void>>
  resumeCollaboration(sessionId: SessionId): Promise<ServiceResponse<void>>
  cancelCollaboration(sessionId: SessionId): Promise<ServiceResponse<void>>
  getCollaborationStatus(sessionId: SessionId): Promise<ServiceResponse<CollaborationStatus>>
  resolveConflict(conflictId: ConflictId, resolution: ConflictResolution): Promise<ServiceResponse<void>>
  subscribeToUpdates(sessionId: SessionId): AsyncIterable<CollaborationEvent>
}
```

#### Dependencies

- **Depends on**: Seam #3 (State Store), Seam #1 and #2 (agent connections)
- **Used by**: CLI interface, optional web UI dashboard

#### Status Checklist

- [x] Contract defined (`/contracts/CoordinationServer.ts`)
- [ ] Contract compiles (TypeScript validation passes)
- [ ] Mock service implemented
- [ ] Contract tests written
- [ ] Contract tests passing
- [ ] Mock tests written
- [ ] Mock tests passing
- [ ] Real service implemented
- [ ] CLI interface implemented
- [ ] Web UI dashboard (optional)
- [ ] Integration tests written
- [ ] Integration tests passing
- [x] Documented in SEAMSLIST.md

#### Error Cases

- **SessionNotFoundError**: Session ID invalid → `SESSION_NOT_FOUND`
- **InvalidModeError**: Collaboration mode not supported → `INVALID_MODE`
- **ConflictNotFoundError**: Conflict ID doesn't exist → `CONFLICT_NOT_FOUND`

#### Example Usage

```typescript
// User starts collaboration
const session = await userService.startCollaboration({
  task: 'Implement user authentication with email/password',
  preferredLead: 'claude-code',
  mode: 'orchestrator-worker'
})

// Monitor progress
for await (const event of userService.subscribeToUpdates(session.data.id)) {
  console.log(`[${event.type}]`, event.data)
}

// Check status
const status = await userService.getCollaborationStatus(session.data.id)
console.log(`Progress: ${status.data.progress.percentComplete}%`)

// Resolve conflict if needed
await userService.resolveConflict(conflictId, {
  strategy: 'claude-wins',
  mergeInstructions: 'Use Claude\'s implementation for auth logic'
})
```

#### Notes

- CLI provides `claude collab start "task description"` command
- Optional web dashboard for visual monitoring
- Real-time event stream for progress updates

---

### 5. File System ↔ Both AIs

**Boundary**: AI Agents (Claude + Copilot) → File Access Coordinator → Codebase Files
**Contract**: `/contracts/CoordinationServer.ts` (FileSystemCoordinationContract)
**Purpose**: Prevent race conditions and conflicts when multiple AIs work on the same codebase simultaneously through advisory file locking.
**Priority**: Critical

#### Input Contract

```typescript
interface RequestFileAccessInput {
  path: string
  operation: 'read' | 'write' | 'delete'
  agentId: AgentId
}

interface ReleaseFileAccessInput {
  grant: FileAccessGrant
}

interface BatchFileAccessInput {
  requests: FileAccessRequest[]
}
```

#### Output Contract

```typescript
interface FileSystemCoordinationContract {
  requestFileAccess(params: RequestFileAccessInput): Promise<ServiceResponse<FileAccessGrant>>
  releaseFileAccess(grant: FileAccessGrant): Promise<ServiceResponse<void>>
  detectConflicts(path: string): Promise<ServiceResponse<FileConflict[]>>
  requestBatchFileAccess(requests: FileAccessRequest[]): Promise<ServiceResponse<FileAccessGrant[]>>
}
```

#### Dependencies

- **Depends on**: Seam #3 (State Store for lock tracking)
- **Used by**: Both AI agents before file operations

#### Status Checklist

- [x] Contract defined (`/contracts/CoordinationServer.ts`)
- [ ] Contract compiles (TypeScript validation passes)
- [ ] Mock service implemented
- [ ] Contract tests written
- [ ] Contract tests passing
- [ ] Mock tests written
- [ ] Mock tests passing
- [ ] Real service implemented
- [ ] Integration tests written
- [ ] Integration tests passing
- [x] Documented in SEAMSLIST.md

#### Error Cases

- **FileAccessError**: Access denied due to lock → `FILE_LOCKED`
- **FileNotFoundError**: File doesn't exist → `FILE_NOT_FOUND`
- **BatchAccessError**: Some files granted, others denied → `PARTIAL_GRANT`

#### Example Usage

```typescript
// Claude requests write access
const grant = await fileCoordination.requestFileAccess({
  path: '/src/services/AuthService.ts',
  operation: 'write',
  agentId: 'claude-code'
})

if (grant.data.granted) {
  // Perform file operations
  await editFile('/src/services/AuthService.ts', {...})

  // Release when done
  await fileCoordination.releaseFileAccess(grant.data)
} else {
  console.log(`File locked: ${grant.data.reason}`)
}

// Batch request for atomic multi-file operations
const grants = await fileCoordination.requestBatchFileAccess([
  { path: '/src/auth/Login.svelte', operation: 'write', agentId: 'copilot' },
  { path: '/src/auth/Signup.svelte', operation: 'write', agentId: 'copilot' }
])
```

#### Notes

- Advisory locking (not enforced by OS - agents must check before editing)
- Supports batch requests for atomic multi-file operations
- Read operations allow multiple readers, write operations exclusive
- Lock expiration prevents deadlocks from crashed agents

---

### Template for Each Seam:

```markdown
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
Image Upload Seam ──┘                                           │
                                                                 │
                                                                 ↓
Reference Selection Seam ──→ Grok Image Generation Seam ──→ Deck State Seam
```

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
```

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
  email: string  // Added later - BREAKS EVERYTHING
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
  email?: string  // Optional addition is safe
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

| Date | Author | Change |
|------|--------|--------|
| 2025-11-07 | Initial Setup | Created SEAMSLIST.md template |

---

**⚠️ IMPORTANT**: This file will be populated during the IDENTIFY phase of SDD implementation. Do not populate prematurely - let requirements drive seam discovery.
