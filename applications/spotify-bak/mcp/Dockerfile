# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install build tools for native modules (better-sqlite3)
RUN apk add --no-cache python3 make g++

# Install pnpm
RUN npm install -g pnpm

# Copy workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY shared/package.json shared/
COPY mcp/package.json mcp/

# Install dependencies
RUN pnpm install --frozen-lockfile --ignore-scripts && \
    cd /app/node_modules/.pnpm/better-sqlite3@*/node_modules/better-sqlite3 && \
    npm run build-release

# Copy source
COPY shared/ shared/
COPY mcp/ mcp/

# Build shared first, then mcp
RUN pnpm --filter @homelab/spotify-shared build
RUN pnpm --filter spotify-mcp build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install build tools for native modules
RUN apk add --no-cache python3 make g++

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --from=builder /app/shared/package.json shared/
COPY --from=builder /app/mcp/package.json mcp/

# Install production dependencies
RUN pnpm install --frozen-lockfile --prod --ignore-scripts && \
    cd /app/node_modules/.pnpm/better-sqlite3@*/node_modules/better-sqlite3 && \
    npm run build-release

# Copy built files
COPY --from=builder /app/shared/dist shared/dist/
COPY --from=builder /app/shared/src/db/schema.sql shared/dist/db/
COPY --from=builder /app/shared/src/db/migrations shared/dist/db/migrations/
COPY --from=builder /app/mcp/dist mcp/dist/

# Create data directory
RUN mkdir -p /data

WORKDIR /app/mcp

# Run SSE server for remote deployment
CMD ["node", "dist/sse-server.js"]
