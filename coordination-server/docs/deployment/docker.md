# Docker Deployment Guide for AI Coordination Server

**Version**: 1.0.0
**Last Updated**: 2025-11-17
**Target Audience**: DevOps Engineers, System Administrators, Docker Operators

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Quick Start](#quick-start)
4. [Building the Docker Image](#building-the-docker-image)
5. [Running with Docker Compose](#running-with-docker-compose)
6. [Development Setup](#development-setup)
7. [Production Deployment](#production-deployment)
8. [Environment Variables](#environment-variables)
9. [Networking and Volumes](#networking-and-volumes)
10. [Health Checks](#health-checks)
11. [Troubleshooting](#troubleshooting)
12. [Security Best Practices](#security-best-practices)
13. [Performance Optimization](#performance-optimization)

---

## Overview

The AI Coordination Server can be containerized using Docker for consistent deployment across development, testing, and production environments.

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Docker Host                             │
│  ┌──────────────────────────────────────────────────┐   │
│  │          coordination-network (bridge)            │   │
│  │  ┌─────────────────────────────────────────────┐ │   │
│  │  │  coordination-server (Node.js + Express)    │ │   │
│  │  │  - HTTP API on port 3456                   │ │   │
│  │  │  - WebSocket server                        │ │   │
│  │  │  - MCP server (optional)                   │ │   │
│  │  └────────────┬──────────────────────────────┘ │   │
│  │               │                                  │   │
│  │  ┌────────────▼──────────────────────────────┐ │   │
│  │  │  PostgreSQL Database                      │ │   │
│  │  │  - Port 5432 (internal)                  │ │   │
│  │  │  - Persistent volume: postgres-data     │ │   │
│  │  └───────────────────────────────────────────┘ │   │
│  │                                                  │   │
│  │  ┌────────────────────────────────────────────┐ │   │
│  │  │  Redis Cache (optional)                   │ │   │
│  │  │  - Port 6379 (internal)                  │ │   │
│  │  │  - Persistent volume: redis-data        │ │   │
│  │  └────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Image Size

- **Base Image**: `node:20-alpine` (189 MB)
- **Built Image Target**: < 200 MB
- **Production Image**: ~180-195 MB (with dependencies, excluding node_modules from build stage)

---

## Prerequisites

### System Requirements

- **Docker**: 20.10+ (Check: `docker --version`)
- **Docker Compose**: 1.29+ (Check: `docker-compose --version`)
- **Disk Space**: Minimum 2GB (for images, containers, and volumes)
- **RAM**: Minimum 2GB for development, 4GB+ for production

### Verify Installation

```bash
# Check Docker installation
docker run hello-world

# Check Docker Compose installation
docker-compose --version

# Verify user can run Docker (no sudo needed)
docker ps
```

If Docker requires sudo, add your user to the docker group:

```bash
sudo usermod -aG docker $USER
# Log out and back in for changes to take effect
```

---

## Quick Start

### 1. Build the Docker Image

```bash
cd coordination-server

# Standard build (single-stage, slower but complete)
docker build -t tarot-coordination-server:latest .

# View image information
docker images | grep tarot-coordination-server
```

### 2. Run with Docker Compose

```bash
# Start all services (server, PostgreSQL)
docker-compose up -d

# Wait for services to start
sleep 10

# Verify services are running
docker-compose ps

# Check health
curl http://localhost:3456/health
```

### 3. Stop Services

```bash
# Stop all services (preserve data)
docker-compose down

# Stop and remove volumes (WARNING: deletes data)
docker-compose down -v
```

---

## Building the Docker Image

### Build Options

#### Standard Build

```bash
docker build -t tarot-coordination-server:latest .
```

#### Build with Build Arguments

```bash
docker build \
  --build-arg NODE_ENV=production \
  -t tarot-coordination-server:latest .
```

#### Build with Custom Tags

```bash
# Tag with version
docker build -t tarot-coordination-server:0.1.0 .

# Tag with multiple versions
docker build -t tarot-coordination-server:latest -t tarot-coordination-server:0.1.0 .

# Tag for registry
docker build -t ghcr.io/myorg/coordination-server:latest .
```

### Verify Build

```bash
# Inspect image
docker inspect tarot-coordination-server:latest

# Check image size
docker images tarot-coordination-server

# Run built image directly (without compose)
docker run -p 3456:3456 \
  -e USE_MOCKS=true \
  -e DEBUG=true \
  tarot-coordination-server:latest
```

### Build Performance

**Build stages**:
1. **Builder Stage**: Compile TypeScript (~30-40 seconds)
2. **Runtime Stage**: Install production dependencies (~20-30 seconds)
3. **Total Time**: ~50-70 seconds on modern hardware

**Optimize build caching**:

```bash
# Force rebuild without cache
docker build --no-cache -t tarot-coordination-server:latest .

# Use BuildKit for better caching (if available)
DOCKER_BUILDKIT=1 docker build -t tarot-coordination-server:latest .
```

---

## Running with Docker Compose

### Production Setup (Default)

Uses PostgreSQL database and optimized configuration.

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f coordination-server

# View specific service logs
docker-compose logs postgres

# Check service status
docker-compose ps
```

### Production Configuration

**File**: `docker-compose.yml`

**Services**:
- `coordination-server`: Main application
- `postgres`: PostgreSQL 16 database
- `redis` (optional): Redis cache

**Volumes**:
- `postgres-data`: Database persistence
- `coordination-logs`: Application logs
- `coordination-data`: Application data

**Network**: `coordination-network` (bridge)

### Common Operations

```bash
# Stop services (keep data)
docker-compose stop

# Restart services
docker-compose restart coordination-server

# View resource usage
docker stats tarot-coordination-server

# Execute command in running container
docker-compose exec coordination-server npm run check

# Access PostgreSQL CLI
docker-compose exec postgres psql -U coordination_user -d coordination_db

# View environment variables
docker-compose exec coordination-server env | grep COORDINATION
```

---

## Development Setup

### Using Development Compose Override

The development configuration enables:
- **Hot reload** via source code volume mounting
- **Debug logging** enabled
- **Mock services** for testing
- **Development tools** (pgAdmin, etc.)

### Start Development Environment

```bash
# Set environment variable (optional, for convenience)
export COMPOSE_FILE=docker-compose.yml:docker-compose.dev.yml

# Start with development overrides
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Shorthand (if COMPOSE_FILE is set)
docker-compose up
```

### Development Features

**Hot Reload**:
```bash
# Changes to src/ are automatically reloaded
# Edit a file and save
# Server will restart automatically

# View logs
docker-compose logs -f coordination-server
```

**Debug Logging**:
```bash
# Access logs in container
docker-compose exec coordination-server tail -f logs/coordination.log

# Watch logs in real-time
docker-compose logs -f --tail=20
```

**Using PgAdmin for Database Management**:

Uncomment `pgadmin` service in `docker-compose.dev.yml`:

```bash
# Open browser
# Navigate to http://localhost:5050
# Login with admin@example.com / admin_password

# Add PostgreSQL server
# Hostname: postgres:5432
# Username: coordination_user
# Password: coordination_password
```

**Enable Node Debugger**:

```bash
# In docker-compose.dev.yml, uncomment port 9229
# In your IDE, configure remote debugging on port 9229
# Use Chrome DevTools: chrome://inspect
```

---

## Production Deployment

### Pre-Deployment Checklist

- [ ] Image built and tested locally
- [ ] `.env` file configured with production values
- [ ] Database initialized and backed up
- [ ] Health checks verified
- [ ] Resource limits set appropriately
- [ ] Log rotation configured
- [ ] Monitoring tools set up
- [ ] Backup strategy in place

### Deploy to Production

1. **Prepare Production Environment**:

```bash
# Create data directories
mkdir -p data/postgres logs

# Create .env file with production secrets
cp .env.example .env
# Edit .env with production values
nano .env

# Ensure proper permissions
chmod 700 data/postgres
```

2. **Start Services**:

```bash
# Pull latest image
docker pull tarot-coordination-server:latest

# Start in detached mode
docker-compose up -d

# Wait for services to initialize
sleep 15

# Verify health
curl https://your-domain.com/health

# Check logs
docker-compose logs --tail=50
```

3. **Post-Deployment Verification**:

```bash
# Check all services are running
docker-compose ps

# Verify database connectivity
docker-compose exec coordination-server curl -s http://localhost:3456/status | jq .

# Test API endpoints
curl -X POST http://localhost:3456/api/claude/register \
  -H "Content-Type: application/json" \
  -d '{"agentId":"claude-test","capabilities":[]}'

# Monitor logs for errors
docker-compose logs --follow --tail=100
```

### Health Monitoring

```bash
# Monitor container health
docker ps --filter name=coordination-server --format "{{.Status}}"

# Get detailed health status
docker inspect tarot-coordination-server --format='{{json .State.Health}}' | jq

# Check application metrics
curl http://localhost:3456/metrics
```

---

## Environment Variables

### Critical Variables (Must Configure)

| Variable | Default | Purpose | Example |
|----------|---------|---------|---------|
| `NODE_ENV` | production | Node.js environment | `production` or `development` |
| `PORT` | 3456 | Application port | `3456` |
| `USE_MOCKS` | false | Use mock services | `false` (production) |
| `DB_TYPE` | postgres | Database type | `postgres` or `sqlite` |
| `DATABASE_URL` | (required) | PostgreSQL connection | `postgresql://user:pass@host:5432/db` |

### Optional Variables

| Variable | Default | Purpose | Example |
|----------|---------|---------|---------|
| `DEBUG` | false | Debug logging | `false` |
| `ENABLE_MCP` | false | Enable MCP server | `true` |
| `ENABLE_WEBSOCKET` | true | WebSocket server | `true` |
| `LOG_LEVEL` | info | Logging level | `info`, `debug`, `error` |
| `LOG_DIR` | /app/logs | Log directory | `/app/logs` |
| `RATE_LIMIT_WINDOW_MS` | 60000 | Rate limit window | `60000` |
| `RATE_LIMIT_DEFAULT_REQUESTS` | 100 | Default rate limit | `100` |

### Setting Environment Variables

**Method 1: `.env` File**

```bash
# Create production .env
cat > .env << EOF
NODE_ENV=production
PORT=3456
USE_MOCKS=false
DEBUG=false
DB_TYPE=postgres
DATABASE_URL=postgresql://coordination_user:coordination_password@postgres:5432/coordination_db
LOG_LEVEL=info
EOF

# Load in docker-compose.yml
docker-compose up -d
```

**Method 2: `.env.example` Template**

```bash
# Start from template
cp .env.example .env

# Edit with your values
nano .env

# Verify syntax
docker-compose config > /dev/null && echo "Config valid"
```

**Method 3: Command Line Override**

```bash
# Override specific variables
docker-compose -e USE_MOCKS=true up -d

# Export before running
export NODE_ENV=production
export DEBUG=false
docker-compose up -d
```

---

## Networking and Volumes

### Network Configuration

**Services communicate via internal network**:

```
coordination-server <---> postgres
        |
        +---> redis (optional)
```

**External Access**:

```bash
# From host machine
curl http://localhost:3456/health

# From other containers
docker-compose exec postgres curl http://coordination-server:3456/health
```

### Network Inspection

```bash
# List networks
docker network ls

# Inspect coordination network
docker network inspect coordination-network

# Test network connectivity
docker-compose exec coordination-server ping postgres
docker-compose exec postgres ping coordination-server
```

### Volume Management

```bash
# List volumes
docker volume ls | grep coordination

# Inspect volume
docker volume inspect coordination-logs

# Backup volume data
docker run --rm -v coordination-data:/data -v $(pwd):/backup \
  alpine tar czf /backup/coordination-data.tar.gz /data

# Restore volume data
docker run --rm -v coordination-data:/data -v $(pwd):/backup \
  alpine tar xzf /backup/coordination-data.tar.gz -C /

# Clean up volumes (WARNING: deletes data)
docker-compose down -v
```

---

## Health Checks

### Built-in Health Check

The Dockerfile includes a health check endpoint:

```bash
# Manual health check
curl http://localhost:3456/health

# Response example
{
  "status": "healthy",
  "timestamp": "2025-11-17T10:30:45.123Z",
  "config": {
    "useMocks": false,
    "mcpEnabled": false,
    "webSocketEnabled": true
  }
}
```

### Docker Health Status

```bash
# Check container health
docker ps --format "{{.Names}}\t{{.Status}}"

# Output example
tarot-coordination-server    Up 2 minutes (healthy)

# Get detailed health info
docker inspect tarot-coordination-server --format='{{json .State.Health}}' | jq

# Monitor health changes
watch -n 1 'docker ps | grep coordination'
```

### Application Status Endpoint

```bash
# Detailed status
curl http://localhost:3456/status

# Response includes
{
  "status": "operational",
  "services": {
    "stateStore": "connected",
    "claude": "ready",
    "copilot": "ready",
    "user": "ready",
    "fileSystem": "ready"
  },
  "metrics": {
    "activeLocks": 5,
    "mcpTools": 15,
    "wsConnections": 3
  }
}
```

### Metrics Endpoint

```bash
# Prometheus-formatted metrics
curl http://localhost:3456/metrics

# Response is Prometheus text format
# Can be scraped by monitoring systems
```

---

## Troubleshooting

### Container Won't Start

**Symptom**: Container exits immediately

**Diagnosis**:
```bash
# Check logs
docker-compose logs coordination-server

# Run without detached mode to see output
docker-compose up coordination-server

# Check exit code
docker-compose ps
```

**Solutions**:
- Check environment variables are correct
- Verify PostgreSQL is running: `docker-compose logs postgres`
- Check port 3456 is not in use: `lsof -i :3456`
- Review application logs for errors

### Cannot Connect to Database

**Symptom**: `Error: connect ECONNREFUSED 127.0.0.1:5432`

**Diagnosis**:
```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Check PostgreSQL logs
docker-compose logs postgres

# Test connectivity from application container
docker-compose exec coordination-server \
  node -e "require('pg').Client.connect(process.env.DATABASE_URL)"
```

**Solutions**:
- Ensure PostgreSQL service is running
- Check DATABASE_URL environment variable
- Wait for PostgreSQL to be ready (health check)
- Verify network connectivity between containers

### Out of Memory

**Symptom**: Container killed by OOM killer

**Solution**:
```bash
# Check memory usage
docker stats tarot-coordination-server

# Increase container memory limit
# Edit docker-compose.yml:
deploy:
  resources:
    limits:
      memory: 1G
```

### Health Check Fails

**Symptom**: Container becomes unhealthy

**Diagnosis**:
```bash
# Check health status
docker inspect tarot-coordination-server --format='{{json .State.Health}}'

# Get detailed output
docker inspect tarot-coordination-server | jq '.[] | .State.Health'

# Check if health endpoint responds
docker-compose exec coordination-server wget -q -O - http://localhost:3456/health
```

**Solutions**:
- Ensure application started successfully: `docker-compose logs`
- Increase health check timeout: adjust `timeout: 10s` in docker-compose.yml
- Check if port 3456 is open: `docker-compose exec coordination-server netstat -tlnp`

### Volume Permission Issues

**Symptom**: `permission denied` errors writing to logs/data

**Diagnosis**:
```bash
# Check volume permissions
docker-compose exec coordination-server ls -la /app/logs

# Check running user
docker-compose exec coordination-server id
```

**Solutions**:
```bash
# Fix directory permissions on host
sudo chown -R 1001:1001 ./logs ./data

# Or make world-writable
sudo chmod 777 ./logs ./data
```

### Network Issues Between Containers

**Symptom**: Services can't communicate

**Diagnosis**:
```bash
# Test network connectivity
docker-compose exec coordination-server ping postgres

# Check DNS resolution
docker-compose exec coordination-server nslookup postgres

# Inspect network
docker network inspect coordination-network
```

**Solutions**:
- Ensure services are on same network
- Check firewall rules
- Restart networking: `docker-compose down && docker-compose up -d`

---

## Security Best Practices

### 1. Non-Root User

✅ **Already Implemented**

The Dockerfile runs the application as `nodejs` (UID 1001), not root.

```bash
# Verify
docker-compose exec coordination-server id
# uid=1001(nodejs) gid=1001(nodejs) groups=1001(nodejs)
```

### 2. Secrets Management

**Problem**: Don't commit `.env` with secrets

**Solution**:
```bash
# Add .env to .gitignore
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore

# Use .env.example instead
cp .env.example .env.example

# In CI/CD, inject secrets
export DATABASE_PASSWORD=$(aws secretsmanager get-secret-value --secret-id coordination-db-password)
docker-compose up -d
```

### 3. Minimal Base Image

✅ **Already Used**: `node:20-alpine` (189 MB base)

Benefits:
- Smaller attack surface
- Fewer dependencies
- Faster deployment

### 4. Read-Only Filesystem (Optional)

```yaml
# In docker-compose.yml
coordination-server:
  read_only: true
  volumes:
    - /app/logs  # Allow write to logs
    - /app/data  # Allow write to data
    - /tmp       # Allow write to temp
```

### 5. Resource Limits

```yaml
# In docker-compose.yml
coordination-server:
  deploy:
    resources:
      limits:
        cpus: '1'
        memory: 512M
      reservations:
        cpus: '0.5'
        memory: 256M
```

### 6. Network Isolation

```bash
# Create private network (instead of default bridge)
docker network create --driver bridge coordination-private
```

### 7. Regular Updates

```bash
# Keep base image updated
docker pull node:20-alpine
docker build --no-cache -t tarot-coordination-server:latest .
```

### 8. Image Scanning

```bash
# Scan for vulnerabilities (if using registry)
docker scan tarot-coordination-server:latest

# Or use third-party tools
# - Trivy: trivy image tarot-coordination-server:latest
# - Grype: grype tarot-coordination-server:latest
```

---

## Performance Optimization

### 1. Layer Caching

**Current Dockerfile uses efficient layer caching**:
- Copy package.json first (changes less often)
- Install dependencies
- Copy source code (changes more often)
- Build

**Result**: Better cache hits on rebuilds

### 2. Production Dependencies Only

```dockerfile
# Runtime stage installs production deps only
RUN npm ci --omit=dev --omit=optional
```

**Benefits**:
- Smaller image (no TypeScript compiler, test runner, etc.)
- Faster startup
- Fewer security vulnerabilities

### 3. Alpine Linux

**node:20-alpine is already used**:

```bash
# Check image size comparison
docker images | grep node

# Alpine: 189 MB
# Standard (Debian): 1.1 GB
# Slim (Debian): 370 MB
```

### 4. Startup Time

**Typical startup sequence**:

```
Pre-start health check (10s)
  ↓
Application initialization (1-2s)
  ↓
Database connection (2-3s)
  ↓
Ready for requests (2-3s)
─────────────
Total: 15-20 seconds
```

**Optimize**:

```yaml
# Increase health check start period if needed
healthcheck:
  start_period: 30s  # Give app time to start
```

### 5. Memory Usage

**Monitor memory consumption**:

```bash
# Real-time memory stats
docker stats tarot-coordination-server

# Average memory with mocks: ~60-80 MB
# Average memory with PostgreSQL: ~100-150 MB
```

**Optimize**:

```bash
# Enable memory compression (Docker Desktop/Linux)
# Set swappiness for container
# Tune Node.js memory settings
NODE_OPTIONS="--max_old_space_size=512"
```

### 6. Database Connection Pooling

**PostgreSQL already uses connection pooling**:

```javascript
// In real services implementation
const pool = new Pool({
  max: 20,           // Max connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})
```

### 7. Multi-Stage Build Efficiency

**Current build uses two stages**:

1. **Builder Stage**: Compiles TypeScript
2. **Runtime Stage**: Only includes compiled code

**Result**: No build tools in final image → smaller, faster

---

## Advanced Configurations

### Using Docker Secrets (Swarm Mode)

```bash
# Create secrets
echo "production_db_password" | docker secret create coordination_db_pass -

# Use in docker-compose
docker stack deploy -c docker-compose.yml coordination-server
```

### Kubernetes Migration

To migrate to Kubernetes, convert docker-compose to Helm:

```bash
# Install kompose
curl -L https://github.com/kubernetes/kompose/releases/download/v1.26.1/kompose-linux-amd64 -o kompose

# Convert
kompose convert -f docker-compose.yml -o k8s/

# Deploy
kubectl apply -f k8s/
```

### CI/CD Integration

```bash
# GitHub Actions example
- name: Build and push Docker image
  uses: docker/build-push-action@v4
  with:
    context: ./coordination-server
    push: true
    tags: ghcr.io/tarot-out-my-heart/coordination-server:${{ github.sha }}
    cache-from: type=registry,ref=ghcr.io/tarot-out-my-heart/coordination-server:buildcache
    cache-to: type=registry,ref=ghcr.io/tarot-out-my-heart/coordination-server:buildcache,mode=max
```

---

## Getting Help

### Documentation

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [Node.js Docker Best Practices](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)

### Debug Commands

```bash
# View detailed logs
docker-compose logs --timestamps --follow

# Inspect configuration
docker-compose config

# Check resource usage
docker stats

# View network
docker network inspect coordination-network

# Access container shell
docker-compose exec coordination-server sh
```

### Common Issues Checklist

- [ ] Docker and Docker Compose installed?
- [ ] Ports 3456, 5432 available?
- [ ] Sufficient disk space (2GB+)?
- [ ] `.env` file configured?
- [ ] Firewall allows container traffic?
- [ ] Sufficient RAM (2GB+)?

---

## Maintenance

### Regular Tasks

```bash
# Daily: Check logs
docker-compose logs --tail=100

# Weekly: Prune unused images and containers
docker system prune -a

# Monthly: Update base image
docker pull node:20-alpine
docker build --no-cache .

# Quarterly: Backup database
docker exec tarot-coordination-postgres pg_dump -U coordination_user coordination_db > backup.sql
```

### Backup and Recovery

```bash
# Backup entire data volume
docker run --rm -v coordination-data:/data -v $(pwd):/backup \
  alpine tar czf /backup/data-backup.tar.gz /data

# Backup database
docker-compose exec postgres pg_dump -U coordination_user coordination_db > db-backup.sql

# Restore database
docker-compose exec -T postgres psql -U coordination_user coordination_db < db-backup.sql
```

---

**End of Docker Deployment Guide**
