# Logging Guide - AI Coordination Server

## Overview

The AI Coordination Server implements structured JSON logging using Winston for comprehensive observability and debugging capabilities. All logging is structured with correlation IDs for request tracing across the system.

## Log Levels

### ERROR
- **Usage**: Critical failures that require immediate attention
- **Example**: Service initialization failures, unhandled exceptions
- **Environment**: All environments
- **Action**: Alert operations team, investigate immediately

```typescript
logError('Service initialization failed', error, {
  service: 'ClaudeCoordinationMock',
  context: 'startup'
})
```

### WARN
- **Usage**: Recoverable issues that may indicate problems
- **Example**: Deprecated API usage, configuration issues, retries
- **Environment**: All environments
- **Action**: Review logs periodically, investigate patterns

```typescript
logWarn('API deprecated', {
  endpoint: '/api/old-endpoint',
  replacement: '/api/new-endpoint'
})
```

### INFO
- **Usage**: General operational events and state transitions
- **Example**: Agent registration, task claims, handoffs, status changes
- **Environment**: All environments (default)
- **Action**: Normal operation monitoring

```typescript
logInfo('Task claimed', {
  taskId: 'task-123',
  agentId: 'claude-code',
  priority: 'high'
})
```

### DEBUG
- **Usage**: Detailed diagnostic information for development
- **Example**: Method entry/exit, variable values, decision logic
- **Environment**: Development only (disabled in production)
- **Action**: Developer debugging

```typescript
logDebug('Processing task', {
  taskId,
  capabilities: input.capabilities,
  available: results.length
})
```

## Log Locations

### Main Log File
- **Path**: `logs/coordination.log`
- **Format**: JSON (one record per line)
- **Rotation**: Daily, kept for 14 days
- **Size**: 10MB max per file
- **Contents**: All levels (error, warn, info, debug)

### Error Log File
- **Path**: `logs/error.log`
- **Format**: JSON (one record per line)
- **Rotation**: Daily, kept for 14 days
- **Size**: 10MB max per file
- **Contents**: Errors and above only
- **Purpose**: Quick access to critical issues

### Console Output
- **Format**: Human-readable colored output
- **Levels**: Based on LOG_LEVEL env var
- **Purpose**: Development and debugging
- **Audience**: Developers running locally

## Configuration

### Environment Variables

```bash
# Log level: error, warn, info, debug
LOG_LEVEL=info

# Main log file location
LOG_FILE=./logs/coordination.log

# Error log file location
ERROR_LOG_FILE=./logs/error.log

# Log directory
LOG_DIR=./logs

# Log rotation settings
LOG_MAX_FILES=14           # Days to keep
LOG_MAX_SIZE=10m          # File size before rotation
```

### Example Configurations

**Development**:
```bash
LOG_LEVEL=debug
LOG_FILE=./logs/coordination.log
LOG_MAX_FILES=7
```

**Production**:
```bash
LOG_LEVEL=info
LOG_FILE=/var/log/coordination/coordination.log
ERROR_LOG_FILE=/var/log/coordination/error.log
LOG_MAX_FILES=30
LOG_MAX_SIZE=50m
```

**Testing**:
```bash
LOG_LEVEL=error
LOG_FILE=/tmp/coordination.log
```

## Using the Logger

### In Application Code

```typescript
import { logInfo, logError, logWarn } from './observability/logger'

// Info level
logInfo('User registered', {
  userId: user.id,
  email: user.email,
  timestamp: new Date().toISOString()
})

// Error level
logError('Database connection failed', error, {
  database: config.database,
  retryAttempt: 3
})

// Warning level
logWarn('Cache miss for frequently accessed key', {
  key: 'user-' + userId,
  ttl: 300
})
```

### With Correlation IDs

All HTTP requests automatically get a correlation ID for tracing:

```typescript
import { getCorrelationId, setCorrelationId } from './observability/logger'

// In middleware - already set automatically
// Or manually set for non-HTTP flows:
setCorrelationId(uuidv4())

// All subsequent logs in this context will include the correlation ID
logInfo('Processing started', { component: 'TaskProcessor' })
```

### Structured Fields

Always include relevant context:

```typescript
logInfo('Task assignment', {
  // Identification
  taskId: task.id,
  agentId: agent.id,

  // Categorization
  service: 'ClaudeCoordinationMock',
  component: 'TaskManager',

  // Details
  taskType: task.type,
  priority: task.priority,

  // Performance
  processingTimeMs: duration,

  // Context
  sessionId: session.id,
  userId: user.id
})
```

## Searching Logs

### Using grep (Command Line)

```bash
# Find all task completions
grep -i '"message":"Task completed' logs/coordination.log

# Find specific agent activity
grep '"agentId":"claude-code"' logs/coordination.log

# Find errors in time range
grep error logs/error.log | grep "2025-11-17"

# Find all errors for a specific task
grep 'task-123' logs/coordination.log | grep error
```

### Using jq (JSON Query)

```bash
# Parse JSON logs and filter
cat logs/coordination.log | jq 'select(.level=="error")'

# Extract specific fields
cat logs/coordination.log | jq '{timestamp, message, agentId, taskId}'

# Find all task handoffs
cat logs/coordination.log | jq 'select(.message | contains("Handoff"))'

# Count events by agent
cat logs/coordination.log | jq -r '.agentId' | sort | uniq -c
```

### Using log aggregators

The structured JSON format integrates seamlessly with log aggregators:

#### Loki (Grafana)
```
{job="coordination-server"} | json | level="error"
{job="coordination-server"} | json message="Task claimed"
{job="coordination-server"} | json agentId="claude-code"
```

#### ELK Stack (Elasticsearch)
```
level: error AND service: ClaudeCoordinationMock
agentId: "claude-code" AND message: "Task claimed"
correlationId: "abc-123" | sort by @timestamp
```

#### Datadog
```
service:coordination-server level:error
env:production @taskId:task-123
@correlationId:abc-123 @message:"Handoff"
```

## Log Analysis Examples

### Find Performance Issues
```bash
cat logs/coordination.log | jq 'select(.processingTimeMs > 5000)'
```

### Track Task Lifecycle
```bash
# Find all events for a specific task
grep '"taskId":"task-123"' logs/coordination.log | jq '{timestamp, message, status}'
```

### Monitor Agent Behavior
```bash
# Count activities per agent
cat logs/coordination.log | jq 'group_by(.agentId) | map({agent: .[0].agentId, count: length})'
```

### Error Rate Analysis
```bash
# Total events vs errors
TOTAL=$(cat logs/coordination.log | wc -l)
ERRORS=$(grep error logs/error.log | wc -l)
echo "Error rate: $((ERRORS * 100 / TOTAL))%"
```

## Best Practices

### DO:
- Include correlation IDs for cross-service tracing
- Add business context (agentId, taskId, sessionId)
- Log state transitions (queued → claimed → completed)
- Include error details for debugging
- Use appropriate log levels
- Add timing information for performance analysis

### DON'T:
- Log sensitive data (passwords, API keys, PII)
- Log entire large objects - summarize instead
- Create logs without context fields
- Mix structured and unstructured logging
- Ignore log rotation - it will fill disk

### Example Good Log
```typescript
logInfo('Handoff completed', {
  // Identification
  correlationId: getCorrelationId(),
  handoffId: handoff.id,
  taskId: handoff.taskId,

  // Actors
  fromAgent: 'claude-code',
  toAgent: 'github-copilot',

  // Details
  reason: 'Agent rotation',
  durationSeconds: 120,

  // Service context
  service: 'ClaudeCoordinationMock'
})
```

## Troubleshooting

### Logs not appearing
1. Check LOG_LEVEL env var - debug logs need LOG_LEVEL=debug
2. Verify logs directory exists and is writable
3. Check file permissions: `ls -la logs/`
4. Look in console output if file logging fails

### Disk space issues
1. Increase rotation frequency: Set smaller LOG_MAX_SIZE
2. Reduce retention: Lower LOG_MAX_FILES
3. Archive old logs: `tar -czf logs-backup.tar.gz logs/`
4. Monitor log size: `du -sh logs/`

### Performance impact
1. Log level too verbose: Increase LOG_LEVEL to warn or error
2. Too much context per log: Reduce field counts
3. Large log files: Ensure rotation is working
4. I/O bottleneck: Consider async log aggregation

## Integration Examples

### With Application Monitoring
```typescript
import { logger } from './observability/logger'

// All errors automatically captured by Winston
// Export metrics for monitoring
app.get('/metrics', (req, res) => {
  const logs = fs.readFileSync('logs/coordination.log', 'utf8')
  const errorCount = logs.split('\n').filter(l => l.includes('"level":"error"')).length
  res.json({ errors: errorCount })
})
```

### With Alerting Systems
```bash
#!/bin/bash
# Alert on error rate spike
ERROR_COUNT=$(grep error logs/error.log | wc -l)
if [ $ERROR_COUNT -gt 100 ]; then
  # Send alert to PagerDuty, Slack, etc.
  curl -X POST https://hooks.slack.com/... \
    -d "Error rate spike: $ERROR_COUNT errors in last hour"
fi
```

## Performance Considerations

- **Throughput**: ~10,000 logs/second per process
- **Latency**: <1ms per log entry (async write)
- **Disk**: ~100KB per 1,000 INFO logs (varies by detail level)
- **Memory**: Minimal - logs are streamed, not buffered

## Related Documentation

- [README.md](../README.md) - Project overview
- [.env.example](../.env.example) - Environment variable reference
- [Winston Documentation](https://github.com/winstonjs/winston) - Logger library
