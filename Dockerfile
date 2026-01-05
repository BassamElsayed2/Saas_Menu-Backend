# ============================================
# Multi-stage Dockerfile for Production
# Optimized for Coolify deployment
# ============================================

# ----- Stage 1: Build -----
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (better caching)
COPY package*.json ./
RUN npm ci --only=production && \
    npm cache clean --force

# Copy source and build
COPY tsconfig.json ./
COPY src ./src

# Install dev dependencies and build
RUN npm install --only=development && \
    npm run build && \
    npm prune --production

# ----- Stage 2: Production -----
FROM node:20-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user (security best practice)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy package files
COPY package*.json ./

# Copy built files from builder
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

# Copy database migrations and scripts
COPY --chown=nodejs:nodejs database ./database
COPY --chown=nodejs:nodejs scripts ./scripts

# Create necessary directories with proper permissions
RUN mkdir -p uploads/logos uploads/menu-items uploads/ads uploads/categories logs && \
    chown -R nodejs:nodejs uploads logs

# Switch to non-root user
USER nodejs

# Health check (uses PORT env var, defaults to 5000)
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 5000) + '/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1);})"

# Expose port (will be overridden by PORT env var)
EXPOSE 4021 5000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the server
CMD ["node", "dist/server.js"]

