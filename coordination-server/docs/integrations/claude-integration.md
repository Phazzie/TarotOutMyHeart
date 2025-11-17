# Claude Code Integration Guide - AI Coordination Server

## Overview

This guide covers integrating Claude Code with the AI Coordination Server for collaborative AI development. The server enables Claude to participate in multi-AI workflows, manage shared tasks, and coordinate with GitHub Copilot.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Server Connection Setup](#server-connection-setup)
3. [API Endpoint Reference](#api-endpoint-reference)
4. [Authentication & Authorization](#authentication--authorization)
5. [Workflow Examples](#workflow-examples)
6. [Error Handling Best Practices](#error-handling-best-practices)
7. [Troubleshooting](#troubleshooting)
8. [Performance Considerations](#performance-considerations)

---

## Prerequisites

### System Requirements

- **Node.js**: 18.0.0 or higher
- **TypeScript**: 4.5 or higher
- **Network**: Access to coordination server (localhost:3456 for development)
- **Environment**: Development or production environment with appropriate permissions

### Required Environment Variables

```bash
# Required
COORDINATION_SERVER_URL=http://localhost:3456

# Optional (with defaults)
CLAUDE_AGENT_ID=claude-code
COORDINATION_REQUEST_TIMEOUT_MS=30000
COORDINATION_MAX_RETRIES=3
COORDINATION_RETRY_BACKOFF_MS=1000
DEBUG_COORDINATION=false
```

### Installation

```bash
# Install SDK/client library
npm install @tarot/coordination-server

# Or use the coordination server locally
git clone <coordination-server-repo>
cd coordination-server
npm install
npm run dev  # Starts server on port 3456
```

### Verify Server is Running

```bash
# Health check
curl http://localhost:3456/health

# Expected response
{
  "status": "healthy",
  "timestamp": "2025-11-17T12:00:00Z",
  "config": {
    "useMocks": true,
    "mcpEnabled": true,
    "webSocketEnabled": true
  }
}
```

---

## Server Connection Setup

### Basic Connection

```typescript
import { CoordinationClient } from '@tarot/coordination-server'

// Initialize client
const client = new CoordinationClient({
  serverUrl: process.env.COORDINATION_SERVER_URL || 'http://localhost:3456',
  agentId: 'claude-code',
  requestTimeout: 30000,
  maxRetries: 3,
  retryBackoffMs: 1000,
  debug: process.env.DEBUG_COORDINATION === 'true'
})

// Verify connection
const health = await client.checkHealth()
console.log(`Server status: ${health.status}`)
```

### Advanced Configuration

```typescript
import { CoordinationClient } from '@tarot/coordination-server'

const client = new CoordinationClient({
  // Connection settings
  serverUrl: 'http://coordination-server:3456',
  agentId: 'claude-code-production',

  // Timeout configuration
  requestTimeout: 45000,       // Wait up to 45 seconds for responses
  connectionTimeout: 10000,    // Connection establishment timeout

  // Retry strategy (exponential backoff)
  maxRetries: 5,
  retryBackoffMs: 1000,       // Start with 1 second
  maxBackoffMs: 30000,        // Cap at 30 seconds
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],

  // Logging & debugging
  debug: true,
  logger: customLogger,
  logLevel: 'debug',

  // Connection pooling
  keepAlive: true,
  maxSockets: 50,

  // TLS/SSL (for production)
  tls: {
    enabled: true,
    certificatePath: '/etc/ssl/certs/ca-bundle.crt',
    rejectUnauthorized: true
  }
})

// Custom error handler
client.on('error', (error) => {
  console.error(`Coordination error: ${error.message}`)
  // Send alert to monitoring system
  alertingSystem.notify({
    severity: 'high',
    component: 'coordination',
    error: error
  })
})

// Connection lifecycle events
client.on('connected', () => {
  console.log('Connected to coordination server')
})

client.on('disconnected', () => {
  console.log('Disconnected from coordination server')
})

client.on('reconnecting', (attempt) => {
  console.log(`Reconnecting... attempt ${attempt}`)
})
```

### Real-time Updates via WebSocket

```typescript
// Subscribe to collaboration events
const sessionId = 'session-123'

const eventStream = await client.subscribeToUpdates(sessionId)

// Process events as they arrive
for await (const event of eventStream) {
  console.log(`Event: ${event.type}`)

  switch (event.type) {
    case 'task-completed':
      console.log(`Task ${event.taskId} completed by ${event.agentId}`)
      break
    case 'handoff-requested':
      console.log(`Handoff requested: ${event.fromAgent} → ${event.toAgent}`)
      break
    case 'progress-update':
      console.log(`Progress: ${event.progress.percentComplete}%`)
      break
  }
}
```

---

## API Endpoint Reference

### Agent Registration

**Purpose**: Register Claude Code agent with the coordination server

**Endpoint**: `POST /api/claude/register`

**Request**:
```bash
curl -X POST http://localhost:3456/api/claude/register \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "claude-code",
    "capabilities": [
      "typescript-development",
      "contract-definition",
      "test-writing",
      "documentation"
    ],
    "version": "1.0.0"
  }'
```

**TypeScript**:
```typescript
const response = await client.registerAgent({
  agentId: 'claude-code',
  capabilities: [
    'typescript-development',
    'contract-definition',
    'test-writing',
    'documentation'
  ],
  version: '1.0.0'
})

if (response.success) {
  console.log(`Registration token: ${response.data}`)
  // Store token for authentication
  saveToken(response.data)
} else {
  console.error(`Registration failed: ${response.error.message}`)
}
```

**Response** (Success):
```json
{
  "success": true,
  "data": "reg_550e8400-e29b-41d4-a716-446655440000"
}
```

**Response** (Error):
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CAPABILITIES",
    "message": "Agent must declare at least one capability",
    "retryable": false
  }
}
```

### Get Available Tasks

**Purpose**: Retrieve tasks that match Claude's capabilities

**Endpoint**: `GET /api/claude/tasks?capabilities=typescript-development,testing`

**Request**:
```bash
curl "http://localhost:3456/api/claude/tasks?capabilities=typescript-development,contract-definition" \
  -H "Authorization: Bearer reg_550e8400-e29b-41d4-a716-446655440000"
```

**TypeScript**:
```typescript
const tasks = await client.getAvailableTasks(
  ['typescript-development', 'contract-definition'],
  { limit: 10, priority: 'high' }
)

if (tasks.success && tasks.data) {
  console.log(`Found ${tasks.data.length} available tasks`)

  for (const task of tasks.data) {
    console.log(`
      Task: ${task.id}
      Type: ${task.type}
      Priority: ${task.priority}
      Description: ${task.description}
      Time Estimate: ${task.estimatedMinutes}m
    `)
  }
}
```

**Response** (Success):
```json
{
  "success": true,
  "data": [
    {
      "id": "task_001",
      "type": "implement-feature",
      "description": "Build user authentication system",
      "priority": "high",
      "estimatedMinutes": 120,
      "requiredCapabilities": ["typescript-development", "testing"],
      "createdAt": "2025-11-17T10:00:00Z",
      "deadline": "2025-11-18T10:00:00Z"
    }
  ]
}
```

### Claim Task

**Purpose**: Claim a task for execution

**Endpoint**: `POST /api/claude/tasks/{taskId}/claim`

**Request**:
```bash
curl -X POST http://localhost:3456/api/claude/tasks/task_001/claim \
  -H "Authorization: Bearer reg_550e8400-e29b-41d4-a716-446655440000"
```

**TypeScript**:
```typescript
const claimResult = await client.claimTask('task_001')

if (claimResult.success && claimResult.data) {
  const task = claimResult.data
  console.log(`Task claimed: ${task.id}`)
  console.log(`Description: ${task.description}`)
  console.log(`Context available: ${task.context}`)

  // Begin execution
  await executeTask(task)
} else {
  console.error(`Failed to claim task: ${claimResult.error.message}`)
  // Task may have been claimed by another agent
}
```

**Response** (Success):
```json
{
  "success": true,
  "data": {
    "id": "task_001",
    "type": "implement-feature",
    "description": "Build user authentication system",
    "context": "Authentication module should follow OAuth2 pattern",
    "claimedBy": "claude-code",
    "claimedAt": "2025-11-17T10:30:00Z"
  }
}
```

**Response** (Error):
```json
{
  "success": false,
  "error": {
    "code": "TASK_ALREADY_CLAIMED",
    "message": "Task task_001 already claimed by github-copilot",
    "retryable": false,
    "details": {
      "claimedBy": "github-copilot",
      "claimedAt": "2025-11-17T10:25:00Z"
    }
  }
}
```

### Report Progress

**Purpose**: Update task progress while executing

**Endpoint**: `POST /api/claude/tasks/{taskId}/progress`

**Request**:
```bash
curl -X POST http://localhost:3456/api/claude/tasks/task_001/progress \
  -H "Content-Type: application/json" \
  -d '{
    "percentComplete": 50,
    "currentStep": "Implementing authentication service",
    "filesModified": [
      "src/services/auth.ts",
      "src/types/auth.ts"
    ],
    "blockers": []
  }'
```

**TypeScript**:
```typescript
await client.reportProgress('task_001', {
  percentComplete: 25,
  currentStep: 'Analyzing requirements and creating contracts',
  filesModified: ['contracts/auth.ts'],
  blockers: [],
  notes: 'Contract definition complete, proceeding with mock implementation'
})

// Later: update progress
await client.reportProgress('task_001', {
  percentComplete: 50,
  currentStep: 'Implementing mock service',
  filesModified: [
    'contracts/auth.ts',
    'services/mock/AuthServiceMock.ts'
  ],
  blockers: []
})

// Final: update progress
await client.reportProgress('task_001', {
  percentComplete: 75,
  currentStep: 'Writing tests',
  filesModified: [
    'contracts/auth.ts',
    'services/mock/AuthServiceMock.ts',
    'tests/auth.test.ts'
  ],
  blockers: []
})
```

**Response** (Success):
```json
{
  "success": true,
  "data": {
    "taskId": "task_001",
    "percentComplete": 50,
    "currentStep": "Implementing authentication service",
    "lastUpdated": "2025-11-17T10:45:00Z"
  }
}
```

### Complete Task

**Purpose**: Submit task completion results

**Endpoint**: `POST /api/claude/tasks/{taskId}/complete`

**Request**:
```bash
curl -X POST http://localhost:3456/api/claude/tasks/task_001/complete \
  -H "Content-Type: application/json" \
  -d '{
    "success": true,
    "output": "Authentication system implemented with OAuth2 support",
    "filesModified": [
      "src/services/auth.ts",
      "src/types/auth.ts",
      "tests/auth.test.ts",
      "docs/auth.md"
    ],
    "notes": "All tests passing, documentation complete"
  }'
```

**TypeScript**:
```typescript
const completionResult = await client.completeTask('task_001', {
  success: true,
  output: `
    Authentication system fully implemented:
    - OAuth2 configuration
    - Token validation middleware
    - User session management
    - Full test coverage (95%)
  `,
  filesModified: [
    'src/services/auth.ts',
    'src/types/auth.ts',
    'src/middleware/auth-middleware.ts',
    'tests/auth.test.ts',
    'docs/auth.md'
  ],
  notes: 'Task completed successfully. Ready for review.',
  metrics: {
    linesAdded: 450,
    linesRemoved: 0,
    testCoverage: 95,
    durationMinutes: 120
  }
})

if (completionResult.success) {
  console.log('Task completed successfully')
  console.log(`Completion ID: ${completionResult.data?.completionId}`)
}
```

**Response** (Success):
```json
{
  "success": true,
  "data": {
    "taskId": "task_001",
    "completionId": "comp_550e8400-e29b-41d4-a716-446655440000",
    "completedAt": "2025-11-17T11:30:00Z",
    "totalDuration": "1h 30m",
    "agentId": "claude-code"
  }
}
```

### Retrieve Context

**Purpose**: Get shared conversation context

**Endpoint**: `GET /api/claude/context/{contextId}`

**Request**:
```bash
curl http://localhost:3456/api/claude/context/ctx_001 \
  -H "Authorization: Bearer reg_550e8400-e29b-41d4-a716-446655440000"
```

**TypeScript**:
```typescript
const context = await client.retrieveContext('ctx_001')

if (context.success && context.data) {
  console.log('Retrieved context:')
  console.log(`Agent: ${context.data.agent}`)
  console.log(`Task: ${context.data.taskId}`)
  console.log(`Messages: ${context.data.messages.length}`)

  // Use context for decision-making
  for (const msg of context.data.messages) {
    console.log(`[${msg.timestamp}] ${msg.agent}: ${msg.content}`)
  }
}
```

**Response** (Success):
```json
{
  "success": true,
  "data": {
    "id": "ctx_001",
    "taskId": "task_001",
    "agent": "claude-code",
    "messages": [
      {
        "timestamp": "2025-11-17T10:30:00Z",
        "agent": "claude-code",
        "content": "Starting task execution"
      },
      {
        "timestamp": "2025-11-17T10:35:00Z",
        "agent": "github-copilot",
        "content": "Offered assistance with specific patterns"
      }
    ]
  }
}
```

### Save Context

**Purpose**: Update shared conversation context

**Endpoint**: `PUT /api/claude/context/{contextId}`

**TypeScript**:
```typescript
await client.saveContext('ctx_001', {
  messages: [
    {
      timestamp: new Date().toISOString(),
      agent: 'claude-code',
      content: 'Completed contract definition phase'
    },
    {
      timestamp: new Date().toISOString(),
      agent: 'claude-code',
      content: 'Moving to mock service implementation'
    }
  ],
  metadata: {
    phase: 'implementation',
    progress: 50,
    nextSteps: ['Write tests', 'Code review']
  }
})
```

### Request Handoff

**Purpose**: Request task transfer to another agent

**Endpoint**: `POST /api/claude/handoff`

**Request**:
```bash
curl -X POST http://localhost:3456/api/claude/handoff \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": "task_001",
    "fromAgent": "claude-code",
    "toAgent": "github-copilot",
    "reason": "Requires real-time IDE integration",
    "currentState": "Contract defined, mock service ready",
    "nextSteps": [
      "Integrate with VS Code extension",
      "Test IDE interaction",
      "Deploy to production"
    ]
  }'
```

**TypeScript**:
```typescript
const handoff = await client.requestHandoff({
  taskId: 'task_001',
  fromAgent: 'claude-code',
  toAgent: 'github-copilot',
  reason: 'Task requires real-time IDE integration for best results',
  currentState: `
    ✅ Contract definition complete
    ✅ Mock service implemented
    ✅ Tests written (95% coverage)
    ⏳ Pending: Integration and deployment
  `,
  nextSteps: [
    'Integrate service into VS Code extension',
    'Test IDE interaction patterns',
    'Validate performance with real IDE',
    'Deploy to production'
  ]
})

if (handoff.success && handoff.data) {
  console.log(`Handoff initiated: ${handoff.data.id}`)
  console.log(`Status: ${handoff.data.status}`)

  // Wait for acceptance
  const accepted = await client.waitForHandoff(handoff.data.id, 300000) // 5 min timeout
  if (accepted) {
    console.log('Handoff accepted by other agent')
  }
}
```

**Response** (Success):
```json
{
  "success": true,
  "data": {
    "id": "handoff_001",
    "taskId": "task_001",
    "fromAgent": "claude-code",
    "toAgent": "github-copilot",
    "status": "pending",
    "createdAt": "2025-11-17T11:30:00Z"
  }
}
```

---

## Authentication & Authorization

### Token-Based Authentication

All requests must include the registration token obtained during agent registration:

```bash
# Include in Authorization header
curl -H "Authorization: Bearer reg_550e8400-e29b-41d4-a716-446655440000" \
  http://localhost:3456/api/claude/tasks
```

**TypeScript Client** (automatic):
```typescript
const client = new CoordinationClient({
  serverUrl: 'http://localhost:3456',
  agentId: 'claude-code'
})

// Register to get token
const regResult = await client.registerAgent({...})
// Client automatically stores and includes token in all requests
```

### Permission Model

Agents have permissions based on their claimed capabilities:

| Capability | Actions | Constraints |
|-----------|---------|-------------|
| `typescript-development` | Claim TS tasks, modify TS files | Task must require this capability |
| `contract-definition` | Define contracts, create interfaces | Can't modify implementations |
| `test-writing` | Write tests, modify test files | Can't modify production code |
| `documentation` | Update docs, modify markdown | Can't modify code files |

### Capability Validation

```typescript
// Only claim tasks matching your capabilities
const myCapabilities = [
  'typescript-development',
  'contract-definition',
  'test-writing'
]

const tasks = await client.getAvailableTasks(myCapabilities)
// Server filters tasks to only those requiring these capabilities
```

---

## Workflow Examples

### Complete Workflow: Contract Definition → Implementation → Testing

```typescript
/**
 * Complete workflow example: Feature development with coordination
 */

import { CoordinationClient } from '@tarot/coordination-server'

async function developFeature() {
  // 1. Initialize coordination
  const client = new CoordinationClient({
    serverUrl: 'http://localhost:3456',
    agentId: 'claude-code',
    debug: true
  })

  // 2. Register capabilities
  console.log('Step 1: Register agent capabilities')
  const regResult = await client.registerAgent({
    agentId: 'claude-code',
    capabilities: [
      'typescript-development',
      'contract-definition',
      'test-writing'
    ],
    version: '1.0.0'
  })
  if (!regResult.success) throw new Error(`Registration failed: ${regResult.error.message}`)
  console.log(`✅ Registered with token: ${regResult.data}`)

  // 3. Get available tasks
  console.log('\nStep 2: Get available tasks')
  const tasksResult = await client.getAvailableTasks([
    'typescript-development',
    'contract-definition'
  ])
  if (!tasksResult.success) throw new Error('Failed to get tasks')

  const task = tasksResult.data?.[0]
  if (!task) throw new Error('No available tasks')
  console.log(`✅ Found task: ${task.id}`)
  console.log(`   Type: ${task.type}`)
  console.log(`   Description: ${task.description}`)

  // 4. Claim task
  console.log('\nStep 3: Claim task')
  const claimResult = await client.claimTask(task.id)
  if (!claimResult.success) throw new Error(`Failed to claim task: ${claimResult.error.message}`)
  console.log(`✅ Task claimed: ${task.id}`)

  // 5. Begin work - Contract phase
  console.log('\nStep 4: Define contract')
  await client.reportProgress(task.id, {
    percentComplete: 10,
    currentStep: 'Analyzing requirements and defining contract',
    filesModified: ['contracts/Feature.ts']
  })

  // [AI performs contract definition work]
  const contractContent = defineContract(task)
  await saveFile('contracts/Feature.ts', contractContent)

  await client.reportProgress(task.id, {
    percentComplete: 20,
    currentStep: 'Contract definition complete',
    filesModified: ['contracts/Feature.ts']
  })
  console.log(`✅ Contract defined`)

  // 6. Implementation phase
  console.log('\nStep 5: Implement mock service')
  await client.reportProgress(task.id, {
    percentComplete: 30,
    currentStep: 'Implementing mock service',
    filesModified: ['services/mock/Feature.ts']
  })

  const mockImplementation = implementMockService(contractContent)
  await saveFile('services/mock/Feature.ts', mockImplementation)

  await client.reportProgress(task.id, {
    percentComplete: 50,
    currentStep: 'Mock service implementation complete',
    filesModified: ['services/mock/Feature.ts']
  })
  console.log(`✅ Mock service implemented`)

  // 7. Testing phase
  console.log('\nStep 6: Write comprehensive tests')
  await client.reportProgress(task.id, {
    percentComplete: 60,
    currentStep: 'Writing unit tests',
    filesModified: ['tests/Feature.test.ts']
  })

  const testContent = writeTests(contractContent, mockImplementation)
  await saveFile('tests/Feature.test.ts', testContent)

  await client.reportProgress(task.id, {
    percentComplete: 80,
    currentStep: 'Tests written and passing',
    filesModified: ['tests/Feature.test.ts']
  })
  console.log(`✅ Tests written and passing`)

  // 8. Documentation
  console.log('\nStep 7: Update documentation')
  await client.reportProgress(task.id, {
    percentComplete: 90,
    currentStep: 'Writing documentation',
    filesModified: ['docs/Feature.md']
  })

  const docsContent = writeDocumentation(task)
  await saveFile('docs/Feature.md', docsContent)

  // 9. Complete task
  console.log('\nStep 8: Complete task')
  const completeResult = await client.completeTask(task.id, {
    success: true,
    output: `
      Feature implementation complete:
      - Contract defined with comprehensive types
      - Mock service implementing full contract
      - Tests written with 95% coverage
      - Documentation complete
    `,
    filesModified: [
      'contracts/Feature.ts',
      'services/mock/Feature.ts',
      'tests/Feature.test.ts',
      'docs/Feature.md'
    ],
    notes: 'Ready for code review and integration testing'
  })

  if (completeResult.success) {
    console.log(`✅ Task completed: ${completeResult.data?.completionId}`)
  } else {
    throw new Error(`Failed to complete task: ${completeResult.error.message}`)
  }

  console.log('\n✅ Feature development workflow complete!')
}

// Run workflow
developFeature().catch(console.error)
```

### Parallel Workflow: Coordination Between Two Agents

```typescript
/**
 * Parallel workflow: Claude and Copilot working on different aspects
 */

// In Claude Code session
async function claudeWorkflow(client: CoordinationClient) {
  console.log('Claude: Starting contract definition phase')

  const task = await client.getAvailableTasks(['contract-definition'])
  await client.claimTask(task.data![0].id)

  // Do contract work
  await client.reportProgress(task.data![0].id, {
    percentComplete: 100,
    currentStep: 'Contract definition complete',
    filesModified: ['contracts/API.ts']
  })

  // Request handoff to Copilot
  const handoff = await client.requestHandoff({
    taskId: task.data![0].id,
    fromAgent: 'claude-code',
    toAgent: 'github-copilot',
    reason: 'Implementation requires IDE integration',
    currentState: 'Contract defined and validated',
    nextSteps: ['Implement in IDE', 'Test with real environment', 'Deploy']
  })

  console.log(`Claude: Handoff initiated (${handoff.data?.id})`)
  return handoff
}

// In GitHub Copilot session
async function copilotWorkflow(client: CoordinationClient, handoffId: string) {
  console.log('Copilot: Accepting handoff')

  const handoff = await client.acceptHandoff(handoffId)
  const task = handoff.data!.taskId

  // Get context from Claude
  const context = await client.retrieveContext(handoff.data!.contextId)
  console.log(`Copilot: Retrieved context from ${context.data?.messages[0].agent}`)

  // Do implementation work
  await client.reportProgress(task, {
    percentComplete: 100,
    currentStep: 'Implementation complete with IDE integration',
    filesModified: ['services/api.ts', 'integration.ts']
  })

  // Complete task
  await client.completeTask(task, {
    success: true,
    output: 'Implementation complete and tested in IDE',
    filesModified: ['services/api.ts', 'integration.ts', 'tests/integration.test.ts']
  })

  console.log('Copilot: Task completed')
}
```

---

## Error Handling Best Practices

### Comprehensive Error Handling

```typescript
/**
 * Best practices for error handling in coordination workflows
 */

async function robustCoordinationWorkflow() {
  const client = new CoordinationClient({
    serverUrl: 'http://localhost:3456',
    agentId: 'claude-code',
    maxRetries: 3,
    retryBackoffMs: 1000
  })

  try {
    // Register with validation
    const regResult = await client.registerAgent({
      agentId: 'claude-code',
      capabilities: ['typescript-development'],
      version: '1.0.0'
    })

    if (!regResult.success) {
      switch (regResult.error?.code) {
        case 'INVALID_CAPABILITIES':
          console.error('Missing required capabilities')
          // Add missing capabilities and retry
          break
        case 'AGENT_ALREADY_REGISTERED':
          console.warn('Agent already registered, continuing...')
          break
        default:
          throw new Error(`Registration failed: ${regResult.error?.message}`)
      }
    }

    // Get tasks with error handling
    let tasks = null
    let retries = 0
    while (!tasks && retries < 3) {
      try {
        const result = await client.getAvailableTasks(['typescript-development'])
        if (result.success) {
          tasks = result.data
        } else if (result.error?.retryable) {
          retries++
          const delayMs = Math.min(1000 * Math.pow(2, retries), 10000)
          await new Promise(r => setTimeout(r, delayMs))
        } else {
          throw new Error(`Non-retryable error: ${result.error?.message}`)
        }
      } catch (error) {
        console.error(`Failed to get tasks: ${error}`)
        throw error
      }
    }

    if (!tasks || tasks.length === 0) {
      console.log('No tasks available, exiting gracefully')
      return
    }

    // Claim task with conflict handling
    const task = tasks[0]
    let claimed = false

    for (let attempt = 0; attempt < 2; attempt++) {
      const claimResult = await client.claimTask(task.id)

      if (claimResult.success) {
        console.log(`Task claimed: ${task.id}`)
        claimed = true
        break
      } else if (claimResult.error?.code === 'TASK_ALREADY_CLAIMED') {
        console.warn(`Task already claimed by ${claimResult.error?.details?.claimedBy}`)
        // Try next task
        if (attempt === 0 && tasks.length > 1) {
          task = tasks[attempt + 1]
        }
      } else if (claimResult.error?.retryable) {
        // Retry with backoff
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)))
      } else {
        throw new Error(`Failed to claim task: ${claimResult.error?.message}`)
      }
    }

    if (!claimed) {
      throw new Error('Failed to claim any available task')
    }

    // Execute with progress reporting and error recovery
    try {
      await executeTaskWithErrorRecovery(client, task)
    } catch (executionError) {
      // Report failure
      const completeResult = await client.completeTask(task.id, {
        success: false,
        output: 'Task execution failed',
        error: executionError instanceof Error ? executionError.message : String(executionError)
      })

      if (!completeResult.success) {
        console.error(`Failed to report completion: ${completeResult.error?.message}`)
      }

      throw executionError
    }

  } catch (error) {
    // Final error handling
    console.error(`Workflow failed: ${error}`)

    // Attempt cleanup
    try {
      await client.disconnect()
    } catch (closeError) {
      console.error(`Failed to disconnect: ${closeError}`)
    }

    throw error
  }
}

async function executeTaskWithErrorRecovery(
  client: CoordinationClient,
  task: any
) {
  let lastError: any = null

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      // Report progress
      await client.reportProgress(task.id, {
        percentComplete: 25 + (attempt * 25),
        currentStep: `Execution attempt ${attempt + 1}`,
        filesModified: []
      })

      // Execute actual work
      await performWork(task)

      // Success
      await client.completeTask(task.id, {
        success: true,
        output: 'Task completed successfully',
        filesModified: ['output.ts']
      })

      return

    } catch (error) {
      lastError = error
      console.error(`Attempt ${attempt + 1} failed: ${error}`)

      if (attempt < 2) {
        // Exponential backoff before retry
        const delayMs = Math.min(1000 * Math.pow(2, attempt), 10000)
        await new Promise(r => setTimeout(r, delayMs))
      }
    }
  }

  // All attempts failed
  throw new Error(`Task execution failed after 3 attempts: ${lastError}`)
}

async function performWork(task: any) {
  // Actual work implementation
}
```

### Common Error Codes

| Error Code | Cause | Retryable | Action |
|-----------|-------|-----------|--------|
| `INVALID_CAPABILITIES` | Agent declared invalid capabilities | No | Update capabilities and re-register |
| `TASK_ALREADY_CLAIMED` | Another agent claimed task first | No | Select another task |
| `AGENT_NOT_REGISTERED` | Must register before claiming tasks | No | Call `/api/claude/register` |
| `REQUEST_TIMEOUT` | Server took too long to respond | Yes | Retry with exponential backoff |
| `SERVER_ERROR` | Server-side error (500) | Yes | Retry with exponential backoff |
| `NETWORK_ERROR` | Connection issue | Yes | Check network, retry |
| `INVALID_TOKEN` | Registration token expired/invalid | No | Re-register with server |

---

## Troubleshooting

### Top 10 Common Issues & Solutions

#### 1. **Server Connection Refused**

**Symptom**: `ECONNREFUSED: Connection refused at ::1:3456`

**Causes**:
- Server not running
- Wrong port configured
- Firewall blocking connection

**Solution**:
```bash
# Check server is running
curl http://localhost:3456/health

# If not running, start it
cd coordination-server
npm run dev

# Check port in use
lsof -i :3456

# If another process uses port, change COORDINATION_SERVER_URL
export COORDINATION_SERVER_URL=http://localhost:3457
```

#### 2. **Agent Registration Fails**

**Symptom**: `{"error":{"code":"INVALID_CAPABILITIES"}}`

**Causes**:
- Empty capabilities array
- Invalid capability name
- Malformed request

**Solution**:
```typescript
// Ensure capabilities array is non-empty
const capabilities = ['typescript-development'] // At least one required

if (!Array.isArray(capabilities) || capabilities.length === 0) {
  throw new Error('Must provide at least one capability')
}

const result = await client.registerAgent({
  agentId: 'claude-code',
  capabilities, // Non-empty array
  version: '1.0.0'
})
```

#### 3. **Task Claims Fail Immediately**

**Symptom**: `{"error":{"code":"TASK_ALREADY_CLAIMED"}}`

**Causes**:
- Another agent claimed task first
- Race condition between agents
- Task queue moving too fast

**Solution**:
```typescript
// Implement retry logic with task rotation
async function claimAvailableTask(client: CoordinationClient) {
  const tasks = await client.getAvailableTasks(['typescript-development'])

  for (const task of tasks.data || []) {
    const result = await client.claimTask(task.id)

    if (result.success) {
      return result.data
    }
    // Task was claimed, try next one
  }

  // No tasks available
  return null
}
```

#### 4. **Progress Reports Time Out**

**Symptom**: `Request timeout after 30000ms`

**Causes**:
- Server overloaded
- Network latency
- Many progress updates too frequently

**Solution**:
```typescript
// Increase timeout and reduce frequency
const client = new CoordinationClient({
  serverUrl: 'http://localhost:3456',
  requestTimeout: 60000, // 60 seconds
  agentId: 'claude-code'
})

// Report progress less frequently
const reportInterval = setInterval(async () => {
  await client.reportProgress(taskId, {
    percentComplete: currentProgress,
    currentStep: 'Working...',
    filesModified: []
  })
}, 10000) // Every 10 seconds instead of every update
```

#### 5. **Authentication Token Errors**

**Symptom**: `{"error":{"code":"INVALID_TOKEN"}}`

**Causes**:
- Token expired
- Token not included in request
- Malformed authorization header

**Solution**:
```typescript
// Ensure token is properly included
const client = new CoordinationClient({
  serverUrl: 'http://localhost:3456',
  agentId: 'claude-code'
})

// Client manages token automatically
// Or manually include in requests:
const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
}

// If token expires, re-register
if (result.error?.code === 'INVALID_TOKEN') {
  const newToken = await client.registerAgent({...})
}
```

#### 6. **File Lock Conflicts**

**Symptom**: `{"error":{"code":"FILE_LOCKED"}}`

**Causes**:
- Another agent has file locked
- Lock not released from previous session
- Two agents writing to same file

**Solution**:
```typescript
// Check status and active locks
const status = await client.getStatus()
console.log('Active locks:', status.data?.activeLocks)

// Request file access with conflict resolution
const lockResult = await client.requestFileAccess({
  path: 'src/auth.ts',
  operation: 'write'
})

if (lockResult.success) {
  // Modify file
  await modifyFile('src/auth.ts')

  // Release lock
  await client.releaseFileAccess(lockResult.data!.lockToken)
} else if (lockResult.error?.code === 'FILE_LOCKED') {
  console.log(`File locked by: ${lockResult.error?.details?.lockedBy}`)
  // Wait and retry
  await new Promise(r => setTimeout(r, 5000))
}
```

#### 7. **WebSocket Connection Issues**

**Symptom**: `WebSocket connection failed` or events not arriving

**Causes**:
- WebSocket disabled in config
- Network firewall blocking WebSockets
- Connection dropped silently

**Solution**:
```typescript
// Check WebSocket is enabled
const health = await client.checkHealth()
if (!health.config.webSocketEnabled) {
  console.error('WebSocket disabled in server config')
}

// Subscribe with error handling
const stream = await client.subscribeToUpdates(sessionId)

// Handle connection drops
stream.on('error', (error) => {
  console.error('WebSocket error:', error)
  // Reconnect
  reconnect()
})

stream.on('close', () => {
  console.log('WebSocket closed, attempting reconnect...')
  // Implement reconnection logic
})
```

#### 8. **High Latency / Slow Responses**

**Symptom**: All requests take 5+ seconds

**Causes**:
- Server overloaded
- Network latency
- Database slow queries
- Too many concurrent agents

**Solution**:
```bash
# Check server metrics
curl http://localhost:3456/metrics

# Check logs for slow queries
grep "processingTimeMs" logs/coordination.log | \
  jq 'select(.processingTimeMs > 5000)'

# Scale server resources
# Increase: NODE_OPTIONS=--max-old-space-size=4096

# Or load balance across multiple server instances
npm run dev &
npm run dev -- --port 3457 &
# Use reverse proxy to distribute requests
```

#### 9. **Coordination State Out of Sync**

**Symptom**: Server shows task as completed, client doesn't know

**Causes**:
- Network latency between completion and notification
- Client didn't receive WebSocket event
- State desynchronization

**Solution**:
```typescript
// Always verify state before critical operations
async function verifyTaskState(taskId: string) {
  const status = await client.getStatus()
  const tasks = status.data?.tasks || []

  const task = tasks.find(t => t.id === taskId)
  console.log(`Task ${taskId} state: ${task?.state}`)

  return task
}

// Implement periodic state reconciliation
setInterval(async () => {
  const serverState = await client.getStatus()
  const localState = getCurrentLocalState()

  if (serverState !== localState) {
    console.warn('State mismatch detected, syncing...')
    await syncState(serverState)
  }
}, 30000)
```

#### 10. **Memory Leaks in Long-Running Sessions**

**Symptom**: Memory usage grows indefinitely over hours

**Causes**:
- Event listeners not cleaned up
- Request buffers accumulating
- WebSocket connections not properly closed

**Solution**:
```typescript
// Cleanup properly
async function cleanup() {
  // Close event listeners
  client.removeAllListeners()

  // Close WebSocket connections
  if (eventStream) {
    eventStream.destroy()
  }

  // Disconnect client
  await client.disconnect()

  // Clear timers
  clearInterval(reportInterval)
  clearTimeout(retryTimeout)
}

// Periodic cleanup in long-running processes
setInterval(async () => {
  // Cleanup completed tasks from memory
  completedTasks = completedTasks.slice(-1000) // Keep only recent 1000

  // Force garbage collection (if allowed)
  if (global.gc) {
    global.gc()
  }
}, 300000) // Every 5 minutes

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...')
  await cleanup()
  process.exit(0)
})
```

---

## Performance Considerations

### Request Rate Limits

```typescript
// Server enforces per-agent rate limits
// Default: 100 requests/minute for claude-code
// Default: 50 requests/minute for github-copilot

// Check current limits in response headers
const result = await client.registerAgent({...})
const limit = result._headers?.['x-ratelimit-limit']
const remaining = result._headers?.['x-ratelimit-remaining']
const reset = result._headers?.['x-ratelimit-reset']

console.log(`Rate limit: ${remaining}/${limit} remaining`)
console.log(`Resets at: ${new Date(parseInt(reset) * 1000).toISOString()}`)
```

### Optimization Tips

1. **Batch Progress Updates**: Report every 30 seconds, not every action
2. **Connection Pooling**: Reuse client instances across requests
3. **Timeout Configuration**: Balance between reliability and responsiveness
4. **Event Streaming**: Use WebSocket for real-time updates instead of polling
5. **Context Compression**: Store metadata instead of full messages in shared context

### Monitoring

```bash
# Monitor server health
watch -n 1 'curl -s http://localhost:3456/health | jq .'

# Monitor metrics
curl http://localhost:3456/metrics | grep coordination

# Monitor logs
tail -f logs/coordination.log | jq 'select(.processingTimeMs > 1000)'
```

---

## Related Documentation

- [README.md](../README.md) - Server overview
- [Monitoring Guide](../monitoring-guide.md) - Server health and metrics
- [Logging Guide](../logging-guide.md) - Understanding server logs
- [Copilot Integration Guide](./copilot-integration.md) - GitHub Copilot setup
- [.env.example](../../.env.example) - Environment configuration

---

**Last Updated**: November 17, 2025
**Version**: 1.0.0
**Status**: Production Ready
