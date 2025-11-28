# Architecture

Design decisions and conventions for the homelab infrastructure.

## Infrastructure Stack

- **Packer**: Creates VM templates from Ubuntu Server ISO
- **Terraform**: Provisions VMs from template, manages state
- **K3s**: Installed via official script (https://get.k3s.io)
- **FluxCD**: GitOps for application deployments (future)

## K3s Cluster Design

- 2 server nodes (control plane) on pve-02, pve-03
- 1 agent node (GPU worker) on pve-01
- Embedded etcd for HA
- MetalLB for LoadBalancer services

## Network Design

- VLAN 11 (10.20.11.0/24) for VMs
- Static IPs via cloud-init
- UDM Pro as DNS/gateway

See `NETWORK.md` for full IP allocation.

## Storage Convention

**K3s StorageClass selection:**
- `local-path`: Databases (PostgreSQL, Redis) - fast I/O, backup to Synology
- `nfs-client`: App data (models, uploads, media) - persistence across node failures
- NEVER use `emptyDir` for data that grows unbounded or must survive restarts

**Backup strategy:**
- PostgreSQL: pg_dump CronJob → Synology 10.20.11.10 (`/volume1/k3s-backups/postgresql/`)
- App data on NFS: UNAS RAID 5 provides redundancy

**NFS shares (isolated for security):**
- `VMStorage`: Proxmox only (backups, images, templates) - IPs 10.20.11.11-13
- `K3sStorage`: K3s only (app data) - IPs 10.20.11.80, 81, 85
- PVC path pattern: `{namespace}-{pvc-name}/`

## Ingress Convention

All ingresses must use TLS with HTTP→HTTPS redirect:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-app
  namespace: my-app
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    traefik.ingress.kubernetes.io/router.middlewares: default-redirect-https@kubernetescrd
spec:
  ingressClassName: traefik
  tls:
    - hosts:
        - myapp.codeofficer.com
      secretName: my-app-tls
  rules:
    - host: myapp.codeofficer.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: my-app
                port:
                  number: 8080
```

**Required components:**
- `cert-manager.io/cluster-issuer: letsencrypt-prod` - auto-issue Let's Encrypt cert
- `traefik...router.middlewares: default-redirect-https@kubernetescrd` - HTTP→HTTPS redirect
- `tls.secretName` - where cert is stored

**Middleware:** `applications/traefik/middleware.yaml` (deployed once)

## Terminology

- Always refer to K3s (not K8s) when discussing this cluster
