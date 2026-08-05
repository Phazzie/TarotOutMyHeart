/**
 * @fileoverview Service factory for coordination system
 * @purpose Central factory for creating and managing service instances with mock/real toggle
 * @dataFlow Factory → Service Creation → Dependency Injection
 * @boundary Central service instantiation point for entire coordination system
 * @example
 * const services = await createServices({ useMocks: true })
 * const task = await services.claude.claimTask(taskId)
 */

import type {
  StateStoreContract,
  ClaudeCoordinationContract,
  CopilotCoordinationContract,
  UserCoordinationContract,
  FileSystemCoordinationContract,
} from '@contracts'

// Mock implementations
import { StateStoreMock } from './mock/StateStoreMock'
import { ClaudeCoordinationMock } from './mock/ClaudeCoordinationMock'
import { CopilotCoordinationMock } from './mock/CopilotCoordinationMock'
import { UserCoordinationMock } from './mock/UserCoordinationMock'
import { FileSystemCoordinationMock } from './mock/FileSystemCoordinationMock'

// Real implementations
import { StateStoreSQLite } from './real/StateStoreSQLite'
import { ClaudeCoordinationService } from './real/ClaudeCoordinationService'
import { CopilotCoordinationService } from './real/CopilotCoordinationService'
import { UserCoordinationService } from './real/UserCoordinationService'
import { FileSystemCoordinationService } from './real/FileSystemCoordinationService'

/**
 * Configuration options for service creation
 */
export interface ServiceConfig {
  /** Use mock implementations (default: true for development) */
  useMocks?: boolean

  /** SQLite database path (for real implementation) */
  databasePath?: string

  /** Redis connection URL (for distributed state store) */
  redisUrl?: string

  /** Enable debug logging */
  debug?: boolean

  /** Custom logger instance */
  logger?: Console
}

/**
 * Container for all coordination services
 */
export interface CoordinationServices {
  /** State persistence layer */
  stateStore: StateStoreContract

  /** Claude Code coordination service */
  claude: ClaudeCoordinationContract

  /** GitHub Copilot coordination service (MCP tools) */
  copilot: CopilotCoordinationContract

  /** User interface coordination service */
  user: UserCoordinationContract

  /** File system coordination service */
  fileSystem: FileSystemCoordinationContract

  /** Service configuration */
  config: ServiceConfig
}

/**
 * Singleton instance of services
 */
let servicesInstance: CoordinationServices | null = null

/**
 * Creates all coordination services with dependency injection
 *
 * @param config - Service configuration options
 * @returns Container with all initialized services
 */
export async function createServices(config: ServiceConfig = {}): Promise<CoordinationServices> {
  // Use environment variable if not specified
  const useMocks = config.useMocks ?? process.env.USE_MOCKS !== 'false'

  // Create singleton if not exists
  if (!servicesInstance) {
    console.log(
      `[ServiceFactory] Creating services with ${useMocks ? 'MOCK' : 'REAL'} implementations`
    )

    // Create state store (foundation for all other services)
    let stateStore: StateStoreContract

    if (useMocks) {
      stateStore = new StateStoreMock()
      console.log('[ServiceFactory] Using in-memory StateStoreMock')
    } else {
      const sqliteStore = new StateStoreSQLite(config.databasePath || './coordination.db')
      await sqliteStore.initialize()
      stateStore = sqliteStore
      console.log(
        `[ServiceFactory] Using SQLite StateStore at ${config.databasePath || './coordination.db'}`
      )
    }

    // Create file system coordination
    let fileSystem: FileSystemCoordinationContract

    if (useMocks) {
      fileSystem = new FileSystemCoordinationMock(stateStore)
      console.log('[ServiceFactory] Using FileSystemCoordinationMock')
    } else {
      fileSystem = new FileSystemCoordinationService(stateStore)
      console.log('[ServiceFactory] Using FileSystemCoordinationService')
    }

    // Create Claude coordination service
    let claude: ClaudeCoordinationContract

    if (useMocks) {
      claude = new ClaudeCoordinationMock(stateStore)
      console.log('[ServiceFactory] Using ClaudeCoordinationMock')
    } else {
      claude = new ClaudeCoordinationService(stateStore)
      console.log('[ServiceFactory] Using ClaudeCoordinationService')
    }

    // Create Copilot coordination service
    let copilot: CopilotCoordinationContract

    if (useMocks) {
      copilot = new CopilotCoordinationMock(stateStore, fileSystem)
      console.log('[ServiceFactory] Using CopilotCoordinationMock')
    } else {
      copilot = new CopilotCoordinationService(stateStore, fileSystem)
      console.log('[ServiceFactory] Using CopilotCoordinationService')
    }

    // Create user coordination service
    let user: UserCoordinationContract

    if (useMocks) {
      user = new UserCoordinationMock(stateStore)
      console.log('[ServiceFactory] Using UserCoordinationMock')
    } else {
      user = new UserCoordinationService(stateStore)
      console.log('[ServiceFactory] Using UserCoordinationService')
    }

    servicesInstance = {
      stateStore,
      claude,
      copilot,
      user,
      fileSystem,
      config: {
        ...config,
        useMocks,
      },
    }

    console.log('[ServiceFactory] All services created successfully')
  }

  return servicesInstance
}

/**
 * Gets the current services instance
 *
 * @throws Error if services not initialized
 */
export function getServices(): CoordinationServices {
  if (!servicesInstance) {
    throw new Error('Services not initialized. Call createServices() first.')
  }
  return servicesInstance
}

/**
 * Resets all services (useful for testing)
 */
export async function resetServices(): Promise<void> {
  if (servicesInstance) {
    console.log('[ServiceFactory] Resetting all services')

    // Reset mock services if they have reset methods
    if (servicesInstance.config.useMocks) {
      const mockStateStore = servicesInstance.stateStore as StateStoreMock
      const mockClaude = servicesInstance.claude as ClaudeCoordinationMock
      const mockCopilot = servicesInstance.copilot as CopilotCoordinationMock
      const mockUser = servicesInstance.user as UserCoordinationMock
      const mockFileSystem = servicesInstance.fileSystem as FileSystemCoordinationMock

      await mockStateStore.reset()
      await mockClaude.reset()
      await mockCopilot.reset()
      await mockUser.reset()
      await mockFileSystem.reset()
    }

    servicesInstance = null
    console.log('[ServiceFactory] All services reset')
  }
}

/**
 * Seeds mock services with test data
 *
 * @param data - Test data to seed
 */
export async function seedMockData(data: {
  tasks?: Array<{
    type: string
    description: string
    priority: 'low' | 'medium' | 'high'
  }>
  contexts?: Array<{
    id: string
    messages: Array<{
      role: 'user' | 'claude' | 'copilot' | 'system'
      content: string
    }>
  }>
}): Promise<void> {
  const services = await getServices()

  if (!services.config.useMocks) {
    throw new Error('Can only seed mock services')
  }

  console.log('[ServiceFactory] Seeding mock data')

  // Seed tasks
  if (data.tasks) {
    for (const taskDef of data.tasks) {
      const task = {
        type: taskDef.type as any,
        description: taskDef.description,
        status: 'queued' as const,
        priority: taskDef.priority,
        context: {
          files: [],
          conversationHistory: [],
          requirements: taskDef.description,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        sessionId: 'seed_session' as any,
      }

      await services.stateStore.enqueueTask(task)
    }
    console.log(`[ServiceFactory] Seeded ${data.tasks.length} tasks`)
  }

  // Seed contexts
  if (data.contexts) {
    for (const contextDef of data.contexts) {
      await services.stateStore.saveContext(contextDef.id as any, {
        id: contextDef.id as any,
        messages: contextDef.messages.map(m => ({
          ...m,
          timestamp: new Date(),
        })),
        sharedState: {},
        lastUpdated: new Date(),
      })
    }
    console.log(`[ServiceFactory] Seeded ${data.contexts.length} contexts`)
  }
}

/**
 * Default export for convenience
 */
export default {
  createServices,
  getServices,
  resetServices,
  seedMockData,
}
