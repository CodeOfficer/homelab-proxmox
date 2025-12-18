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

## Architecture Rules

### Node Allocation (3-Node HA)
| Node | RAM | Purpose | Scheduling | etcd |
|------|-----|---------|------------|------|
| k3s-cp-01 | 64GB | Control plane + general workloads | Default | Yes |
| k3s-cp-02 | 64GB | Control plane + general workloads | Default | Yes |
| k3s-gpu-01 | 64GB | Control plane + GPU workloads | Tainted: `dedicated=gpu:NoSchedule` | Yes |

**HA Note:** All 3 nodes run etcd. Cluster survives single node failure.

### GPU Node Policy
- **NEVER schedule non-GPU workloads on k3s-gpu-01**
- GPU node has RTX 4000 Ada - the ONLY discrete GPU in the cluster
- CP nodes have weak integrated graphics only
- GPU node has taint `dedicated=gpu:NoSchedule`
- Only pods with matching toleration can run there
- GPU workloads MUST have both toleration AND nodeSelector:
  ```yaml
  tolerations:
    - key: "dedicated"
      operator: "Equal"
      value: "gpu"
      effect: "NoSchedule"
  nodeSelector:
    nvidia.com/gpu.present: "true"
  ```

### When to Use GPU Node
- LLM inference (Ollama)
- Video transcoding requiring hardware acceleration
- Any workload needing CUDA/nvidia runtime
- NOT for: game servers, databases, web apps, monitoring

### K3s Init Server Selection
- xanmanning.k3s role uses **inventory file order** to select init server
- First host in `server` group initializes the cluster
- `k3s_registration_address` must match init server IP
- Order in inventory: k3s-cp-01 → k3s-cp-02 → k3s-gpu-01

### Memory Sizing Guidelines
- Game servers (7DTD, Factorio): 8Gi limit typical
- Mapshot (Factorio renderer): 16Gi limit (Space Age is memory-hungry)
- Monitoring (Prometheus): 2Gi limit
- GPU workloads (Ollama): 16Gi+ limit depending on models

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
make deploy-k8s               # Deploy MetalLB, cert-manager, NVIDIA plugin, core infra
make deploy-all-apps          # Deploy all applications (7DTD, Factorio, monitoring, etc.)
# Or: make deploy-full        # Both deploy-k8s + deploy-all-apps in one command

# 6. Verify
make test                     # Cluster health checks
```

**Note:** No manual file copying required. K3s token is auto-saved to `.secrets/k3s-token` and cert-manager secret is generated from `.envrc`.

### Restore Workflow

**Restores are SEPARATE from deploys (Architecture #1).**

```bash
# Deploy creates workloads + empty PVCs
make deploy-all-apps

# Restore data from NFS backups (manual - explicit)
make restore-7dtd          # Restore 7 Days to Die from latest NFS backup
make restore-factorio      # Restore Factorio from latest NFS backup
make restore-postgresql    # Restore PostgreSQL databases from latest NFS backup
make restore-all           # Restore all apps (interactive prompts)
```

**When to restore:**
- After cluster rebuild (Phase 6.0 scenario) - must run manual `make restore-*`
- Rolling back to previous save state
- Recovering from data corruption

**Restore source:** NFS backups at `10.20.10.20:/volume1/K3sStorage/`

**How it works:**
1. Derive node from PVC's nodeAffinity (local-path PVCs are node-sticky)
2. Scale workload to 0 (stops app)
3. Run restore Job on correct node (mounts PVC, copies backup → PVC)
4. Scale workload back to 1 (starts app with restored data)
5. Interactive confirmation prevents accidental data loss

**Critical:** Restore Jobs MUST run on the same node as the PVC. The Makefile derives this from the PV's `nodeAffinity` and injects `nodeName` into the Job spec dynamically.

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
| `make deploy-k8s` | Deploy core infrastructure (MetalLB, cert-manager, etc.) |
| `make deploy-all-apps` | Deploy all applications with deploy.sh scripts |
| `make deploy-full` | Full deployment (deploy-k8s + deploy-all-apps) |
| `make check-nfs` | Verify NFS server is reachable |
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

**Completed:** Phases 0-5.11 (see `CHANGELOG.md`)

**In Progress:** None

**Next Steps:**

### Phase 5: Platform Services
- [x] 5.0: Prometheus + Grafana monitoring (`applications/monitoring/`)
- [ ] 5.1: Harbor container registry
- [ ] 5.2: FluxCD for GitOps
- [ ] 5.3: MCP server for infrastructure access

### Phase 6: Operations
- [ ] 6.0: **Full teardown/rebuild test** - Verify idempotency
  - **Detailed plan:** `~/.claude/plans/clever-swimming-creek.md`
  - **Recent improvements (Phase 5.12):**
    - K3s token warning prompt prevents accidental cluster split
    - NFS pre-flight check (`make check-nfs`) catches offline NAS early
    - Factorio now has automated restore job (like 7DTD)
    - Ollama uses local-path storage (faster model loading)
    - 3-node HA control plane (survives single node failure)
    - `make deploy-full` consolidates all deployment steps
  - **Pre-test checklist:**
    - Verify `.secrets/k3s-token` exists (Makefile will warn if missing)
    - Confirm NFS server is reachable (`make check-nfs`)
    - Note current pod/IP state for comparison
  - **SKIP `make template`** - VM template (vmid 9000) already exists and is stable
  - **Execute:**
    - `terraform destroy` - destroy VMs only (template preserved)
    - `terraform apply` - recreate VMs from existing template
    - `make ansible-k3s` - reinstall K3s cluster (3-node HA)
    - `make deploy-full` - deploy infrastructure + all applications
  - **Verify:** All apps recover, NFS data persists, no manual intervention
  - **Document:** Any gaps found, update automation as needed
- [ ] 6.1: Configure Proxmox backup schedules
- [ ] 6.2: Set up etcd snapshots
- [ ] 6.3: Security hardening

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

### Platform Services
- **Kubernetes Dashboard**: https://k8s.codeofficer.com
  - Auto-login enabled (Traefik injects Bearer token via middleware)
  - No manual token entry required
  - Token valid for 1 year (regenerates on deploy)
  - Fully idempotent - survives reboots and cluster rebuilds

### Remote Access (Tailscale)
Tailscale installed on k3s-cp-01 as subnet router exposing 10.20.11.0/24.
- Invite friends via: https://login.tailscale.com/admin/users
- Grafana: https://grafana.codeofficer.com
- Kubernetes Dashboard: https://k8s.codeofficer.com (auto-login)
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

