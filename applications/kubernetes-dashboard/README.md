# Kubernetes Dashboard

Web UI for cluster management with Let's Encrypt TLS.

## Access

**URL:** https://k8s.codeofficer.com

**Authentication:** Bearer Token (admin-user service account with cluster-admin role)

## Get Login Token

```bash
# View saved token
cat .secrets/k8s-dashboard-token

# Or generate new token (expires in 10 years)
kubectl -n kubernetes-dashboard create token admin-user --duration=87600h

# Or use make target
make k8s-dashboard-token
```

## Check Certificate Status

```bash
kubectl get certificate -n kubernetes-dashboard
kubectl describe certificate kubernetes-dashboard-tls -n kubernetes-dashboard
```

Wait 1-2 minutes after deployment for Let's Encrypt to issue the certificate.

## Architecture

- **Deployment:** Helm chart `kubernetes-dashboard/kubernetes-dashboard`
- **Routing:** Traefik IngressRoute with cert-manager (Let's Encrypt)
- **TLS Backend:** ServersTransport with `insecureSkipVerify` for kong-proxy's self-signed cert
- **RBAC:** `admin-user` ServiceAccount with `cluster-admin` ClusterRoleBinding
- **Components:**
  - `kubernetes-dashboard-web` - Frontend
  - `kubernetes-dashboard-api` - Backend API
  - `kubernetes-dashboard-auth` - Authentication
  - `kubernetes-dashboard-kong` - Proxy (HTTPS)
  - `kubernetes-dashboard-metrics-scraper` - Metrics collection

## Security Notes

- Token grants full cluster-admin access
- Token valid for 10 years (non-expiring in practice)
- Ingress enforces HTTPS with valid Let's Encrypt certificate
- Dashboard only accessible via Ingress (no NodePort/LoadBalancer)

## Troubleshooting

```bash
# Check pods
kubectl get pods -n kubernetes-dashboard

# Check ingress
kubectl get ingress -n kubernetes-dashboard

# View logs
kubectl logs -n kubernetes-dashboard -l app.kubernetes.io/name=kubernetes-dashboard

# Test backend directly (bypass Ingress)
kubectl -n kubernetes-dashboard port-forward svc/kubernetes-dashboard-kong-proxy 8443:443
# Open: https://localhost:8443
```
