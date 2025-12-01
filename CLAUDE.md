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

### Claude Tools

| Tool | Description |
|------|-------------|
| `playwright-skill` | Browser automation for debugging web UIs (Grafana, etc.) |

**Setup after clone:** `npm install` to restore Playwright dependency.

---

## Current Status

**Completed:** Phases 0-5.9 (see `CHANGELOG.md`)

**In Progress:** None

**Next Steps:**

### Phase 5: Platform Services
- [x] 5.0: Prometheus + Grafana monitoring (`applications/monitoring/`)
- [ ] 5.1: Harbor container registry
- [ ] 5.2: FluxCD for GitOps
- [ ] 5.3: MCP server for infrastructure access

### Phase 6: Operations
- [ ] Configure Proxmox backup schedules
- [ ] Set up etcd snapshots
- [ ] Security hardening

### Game Servers
- [x] 7 Days to Die (`applications/7dtd/`) - 10.20.11.201:26900
  - RWG 8K map "FoundationRWG", Warrior difficulty, EAC disabled
- [x] Factorio (`applications/factorio/`) - 10.20.11.202:34197
  - Save import: `kubectl cp save.zip factorio/<pod>:/factorio/save-importer/import/homelab.zip` then restart pod
- [x] Factorio Mapshot (`applications/mapshot/`) - https://mapshot.codeofficer.com/mapshot/latest/
  - Zoomable web map, 4-hour CronJob render, checksum-gated, auto-cleanup
- [x] Tailscale subnet router for remote friend access
- [ ] Pod anti-affinity to spread game servers across nodes
- [ ] Factorio Server Manager (FSM) - web UI for saves/mods/config
  - Options: FSM sidecar, RCON CLI (`make factorio-rcon`), kubectl cp
  - FSM repo: `mroote/factorio-server-manager`
- [ ] Mapshot event-driven trigger (sidecar watches for last player leave)

### Monitoring Enhancements
- [x] Telegram alerting (Alertmanager, mapshot, 7DTD backups)
- [x] Prometheus alerting rules (`applications/monitoring/alerts.yaml`)
- [x] CronJob health alerts (failure + staleness detection)
- [x] Game server dashboard (CPU throttling, memory %, TCP retransmits)
- [x] Loki log aggregation (`applications/loki/`) - query logs in Grafana
- [x] Loki health dashboard (ingestion rate, storage %, latency)
- [x] Pod memory pressure alerts (warn at 80% of limit)
- [x] K8s cluster dashboards (dotdc: global, nodes, namespaces, pods views)
- [ ] GPU metrics dashboard (RTX 4000 Ada utilization, temp, memory)

### Remote Access (Tailscale)
Tailscale installed on k3s-cp-01 as subnet router exposing 10.20.11.0/24.
- Invite friends via: https://login.tailscale.com/admin/users
- Grafana: https://grafana.codeofficer.com
- 7 Days to Die: `10.20.11.201:26900`
- Factorio: `10.20.11.202:34197`

### Dependency Tiers (Bootstrap Safety)
| Tier | Services | Image Source |
|------|----------|--------------|
| 0 - Core | MetalLB, cert-manager, Traefik, Prometheus/Grafana | Public (ghcr.io, quay.io) |
| 1 - Platform | Harbor, Gitea | Public (docker.io) |
| 2 - Apps | Custom apps | Harbor |

### Backup Strategy

All K8s app backups go to UNAS K3sStorage (`10.20.10.20`) for Mac accessibility.
Pattern: `namespace/purpose/` (e.g., `sdtd/backups/`, `factorio/backups/`)

| App | Schedule | Retention | Output |
|-----|----------|-----------|--------|
| 7DTD | 6h | 5 + latest | `sdtd/backups/latest.tar.gz` |
| Factorio | 6h | 5 + latest | `factorio/backups/latest.zip` |
| Mapshot | 4h | Latest only | `mapshot/renders/` |
| PostgreSQL | 3 AM | 7 + latest | `postgresql/backups/latest.sql.gz` |
| Open-WebUI | 4 AM | 7 + latest | `open-webui/backups/latest.db` |

Features: Checksum-gated (skip if unchanged), Telegram notifications, Mac Finder accessible.
Details: `applications/backups/README.md`

