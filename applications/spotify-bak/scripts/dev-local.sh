#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

export DATABASE_PATH="${DATABASE_PATH:-/tmp/spotify-dev.db}"
export PORT="${PORT:-3000}"
export HOST="${HOST:-127.0.0.1}"
export HTTPS_KEY_PATH="${HTTPS_KEY_PATH:-$SCRIPT_DIR/../.certs/localhost-key.pem}"
export HTTPS_CERT_PATH="${HTTPS_CERT_PATH:-$SCRIPT_DIR/../.certs/localhost.pem}"

if [[ ! -f "$HTTPS_KEY_PATH" || ! -f "$HTTPS_CERT_PATH" ]]; then
  echo "Error: HTTPS dev certs not found."
  echo "Run: pnpm dev:cert"
  exit 1
fi

export SPOTIFY_REDIRECT_URI="${SPOTIFY_REDIRECT_URI:-https://127.0.0.1:3000/auth/callback}"

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

echo "Starting Spotify web UI (local dev)..."
echo "Database: $DATABASE_PATH"
echo "Port: $PORT"
echo "Redirect URI: $SPOTIFY_REDIRECT_URI"
echo ""

exec ./web/dev.sh
