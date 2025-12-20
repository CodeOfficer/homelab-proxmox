#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$SCRIPT_DIR"

NAMESPACE="spotify"
K3S_NODES=("10.20.11.80" "10.20.11.81" "10.20.11.85")

echo "Deploying Spotify Web UI..."

# 0. Build and load Docker image into K3s nodes
echo "Building Docker image for linux/amd64..."
docker build --no-cache --platform linux/amd64 -t spotify-web:latest -f web/Dockerfile .

echo "Loading image into K3s nodes..."
docker save spotify-web:latest -o /tmp/spotify-web.tar
SSH_KEY="${HOME}/.ssh/id_ed25519"
SSH_OPTS="-i ${SSH_KEY} -o IdentitiesOnly=yes -o StrictHostKeyChecking=no"
for node in "${K3S_NODES[@]}"; do
    echo "  -> $node"
    scp ${SSH_OPTS} /tmp/spotify-web.tar ubuntu@$node:/tmp/
    ssh ${SSH_OPTS} ubuntu@$node "sudo k3s ctr images import /tmp/spotify-web.tar && sudo rm /tmp/spotify-web.tar"
done
rm /tmp/spotify-web.tar
echo "✓ Image loaded on all nodes"

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
