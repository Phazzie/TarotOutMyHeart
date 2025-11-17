# GitHub Copilot Integration Guide - AI Coordination Server

## Overview

This guide covers integrating GitHub Copilot with the AI Coordination Server using Model Context Protocol (MCP). Copilot becomes an autonomous agent that can claim and execute tasks alongside Claude Code, enabling true multi-AI collaboration.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [MCP Server Setup](#mcp-server-setup)
3. [VS Code Configuration](#vs-code-configuration)
4. [Tool Discovery & Verification](#tool-discovery--verification)
5. [Tool Invocation Examples](#tool-invocation-examples)
6. [Autonomous Workflow Patterns](#autonomous-workflow-patterns)
7. [Advanced Configuration](#advanced-configuration)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements

- **VS Code**: 1.80 or higher
- **GitHub Copilot Extension**: Latest version (v1.150+)
- **GitHub Copilot Chat**: Enabled in VS Code
- **Node.js**: 18.0.0 or higher (for MCP server)
- **MCP Client Extension**: Model Context Protocol support (built into Copilot v1.150+)

### Installation

```bash
# 1. Clone coordination server (if not already done)
git clone <coordination-server-repo>
cd coordination-server

# 2. Install dependencies
npm install

# 3. Verify server can start
npm run check  # TypeScript check

# 4. Test MCP server startup
npm run mcp -- --help  # Should show help without errors
```

### Verify VS Code Setup

```bash
# Open VS Code
code .

# Verify Copilot is installed
# Settings → Extensions → GitHub Copilot (should be installed)

# Verify Copilot Chat is enabled
# Settings → GitHub Copilot → Enable Chat
```

---

## MCP Server Setup

### Understanding MCP

Model Context Protocol (MCP) is a standardized way for AI assistants to interact with external tools. The coordination server exposes 6 tools via MCP:

- `checkForTasks` - Find available tasks
- `claimTask` - Claim task for execution
- `submitTaskResult` - Report task completion
- `requestFileAccess` - Lock files for modification
- `releaseFileAccess` - Release file locks
- `getCollaborationStatus` - Monitor session progress

### Starting the MCP Server

**Option 1: Standalone Mode** (Recommended for Development)

```bash
cd coordination-server

# Start HTTP server in one terminal
npm run dev

# Start MCP server in another terminal
npm run mcp

# Expected output:
# [INFO] Initializing standalone MCP server
# [INFO] MCP server started successfully
# [INFO] Transport: stdio
# [INFO] Tool count: 6
```

**Option 2: Integrated Mode** (When HTTP and MCP share same process)

The coordination server can run both HTTP API and MCP server together:

```bash
# Set environment variable to enable MCP
export ENABLE_MCP=true

# Start single server with both transports
npm run dev

# Server will output:
# [INFO] HTTP API server started on http://localhost:3456
# [INFO] MCP server available at: Run "npm run mcp" to start
```

### MCP Server Configuration

Configure MCP behavior via environment variables:

```bash
# .env file or environment variables

# MCP Protocol Settings
MCP_TRANSPORT=stdio              # stdio (only option currently)
MCP_TIMEOUT_MS=30000             # Tool timeout
MCP_MAX_RETRIES=3                # Tool invocation retries

# Logging
MCP_DEBUG=false                  # Enable debug logging
MCP_LOG_LEVEL=info               # info, warn, error, debug

# Server coordination
COORDINATION_SERVER_URL=http://localhost:3456
USE_MOCKS=true                   # true for testing, false for production
```

### Health Check

Verify MCP server is ready by attempting to list tools:

```bash
# In VS Code Copilot Chat, test with:
# @mcp checkForTasks agentId="github-copilot" capabilities=["code-review"]

# Should respond with available tasks (or empty list)
```

---

## VS Code Configuration

### Configuration Method 1: Via Settings UI (Easiest)

1. Open VS Code Settings (Cmd+, on Mac, Ctrl+, on Windows/Linux)
2. Search for "MCP"
3. Click "Edit in settings.json"
4. Add configuration (see below)

### Configuration Method 2: Via settings.json

Edit `.vscode/settings.json` in your project:

```json
{
  "mcp.servers": {
    "coordination": {
      "command": "npm",
      "args": ["run", "mcp"],
      "cwd": "${workspaceFolder}/coordination-server",
      "env": {
        "COORDINATION_SERVER_URL": "http://localhost:3456",
        "USE_MOCKS": "true",
        "DEBUG_MCP": "true"
      }
    }
  }
}
```

### Configuration Method 3: Global User Settings

For using coordination across all VS Code projects:

1. Open Command Palette (Cmd+Shift+P)
2. Search for "Preferences: Open User Settings (JSON)"
3. Add configuration:

```json
{
  "mcp.servers": {
    "coordination": {
      "command": "npm",
      "args": ["run", "mcp"],
      "cwd": "/path/to/coordination-server",
      "env": {
        "COORDINATION_SERVER_URL": "http://localhost:3456",
        "NODE_ENV": "development"
      },
      "alwaysAllow": ["coordination"],
      "disabled": false
    }
  }
}
```

### Configuration Reference

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `command` | string | - | Command to start MCP server (usually `npm`) |
| `args` | array | `["run", "mcp"]` | Arguments to command |
| `cwd` | string | - | Working directory for server process |
| `env` | object | `{}` | Environment variables for server |
| `alwaysAllow` | array | `[]` | Tools to allow without prompting |
| `disabled` | boolean | `false` | Disable this server |
| `timeout` | number | 30000 | Timeout for tool calls (ms) |

### Example Configuration File

Create `coordinator-config.example.json`:

```json
{
  "name": "AI Coordination Server",
  "version": "1.0.0",
  "mcp": {
    "servers": {
      "coordination": {
        "command": "npm",
        "args": ["run", "mcp"],
        "cwd": "${workspaceFolder}/coordination-server",
        "env": {
          "COORDINATION_SERVER_URL": "http://localhost:3456",
          "USE_MOCKS": "true",
          "DEBUG_MCP": "false",
          "LOG_LEVEL": "info"
        },
        "autoStart": true,
        "alwaysAllow": [
          "checkForTasks",
          "claimTask",
          "submitTaskResult",
          "getCollaborationStatus"
        ],
        "disabled": false,
        "timeout": 45000
      }
    },
    "requiredTools": [
      "checkForTasks",
      "claimTask",
      "submitTaskResult"
    ]
  }
}
```

### Restart VS Code

After modifying settings, VS Code needs to restart the MCP server:

```bash
# Option 1: Restart VS Code entirely
# Cmd+Shift+P → "Developer: Reload Window"

# Option 2: Just reload MCP connection
# In Copilot Chat, type "@mcp help"
# VS Code will reconnect if needed
```

---

## Tool Discovery & Verification

### List Available Tools

In Copilot Chat, request the list of available tools:

```
@mcp list-tools
```

**Expected Output**:
```
Available MCP Tools:

1. checkForTasks
   Description: Find available tasks matching agent capabilities
   Input: agentId (string), capabilities (array of strings)

2. claimTask
   Description: Claim a task for autonomous execution
   Input: taskId (string), agentId (string)

3. submitTaskResult
   Description: Submit task completion results
   Input: taskId, agentId, success, output, filesModified

4. requestFileAccess
   Description: Request exclusive file access
   Input: path (string), operation (string), agentId (string)

5. releaseFileAccess
   Description: Release file locks
   Input: lockToken (string), agentId (string)

6. getCollaborationStatus
   Description: Get session collaboration status and progress
   Input: sessionId (optional)
```

### Verify Tool Access

Test each tool with a simple invocation:

```
@mcp getCollaborationStatus
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "sessionId": "session_001",
    "status": "active",
    "progress": {
      "percentComplete": 0,
      "tasksCompleted": 0,
      "tasksTotal": 0
    }
  }
}
```

### Check Server Connection

```
@mcp checkServerStatus
```

This verifies the MCP server can communicate with the coordination server.

### Debugging Tool Issues

If tools are not appearing:

1. **Check Copilot Chat is open**
   - Cmd+I (Mac) or Ctrl+I (Windows/Linux)

2. **Verify MCP server is running**
   ```bash
   # Check if process exists
   ps aux | grep "npm run mcp"

   # Check logs
   tail -f logs/coordination.log | grep MCP
   ```

3. **Check configuration syntax**
   - Settings → Developer: Open Dev Tools
   - Console tab should show any config errors

4. **Restart Copilot connection**
   - Command Palette → "Copilot: Sign Out"
   - Command Palette → "Copilot: Sign In"

---

## Tool Invocation Examples

### 1. Check for Tasks

**Purpose**: Find available tasks matching your capabilities

**Syntax in Copilot Chat**:
```
@mcp checkForTasks agentId="github-copilot" capabilities=["code-review", "testing"]
```

**Full Example Workflow**:
```
User: I'm ready to work on the project. What tasks are available?

Copilot: Let me check for available tasks.

@mcp checkForTasks agentId="github-copilot" capabilities=["code-review", "testing"]

Response:
{
  "success": true,
  "data": [
    {
      "id": "task_001",
      "type": "code-review",
      "description": "Review authentication module implementation",
      "priority": "high",
      "estimatedMinutes": 30
    },
    {
      "id": "task_002",
      "type": "test-writing",
      "description": "Write integration tests for API endpoints",
      "priority": "medium",
      "estimatedMinutes": 45
    }
  ]
}

I found 2 available tasks. Let me claim the first one (code review).
```

### 2. Claim Task

**Purpose**: Claim a task for autonomous execution

**Syntax in Copilot Chat**:
```
@mcp claimTask taskId="task_001" agentId="github-copilot"
```

**Full Example**:
```
Copilot: I'll claim the code review task.

@mcp claimTask taskId="task_001" agentId="github-copilot"

Response:
{
  "success": true,
  "data": {
    "id": "task_001",
    "type": "code-review",
    "description": "Review authentication module implementation",
    "claimedBy": "github-copilot",
    "claimedAt": "2025-11-17T14:30:00Z"
  }
}

Task claimed! Starting code review of the authentication module.
Beginning review of /src/services/auth.ts...
```

### 3. Submit Task Result

**Purpose**: Report task completion and results

**Syntax in Copilot Chat**:
```
@mcp submitTaskResult taskId="task_001" agentId="github-copilot"
  success=true output="Code review complete, ready for merge"
  filesModified=["src/services/auth.ts", "tests/auth.test.ts"]
```

**Full Example**:
```
Copilot: Code review complete. Submitting results...

@mcp submitTaskResult
  taskId="task_001"
  agentId="github-copilot"
  success=true
  output="Code review complete. Found 2 minor issues and 3 suggestions.
    - Minor: Inconsistent naming convention in utility functions
    - Minor: Missing error handling in one edge case
    - Suggestion: Consider extracting common validation logic
    All issues documented in inline comments. Approved for merge."
  filesModified=["src/services/auth.ts", "tests/auth.test.ts", "REVIEW.md"]

Response:
{
  "success": true,
  "data": {
    "taskId": "task_001",
    "completionId": "comp_001",
    "completedAt": "2025-11-17T14:45:00Z"
  }
}

Task submitted successfully!
```

### 4. Request File Access

**Purpose**: Request exclusive access to modify a file

**Syntax in Copilot Chat**:
```
@mcp requestFileAccess path="src/api/routes.ts" operation="write"
  agentId="github-copilot"
```

**Full Example**:
```
Copilot: I need to modify the API routes file. Requesting access...

@mcp requestFileAccess
  path="src/api/routes.ts"
  operation="write"
  agentId="github-copilot"

Response:
{
  "success": true,
  "data": {
    "lockToken": "lock_550e8400-e29b-41d4-a716-446655440000",
    "path": "src/api/routes.ts",
    "operation": "write",
    "grantedAt": "2025-11-17T14:50:00Z",
    "expiresAt": "2025-11-17T15:05:00Z"
  }
}

Access granted. Modifying src/api/routes.ts...
```

### 5. Release File Access

**Purpose**: Release file locks when done modifying

**Syntax in Copilot Chat**:
```
@mcp releaseFileAccess lockToken="lock_550e8400-e29b-41d4-a716-446655440000"
  agentId="github-copilot"
```

**Full Example**:
```
Copilot: File modifications complete. Releasing lock...

@mcp releaseFileAccess
  lockToken="lock_550e8400-e29b-41d4-a716-446655440000"
  agentId="github-copilot"

Response:
{
  "success": true,
  "data": {
    "lockToken": "lock_550e8400-e29b-41d4-a716-446655440000",
    "path": "src/api/routes.ts",
    "releasedAt": "2025-11-17T14:55:00Z"
  }
}

Lock released. File is available for other agents.
```

### 6. Get Collaboration Status

**Purpose**: Monitor overall collaboration progress

**Syntax in Copilot Chat**:
```
@mcp getCollaborationStatus sessionId="session_001"
```

**Full Example**:
```
Copilot: Let me check the overall progress.

@mcp getCollaborationStatus sessionId="session_001"

Response:
{
  "success": true,
  "data": {
    "sessionId": "session_001",
    "status": "in-progress",
    "progress": {
      "percentComplete": 60,
      "tasksCompleted": 3,
      "tasksTotal": 5,
      "estimatedMinutesRemaining": 45
    },
    "activeAgents": [
      "claude-code",
      "github-copilot"
    ],
    "recentActivity": [
      {
        "timestamp": "2025-11-17T14:50:00Z",
        "agent": "github-copilot",
        "action": "claimed_task",
        "taskId": "task_001"
      }
    ]
  }
}

Progress update: 60% complete, 3 of 5 tasks done. About 45 minutes remaining.
Claude Code is working on feature implementation, and I've just completed the code review.
```

---

## Autonomous Workflow Patterns

### Pattern 1: Independent Task Execution

Copilot autonomously finds and executes tasks without user intervention:

```
Pattern Flow:
┌─────────────┐
│ User starts │
│   Copilot   │
└──────┬──────┘
       │
       ▼
┌──────────────────────────┐
│ checkForTasks            │
│ Get available tasks      │
└──────┬───────────────────┘
       │
       ▼
    ┌─ Filter tasks I can do
    │
    ▼
┌──────────────────────────┐
│ claimTask                │
│ Claim first suitable task│
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│ Execute task            │
│ Request file access     │
│ Make modifications      │
│ Release file access     │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│ submitTaskResult        │
│ Report completion       │
└──────┬───────────────────┘
       │
       ▼
    ┌─ More tasks? Loop back
    │
    ▼
   Done
```

**Implementation in Copilot Chat**:

```
User: Please continuously work through available tasks.

Copilot: I'll start working on tasks. Let me check what's available.

@mcp checkForTasks agentId="github-copilot" capabilities=["code-review","testing"]

Found 3 available tasks. Starting with task_001...

@mcp claimTask taskId="task_001" agentId="github-copilot"

Task claimed. Now requesting access to required files...

@mcp requestFileAccess path="src/services/user.ts" operation="write"
  agentId="github-copilot"

Access granted. Making modifications...
[Modifies file]

Releasing file access...

@mcp releaseFileAccess lockToken="lock_..." agentId="github-copilot"

Submitting task results...

@mcp submitTaskResult taskId="task_001" agentId="github-copilot"
  success=true output="Task completed successfully"
  filesModified=["src/services/user.ts", "tests/user.test.ts"]

Task 1 complete! Moving to task 2...

@mcp claimTask taskId="task_002" agentId="github-copilot"
```

### Pattern 2: Collaborative Handoff

Copilot hands off work to Claude Code when reaching task limits:

```
Pattern Flow:
User                 Copilot                    Claude Code
 │                    │                              │
 │ Start work         │                              │
 │──────────────────>│                              │
 │                    │ checkForTasks              │
 │                    │──────────────>──────────────│
 │                    │                Complete 5   │
 │                    │                tasks       │
 │                    │<──────────────────────────>│
 │                    │                              │
 │                    │ claimTask (tasks 1-3)       │
 │                    │────> Complete 3 tasks      │
 │                    │                              │
 │                    │ "Reached task limit"        │
 │                    │────> Request handoff        │
 │                    │                              │
 │                    │ submitTaskResult            │
 │                    │────> Result with context    │
 │                    │                              │
 │ Status report      │ getCollaborationStatus      │
 │<──────────────────│                              │
 │                    │<──────────────────────────>│
```

**Implementation**:

```
Copilot: I've completed my task quota (3 tasks).
Let me summarize for Claude Code to continue.

@mcp submitTaskResult taskId="task_003" agentId="github-copilot"
  success=true
  output="Completed code review, testing, and documentation.
    Ready for next phase: implementation."
  filesModified=["REVIEW.md", "tests/integration.test.ts"]

@mcp getCollaborationStatus

Claude Code, I've completed the initial review and testing phase.
Here's what's ready for your implementation work:
- All contracts reviewed and approved
- Test infrastructure in place
- Documentation structure established

Ready to take over implementation?
```

### Pattern 3: Continuous Monitoring

Copilot monitors project status and reports progress:

```typescript
/**
 * Autonomous monitoring loop
 * Runs continuously to track collaboration progress
 */

async function autonomousMonitoring() {
  const interval = setInterval(async () => {
    // Check status
    const status = await callMCP('getCollaborationStatus', {
      sessionId: 'session_001'
    })

    if (status.data.progress.percentComplete >= 100) {
      console.log('All tasks complete!')
      clearInterval(interval)
      return
    }

    // Check available tasks
    const tasks = await callMCP('checkForTasks', {
      agentId: 'github-copilot',
      capabilities: ['testing', 'documentation']
    })

    // Auto-claim if tasks available and not at capacity
    if (tasks.data.length > 0 && canTakeTasks()) {
      const task = tasks.data[0]

      const claim = await callMCP('claimTask', {
        taskId: task.id,
        agentId: 'github-copilot'
      })

      if (claim.success) {
        await executeTask(task)
      }
    }

    // Log progress
    console.log(`Progress: ${status.data.progress.percentComplete}%`)

  }, 30000) // Every 30 seconds
}
```

### Pattern 4: Error Recovery

Copilot handles errors gracefully and notifies Claude Code:

```
Error Handling Flow:
┌─────────────┐
│ Execute     │
│ task/file   │
└──────┬──────┘
       │
       ▼
   Error?
   /     \
  No      Yes
  │        │
  ▼        ▼
 Done   Retry? ──No──┐
        /   \        │
      Yes    \       │
      │       ▼      │
      │    Fail     │
      ▼    │        │
    Retry  │        ▼
    │      │    Notify
    │      │    Claude Code
    ▼      │    │
    ├──────┘    │
    │           ▼
    ▼           Handoff
  Success       OR
    │           Escalate
    └───────────┘
```

---

## Advanced Configuration

### Custom Environment Variables

```json
{
  "mcp.servers": {
    "coordination": {
      "command": "npm",
      "args": ["run", "mcp"],
      "cwd": "${workspaceFolder}/coordination-server",
      "env": {
        "COORDINATION_SERVER_URL": "http://localhost:3456",
        "USE_MOCKS": "false",
        "DEBUG_MCP": "true",
        "LOG_LEVEL": "debug",
        "MCP_TIMEOUT_MS": "45000",
        "MCP_MAX_RETRIES": "5",
        "NODE_OPTIONS": "--max-old-space-size=2048"
      }
    }
  }
}
```

### Multiple Coordination Servers

Configure multiple server instances for high availability:

```json
{
  "mcp.servers": {
    "coordination-primary": {
      "command": "npm",
      "args": ["run", "mcp"],
      "cwd": "/path/to/coordination-server-1",
      "env": { "COORDINATION_SERVER_URL": "http://primary:3456" }
    },
    "coordination-backup": {
      "command": "npm",
      "args": ["run", "mcp"],
      "cwd": "/path/to/coordination-server-2",
      "env": { "COORDINATION_SERVER_URL": "http://backup:3456" }
    }
  }
}
```

### Performance Tuning

```json
{
  "mcp.servers": {
    "coordination": {
      "command": "npm",
      "args": ["run", "mcp"],
      "cwd": "${workspaceFolder}/coordination-server",
      "env": {
        "MCP_TIMEOUT_MS": "60000",
        "MCP_MAX_RETRIES": "5",
        "NODE_OPTIONS": "--max-old-space-size=4096"
      },
      "timeout": 60000,
      "poolSize": 10
    }
  }
}
```

---

## Troubleshooting

### Issue 1: MCP Server Not Starting

**Symptom**: "Command 'npm run mcp' not found" or server fails to start

**Diagnosis**:
```bash
# Check Node.js version
node --version  # Should be 18.0.0+

# Check npm is available
npm --version

# Check in coordination-server directory
cd coordination-server
npm run mcp -- --version  # Test command directly
```

**Solution**:
```bash
# Verify npm scripts exist
cat package.json | grep '"mcp"'

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Try again
npm run mcp
```

### Issue 2: Tools Not Appearing in Copilot

**Symptom**: `@mcp` commands not recognized, tools not listed

**Diagnosis**:
```bash
# Check if MCP server is running
ps aux | grep "npm run mcp"

# Check MCP server logs
tail -f logs/coordination.log | grep MCP

# Test MCP server directly
curl -X POST http://localhost:3456/mcp/list-tools
```

**Solution**:
1. Ensure MCP server is running in separate terminal
2. Restart VS Code: Command Palette → "Developer: Reload Window"
3. Check VS Code settings syntax: Settings → JSON validation
4. Verify coordination server HTTP API is also running

### Issue 3: Tool Invocation Timeouts

**Symptom**: "Tool timeout" error when calling `@mcp` commands

**Causes**:
- Coordination server is slow or overloaded
- Network latency
- Tool implementation is hanging

**Solution**:
```json
{
  "mcp.servers": {
    "coordination": {
      "command": "npm",
      "args": ["run", "mcp"],
      "cwd": "${workspaceFolder}/coordination-server",
      "timeout": 60000,
      "env": {
        "MCP_TIMEOUT_MS": "60000"
      }
    }
  }
}
```

### Issue 4: File Access Conflicts

**Symptom**: "File locked by another agent" when trying to modify files

**Diagnosis**:
```
Check collaboration status to see active locks:
@mcp getCollaborationStatus

Look for "activeLocks" in response
```

**Solution**:
```
Wait for other agent to complete:
@mcp getCollaborationStatus

When lock is released (usually after 5 minutes), try again:
@mcp requestFileAccess path="..." operation="write" agentId="github-copilot"
```

### Issue 5: Authentication Errors

**Symptom**: "Invalid token" or "Agent not registered" errors

**Solution**:
```
The MCP server auto-registers on startup. If errors persist:

1. Restart MCP server:
   npm run mcp

2. Check coordination server is healthy:
   curl http://localhost:3456/health

3. Check registration logs:
   tail -f logs/coordination.log | grep "Agent registered"
```

### Issue 6: Memory Leaks in Long Sessions

**Symptom**: VS Code becomes slow after hours of use, memory usage grows

**Solution**:
```json
{
  "mcp.servers": {
    "coordination": {
      "command": "npm",
      "args": ["run", "mcp"],
      "cwd": "${workspaceFolder}/coordination-server",
      "env": {
        "NODE_OPTIONS": "--max-old-space-size=2048 --gc-global"
      }
    }
  }
}
```

### Issue 7: Coordination Server Not Reachable

**Symptom**: "ECONNREFUSED" or "Network unreachable" errors

**Diagnosis**:
```bash
# Check if coordination server HTTP API is running
curl http://localhost:3456/health

# Check if port is correct
netstat -an | grep 3456

# Check firewall
sudo lsof -i :3456
```

**Solution**:
```bash
# Start coordination server in correct directory
cd coordination-server
npm run dev

# Verify it's running
curl http://localhost:3456/health

# Update MCP config if port is different
# Edit .vscode/settings.json and update COORDINATION_SERVER_URL
```

### Issue 8: Claims Constantly Fail

**Symptom**: Always get "Task already claimed" even with fresh tasks

**Causes**:
- Multiple Copilot instances competing
- Claude Code claiming tasks faster
- Race condition between agents

**Solution**:
```
Use task filtering to avoid conflicts:

@mcp checkForTasks
  agentId="github-copilot"
  capabilities=["testing", "documentation"]
  exclude=["implementation"]

Claim tasks less frequently to avoid race conditions:
Wait 5-10 seconds between checkForTasks calls
```

### Issue 9: Progress Updates Not Reflected

**Symptom**: getCollaborationStatus shows stale progress

**Diagnosis**:
```
Check if HTTP API is receiving progress updates:
tail -f logs/coordination.log | grep "progress"
```

**Solution**:
```
MCP server submits progress to HTTP API automatically.
If not working, verify both servers are running:
- HTTP API: npm run dev (port 3456)
- MCP Server: npm run mcp
```

### Issue 10: VS Code Won't Restart MCP Server

**Symptom**: Changes to mcp.servers config don't take effect

**Solution**:
```bash
# Full restart is required
1. Close VS Code entirely
2. Terminate any "npm run mcp" processes:
   pkill -f "npm run mcp"
3. Reopen VS Code
4. MCP server should restart automatically
```

---

## Performance Tips

### Optimize Tool Usage

```
Best Practices:
✅ Batch operations: Get all tasks once, then claim
✅ Check status less frequently (every 30+ seconds)
✅ Release file locks immediately after modification
✅ Use appropriate timeouts (60+ seconds for slow networks)

❌ Don't: Call checkForTasks every few seconds
❌ Don't: Hold file locks during long operations
❌ Don't: Make synchronous requests in a loop
```

### Monitor Resources

```bash
# Watch MCP server memory usage
watch -n 1 'ps aux | grep "npm run mcp"'

# Monitor coordination server
tail -f logs/coordination.log | \
  jq 'select(.processingTimeMs > 1000)' | \
  jq '{timestamp, processingTimeMs}'
```

### Scaling

For large projects with many tasks:

```json
{
  "mcp.servers": {
    "coordination": {
      "command": "npm",
      "args": ["run", "mcp"],
      "cwd": "${workspaceFolder}/coordination-server",
      "env": {
        "MCP_TIMEOUT_MS": "60000",
        "MCP_MAX_RETRIES": "5",
        "NODE_OPTIONS": "--max-old-space-size=4096"
      },
      "poolSize": 20,
      "timeout": 60000
    }
  }
}
```

---

## Integration with Claude Code

Copilot and Claude Code work together automatically:

```
Workflow:
1. User starts collaboration in Claude Code
2. Claude registers with coordination server
3. User opens VS Code with Copilot
4. Copilot MCP server starts and registers
5. Both agents query available tasks
6. Tasks are distributed based on capabilities
7. Agents update shared context via HTTP API
8. Copilot receives real-time updates via WebSocket
9. Handoffs between agents happen automatically

Result: Seamless multi-AI collaboration
```

---

## Related Documentation

- [Claude Integration Guide](./claude-integration.md) - How Claude Code connects
- [README.md](../README.md) - Server overview
- [Monitoring Guide](../monitoring-guide.md) - Server health and metrics
- [MCP Specification](https://spec.modelcontextprotocol.io/) - Protocol details

---

**Last Updated**: November 17, 2025
**Version**: 1.0.0
**Status**: Production Ready

