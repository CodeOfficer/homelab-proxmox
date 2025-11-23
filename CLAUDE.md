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

## Current Status: Planning Phase

**Last Updated:** 2025-11-23

### Completed ✅
- Hardware specifications documented in `docs/HARDWARE.md`
- Network architecture defined in `docs/NETWORK.md`
- Reference homelab analyzed (`~/homelab-k3s`)
- Initial Terraform structure created (for reference)
- Environment variable template drafted
- Makefile structure planned

### Current Tasks 🔄
- Document GPU passthrough strategy
- Plan Proxmox cluster setup process
- Define VM template creation workflow
- Fill in missing hardware details

### Pending ⏳
- Proxmox cluster installation and configuration
- GPU passthrough setup on pve-node-01
- VM template creation (Ubuntu 24.04 cloud-init)
- Terraform infrastructure deployment
- K3s cluster bootstrap
- Application deployments

---

## Project Phases

### Phase 1: Foundation Setup (NOT STARTED)

#### 1.1 Proxmox Installation
- [ ] Wipe existing XCP-ng from all three nodes
- [ ] Install Proxmox VE 8.x on pve-node-01 (GPU node)
- [ ] Install Proxmox VE 8.x on pve-node-02
- [ ] Install Proxmox VE 8.x on pve-node-03
- [ ] Verify BIOS settings (IOMMU, VT-d enabled)
- [ ] Configure management network (VLAN 10)

#### 1.2 Proxmox Cluster Configuration
- [ ] Create Proxmox cluster (name: `homelab-cluster`)
- [ ] Join pve-node-02 to cluster
- [ ] Join pve-node-03 to cluster
- [ ] Verify quorum (3 nodes)
- [ ] Configure corosync network
- [ ] Set up cluster resource synchronization

#### 1.3 Network Configuration
- [ ] Configure VLANs on Proxmox nodes (10, 20, 30, 40, 50, 99)
- [ ] Create Linux bridges with VLAN awareness
- [ ] Test connectivity between VLANs
- [ ] Configure DNS resolution (pointing to UDM)
- [ ] Set up static routes if needed

#### 1.4 Storage Configuration
- [ ] Configure local-lvm storage on each node
- [ ] Set up NFS storage from UNAS Pro (for ISOs, backups)
- [ ] Configure iSCSI from Synology (for PVs)
- [ ] Test storage performance
- [ ] Plan backup strategy

#### 1.5 GPU Passthrough Setup (pve-node-01)
- [ ] Enable IOMMU in GRUB config
- [ ] Load VFIO modules
- [ ] Blacklist nouveau driver
- [ ] Identify GPU IOMMU group
- [ ] Create PCI device mapping in Proxmox
- [ ] Test GPU passthrough with test VM
- [ ] Install NVIDIA drivers in test VM
- [ ] Verify GPU visibility and functionality

#### 1.6 API and Authentication
- [ ] Create Terraform API token in Proxmox
- [ ] Set appropriate permissions (PVEDatastoreUser, PVEVMAdmin, PVEPoolAdmin)
- [ ] Test API access from local machine
- [ ] Configure SSH key authentication
- [ ] Document API endpoint in `.envrc`

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
**Decision:** Use VLANs for traffic isolation (see `docs/NETWORK.md`)

**Rationale:**
- Management (VLAN 10): Proxmox hosts, infrastructure
- Server (VLAN 20): K3s VMs
- Kubernetes (VLAN 30): K3s service IPs, ingress
- IoT (VLAN 40): Untrusted devices (Home Assistant targets)
- Guest (VLAN 50): Visitor network
- Clear separation of concerns, better security

### Storage Strategy
**Decision:** Local-lvm for VMs, NFS for shared storage, iSCSI for high-performance PVs

**Rationale:**
- Local-lvm: Fast VM disk performance
- NFS (UNAS Pro): Backups, ISOs, shared read-only data
- iSCSI (Synology): High-performance persistent volumes
- No Ceph (complexity not justified for 3 nodes)

### GitOps Tool
**Decision:** TBD (FluxCD vs ArgoCD)

**Considerations:**
- FluxCD: Lightweight, native Git integration, simpler
- ArgoCD: Better UI, more features, larger community
- **Recommendation:** Start with FluxCD (simpler), can migrate later

---

## Information Still Needed

### Hardware Details
- [ ] UNAS Pro exact model and capacity
- [ ] Synology NAS exact model and capacity
- [ ] UniFi equipment exact models (UDM Pro vs SE? Switch model?)
- [ ] JetKVM specific IP addresses and configuration

### Network Details
- [ ] Confirm current UDM configuration and subnet
- [ ] Verify VLAN support on switch
- [ ] DNS server configuration (UDM built-in or Pi-hole?)
- [ ] Current DHCP ranges and static assignments

### Proxmox Questions
- [ ] Current state: XCP-ng still running or wiped?
- [ ] Proxmox installation media prepared?
- [ ] Access to physical console (via JetKVM)?
- [ ] BIOS access and current settings?

### Application Requirements
- [ ] Full list of applications to deploy
- [ ] Resource requirements per application
- [ ] External access requirements (ingress)
- [ ] Data persistence needs

---

## Open Questions

1. **Storage:** Use NFS or iSCSI for Kubernetes PVs? Or local storage only?
2. **Backups:** Where should Proxmox backups go? UNAS Pro or Synology?
3. **DNS:** Use UDM DNS, or deploy Pi-hole in cluster?
4. **Certificates:** Use self-signed, Let's Encrypt, or internal CA?
5. **Monitoring:** Deploy full Prometheus/Grafana or use Proxmox built-in?
6. **GPU Workloads:** Which specific AI/ML applications do you plan to run?

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