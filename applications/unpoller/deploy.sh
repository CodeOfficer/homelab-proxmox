#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NAMESPACE="unpoller"
SECRETS_DIR="${SCRIPT_DIR}/../../.secrets"
CREDS_FILE="${SECRETS_DIR}/unpoller-credentials"

echo "=== UnPoller Deployment ==="
echo ""
echo "IMPORTANT: Before deploying, you must create a read-only user in UniFi:"
echo "  1. Go to UniFi Network > Settings > Admins"
echo "  2. Click 'Add Admin'"
echo "  3. Username: unpoller"
echo "  4. Role: 'View Only' (or 'Limited Admin' with view-only permissions)"
echo "  5. Save the password"
echo ""

# Check for credentials
if [[ ! -f "$CREDS_FILE" ]]; then
    echo "Credentials file not found: $CREDS_FILE"
    echo ""
    echo "Create it with:"
    echo "  mkdir -p $SECRETS_DIR"
    echo "  cat > $CREDS_FILE << 'EOF'"
    echo "UNIFI_USER=unpoller"
    echo "UNIFI_PASS=your-password-here"
    echo "EOF"
    echo "  chmod 600 $CREDS_FILE"
    echo ""
    exit 1
fi

# Load credentials
source "$CREDS_FILE"

if [[ -z "${UNIFI_USER:-}" ]] || [[ -z "${UNIFI_PASS:-}" ]]; then
    echo "ERROR: UNIFI_USER and UNIFI_PASS must be set in $CREDS_FILE"
    exit 1
fi

echo "Creating namespace..."
kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

echo "Creating credentials secret..."
kubectl create secret generic unpoller-credentials \
    --namespace "$NAMESPACE" \
    --from-literal=UNIFI_USER="$UNIFI_USER" \
    --from-literal=UNIFI_PASS="$UNIFI_PASS" \
    --dry-run=client -o yaml | kubectl apply -f -

echo "Deploying UnPoller..."
# Apply deployment (skip the secret since we created it above)
kubectl apply -f "${SCRIPT_DIR}/deployment.yaml" --selector='app=unpoller'
kubectl apply -f "${SCRIPT_DIR}/deployment.yaml"

echo "Deploying Grafana dashboards..."
kubectl apply -f "${SCRIPT_DIR}/dashboards/"

echo ""
echo "Waiting for UnPoller to be ready..."
kubectl rollout status deployment/unpoller -n "$NAMESPACE" --timeout=120s

echo ""
echo "=== UnPoller Deployed ==="
echo ""
echo "Verify metrics are being collected:"
echo "  kubectl port-forward -n unpoller svc/unpoller 9130:9130"
echo "  curl http://localhost:9130/metrics | grep unifi"
echo ""
echo "Grafana dashboards available (may take 1-2 minutes to appear):"
echo "  - UniFi Network Overview"
echo "  - UniFi Clients"
echo "  - UniFi Switch Ports"
echo ""
