# Docker Quick Start Guide

**Quick reference for running the AI Coordination Server in Docker**

## Prerequisites

- Docker 20.10+
- Docker Compose 1.29+
- 2GB+ RAM
- 2GB+ disk space

## Quick Start (2 minutes)

### 1. Start Services

```bash
cd coordination-server

# Start all services (builds image if needed)
docker-compose up -d

# Wait for services to initialize
sleep 10

# Verify health
curl http://localhost:3456/health
```

### 2. Check Status

```bash
# View running services
docker-compose ps

# View logs
docker-compose logs --follow

# Check application status
curl http://localhost:3456/status
```

### 3. Stop Services

```bash
# Stop all services (preserve data)
docker-compose down

# Stop and remove all data
docker-compose down -v
```

## Common Tasks

### Build Docker Image

```bash
# Standard build
docker build -t tarot-coordination-server:latest .

# Build without cache
docker build --no-cache -t tarot-coordination-server:latest .

# Check image size
docker images tarot-coordination-server
```

### Development Mode

```bash
# Start with hot reload and debug logging
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Or set environment variable
export COMPOSE_FILE=docker-compose.yml:docker-compose.dev.yml
docker-compose up
```

### View Logs

```bash
# Follow application logs
docker-compose logs -f coordination-server

# View PostgreSQL logs
docker-compose logs -f postgres

# View last 50 lines
docker-compose logs --tail=50

# With timestamps
docker-compose logs --timestamps
```

### Access PostgreSQL

```bash
# Open PostgreSQL CLI
docker-compose exec postgres psql -U coordination_user -d coordination_db

# Examples
\dt           # List tables
\l            # List databases
SELECT * FROM active_locks;  # Query data
```

### Access Application Container

```bash
# Open shell in running container
docker-compose exec coordination-server sh

# Run commands in container
docker-compose exec coordination-server npm run check

# View environment variables
docker-compose exec coordination-server env | grep COORDINATION
```

### Monitor Resources

```bash
# Real-time resource usage
docker stats tarot-coordination-server

# Check memory usage
docker stats --no-stream | grep tarot-coordination-server

# Get detailed container info
docker inspect tarot-coordination-server
```

### Backup and Recovery

```bash
# Backup PostgreSQL database
docker-compose exec postgres pg_dump -U coordination_user coordination_db > backup.sql

# Restore PostgreSQL database
docker-compose exec -T postgres psql -U coordination_user coordination_db < backup.sql

# Backup all data volumes
docker run --rm -v coordination-data:/data -v $(pwd):/backup \
  alpine tar czf /backup/data-backup.tar.gz /data
```

## Configuration

### Production Environment

Create `.env` file:

```bash
# Copy template
cp .env.example .env

# Edit with production values
nano .env

# Start with .env configuration
docker-compose up -d
```

### Key Environment Variables

```bash
# Server
PORT=3456
NODE_ENV=production
USE_MOCKS=false          # Use real services
DEBUG=false

# Database
DB_TYPE=postgres
DATABASE_URL=postgresql://coordination_user:coordination_password@postgres:5432/coordination_db

# Features
ENABLE_MCP=false         # GitHub Copilot support
ENABLE_WEBSOCKET=true
```

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose logs coordination-server

# Check if port is in use
lsof -i :3456

# Run without detached mode to see errors
docker-compose up coordination-server
```

### Can't Connect to Database

```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Check PostgreSQL logs
docker-compose logs postgres

# Test connection
docker-compose exec coordination-server \
  node -e "const pg = require('pg'); console.log('PostgreSQL client loaded')"
```

### Health Check Failing

```bash
# Check container health
docker ps --format "{{.Names}}\t{{.Status}}" | grep coordination

# Get detailed health
docker inspect tarot-coordination-server --format='{{json .State.Health}}' | jq

# Manually test health endpoint
docker-compose exec coordination-server curl http://localhost:3456/health
```

### Permission Denied Errors

```bash
# Fix directory ownership
sudo chown -R 1001:1001 ./logs ./data

# Or make world-writable
sudo chmod 777 ./logs ./data
```

## File Structure

```
coordination-server/
├── Dockerfile                  # Multi-stage build
├── .dockerignore              # Ignore files in image
├── docker-compose.yml         # Production setup
├── docker-compose.dev.yml     # Development overrides
├── DOCKER-QUICKSTART.md       # This file
├── docs/
│   └── deployment/
│       └── docker.md          # Complete guide
├── src/
│   └── index.ts              # Main application
├── services/                  # Service implementations
├── dist/                      # Compiled JavaScript (after build)
├── data/                      # Database and app data
│   ├── postgres/             # PostgreSQL data
│   └── redis/                # Redis data (if enabled)
└── logs/                      # Application logs
```

## Useful Commands Reference

```bash
# Image operations
docker build -t name:tag .                    # Build image
docker images                                  # List images
docker rmi image_id                           # Remove image
docker inspect image_id                       # View image details

# Container operations
docker-compose up -d                          # Start services
docker-compose down                           # Stop services
docker-compose ps                             # List containers
docker-compose logs -f                        # Follow logs
docker-compose exec service command           # Run command in service

# Volume operations
docker volume ls                              # List volumes
docker volume inspect volume_name             # View volume details
docker volume prune                           # Remove unused volumes

# Network operations
docker network ls                             # List networks
docker network inspect network_name           # View network details

# System operations
docker system df                              # Disk usage
docker system prune                           # Clean up unused resources
docker stats                                  # Real-time resource stats
```

## Next Steps

- Read full guide: `docs/deployment/docker.md`
- Configure production environment: Copy `.env.example` to `.env`
- Set up monitoring: See `docs/monitoring-guide.md`
- Configure logging: See `docs/logging-guide.md`

## Support

For issues and detailed troubleshooting, see `docs/deployment/docker.md` - Troubleshooting section.
