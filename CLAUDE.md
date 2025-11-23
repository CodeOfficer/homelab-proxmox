# Claude Code Instructions for Homelab Proxmox Project

This file contains ONLY workflow patterns, conventions, and enforcement rules. All project-specific information lives in `docs/` files.

## Documentation as Single Source of Truth

**CRITICAL RULE:** The `docs/` directory is the ONLY source of truth. NEVER duplicate information from docs/ files into this file or anywhere else.

### Source of Truth Files

Each file must stand alone and always be current:

- **`docs/HARDWARE.md`** - Physical hardware specifications, exact models, capabilities
- **`docs/NETWORK.md`** - Network architecture, VLANs, IP addressing, topology
- **`docs/SOFTWARE.md`** - Software stack, versions, application catalog
- **`docs/LINKS.md`** - Reference links and resources
- **`CLAUDE.md`** (this file) - Project plan, phases, todos, architecture decisions

### Documentation Update Rules

**YOU MUST:**
1. Always read the relevant docs/ file before making changes
2. Update docs/ files immediately when information changes
3. Keep docs/ files synchronized with reality
4. Update the appropriate file NOW, not later
5. Treat docs/ files as the contract between sessions
6. Validate no duplication exists between CLAUDE.md and docs/

**NEVER:**
- Duplicate information from docs/ into CLAUDE.md
- Reference outdated information
- Assume docs are current without checking
- Let docs drift from actual state

### When to Update Which File

- Hardware added/changed → `docs/HARDWARE.md`
- Network configuration changed → `docs/NETWORK.md`
- Software version updated → `docs/SOFTWARE.md`
- Plan/status changed → `CLAUDE.md`
- Architecture decision made → `CLAUDE.md`
- New link/resource found → `docs/LINKS.md`

**Rule:** If you're unsure which file, check the file descriptions above. If still unsure, ask.

## Core Workflow Patterns

### Start Every Session

1. Read `CLAUDE.md` "Current Status" section
2. Understand current phase and completed/pending tasks
3. Review open questions and information gaps
4. Check docs/ files as needed for context (hardware, network, software)

### Before Any Implementation

1. Document the plan in `CLAUDE.md` (update Project Phases)
2. Update relevant docs/ files with any new information learned
3. Identify and document any unknowns or decisions needed
4. Get user confirmation on approach

### During Work

1. Mark tasks as in-progress in `CLAUDE.md`
2. Update docs/ files as information is discovered
3. Document decisions and rationale in `CLAUDE.md`
4. Keep status current, not "will update later"

### After Completing Work

1. Mark tasks complete in `CLAUDE.md`
2. Update all relevant docs/ files
3. Validate single source of truth (no duplication between files)
4. Document any new open questions
5. Update "Last Updated" date in `CLAUDE.md`
6. **Log the interaction to `logs/prompts.log`**
7. **Commit changes to git with descriptive message**

## Prompt Logging Pattern

**MUST ALWAYS DO:** After each user prompt, append to `logs/prompts.log`

### Format
```
[YYYY-MM-DD HH:MM:SS] User: "<user's prompt text>"
→ Response: <one-line summary of what was accomplished>

```

### Example
```
[2025-11-23 10:30:45] User: "help me plan homelab setup"
→ Response: Created planning structure with docs/ and CLAUDE.md

[2025-11-23 10:45:12] User: "move plans to CLAUDE.md"
→ Response: Moved plan/todos to CLAUDE.md, deleted docs/HOMELAB.md
```

### Rules
- Append timestamp + user prompt immediately when received
- Add response summary line when work is complete
- Keep summaries brief (one line, ~10-20 words)
- Add blank line between entries
- File is gitignored (personal log, not tracked)
- Never delete or modify existing entries (append-only)

## Git Commit Pattern

**MUST ALWAYS DO:** Commit changes after completing tasks or updating the plan

### When to Commit
- After completing a task or set of related tasks
- After updating `CLAUDE.md` with plan/status changes
- After making changes to docs/ files
- After infrastructure/code changes
- When a logical unit of work is complete

### Commit Message Format
```
<Short summary of changes>

<Optional detailed description>
- Bullet points for key changes
- List important decisions made
- Note any files created/modified

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

### Examples
```bash
# Simple commit
git commit -m "Add GPU passthrough documentation to HARDWARE.md"

# Detailed commit with HEREDOC
git commit -m "$(cat <<'EOF'
Update CLAUDE.md with Phase 1 completion status

- Marked Proxmox installation tasks as complete
- Updated "Current Status" section
- Documented IOMMU configuration decisions
- Added open questions about storage strategy

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

### Rules
- Always run `git add .` before committing (or stage specific files)
- Use descriptive commit messages (not "update" or "fix")
- Include Co-Authored-By attribution
- Don't commit `.envrc` or `logs/` (gitignored)
- Commit atomically (related changes together)

## Environment Variable Enforcement

**ABSOLUTE RULE:** NEVER hardcode configurable values.

### Pattern
- All secrets and config in `.envrc` (gitignored)
- Template maintained in `.envrc.example`
- Terraform uses `var.variable_name`
- Shell scripts use `${VARIABLE_NAME}`

### Enforcement
- Reject any PR/code with hardcoded IPs, passwords, URLs, or secrets
- Always suggest environment variable approach
- Document all required variables in `.envrc.example`
- If a value might change, it's a variable

## Repository Structure Convention

```
homelab-proxmox/
├── docs/                      # Source of truth (ALWAYS CURRENT)
├── infrastructure/
│   ├── terraform/            # Root Terraform configs
│   └── modules/              # Reusable Terraform modules
├── applications/             # Kubernetes apps (each has deploy.sh)
├── scripts/                  # Automation scripts
├── logs/                     # Interaction logs (gitignored)
│   └── prompts.log          # User prompt history
├── .envrc.example           # Environment template (maintained)
├── .envrc                   # Local config (gitignored)
├── Makefile                 # Command orchestration
├── README.md                # Project overview
└── CLAUDE.md               # This file (workflow + plan)
```

### Directory Conventions

- Each application in `applications/<name>/` has its own `deploy.sh`
- Terraform modules are reusable and parameterized
- Scripts in `scripts/` are for automation, not manual use
- All commands exposed via `Makefile` for consistency

## Makefile as Command Interface

**Pattern:** All operations go through `make` commands

```bash
make help          # Show available commands
make init          # Initialize Terraform
make plan          # Plan infrastructure changes
make apply         # Apply changes
make infra         # Full infrastructure deployment
make deploy APP=x  # Deploy specific application
```

Users should never need to remember terraform/kubectl/helm commands. The Makefile abstracts complexity.

## Application Deployment Pattern

**Convention:** Each app in `applications/<name>/` follows this pattern:

```
applications/<app-name>/
├── deploy.sh         # Deployment script (Helm install/upgrade)
├── values.yaml       # Helm values overrides
└── README.md         # App-specific docs
```

**Deployment script pattern:**
1. Check required environment variables
2. Create namespace if needed
3. Create secrets from environment variables
4. Deploy via Helm with `upgrade --install --atomic --cleanup-on-fail`
5. Verify deployment

## Reference Repository Usage

**Location:** `~/homelab-k3s`

**Purpose:** Inspiration for patterns ONLY, not code copying

**Use for:**
- Environment variable patterns
- Makefile structure concepts
- Deployment script patterns
- Documentation organization

**Do NOT:**
- Copy code directly
- Port XenOrchestra patterns to Proxmox
- Assume architecture decisions carry over
- Use without adapting to Proxmox context

## Things You MUST Remember

1. **Documentation First:** Plan in docs before implementing
2. **Docs Always Current:** Update docs/ files immediately when info changes
3. **No Hardcoding:** Everything configurable via environment variables
4. **Convention Over Configuration:** Use happy path solutions
5. **Clean Slate:** This is NOT a migration project
6. **Read Before Write:** Always read docs/ files before making changes
7. **Single Source of Truth:** docs/ files are the contract between sessions
8. **Validate Files:** Check no duplication between CLAUDE.md and docs/
9. **Log Every Prompt:** Append to `logs/prompts.log` after each interaction
10. **Commit After Tasks:** Create git commit when tasks are completed or plan is updated
11. **Skills Local:** Install skills to `.claude/` not `~/.claude/`

## Project Context

- **What:** Proxmox-based homelab with K3s and GPU passthrough
- **Status:** Planning Phase
- **Reference Repo:** `~/homelab-k3s` (patterns only, not migration)

---

## Current Status: Phase 0 Complete - Ready for Implementation

**Last Updated:** 2025-11-23

### Phase 0: Information Gathering ✅ COMPLETE
- ✅ Hardware specifications fully documented in `docs/HARDWARE.md`
- ✅ Network architecture fully documented in `docs/NETWORK.md`
- ✅ Software stack defined in `docs/SOFTWARE.md`
- ✅ All exact models, capacities, and configurations collected
- ✅ IP addressing scheme confirmed (10.20.11.0/24)
- ✅ Naming conventions established (*.home.arpa local, *.lab.codeofficer.com public)
- ✅ Architecture decisions documented and confirmed
- ✅ DNS strategy decided (UDM Pro + Cloudflare migration)
- ✅ Certificate strategy decided (Let's Encrypt DNS-01)
- ✅ Storage strategy decided (UNAS Pro primary, Synology backups)

### Ready to Begin ⏭️
- Phase 1: Foundation Setup (Proxmox installation, cluster config, GPU passthrough)
- Prerequisites needed:
  - Proxmox VE 8.x installation media
  - Migrate codeofficer.com DNS to Cloudflare
  - Physical access to nodes via JetKVM

---

## Project Phases

### Phase 0: Information Gathering (✅ COMPLETE)

**Goal:** Collect all hardware specs, network configuration, and make architecture decisions before implementation.

#### 0.1 Hardware Documentation
- [x] Document exact models of all compute nodes (Minisforum MS-01)
- [x] Document storage devices (UNAS Pro, Synology DS713+)
- [x] Document network equipment (UDM Pro, USW-Enterprise-24-PoE)
- [x] Document GPU specifications (RTX 4000 Ada)
- [x] Document JetKVM setup
- [x] Document drive models and capacities

#### 0.2 Network Planning
- [x] Confirm network topology (single 10.20.11.0/24 network)
- [x] Define IP addressing scheme for all devices
- [x] Define naming conventions (*.home.arpa local, *.lab.codeofficer.com public)
- [x] Plan DNS strategy (UDM Pro + Cloudflare)
- [x] Plan MetalLB IP pool (10.20.11.200-220)

#### 0.3 Architecture Decisions
- [x] Decide cluster topology (2 control plane + 1 GPU worker)
- [x] Decide K3s datastore (embedded etcd)
- [x] Decide GPU passthrough strategy (full GPU to VM)
- [x] Decide network design (no VLANs, keep it simple)
- [x] Decide storage strategy (UNAS Pro primary, Synology backups)
- [x] Decide certificate strategy (Let's Encrypt DNS-01)
- [x] Decide GitOps tool (FluxCD)
- [x] Decide LoadBalancer (MetalLB Layer 2)
- [x] Decide monitoring approach (defer to Phase 4+)

#### 0.4 Documentation
- [x] Complete docs/HARDWARE.md with all specifications
- [x] Complete docs/NETWORK.md with IP allocations
- [x] Complete docs/SOFTWARE.md with software stack
- [x] Update CLAUDE.md with all decisions

**Status:** ✅ Phase 0 Complete - All information gathered and documented

---

### Phase 1: Foundation Setup (NOT STARTED)

#### 1.0 Prerequisites
- [ ] Download Proxmox VE 8.x ISO
- [ ] Create Proxmox installation USB media
- [ ] Migrate codeofficer.com DNS from DNSimple to Cloudflare
- [ ] Verify JetKVM access to all three nodes
- [ ] Backup any critical data from XCP-ng VMs (if needed)

#### 1.1 Proxmox Installation
- [ ] Wipe existing XCP-ng from all three nodes
- [ ] Install Proxmox VE 8.x on pve-01 (10.20.11.11, GPU node)
- [ ] Install Proxmox VE 8.x on pve-02 (10.20.11.12)
- [ ] Install Proxmox VE 8.x on pve-03 (10.20.11.13)
- [ ] Verify BIOS settings (IOMMU, VT-d enabled on pve-01)
- [ ] Configure hostnames (pve-01.home.arpa, pve-02.home.arpa, pve-03.home.arpa)
- [ ] Verify network connectivity and DNS resolution

#### 1.2 Proxmox Cluster Configuration
- [ ] Create Proxmox cluster on pve-01 (name: `homelab-cluster`)
- [ ] Join pve-02 to cluster
- [ ] Join pve-03 to cluster
- [ ] Verify quorum (3 nodes)
- [ ] Configure corosync network
- [ ] Set up cluster resource synchronization
- [ ] Test cluster functionality (VM migration, HA)

#### 1.3 Network Configuration
- [ ] Configure VLAN-aware bridge on all nodes (vmbr0 with VLAN 11 tag)
- [ ] Verify Proxmox host management on VLAN 11 (10.20.11.0/24)
- [ ] Test VLAN 11 connectivity between all three nodes
- [ ] Configure DNS resolution (UDM Pro at 10.20.11.1)
- [ ] Test connectivity from Proxmox nodes to storage (nas, synology on VLAN 11)
- [ ] Configure NTP time synchronization
- [ ] Update /etc/hosts with cluster node names
- [ ] Document VLAN bridge configuration for VM deployments

#### 1.4 Storage Configuration
- [ ] Configure local-lvm storage on each node (VM disks)
- [ ] Mount NFS from UNAS Pro (nas.home.arpa) for ISOs and templates
- [ ] Mount NFS from Synology (synology.home.arpa) for VM backups
- [ ] Configure Proxmox backup schedule to Synology
- [ ] Test NFS mount performance and reliability
- [ ] Document storage paths in .envrc.example

#### 1.5 GPU Passthrough Setup (pve-01 only)
- [ ] Enable IOMMU in GRUB (/etc/default/grub: intel_iommu=on iommu=pt)
- [ ] Update GRUB and reboot
- [ ] Load VFIO modules (/etc/modules: vfio vfio_iommu_type1 vfio_pci vfio_virqfd)
- [ ] Blacklist nouveau driver (/etc/modprobe.d/blacklist.conf)
- [ ] Run `lspci -nnk` to identify GPU PCI ID
- [ ] Check IOMMU groups (`find /sys/kernel/iommu_groups/ -type l`)
- [ ] Create PCI device mapping in Proxmox web UI
- [ ] Document GPU PCI ID in notes for VM template creation

#### 1.6 API and Authentication
- [ ] Create Terraform API token in Proxmox (Datacenter > Permissions > API Tokens)
- [ ] Set appropriate permissions (PVEDatastoreUser, PVEVMAdmin, PVEPoolAdmin, PVEAuditor)
- [ ] Test API access with curl from local machine
- [ ] Generate SSH keypair for VM access (`ssh-keygen -t ed25519 -C "homelab-proxmox"`)
- [ ] Document API endpoint and token in `.envrc`
- [ ] Add SSH public key to .envrc for cloud-init injection

### Phase 2: VM Template Creation (NOT STARTED)

#### 2.1 Template VM Creation
- [ ] Download Ubuntu 24.04 LTS cloud image
- [ ] Create VM from cloud image (VMID 9000)
- [ ] Configure cloud-init
- [ ] Install qemu-guest-agent
- [ ] Configure serial console
- [ ] Optimize for cloning

#### 2.2 Template Customization
- [ ] Pre-install common packages (curl, wget, etc.)
- [ ] Configure default user (ubuntu)
- [ ] Set up SSH key injection
- [ ] Configure network defaults
- [ ] Enable automatic security updates

#### 2.3 Template Testing
- [ ] Clone test VM from template
- [ ] Verify cloud-init functionality
- [ ] Test SSH access
- [ ] Verify network configuration
- [ ] Convert to template

### Phase 3: Terraform Infrastructure (NOT STARTED)

#### 3.1 Environment Setup
- [ ] Copy `.envrc.example` to `.envrc`
- [ ] Fill in all required variables
- [ ] Configure Proxmox API credentials
- [ ] Define K3s node configurations
- [ ] Set up application secrets
- [ ] Run `direnv allow`

#### 3.2 Terraform Initialization
- [ ] Review Terraform configurations
- [ ] Run `terraform init`
- [ ] Run `terraform validate`
- [ ] Run `terraform plan`
- [ ] Review planned changes

#### 3.3 Infrastructure Deployment
- [ ] Deploy K3s server VMs (2 nodes on pve-node-02, pve-node-03)
- [ ] Deploy K3s agent VM (1 node on pve-node-01 with GPU)
- [ ] Verify VM creation and network connectivity
- [ ] Monitor K3s installation logs
- [ ] Verify cluster formation

#### 3.4 Cluster Validation
- [ ] Retrieve kubeconfig
- [ ] Run `kubectl get nodes`
- [ ] Verify all nodes in Ready state
- [ ] Check system pods in kube-system
- [ ] Test cluster DNS
- [ ] Verify GPU visibility on agent node

### Phase 4: K3s Configuration (NOT STARTED)

#### 4.1 Core Services
- [ ] Verify Traefik ingress controller
- [ ] Configure MetalLB or Kube-VIP for LoadBalancer services
- [ ] Set up cert-manager for TLS certificates
- [ ] Configure cluster DNS (CoreDNS)
- [ ] Set up persistent storage (local-path or NFS)

#### 4.2 GPU Configuration
- [ ] Install NVIDIA device plugin
- [ ] Configure GPU resource limits
- [ ] Test GPU scheduling with test pod
- [ ] Verify GPU metrics

#### 4.3 Monitoring Stack
- [ ] Deploy Prometheus
- [ ] Deploy Grafana
- [ ] Configure dashboards
- [ ] Set up alerts
- [ ] Configure log aggregation

### Phase 5: Application Deployments (NOT STARTED)

#### 5.1 Infrastructure Services (namespace: infrastructure)
- [ ] PostgreSQL (for application databases)
- [ ] Redis (for caching)
- [ ] MinIO (S3-compatible object storage)

#### 5.2 Core Applications (namespace: applications)
- [ ] n8n (workflow automation)
- [ ] Home Assistant
- [ ] Grafana (already deployed in monitoring)

#### 5.3 AI/ML Workloads (namespace: ai)
- [ ] Ollama (LLM inference)
- [ ] Stable Diffusion WebUI
- [ ] Jupyter Lab (GPU-enabled)

#### 5.4 GitOps Setup
- [ ] Choose GitOps tool (FluxCD vs ArgoCD)
- [ ] Deploy GitOps controller
- [ ] Configure application sync
- [ ] Set up automatic deployments

### Phase 6: Operations and Optimization (NOT STARTED)

#### 6.1 Backup Strategy
- [ ] Configure Proxmox backup schedules
- [ ] Set up etcd snapshots
- [ ] Configure application data backups
- [ ] Test restore procedures
- [ ] Document disaster recovery

#### 6.2 Security Hardening
- [ ] Configure firewall rules
- [ ] Set up Network Policies in K3s
- [ ] Enable Pod Security Standards
- [ ] Configure RBAC
- [ ] Scan for vulnerabilities

#### 6.3 Documentation
- [ ] Create setup guide
- [ ] Document operations procedures
- [ ] Create troubleshooting guide
- [ ] Document application access

---

## Architecture Decisions

### Cluster Topology
**Decision:** 2 control plane nodes + 1 GPU worker node

**Rationale:**
- Control plane on pve-node-02 and pve-node-03 (no GPU needed)
- Worker with GPU on pve-node-01 (dedicated for AI/ML)
- Allows control plane HA while maximizing GPU node resources
- 3 nodes provides proper quorum for embedded etcd

### K3s Datastore
**Decision:** Embedded etcd (not external database)

**Rationale:**
- Simpler setup than external MySQL/PostgreSQL
- Recommended for 3+ node clusters
- No additional database VM needed
- Better performance for small clusters

### GPU Passthrough Strategy
**Decision:** Pass entire RTX 4000 Ada to a single VM, run K3s agent in that VM

**Rationale:**
- Cleaner than container GPU passthrough
- Better driver compatibility
- Easier troubleshooting
- Can still use NVIDIA device plugin in K3s
- Alternative: Could use Proxmox LXC with GPU, but VM is more flexible

### Network Segmentation
**Decision:** Use existing VLAN infrastructure, homelab on VLAN 11 (VM-Servers, 10.20.11.0/24)

**Rationale:**
- Network already properly segmented with VLANs (10, 11, 12, 13)
- VLAN 11 (VM-Servers) dedicated to homelab infrastructure
- Provides isolation from other network segments
- Layer 3 switching enables secure inter-VLAN routing
- VPN provides additional security boundary for remote access
- Proxmox VLAN-aware bridges allow flexible VM networking
- Good security posture without additional complexity

**Existing VLAN Structure:**
- VLAN 10: Core-Infrastructure (10.20.10.0/24) - network equipment
- VLAN 11: VM-Servers (10.20.11.0/24) - **homelab primary**
- VLAN 12: Personal (10.20.12.0/24) - personal devices
- VLAN 13: IoT (10.20.13.0/24) - IoT devices (accessible via K8s ingress)

### Storage Strategy
**Decision:** Local-lvm for VMs, UNAS Pro (NFS) for K8s PVs, Synology (NFS) for backups

**Rationale:**
- **Local-lvm**: Fast VM disk performance on each node
- **UNAS Pro (nas.home.arpa)**: Primary NFS storage for ISOs, templates, K8s persistent volumes, shared data (40TB usable, 10GbE, RAID 5)
- **Synology (synology.home.arpa)**: Dedicated backup target for Proxmox VMs, etcd snapshots, critical configs (6TB usable, RAID 1, separate device for redundancy)
- **Separation of concerns**: Production storage separate from backup storage
- **No Ceph**: Complexity not justified for 3 nodes
- **Protocols**: NFS for simplicity (SMB remains for Mac Time Machine backups)

### GitOps Tool
**Decision:** FluxCD

**Rationale:**
- Lightweight and Git-native (true GitOps)
- Simpler than ArgoCD for homelab scale
- Well-documented for K3s
- Can migrate to ArgoCD later if UI/features needed
- Fits "simplicity first" approach

### LoadBalancer Service
**Decision:** MetalLB in Layer 2 mode

**Rationale:**
- Most mature and popular for K3s bare metal
- Simple IP pool configuration (10.20.11.200-220)
- Layer 2 mode works out of the box
- Can upgrade to BGP mode later with Enterprise switch Layer 3 capabilities
- Large community and extensive documentation

### TLS Certificates
**Decision:** Let's Encrypt with DNS-01 challenge via Cloudflare

**Rationale:**
- Free, trusted certificates (no browser warnings)
- Wildcard cert for `*.lab.codeofficer.com`
- DNS-01 challenge doesn't require public exposure
- Cloudflare free tier includes API access
- cert-manager handles automatic renewal
- Services accessible only via VPN but with valid certs

**Configuration:**
- Domain: codeofficer.com (migrate from DNSimple to Cloudflare)
- Subdomain: `*.lab.codeofficer.com` points to internal IPs
- Local DNS: `*.home.arpa` managed by UDM Pro

### Monitoring Strategy
**Decision:** Deploy Prometheus + Grafana in Phase 4+ (deferred)

**Rationale:**
- Start simple, add monitoring once cluster is stable
- Proxmox has built-in monitoring for infrastructure
- `kubectl top` sufficient for initial workloads
- Easy to add later (just Helm charts)
- Focus on core functionality first

### Naming Conventions
**Decision:**
- Local hostnames: `*.home.arpa` (RFC 8375 compliant)
- Public DNS: `*.lab.codeofficer.com`
- Node naming: Short and consistent (pve-01, pve-02, pve-03)

**Rationale:**
- `home.arpa` is the standard for home networks
- Avoids conflicts with `.local` (mDNS)
- `.lab` subdomain clearly identifies homelab services
- Short node names easier to type and remember

### VM Resource Allocation
**Decision:**
- Control plane nodes: 4 vCPU, 8GB RAM, 50GB disk
- GPU worker node: 8 vCPU, 16GB RAM, 100GB disk

**Rationale:**
- Leaves plenty of headroom on 96GB nodes
- Control plane can handle moderate workload
- GPU node sized for AI/ML workloads
- Can adjust resources later if needed

---

## Information Still Needed

✅ **Phase 0 Complete - All critical information collected**

### Optional Future Information
- [ ] Specific application resource requirements (determined during Phase 5)
- [ ] External ingress requirements per application (determined during deployment)
- [ ] Detailed data persistence needs per application (determined during deployment)

---

## Open Questions

✅ **All architectural questions resolved during Phase 0**

### Decisions Made:
1. **Storage:** ✅ NFS from UNAS Pro for K8s PVs, local-lvm for VM disks
2. **Backups:** ✅ Synology (separate device for backup target)
3. **DNS:** ✅ UDM Pro built-in DNS + Cloudflare for public DNS
4. **Certificates:** ✅ Let's Encrypt with DNS-01 challenge
5. **Monitoring:** ✅ Defer to Phase 4+ (start simple)
6. **GPU Workloads:** ✅ Ollama, Stable Diffusion WebUI, Jupyter Lab
7. **LoadBalancer:** ✅ MetalLB Layer 2 mode
8. **GitOps:** ✅ FluxCD
9. **Network:** ✅ Use existing VLAN 11 (VM-Servers, 10.20.11.0/24) for homelab

---

## Notes

- Reference repository: `~/homelab-k3s` (for patterns and inspiration only)
- This is a CLEAN SLATE build, not a migration
- Keep `docs/` files updated as single source of truth
- Use conventional solutions (happy path) over custom implementations
- Document all decisions and rationale in this file

## Anti-Patterns to Avoid

❌ Duplicating hardware specs (use `docs/HARDWARE.md`)
❌ Duplicating network details (use `docs/NETWORK.md`)
❌ Duplicating software versions (use `docs/SOFTWARE.md`)
❌ Documenting decisions in commit messages instead of CLAUDE.md
❌ Saying "I'll update later" (update NOW)
❌ Assuming docs are current without checking
❌ Hardcoding values "temporarily" (never temporary)
❌ Installing skills globally to `~/.claude/` (use `.claude/`)
❌ Skipping file validation after updates

## File Update Validation Checklist

After updating CLAUDE.md or docs/ files, verify:
- [ ] No information duplicated between CLAUDE.md and docs/
- [ ] Hardware specs only in `docs/HARDWARE.md`
- [ ] Network config only in `docs/NETWORK.md`
- [ ] Software versions only in `docs/SOFTWARE.md`
- [ ] Architecture decisions in CLAUDE.md reference docs/ when needed
- [ ] Each file can stand alone and be understood independently

## This File's Purpose

CLAUDE.md exists to:
- Track project plan, phases, todos, and status
- Document architecture decisions with rationale
- Enforce workflow patterns and conventions
- Define directory structure and code patterns
- Maintain information gaps and open questions

docs/ files exist to:
- Hardware specs (`docs/HARDWARE.md`)
- Network config (`docs/NETWORK.md`)
- Software catalog (`docs/SOFTWARE.md`)
- Reference links (`docs/LINKS.md`)

## Skills Installation Pattern

**CRITICAL:** When installing skills, ALWAYS use project-local `.claude/` directory

### Pattern
```bash
# CORRECT: Install to project .claude/ folder
claude skill add <skill-name> --local

# WRONG: Don't install to global ~/.claude/
claude skill add <skill-name>
```

### Rules
- Skills go in `.claude/skills/` within this project
- Never install skills globally to `~/.claude/`
- Project-specific skills stay with project
- Commit `.claude/` directory to git (except secrets)

### Why
- Skills are project-specific tools
- Keep project self-contained
- Other developers/sessions get same skills
- No pollution of global environment