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

**CRITICAL:** logs/ directory is gitignored - never attempt to commit it. Logging is append-only to local file for session continuity.

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
- Append timestamp + user prompt **AFTER EVERY SINGLE USER MESSAGE** (non-negotiable)
- Use actual time values, NOT shell syntax like `$(date +%H:%M:%SS)` (this doesn't evaluate)
- Add response summary line when work is complete
- Keep summaries brief (one line, ~10-20 words)
- Add blank line between entries
- **logs/ is gitignored** - this is personal log, not tracked in git
- Never delete or modify existing entries (append-only)
- Hook validates MOST RECENT entry has recent timestamp (not just any entry today)

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

## Current Status: Phase 1.5 Complete - GPU Passthrough Configured

**Last Updated:** 2025-11-25

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

### Phase 1.0: Prerequisites ✅ COMPLETE
- ✅ Proxmox VE 9.1 USB installation media created (Balena Etcher)
- ✅ DNS migrated to Cloudflare (propagating)
- ✅ JetKVM access verified (10.20.11.21-23) - using for monitoring/control, not virtual media
- ✅ USB installation approach confirmed (see Architecture Decision: Installation Method)
- ✅ No critical data to backup (Home Assistant will be reinstalled from scratch)

### Phase 1.1: Proxmox Installation ✅ COMPLETE
- ✅ All three nodes successfully installed with Proxmox VE 9.1
- ✅ pve-01 (10.20.11.11, GPU node) - ZFS filesystem
- ✅ pve-02 (10.20.11.12) - ZFS filesystem
- ✅ pve-03 (10.20.11.13) - ZFS filesystem
- ✅ All nodes accessible via web interface
- ✅ USB thumb drive installation method worked perfectly

### Phase 1.2: Proxmox Cluster Configuration ✅ COMPLETE
- ✅ Cluster "homelab-cluster" created successfully on pve-01
- ✅ pve-02 joined to cluster
- ✅ pve-03 joined to cluster
- ✅ Quorum verified: 3 nodes, each with 1 vote
- ✅ All nodes showing online (green) in cluster view
- ✅ Centralized management now available from any node

### Phase 1.3: Network Configuration ✅ COMPLETE
- ✅ SSH key authentication configured on all nodes (password-less access)
- ✅ Network bridges verified (vmbr0 on all nodes)
- ✅ VLAN-aware enabled on all bridges (bridge-vlan-aware yes)
- ✅ Connectivity tested between all nodes (0% packet loss)
- ✅ DNS resolution confirmed (10.20.11.1 via UDM Pro, search domain: home.arpa)
- ✅ NTP synchronization verified (chrony active and synced)
- ✅ Network configuration documented in docs/OPERATIONS.md

### Phase 1.4: Storage Configuration ✅ PARTIAL COMPLETE (Synology Deferred)
- ✅ UNAS Pro moved to VLAN 10 (10.20.10.20, nas.lab)
- ✅ NFS storage mounted from UNAS (nas-vmstorage, 37TB)
- ✅ Storage accessible from all three Proxmox nodes
- ✅ Read/write access verified
- ⏸️ Synology migration deferred to future session

### Phase 1.5: GPU Passthrough Setup ✅ COMPLETE
- ✅ IOMMU enabled in GRUB on pve-01 (intel_iommu=on iommu=pt)
- ✅ VFIO modules configured and loaded
- ✅ Nouveau driver blacklisted
- ✅ Thunderbolt eGPU enclosure detected (Sonnet Breakaway Box)
- ✅ GPU identified: RTX 4000 Ada (PCI ID: 10de:27b2, Address: 2f:00.0)
- ✅ IOMMU Group 17 verified (GPU + audio isolated)
- ✅ Thunderbolt auto-authorization configured via udev
- ✅ PCI device mapping created (ID: rtx4000ada)
- ✅ Configuration documented in docs/OPERATIONS.md
- ✅ Hardware specs updated in docs/HARDWARE.md

### Phase 2: Infrastructure Stack & VM Template (IN PROGRESS)
- ✅ Packer configuration created (infrastructure-as-code approach)
- ✅ Provisioning script written (qemu-guest-agent, cloud-init, K3s prerequisites)
- ✅ Makefile targets added (`make template`)
- ✅ Packer documentation complete (infrastructure/packer/README.md)
- ✅ **Architecture decision made: Terraform + Ansible + Flux stack**
- ⏸️ Ready for implementation (see Phase 2 and Phase 3 detailed tasks below):
  - Build VM template with Packer
  - Refactor Terraform module (remove remote-exec K3s installation)
  - Create Ansible directory structure with k3s-ansible
  - Update Makefile with Ansible workflow
  - Deploy infrastructure with new Terraform + Ansible workflow

**Next Steps:**
1. Refactor `infrastructure/modules/k3s-cluster/main.tf` (remove remote-exec provisioners)
2. Create `infrastructure/ansible/` structure with playbooks and inventory
3. Add Ansible integration to Makefile
4. Create Proxmox API token and configure `.envrc`
5. Build template: `make template`
6. Deploy cluster: `make cluster` (runs Terraform + Ansible + kubectl setup)

**Access Points:**
- Proxmox Web: https://10.20.11.11:8006 (or .12/.13)
- SSH: `ssh root@10.20.11.11` (or .12/.13)
- UNAS Pro: https://10.20.10.20
- NFS Storage: 10.20.10.20:/volume/.../VMStorage/.data

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

### Phase 1: Foundation Setup (IN PROGRESS)

#### 1.0 Prerequisites
- [x] Download Proxmox VE 9.1 ISO
- [x] Create Proxmox installation USB media (Balena Etcher on macOS)
- [x] Migrate codeofficer.com DNS from DNSimple to Cloudflare
  - Disabled DNSSEC at DNSimple
  - Created free Cloudflare account
  - Added domain to Cloudflare with all DNS records
  - Changed nameservers to gerardo/sharon.ns.cloudflare.com
  - DNS propagation in progress (0-48 hours)
  - Email (Google Workspace) and website (GitHub Pages) verified working
  - DKIM to be added after 24-72 hour Google Workspace waiting period
- [x] Verify JetKVM access to all three nodes (10.20.11.21-23)
  - JetKVM will be used for monitoring boot process and BIOS access
  - NOT using JetKVM virtual media (loses power during MS-01 reboot)
  - Installation via USB thumb drive instead (see Installation Method decision)
- [x] Confirm physical access to MS-01 nodes for USB installation
- [x] Backup any critical data from XCP-ng VMs (if needed)
  - No critical data to backup
  - Home Assistant will be reinstalled from scratch in Phase 5

#### 1.0.1 Post-Migration Follow-up (Do After DNS Propagates)

**CRITICAL: DKIM Setup Required**
- [ ] **Add DKIM record for Google Workspace email authentication**
  - **When:** 24-72 hours after DNS migration (around Nov 26-27, 2025)
  - **Why:** Improves email deliverability, prevents emails going to spam
  - **How:**
    1. Go to Google Workspace Admin Console
    2. Apps → Google Workspace → Gmail → Authenticate email
    3. Click "GENERATE NEW RECORD"
    4. Copy DNS Host name and TXT record value
    5. Add TXT record to Cloudflare DNS
    6. Click "START AUTHENTICATION" in Google Workspace
    7. Verify DKIM shows "Authenticating email" status
  - **Status:** Waiting for Google Workspace 24-72 hour period
  - **Reminder:** This MUST be completed for proper email security

- [ ] Verify DNS propagation complete globally (use whatsmydns.net)
- [ ] Test email deliverability and check spam score (mail-tester.com)
- [ ] Create Cloudflare API token for cert-manager (needed for Phase 4)

#### 1.1 Proxmox Installation (USB Thumb Drive Method) ✅ COMPLETE
**Installation Process:**
1. Plug USB thumb drive into MS-01 node
2. Use JetKVM to watch boot screen and select USB boot device
3. Start Proxmox installation
4. JetKVM may disconnect during reboots (expected - powered by node)
5. Reconnect JetKVM after reboot to verify installation complete
6. Remove USB, move to next node, repeat

**Tasks:**
- [x] Wipe existing XCP-ng from all three nodes
- [x] Install Proxmox VE 9.1 on pve-01 (10.20.11.11, GPU node)
- [x] Install Proxmox VE 9.1 on pve-02 (10.20.11.12)
- [x] Install Proxmox VE 9.1 on pve-03 (10.20.11.13)
- [x] Verify BIOS settings (IOMMU, VT-d enabled on pve-01)
- [x] Configure hostnames (pve-01.home.arpa, pve-02.home.arpa, pve-03.home.arpa)
- [x] Verify network connectivity and DNS resolution

#### 1.2 Proxmox Cluster Configuration ✅ COMPLETE
- [x] Create Proxmox cluster on pve-01 (name: `homelab-cluster`)
- [x] Join pve-02 to cluster
- [x] Join pve-03 to cluster
- [x] Verify quorum (3 nodes, each with 1 vote)
- [x] Configure corosync network (automatic)
- [x] Set up cluster resource synchronization (automatic)
- [ ] Test cluster functionality (VM migration, HA) - deferred to later phases

#### 1.3 Network Configuration ✅ COMPLETE
- [x] Configure VLAN-aware bridge on all nodes (vmbr0 with VLAN 11 tag)
- [x] Verify Proxmox host management on VLAN 11 (10.20.11.0/24)
- [x] Test VLAN 11 connectivity between all three nodes
- [x] Configure DNS resolution (UDM Pro at 10.20.11.1)
- [x] Configure NTP time synchronization (chrony active and synced)
- [x] Configure SSH key authentication on all nodes
- [x] Document network configuration in docs/OPERATIONS.md
- [ ] Test connectivity from Proxmox nodes to storage (nas, synology on VLAN 11) - deferred to Phase 1.4
- [ ] Update /etc/hosts with cluster node names - deferred (not needed with DNS working)

#### 1.4 Storage Configuration ✅ PARTIAL COMPLETE
- [x] Verify local-zfs storage on each node (VM disks) - already configured during install
- [x] Move UNAS Pro to VLAN 10 (10.20.10.20/nas.lab)
- [x] Mount NFS from UNAS Pro for ISOs, templates, and backups (nas-vmstorage)
- [x] Test NFS read/write access and verify on all nodes
- [x] Document storage configuration in docs/OPERATIONS.md
- [ ] Move Synology to VLAN 10 (10.20.10.10) - deferred for future session
- [ ] Mount NFS from Synology for additional backups - deferred
- [ ] Configure Proxmox backup schedule - deferred to Phase 6

#### 1.5 GPU Passthrough Setup (pve-01 only) ✅ COMPLETE
- [x] Enable IOMMU in GRUB (/etc/default/grub: intel_iommu=on iommu=pt)
- [x] Update GRUB and reboot
- [x] Load VFIO modules (/etc/modules-load.d/vfio.conf)
- [x] Blacklist nouveau driver (/etc/modprobe.d/blacklist-nouveau.conf)
- [x] Configure Thunderbolt auto-authorization (/etc/udev/rules.d/99-thunderbolt-egpu.rules)
- [x] Authorize Thunderbolt eGPU enclosure (Sonnet Breakaway Box)
- [x] Identify GPU PCI ID (10de:27b2) and address (2f:00.0)
- [x] Verify IOMMU Group 17 isolation (GPU + audio)
- [x] Create PCI device mapping in Proxmox (rtx4000ada)
- [x] Document configuration in docs/OPERATIONS.md
- [x] Update hardware specs in docs/HARDWARE.md

#### 1.6 API and Authentication
- [ ] Create Terraform API token in Proxmox (Datacenter > Permissions > API Tokens)
- [ ] Set appropriate permissions (PVEDatastoreUser, PVEVMAdmin, PVEPoolAdmin, PVEAuditor)
- [ ] Test API access with curl from local machine
- [ ] Generate SSH keypair for VM access (`ssh-keygen -t ed25519 -C "homelab-proxmox"`)
- [ ] Document API endpoint and token in `.envrc`
- [ ] Add SSH public key to .envrc for cloud-init injection

### Phase 2: VM Template Creation (IN PROGRESS)

**Approach:** Using Packer for infrastructure-as-code template creation

#### 2.1 Packer Configuration ✅ COMPLETE
- [x] Create Packer directory structure (`infrastructure/packer/`)
- [x] Write Packer HCL configuration (`ubuntu-k3s.pkr.hcl`)
- [x] Write provisioning script (`scripts/setup.sh`)
- [x] Create variables file example (`variables.pkrvars.hcl.example`)
- [x] Update `.envrc.example` with Packer environment variables
- [x] Add Makefile targets (`make template`, `make template-validate`)
- [x] Document Packer usage in README.md

#### 2.2 Prerequisites for Template Build
- [ ] Create Proxmox API token for Packer (or reuse Terraform token)
- [ ] Copy `.envrc.example` to `.envrc` and configure:
  - `PKR_VAR_proxmox_api_url`
  - `PKR_VAR_proxmox_api_token_id`
  - `PKR_VAR_proxmox_api_token_secret`
- [ ] Run `direnv allow` to load environment variables
- [ ] Install Packer (`brew install packer` on macOS)

#### 2.3 Template Build
- [ ] Initialize Packer plugins (`make template-init`)
- [ ] Validate Packer configuration (`make template-validate`)
- [ ] Build template (`make template`)
- [ ] Verify template exists in Proxmox (VMID 9000)

#### 2.4 Template Testing
- [ ] Clone test VM from template via Proxmox UI
- [ ] Verify cloud-init functionality
- [ ] Test SSH access with cloud-init injected key
- [ ] Verify qemu-guest-agent is running
- [ ] Verify K3s prerequisites (IP forwarding, kernel modules)
- [ ] Delete test VM after validation

### Phase 3: Terraform Infrastructure - VM Provisioning Only (NOT STARTED)

**Scope:** Terraform provisions VMs only. K3s installation handled by Ansible in Phase 3.5.

#### 3.1 Refactor Terraform Module
- [ ] Remove remote-exec provisioners from `infrastructure/modules/k3s-cluster/main.tf`
- [ ] Add outputs for Ansible inventory (`server_nodes`, `agent_nodes`)
- [ ] Create `infrastructure/terraform/outputs.tf` with `ansible_inventory` output
- [ ] Validate Terraform changes (`make validate`)

#### 3.2 Environment Setup
- [ ] Copy `.envrc.example` to `.envrc` (if not done)
- [ ] Fill in Proxmox API credentials
- [ ] Define K3s node configurations (IP addresses, resources)
- [ ] Run `direnv allow`

#### 3.3 Terraform Deployment
- [ ] Run `make init` (initialize Terraform)
- [ ] Run `make plan` (review VM changes)
- [ ] Run `make apply` (provision VMs only)
- [ ] Verify VMs created in Proxmox
- [ ] Test SSH access to VMs
- [ ] Verify cloud-init configured networking

### Phase 3.5: Ansible Configuration - K3s Installation (NOT STARTED)

**Scope:** Ansible installs and configures K3s cluster using official k3s-ansible role.

#### 3.5.1 Ansible Structure Setup
- [ ] Create `infrastructure/ansible/` directory
- [ ] Create `requirements.yml` (k3s-ansible role)
- [ ] Create `ansible.cfg`
- [ ] Create `inventory/group_vars/all.yml` (K3s configuration)
- [ ] Create `inventory/group_vars/k3s_agent.yml` (GPU node labels)
- [ ] Create `playbooks/site.yml` (main playbook)
- [ ] Create `generate-inventory.py` script
- [ ] Make script executable (`chmod +x`)
- [ ] Document Ansible usage in `infrastructure/ansible/README.md`

#### 3.5.2 Ansible Makefile Integration
- [ ] Add `ansible-deps` target (install Galaxy dependencies)
- [ ] Add `generate-inventory` target (create inventory from Terraform)
- [ ] Add `ansible-configure` target (run playbooks)
- [ ] Add `cluster` target (full deployment: Terraform + Ansible)
- [ ] Update help text with new commands

#### 3.5.3 K3s Cluster Deployment
- [ ] Install Ansible dependencies (`make ansible-deps`)
- [ ] Generate inventory (`make generate-inventory`)
- [ ] Review inventory file (`infrastructure/ansible/inventory/hosts.yml`)
- [ ] Run Ansible dry-run (`make ansible-check`)
- [ ] Deploy K3s cluster (`make ansible-configure`)
- [ ] Retrieve kubeconfig (automatic via playbook)

#### 3.5.4 Cluster Validation
- [ ] Set KUBECONFIG environment variable
- [ ] Run `kubectl get nodes` (verify all nodes Ready)
- [ ] Check system pods (`kubectl get pods -n kube-system`)
- [ ] Test cluster DNS
- [ ] Verify GPU node labels (`kubectl get node k3s-gpu-01 --show-labels`)
- [ ] Run full health check (`make test`)

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

#### 5.4 GitOps Setup (FluxCD)
- [ ] Bootstrap Flux to GitHub repository
- [ ] Create cluster manifests directory structure
- [ ] Configure Flux to watch Git repository
- [ ] Create HelmRelease resources for applications
- [ ] Test Git-based deployment workflow

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

### Installation Method
**Decision:** Use USB thumb drive for Proxmox installation (not JetKVM virtual media)

**Rationale:**
- JetKVM is powered by the MS-01 nodes it manages
- When MS-01 reboots during installation, JetKVM loses power
- Virtual media disconnects when JetKVM loses power → installation fails
- USB thumb drive persists through reboots (physical connection to node)
- JetKVM still valuable for monitoring boot process, accessing BIOS, and post-install management
- Trade-off: Need physical access to plug in USB, but installation is reliable

**Implementation:**
- USB created with Balena Etcher on macOS
- Install on one node at a time (move USB between nodes)
- Use JetKVM to monitor and control boot process
- JetKVM disconnects during reboot are expected and harmless

### Infrastructure Tooling Stack
**Decision:** Terraform + Ansible + Flux

**Rationale:**
- **Terraform**: VM provisioning only (creates VMs, configures networking, storage, GPU passthrough)
- **Ansible**: K3s cluster configuration (uses official k3s-ansible from SUSE/Rancher)
- **Flux**: GitOps application deployment (native Helm chart support)
- Community standard pattern for homelab K3s clusters
- Idempotent configuration management (can re-run Ansible safely to fix issues)
- Clear separation of concerns:
  - Terraform answers: "What VMs exist?"
  - Ansible answers: "What software is configured?"
  - Flux answers: "What apps are running?"
- Native Helm charts in Flux (not Terraform Helm provider wrapper)
- Easier to maintain: Can update K3s config without destroying VMs
- Better debugging: Each tool has clear, isolated responsibility
- Aligns with "simple and conventional" goal - this is THE homelab pattern

**Alternative Considered:** Terraform-only with remote-exec provisioners
- Rejected: Not idempotent, hard to debug, not community standard
- Problem: If K3s installation fails, must destroy/recreate VMs
- Terraform remote-exec is anti-pattern for configuration management

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

## Workflow Enforcement Primitives

To ensure consistent workflow compliance, this project uses a combination of three Claude Code primitives:

### 1. Hook: `user-prompt-submit-hook`

**Location:** `.claude/hooks/user-prompt-submit-hook`

**Purpose:** Automatic workflow checks after each user prompt

**What it checks:**
- Uncommitted changes (reminds to commit after completing work)
- Missing prompt logs (verifies today's date appears in logs/prompts.log)
- Outdated CLAUDE.md Last Updated date (checks if > 1 day old)
- Hardcoded secrets in staged changes

**Output:** Lightweight warnings and reminders, suggests running `/validate` for deep check

### 2. Slash Command: `/validate`

**Location:** `.claude/commands/validate.md`

**Purpose:** Comprehensive workflow validation on-demand

**What it validates:**
1. Documentation compliance (single source of truth)
2. Prompt logging completeness
3. Git status and uncommitted changes
4. Phase tracking and status currency
5. Environment variable usage
6. File structure compliance
7. Workflow pattern adherence

**Output:** Structured report with PASS/WARN/FAIL status, offers to fix issues

### 3. Skill: `homelab-workflow`

**Location:** `.claude/skills/homelab-workflow/`

**Purpose:** AI-powered workflow enforcement and automatic fixes

**Core capabilities:**
1. **Documentation Compliance** - AI reads CLAUDE.md and docs/ files to detect content duplication (not just keywords)
2. **Prompt Logging** - Ensures all interactions logged correctly
3. **Git Commit Validation** - Checks for uncommitted work and generates proper commit messages
4. **CLAUDE.md Status Updates** - Keeps phase tracking and status current
5. **Environment Variable Scanning** - Flags hardcoded values
6. **TodoWrite Compliance** - Ensures proper task tracking

**Smart Features:**
- Automatically discovers new docs/ files
- Distinguishes mentions from duplication (AI understands context)
- Can apply fixes automatically
- Adapts to changes in project structure

**Usage:** Invoke when completing tasks, updating docs, or when validation needed

### Using the Primitives Together

**Normal workflow:**
1. Hook runs automatically after each prompt (lightweight checks)
2. User runs `/validate` periodically for deep validation
3. AI invokes `homelab-workflow` skill when fixing violations

**When to use each:**
- **Hook** → Always (automatic)
- **`/validate`** → When you want comprehensive validation report
- **Skill** → When intelligent fixes or content analysis needed

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