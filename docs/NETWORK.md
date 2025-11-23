# Network Architecture

This document details the network configuration, including VLANs, IP addressing, and DNS.

## VLANs

A segmented network is used to isolate traffic and improve security.

| VLAN ID | Name       | Subnet             | Gateway      | Purpose                                   |
| ------- | ---------- | ------------------ | ------------ | ----------------------------------------- |
| `10`    | Management | `10.10.10.0/24`    | `10.10.10.1` | Proxmox hosts, Switches, APs, UDM         |
| `20`    | Server     | `10.10.20.0/24`    | `10.10.20.1` | VMs and Kubernetes (k3s) nodes            |
| `30`    | Kubernetes | `10.10.30.0/24`    | `10.10.30.1` | K8s services, Ingress IPs, Load Balancers |
| `40`    | IoT        | `10.10.40.0/24`    | `10.10.40.1` | Untrusted IoT devices, Home Assistant     |
| `50`    | Guest      | `10.10.50.0/24`    | `10.10.50.1` | Guest WiFi access                         |
| `99`    | Black Hole | `192.168.254.0/24` | -            | Unused ports, sinkhole traffic            |

## IP Address Allocation

### Static IPs - Management (VLAN 10)

| IP Address    | Hostname      | Description         |
| ------------- | ------------- | ------------------- |
| `10.10.10.1`  | `udm`         | UniFi Dream Machine |
| `10.10.10.2`  | `unifi-sw-24` | UniFi 24 PoE Switch |
| `10.10.10.10` | `pve-node-01` | Proxmox Node 1      |
| `10.10.10.11` | `pve-node-02` | Proxmox Node 2      |
| `10.10.10.12` | `pve-node-03` | Proxmox Node 3      |
| `10.10.10.20` | `unas-pro`    | UNAS Pro NAS        |
| `10.10.10.21` | `synology`    | Synology SAN        |

### DHCP Ranges

- **Server (VLAN 20):** `10.10.20.100` - `10.10.20.200`
- **IoT (VLAN 40):** `10.10.40.100` - `10.10.40.200`
- **Guest (VLAN 50):** `10.10.50.100` - `10.10.50.200`

## DNS

- **Internal DNS:** TBD (e.g., UDM, Pi-hole)
- **Local Domain:** `home.arpa`
