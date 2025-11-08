/**
 * @fileoverview Demo script showing AI collaboration through coordination server
 * @purpose Demonstrates how Claude Code and GitHub Copilot collaborate on tasks
 * @dataFlow Demo → API Calls → Coordination Server → Task Execution
 * @boundary Demo/testing boundary for showcasing collaboration
 * @example
 * npm run demo
 */

import { createServices } from '../services/factory'
import type { AgentCapability } from '@contracts'

// Simulated delays for demo effect
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Console colors for better visualization
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
}

function log(agent: 'system' | 'claude' | 'copilot' | 'user', message: string) {
  const agentColors = {
    system: colors.yellow,
    claude: colors.blue,
    copilot: colors.green,
    user: colors.magenta
  }

  const color = agentColors[agent]
  const prefix = agent.toUpperCase().padEnd(8)
  console.log(`${color}[${prefix}]${colors.reset} ${message}`)
}

/**
 * Demo: Orchestrator-Worker Pattern
 * Claude leads, delegates to Copilot
 */
async function demoOrchestratorWorker() {
  console.log('\n' + '═'.repeat(60))
  console.log(colors.bright + 'DEMO: Orchestrator-Worker Pattern' + colors.reset)
  console.log('═'.repeat(60) + '\n')

  const services = await createServices({ useMocks: true })

  // Step 1: User starts collaboration
  log('user', 'Starting collaboration: "Build user authentication with email/password"')

  const sessionResult = await services.user.startCollaboration({
    task: 'Build user authentication with email/password',
    preferredLead: 'claude-code',
    mode: 'orchestrator-worker'
  })

  if (!sessionResult.success || !sessionResult.data) {
    log('system', 'Failed to start collaboration')
    return
  }

  const session = sessionResult.data
  log('system', `Session started: ${session.id}`)
  log('system', `Lead agent: Claude Code`)
  await delay(1000)

  // Step 2: Claude registers and checks for tasks
  log('claude', 'Registering with coordination server...')

  const claudeReg = await services.claude.registerAgent({
    agentId: 'claude-code',
    capabilities: ['typescript-development', 'contract-definition', 'testing'],
    version: '1.0.0'
  })

  if (claudeReg.success) {
    log('claude', 'Registration successful')
  }

  await delay(500)

  log('claude', 'Checking for available tasks...')
  const claudeTasks = await services.claude.getAvailableTasks(['contract-definition'])

  if (claudeTasks.success && claudeTasks.data && claudeTasks.data.length > 0) {
    const task = claudeTasks.data[0]
    log('claude', `Found task: "${task.description}"`)

    // Claude claims the orchestration task
    log('claude', 'Claiming orchestration task...')
    const claimResult = await services.claude.claimTask(task.id)

    if (claimResult.success) {
      log('claude', 'Task claimed successfully')
      await delay(1000)

      // Claude creates subtasks for Copilot
      log('claude', 'Breaking down task into subtasks...')
      await delay(1500)

      log('claude', 'Creating subtask: "Implement login component"')
      await services.stateStore.enqueueTask({
        type: 'implement-feature',
        description: '[Copilot] Implement login component with form validation',
        status: 'queued',
        priority: 'high',
        context: {
          files: ['src/components/Login.tsx'],
          conversationHistory: [],
          requirements: 'Email/password fields with validation'
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        sessionId: session.id
      })

      log('claude', 'Creating subtask: "Implement signup component"')
      await services.stateStore.enqueueTask({
        type: 'implement-feature',
        description: '[Copilot] Implement signup component with password strength',
        status: 'queued',
        priority: 'high',
        context: {
          files: ['src/components/Signup.tsx'],
          conversationHistory: [],
          requirements: 'Email/password/confirm with strength indicator'
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        sessionId: session.id
      })

      // Report progress
      await services.claude.reportProgress(task.id, {
        percentComplete: 30,
        currentStep: 'Subtasks created, waiting for Copilot',
        filesModified: [],
        estimatedTimeRemaining: 300
      })
    }
  }

  await delay(2000)

  // Step 3: Copilot checks for and claims tasks
  log('copilot', 'Checking for available tasks...')

  const copilotTasks = await services.copilot.checkForTasks({
    agentId: 'github-copilot',
    capabilities: ['svelte-development', 'typescript-development']
  })

  if (copilotTasks.success && copilotTasks.data && copilotTasks.data.length > 0) {
    const task = copilotTasks.data[0]
    log('copilot', `Found task: "${task.description}"`)

    // Copilot claims the task
    log('copilot', 'Claiming task via MCP tool...')
    const claimResult = await services.copilot.claimTaskTool({
      taskId: task.id,
      agentId: 'github-copilot'
    })

    if (claimResult.success && claimResult.data) {
      log('copilot', 'Task claimed successfully')
      await delay(1000)

      // Copilot requests file access
      log('copilot', 'Requesting write access to Login.tsx...')
      const fileAccess = await services.copilot.requestFileAccess({
        path: 'src/components/Login.tsx',
        operation: 'write',
        agentId: 'github-copilot'
      })

      if (fileAccess.success && fileAccess.data?.granted) {
        log('copilot', 'File access granted')
        await delay(1500)

        log('copilot', 'Implementing login component...')
        await delay(2000)

        // Submit result
        log('copilot', 'Submitting task result...')
        await services.copilot.submitTaskResult({
          taskId: task.id,
          agentId: 'github-copilot',
          success: true,
          output: 'Login component implemented with form validation',
          filesModified: ['src/components/Login.tsx']
        })

        log('copilot', 'Task completed successfully!')

        // Release file access
        if (fileAccess.data.lockToken) {
          await services.copilot.releaseFileAccess({
            lockToken: fileAccess.data.lockToken,
            agentId: 'github-copilot'
          })
          log('copilot', 'File lock released')
        }
      }
    }
  }

  await delay(1000)

  // Step 4: Check collaboration status
  log('user', 'Checking collaboration status...')
  const status = await services.user.getCollaborationStatus(session.id)

  if (status.success && status.data) {
    const progress = status.data.progress
    console.log()
    log('system', `Progress: ${progress.percentComplete}% complete`)
    log('system', `Tasks: ${progress.tasksCompleted}/${progress.tasksTotal} completed`)
    log('system', `Active locks: ${status.data.currentLocks.length}`)
  }
}

/**
 * Demo: Parallel Collaboration
 * Both AIs work simultaneously
 */
async function demoParallelWork() {
  console.log('\n' + '═'.repeat(60))
  console.log(colors.bright + 'DEMO: Parallel Collaboration' + colors.reset)
  console.log('═'.repeat(60) + '\n')

  const services = await createServices({ useMocks: true })

  // Start collaboration
  log('user', 'Starting parallel collaboration: "Add dark mode to application"')

  const sessionResult = await services.user.startCollaboration({
    task: 'Add dark mode toggle and theme switching',
    mode: 'parallel'
  })

  if (!sessionResult.success || !sessionResult.data) {
    log('system', 'Failed to start collaboration')
    return
  }

  const session = sessionResult.data
  log('system', `Session started: ${session.id}`)
  await delay(1000)

  // Create parallel tasks
  await services.stateStore.enqueueTask({
    type: 'define-contract',
    description: '[Claude] Define theme service contract',
    status: 'queued',
    priority: 'high',
    context: {
      files: ['services/theme/ThemeService.ts'],
      conversationHistory: [],
      requirements: 'Theme switching with persistence'
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    sessionId: session.id
  })

  await services.stateStore.enqueueTask({
    type: 'implement-feature',
    description: '[Copilot] Implement dark mode toggle UI',
    status: 'queued',
    priority: 'high',
    context: {
      files: ['components/DarkModeToggle.tsx'],
      conversationHistory: [],
      requirements: 'Toggle switch with animation'
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    sessionId: session.id
  })

  // Both AIs work simultaneously
  log('system', 'Both AIs working in parallel...')

  // Claude works on contracts
  setTimeout(async () => {
    log('claude', 'Working on theme service contract...')
    const tasks = await services.claude.getAvailableTasks(['contract-definition'])
    if (tasks.success && tasks.data && tasks.data[0]) {
      const task = tasks.data[0]
      await services.claude.claimTask(task.id)

      // Request file access
      const access = await services.fileSystem.requestFileAccess({
        path: 'services/theme/ThemeService.ts',
        operation: 'write',
        agentId: 'claude-code'
      })

      if (access.success && access.data?.granted) {
        log('claude', 'Writing theme service contract...')
        await delay(2000)

        await services.claude.completeTask(task.id, {
          success: true,
          output: 'Theme service contract defined',
          filesModified: ['services/theme/ThemeService.ts']
        })

        log('claude', 'Contract complete!')

        if (access.data.lockToken) {
          await services.fileSystem.releaseFileAccess(access.data)
        }
      }
    }
  }, 500)

  // Copilot works on UI
  setTimeout(async () => {
    log('copilot', 'Working on dark mode toggle UI...')
    const tasks = await services.copilot.checkForTasks({
      agentId: 'github-copilot',
      capabilities: ['svelte-development']
    })

    if (tasks.success && tasks.data && tasks.data[0]) {
      const task = tasks.data[0]
      await services.copilot.claimTaskTool({
        taskId: task.id,
        agentId: 'github-copilot'
      })

      // Request file access
      const access = await services.copilot.requestFileAccess({
        path: 'components/DarkModeToggle.tsx',
        operation: 'write',
        agentId: 'github-copilot'
      })

      if (access.success && access.data?.granted) {
        log('copilot', 'Creating toggle component...')
        await delay(2000)

        await services.copilot.submitTaskResult({
          taskId: task.id,
          agentId: 'github-copilot',
          success: true,
          output: 'Dark mode toggle implemented',
          filesModified: ['components/DarkModeToggle.tsx']
        })

        log('copilot', 'UI component complete!')

        if (access.data.lockToken) {
          await services.copilot.releaseFileAccess({
            lockToken: access.data.lockToken,
            agentId: 'github-copilot'
          })
        }
      }
    }
  }, 500)

  // Wait for parallel work to complete
  await delay(5000)

  // Check final status
  log('user', 'Checking final status...')
  const status = await services.user.getCollaborationStatus(session.id)

  if (status.success && status.data) {
    const progress = status.data.progress
    console.log()
    log('system', `Both AIs completed their tasks!`)
    log('system', `Progress: ${progress.percentComplete}% complete`)
    log('system', `No conflicts detected - successful parallel work!`)
  }
}

/**
 * Main demo runner
 */
async function runDemo() {
  console.log('\n' + '='.repeat(60))
  console.log(colors.bright + '    AI COORDINATION SERVER - DEMO' + colors.reset)
  console.log('='.repeat(60))
  console.log()
  console.log('This demo shows how Claude Code and GitHub Copilot')
  console.log('collaborate on development tasks through the')
  console.log('coordination server.')
  console.log()

  // Run orchestrator-worker demo
  await demoOrchestratorWorker()
  await delay(3000)

  // Run parallel work demo
  await demoParallelWork()

  console.log('\n' + '='.repeat(60))
  console.log(colors.bright + 'DEMO COMPLETE!' + colors.reset)
  console.log('='.repeat(60))
  console.log()
  console.log('The coordination server enables:')
  console.log('  ✅ Task distribution between AIs')
  console.log('  ✅ File access coordination')
  console.log('  ✅ Progress tracking')
  console.log('  ✅ Conflict prevention')
  console.log('  ✅ Multiple collaboration patterns')
  console.log()
}

// Run demo if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runDemo().catch(error => {
    console.error('Demo error:', error)
    process.exit(1)
  })
}