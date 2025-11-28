# Claude Code Instructions for Homelab Proxmox Project

## Source of Truth

- `docs/HARDWARE.md` - Physical hardware specifications
- `docs/NETWORK.md` - Network architecture, VLANs, IP addressing
- `docs/SOFTWARE.md` - Software stack, versions
- `docs/LINKS.md` - Reference links
- `CLAUDE.md` (this file) - Project status, workflow, architecture

**Rules:** Never duplicate docs/ content here. Update docs/ when info changes. Read before writing.

## Repository Structure

```
homelab-proxmox/
├── docs/                     # Reference specs
├── infrastructure/
│   ├── packer/              # VM template creation
│   ├── terraform/           # VM provisioning
│   ├── ansible/             # K3s installation
│   └── modules/             # Terraform modules
├── applications/            # K8s app manifests (future)
├── scripts/                 # Automation scripts
├── .envrc.example          # Environment template
├── Makefile                # Command interface
└── CLAUDE.md               # This file
```

---

## Workflow

The complete orchestration workflow:

```bash
# 0. Install Mac tools (one-time)
make setup-mac                # Install via Homebrew (terraform, packer, ansible, kubectl, helm, k9s, direnv)

# 1. Setup environment
cp .envrc.example .envrc     # Configure credentials (Proxmox, Cloudflare, SSH key)
direnv allow                  # Load environment

# 2. Verify prerequisites
make check                    # Verify Proxmox API, SSH, tools

# 3. Build infrastructure
make iso-upload               # Upload Ubuntu ISO (one-time)
make template                 # Build VM template with Packer
make apply                    # Provision VMs with Terraform

# 4. Install K3s
make ansible-k3s              # Install K3s cluster + GPU drivers + auto-saves token to .secrets/
make kubeconfig               # Fetch cluster credentials

# 5. Deploy K8s services
make deploy-k8s               # Deploy MetalLB, cert-manager, NVIDIA plugin, apps
                              # (cert-manager secret auto-generated from $CLOUDFLARE_API_TOKEN)

# 6. Verify
make test                     # Cluster health checks
```

**Note:** No manual file copying required. K3s token is auto-saved to `.secrets/k3s-token` and cert-manager secret is generated from `.envrc`.

### Make Targets Reference

| Target | Description |
|--------|-------------|
| `make setup-mac` | Install Mac dependencies via Homebrew |
| `make check` | Verify prerequisites (API, SSH, tools) |
| `make iso-upload` | Download/upload Ubuntu ISO to Proxmox |
| `make template` | Build VM template with Packer |
| `make apply` | Provision VMs with Terraform |
| `make ansible-k3s` | Install K3s cluster + GPU node config + save token |
| `make save-token` | Save K3s cluster token to .secrets/k3s-token |
| `make kubeconfig` | Fetch kubeconfig from cluster |
| `make deploy-k8s` | Deploy all K8s manifests (generates secrets from env) |
| `make test` | Run cluster health checks |
| `make destroy` | Tear down all infrastructure |

---

## Current Status

**Last Updated:** 2025-11-28

**Completed:**
- Phase 0: Information gathering (docs complete)
- Phase 1: Proxmox cluster configured (3 nodes, storage, GPU passthrough)
- Phase 2: VM template built (`ubuntu-2404-k3s-template`, VMID 9000)
- Phase 3: K3s cluster operational (2 control plane nodes)
- Phase 3.5: GPU worker node operational with NVIDIA RTX 4000 Ada
- Phase 4: K3s services deployed (MetalLB, cert-manager, hello-world, Ollama, Open WebUI)
- Phase 4.5: Storage + Shared Services complete
  - NFS StorageClass (nfs-client) via nfs-subdir-external-provisioner
  - Ollama/Open WebUI migrated to NFS PVCs
  - PostgreSQL + Redis deployed (local-path storage)
- Kubeconfig saved to `infrastructure/terraform/kubeconfig`

**In Progress:**
- None

**Next Steps:**
1. Phase 5: Platform Services (Harbor, GitOps)
2. Phase 6: Operations

---

## Pending Tasks

### Phase 4.6: PostgreSQL Backup - COMPLETE
- CronJob runs daily at 3 AM
- Backups saved to Synology `/volume1/k3s-backups/`
- Keeps last 7 days of backups
- File: `applications/postgresql/backup-cronjob.yaml`

### Phase 5: Platform Services (Future)
- [ ] 5.1: Harbor container registry (in K3s)
- [ ] 5.2: FluxCD for GitOps
- [ ] 5.3: MCP server for infrastructure access

### Phase 6: Operations (Future)
- [ ] Configure Proxmox backup schedules
- [ ] Set up etcd snapshots
- [ ] Security hardening

### Dependency Tiers (Bootstrap Safety)
| Tier | Services | Image Source |
|------|----------|--------------|
| 0 - Core | MetalLB, cert-manager, Traefik | Public (ghcr.io, quay.io) |
| 1 - Platform | Harbor, Gitea, monitoring | Public (docker.io) |
| 2 - Apps | Custom apps | Harbor |

---

## Completed Phases

| Phase | Description | Key Artifacts |
|-------|-------------|---------------|
| 0 | Information gathering | `docs/HARDWARE.md`, `docs/NETWORK.md`, `docs/SOFTWARE.md` |
| 1 | Proxmox foundation | 3-node cluster, NFS storage, GPU passthrough on pve-01 |
| 2 | VM template | `ubuntu-2404-k3s-template` (VMID 9000) via Packer |
| 3 | K3s cluster | 2 control plane nodes (k3s-cp-01, k3s-cp-02) with embedded etcd |
| 3.5 | GPU worker | k3s-gpu-01 with RTX 4000 Ada, NVIDIA driver/toolkit |
| 4 | K3s services | MetalLB, cert-manager, NVIDIA device plugin, hello-world, Ollama |

**Technical Notes (GPU Passthrough):**
- VM requires: `bios = "ovmf"` + `efi_disk`
- Kernel params: `net.ifnames=0 biosdevname=0` (for q35 NIC naming)
- Device plugin needs: `runtimeClassName: nvidia`
- GPU nodes labeled: `nvidia.com/gpu.present=true` (via Ansible)

---

## Architecture Decisions

### Infrastructure Stack
- **Packer**: Creates VM templates from Ubuntu Server ISO
- **Terraform**: Provisions VMs from template, manages state
- **K3s**: Installed via official script (https://get.k3s.io)
- **FluxCD**: GitOps for application deployments (future)

### K3s Cluster Design
- 2 server nodes (control plane) on pve-02, pve-03
- 1 agent node (GPU worker) on pve-01
- Embedded etcd for HA
- MetalLB for LoadBalancer services

### Network Design
- VLAN 11 (10.20.11.0/24) for VMs
- Static IPs via cloud-init
- UDM Pro as DNS/gateway

### Storage Convention

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

### Ingress Convention

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

### Terminology
- Always refer to K3s (not K8s) when discussing this cluster