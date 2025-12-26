#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CERT_DIR="$SCRIPT_DIR/../.certs"

if ! command -v mkcert >/dev/null 2>&1; then
  echo "Error: mkcert is not installed."
  echo "Install it first, then re-run this script."
  exit 1
fi

mkdir -p "$CERT_DIR"

mkcert -key-file "$CERT_DIR/localhost-key.pem" -cert-file "$CERT_DIR/localhost.pem" localhost 127.0.0.1 ::1

echo "Created dev certs in $CERT_DIR"
