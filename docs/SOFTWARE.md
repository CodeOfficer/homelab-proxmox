# Software & Application Stack

This document describes the core software stack and the catalog of applications planned for deployment on the homelab.

## Core Infrastructure

| Component            | Technology              | Version        | Purpose                                        |
| -------------------- | ----------------------- | -------------- | ---------------------------------------------- |
| **Hypervisor**       | Proxmox VE              | 9.1            | Virtual machine and container management       |
| **VM Template**      | HashiCorp Packer        | 1.14+          | Automated VM template building                 |
| **VM Provisioning**  | HashiCorp Terraform     | 1.13+          | Infrastructure as Code - VM creation           |
| **Configuration**    | Ansible                 | 2.20+          | K3s cluster installation and configuration     |
| **Cloud-init**       | cloud-init              | (embedded)     | VM first-boot initialization                   |
| **Kubernetes**       | K3s                     | v1.33.6+k3s1   | Lightweight Kubernetes distribution            |
| **Container Runtime**| containerd              | 2.1.5-k3s1.33  | Included with K3s                              |

## Kubernetes Core Services

### Networking & Ingress

| Component         | Technology      | Purpose                                      |
| ----------------- | --------------- | -------------------------------------------- |
| **Ingress**       | Traefik         | HTTP/HTTPS ingress controller (bundled with K3s) |
| **LoadBalancer**  | MetalLB         | Layer 2 LoadBalancer for bare metal          |
| **CNI**           | Flannel         | Cluster networking (K3s default)             |

### Storage

| Component         | Technology                        | Purpose                                      |
| ----------------- | --------------------------------- | -------------------------------------------- |
| **NFS CSI**       | nfs-subdir-external-provisioner   | Dynamic NFS persistent volumes               |
| **Local Storage** | local-path                        | Local persistent volumes (K3s default)       |

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

### Deployment

| Component          | Technology | Purpose                                      |
| ------------------ | ---------- | -------------------------------------------- |
| **GitOps**         | FluxCD     | Continuous deployment (planned)              |
| **Package Manager**| Helm       | Kubernetes package management                |

## Monitoring & Observability (Planned)

| Component     | Technology  | Purpose                                |
| ------------- | ----------- | -------------------------------------- |
| **Metrics**   | Prometheus  | Time-series metrics collection         |
| **Dashboard** | Grafana     | Visualization and alerting             |
| **Logs**      | TBD         | Log aggregation (optional)             |

## GPU Support

| Component             | Technology                     | Purpose                          |
| --------------------- | ------------------------------ | -------------------------------- |
| **Device Plugin**     | NVIDIA k8s-device-plugin       | Exposes `nvidia.com/gpu` resource |
| **Driver**            | nvidia-headless-570-server-open| Host driver in k3s-gpu-01 VM     |
| **Container Toolkit** | nvidia-container-toolkit       | CDI + nvidia-container-runtime   |
| **RuntimeClass**      | `nvidia`                       | Required for GPU workloads       |

**GPU Pod Requirements:**
```yaml
spec:
  runtimeClassName: nvidia  # Required
  containers:
  - resources:
      limits:
        nvidia.com/gpu: 1
```

## Application Catalog

### Deployed Infrastructure Services

| Application   | Namespace      | Description                    | GPU Required |
| ------------- | -------------- | ------------------------------ | ------------ |
| PostgreSQL    | default        | Relational database            | No           |
| Redis         | default        | Caching and message broker     | No           |

### Deployed AI/ML Workloads

| Application   | Namespace      | Description                    | GPU Required |
| ------------- | -------------- | ------------------------------ | ------------ |
| Ollama        | ollama         | Local LLM inference engine     | Yes          |
| Open WebUI    | open-webui     | Web interface for Ollama       | No           |

### Planned Applications

| Application              | Description                    | GPU Required |
| ------------------------ | ------------------------------ | ------------ |
| Harbor                   | Container registry             | No           |
| n8n                      | Workflow automation            | No           |
| Home Assistant           | Home automation hub            | No           |
| Stable Diffusion WebUI   | AI image generation            | Yes          |
| Jupyter Lab              | Interactive notebooks          | Optional     |

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

**Layer 4: Application Deployment (Helm)**
- Kubernetes manifests and Helm charts
- Environment-driven secret generation
- GitOps with FluxCD (planned)

### Terraform Modules

| Module        | Purpose                                      |
| ------------- | -------------------------------------------- |
| `proxmox-vm`  | Reusable VM creation module                  |
| `k3s-cluster` | K3s cluster VM provisioning                  |

### Makefile Commands

| Command               | Purpose                                |
| --------------------- | -------------------------------------- |
| `make help`           | Show available commands                |
| `make check`          | Verify prerequisites                   |
| `make iso-upload`     | Upload Ubuntu ISO (one-time)           |
| `make template`       | Build VM template with Packer          |
| `make apply`          | Provision VMs with Terraform           |
| `make ansible-k3s`    | Install K3s cluster                    |
| `make kubeconfig`     | Fetch kubeconfig from cluster          |
| `make deploy-k8s`     | Deploy all K8s services                |
| `make test`           | Run cluster health checks              |
| `make destroy`        | Tear down infrastructure               |

## Software Versions

| Component | Version | Notes |
|-----------|---------|-------|
| Proxmox VE | 9.1 | All 3 nodes |
| K3s | v1.33.6+k3s1 | Stable channel |
| containerd | 2.1.5-k3s1.33 | Bundled with K3s |
| NVIDIA Driver | 550.x | Ubuntu nvidia-headless-550-server |
| CUDA | 12.4 | Via driver |
| NVIDIA Container Toolkit | 1.18.0 | libnvidia-container |
| NVIDIA Device Plugin | v0.17.0 | k8s-device-plugin |
| Ubuntu | 24.04 LTS | VM template base |
| Kernel | 6.8.0-88-generic | VM kernel |
| Terraform | 1.13+ | IaC provisioning |
| Packer | 1.14+ | VM template building |
| Ansible | 2.20+ | Configuration management |

## Reference Architecture

Infrastructure as Code principles:
- Declarative configuration (Packer + Terraform + Ansible + Helm)
- Version controlled (Git)
- Reproducible deployments
- Environment-driven secrets (.envrc + direnv)
- Idempotent configuration management
- Clear separation of concerns (VMs, configuration, applications)
