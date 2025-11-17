/**
 * @fileoverview Prometheus metrics for AI Coordination Server
 * @purpose Provides observability metrics for monitoring system health and performance
 * @dataFlow Service operations → Metric updates → Prometheus scraping → Grafana visualization
 * @boundary Observability layer exposing internal metrics for external monitoring systems
 * @example
 * import { metrics } from './observability/metrics'
 * metrics.taskCompletions.inc({ status: 'success' })
 * metrics.apiResponseTime.observe({ method: 'POST', endpoint: '/api/claude/tasks' }, 0.5)
 */

import { Registry, Counter, Gauge, Histogram, collectDefaultMetrics } from 'prom-client'

/**
 * Prometheus metrics registry
 * Central registry for all metrics exposed to Prometheus
 */
export const register = new Registry()

/**
 * Collect default Node.js metrics (CPU, memory, event loop, etc.)
 * Automatically enabled with 10-second collection interval
 */
collectDefaultMetrics({
  register,
  prefix: 'coordination_server_',
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5], // GC duration buckets in seconds
})

// ========== Counter Metrics ==========

/**
 * Total number of tasks completed
 * Labels: status (success, failure), agent (claude, copilot)
 */
export const taskCompletions = new Counter({
  name: 'coordination_server_task_completions_total',
  help: 'Total number of tasks completed',
  labelNames: ['status', 'agent'],
  registers: [register],
})

/**
 * Total number of task failures
 * Labels: reason (validation_failed, timeout, api_error, conflict), agent (claude, copilot)
 */
export const taskFailures = new Counter({
  name: 'coordination_server_task_failures_total',
  help: 'Total number of task failures',
  labelNames: ['reason', 'agent'],
  registers: [register],
})

/**
 * Total number of API requests
 * Labels: method (GET, POST, PUT, DELETE), endpoint, status_code
 */
export const apiRequests = new Counter({
  name: 'coordination_server_api_requests_total',
  help: 'Total number of API requests',
  labelNames: ['method', 'endpoint', 'status_code'],
  registers: [register],
})

/**
 * Total number of file conflicts detected
 * Labels: resolution (auto, manual, failed)
 */
export const fileConflicts = new Counter({
  name: 'coordination_server_file_conflicts_total',
  help: 'Total number of file conflicts detected',
  labelNames: ['resolution'],
  registers: [register],
})

/**
 * Total number of agent registrations
 * Labels: agent (claude, copilot)
 */
export const agentRegistrations = new Counter({
  name: 'coordination_server_agent_registrations_total',
  help: 'Total number of agent registrations',
  labelNames: ['agent'],
  registers: [register],
})

/**
 * Total number of handoff requests
 * Labels: from_agent, to_agent, status (accepted, rejected)
 */
export const handoffRequests = new Counter({
  name: 'coordination_server_handoff_requests_total',
  help: 'Total number of handoff requests',
  labelNames: ['from_agent', 'to_agent', 'status'],
  registers: [register],
})

/**
 * Total number of context operations
 * Labels: operation (save, retrieve), status (success, failure)
 */
export const contextOperations = new Counter({
  name: 'coordination_server_context_operations_total',
  help: 'Total number of context save/retrieve operations',
  labelNames: ['operation', 'status'],
  registers: [register],
})

// ========== Gauge Metrics ==========

/**
 * Current number of active tasks
 * Labels: agent (claude, copilot), status (claimed, in_progress)
 */
export const activeTasks = new Gauge({
  name: 'coordination_server_active_tasks',
  help: 'Current number of active tasks',
  labelNames: ['agent', 'status'],
  registers: [register],
})

/**
 * Current number of active file locks
 * Labels: agent (claude, copilot)
 */
export const activeLocks = new Gauge({
  name: 'coordination_server_active_locks',
  help: 'Current number of active file locks',
  labelNames: ['agent'],
  registers: [register],
})

/**
 * Current number of WebSocket connections
 * Labels: type (client, agent)
 */
export const websocketConnections = new Gauge({
  name: 'coordination_server_websocket_connections',
  help: 'Current number of WebSocket connections',
  labelNames: ['type'],
  registers: [register],
})

/**
 * Agent availability status
 * Labels: agent (claude, copilot), state (available, busy, offline)
 * Value: 1 if in that state, 0 otherwise
 */
export const agentAvailability = new Gauge({
  name: 'coordination_server_agent_availability',
  help: 'Agent availability status (1 = available, 0 = unavailable)',
  labelNames: ['agent', 'state'],
  registers: [register],
})

/**
 * Current number of pending tasks
 * Labels: priority (high, medium, low)
 */
export const pendingTasks = new Gauge({
  name: 'coordination_server_pending_tasks',
  help: 'Current number of pending tasks by priority',
  labelNames: ['priority'],
  registers: [register],
})

/**
 * Current number of active collaboration sessions
 */
export const activeSessions = new Gauge({
  name: 'coordination_server_active_sessions',
  help: 'Current number of active collaboration sessions',
  registers: [register],
})

// ========== Histogram Metrics ==========

/**
 * API response time distribution
 * Labels: method (GET, POST, PUT, DELETE), endpoint
 * Buckets: 0.005s to 10s (5ms to 10s)
 */
export const apiResponseTime = new Histogram({
  name: 'coordination_server_api_response_time_seconds',
  help: 'API response time in seconds',
  labelNames: ['method', 'endpoint'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
})

/**
 * Task duration distribution
 * Labels: agent (claude, copilot), task_type
 * Buckets: 1s to 1 hour
 */
export const taskDuration = new Histogram({
  name: 'coordination_server_task_duration_seconds',
  help: 'Task duration in seconds',
  labelNames: ['agent', 'task_type'],
  buckets: [1, 5, 10, 30, 60, 120, 300, 600, 1800, 3600],
  registers: [register],
})

/**
 * Lock acquisition time distribution
 * Labels: agent (claude, copilot)
 * Buckets: 1ms to 10s
 */
export const lockAcquisitionTime = new Histogram({
  name: 'coordination_server_lock_acquisition_time_seconds',
  help: 'Time to acquire file lock in seconds',
  labelNames: ['agent'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5, 10],
  registers: [register],
})

/**
 * Context size distribution
 * Labels: operation (save, retrieve)
 * Buckets: 1KB to 10MB
 */
export const contextSize = new Histogram({
  name: 'coordination_server_context_size_bytes',
  help: 'Context data size in bytes',
  labelNames: ['operation'],
  buckets: [1024, 10240, 102400, 1048576, 5242880, 10485760], // 1KB to 10MB
  registers: [register],
})

// ========== Helper Functions ==========

/**
 * Express middleware to track API request metrics
 * Automatically records request count, response time, and status codes
 *
 * @example
 * app.use(metricsMiddleware)
 */
export function metricsMiddleware(req: any, res: any, next: any): void {
  const start = Date.now()

  // Track request
  const originalSend = res.send
  res.send = function (data: any) {
    const duration = (Date.now() - start) / 1000 // Convert to seconds

    // Normalize endpoint for metrics (remove IDs)
    const endpoint = normalizeEndpoint(req.path)

    // Record metrics
    apiRequests.inc({
      method: req.method,
      endpoint,
      status_code: res.statusCode,
    })

    apiResponseTime.observe(
      {
        method: req.method,
        endpoint,
      },
      duration
    )

    return originalSend.call(this, data)
  }

  next()
}

/**
 * Normalize endpoint paths by replacing IDs with placeholders
 * Examples:
 *   /api/tasks/123 → /api/tasks/:id
 *   /api/context/abc-def → /api/context/:id
 *
 * @param path - Original request path
 * @returns Normalized path for metric labels
 */
function normalizeEndpoint(path: string): string {
  return path
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id') // UUID
    .replace(/\/[a-zA-Z0-9_-]{20,}/g, '/:id') // Long alphanumeric IDs
    .replace(/\/\d+/g, '/:id') // Numeric IDs
}

/**
 * Reset all metrics (useful for testing)
 * WARNING: Only use in test environments!
 */
export function resetMetrics(): void {
  register.resetMetrics()
}

/**
 * Get all metrics in Prometheus text format
 * This is what the /metrics endpoint should return
 *
 * @returns Promise resolving to Prometheus-formatted metrics string
 */
export async function getMetrics(): Promise<string> {
  return register.metrics()
}

/**
 * Get metrics as JSON (useful for debugging)
 *
 * @returns Promise resolving to metrics in JSON format
 */
export async function getMetricsJSON(): Promise<any> {
  return register.getMetricsAsJSON()
}

// ========== Metric Update Helpers ==========

/**
 * Record a task completion
 *
 * @param agent - Agent that completed the task (claude, copilot)
 * @param success - Whether the task succeeded
 * @param durationSeconds - Task duration in seconds
 * @param taskType - Type of task completed
 */
export function recordTaskCompletion(
  agent: 'claude' | 'copilot',
  success: boolean,
  durationSeconds: number,
  taskType: string
): void {
  taskCompletions.inc({
    status: success ? 'success' : 'failure',
    agent,
  })

  taskDuration.observe(
    {
      agent,
      task_type: taskType,
    },
    durationSeconds
  )
}

/**
 * Record a file conflict
 *
 * @param resolution - How the conflict was resolved (auto, manual, failed)
 */
export function recordFileConflict(resolution: 'auto' | 'manual' | 'failed'): void {
  fileConflicts.inc({ resolution })
}

/**
 * Update active tasks gauge
 *
 * @param agent - Agent name
 * @param status - Task status
 * @param delta - Change in count (+1 for new task, -1 for completed)
 */
export function updateActiveTasks(
  agent: 'claude' | 'copilot',
  status: 'claimed' | 'in_progress',
  delta: number
): void {
  activeTasks.inc({ agent, status }, delta)
}

/**
 * Update active locks gauge
 *
 * @param agent - Agent holding the lock
 * @param delta - Change in count (+1 for new lock, -1 for released)
 */
export function updateActiveLocks(agent: 'claude' | 'copilot', delta: number): void {
  activeLocks.inc({ agent }, delta)
}

/**
 * Update WebSocket connections gauge
 *
 * @param type - Connection type (client, agent)
 * @param delta - Change in count (+1 for new connection, -1 for closed)
 */
export function updateWebSocketConnections(type: 'client' | 'agent', delta: number): void {
  websocketConnections.inc({ type }, delta)
}

/**
 * Set agent availability state
 *
 * @param agent - Agent name
 * @param state - Current state (available, busy, offline)
 */
export function setAgentAvailability(
  agent: 'claude' | 'copilot',
  state: 'available' | 'busy' | 'offline'
): void {
  // Reset all states for this agent
  agentAvailability.set({ agent, state: 'available' }, 0)
  agentAvailability.set({ agent, state: 'busy' }, 0)
  agentAvailability.set({ agent, state: 'offline' }, 0)

  // Set current state to 1
  agentAvailability.set({ agent, state }, 1)
}

// Export all metrics for direct access
export const metrics = {
  // Counters
  taskCompletions,
  taskFailures,
  apiRequests,
  fileConflicts,
  agentRegistrations,
  handoffRequests,
  contextOperations,

  // Gauges
  activeTasks,
  activeLocks,
  websocketConnections,
  agentAvailability,
  pendingTasks,
  activeSessions,

  // Histograms
  apiResponseTime,
  taskDuration,
  lockAcquisitionTime,
  contextSize,
}
