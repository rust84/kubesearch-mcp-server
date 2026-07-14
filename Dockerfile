# Stage 1: Build
# Install dependencies and compile TypeScript
FROM node:24-slim AS builder

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

# Remove devDependencies (sdk/zod runtime deps only survive; sqlite access
# is via the built-in node:sqlite module, so there's nothing native to prune)
RUN npm prune --omit=dev

# Stage 2: Production Runtime
# Lean image with only compiled code and runtime dependencies
FROM node:24-slim

WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Copy the production-only node_modules from builder (pruned in builder)
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
    KUBESEARCH_DB_EXTENDED_PATH=/data/repos-extended.db

# Run as non-root user (security best practice)
# Uses built-in node user from official image
USER node

# Direct Node.js invocation (no npm start or process managers)
# MCP servers need clean signal handling
CMD ["node", "dist/index.js"]
