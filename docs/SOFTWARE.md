# Software & Application Stack

This document describes the core software stack and the catalog of applications planned for deployment on the homelab.

## Core Infrastructure

| Component            | Technology              | Target Version | Purpose                                        |
| -------------------- | ----------------------- | -------------- | ---------------------------------------------- |
| **Hypervisor**       | Proxmox VE              | 9.1            | Virtual machine and container management       |
| **VM Template**      | HashiCorp Packer        | Latest         | Automated VM template building                 |
| **VM Provisioning**  | HashiCorp Terraform     | Latest         | Infrastructure as Code - VM creation           |
| **Configuration**    | Ansible + k3s-ansible   | Latest         | K3s cluster installation and configuration     |
| **Cloud-init**       | cloud-init              | Latest         | VM first-boot initialization                   |
| **Kubernetes**       | K3s                     | Latest stable  | Lightweight Kubernetes distribution            |
| **Container Runtime**| containerd              | (embedded)     | Included with K3s                              |

## Kubernetes Core Services

### Networking & Ingress

| Component         | Technology      | Purpose                                      |
| ----------------- | --------------- | -------------------------------------------- |
| **Ingress**       | Traefik         | HTTP/HTTPS ingress controller (bundled with K3s) |
| **LoadBalancer**  | MetalLB         | Layer 2 LoadBalancer for bare metal          |
| **CNI**           | Flannel         | Cluster networking (K3s default)             |

### Storage

| Component         | Technology      | Purpose                                      |
| ----------------- | --------------- | -------------------------------------------- |
| **CSI**           | NFS CSI Driver  | Kubernetes NFS persistent volumes            |
| **Local Storage** | local-path      | Local persistent volumes (K3s default)       |

### Certificate Management

| Component         | Technology          | Purpose                                  |
| ----------------- | ------------------- | ---------------------------------------- |
| **Cert Manager**  | cert-manager        | Automatic TLS certificate management     |
| **ACME Provider** | Let's Encrypt       | Free, automated SSL/TLS certificates     |
| **Challenge**     | DNS-01 (Cloudflare) | Domain validation for wildcard certs     |

**Certificate Configuration:**
- Domain: `*.lab.codeofficer.com`
- DNS Provider: Cloudflare (free tier)
- Validation: DNS-01 challenge via Cloudflare API
- Renewal: Automatic via cert-manager

### GitOps & Deployment

| Component          | Technology | Purpose                                      |
| ------------------ | ---------- | -------------------------------------------- |
| **GitOps**         | FluxCD     | Continuous deployment from Git repository    |
| **Package Manager**| Helm       | Kubernetes package management                |

## Monitoring & Observability (Phase 4+)

| Component     | Technology  | Purpose                                |
| ------------- | ----------- | -------------------------------------- |
| **Metrics**   | Prometheus  | Time-series metrics collection         |
| **Dashboard** | Grafana     | Visualization and alerting dashboard   |
| **Logs**      | TBD         | Log aggregation (optional)             |

**Note:** Monitoring stack to be deployed after cluster is stable.

## GPU Support

| Component             | Technology                  | Purpose                          |
| --------------------- | --------------------------- | -------------------------------- |
| **Device Plugin**     | NVIDIA GPU Device Plugin    | Exposes GPUs to Kubernetes       |
| **Driver**            | NVIDIA Driver (in guest VM) | GPU driver in k3s-gpu-01 VM      |
| **Runtime**           | NVIDIA Container Runtime    | GPU access for containers        |

## Application Catalog

Applications to be deployed after core infrastructure is stable (Phase 5).

### Infrastructure Services (namespace: infrastructure)

| Application   | Description                    | GPU Required |
| ------------- | ------------------------------ | ------------ |
| PostgreSQL    | Relational database            | No           |
| Redis         | Caching and message broker     | No           |
| MinIO         | S3-compatible object storage   | No           |

### Core Applications (namespace: applications)

| Application      | Description                    | GPU Required |
| ---------------- | ------------------------------ | ------------ |
| n8n              | Workflow automation platform   | No           |
| Home Assistant   | Home automation hub            | No           |

### AI/ML Workloads (namespace: ai)

| Application              | Description                    | GPU Required |
| ------------------------ | ------------------------------ | ------------ |
| Ollama                   | Local LLM inference engine     | Yes          |
| Stable Diffusion WebUI   | AI image generation            | Yes          |
| Jupyter Lab              | Interactive notebooks          | Optional     |

**Note:** AI/ML applications will run on `k3s-gpu-01` node with NVIDIA RTX 4000 Ada.

## Deployment Methods

All applications follow standardized deployment pattern:

```
applications/<app-name>/
├── deploy.sh         # Deployment script (Helm install/upgrade)
├── values.yaml       # Helm values overrides
└── README.md         # App-specific documentation
```

**Standard deployment:**
1. Check required environment variables
2. Create namespace if needed
3. Create secrets from `.envrc`
4. Deploy via Helm with `--atomic --cleanup-on-fail`
5. Verify deployment

## Environment Management

| Component     | File/Tool        | Purpose                                |
| ------------- | ---------------- | -------------------------------------- |
| **Config**    | `.envrc`         | Local environment variables (gitignored) |
| **Template**  | `.envrc.example` | Environment variable template (tracked) |
| **Loader**    | direnv           | Automatic environment loading          |
| **Secrets**   | Kubernetes Secrets | Runtime secrets in cluster          |

**Security:** Never commit `.envrc` - all secrets managed via environment variables.

## Infrastructure as Code

### Three-Layer Architecture

**Layer 1: VM Template Building (Packer)**
- Builds immutable VM templates with K3s prerequisites
- Template stored in Proxmox as VMID 9000
- Includes: qemu-guest-agent, cloud-init, system optimizations

**Layer 2: VM Provisioning (Terraform)**
- Creates VMs from template
- Configures networking, storage, GPU passthrough
- Manages infrastructure state

**Layer 3: Cluster Configuration (Ansible)**
- Installs K3s using official k3s-ansible role
- Configures cluster networking and components
- Idempotent configuration management

**Layer 4: Application Deployment (Flux)**
- GitOps continuous deployment
- Native Helm chart support
- Automated synchronization from Git

### Terraform Modules

| Module        | Purpose                                      |
| ------------- | -------------------------------------------- |
| `proxmox-vm`  | Reusable VM creation module                  |
| `k3s-cluster` | K3s cluster VM provisioning                  |

### Makefile Commands

| Command               | Purpose                                |
| --------------------- | -------------------------------------- |
| `make help`           | Show available commands                |
| `make template`       | Build VM template with Packer          |
| `make init`           | Initialize Terraform                   |
| `make plan`           | Plan infrastructure changes            |
| `make apply`          | Apply infrastructure (VMs only)        |
| `make cluster`        | Deploy full cluster (Terraform + Ansible) |
| `make infra`          | Alias for cluster deployment           |
| `make deploy APP=x`   | Deploy specific application            |

## Software Versions (to be determined during installation)

Specific versions will be documented as components are installed:
- Proxmox VE: 9.1
- K3s: TBD (target: latest stable)
- Terraform: TBD (target: 1.6+)
- MetalLB: TBD
- cert-manager: TBD
- FluxCD: TBD

**Update this document as versions are locked in during Phase 1-3.**

## Reference Architecture

This homelab follows Infrastructure as Code principles:
- Declarative configuration (Packer + Terraform + Ansible + Flux)
- Version controlled (Git)
- Reproducible deployments
- Environment variable driven secrets
- Idempotent configuration management
- GitOps for application lifecycle
- Clear separation of concerns (VMs, configuration, applications)

All patterns inspired by `~/homelab-k3s` reference repository and community conventions, adapted for Proxmox context.
