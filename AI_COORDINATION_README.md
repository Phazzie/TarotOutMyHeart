# AI Coordination Server

A multi-agent coordination system for managing interactions between AI agents (Claude, GitHub Copilot) and users.

## Overview

The AI Coordination Server provides a structured way for multiple AI agents to work together on tasks while coordinating file access, managing shared state, and communicating with users.

## Architecture

### Core Services

1. **StateStore** - Central state management
2. **ClaudeCoordination** - Claude AI agent interface
3. **CopilotCoordination** - GitHub Copilot agent interface
4. **UserCoordination** - User interaction and notifications
5. **FileSystemCoordination** - Safe file operations with conflict detection

### Design Principles

- **Contract-First**: All services defined through TypeScript contracts
- **Mock-First Development**: Complete mock implementations for testing
- **Type Safety**: No `any` types, full TypeScript strict mode
- **Testability**: Comprehensive test coverage (143 tests)

## Quick Start

### Installation

```bash
npm install
```

### Running Tests

```bash
# All tests
npm run test:all

# Contract tests only
npm run test:contracts

# Mock behavior tests
npm run test:mocks

# Integration tests
npm run test:integration
```

### Using the Services

```typescript
import { StateStoreMock } from './services/mock/StateStoreMock'
import { ClaudeCoordinationMock } from './services/mock/ClaudeCoordinationMock'
import { TaskPriority, TaskStatus, ClaudeTaskType } from './contracts'

// Initialize services
const stateStore = new StateStoreMock()
const claude = new ClaudeCoordinationMock()

// Enqueue a task
const task = await stateStore.enqueueTask({
  description: 'Review code changes',
  priority: TaskPriority.HIGH,
  status: TaskStatus.PENDING,
})

// Assign to Claude
const assignment = await claude.assignTask({
  taskType: ClaudeTaskType.CODE_REVIEW,
  prompt: 'Review the authentication module',
  contextFiles: ['/src/auth.ts'],
})

// Wait for completion
await new Promise(resolve => setTimeout(resolve, 200))

// Get results
const result = await claude.getTaskResult(assignment.data!.taskId)
console.log(result.data?.content)
```

## Contracts

### StateStore Contract

**Purpose**: Manages shared state for coordination between AI agents

**Key Operations**:

- Task queue management (enqueue, dequeue, update status)
- File lock coordination (acquire, release, check)
- Shared context storage (set, get, delete)

**Example**:

```typescript
// Task queue
await stateStore.enqueueTask({
  description: 'Generate tests',
  priority: TaskPriority.HIGH,
  status: TaskStatus.PENDING,
})

const task = await stateStore.dequeueTask('claude')

// File locking
const locked = await stateStore.acquireFileLock('/src/feature.ts', 'claude')
// ... do work ...
await stateStore.releaseFileLock('/src/feature.ts', 'claude')

// Context sharing
await stateStore.setContext('current-feature', { name: 'auth' }, 'claude')
const context = await stateStore.getContext('current-feature')
```

### ClaudeCoordination Contract

**Purpose**: Interface for coordinating with Claude AI agent

**Task Types**:

- CODE_REVIEW
- CODE_GENERATION
- DOCUMENTATION
- REFACTORING
- TESTING
- ANALYSIS

**Example**:

```typescript
// Assign task
const response = await claude.assignTask({
  taskType: ClaudeTaskType.CODE_GENERATION,
  prompt: 'Implement user authentication',
  contextFiles: ['/src/auth.ts'],
  priority: 2,
})

// Check status
const status = await claude.getStatus()
console.log(status.data?.status) // BUSY or IDLE

// Get result
const result = await claude.getTaskResult(response.data!.taskId)
console.log(result.data?.content)
```

### CopilotCoordination Contract

**Purpose**: Interface for coordinating with GitHub Copilot agent

**Task Types**:

- CODE_COMPLETION
- CODE_SUGGESTION
- INLINE_CHAT
- WORKSPACE_EDIT
- UNIT_TEST

**Example**:

```typescript
// Assign task
const response = await copilot.assignTask({
  taskType: CopilotTaskType.CODE_COMPLETION,
  prompt: 'Complete this function',
  filePath: '/src/utils.ts',
  codeContext: 'function authenticate(user) {',
  priority: 1,
})

// Get result with confidence score
const result = await copilot.getTaskResult(response.data!.taskId)
console.log(result.data?.confidence) // 0.85
```

### UserCoordination Contract

**Purpose**: Interface for user interaction in the AI coordination system

**Request Types**:

- APPROVE_CHANGE
- PROVIDE_INPUT
- RESOLVE_CONFLICT
- SELECT_OPTION
- REVIEW_OUTPUT

**Example**:

```typescript
// Create user request
const request = await userCoord.createRequest({
  type: UserRequestType.APPROVE_CHANGE,
  title: 'Review code changes',
  description: 'Claude has completed the implementation',
  requestedBy: 'claude',
  context: { files: ['/src/feature.ts'] },
})

// User responds
await userCoord.respondToRequest({
  requestId: request.data!.id,
  approved: true,
  comment: 'Looks good!',
  respondedAt: new Date(),
})

// Send notification
await userCoord.sendNotification({
  level: 'success',
  message: 'Task completed',
  from: 'claude',
})
```

### FileSystemCoordination Contract

**Purpose**: Coordinated file system operations for multiple agents

**Operations**:

- Read, write, create, delete files
- Track change history
- Detect and resolve conflicts
- Revert changes

**Example**:

```typescript
// Create file
await fs.createFile('/src/feature.ts', '// Initial code', 'user')

// Read file
const content = await fs.readFile('/src/feature.ts', 'claude')

// Write with tracking
await fs.writeFile('/src/feature.ts', 'updated code', 'claude', 'Added validation')

// Get history
const history = await fs.getFileHistory('/src/feature.ts')

// Detect conflicts
const conflicts = await fs.detectConflicts()

// Resolve conflict
if (conflicts.data && conflicts.data.length > 0) {
  await fs.resolveConflict(conflicts.data[0].id, {
    resolvedBy: 'user',
    resolvedAt: new Date(),
    finalContent: 'merged version',
    strategy: 'merge',
  })
}
```

## Test Coverage

### Contract Tests (117 tests)

- **StateStore**: 24 tests covering task queue, file locks, contexts, and cleanup
- **ClaudeCoordination**: 21 tests covering task assignment, status, results, cancellation
- **CopilotCoordination**: 20 tests covering task types, results, availability
- **UserCoordination**: 24 tests covering requests, responses, notifications
- **FileSystemCoordination**: 28 tests covering file operations, history, conflicts

### Mock Behavior Tests (18 tests)

- Priority-based task ordering
- Lock expiration timing
- Metadata preservation
- Context persistence
- Edge cases and error handling

### Integration Tests (8 tests)

- Multi-agent workflow coordination
- File conflict resolution
- Task coordination with state store
- File locking mechanisms
- Context sharing between agents
- Error handling scenarios
- Complete feature development workflow

## Workflow Examples

### Code Review Workflow

```typescript
// 1. Create file
await fs.createFile('/src/feature.ts', 'initial code', 'user')

// 2. Copilot generates code
const copilotTask = await copilot.assignTask({
  taskType: CopilotTaskType.CODE_COMPLETION,
  prompt: 'Complete the function',
  filePath: '/src/feature.ts',
})

await waitForCompletion(150)
const code = await copilot.getTaskResult(copilotTask.data!.taskId)

// 3. Update file
await fs.writeFile('/src/feature.ts', code.data!.content, 'copilot')

// 4. Request user approval
const request = await userCoord.createRequest({
  type: UserRequestType.APPROVE_CHANGE,
  title: 'Review Copilot changes',
  description: 'Code is ready for review',
  requestedBy: 'copilot',
})

// 5. User approves
await userCoord.respondToRequest({
  requestId: request.data!.id,
  approved: true,
  respondedAt: new Date(),
})

// 6. Claude reviews
const reviewTask = await claude.assignTask({
  taskType: ClaudeTaskType.CODE_REVIEW,
  prompt: 'Review implementation',
  contextFiles: ['/src/feature.ts'],
})

await waitForCompletion(150)
const review = await claude.getTaskResult(reviewTask.data!.taskId)

// 7. Notify user
await userCoord.sendNotification({
  level: 'success',
  message: 'Code review complete',
  from: 'claude',
  data: { review: review.data!.content },
})
```

### File Conflict Resolution

```typescript
// 1. Multiple agents modify same file
await fs.createFile('/src/shared.ts', 'original', 'user')
await fs.writeFile('/src/shared.ts', 'claude version', 'claude')
await fs.writeFile('/src/shared.ts', 'copilot version', 'copilot')

// 2. Detect conflicts
const conflicts = await fs.detectConflicts()

// 3. Request user to resolve
const request = await userCoord.createRequest({
  type: UserRequestType.RESOLVE_CONFLICT,
  title: 'Resolve file conflict',
  description: 'Multiple agents modified the file',
  requestedBy: 'system' as 'claude',
})

// 4. User resolves
await userCoord.respondToRequest({
  requestId: request.data!.id,
  approved: true,
  value: 'merge',
  respondedAt: new Date(),
})

// 5. Apply resolution
if (conflicts.data && conflicts.data.length > 0) {
  await fs.resolveConflict(conflicts.data[0].id, {
    resolvedBy: 'user',
    resolvedAt: new Date(),
    finalContent: 'merged version',
    strategy: 'merge',
  })
}
```

## Best Practices

### 1. Always Use File Locks

```typescript
// ✅ Good: Use locks for coordinated access
await stateStore.acquireFileLock('/src/file.ts', 'claude')
try {
  await fs.writeFile('/src/file.ts', 'content', 'claude')
} finally {
  await stateStore.releaseFileLock('/src/file.ts', 'claude')
}

// ❌ Bad: Direct write without coordination
await fs.writeFile('/src/file.ts', 'content', 'claude')
```

### 2. Check Agent Availability

```typescript
// ✅ Good: Check before assigning
const available = await claude.isAvailable()
if (available) {
  await claude.assignTask({ ... })
} else {
  // Queue or wait
}

// ❌ Bad: Assign without checking
await claude.assignTask({ ... })
```

### 3. Handle Errors Gracefully

```typescript
// ✅ Good: Handle errors
const result = await claude.assignTask({ ... })
if (!result.success) {
  await userCoord.sendNotification({
    level: 'error',
    message: result.error!.message,
    from: 'system' as 'claude'
  })
}

// ❌ Bad: Ignore errors
await claude.assignTask({ ... })
```

### 4. Use Context for State Sharing

```typescript
// ✅ Good: Share context between agents
await stateStore.setContext(
  'current-feature',
  {
    name: 'authentication',
    status: 'in-progress',
    files: ['/src/auth.ts'],
  },
  'claude'
)

// Copilot can use this context
const context = await stateStore.getContext('current-feature')

// ❌ Bad: Each agent has isolated state
```

## Development Workflow

Following Seam-Driven Development (SDD) methodology:

1. **Contracts Defined**: ✅ All 5 contracts complete
2. **Mocks Implemented**: ✅ All 5 mocks complete
3. **Tests Written**: ✅ 143 tests passing
4. **Real Services**: ⏸️ Pending (mocks fully functional for development)
5. **Integration**: ⏸️ Pending (integration tests defined)

## Future Work

- Implement real service backends
- Add persistence layer for state store
- Add authentication and authorization
- Add rate limiting and throttling
- Add metrics and monitoring
- Add distributed coordination support

## Contributing

When adding new features:

1. Define contract first in `/contracts`
2. Implement mock in `/services/mock`
3. Write tests in `/tests/contracts`
4. Verify all tests pass
5. Update SEAMSLIST.md

## License

See repository LICENSE file.
