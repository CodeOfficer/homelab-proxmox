# cert-manager

## Installation Order

1. Install cert-manager CRDs and controllers (from official manifest)
2. Create Cloudflare API token secret
3. Apply ClusterIssuers

## Setup

```bash
# 1. Install cert-manager (v1.17.1)
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.17.1/cert-manager.yaml

# 2. Wait for cert-manager to be ready
kubectl wait --for=condition=Available deployment --all -n cert-manager --timeout=120s

# 3. Create secret (copy and edit secret.yaml.example first)
cp secret.yaml.example secret.yaml
# Edit secret.yaml with your Cloudflare API token
kubectl apply -f secret.yaml

# 4. Apply ClusterIssuers
kubectl apply -f clusterissuer.yaml
```

## Cloudflare API Token

Create a token at https://dash.cloudflare.com/profile/api-tokens with:
- Zone:DNS:Edit permission
- Zone:Zone:Read permission
- Include specific zone: your domain
