# Architecture

Design decisions and conventions for the homelab infrastructure.

## Infrastructure Stack

- **Packer**: Creates VM templates from Ubuntu Server ISO
- **Terraform**: Provisions VMs from template, manages state
- **K3s**: Installed via official script (https://get.k3s.io)
- **FluxCD**: GitOps for application deployments (future)

## K3s Cluster Design

- 3 server nodes (control plane) with embedded etcd for true HA
  - k3s-cp-01 (10.20.11.80) on pve-02 - Init server, general workloads
  - k3s-cp-02 (10.20.11.81) on pve-03 - General workloads
  - k3s-gpu-01 (10.20.11.85) on pve-01 - GPU workloads only (tainted)
- Survives single node failure (etcd quorum: 2 of 3)
- MetalLB for LoadBalancer services (10.20.11.200-210)

## K3s Cluster Initialization

The xanmanning.k3s Ansible role selects the first host in the `server` group as the init server (cluster bootstrap node).

**Selection criteria:**
- Inventory file order (not alphabetical)
- First host in `server` group with `k3s_control_node: true`
- `k3s_registration_address` must match init server IP

**Why order matters:**
- Init server generates the cluster token
- Joining nodes connect to `k3s_registration_address:6443`
- Misalignment causes "dial tcp X.X.X.X:6443: connection refused" errors

**Current order:** k3s-cp-01 (init) → k3s-cp-02 → k3s-gpu-01

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
