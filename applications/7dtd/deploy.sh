#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$SCRIPT_DIR"

NAMESPACE="sdtd"
RELEASE="sdtd"
CHART_REPO="https://thelande.github.io/7dtd"
SECRETS_DIR="$REPO_ROOT/.secrets"
TELNET_PASSWORD_FILE="$SECRETS_DIR/7dtd-telnet-password"

echo "Deploying 7 Days to Die..."

# Create namespace
kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

# Generate telnet password if not exists (idempotent)
if [ ! -f "$TELNET_PASSWORD_FILE" ]; then
  echo "Generating telnet password..."
  mkdir -p "$SECRETS_DIR"
  openssl rand -base64 16 | tr -d '/+=' | head -c 16 > "$TELNET_PASSWORD_FILE"
  chmod 600 "$TELNET_PASSWORD_FILE"
  echo "Password saved to $TELNET_PASSWORD_FILE"
fi

# Create/update telnet secret
echo "Creating telnet secret..."
kubectl create secret generic sdtd-telnet \
  --namespace "$NAMESPACE" \
  --from-file=password="$TELNET_PASSWORD_FILE" \
  --dry-run=client -o yaml | kubectl apply -f -

# Add Helm repo if not exists
helm repo add 7dtd "$CHART_REPO" 2>/dev/null || true
helm repo update 7dtd

# Install/upgrade
helm upgrade --install "$RELEASE" 7dtd/7dtd \
  --namespace "$NAMESPACE" \
  --values values.yaml \
  --wait \
  --timeout 60m

# Deploy auto-save CronJob (every 5 min)
echo "Deploying auto-save CronJob..."
kubectl apply -f auto-save.yaml

# Deploy backup sync CronJob (optional - syncs to NFS)
if [ -f backup-sync.yaml ]; then
  echo "Deploying backup sync CronJob..."
  kubectl apply -f backup-sync.yaml
fi

echo ""
echo "================================================"
echo "7 Days to Die deployed!"
echo "================================================"
echo ""
echo "Game Server: $(kubectl get svc -n sdtd sdtd-7dtd-game -o jsonpath='{.status.loadBalancer.ingress[0].ip}'):26900"
echo ""
echo "First startup downloads ~12GB via Steam."
echo "This takes 30-45 minutes. Check progress with:"
echo ""
echo "  kubectl logs -n sdtd -l app.kubernetes.io/name=7dtd -f"
echo ""
