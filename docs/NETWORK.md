# Network Architecture

Network configuration: subnet design, IP addressing, DNS, naming conventions.

## Network Overview

**VLAN-Based Segmentation**: Network segmented using VLANs managed by UDM Pro

**Homelab Primary Network**: `10.20.11.0/24` (VLAN 11 - VM-Servers)
- All Proxmox hosts, VMs, K3s cluster, services on VLAN 11
- Layer 3 switching via USW-Enterprise-24-PoE (VLAN-aware)
- Proxmox nodes use VLAN-aware bridge configuration

**External Access**: VPN via UDM Pro (WireGuard/L2TP)

## VLAN Structure

The network uses multiple VLANs for proper segmentation:

| VLAN ID | Name                | Subnet           | Gateway      | Purpose                                   | Used By Homelab |
| ------- | ------------------- | ---------------- | ------------ | ----------------------------------------- | --------------- |
| `10`    | Core-Infrastructure | `10.20.10.0/24`  | `10.20.10.1` | Network equipment, core infrastructure    | No (separate)   |
| `11`    | VM-Servers          | `10.20.11.0/24`  | `10.20.11.1` | **Proxmox cluster, VMs, K3s, services**   | **Yes (primary)** |
| `12`    | Personal            | `10.20.12.0/24`  | `10.20.12.1` | Personal devices and workstations         | No              |
| `13`    | IoT                 | `10.20.13.0/24`  | `10.20.13.1` | IoT devices, Home Assistant targets       | Via K8s ingress |

**Note:** Homelab uses **VLAN 10** for storage devices and **VLAN 11** for Proxmox nodes/VMs. Inter-VLAN routing via Layer 3 switch.

## IP Address Allocation

### Core Infrastructure - VLAN 10 (10.20.10.0/24)

| IP Address    | Hostname              | Description                    | Device Type       |
| ------------- | --------------------- | ------------------------------ | ----------------- |
| `10.20.10.1`  | `udm.home.arpa`       | UniFi Dream Machine Pro        | Gateway/Router    |
| `10.20.10.2`  | `switch.home.arpa`    | USW-Enterprise-24-PoE          | Switch            |
| `10.20.10.20` | `nas.lab`             | UNAS Pro (Primary NAS)         | Storage           |

**Note:**
- DNS uses `.lab` suffix temporarily (UniFi limitation with nested subdomains)
- Synology is on VLAN 11 (see VM Servers section)

### VM Servers - VLAN 11 (10.20.11.0/24)

| IP Address    | Hostname              | Description                    | Device Type       |
| ------------- | --------------------- | ------------------------------ | ----------------- |
| `10.20.11.1`  | -                     | Gateway (routes to VLAN 10)    | Virtual Gateway   |
| `10.20.11.11` | `pve-01.home.arpa`    | Proxmox Node 1 (GPU)           | Compute           |
| `10.20.11.12` | `pve-02.home.arpa`    | Proxmox Node 2                 | Compute           |
| `10.20.11.13` | `pve-03.home.arpa`    | Proxmox Node 3                 | Compute           |
| `10.20.11.21` | `kvm-01.home.arpa`    | JetKVM for pve-01              | Out-of-Band Mgmt  |
| `10.20.11.22` | `kvm-02.home.arpa`    | JetKVM for pve-02              | Out-of-Band Mgmt  |
| `10.20.11.23` | `kvm-03.home.arpa`    | JetKVM for pve-03              | Out-of-Band Mgmt  |
| `10.20.11.10` | `synology.lab`        | Synology DS713+ (Backup NAS)   | Storage           |

### Kubernetes VMs (10.20.11.80-10.20.11.99)

| IP Address    | Hostname                 | Description                    | Proxmox Host |
| ------------- | ------------------------ | ------------------------------ | ------------ |
| `10.20.11.80` | `k3s-cp-01.home.arpa`    | K3s Control Plane 1            | pve-02       |
| `10.20.11.81` | `k3s-cp-02.home.arpa`    | K3s Control Plane 2            | pve-03       |
| `10.20.11.85` | `k3s-gpu-01.home.arpa`   | K3s GPU Worker                 | pve-01       |

**VM Specifications:**
- **Control Plane Nodes**: 4 vCPU, 8GB RAM, 50GB disk
- **GPU Worker Node**: 8 vCPU, 16GB RAM, 100GB disk, RTX 4000 Ada passthrough

### LoadBalancer IP Pool (10.20.11.200-10.20.11.210)

Reserved for MetalLB to assign LoadBalancer service IPs (11 addresses available).

**Example services:**
- Traefik Ingress: 10.20.11.200
- Home Assistant: 10.20.11.201
- Grafana: 10.20.11.202
- etc.

## DNS Configuration

### Local DNS (UDM Pro)
- **Domain**: `home.arpa` (RFC 8375 compliant)
- **DNS Server**: UDM Pro built-in DNS (10.20.11.1)
- **Resolution**: All `.home.arpa` hostnames resolve locally

### Public DNS (Cloudflare)
- **Domain**: `codeofficer.com`
- **Subdomain**: `*.lab.codeofficer.com` for homelab services
- **Purpose**: Let's Encrypt wildcard certificates via DNS-01 challenge
- **Access**: Services only accessible via VPN, DNS records point to internal IPs

**Example public DNS records:**
```
homeassistant.lab.codeofficer.com  A  10.20.11.201
n8n.lab.codeofficer.com            A  10.20.11.202
grafana.lab.codeofficer.com        A  10.20.11.203
```

## Network Services

### DHCP
- **Server**: UDM Pro
- **Scope**: Dynamic range not defined (infrastructure uses static IPs)
- **Reservations**: Not used (VMs use cloud-init static IPs)

### Firewall
- **Device**: UDM Pro
- **VPN Access**: WireGuard/L2TP for remote access

### NFS/SMB
- **UNAS Pro (nas.home.arpa)**: Primary NFS storage for Proxmox/K8s
- **Synology (synology.home.arpa)**: NFS for Proxmox backups
- **SMB**: Mac Time Machine backups to UNAS Pro

## Network Topology

```
Internet
   |
[UDM Pro] (10.20.11.1) - Gateway/Router/DNS/VPN
   |
[USW-Enterprise-24-PoE] (10.20.10.2) - Layer 3 Switch, 2.5GbE + 10G SFP+
   |
   ├─ Port 3:  Synology DS713+ (1 GbE)
   ├─ Port 4:  pve-01 (2.5 GbE) - GPU Node
   ├─ Port 11: pve-03 (2.5 GbE)
   ├─ Port 9:  pve-02 (2.5 GbE)
   ├─ Port 14: kvm-01 (PoE FE)
   ├─ Port 7:  kvm-02 (PoE FE)
   ├─ Port 6:  kvm-03 (PoE FE)
   ├─ Port 25: UNAS Pro (10G SFP+)
   └─ Port 24: Uplink to UDM Pro (2.5 GbE)

Proxmox Cluster (homelab-cluster)
├─ pve-01 (10.20.11.11) - RTX 4000 Ada GPU
│  └─ k3s-gpu-01 VM (10.20.11.85) - GPU passthrough
├─ pve-02 (10.20.11.12)
│  └─ k3s-cp-01 VM (10.20.11.80) - Control plane
└─ pve-03 (10.20.11.13)
   └─ k3s-cp-02 VM (10.20.11.81) - Control plane

K3s Cluster
├─ Control Plane: k3s-cp-01 + k3s-cp-02 (embedded etcd HA)
└─ Workers: k3s-gpu-01 (GPU workloads)
   └─ MetalLB: 10.20.11.200-210 (LoadBalancer IPs)
```

## Bandwidth Allocation

- **Compute Nodes**: 2.5 GbE (dual NICs available per node)
- **UNAS Pro**: 10 GbE SFP+ (high-speed storage)
- **Synology**: 1 GbE (sufficient for backups)
- **Uplink**: 2.5 GbE to UDM Pro

## Network Security

### Current State
- VLAN segmentation implemented (VLANs 10, 11, 12, 13)
- Homelab isolated on VLAN 11
- VPN required for remote access
- UDM Pro firewall handles perimeter and inter-VLAN routing
- Layer 3 switch enables VLAN isolation

### Future Considerations
- K3s network policies for pod-level isolation
- Service-level firewall rules
- Inter-VLAN rules for IoT access from homelab services

## Proxmox VLAN Configuration

All Proxmox nodes configured with VLAN-aware networking:

**Bridge Configuration (vmbr0):**
- VLAN-aware bridge on all nodes
- VLAN 11 tagged for VM network
- Proxmox host management on VLAN 11
- VMs assigned to VLAN 11 via cloud-init

## Notes

- Network segmented with VLANs
- Homelab infrastructure on VLAN 11 (VM-Servers)
- Static IP addressing throughout
- VPN provides secure remote access
- Let's Encrypt certificates avoid browser warnings
- VLAN structure provides security boundaries
