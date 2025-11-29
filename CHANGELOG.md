# Changelog

All notable changes to the homelab-proxmox infrastructure.

Format based on [Keep a Changelog](https://keepachangelog.com/).

## [Phase 5.0] - 2025-11-28

### Added
- Prometheus + Grafana monitoring stack (kube-prometheus-stack Helm chart)
  - Grafana at https://grafana.codeofficer.com
  - 15-day metric retention (10Gi local-path storage)
  - Node exporter on all 3 nodes
  - kube-state-metrics for K8s object metrics
  - Alertmanager for alert routing
- NVIDIA DCGM exporter for GPU metrics (RTX 4090)
  - GPU temperature, utilization, memory usage
  - ServiceMonitor for Prometheus scraping

### Technical Notes
- Grafana admin password saved to `.secrets/grafana-admin-password`
- All monitoring components scheduled on control plane nodes
- GPU metrics available via `DCGM_FI_DEV_*` Prometheus metrics

## [Phase 4.8] - 2025-11-28

### Added
- Factorio dedicated game server (SQLJames/factorio-server-charts)
  - Built-in auto-save every 5 minutes (no CronJob needed)
  - LoadBalancer service at 10.20.11.202:34197
  - Space Age DLC enabled
  - RCON password in `.secrets/factorio-rcon-password`

### Technical Notes
- Factorio is simpler than 7DTD - built-in auto-save, fast startup (~30s vs 45min)
- No account needed for private server

## [Phase 4.7] - 2025-11-28

### Added
- 7 Days to Die dedicated game server (thelande/7dtd Helm chart)
  - Auto-save CronJob every 5 minutes via telnet (crash protection)
  - Backup sync to Synology NFS
  - LoadBalancer service at 10.20.11.201:26900
- Tailscale subnet router on k3s-cp-01 for remote game access
  - Exposes 10.20.11.0/24 to Tailscale network
  - Friends can join via Tailscale invite

### Technical Notes
- 7DTD has NO built-in auto-save; only saves on player logout or graceful shutdown
- Telnet enabled for `saveworld` command (password in `.secrets/7dtd-telnet-password`)
- Never use Ctrl+D/SIGKILL on game server pods - use `kubectl delete pod` for graceful shutdown

## [Phase 4.6] - 2025-11-28

### Added
- PostgreSQL backup CronJob (daily 3 AM to Synology)
- HTTPS redirect middleware for all ingresses (`applications/traefik/middleware.yaml`)
- Ingress convention documented in CLAUDE.md

## [Phase 4.5] - 2025-11-28

### Added
- NFS StorageClass (nfs-client) via nfs-subdir-external-provisioner
- PostgreSQL in databases namespace (Bitnami Helm chart, local-path storage)
- Redis in databases namespace (Bitnami Helm chart, local-path storage)

### Changed
- Ollama: emptyDir → NFS PVC (100Gi)
- Open WebUI: emptyDir → NFS PVC (10Gi)

## [Phase 4] - 2025-11-26

### Added
- MetalLB for LoadBalancer services (10.20.11.200-210)
- cert-manager with Let's Encrypt ClusterIssuers (staging + prod)
- NVIDIA device plugin for GPU workloads
- hello-world test deployment
- Ollama LLM server on GPU node
- Open WebUI chat interface

## [Phase 3.5] - 2025-11-26

### Added
- GPU worker node (k3s-gpu-01) on pve-01
- NVIDIA RTX 4000 Ada passthrough
- NVIDIA driver 550 + container toolkit via Ansible

### Technical Notes
- VM requires: `bios = "ovmf"` + `efi_disk`
- Kernel params: `net.ifnames=0 biosdevname=0` (for q35 NIC naming)
- Device plugin needs: `runtimeClassName: nvidia`
- GPU nodes labeled: `nvidia.com/gpu.present=true`

## [Phase 3] - 2025-11-26

### Added
- K3s cluster with 2 control plane nodes (embedded etcd)
- k3s-cp-01 (10.20.11.80) on pve-02
- k3s-cp-02 (10.20.11.81) on pve-03
- Terraform provisioning from VM template

## [Phase 2] - 2025-11-25

### Added
- Ubuntu 24.04 VM template (VMID 9000)
- Packer automation for template creation
- cloud-init integration for automated provisioning

## [Phase 1] - 2025-11-25

### Added
- 3-node Proxmox cluster (pve-01, pve-02, pve-03)
- NFS storage mounts (VMStorage for Proxmox, K3sStorage for K3s)
- GPU passthrough configuration on pve-01 (IOMMU, vfio-pci)

## [Phase 0] - 2025-11-25

### Added
- docs/HARDWARE.md - Physical hardware specifications
- docs/NETWORK.md - Network architecture, VLANs, IP addressing
- docs/SOFTWARE.md - Software stack and versions
- docs/LINKS.md - Reference documentation links
