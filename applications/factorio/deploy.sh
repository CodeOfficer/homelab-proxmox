#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NAMESPACE="factorio"
RELEASE="factorio"
CHART_REPO="https://sqljames.github.io/factorio-server-charts"
SECRETS_DIR="${SCRIPT_DIR}/../../.secrets"
RCON_PASSWORD_FILE="${SECRETS_DIR}/factorio-rcon-password"

cd "$SCRIPT_DIR"

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

# Pre-create PVCs so restore job can run before Helm install
echo "Creating PVCs for restore..."
helm template "$RELEASE" factorio/factorio-server-charts \
    --namespace "$NAMESPACE" \
    --values values.yaml \
    | grep -A 20 "kind: PersistentVolumeClaim" \
    | kubectl apply -f - 2>/dev/null || true

# Run restore job if backup exists (idempotent - skips if saves exist)
if [ -f "restore-job.yaml" ]; then
    echo "Running restore job..."
    # Delete any previous restore job
    kubectl delete job factorio-restore -n "$NAMESPACE" --ignore-not-found=true
    kubectl apply -f restore-job.yaml
    echo "Waiting for restore to complete..."
    kubectl wait --for=condition=complete job/factorio-restore -n "$NAMESPACE" --timeout=300s || {
        echo "Restore job failed or timed out - checking logs:"
        kubectl logs -n "$NAMESPACE" job/factorio-restore || true
        exit 1
    }
    echo "Restore job completed"
fi

echo "Deploying Factorio via Helm..."
helm upgrade --install "$RELEASE" factorio/factorio-server-charts \
    --namespace "$NAMESPACE" \
    --values values.yaml \
    --wait \
    --timeout 10m

# Deploy backup CronJob
if [ -f "backup-cronjob.yaml" ]; then
    echo "Deploying backup CronJob..."
    kubectl apply -f backup-cronjob.yaml
fi

echo ""
echo "================================================"
echo "Factorio deployed!"
echo "================================================"
echo ""

# Get service IP
LB_IP=$(kubectl get svc -n "$NAMESPACE" "${RELEASE}-factorio-server-charts" -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "pending")
echo "Game Server: ${LB_IP}:34197 (UDP)"
echo "RCON Password: $RCON_PASSWORD"
echo ""
echo "Connect via Factorio multiplayer -> Connect to address -> ${LB_IP}:34197"
echo ""
echo "Manual restore options:"
echo "  make factorio-restore-import  # From game-imports/homelab.zip"
echo "  make factorio-restore-latest  # From backups/latest.zip"
