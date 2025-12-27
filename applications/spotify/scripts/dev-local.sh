#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$SCRIPT_DIR/.."
cd "$REPO_ROOT"

# HTTPS cert paths
export HTTPS_KEY_PATH="${HTTPS_KEY_PATH:-$REPO_ROOT/.certs/localhost-key.pem}"
export HTTPS_CERT_PATH="${HTTPS_CERT_PATH:-$REPO_ROOT/.certs/localhost.pem}"

# Database path (absolute to ensure consistency)
export SPOTIFY_DB_PATH="${SPOTIFY_DB_PATH:-$REPO_ROOT/.local/spotify.db}"

# Check for certs
if [[ ! -f "$HTTPS_KEY_PATH" || ! -f "$HTTPS_CERT_PATH" ]]; then
  echo "Error: HTTPS dev certs not found."
  echo "Run: pnpm dev:cert"
  exit 1
fi

# Check for required Spotify env vars (should be set via .envrc in parent dir)
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

# Local dev configuration
export PORT="${PORT:-3000}"
export HOST="${HOST:-127.0.0.1}"
export SPOTIFY_REDIRECT_URI="${SPOTIFY_REDIRECT_URI:-https://127.0.0.1:3000/auth/callback}"
export APP_BASE_URL="${APP_BASE_URL:-https://127.0.0.1:3000}"
export SPOTIFY_DB_PATH="${SPOTIFY_DB_PATH:-./.local/spotify.db}"

echo "Starting Spotify Sync PRO (local dev)..."
echo "  Database: $SPOTIFY_DB_PATH"
echo "  Server: https://$HOST:$PORT"
echo "  Redirect URI: $SPOTIFY_REDIRECT_URI"
echo ""

# Build UI if needed (check for build directory)
if [[ ! -d "$REPO_ROOT/apps/ui/build" ]]; then
  echo "Building UI..."
  pnpm --filter @spotify/ui build
  echo ""
fi

# Run API in dev mode with tsx watch (serves static UI files)
exec pnpm --filter @spotify/api dev
