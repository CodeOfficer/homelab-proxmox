#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$SCRIPT_DIR/.."
cd "$REPO_ROOT"

# Check for required Spotify env vars
missing=()
if [[ -z "${SPOTIFY_CLIENT_ID:-}" ]]; then
  missing+=("SPOTIFY_CLIENT_ID")
fi
if [[ -z "${SPOTIFY_CLIENT_SECRET:-}" ]]; then
  missing+=("SPOTIFY_CLIENT_SECRET")
fi

if (( ${#missing[@]} > 0 )); then
  echo "Error: Missing env vars: ${missing[*]}"
  echo "Set them in your shell or via direnv."
  exit 1
fi

# Ensure .local directory exists
mkdir -p "$REPO_ROOT/.local"

# Set paths (absolute to ensure consistency across workspaces)
export SPOTIFY_DB_PATH="${SPOTIFY_DB_PATH:-$REPO_ROOT/.local/spotify.db}"
export SPOTIFY_SYNC_DUMP_PATH="${SPOTIFY_SYNC_DUMP_PATH:-$REPO_ROOT/.local/spotify-sync-$(date +%Y%m%d-%H%M%S).jsonl}"

# Backup credentials before sync (preserve auth across database rebuilds)
CREDS_BACKUP="$REPO_ROOT/.local/.credentials-backup.sql"
if [[ -f "$SPOTIFY_DB_PATH" ]]; then
  sqlite3 "$SPOTIFY_DB_PATH" ".dump spotify_credentials" > "$CREDS_BACKUP" 2>/dev/null || true
fi

if [[ "${SPOTIFY_SYNC_FORCE:-}" == "1" ]]; then
  echo "Force sync requested (SPOTIFY_SYNC_FORCE=1)"
fi

echo "Starting fresh Spotify sync..."
echo "  Database: $SPOTIFY_DB_PATH"
echo "  Cache: $SPOTIFY_SYNC_DUMP_PATH"
echo ""

# Run sync (with tsx for dev)
pnpm --filter @spotify/sync dev
sync_exit=$?

# Restore credentials if sync created a new database without them
if [[ -f "$CREDS_BACKUP" && -s "$CREDS_BACKUP" ]]; then
  creds_exist=$(sqlite3 "$SPOTIFY_DB_PATH" "SELECT COUNT(*) FROM spotify_credentials;" 2>/dev/null || echo "0")
  if [[ "$creds_exist" == "0" ]]; then
    echo ""
    echo "Restoring Spotify credentials..."
    sqlite3 "$SPOTIFY_DB_PATH" < "$CREDS_BACKUP"
    echo "  Credentials restored."
  fi
fi

exit $sync_exit
