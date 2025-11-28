# Changelog

All notable changes to the homelab-proxmox infrastructure.

Format based on [Keep a Changelog](https://keepachangelog.com/).

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
