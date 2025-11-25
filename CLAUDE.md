# Claude Code Instructions for Homelab Proxmox Project

## Source of Truth

- `docs/HARDWARE.md` - Physical hardware specifications
- `docs/NETWORK.md` - Network architecture, VLANs, IP addressing
- `docs/SOFTWARE.md` - Software stack, versions
- `docs/LINKS.md` - Reference links
- `CLAUDE.md` (this file) - Project status, phases, architecture decisions

**Rules:** Never duplicate docs/ content here. Update docs/ immediately when info changes. Read before writing.

## Workflow

1. Read CLAUDE.md status section at session start
2. Update status/phases as work progresses
3. Log interactions to `logs/prompts.log` (gitignored)
4. Commit after completing tasks
5. Never hardcode values - use `.envrc`

## Repository Structure

```
homelab-proxmox/
├── docs/                     # Reference specs (ALWAYS CURRENT)
├── infrastructure/
│   ├── packer/              # VM template (README.md has detailed guide)
│   ├── terraform/           # VM provisioning
│   └── ansible/             # K3s configuration (future)
├── applications/            # K8s apps
├── scripts/                 # Automation
├── .envrc.example          # Environment template
└── Makefile                # Command interface
```

---

## Current Status

**Last Updated:** 2025-11-25

**Completed:**
- Phase 0: Information gathering (all docs complete)
- Phase 1.0-1.5: Proxmox installed, clustered, network/storage/GPU configured
- Packer configuration created

**In Progress:** Phase 2 - VM Template Building

**Next Steps:**
1. Create Proxmox API token, configure `.envrc`
2. Build VM template with Packer (`make template`)
3. Refactor Terraform (remove remote-exec)
4. Create Ansible integration for K3s
5. Deploy cluster (`make cluster`)

---

## Pending Tasks

### Phase 1.6: API and Authentication
- [ ] Create Proxmox API token (Datacenter > Permissions > API Tokens)
- [ ] Set permissions (PVEDatastoreUser, PVEVMAdmin, PVEPoolAdmin, PVEAuditor)
- [ ] Test API access with curl
- [ ] Generate SSH keypair for VM access
- [ ] Configure `.envrc` with credentials

### Phase 2: VM Template Creation
- [ ] Install Packer (`brew install packer`)
- [ ] Initialize Packer plugins (`make template-init`)
- [ ] Validate configuration (`make template-validate`)
- [ ] Build template (`make template`)
- [ ] Test: clone VM, verify cloud-init, SSH, qemu-guest-agent

### Phase 3: Terraform VM Provisioning
- [ ] Remove remote-exec from Terraform module
- [ ] Add Ansible inventory outputs
- [ ] Run `make init`, `make plan`, `make apply`
- [ ] Verify VMs created, SSH access works

### Phase 3.5: Ansible K3s Installation
- [ ] Create `infrastructure/ansible/` structure
- [ ] Add k3s-ansible role via requirements.yml
- [ ] Create inventory generation script
- [ ] Add Makefile targets (ansible-deps, generate-inventory, ansible-configure)
- [ ] Deploy K3s (`make ansible-configure`)
- [ ] Validate: `kubectl get nodes`, system pods running

### Phase 4: K3s Configuration
- [ ] Configure MetalLB (IP pool: 10.20.11.200-220)
- [ ] Set up cert-manager with Cloudflare DNS-01
- [ ] Install NVIDIA device plugin
- [ ] Test GPU scheduling

### Phase 5: Application Deployments
- [ ] Bootstrap FluxCD to GitHub repo
- [ ] Deploy: PostgreSQL, Redis, MinIO (infrastructure namespace)
- [ ] Deploy: n8n, Home Assistant (applications namespace)
- [ ] Deploy: Ollama, Stable Diffusion, Jupyter (ai namespace)

### Phase 6: Operations
- [ ] Configure Proxmox backup schedules
- [ ] Set up etcd snapshots
- [ ] Security hardening (firewall, Network Policies, RBAC)

### Deferred Tasks
- [ ] DKIM setup for Google Workspace (after Nov 26-27)
- [ ] Synology migration to VLAN 10
- [ ] Cloudflare API token for cert-manager

---

## Completed Phases (Summary)

### Phase 0: Information Gathering ✅
All hardware, network, and software documented in docs/.

### Phase 1.0-1.5: Foundation ✅
- Proxmox VE 9.1 installed on all 3 nodes (pve-01/02/03)
- Cluster "homelab-cluster" formed (3-node quorum)
- Network: VLAN-aware bridges, DNS (UDM Pro), NTP (chrony)
- Storage: UNAS Pro NFS mounted (nas-vmstorage, 37TB)
- GPU: RTX 4000 Ada passthrough configured on pve-01 (IOMMU, VFIO, Thunderbolt)

### Phase 2.1: Packer Configuration ✅
- Template config: `infrastructure/packer/ubuntu-k3s.pkr.hcl`
- Detailed guide: `infrastructure/packer/README.md`
