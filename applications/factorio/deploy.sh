#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NAMESPACE="factorio"
RELEASE="factorio"
CHART_REPO="https://sqljames.github.io/factorio-server-charts"
SECRETS_DIR="${SCRIPT_DIR}/../../.secrets"
RCON_PASSWORD_FILE="${SECRETS_DIR}/factorio-rcon-password"

# Ensure secrets directory exists
mkdir -p "$SECRETS_DIR"

# Generate RCON password idempotently
if [[ ! -f "$RCON_PASSWORD_FILE" ]]; then
    echo "Generating RCON password..."
    openssl rand -base64 16 | tr -d '=' > "$RCON_PASSWORD_FILE"
    chmod 600 "$RCON_PASSWORD_FILE"
fi
RCON_PASSWORD=$(cat "$RCON_PASSWORD_FILE")

echo "Creating namespace..."
kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

echo "Creating RCON secret..."
kubectl create secret generic factorio-rcon \
    --namespace "$NAMESPACE" \
    --from-literal=rconpw="$RCON_PASSWORD" \
    --dry-run=client -o yaml | kubectl apply -f -

echo "Adding Helm repo..."
helm repo add factorio "$CHART_REPO" 2>/dev/null || true
helm repo update factorio

echo "Deploying Factorio..."
helm upgrade --install "$RELEASE" factorio/factorio-server-charts \
    --namespace "$NAMESPACE" \
    --values "${SCRIPT_DIR}/values.yaml" \
    --wait \
    --timeout 10m

echo ""
echo "Factorio deployed!"
echo ""

# Get service IP
LB_IP=$(kubectl get svc -n "$NAMESPACE" "${RELEASE}-factorio-server-charts" -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "pending")
echo "Game Server: ${LB_IP}:34197 (UDP)"
echo "RCON Password: $RCON_PASSWORD"
echo ""
echo "Connect via Factorio multiplayer -> Connect to address -> ${LB_IP}:34197"
