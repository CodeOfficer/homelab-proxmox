#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$SCRIPT_DIR"

NAMESPACE="spotify"
K3S_NODES=("10.20.11.80" "10.20.11.81" "10.20.11.85")

echo "Deploying Spotify services..."

SSH_KEY="${HOME}/.ssh/id_ed25519"
SSH_OPTS="-i ${SSH_KEY} -o IdentitiesOnly=yes -o StrictHostKeyChecking=no"

# Helper function to build and load image
load_image() {
    local name=$1
    local dockerfile=$2
    echo "Building $name for linux/amd64..."
    docker build --platform linux/amd64 -t ${name}:latest -f "$dockerfile" .

    echo "Loading $name into K3s nodes..."
    docker save ${name}:latest -o /tmp/${name}.tar
    for node in "${K3S_NODES[@]}"; do
        echo "  -> $node"
        scp ${SSH_OPTS} /tmp/${name}.tar ubuntu@$node:/tmp/
        ssh ${SSH_OPTS} ubuntu@$node "sudo k3s ctr images import /tmp/${name}.tar && sudo rm /tmp/${name}.tar"
    done
    rm /tmp/${name}.tar
    echo "✓ $name loaded on all nodes"
}

# 0. Build and load Docker images into K3s nodes
load_image "spotify-web" "web/Dockerfile"
load_image "spotify-mcp" "mcp/Dockerfile"

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

# Create ingress
cat <<EOF | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: spotify-web
  namespace: spotify
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    traefik.ingress.kubernetes.io/router.middlewares: default-redirect-https@kubernetescrd
spec:
  ingressClassName: traefik
  rules:
    - host: spotify.codeofficer.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: spotify-web
                port:
                  number: 3000
  tls:
    - hosts:
        - spotify.codeofficer.com
      secretName: spotify-web-tls
EOF

# 5. Deploy MCP server
echo "Deploying MCP server..."
kubectl apply -f k8s/mcp-deployment.yaml
kubectl apply -f k8s/mcp-service.yaml

# TODO: Deploy backup CronJob (after sync job is built)
# echo "Deploying backup CronJob..."
# kubectl apply -f k8s/backup-cronjob.yaml

# 6. Wait for rollout
echo "Waiting for deployments..."
kubectl rollout status deployment/spotify-web -n "$NAMESPACE" --timeout=5m
kubectl rollout status deployment/spotify-mcp -n "$NAMESPACE" --timeout=5m

echo ""
echo "================================================"
echo "Spotify services deployed!"
echo "================================================"
echo ""
echo "Web UI:     https://spotify.codeofficer.com"
echo "MCP Server: https://spotify-mcp.codeofficer.com"
echo ""
echo "For Claude Desktop, add to claude_desktop_config.json:"
echo '  "mcpServers": {'
echo '    "spotify": {'
echo '      "url": "https://spotify-mcp.codeofficer.com/sse"'
echo '    }'
echo '  }'
echo ""
