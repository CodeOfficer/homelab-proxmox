#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

export DATABASE_PATH="${DATABASE_PATH:-/tmp/spotify-dev.db}"

if [[ -z "${SPOTIFY_SYNC_DUMP_PATH:-}" ]]; then
  latest_dump=$(ls -t /tmp/spotify-sync-*.jsonl 2>/dev/null | head -n 1 || true)
  if [[ -z "$latest_dump" ]]; then
    echo "Error: No dump file found. Set SPOTIFY_SYNC_DUMP_PATH or create a dump with pnpm dev:sync:local."
    exit 1
  fi
  export SPOTIFY_SYNC_DUMP_PATH="$latest_dump"
fi

# Ensure shared package is built so types stay in sync
if [ ! -d "./shared/dist" ]; then
  echo "Building shared package first..."
  pnpm --filter spotify-shared build
fi

echo "Replaying dump into local database..."
echo "Database: $DATABASE_PATH"
echo "Dump: $SPOTIFY_SYNC_DUMP_PATH"
echo ""

exec pnpm --filter spotify-sync dev:replay
