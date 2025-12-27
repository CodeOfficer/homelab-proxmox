#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$SCRIPT_DIR/.."
cd "$REPO_ROOT"

# Ensure .local directory exists
mkdir -p "$REPO_ROOT/.local"

# Set paths (absolute to ensure consistency across workspaces)
export SPOTIFY_DB_PATH="${SPOTIFY_DB_PATH:-$REPO_ROOT/.local/spotify.db}"

# SPOTIFY_SYNC_DUMP_PATH should be set by dev-sync.sh
if [[ -z "${SPOTIFY_SYNC_DUMP_PATH:-}" ]]; then
  echo "Error: SPOTIFY_SYNC_DUMP_PATH not set"
  exit 1
fi

if [[ ! -f "$SPOTIFY_SYNC_DUMP_PATH" ]]; then
  echo "Error: Cache file not found: $SPOTIFY_SYNC_DUMP_PATH"
  exit 1
fi

echo "Restoring from cache..."
echo "  Database: $SPOTIFY_DB_PATH"
echo "  Cache: $SPOTIFY_SYNC_DUMP_PATH"
echo ""

# Run restore (with tsx for dev)
exec pnpm --filter @spotify/sync dev:restore
