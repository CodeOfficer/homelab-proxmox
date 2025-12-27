#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$SCRIPT_DIR/.."
cd "$REPO_ROOT"

# Cache TTL in seconds (default 24 hours)
max_age_seconds="${SPOTIFY_SYNC_REPLAY_MAX_AGE_SECONDS:-86400}"
now="$(date +%s)"

# Find the most recent dump file in .local/
latest_dump="$(ls -t .local/spotify-sync-*.jsonl 2>/dev/null | head -n 1 || true)"

if [[ -n "$latest_dump" ]]; then
  # Get file modification time
  if [[ "$(uname)" == "Darwin" ]]; then
    mtime="$(stat -f %m "$latest_dump")"
  else
    mtime="$(stat -c %Y "$latest_dump")"
  fi

  age=$((now - mtime))

  if (( age <= max_age_seconds )); then
    age_hours=$((age / 3600))
    echo "Found recent cache (${age_hours}h old): $latest_dump"
    echo "Restoring from cache (use dev:sync:force for fresh sync)"
    echo ""
    # Export absolute path so restore worker can find it
    export SPOTIFY_SYNC_DUMP_PATH="$REPO_ROOT/$latest_dump"
    exec bash "$SCRIPT_DIR/dev-sync-replay.sh"
  else
    echo "Cache expired (>24h old). Running fresh sync..."
  fi
else
  echo "No cache found. Running fresh sync..."
fi

exec bash "$SCRIPT_DIR/dev-sync-local.sh"
