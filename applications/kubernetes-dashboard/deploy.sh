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
echo "Get login token:"
echo "  kubectl -n $NAMESPACE create token admin-user"
echo ""
echo "Or create long-lived token secret:"
echo "  kubectl apply -f - <<EOF"
echo "  apiVersion: v1"
echo "  kind: Secret"
echo "  metadata:"
echo "    name: admin-user-token"
echo "    namespace: $NAMESPACE"
echo "    annotations:"
echo "      kubernetes.io/service-account.name: admin-user"
echo "  type: kubernetes.io/service-account-token"
echo "  EOF"
echo ""
echo "Then get token:"
echo "  kubectl -n $NAMESPACE get secret admin-user-token -o jsonpath='{.data.token}' | base64 -d"
echo ""
