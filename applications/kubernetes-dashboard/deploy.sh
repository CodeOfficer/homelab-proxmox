#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$SCRIPT_DIR"

NAMESPACE="kubernetes-dashboard"
RELEASE="kubernetes-dashboard"
CHART_REPO="https://kubernetes.github.io/dashboard/"

echo "Deploying Kubernetes Dashboard..."

# Create namespace
kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

# Add Helm repo
echo "Adding Kubernetes Dashboard Helm repo..."
helm repo add kubernetes-dashboard "$CHART_REPO" 2>/dev/null || true
helm repo update kubernetes-dashboard

# Install/upgrade dashboard
echo "Installing Kubernetes Dashboard..."
helm upgrade --install "$RELEASE" kubernetes-dashboard/kubernetes-dashboard \
  --namespace "$NAMESPACE" \
  --values values.yaml \
  --wait \
  --timeout 5m

# Deploy admin user and RBAC
echo "Creating admin user..."
kubectl apply -f admin-user.yaml

# Create login token (valid 1 year)
echo "Creating login token (valid 1 year)..."
mkdir -p "$REPO_ROOT/.secrets"
kubectl -n "$NAMESPACE" create token admin-user --duration=8760h > "$REPO_ROOT/.secrets/k8s-dashboard-token"

# Deploy auth middleware with token injection
echo "Creating auth middleware..."
cat > /tmp/dashboard-auth-middleware.yaml <<MIDDLEWARE
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: dashboard-auth-inject
  namespace: $NAMESPACE
spec:
  headers:
    customRequestHeaders:
      Authorization: "Bearer $(cat "$REPO_ROOT/.secrets/k8s-dashboard-token")"
MIDDLEWARE
kubectl apply -f /tmp/dashboard-auth-middleware.yaml
rm -f /tmp/dashboard-auth-middleware.yaml

# Deploy Certificate (Let's Encrypt via cert-manager)
echo "Creating TLS Certificate..."
kubectl apply -f certificate.yaml

# Deploy ServersTransport (skip TLS verify for kong-proxy self-signed cert)
echo "Creating ServersTransport..."
kubectl apply -f serverstransport.yaml

# Deploy IngressRoute (Traefik CRD)
echo "Creating IngressRoute..."
kubectl apply -f ingressroute.yaml

echo ""
echo "================================================"
echo "Kubernetes Dashboard deployed!"
echo "================================================"
echo ""
echo "Dashboard URL: https://k8s.codeofficer.com"
echo ""
echo "Wait for TLS certificate (~1-2 min):"
echo "  kubectl get certificate -n $NAMESPACE"
echo ""
echo "✓ Token auto-injection enabled - no login required!"
echo "✓ Token saved to: .secrets/k8s-dashboard-token (expires in 1 year)"
echo ""
echo "To regenerate token manually (if expired):"
echo "  ./applications/kubernetes-dashboard/deploy.sh"
echo ""
