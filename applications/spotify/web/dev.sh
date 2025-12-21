#!/bin/bash
# Local development runner for Spotify web UI
# Runs outside Docker for fast iteration

set -e

cd "$(dirname "$0")"

# Check if shared package is built
if [ ! -d "../shared/dist" ]; then
  echo "Building shared package first..."
  cd ../shared
  pnpm build
  cd ../web
fi

# Use local SQLite database in /tmp
export DATABASE_PATH="${DATABASE_PATH:-/tmp/spotify-dev.db}"
export PORT="${PORT:-3000}"

# Required env vars (should be in .envrc at repo root)
if [ -z "$SPOTIFY_CLIENT_ID" ] || [ -z "$SPOTIFY_CLIENT_SECRET" ]; then
  echo "Error: Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET"
  echo "Make sure you've run 'direnv allow' at the repo root"
  exit 1
fi

# Default to local callback for development
export SPOTIFY_REDIRECT_URI="${SPOTIFY_REDIRECT_URI:-http://localhost:3000/auth/callback}"

echo "Starting Spotify web UI in development mode..."
echo "Database: $DATABASE_PATH"
echo "Port: $PORT"
echo "Redirect URI: $SPOTIFY_REDIRECT_URI"
echo ""

# Use tsx for TypeScript execution with watch mode
npx tsx watch src/index.ts
