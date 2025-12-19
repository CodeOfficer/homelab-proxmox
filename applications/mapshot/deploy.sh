#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NAMESPACE="mapshot"

# Verify required env vars
: "${FACTORIO_USERNAME:?Set FACTORIO_USERNAME in .envrc}"
: "${FACTORIO_TOKEN:?Set FACTORIO_TOKEN in .envrc}"

echo "Creating namespaces..."
kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -
kubectl create namespace factorio --dry-run=client -o yaml | kubectl apply -f -

echo "Creating Factorio credentials secret..."
kubectl create secret generic factorio-credentials \
    --namespace "$NAMESPACE" \
    --from-literal=username="${FACTORIO_USERNAME}" \
    --from-literal=token="${FACTORIO_TOKEN}" \
    --dry-run=client -o yaml | kubectl apply -f -

# Optional: Telegram notification for render completions
if [[ -n "${TELEGRAM_BOT_TOKEN:-}" && -n "${TELEGRAM_CHAT_ID:-}" ]]; then
    echo "Creating Telegram credentials secret..."
    kubectl create secret generic telegram-credentials \
        --namespace "$NAMESPACE" \
        --from-literal=bot-token="${TELEGRAM_BOT_TOKEN}" \
        --from-literal=chat-id="${TELEGRAM_CHAT_ID}" \
        --dry-run=client -o yaml | kubectl apply -f -
    echo "Telegram notifications: enabled"
else
    echo "Telegram notifications: disabled (set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .envrc)"
fi

echo "Applying RBAC..."
kubectl apply -f "${SCRIPT_DIR}/rbac.yaml"

echo "Applying PVC..."
kubectl apply -f "${SCRIPT_DIR}/pvc.yaml"

echo "Deploying mapshot server..."
kubectl apply -f "${SCRIPT_DIR}/server.yaml"

# Note: Manual-only GPU rendering - no automatic CronJob
# Trigger renders with: make mapshot-render

echo "Applying Ingress..."
kubectl apply -f "${SCRIPT_DIR}/ingress.yaml"

echo ""
echo "============================================"
echo "Mapshot deployed!"
echo "============================================"
echo ""
echo "URL: https://mapshot.codeofficer.com"
echo ""
echo "Wait for TLS certificate to be issued (~1-2 min)"
echo "Check cert status: kubectl get certificate -n mapshot"
echo ""
echo "Trigger manual GPU render:"
echo "  make mapshot-render"
echo ""
echo "Check GPU availability:"
echo "  make mapshot-check-gpu"
echo ""
echo "View render logs:"
echo "  make mapshot-logs"
echo ""
