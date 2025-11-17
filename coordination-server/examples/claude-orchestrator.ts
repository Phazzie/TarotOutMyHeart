/**
 * @fileoverview Claude Code Orchestrator Example
 * @purpose Demonstrates complete workflow for Claude Code using the coordination server
 * @dataFlow Task Queue → Claude Coordination → Task Execution → Result Submission
 * @boundary Shows integration between Claude and coordination server
 * @example
 * ts-node examples/claude-orchestrator.ts
 */

import { v4 as uuidv4 } from 'uuid'

/**
 * Simulated Coordination Client
 * In production, this would be the actual @tarot/coordination-server client
 */
class CoordinationClient {
  private serverUrl: string
  private agentId: string
  private token: string | null = null

  constructor(serverUrl: string, agentId: string) {
    this.serverUrl = serverUrl
    this.agentId = agentId
  }

  async registerAgent(options: {
    agentId: string
    capabilities: string[]
    version: string
  }): Promise<{ success: boolean; data?: string; error?: any }> {
    console.log(`[REGISTER] Agent: ${options.agentId}`)
    console.log(`[REGISTER] Capabilities: ${options.capabilities.join(', ')}`)

    // Simulate API call
    await this.delay(100)

    this.token = `reg_${uuidv4()}`
    console.log(`[REGISTER] ✅ Registered with token: ${this.token}`)

    return {
      success: true,
      data: this.token
    }
  }

  async getAvailableTasks(capabilities: string[]): Promise<{
    success: boolean
    data?: Array<{
      id: string
      type: string
      description: string
      priority: string
      estimatedMinutes: number
    }>
  }> {
    console.log(`[TASKS] Querying available tasks...`)
    console.log(`[TASKS] Capabilities: ${capabilities.join(', ')}`)

    await this.delay(150)

    // Return mock tasks
    const tasks = [
      {
        id: 'task_001',
        type: 'contract-definition',
        description: 'Define authentication service contract',
        priority: 'high',
        estimatedMinutes: 45
      },
      {
        id: 'task_002',
        type: 'implementation',
        description: 'Implement mock authentication service',
        priority: 'high',
        estimatedMinutes: 90
      },
      {
        id: 'task_003',
        type: 'test-writing',
        description: 'Write comprehensive auth tests',
        priority: 'high',
        estimatedMinutes: 60
      }
    ]

    console.log(`[TASKS] ✅ Found ${tasks.length} available tasks`)

    return {
      success: true,
      data: tasks
    }
  }

  async claimTask(taskId: string): Promise<{
    success: boolean
    data?: { id: string; type: string; description: string }
    error?: any
  }> {
    console.log(`[CLAIM] Claiming task: ${taskId}`)

    await this.delay(100)

    console.log(`[CLAIM] ✅ Task claimed successfully`)

    return {
      success: true,
      data: {
        id: taskId,
        type: 'task',
        description: 'Task details'
      }
    }
  }

  async reportProgress(taskId: string, progress: {
    percentComplete: number
    currentStep: string
    filesModified: string[]
  }): Promise<{ success: boolean }> {
    console.log(`[PROGRESS] Task: ${taskId}`)
    console.log(`[PROGRESS] Progress: ${progress.percentComplete}%`)
    console.log(`[PROGRESS] Step: ${progress.currentStep}`)

    await this.delay(80)

    console.log(`[PROGRESS] ✅ Progress reported`)

    return { success: true }
  }

  async completeTask(taskId: string, result: {
    success: boolean
    output: string
    filesModified: string[]
  }): Promise<{ success: boolean; data?: any }> {
    console.log(`[COMPLETE] Submitting task results: ${taskId}`)
    console.log(`[COMPLETE] Status: ${result.success ? 'SUCCESS' : 'FAILED'}`)
    console.log(`[COMPLETE] Output: ${result.output}`)
    console.log(`[COMPLETE] Files modified: ${result.filesModified.length}`)

    await this.delay(100)

    console.log(`[COMPLETE] ✅ Task completed and submitted`)

    return {
      success: true,
      data: {
        completionId: `comp_${uuidv4()}`,
        completedAt: new Date().toISOString()
      }
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

/**
 * Simulated work that Claude would perform
 */
async function defineContract(): Promise<string> {
  console.log(`[WORK] Analyzing requirements...`)
  await new Promise(r => setTimeout(r, 500))

  console.log(`[WORK] Writing contract definitions...`)
  await new Promise(r => setTimeout(r, 800))

  return `
// Contract for Authentication Service
export interface IAuthService {
  /**
   * Authenticate user with credentials
   */
  authenticate(email: string, password: string): Promise<AuthToken>

  /**
   * Validate authentication token
   */
  validateToken(token: AuthToken): Promise<boolean>

  /**
   * Revoke authentication token
   */
  revokeToken(token: AuthToken): Promise<void>
}
  `
}

async function implementMockService(): Promise<string> {
  console.log(`[WORK] Creating mock service implementation...`)
  await new Promise(r => setTimeout(r, 1000))

  console.log(`[WORK] Adding mock data...`)
  await new Promise(r => setTimeout(r, 600))

  return `
export class AuthServiceMock implements IAuthService {
  private users = new Map<string, any>()

  async authenticate(email: string, password: string): Promise<AuthToken> {
    // Mock implementation
    return {
      token: uuidv4(),
      expiresAt: new Date(Date.now() + 3600000)
    }
  }

  // ... other methods
}
  `
}

async function writeTests(): Promise<string> {
  console.log(`[WORK] Writing unit tests...`)
  await new Promise(r => setTimeout(r, 1200))

  console.log(`[WORK] Writing integration tests...`)
  await new Promise(r => setTimeout(r, 800))

  return `
describe('AuthService', () => {
  describe('authenticate', () => {
    it('returns valid token for correct credentials', async () => {
      const service = new AuthServiceMock()
      const token = await service.authenticate('user@example.com', 'password')
      expect(token).toBeDefined()
    })
  })
})
  `
}

/**
 * Main orchestration workflow
 */
async function runClaudeOrchestrator() {
  console.log('╔════════════════════════════════════════════════╗')
  console.log('║     Claude Code Orchestrator Example          ║')
  console.log('╚════════════════════════════════════════════════╝')
  console.log()

  const client = new CoordinationClient(
    'http://localhost:3456',
    'claude-code'
  )

  try {
    // Step 1: Register capabilities
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('STEP 1: Register Agent Capabilities')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log()

    const regResult = await client.registerAgent({
      agentId: 'claude-code',
      capabilities: [
        'typescript-development',
        'contract-definition',
        'test-writing',
        'documentation'
      ],
      version: '1.0.0'
    })

    if (!regResult.success) {
      throw new Error('Failed to register agent')
    }

    console.log()

    // Step 2: Get available tasks
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('STEP 2: Query Available Tasks')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log()

    const tasksResult = await client.getAvailableTasks([
      'typescript-development',
      'contract-definition'
    ])

    if (!tasksResult.success || !tasksResult.data) {
      throw new Error('Failed to get tasks')
    }

    const tasks = tasksResult.data
    console.log()

    // Process first 3 tasks
    for (let i = 0; i < Math.min(3, tasks.length); i++) {
      const task = tasks[i]

      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
      console.log(`TASK ${i + 1}: ${task.type} - ${task.description}`)
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
      console.log()

      // Claim task
      console.log('Step 2.1: Claim Task')
      const claimResult = await client.claimTask(task.id)
      if (!claimResult.success) {
        console.log(`⚠️  Failed to claim task, skipping...`)
        console.log()
        continue
      }

      console.log()

      // Execute task based on type
      let workOutput = ''

      if (task.type === 'contract-definition') {
        console.log('Step 2.2: Define Contract')
        workOutput = await defineContract()
        console.log(`[WORK] ✅ Contract definition complete`)
      } else if (task.type === 'implementation') {
        console.log('Step 2.2: Implement Service')
        workOutput = await implementMockService()
        console.log(`[WORK] ✅ Mock service implementation complete`)
      } else if (task.type === 'test-writing') {
        console.log('Step 2.2: Write Tests')
        workOutput = await writeTests()
        console.log(`[WORK] ✅ Test suite complete`)
      }

      console.log()

      // Report progress - 25%
      console.log('Step 2.3: Report Progress (25%)')
      await client.reportProgress(task.id, {
        percentComplete: 25,
        currentStep: 'Phase 1 - Analysis complete',
        filesModified: []
      })
      console.log()

      // Report progress - 50%
      console.log('Step 2.4: Report Progress (50%)')
      await client.reportProgress(task.id, {
        percentComplete: 50,
        currentStep: 'Phase 2 - Implementation in progress',
        filesModified: [`src/${task.type}.ts`]
      })
      console.log()

      // Report progress - 75%
      console.log('Step 2.5: Report Progress (75%)')
      await client.reportProgress(task.id, {
        percentComplete: 75,
        currentStep: 'Phase 3 - Testing in progress',
        filesModified: [`src/${task.type}.ts`, `tests/${task.type}.test.ts`]
      })
      console.log()

      // Complete task
      console.log('Step 2.6: Submit Task Completion')
      const completeResult = await client.completeTask(task.id, {
        success: true,
        output: `${task.type} task completed successfully\n${workOutput}`,
        filesModified: [
          `src/${task.type}.ts`,
          `tests/${task.type}.test.ts`,
          `docs/${task.type}.md`
        ]
      })

      if (completeResult.success) {
        console.log()
        console.log(`✅ Task ${i + 1} completed successfully!`)
      }

      console.log()
    }

    // Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('SUMMARY')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log()
    console.log(`✅ Agent registered: claude-code`)
    console.log(`✅ Tasks queried: ${tasks.length} available`)
    console.log(`✅ Tasks completed: ${Math.min(3, tasks.length)}`)
    console.log()
    console.log('Orchestration workflow complete!')
    console.log()

  } catch (error) {
    console.error(`❌ Error: ${error}`)
    process.exit(1)
  }
}

// Run the orchestrator
runClaudeOrchestrator().catch(console.error)
