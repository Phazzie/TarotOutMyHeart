/**
 * @fileoverview MCP Protocol Compliance Tests
 * @purpose Verify coordination server correctly implements MCP protocol
 * @dataFlow Test → MCP Server → Tool Handlers → Response Validation
 * @boundary MCP protocol compliance testing
 *
 * Tests verify:
 * - Server initialization
 * - Tool discovery (ListTools)
 * - Tool invocation (CallTool)
 * - Response format compliance
 * - Error handling
 * - All 6 MCP tools work correctly
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { MCPCoordinationServer } from '../../src/mcp-server'
import { createServices, type CoordinationServices } from '../../services/factory'

describe('MCP Protocol Compliance', () => {
  let services: CoordinationServices
  let mcpServer: MCPCoordinationServer

  beforeAll(async () => {
    // Create mock services for testing
    services = await createServices({ useMocks: true, debug: false })
    mcpServer = new MCPCoordinationServer(services)
  })

  afterAll(async () => {
    // Cleanup if needed
  })

  describe('Server Initialization', () => {
    it('should create MCP server instance', () => {
      expect(mcpServer).toBeDefined()
      expect(mcpServer).toBeInstanceOf(MCPCoordinationServer)
    })

    it('should have server property', () => {
      expect(mcpServer.server).toBeDefined()
    })

    it('should have services injected', () => {
      expect(mcpServer.services).toBeDefined()
      expect(mcpServer.services).toBe(services)
    })
  })

  describe('Tool Listing (ListToolsRequestSchema)', () => {
    it('should expose exactly 6 MCP tools', async () => {
      const tools = await mcpServer.listTools()

      expect(tools).toBeDefined()
      expect(Array.isArray(tools)).toBe(true)
      expect(tools).toHaveLength(6)
    })

    it('should expose checkForTasks tool', async () => {
      const tools = await mcpServer.listTools()
      const checkForTasks = tools.find((t: any) => t.name === 'checkForTasks')

      expect(checkForTasks).toBeDefined()
      expect(checkForTasks.description).toBeDefined()
      expect(checkForTasks.inputSchema).toBeDefined()
      expect(checkForTasks.inputSchema.type).toBe('object')
      expect(checkForTasks.inputSchema.required).toContain('agentId')
      expect(checkForTasks.inputSchema.required).toContain('capabilities')
    })

    it('should expose claimTask tool', async () => {
      const tools = await mcpServer.listTools()
      const claimTask = tools.find((t: any) => t.name === 'claimTask')

      expect(claimTask).toBeDefined()
      expect(claimTask.description).toBeDefined()
      expect(claimTask.inputSchema).toBeDefined()
      expect(claimTask.inputSchema.required).toContain('taskId')
      expect(claimTask.inputSchema.required).toContain('agentId')
    })

    it('should expose submitTaskResult tool', async () => {
      const tools = await mcpServer.listTools()
      const submitTaskResult = tools.find((t: any) => t.name === 'submitTaskResult')

      expect(submitTaskResult).toBeDefined()
      expect(submitTaskResult.description).toBeDefined()
      expect(submitTaskResult.inputSchema).toBeDefined()
      expect(submitTaskResult.inputSchema.required).toContain('taskId')
      expect(submitTaskResult.inputSchema.required).toContain('agentId')
      expect(submitTaskResult.inputSchema.required).toContain('success')
      expect(submitTaskResult.inputSchema.required).toContain('output')
    })

    it('should expose requestFileAccess tool', async () => {
      const tools = await mcpServer.listTools()
      const requestFileAccess = tools.find((t: any) => t.name === 'requestFileAccess')

      expect(requestFileAccess).toBeDefined()
      expect(requestFileAccess.description).toBeDefined()
      expect(requestFileAccess.inputSchema).toBeDefined()
      expect(requestFileAccess.inputSchema.required).toContain('path')
      expect(requestFileAccess.inputSchema.required).toContain('operation')
      expect(requestFileAccess.inputSchema.required).toContain('agentId')
    })

    it('should expose releaseFileAccess tool', async () => {
      const tools = await mcpServer.listTools()
      const releaseFileAccess = tools.find((t: any) => t.name === 'releaseFileAccess')

      expect(releaseFileAccess).toBeDefined()
      expect(releaseFileAccess.description).toBeDefined()
      expect(releaseFileAccess.inputSchema).toBeDefined()
      expect(releaseFileAccess.inputSchema.required).toContain('lockToken')
      expect(releaseFileAccess.inputSchema.required).toContain('agentId')
    })

    it('should expose getCollaborationStatus tool', async () => {
      const tools = await mcpServer.listTools()
      const getStatus = tools.find((t: any) => t.name === 'getCollaborationStatus')

      expect(getStatus).toBeDefined()
      expect(getStatus.description).toBeDefined()
      expect(getStatus.inputSchema).toBeDefined()
      // sessionId is optional for this tool
    })

    it('should have valid input schemas for all tools', async () => {
      const tools = await mcpServer.listTools()

      tools.forEach((tool: any) => {
        expect(tool.name).toBeDefined()
        expect(typeof tool.name).toBe('string')
        expect(tool.name.length).toBeGreaterThan(0)

        expect(tool.description).toBeDefined()
        expect(typeof tool.description).toBe('string')
        expect(tool.description.length).toBeGreaterThan(0)

        expect(tool.inputSchema).toBeDefined()
        expect(tool.inputSchema.type).toBe('object')
        expect(tool.inputSchema.properties).toBeDefined()
      })
    })
  })

  describe('Tool Invocation (CallToolRequestSchema)', () => {
    it('should invoke checkForTasks successfully', async () => {
      const result = await mcpServer.callTool('checkForTasks', {
        agentId: 'github-copilot',
        capabilities: ['typescript-development', 'testing']
      })

      expect(result).toBeDefined()
      expect(result.content).toBeDefined()
      expect(Array.isArray(result.content)).toBe(true)
      expect(result.content.length).toBeGreaterThan(0)
      expect(result.isError).toBe(false)
    })

    it('should return TextContent format for tool responses', async () => {
      const result = await mcpServer.callTool('checkForTasks', {
        agentId: 'github-copilot',
        capabilities: ['typescript-development']
      })

      const content = result.content[0]
      expect(content.type).toBe('text')
      expect(content.text).toBeDefined()
      expect(typeof content.text).toBe('string')

      // Verify it's valid JSON
      expect(() => JSON.parse(content.text)).not.toThrow()

      // Verify service response structure
      const parsed = JSON.parse(content.text)
      expect(parsed).toHaveProperty('success')
      expect(typeof parsed.success).toBe('boolean')
    })

    it('should handle claimTask invocation', async () => {
      // First, get available tasks
      const tasksResult = await mcpServer.callTool('checkForTasks', {
        agentId: 'github-copilot',
        capabilities: ['typescript-development']
      })

      const tasksParsed = JSON.parse(tasksResult.content[0].text)

      if (tasksParsed.success && tasksParsed.data && tasksParsed.data.length > 0) {
        const taskId = tasksParsed.data[0].id

        const claimResult = await mcpServer.callTool('claimTask', {
          taskId,
          agentId: 'github-copilot'
        })

        expect(claimResult.content).toBeDefined()
        expect(claimResult.content[0].type).toBe('text')
        expect(claimResult.isError).toBe(false)

        const parsed = JSON.parse(claimResult.content[0].text)
        expect(parsed.success).toBeDefined()
      }
    })

    it('should handle submitTaskResult invocation', async () => {
      const result = await mcpServer.callTool('submitTaskResult', {
        taskId: 'test-task-id',
        agentId: 'github-copilot',
        success: true,
        output: 'Task completed successfully'
      })

      expect(result.content).toBeDefined()
      expect(result.content[0].type).toBe('text')

      const parsed = JSON.parse(result.content[0].text)
      expect(parsed).toHaveProperty('success')
    })

    it('should handle requestFileAccess invocation', async () => {
      const result = await mcpServer.callTool('requestFileAccess', {
        path: '/src/test.ts',
        operation: 'read',
        agentId: 'github-copilot'
      })

      expect(result.content).toBeDefined()
      expect(result.content[0].type).toBe('text')
      expect(result.isError).toBe(false)

      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.success).toBeDefined()
    })

    it('should handle releaseFileAccess invocation', async () => {
      const result = await mcpServer.callTool('releaseFileAccess', {
        lockToken: 'test-lock-token',
        agentId: 'github-copilot'
      })

      expect(result.content).toBeDefined()
      expect(result.content[0].type).toBe('text')

      const parsed = JSON.parse(result.content[0].text)
      expect(parsed).toHaveProperty('success')
    })

    it('should handle getCollaborationStatus invocation', async () => {
      const result = await mcpServer.callTool('getCollaborationStatus', {})

      expect(result.content).toBeDefined()
      expect(result.content[0].type).toBe('text')
      expect(result.isError).toBe(false)

      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.success).toBeDefined()
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid tool name', async () => {
      const result = await mcpServer.callTool('nonExistentTool', {})

      expect(result.isError).toBe(true)
      expect(result.content).toBeDefined()
      expect(result.content[0].type).toBe('text')

      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.success).toBe(false)
      expect(parsed.error).toBeDefined()
    })

    it('should handle missing required parameters', async () => {
      const result = await mcpServer.callTool('checkForTasks', {
        // Missing agentId and capabilities
      })

      expect(result.isError).toBe(true)
      expect(result.content).toBeDefined()

      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.success).toBe(false)
      expect(parsed.error).toBeDefined()
    })

    it('should handle invalid parameter types', async () => {
      const result = await mcpServer.callTool('checkForTasks', {
        agentId: 123, // Should be string
        capabilities: 'not-an-array' // Should be array
      })

      expect(result.isError).toBe(true)
      expect(result.content[0].type).toBe('text')
    })
  })

  describe('Response Format Compliance', () => {
    it('should always return TextContent structure', async () => {
      const tools = ['checkForTasks', 'getCollaborationStatus']

      for (const toolName of tools) {
        const result = await mcpServer.callTool(toolName, {
          agentId: 'github-copilot',
          capabilities: ['testing']
        })

        expect(result).toHaveProperty('content')
        expect(result).toHaveProperty('isError')
        expect(Array.isArray(result.content)).toBe(true)
        expect(result.content[0]).toHaveProperty('type')
        expect(result.content[0]).toHaveProperty('text')
        expect(result.content[0].type).toBe('text')
      }
    })

    it('should return valid JSON in TextContent', async () => {
      const result = await mcpServer.callTool('getCollaborationStatus', {})

      const text = result.content[0].text
      expect(() => JSON.parse(text)).not.toThrow()

      const parsed = JSON.parse(text)
      expect(typeof parsed).toBe('object')
      expect(parsed !== null).toBe(true)
    })

    it('should include success flag in all responses', async () => {
      const tools = [
        { name: 'checkForTasks', args: { agentId: 'github-copilot', capabilities: [] } },
        { name: 'getCollaborationStatus', args: {} }
      ]

      for (const { name, args } of tools) {
        const result = await mcpServer.callTool(name, args)
        const parsed = JSON.parse(result.content[0].text)

        expect(parsed).toHaveProperty('success')
        expect(typeof parsed.success).toBe('boolean')
      }
    })

    it('should include error details when success is false', async () => {
      const result = await mcpServer.callTool('invalidTool', {})
      const parsed = JSON.parse(result.content[0].text)

      expect(parsed.success).toBe(false)
      expect(parsed.error).toBeDefined()
      expect(parsed.error).toHaveProperty('code')
      expect(parsed.error).toHaveProperty('message')
      expect(typeof parsed.error.code).toBe('string')
      expect(typeof parsed.error.message).toBe('string')
    })
  })
})
