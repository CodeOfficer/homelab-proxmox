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

echo "Applying RBAC..."
kubectl apply -f "${SCRIPT_DIR}/rbac.yaml"

echo "Applying PVC..."
kubectl apply -f "${SCRIPT_DIR}/pvc.yaml"

echo "Deploying mapshot server..."
kubectl apply -f "${SCRIPT_DIR}/server.yaml"

echo "Creating render CronJob..."
kubectl apply -f "${SCRIPT_DIR}/cronjob.yaml"

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
echo "Trigger manual render:"
echo "  make mapshot-render"
echo "  OR"
echo "  kubectl create job --from=cronjob/mapshot-render -n mapshot mapshot-manual-\$(date +%s)"
echo ""
echo "View render logs:"
echo "  kubectl logs -n mapshot -l job-name --tail=100 -f"
echo ""
