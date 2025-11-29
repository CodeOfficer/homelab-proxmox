#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NAMESPACE="monitoring"
RELEASE="monitoring"
SECRETS_DIR="${SCRIPT_DIR}/../../.secrets"
ADMIN_PASSWORD_FILE="${SECRETS_DIR}/grafana-admin-password"

# Ensure secrets directory exists
mkdir -p "$SECRETS_DIR"

# Generate Grafana admin password idempotently
if [[ ! -f "$ADMIN_PASSWORD_FILE" ]]; then
    echo "Generating Grafana admin password..."
    openssl rand -base64 32 > "$ADMIN_PASSWORD_FILE"
    chmod 600 "$ADMIN_PASSWORD_FILE"
fi
GRAFANA_ADMIN_PASSWORD=$(cat "$ADMIN_PASSWORD_FILE")

echo "Adding Prometheus Community Helm repo..."
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts 2>/dev/null || true
helm repo update prometheus-community

echo "Creating namespace..."
kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

echo "Deploying kube-prometheus-stack..."
helm upgrade --install "$RELEASE" prometheus-community/kube-prometheus-stack \
    --namespace "$NAMESPACE" \
    --values "${SCRIPT_DIR}/values.yaml" \
    --set grafana.adminPassword="${GRAFANA_ADMIN_PASSWORD}" \
    --wait \
    --timeout 10m

echo "Applying Grafana ingress..."
kubectl apply -f "${SCRIPT_DIR}/ingress.yaml"

echo "Deploying DCGM exporter for GPU metrics..."
kubectl apply -f "${SCRIPT_DIR}/dcgm-exporter.yaml"

echo ""
echo "Monitoring stack deployed!"
echo ""
echo "Grafana URL: https://grafana.codeofficer.com"
echo "Username: admin"
echo "Password: (saved to ${ADMIN_PASSWORD_FILE})"
echo ""
echo "Wait for TLS certificate to be issued (~1-2 min)"
echo "Check cert status: kubectl get certificate -n monitoring"
