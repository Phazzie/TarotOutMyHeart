/**
 * @fileoverview Coordination Server Mock Implementation
 * @purpose Mock implementation for CoordinationServer contracts
 * @boundary Coordination Server Seam
 */

export * from './ClaudeCoordinationMock'
export * from './CopilotCoordinationMock'
export * from './FileSystemCoordinationMock'
export * from './StateStoreMock'
export * from './UserCoordinationMock'

export class CoordinationServerMock {
  private isRunning = false

  async start(): Promise<boolean> {
    this.isRunning = true
    return true
  }

  async stop(): Promise<boolean> {
    this.isRunning = false
    return true
  }

  getStatus(): { isRunning: boolean } {
    return { isRunning: this.isRunning }
  }
}
