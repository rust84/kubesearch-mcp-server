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

# Stage 2: Download kubesearch databases
# Built on the host platform so QEMU doesn't redownload for each target arch.
# curl is preferred by download-databases.sh; wget would also work via its fallback.
FROM --platform=$BUILDPLATFORM node:24-slim AS db-fetch

WORKDIR /data

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl jq ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY download-databases.sh /usr/local/bin/download-databases.sh
# Bumping DB_REFRESH_DATE invalidates this layer's cache (used by the daily
# db-refresh workflow). The default value keeps code-push builds cached on
# the previous DB layer — the daily refresh is the source of truth for DB
# freshness, and code pushes don't need to pay a fresh download.
ARG DB_REFRESH_DATE=manual

RUN chmod +x /usr/local/bin/download-databases.sh \
    && /usr/local/bin/download-databases.sh /data

# Stage 3: Production Runtime
# Lean image with only compiled code, runtime dependencies, and bundled DBs
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

# Bake the kubesearch databases into the image. /data remains a mount point,
# so users can still override the bundled DBs by mounting their own files
# at /data/repos.db and /data/repos-extended.db.
COPY --from=db-fetch /data /data

# Database mount point with proper permissions
RUN mkdir -p /data \
    && chown -R node:node /app /data

# Environment variable defaults point at the bundled databases
ENV KUBESEARCH_DB_PATH=/data/repos.db \
    KUBESEARCH_DB_EXTENDED_PATH=/data/repos-extended.db

# Run as non-root user (security best practice)
# Uses built-in node user from official image
USER node

# Direct Node.js invocation (no npm start or process managers)
# MCP servers need clean signal handling
CMD ["node", "dist/index.js"]
