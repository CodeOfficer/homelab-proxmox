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
# 1. Setup environment
cp .envrc.example .envrc     # Configure credentials
direnv allow                  # Load environment

# 2. Verify prerequisites
make check                    # Verify Proxmox API, SSH, tools

# 3. Build infrastructure
make iso-upload               # Upload Ubuntu ISO (one-time)
make template                 # Build VM template with Packer
make apply                    # Provision VMs with Terraform

# 4. Install K3s
make ansible-k3s              # Install K3s cluster via Ansible
make kubeconfig               # Fetch cluster credentials

# 5. Verify
make test                     # Cluster health checks
```

### Make Targets Reference

| Target | Description |
|--------|-------------|
| `make check` | Verify prerequisites (API, SSH, tools) |
| `make iso-upload` | Download/upload Ubuntu ISO to Proxmox |
| `make template` | Build VM template with Packer |
| `make apply` | Provision VMs with Terraform |
| `make ansible-k3s` | Install K3s cluster |
| `make kubeconfig` | Fetch kubeconfig from cluster |
| `make test` | Run cluster health checks |
| `make destroy` | Tear down all infrastructure |

---

## Current Status

**Last Updated:** 2025-11-26

**Completed:**
- Phase 0: Information gathering (docs complete)
- Phase 1: Proxmox cluster configured (3 nodes, storage, GPU passthrough)
- Phase 2: VM template built (`ubuntu-2404-k3s-template`, VMID 9000)
- Phase 3: K3s cluster operational (2 control plane nodes)
- Phase 3.5: GPU worker node operational with NVIDIA RTX 4000 Ada
- Kubeconfig saved to `infrastructure/terraform/kubeconfig`

**Next Steps (Priority Order):**
1. Configure MetalLB (Phase 4)
2. Set up cert-manager with Cloudflare DNS-01
3. Bootstrap FluxCD

---

## Pending Tasks

### Phase 4: K3s Configuration
- [ ] Configure MetalLB (IP pool: 10.20.11.200-220)
- [ ] Set up cert-manager with Cloudflare DNS-01

### Phase 5: Application Deployments
- [ ] Bootstrap FluxCD
- [ ] Deploy infrastructure services (PostgreSQL, Redis, MinIO)
- [ ] Deploy applications (n8n, Home Assistant)
- [ ] Deploy AI workloads (Ollama, Jupyter)

### Phase 6: Operations
- [ ] Configure Proxmox backup schedules
- [ ] Set up etcd snapshots
- [ ] Security hardening

---

## Completed Phases

### Phase 0: Information Gathering
All hardware, network, and software documented in `docs/`.

### Phase 1: Proxmox Foundation
- Proxmox VE 9.1 on all 3 nodes (pve-01/02/03)
- Cluster "homelab-cluster" formed
- VLAN-aware networking configured
- NFS storage mounted (nas-vmstorage, 37TB)
- GPU passthrough configured (RTX 4000 Ada on pve-01)
- API tokens created

### Phase 2: VM Template
- Packer configuration: `infrastructure/packer/ubuntu-k3s.pkr.hcl`
- Template: `ubuntu-2404-k3s-template` (VMID 9000)
- Ubuntu 24.04 Server with autoinstall
- Pre-configured: cloud-init, qemu-guest-agent, K3s prerequisites

### Phase 3: K3s Cluster
- K3s v1.33.6+k3s1 installed via official script
- 2 control plane nodes with embedded etcd:
  - k3s-cp-01 (VM 200) at 10.20.11.80 on pve-02
  - k3s-cp-02 (VM 201) at 10.20.11.81 on pve-03
- System components running: CoreDNS, metrics-server, Traefik, local-path-provisioner
- Kubeconfig: `infrastructure/terraform/kubeconfig`

### Phase 3.5: GPU Worker Node
- k3s-gpu-01 (VM 210) at 10.20.11.85 on pve-01 (GPU passthrough)
- NVIDIA RTX 4000 Ada Generation (20GB VRAM)
- Driver 570.195.03, CUDA 12.8
- NVIDIA Container Toolkit + Device Plugin installed
- GPU resource: `nvidia.com/gpu: 1` available in cluster
- Fixes applied:
  - Packer user-data: `net.ifnames=0 biosdevname=0` for q35 NIC naming
  - Terraform module: `bios = "ovmf"` + `efi_disk` for GPU passthrough
  - Device plugin: RuntimeClass `nvidia` required for GPU detection

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
