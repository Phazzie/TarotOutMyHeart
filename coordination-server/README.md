# AI Coordination Server 🤖🤝🤖

A coordination server that enables Claude Code and GitHub Copilot to collaborate on software development tasks.

## Overview

The AI Coordination Server acts as an orchestration layer between multiple AI agents, allowing them to:

- 🎯 Claim and execute tasks from a shared queue
- 📝 Share conversation context and progress
- 🔒 Coordinate file access to prevent conflicts
- 🔄 Request handoffs between agents
- 📊 Provide real-time monitoring of collaboration sessions

## Architecture

```
┌─────────────────┐         ┌──────────────────┐
│   Claude Code   │◄────────►│                  │
│   (HTTP API)    │          │                  │
└─────────────────┘          │   Coordination   │         ┌──────────────┐
                             │      Server      │◄────────►│ State Store  │
┌─────────────────┐          │                  │         │  (SQLite)    │
│ GitHub Copilot │◄────────►│                  │         └──────────────┘
│  (MCP Tools)    │          │                  │
└─────────────────┘          └──────────────────┘
                                      ▲
                                      │
                                      ▼
                            ┌──────────────────┐
                            │   User (CLI)     │
                            └──────────────────┘
```

## Features

### 🎭 Dual AI Support

- **Claude Code**: Connects via HTTP REST API for orchestration and complex tasks
- **GitHub Copilot**: Connects via MCP (Model Context Protocol) for autonomous task execution

### 📋 Task Management

- Priority-based task queue
- Task lifecycle tracking (queued → claimed → in-progress → completed)
- Capability-based task routing
- Progress reporting and monitoring

### 🔐 File Coordination

- Advisory file locking to prevent conflicts
- Support for multiple readers, exclusive writers
- Conflict detection and resolution
- Lock expiration to prevent deadlocks

### 💬 Context Sharing

- Shared conversation history between AIs
- State persistence across sessions
- Context handoff for task transfers

### 🎛️ Collaboration Modes

- **Orchestrator-Worker**: One AI leads, delegates to the other
- **Peer-to-Peer**: Equal partners with task handoffs
- **Parallel**: Both AIs work simultaneously on different aspects

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- VS Code (for GitHub Copilot integration)

### Installation

```bash
# Clone the repository
git clone <repository>
cd coordination-server

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
```

### Running the Server

```bash
# Development mode with hot reload
npm run dev

# Production mode
npm run build
npm start

# Run MCP server for Copilot (separate terminal)
npm run mcp
```

### Connecting Claude Code

Claude Code connects automatically when running in the same project. The server exposes HTTP endpoints at `http://localhost:3456/api/claude/*`.

### Connecting GitHub Copilot

1. Install the MCP client extension in VS Code
2. Add to your VS Code settings.json:

```json
{
  "mcp.servers": {
    "coordination": {
      "command": "npm",
      "args": ["run", "mcp"],
      "cwd": "/path/to/coordination-server"
    }
  }
}
```

3. Restart VS Code - Copilot will automatically discover available tools

## API Documentation

### Claude Code Endpoints

#### Register Agent

```http
POST /api/claude/register
Content-Type: application/json

{
  "agentId": "claude-code",
  "capabilities": ["typescript-development", "contract-definition"],
  "version": "1.0.0"
}
```

#### Get Available Tasks

```http
GET /api/claude/tasks?capabilities=typescript-development,testing
```

#### Claim Task

```http
POST /api/claude/tasks/{taskId}/claim
```

#### Report Progress

```http
POST /api/claude/tasks/{taskId}/progress
Content-Type: application/json

{
  "percentComplete": 50,
  "currentStep": "Implementing service",
  "filesModified": ["services/Example.ts"]
}
```

#### Complete Task

```http
POST /api/claude/tasks/{taskId}/complete
Content-Type: application/json

{
  "success": true,
  "output": "Service implemented successfully",
  "filesModified": ["services/Example.ts", "tests/Example.test.ts"]
}
```

### User Control Endpoints

#### Start Collaboration

```http
POST /api/user/collaboration/start
Content-Type: application/json

{
  "task": "Build user authentication system",
  "preferredLead": "claude-code",
  "mode": "orchestrator-worker"
}
```

#### Get Status

```http
GET /api/user/collaboration/{sessionId}/status
```

#### Pause/Resume/Cancel

```http
POST /api/user/collaboration/{sessionId}/pause
POST /api/user/collaboration/{sessionId}/resume
POST /api/user/collaboration/{sessionId}/cancel
```

### MCP Tools for Copilot

The following tools are exposed via MCP:

- `checkForTasks` - Find available tasks matching capabilities
- `claimTask` - Claim a task for execution
- `submitTaskResult` - Submit task completion results
- `requestFileAccess` - Request permission to modify files
- `releaseFileAccess` - Release file locks
- `getCollaborationStatus` - Get current session status

## Configuration

### Environment Variables

```env
# Server Configuration
PORT=3456                    # HTTP server port
USE_MOCKS=true              # Use mock services (false for production)
DEBUG=true                  # Enable debug logging
ENABLE_MCP=true            # Enable MCP server for Copilot
ENABLE_WEBSOCKET=true      # Enable WebSocket for real-time updates

# Database (when USE_MOCKS=false)
DATABASE_PATH=./coordination.db
REDIS_URL=redis://localhost:6379
```

### Service Configuration

Services can be configured in `services/factory.ts`:

```typescript
const services = await createServices({
  useMocks: true, // Use mock implementations
  databasePath: './db.sqlite', // SQLite database location
  debug: true, // Enable debug logging
  logger: customLogger, // Custom logger instance
})
```

## Development

### Project Structure

```
coordination-server/
├── contracts/           # TypeScript contracts (interfaces)
├── services/
│   ├── mock/           # Mock service implementations
│   ├── real/           # Real service implementations
│   └── factory.ts      # Service factory
├── src/
│   ├── index.ts        # Main server entry point
│   └── mcp-server.ts   # MCP server for Copilot
├── tests/              # Test suites
├── package.json        # Dependencies and scripts
└── tsconfig.json       # TypeScript configuration
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:contracts
npm run test:mocks
npm run test:integration

# Watch mode for development
npm run test:watch
```

### Adding New Services

1. Define the contract in `contracts/`
2. Implement mock service in `services/mock/`
3. Add to service factory in `services/factory.ts`
4. Implement real service in `services/real/`
5. Write tests in `tests/`

## Monitoring

### Health Check

```bash
curl http://localhost:3456/health
```

### Status Dashboard

```bash
curl http://localhost:3456/status
```

### Real-time Updates

Connect to WebSocket for live updates:

```javascript
const ws = new WebSocket('ws://localhost:3456')

ws.on('open', () => {
  ws.send(
    JSON.stringify({
      type: 'subscribe',
      sessionId: 'session_123',
    })
  )
})

ws.on('message', data => {
  const event = JSON.parse(data)
  console.log('Event:', event)
})
```

## Troubleshooting

### Common Issues

#### Port Already in Use

```bash
# Find process using port
lsof -i :3456

# Kill process
kill -9 <PID>
```

#### MCP Connection Failed

- Ensure VS Code has been restarted after configuration
- Check that coordination server is running
- Verify MCP client extension is installed

#### File Lock Conflicts

- Locks expire automatically after 5 minutes
- Force release locks via API if needed
- Check `/api/status` for active locks

### Debug Mode

Enable debug logging:

```bash
DEBUG=true npm run dev
```

View detailed logs in console output.

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for development guidelines.

## License

MIT

## Support

- Report issues: [GitHub Issues](https://github.com/your-repo/issues)
- Documentation: [Wiki](https://github.com/your-repo/wiki)

---

Built with ❤️ for AI collaboration

**Current Version**: 0.1.0
**Status**: Development/Testing
**Lead Developer**: Claude Code (AI)
