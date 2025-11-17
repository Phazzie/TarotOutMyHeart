# Multi-stage build for AI Coordination Server
# Stage 1: Build stage
# Compiles TypeScript and prepares dependencies

FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for TypeScript compilation)
RUN npm ci --include=optional

# Copy source code and related files
COPY tsconfig.json ./
COPY src ./src
COPY services ./services
COPY ../contracts ../contracts

# Build TypeScript
RUN npm run build

# Verify build output
RUN test -d dist || (echo "Build failed: dist directory not created" && exit 1)

# ============================================
# Stage 2: Runtime stage
# Creates minimal production image

FROM node:20-alpine

# Add metadata labels
LABEL maintainer="TarotOutMyHeart Team"
LABEL description="AI Coordination Server for Claude Code and GitHub Copilot collaboration"
LABEL version="0.1.0"

# Set working directory
WORKDIR /app

# Create non-root user for security (follow principle of least privilege)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files
COPY package*.json ./

# Install production dependencies only
# Remove unnecessary files and cache
RUN npm ci --omit=dev --omit=optional && \
    npm cache clean --force

# Copy compiled application from builder stage
COPY --from=builder /app/dist ./dist

# Copy .env.example for reference
COPY .env.example ./

# Create directories for logs and data persistence
RUN mkdir -p logs && \
    mkdir -p data && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose application port (default: 3456)
EXPOSE 3456

# Health check endpoint
# Checks if the server is responding on /health endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3456/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Set environment variables with sensible defaults
ENV NODE_ENV=production
ENV PORT=3456
ENV USE_MOCKS=true
ENV DEBUG=false
ENV ENABLE_MCP=false
ENV ENABLE_WEBSOCKET=true
ENV DB_TYPE=sqlite
ENV DATABASE_PATH=/app/data/coordination.db
ENV LOG_DIR=/app/logs
ENV LOG_LEVEL=info

# Start the application
# Node.js will gracefully handle SIGTERM for container shutdown
CMD ["node", "dist/index.js"]
