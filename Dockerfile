# Stage 1: Build
# Install dependencies and compile TypeScript + native modules
FROM node:22-slim AS builder

# Install build dependencies for native modules (sqlite3)
# python3, make, g++ are required for node-gyp to compile C++ bindings
RUN apt-get update && \
    apt-get install -y python3 make g++ && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files first (layer caching optimization)
# These change less frequently than source code
COPY package*.json ./

# Install all dependencies (including devDependencies for TypeScript compilation)
RUN npm ci

# Copy TypeScript configuration
COPY tsconfig.json ./

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Stage 2: Production Runtime
# Lean image with only compiled code and runtime dependencies
FROM node:22-slim

WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Copy the compiled node_modules from builder
# This includes compiled sqlite3 .node binaries
# DO NOT run npm ci again - would fail without build tools
COPY --from=builder /app/node_modules ./node_modules

# Copy built JavaScript code
COPY --from=builder /app/dist ./dist

# Copy package.json for metadata
COPY --from=builder /app/package.json ./

# Create database mount point with proper permissions
# /data is where users will mount their database files
RUN mkdir -p /data && \
    chown -R node:node /app /data

# Environment variable defaults
# Databases must be mounted at /data/ via volumes
ENV KUBESEARCH_DB_PATH=/data/repos.db \
    KUBESEARCH_DB_EXTENDED_PATH=/data/repos-extended.db \
    LOG_LEVEL=info

# Run as non-root user (security best practice)
# Uses built-in node user from official image
USER node

# Direct Node.js invocation (no npm start or process managers)
# MCP servers need clean signal handling
CMD ["node", "dist/index.js"]
