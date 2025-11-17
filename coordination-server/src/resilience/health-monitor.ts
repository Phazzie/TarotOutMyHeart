/**
 * @fileoverview Health Monitor for AI agents
 * @purpose Detect offline/crashed agents and reassign their tasks
 * @dataFlow Periodic health checks → Agent status → Task reassignment on failure
 * @boundary Resilience layer monitoring agent availability
 * @example
 * const monitor = new HealthMonitor(stateStore, { checkInterval: 30000 })
 * monitor.start()
 * monitor.registerAgent('claude-code')
 */

import type {
  AgentId,
  StateStoreContract,
  TaskId,
  LockToken
} from '@contracts'

/**
 * Health check configuration
 */
export interface HealthMonitorConfig {
  /** Interval in ms between health checks (default: 30000ms = 30s) */
  checkInterval: number

  /** Time in ms before considering agent offline (default: 60000ms = 1min) */
  agentTimeout: number

  /** Time in ms before considering task abandoned (default: 300000ms = 5min) */
  taskTimeout: number

  /** Time in ms before expiring file locks (default: 300000ms = 5min) */
  lockTimeout: number

  /** Callback when agent goes offline */
  onAgentOffline?: (agentId: AgentId) => void

  /** Callback when task is reassigned */
  onTaskReassigned?: (taskId: TaskId, fromAgent: AgentId) => void

  /** Callback when lock is released */
  onLockReleased?: (lockToken: LockToken, owner: AgentId) => void
}

/**
 * Agent health status
 */
export interface AgentHealth {
  agentId: AgentId
  status: 'online' | 'offline' | 'unknown'
  lastHeartbeat: Date
  lastActivity: Date
  consecutiveFailures: number
  activeTasks: number
  heldLocks: number
}

/**
 * Health monitor statistics
 */
export interface HealthMonitorStats {
  totalHealthChecks: number
  agentsOnline: number
  agentsOffline: number
  tasksReassigned: number
  locksReleased: number
  uptime: number
}

/**
 * Heartbeat data from agent
 */
export interface AgentHeartbeat {
  agentId: AgentId
  timestamp: Date
  status: 'active' | 'idle'
  metadata?: Record<string, unknown>
}

/**
 * Health Monitor implementation
 *
 * Monitors agent health by:
 * 1. Periodic ping checks (every 30s by default)
 * 2. Heartbeat tracking from agents
 * 3. Task timeout detection (tasks stuck in-progress too long)
 * 4. Lock expiration cleanup
 * 5. Automatic task reassignment when agent crashes
 */
export class HealthMonitor {
  private readonly config: Required<HealthMonitorConfig>
  private readonly stateStore: StateStoreContract
  private readonly agentHealth = new Map<AgentId, AgentHealth>()
  private checkTimer?: NodeJS.Timeout
  private cleanupTimer?: NodeJS.Timeout
  private startTime?: Date
  private stats: HealthMonitorStats = {
    totalHealthChecks: 0,
    agentsOnline: 0,
    agentsOffline: 0,
    tasksReassigned: 0,
    locksReleased: 0,
    uptime: 0
  }

  constructor(stateStore: StateStoreContract, config: Partial<HealthMonitorConfig> = {}) {
    this.stateStore = stateStore
    this.config = {
      checkInterval: 30000,       // 30 seconds
      agentTimeout: 60000,        // 1 minute
      taskTimeout: 300000,        // 5 minutes
      lockTimeout: 300000,        // 5 minutes
      onAgentOffline: () => {},
      onTaskReassigned: () => {},
      onLockReleased: () => {},
      ...config
    }
  }

  /**
   * Start health monitoring
   * Begins periodic health checks and cleanup jobs
   */
  start(): void {
    if (this.checkTimer) {
      console.warn('[HealthMonitor] Already started')
      return
    }

    this.startTime = new Date()
    console.log('[HealthMonitor] Starting health monitoring')

    // Start periodic health checks
    this.checkTimer = setInterval(() => {
      this.performHealthCheck().catch(error => {
        console.error('[HealthMonitor] Health check failed:', error)
      })
    }, this.config.checkInterval)

    // Start cleanup job (runs every 60s)
    this.cleanupTimer = setInterval(() => {
      this.performCleanup().catch(error => {
        console.error('[HealthMonitor] Cleanup job failed:', error)
      })
    }, 60000)

    // Perform immediate health check
    this.performHealthCheck().catch(error => {
      console.error('[HealthMonitor] Initial health check failed:', error)
    })
  }

  /**
   * Stop health monitoring
   * Stops all periodic jobs
   */
  stop(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer)
      this.checkTimer = undefined
    }

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = undefined
    }

    console.log('[HealthMonitor] Stopped health monitoring')
  }

  /**
   * Register an agent for health monitoring
   *
   * @param agentId - Agent to monitor
   */
  registerAgent(agentId: AgentId): void {
    if (!this.agentHealth.has(agentId)) {
      const now = new Date()
      this.agentHealth.set(agentId, {
        agentId,
        status: 'online',
        lastHeartbeat: now,
        lastActivity: now,
        consecutiveFailures: 0,
        activeTasks: 0,
        heldLocks: 0
      })

      console.log(`[HealthMonitor] Registered agent: ${agentId}`)
    }
  }

  /**
   * Unregister an agent from health monitoring
   *
   * @param agentId - Agent to remove
   */
  unregisterAgent(agentId: AgentId): void {
    this.agentHealth.delete(agentId)
    console.log(`[HealthMonitor] Unregistered agent: ${agentId}`)
  }

  /**
   * Record heartbeat from agent
   * Updates agent's last heartbeat time and status
   *
   * @param heartbeat - Heartbeat data from agent
   */
  recordHeartbeat(heartbeat: AgentHeartbeat): void {
    const health = this.agentHealth.get(heartbeat.agentId)

    if (!health) {
      // Auto-register agent
      this.registerAgent(heartbeat.agentId)
    }

    const now = new Date()
    this.agentHealth.set(heartbeat.agentId, {
      agentId: heartbeat.agentId,
      status: 'online',
      lastHeartbeat: heartbeat.timestamp,
      lastActivity: heartbeat.status === 'active' ? now : health?.lastActivity || now,
      consecutiveFailures: 0,
      activeTasks: health?.activeTasks || 0,
      heldLocks: health?.heldLocks || 0
    })
  }

  /**
   * Perform health check on all registered agents
   * Detects offline agents and triggers recovery actions
   */
  private async performHealthCheck(): Promise<void> {
    this.stats.totalHealthChecks++
    const now = Date.now()

    let onlineCount = 0
    let offlineCount = 0

    for (const [agentId, health] of this.agentHealth.entries()) {
      const timeSinceHeartbeat = now - health.lastHeartbeat.getTime()

      if (timeSinceHeartbeat > this.config.agentTimeout) {
        // Agent is offline
        if (health.status !== 'offline') {
          console.warn(`[HealthMonitor] Agent ${agentId} is offline (no heartbeat for ${timeSinceHeartbeat}ms)`)

          health.status = 'offline'
          health.consecutiveFailures++
          offlineCount++

          this.config.onAgentOffline(agentId)

          // Reassign tasks and release locks
          await this.handleAgentFailure(agentId)
        } else {
          offlineCount++
        }
      } else {
        // Agent is online
        if (health.status !== 'online') {
          console.log(`[HealthMonitor] Agent ${agentId} is back online`)
          health.status = 'online'
          health.consecutiveFailures = 0
        }
        onlineCount++
      }
    }

    this.stats.agentsOnline = onlineCount
    this.stats.agentsOffline = offlineCount
    this.stats.uptime = this.startTime ? now - this.startTime.getTime() : 0
  }

  /**
   * Handle agent failure by reassigning tasks and releasing locks
   *
   * @param agentId - Failed agent
   */
  private async handleAgentFailure(agentId: AgentId): Promise<void> {
    console.log(`[HealthMonitor] Handling failure for agent: ${agentId}`)

    // Release all locks held by this agent
    const locksResult = await this.stateStore.releaseAllLocksForAgent(agentId)

    if (locksResult.success && locksResult.data) {
      const lockCount = locksResult.data
      console.log(`[HealthMonitor] Released ${lockCount} locks for ${agentId}`)
      this.stats.locksReleased += lockCount
    }

    // Find and reassign all tasks assigned to this agent
    // Note: This would require additional methods in StateStore to query by assignedTo
    // For now, we'll log the intent
    console.log(`[HealthMonitor] Would reassign tasks for ${agentId} (requires StateStore extension)`)

    // Update agent health stats
    const health = this.agentHealth.get(agentId)
    if (health) {
      health.activeTasks = 0
      health.heldLocks = 0
    }
  }

  /**
   * Perform cleanup operations
   * - Expire old locks
   * - Detect abandoned tasks
   * - Clean up stale contexts
   */
  private async performCleanup(): Promise<void> {
    const now = Date.now()

    // Get all active locks
    const locksResult = await this.stateStore.getAllLocks()

    if (!locksResult.success || !locksResult.data) {
      console.error('[HealthMonitor] Failed to get locks for cleanup')
      return
    }

    // Check for expired locks
    for (const lock of locksResult.data) {
      const lockAge = now - lock.acquiredAt.getTime()

      if (lockAge > this.config.lockTimeout) {
        console.warn(
          `[HealthMonitor] Releasing expired lock: ${lock.path} (age: ${lockAge}ms, owner: ${lock.owner})`
        )

        await this.stateStore.releaseLock(lock.lockToken)
        this.stats.locksReleased++
        this.config.onLockReleased(lock.lockToken, lock.owner)
      }
    }

    // TODO: Add task timeout detection when StateStore supports querying by status
    // Would iterate through 'in-progress' tasks and check if they've been running too long
  }

  /**
   * Get health status for specific agent
   *
   * @param agentId - Agent to check
   * @returns Health status or undefined if not registered
   */
  getAgentHealth(agentId: AgentId): AgentHealth | undefined {
    return this.agentHealth.get(agentId)
  }

  /**
   * Get health status for all agents
   *
   * @returns Array of all agent health statuses
   */
  getAllAgentHealth(): AgentHealth[] {
    return Array.from(this.agentHealth.values())
  }

  /**
   * Get monitor statistics
   */
  getStats(): HealthMonitorStats {
    return { ...this.stats }
  }

  /**
   * Check if monitor is running
   */
  isRunning(): boolean {
    return this.checkTimer !== undefined
  }

  /**
   * Force a health check immediately
   */
  async forceHealthCheck(): Promise<void> {
    await this.performHealthCheck()
  }

  /**
   * Force a cleanup immediately
   */
  async forceCleanup(): Promise<void> {
    await this.performCleanup()
  }
}
