# Hardware

This document outlines the physical hardware used in the homelab.

## Compute Nodes

There are 3 primary compute nodes in this cluster, all identical Minisforum MS-01 Workstations.

| Hostname            | Make/Model      | CPU                    | RAM   | Storage    | GPU                   | Management | Purpose              |
| ------------------- | --------------- | ---------------------- | ----- | ---------- | --------------------- | ---------- | -------------------- |
| `pve-node-01`       | Minisforum MS-01| Intel i9-12900H (14C/20T) | 96 GB | 1TB NVMe   | NVIDIA RTX 4000 ADA   | JetKVM     | AI/ML Workloads, GPU VMs |
| `pve-node-02`       | Minisforum MS-01| Intel i9-12900H (14C/20T) | 96 GB | 1TB NVMe   | —                     | JetKVM     | k3s Control Plane    |
| `pve-node-03`       | Minisforum MS-01| Intel i9-12900H (14C/20T) | 96 GB | 1TB NVMe   | —                     | JetKVM     | k3s Control Plane    |

### Detailed Specifications: Minisforum MS-01

- **CPU**: Intel Core i9-12900H (Alder Lake, 12th Gen)
  - 14 cores (6 P-cores + 8 E-cores)
  - 20 threads
  - Base: 2.5 GHz, Turbo: up to 5.0 GHz
  - Cache: 24 MB
  - TDP: 45W (base), configurable up to 115W
- **RAM**: 96 GB DDR5-4800 (ECC supported)
- **Storage**: 1TB NVMe PCIe 4.0 SSD
- **Network**: Dual Intel 2.5GbE NICs
- **Expansion**: PCIe 4.0 x16 slot (node-01 uses for RTX 4000 Ada)
- **Form Factor**: Compact workstation with excellent cooling

### GPU Specifications: NVIDIA RTX 4000 Ada (node-01 only)

- **Architecture**: Ada Lovelace
- **CUDA Cores**: 6,144
- **Tensor Cores**: 192 (4th gen)
- **RT Cores**: 48 (3rd gen)
- **VRAM**: 20 GB GDDR6 with ECC
- **Memory Bandwidth**: 360 GB/s
- **TDP**: 130W
- **Interface**: PCIe Gen 4 x16
- **Display**: 4x Mini DisplayPort 1.4a
- **Compute**: CUDA 8.9, DirectX 12 Ultimate
- **Use Cases**: AI inference, LLM hosting, computer vision, GPU compute

## Storage

| Device       | Model/Type | Capacity | RAID | Intended Use                                  |
| ------------ | ---------- | -------- | ---- | --------------------------------------------- |
| **NAS**      | UNAS Pro   | TBD      | TBD  | Proxmox Backups, ISOs, Media                  |
| **SAN**      | Synology   | TBD      | TBD  | iSCSI/NFS for Proxmox/Kubernetes Persistent Volumes |

## Networking

| Device            | Make/Model          | Purpose                 |
| ----------------- | ------------------- | ----------------------- |
| **Router**        | UDM (Pro/SE?)       | Gateway, Firewall, Routing |
| **Switch**        | UniFi 24 PoE        | Core Switching, PoE     |
