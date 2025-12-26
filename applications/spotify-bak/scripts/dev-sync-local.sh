#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

export DATABASE_PATH="${DATABASE_PATH:-/tmp/spotify-dev.db}"
export SPOTIFY_SYNC_DUMP_PATH="${SPOTIFY_SYNC_DUMP_PATH:-/tmp/spotify-sync-$(date +%Y%m%d-%H%M%S).jsonl}"

if [[ "${SPOTIFY_SYNC_FORCE:-}" == "1" ]]; then
  echo "Forcing full sync (SPOTIFY_SYNC_FORCE=1)"
fi

missing=()
if [[ -z "${SPOTIFY_CLIENT_ID:-}" ]]; then
  missing+=("SPOTIFY_CLIENT_ID")
fi
if [[ -z "${SPOTIFY_CLIENT_SECRET:-}" ]]; then
  missing+=("SPOTIFY_CLIENT_SECRET")
fi
if [[ -z "${SPOTIFY_DB_ENCRYPTION_KEY:-}" ]]; then
  missing+=("SPOTIFY_DB_ENCRYPTION_KEY")
fi

if (( ${#missing[@]} > 0 )); then
  echo "Error: Missing env vars: ${missing[*]}"
  echo "Set them in your shell or via direnv at the repo root."
  exit 1
fi

# Ensure shared package is built so types stay in sync
if [ ! -d "./shared/dist" ]; then
  echo "Building shared package first..."
  pnpm --filter spotify-shared build
fi

echo "Running Spotify sync locally..."
echo "Database: $DATABASE_PATH"
echo ""

exec pnpm --filter spotify-sync dev
