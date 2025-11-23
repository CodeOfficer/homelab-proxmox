# Network Architecture

This document details the network configuration, including subnet design, IP addressing, DNS, and naming conventions.

## Network Overview

**Primary Network**: `10.20.11.0/24` (VM-Servers network)
- Single flat network for all homelab infrastructure
- No VLAN segmentation (simplified design)
- Managed by UniFi Dream Machine Pro
- Layer 3 switching via USW-Enterprise-24-PoE

**External Access**: VPN via UDM Pro (WireGuard/L2TP)

## IP Address Allocation

### Infrastructure (10.20.11.1-10.20.11.30)

| IP Address    | Hostname              | Description                    | Device Type       |
| ------------- | --------------------- | ------------------------------ | ----------------- |
| `10.20.11.1`  | `udm.home.arpa`       | UniFi Dream Machine Pro        | Gateway/Router    |
| `10.20.11.2`  | `switch.home.arpa`    | USW-Enterprise-24-PoE          | Switch            |
| `10.20.11.10` | `synology.home.arpa`  | Synology DS713+ (Backup NAS)   | Storage           |
| `10.20.11.11` | `pve-01.home.arpa`    | Proxmox Node 1 (GPU)           | Compute           |
| `10.20.11.12` | `pve-02.home.arpa`    | Proxmox Node 2                 | Compute           |
| `10.20.11.13` | `pve-03.home.arpa`    | Proxmox Node 3                 | Compute           |
| `10.20.11.20` | `nas.home.arpa`       | UNAS Pro (Primary NAS)         | Storage           |
| `10.20.11.21` | `kvm-01.home.arpa`    | JetKVM for pve-01              | Out-of-Band Mgmt  |
| `10.20.11.22` | `kvm-02.home.arpa`    | JetKVM for pve-02              | Out-of-Band Mgmt  |
| `10.20.11.23` | `kvm-03.home.arpa`    | JetKVM for pve-03              | Out-of-Band Mgmt  |

### Kubernetes VMs (10.20.11.80-10.20.11.99)

| IP Address    | Hostname                 | Description                    | Proxmox Host |
| ------------- | ------------------------ | ------------------------------ | ------------ |
| `10.20.11.80` | `k3s-cp-01.home.arpa`    | K3s Control Plane 1            | pve-02       |
| `10.20.11.81` | `k3s-cp-02.home.arpa`    | K3s Control Plane 2            | pve-03       |
| `10.20.11.85` | `k3s-gpu-01.home.arpa`   | K3s GPU Worker                 | pve-01       |

**VM Specifications:**
- **Control Plane Nodes**: 4 vCPU, 8GB RAM, 50GB disk
- **GPU Worker Node**: 8 vCPU, 16GB RAM, 100GB disk, RTX 4000 Ada passthrough

### LoadBalancer IP Pool (10.20.11.200-10.20.11.220)

Reserved for MetalLB to assign LoadBalancer service IPs (21 addresses available).

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
- **Configuration**: TBD (Phase 1)
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
[USW-Enterprise-24-PoE] (10.20.11.2) - Layer 3 Switch, 2.5GbE + 10G SFP+
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
   └─ MetalLB: 10.20.11.200-220 (LoadBalancer IPs)
```

## Bandwidth Allocation

- **Compute Nodes**: 2.5 GbE (dual NICs available per node)
- **UNAS Pro**: 10 GbE SFP+ (high-speed storage)
- **Synology**: 1 GbE (sufficient for backups)
- **Uplink**: 2.5 GbE to UDM Pro

## Network Security

### Current State
- Single network (no segmentation)
- VPN required for remote access
- UDM Pro firewall protects perimeter

### Future Considerations (Optional)
- VLAN segmentation (Management, Server, IoT, Guest)
- Network policies in K3s for pod isolation
- Additional firewall rules for service-level security

## Notes

- Network design prioritizes simplicity over complexity
- All infrastructure uses static IP addressing
- VPN access provides secure remote connectivity
- Let's Encrypt certificates avoid browser warnings
- Can add VLAN segmentation later if needed
