# Claude Code Instructions for Homelab Proxmox Project

## Source of Truth

- `docs/HARDWARE.md` - Physical hardware specifications
- `docs/NETWORK.md` - Network architecture, VLANs, IP addressing
- `docs/SOFTWARE.md` - Software stack, versions
- `docs/ARCHITECTURE.md` - Design decisions, conventions, templates
- `docs/LINKS.md` - Reference links
- `CHANGELOG.md` - Completed phases and history
- `CLAUDE.md` (this file) - Workflow, future plans

**Rules:** Never duplicate docs/ content here. Update CHANGELOG.md when completing phases. Read before writing.

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

### Changelog Protocol

When completing a phase or significant work:
1. Update `CHANGELOG.md` with what was accomplished
2. Remove completed items from this file's pending tasks
3. Commit both files together

### Make Targets Reference

Run `make help` for full list. Key targets:

| Target | Description |
|--------|-------------|
| **Setup** | |
| `make setup-mac` | Install Mac dependencies via Homebrew |
| `make check` | Verify prerequisites (API, SSH, tools) |
| **Infrastructure** | |
| `make iso-upload` | Download/upload Ubuntu ISO to Proxmox |
| `make template` | Build VM template with Packer |
| `make apply` | Provision VMs with Terraform |
| `make destroy` | Tear down all infrastructure |
| **K3s** | |
| `make kubeconfig` | Fetch kubeconfig from cluster |
| `make save-token` | Save K3s token to .secrets/k3s-token |
| `make deploy-k8s` | Deploy all K8s manifests |
| `make test` | Run cluster health checks |
| **Utilities** | |
| `make ssh-server` | SSH to first control plane node |
| `make ssh-agent` | SSH to GPU worker node |
| `make status` | Show cluster status |
| `make kubectl CMD="..."` | Run kubectl commands |

---

## Current Status

**Completed:** Phases 0-4.6 (see `CHANGELOG.md`)

**In Progress:** None

**Next Steps:**

### Phase 5: Platform Services
- [ ] 5.1: Harbor container registry
- [ ] 5.2: FluxCD for GitOps
- [ ] 5.3: MCP server for infrastructure access

### Phase 6: Operations
- [ ] Configure Proxmox backup schedules
- [ ] Set up etcd snapshots
- [ ] Security hardening

### Dependency Tiers (Bootstrap Safety)
| Tier | Services | Image Source |
|------|----------|--------------|
| 0 - Core | MetalLB, cert-manager, Traefik | Public (ghcr.io, quay.io) |
| 1 - Platform | Harbor, Gitea, monitoring | Public (docker.io) |
| 2 - Apps | Custom apps | Harbor |

