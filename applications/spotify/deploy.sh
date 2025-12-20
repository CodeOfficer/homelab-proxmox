#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$SCRIPT_DIR"

NAMESPACE="spotify"

echo "Deploying Spotify sync + MCP server..."

# 1. Create namespace
echo "Creating namespace..."
kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

# 2. Create secrets
echo "Creating secrets..."
if [[ -z "${SPOTIFY_CLIENT_ID:-}" ]] || [[ -z "${SPOTIFY_CLIENT_SECRET:-}" ]]; then
  echo "ERROR: Missing Spotify credentials"
  echo "Set in .envrc: SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_DB_ENCRYPTION_KEY"
  exit 1
fi

kubectl create secret generic spotify-credentials \
  --namespace "$NAMESPACE" \
  --from-literal=client-id="$SPOTIFY_CLIENT_ID" \
  --from-literal=client-secret="$SPOTIFY_CLIENT_SECRET" \
  --from-literal=encryption-key="$SPOTIFY_DB_ENCRYPTION_KEY" \
  --from-literal=redirect-uri="https://spotify.codeofficer.com/auth/callback" \
  --dry-run=client -o yaml | kubectl apply -f -

# 3. Deploy PVC
echo "Creating PersistentVolumeClaim..."
kubectl apply -f k8s/pvc.yaml

# 4. Deploy web UI
echo "Deploying web UI..."
kubectl apply -f k8s/web-deployment.yaml
kubectl apply -f k8s/web-service.yaml
kubectl apply -f k8s/web-ingress.yaml

# TODO: Deploy MCP server (not built yet)
# echo "Deploying MCP server..."
# kubectl apply -f k8s/mcp-deployment.yaml
# kubectl apply -f k8s/mcp-service.yaml
# kubectl apply -f k8s/mcp-ingress.yaml

# TODO: Deploy backup CronJob (after sync job is built)
# echo "Deploying backup CronJob..."
# kubectl apply -f k8s/backup-cronjob.yaml

# 5. Wait for rollout
echo "Waiting for deployments..."
kubectl rollout status deployment/spotify-web -n "$NAMESPACE" --timeout=5m

echo ""
echo "================================================"
echo "Spotify Web UI deployed!"
echo "================================================"
echo ""
echo "Web UI: https://spotify.codeofficer.com"
echo ""
echo "Next steps:"
echo "1. Visit https://spotify.codeofficer.com"
echo "2. Click 'Connect with Spotify' to authorize OAuth"
echo "3. Dashboard will show connected status"
echo ""
echo "TODO: Build and deploy sync job + MCP server"
echo ""
