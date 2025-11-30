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

# Telegram alerting (optional - skip if not configured)
TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID:-}"
TELEGRAM_CONFIGURED="false"
if [[ -n "$TELEGRAM_BOT_TOKEN" && -n "$TELEGRAM_CHAT_ID" ]]; then
    TELEGRAM_CONFIGURED="true"
    echo "Telegram alerting: enabled"
else
    echo "Telegram alerting: disabled (set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .envrc)"
fi

echo "Adding Prometheus Community Helm repo..."
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts 2>/dev/null || true
helm repo update prometheus-community

echo "Creating namespace..."
kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

echo "Deploying kube-prometheus-stack..."
HELM_ARGS=(
    upgrade --install "$RELEASE" prometheus-community/kube-prometheus-stack
    --namespace "$NAMESPACE"
    --values "${SCRIPT_DIR}/values.yaml"
    --set grafana.adminPassword="${GRAFANA_ADMIN_PASSWORD}"
    --wait
    --timeout 10m
)

# Inject Telegram credentials if configured
if [[ "$TELEGRAM_CONFIGURED" == "true" ]]; then
    HELM_ARGS+=(
        --set "alertmanager.config.receivers[1].telegram_configs[0].bot_token=${TELEGRAM_BOT_TOKEN}"
        --set "alertmanager.config.receivers[1].telegram_configs[0].chat_id=${TELEGRAM_CHAT_ID}"
    )
fi

helm "${HELM_ARGS[@]}"

# Sync password to Grafana database (Helm --set doesn't update existing installs)
echo "Syncing admin password..."
kubectl exec -n "$NAMESPACE" deployment/monitoring-grafana -c grafana -- \
    grafana cli admin reset-admin-password "${GRAFANA_ADMIN_PASSWORD}" 2>/dev/null || true

echo "Applying Grafana ingress..."
kubectl apply -f "${SCRIPT_DIR}/ingress.yaml"

echo "Deploying DCGM exporter for GPU metrics..."
kubectl apply -f "${SCRIPT_DIR}/dcgm-exporter.yaml"

echo "Deploying custom dashboards..."
kubectl apply -f "${SCRIPT_DIR}/dashboards/"

echo "Applying alert rules..."
kubectl apply -f "${SCRIPT_DIR}/alerts.yaml"

echo ""
echo "Monitoring stack deployed!"
echo ""
echo "Grafana URL: https://grafana.codeofficer.com"
echo "Username: admin"
echo "Password: (saved to ${ADMIN_PASSWORD_FILE})"
echo ""
echo "Wait for TLS certificate to be issued (~1-2 min)"
echo "Check cert status: kubectl get certificate -n monitoring"
