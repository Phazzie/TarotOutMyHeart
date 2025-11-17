# Coordination Server Examples

This directory contains practical examples demonstrating how to integrate Claude Code and GitHub Copilot with the AI Coordination Server.

## Quick Start

### 1. Claude Code Orchestrator Example

**File**: `claude-orchestrator.ts`

Demonstrates a complete workflow where Claude Code:
- Registers with the coordination server
- Queries available tasks
- Claims tasks based on capabilities
- Reports progress during execution
- Submits completion results

**Run the example**:
```bash
# Ensure coordination server is running
npm run dev &

# Run the example
npm run ts examples/claude-orchestrator.ts

# Or with tsx directly
npx tsx examples/claude-orchestrator.ts
```

**Output**:
```
╔════════════════════════════════════════════════╗
║     Claude Code Orchestrator Example          ║
╚════════════════════════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 1: Register Agent Capabilities
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[REGISTER] Agent: claude-code
[REGISTER] Capabilities: typescript-development, contract-definition, test-writing, documentation
[REGISTER] ✅ Registered with token: reg_xxxxx

...
```

**What it shows**:
- Agent registration with capabilities declaration
- Capability-based task filtering
- Multi-phase task execution (analyze → implement → test)
- Progress reporting at each phase
- Task completion with file tracking

**Code highlights**:
```typescript
// Register agent with capabilities
await client.registerAgent({
  agentId: 'claude-code',
  capabilities: [
    'typescript-development',
    'contract-definition',
    'test-writing'
  ],
  version: '1.0.0'
})

// Claim task
await client.claimTask(task.id)

// Report progress at intervals
await client.reportProgress(taskId, {
  percentComplete: 50,
  currentStep: 'Implementation phase',
  filesModified: ['src/service.ts']
})

// Submit results
await client.completeTask(taskId, {
  success: true,
  output: 'Task completed successfully',
  filesModified: ['src/service.ts', 'tests/service.test.ts']
})
```

---

### 2. VS Code Settings Configuration

**File**: `.vscode-settings.json`

Example VS Code configuration for GitHub Copilot integration with the MCP server.

**How to use**:
```bash
# Copy to your project's .vscode directory
cp examples/.vscode-settings.json .vscode/settings.json

# Or merge with existing settings.json manually
```

**Configuration includes**:
- MCP server startup configuration
- Coordination server connection URL
- Tool permission settings
- Timeout and retry configuration
- Editor and debug settings

**Key settings**:
```json
{
  "mcp.servers": {
    "coordination": {
      "command": "npm",
      "args": ["run", "mcp"],
      "cwd": "${workspaceFolder}/coordination-server",
      "env": {
        "COORDINATION_SERVER_URL": "http://localhost:3456",
        "USE_MOCKS": "true"
      }
    }
  }
}
```

---

## Integration Scenarios

### Scenario 1: Solo Claude Development

Claude Code works independently on tasks:

```
Claude Code
    │
    ├─ Register capabilities
    ├─ Get available tasks
    ├─ Claim task
    ├─ Execute task
    └─ Report completion
```

See: `claude-orchestrator.ts`

### Scenario 2: Copilot-Only Autonomous Work

GitHub Copilot in VS Code autonomously works on tasks:

```
Copilot (VS Code)
    │
    ├─ @mcp checkForTasks
    ├─ @mcp claimTask
    ├─ Execute in IDE
    ├─ @mcp requestFileAccess
    ├─ Modify files
    ├─ @mcp releaseFileAccess
    └─ @mcp submitTaskResult
```

See: [Copilot Integration Guide](../docs/integrations/copilot-integration.md)

### Scenario 3: Collaborative Multi-AI

Both Claude and Copilot collaborate:

```
Claude Code              GitHub Copilot
    │                        │
    ├─ Register          ─── │ (via MCP)
    │                        │
    ├─ Task 1 (Contract) ─┐  │
    │                     │  ├─ Task 2 (Tests)
    │                     │  │
    └─ Report progress ◄──┴──┤ Update context
                           │
                      Context Sharing
```

See: [Workflow Examples](../docs/integrations/claude-integration.md#workflow-examples)

---

## Running Both Servers

For full multi-AI collaboration, you need both servers running:

**Terminal 1: HTTP API Server**
```bash
cd coordination-server
npm run dev
# Starts on http://localhost:3456
```

**Terminal 2: MCP Server**
```bash
cd coordination-server
npm run mcp
# Connects via stdio to VS Code
```

**Terminal 3: Your Project**
```bash
code .
# Open VS Code with Copilot
# Use @mcp commands in Copilot Chat
```

**Terminal 4: Run Examples**
```bash
npx tsx examples/claude-orchestrator.ts
```

---

## File Structure

```
examples/
├── README.md                    # This file
├── claude-orchestrator.ts       # Claude Code workflow example
└── .vscode-settings.json        # VS Code/Copilot configuration
```

---

## Common Use Cases

### Use Case 1: Feature Development Pipeline

1. **Claude** defines contracts and structure
2. **Copilot** implements and writes code
3. **Claude** writes tests and documentation
4. Both agents coordinate via task queue

Example workflow:
```bash
# Start coordination server
npm run dev &
npm run mcp &

# Claude works on contract phase
npx tsx examples/claude-orchestrator.ts

# Copilot picks up implementation tasks in VS Code
# Use @mcp tools to claim and execute tasks
```

### Use Case 2: Code Review & Testing

1. **Copilot** claims code review tasks
2. **Claude** writes comprehensive test suites
3. Coordination server tracks progress

### Use Case 3: Continuous Task Execution

Agents continuously check for and claim available tasks:

```typescript
// Pseudo-code
while (true) {
  const tasks = await client.getAvailableTasks(myCapabilities)
  if (tasks.length > 0) {
    await client.claimTask(tasks[0].id)
    await executeTask(tasks[0])
    await client.completeTask(tasks[0].id, result)
  }
  await sleep(30000) // Check every 30 seconds
}
```

---

## Testing the Integration

### 1. Verify Servers Are Running

```bash
# Check HTTP API
curl http://localhost:3456/health

# Check MCP server (in VS Code)
# Type "@mcp list-tools" in Copilot Chat
```

### 2. Run Example

```bash
# Terminal with coordination server running
npx tsx examples/claude-orchestrator.ts

# Should see progress output and complete successfully
```

### 3. Monitor in VS Code

```
1. Open VS Code Copilot Chat (Cmd+I or Ctrl+I)
2. Type: @mcp checkForTasks agentId="github-copilot" capabilities=["testing"]
3. Should see task list
```

### 4. Check Server Status

```bash
curl http://localhost:3456/status | jq .
```

---

## Troubleshooting

### Example Won't Run

```bash
# Check Node.js version
node --version  # Should be 18.0.0+

# Check dependencies installed
npm install

# Run with explicit TypeScript
npx tsx examples/claude-orchestrator.ts
```

### Coordination Server Not Accessible

```bash
# Check server is running
curl http://localhost:3456/health

# Check port in use
lsof -i :3456

# Kill and restart if needed
pkill -f "npm run dev"
npm run dev &
```

### Copilot Tools Not Appearing

```bash
# Restart VS Code
# Command Palette → "Developer: Reload Window"

# Check MCP server is running in separate terminal
npm run mcp

# Check .vscode/settings.json is valid JSON
# Settings → Preferences: Open Settings (JSON)
```

---

## Next Steps

After running the examples:

1. **Read integration guides**:
   - [Claude Integration Guide](../docs/integrations/claude-integration.md) - Complete reference
   - [Copilot Integration Guide](../docs/integrations/copilot-integration.md) - Complete reference

2. **Adapt to your project**:
   - Copy configuration to your project
   - Modify example code for your use case
   - Implement custom task types

3. **Deploy**:
   - Use real database (SQLite) instead of mocks
   - Configure environment variables for production
   - Set up monitoring and logging

4. **Scale**:
   - Run multiple agent instances
   - Implement load balancing
   - Add persistence and backup

---

## API Reference Quick Links

- **Claude HTTP API**: [claude-integration.md - API Endpoint Reference](../docs/integrations/claude-integration.md#api-endpoint-reference)
- **Copilot MCP Tools**: [copilot-integration.md - Tool Invocation Examples](../docs/integrations/copilot-integration.md#tool-invocation-examples)
- **Error Codes**: [claude-integration.md - Error Handling](../docs/integrations/claude-integration.md#error-handling-best-practices)
- **Server Configuration**: [README.md - Configuration](../README.md#configuration)

---

## Support

For issues or questions:

1. Check relevant [integration guide](../docs/integrations/)
2. Review [troubleshooting section](../docs/integrations/claude-integration.md#troubleshooting)
3. Check server logs: `tail -f logs/coordination.log`
4. Enable debug logging: `DEBUG_COORDINATION=true`

---

**Last Updated**: November 17, 2025
**Version**: 1.0.0
**Examples Status**: Production Ready
