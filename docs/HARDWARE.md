# Hardware

Physical hardware specifications for the homelab.

## Compute Nodes

3 identical Minisforum MS-01 Workstations form the Proxmox cluster.

| Hostname   | Make/Model       | CPU                       | RAM   | Storage    | GPU                 | Management | Purpose              |
| ---------- | ---------------- | ------------------------- | ----- | ---------- | ------------------- | ---------- | -------------------- |
| `pve-01`   | Minisforum MS-01 | Intel i9-12900H (14C/20T) | 96 GB | 1TB NVMe   | NVIDIA RTX 4000 Ada | JetKVM     | GPU Worker Node      |
| `pve-02`   | Minisforum MS-01 | Intel i9-12900H (14C/20T) | 96 GB | 1TB NVMe   | —                   | JetKVM     | K3s Control Plane    |
| `pve-03`   | Minisforum MS-01 | Intel i9-12900H (14C/20T) | 96 GB | 1TB NVMe   | —                   | JetKVM     | K3s Control Plane    |

### K3s Virtual Machine Allocation

| VM Name      | Host     | VMID | IP Address   | CPU   | RAM   | Disk   | Role | Taint |
|--------------|----------|------|--------------|-------|-------|--------|------|-------|
| `k3s-cp-01`  | pve-02   | 200  | 10.20.11.80  | 4 cores | 64 GB | 50 GB  | Control Plane + Workloads | — |
| `k3s-cp-02`  | pve-03   | 201  | 10.20.11.81  | 4 cores | 64 GB | 50 GB  | Control Plane + Workloads | — |
| `k3s-gpu-01` | pve-01   | 210  | 10.20.11.85  | 8 cores | 64 GB | 800 GB | GPU Worker | `dedicated=gpu:NoSchedule` |

**Notes:**
- K3s server nodes (CP) are schedulable for general workloads
- GPU node is tainted - only GPU-requiring workloads (with toleration) can run there
- All VMs use QEMU/KVM with cloud-init for bootstrap
- GPU VM uses OVMF BIOS + Q35 machine type for PCIe passthrough

### Detailed Specifications: Minisforum MS-01

- **CPU**: Intel Core i9-12900H (Alder Lake, 12th Gen)
  - 14 cores (6 P-cores + 8 E-cores)
  - 20 threads
  - Base: 2.5 GHz, Turbo: up to 5.0 GHz
  - Cache: 24 MB
  - TDP: 45W (base), configurable up to 115W
- **RAM**: 96 GB DDR5-4800 (ECC supported)
- **Storage**: Kingston NV2 1TB M.2 2280 NVMe (PCIe 4.0 Gen 4x4, up to 3500 MB/s) - Model: SNV2S/1000G
- **Network**: Dual Intel 2.5GbE NICs
- **Expansion**: PCIe 4.0 x16 slot, Thunderbolt 4 ports
- **Form Factor**: Compact workstation with excellent cooling
- **Management**: Each node has dedicated JetKVM for out-of-band access

### GPU Specifications: NVIDIA RTX 4000 Ada (pve-01 only)

- **Connection**: External GPU via Thunderbolt 4 (Sonnet Breakaway Box Developer Edition)
- **Architecture**: Ada Lovelace
- **CUDA Cores**: 6,144
- **Tensor Cores**: 192 (4th gen)
- **RT Cores**: 48 (3rd gen)
- **VRAM**: 20 GB GDDR6 with ECC
- **Memory Bandwidth**: 360 GB/s
- **TDP**: 130W
- **Interface**: PCIe Gen 4 x16 (via Thunderbolt 4)
- **PCI ID**: `10de:27b2`
- **PCI Address**: `0000:2f:00`
- **IOMMU Group**: 17
- **Proxmox Mapping**: `rtx4000ada` (Datacenter > Resource Mappings > PCI)
- **Display**: 4x Mini DisplayPort 1.4a
- **Compute**: CUDA 8.9, DirectX 12 Ultimate
- **Use Cases**: AI inference, LLM hosting, computer vision, GPU compute

**GPU Passthrough Requirements:**
- VM machine type: `q35`
- VM BIOS: `ovmf` (UEFI)
- EFI disk required for OVMF boot
- Kernel params in VM: `net.ifnames=0 biosdevname=0` (for cloud-init NIC naming)

## Storage

| Device       | Model/Type | Capacity | RAID | Protocols | Intended Use                                  |
| ------------ | ---------- | -------- | ---- | --------- | --------------------------------------------- |
| **NAS**      | UNAS Pro (2U rack) | 40TB usable (3x WD 20TB Red Pro) | RAID 5 | NFS, SMB, 10GbE | Proxmox storage (VMStorage), K3s PVs (K3sStorage), Media |
| **Backup**   | Synology DS713+ | 6TB usable (2x WD Red Pro 6TB) | RAID 1 | NFS, SMB | Proxmox VM backups (K3s backups moved to UNAS in Phase 5.3) |

### Detailed Storage Specifications

#### UNAS Pro (Primary Storage - nas.home.arpa, 10.20.10.20)
- **Model**: UNAS PRO 2U rack-mount NAS
- **Bays**: 7x 2.5"/3.5" drive bays (3 currently populated, 4 available for expansion)
- **Drives**: 3x Western Digital Red Pro 7200 RPM SATA III 3.5" 20TB (WD Red Pro NAS HDD)
- **RAID**: RAID 5 (2 drives data + 1 parity = ~40TB usable)
- **Network**: 10 Gbps performance (connected via SFP+ port 25 on switch)
- **Protocols**: NFS (primary), SMB (Mac Time Machine backups)
- **NFS Exports** (isolated for security):
  - `/volume1/pve-vmstorage` → VMStorage (Proxmox only: ISOs, VM templates, backups)
  - `/volume1/k3s-storage` → K3sStorage (K3s only: app data, models, media)
- **Use Cases**:
  - Proxmox ISO storage, VM templates
  - K3s persistent volumes (app data via nfs-client StorageClass)
  - Shared application data
  - Mac Time Machine backups

#### Synology DS713+ (Secondary Backup - synology.home.arpa, 10.20.11.10)
- **Model**: Synology DS713+ (2-bay NAS)
- **Drives**: 2x Western Digital WD Red Pro 6TB NAS 7200 RPM SATA 6 Gb/s 256MB Cache (WD6003FFBX)
- **RAID**: RAID 1 (mirror, 6TB usable)
- **Network**: 1 Gbps Ethernet (connected via port 3 on switch)
- **Protocols**: NFS (primary), SMB
- **Status**: Currently unused for K3s (all backups consolidated to UNAS in Phase 5.3)
- **Use Cases**:
  - Proxmox VM/CT backups (separate from production storage)
  - Available for offsite backup copies (3-2-1 rule) if needed
  - Critical configuration backups

### Proxmox Storage Pools

| Pool Name | Type | Location | Capacity | Content Types | Purpose |
|-----------|------|----------|----------|---------------|---------|
| `local` | Directory | `/var/lib/vz` | ~100GB | ISO, templates | ISO images, container templates |
| `local-zfs` | ZFS | Local NVMe | ~950GB | VM disks, images | Fast VM storage, template builds |
| `nas-vmstorage` | NFS | UNAS Pro | ~37TB | VM disks, ISO, backups | Shared cluster storage |

#### local-zfs (Fast Local Storage)
- **Type**: ZFS pool on local NVMe
- **Performance**: ~3500 MB/s, <0.1ms latency
- **Scope**: Per-node (not shared)
- **Use Cases**:
  - VM template builds (fast I/O for OS install)
  - High-performance VM disks
  - Temporary/scratch storage
- **Note**: Templates built here must be migrated to shared storage for cluster-wide access

#### nas-vmstorage (Shared NFS Storage)
- **Type**: NFS mount from UNAS Pro
- **Server**: 10.20.10.20 (UNAS Pro)
- **Export Path**: `/volume1/pve-vmstorage`
- **Mount Point**: `/mnt/pve/nas-vmstorage`
- **Performance**: ~1000 MB/s (10GbE), 1-5ms latency
- **Scope**: Cluster-wide (all nodes see same content)
- **Content Types**: `images,iso,backup,vztmpl`
- **Use Cases**:
  - VM templates (shared across cluster)
  - VM disks for live migration
  - ISO images (shared)
  - Backups
- **Folder Structure**:
  ```
  /mnt/pve/nas-vmstorage/
  ├── dump/           # VM backups
  ├── images/         # VM disk images (VMID folders)
  │   └── 9000/       # Template disk
  ├── iso/            # ISO images (if stored here)
  └── template/       # Container templates
  ```

#### Storage Strategy: Build Local, Share Global
For VM template creation:
1. **Build** on `local-zfs` (fast NVMe, ~10-15 min)
2. **Migrate** disk to `nas-vmstorage` after build
3. **Result**: Template accessible from all cluster nodes

```bash
# After template build completes:
qm move-disk 9000 scsi0 nas-vmstorage --delete
```

This approach avoids slow NFS I/O during intensive build operations while still achieving cluster-wide template availability.

## Networking

| Device            | Make/Model                    | Purpose                          |
| ----------------- | ----------------------------- | -------------------------------- |
| **Router**        | UniFi Dream Machine Pro       | Gateway, Firewall, VPN, DNS      |
| **Switch**        | USW-Enterprise-24-PoE         | Layer 3 Switching, 2.5GbE PoE+   |
| **Out-of-Band**   | 3x JetKVM                     | Remote KVM access per node       |
| **WiFi**          | U6-Pro + 2x U6-Lite           | Wireless access points           |

### Detailed Network Specifications

#### UniFi Dream Machine Pro (udm.home.arpa)
- **Model**: UDM Pro
- **Firmware**: Network 9.2.87 (as of Phase 0)
- **Ports**: 1x WAN, 8x GbE LAN, 1x 10G SFP+ WAN, 1x 10G SFP+ LAN
- **Features**: Integrated gateway, firewall, VPN server (WireGuard/L2TP), DNS server, IDS/IPS
- **Management IP**: 10.20.11.1
- **DNS**: Built-in DNS server (home.arpa domain)

#### USW-Enterprise-24-PoE (switch.home.arpa)
- **Model**: USW-Enterprise-24-PoE
- **Version**: Device Version 7.2.120
- **Layer**: Layer 3 capable switch
- **Ports**: 24x 2.5 GbE PoE+ ports, 2x 10G SFP+ uplinks
- **PoE**: 2.5 GbE PoE+ on all 24 ports
- **Management IP**: 10.20.11.2
- **Key Connections**:
  - Port 3: Synology DS713+ (1 GbE)
  - Port 4: pve-01 (2.5 GbE)
  - Port 6: kvm-03 (PoE)
  - Port 7: kvm-02 (PoE)
  - Port 11: pve-03 (2.5 GbE)
  - Port 14: kvm-01 (PoE)
  - Port 24: Uplink to UDM Pro (2.5 GbE)
  - Port 25: UNAS Pro (10G SFP+)
  - Port 26: Management connection (1 GbE SFP+)
  - K3s VMs: Bridge via Proxmox hosts (10.20.11.80, 81, 85)

#### JetKVM Units (Out-of-Band Management)
- **Quantity**: 3 units (one per compute node)
- **Purpose**: Remote KVM-over-IP access for BIOS, OS installation, troubleshooting
- **Connection**: Dedicated management via PoE
- **Hostnames & IPs**:
  - kvm-01.home.arpa → 10.20.11.21 (manages pve-01)
  - kvm-02.home.arpa → 10.20.11.22 (manages pve-02)
  - kvm-03.home.arpa → 10.20.11.23 (manages pve-03)

#### Wireless Access Points
- **U6-Pro**: WiFi 6 (802.11ax), high-performance AP
- **2x U6-Lite**: WiFi 6 (802.11ax), standard APs
- **Note**: Not critical for homelab operations, supports guest/IoT networks
