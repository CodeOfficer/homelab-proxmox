#!/usr/bin/env bash
# Deploy Grafana Loki (modern chart) + Promtail for centralized log aggregation
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NAMESPACE="loki"

echo "Adding Grafana Helm repo..."
helm repo add grafana https://grafana.github.io/helm-charts 2>/dev/null || true
helm repo update grafana

echo "Creating namespace..."
kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

# Uninstall old loki-stack if present
if helm status loki -n "$NAMESPACE" &>/dev/null; then
    echo "Removing old loki-stack..."
    helm uninstall loki -n "$NAMESPACE" --wait
    # Wait for PVC to be released
    sleep 5
fi

echo "Deploying Loki (modern chart)..."
helm upgrade --install loki grafana/loki \
    --namespace "$NAMESPACE" \
    --values "${SCRIPT_DIR}/values.yaml" \
    --wait \
    --timeout 5m

echo "Deploying Promtail..."
helm upgrade --install promtail grafana/promtail \
    --namespace "$NAMESPACE" \
    --set "config.clients[0].url=http://loki:3100/loki/api/v1/push" \
    --set "tolerations[0].key=node-role.kubernetes.io/control-plane" \
    --set "tolerations[0].operator=Exists" \
    --set "tolerations[0].effect=NoSchedule" \
    --wait \
    --timeout 3m

echo "Configuring Grafana datasource..."
kubectl apply -f "${SCRIPT_DIR}/grafana-datasource.yaml"

echo "Deploying CronJob logs dashboard..."
kubectl apply -f "${SCRIPT_DIR}/cronjob-logs-dashboard.yaml"

echo ""
echo "=== Loki Stack deployed! ==="
echo "Loki endpoint: http://loki.loki.svc.cluster.local:3100"
echo ""
echo "Verify with:"
echo "  kubectl get pods -n loki"
echo ""
echo "Query logs in Grafana:"
echo "  Explore -> Select 'Loki' datasource"
echo "  Query: {namespace=\"factorio\"}"
