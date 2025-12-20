# Build stage
FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc ./
COPY shared ./shared
COPY web ./web

# Install build tools for native modules
RUN apk add --no-cache python3 make g++

# Install all dependencies and build (enable build scripts for better-sqlite3)
RUN pnpm install --frozen-lockfile --ignore-scripts=false

# Explicitly rebuild better-sqlite3 for linux/amd64
RUN cd node_modules/.pnpm/better-sqlite3@*/node_modules/better-sqlite3 && npm run build-release

RUN pnpm --filter @homelab/spotify-shared build
RUN pnpm --filter spotify-web build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy workspace structure
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/package.json ./

# Copy shared library
COPY --from=builder /app/shared/package.json ./shared/
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/shared/src/db/schema.sql ./shared/dist/db/schema.sql
COPY --from=builder /app/shared/node_modules ./shared/node_modules

# Copy web app
COPY --from=builder /app/web/package.json ./web/
COPY --from=builder /app/web/dist ./web/dist
COPY --from=builder /app/web/src/views ./web/dist/views
COPY --from=builder /app/web/node_modules ./web/node_modules

# Copy root node_modules for shared dependencies
COPY --from=builder /app/node_modules ./node_modules

WORKDIR /app/web

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "dist/index.js"]
