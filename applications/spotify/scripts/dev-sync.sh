#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

max_age_seconds="${SPOTIFY_SYNC_REPLAY_MAX_AGE_SECONDS:-86400}"
now="$(date +%s)"
latest_dump="$(ls -t /tmp/spotify-sync-*.jsonl 2>/dev/null | head -n 1 || true)"

if [[ -n "$latest_dump" ]]; then
  mtime="$(stat -f %m "$latest_dump")"
  age=$((now - mtime))
  if (( age <= max_age_seconds )); then
    echo "Recent dump found (${latest_dump}). Replaying into local DB..."
    export SPOTIFY_SYNC_DUMP_PATH="$latest_dump"
    exec ./scripts/dev-sync-replay.sh
  fi
fi

echo "No recent dump found. Running full sync..."
exec ./scripts/dev-sync-local.sh
