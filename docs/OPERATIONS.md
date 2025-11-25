# Operations Guide

This document contains operational procedures, administrative tasks, and step-by-step instructions for maintaining the homelab infrastructure.

**Last Updated:** 2025-11-25

---

## SSH Access to Proxmox Nodes

### Initial Setup (One-time)

SSH key authentication is configured for password-less access to all Proxmox nodes.

**Public Key Location:** `~/.ssh/id_ed25519.pub`

**Key Fingerprint:** `ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIDI6acDm78Cj0ntqjVqYsNTbJNvB/nUOyvk9JBnDXfhv`

### Setup Procedure

If SSH keys need to be added to new nodes or reinstalled:

```bash
# 1. Clear old host keys (if nodes were reinstalled)
ssh-keygen -R 10.20.11.11
ssh-keygen -R 10.20.11.12
ssh-keygen -R 10.20.11.13

# 2. Copy SSH key to each node (will prompt for root password)
ssh-copy-id root@10.20.11.11
ssh-copy-id root@10.20.11.12
ssh-copy-id root@10.20.11.13

# 3. Test connection (should not prompt for password)
ssh root@10.20.11.11
ssh root@10.20.11.12
ssh root@10.20.11.13
```

### Connecting to Nodes

```bash
# SSH to specific node
ssh root@10.20.11.11  # pve-01 (GPU node)
ssh root@10.20.11.12  # pve-02
ssh root@10.20.11.13  # pve-03

# Or by hostname (if DNS configured)
ssh root@pve-01.home.arpa
ssh root@pve-02.home.arpa
ssh root@pve-03.home.arpa
```

---

## Common Administrative Tasks

### Checking Cluster Status

```bash
# From any node in the cluster
pvecm status          # Cluster membership and quorum
pvecm nodes           # List all nodes
pveversion -v         # Proxmox version on all nodes
```

### Checking Network Configuration

```bash
# View network interfaces
ip addr show

# View network bridges
ip link show type bridge

# Check bridge details
brctl show

# View Proxmox network config
cat /etc/network/interfaces

# Verify VLAN-aware is enabled (should see vlan_filtering 1)
ip -d link show vmbr0 | grep vlan
```

### Network Configuration Details

**Current Configuration (all nodes):**
- Bridge: vmbr0 (VLAN-aware enabled)
- Network: 10.20.11.0/24 (VLAN 11 - VM-Servers)
- Gateway: 10.20.11.1 (UDM Pro)
- DNS: 10.20.11.1 (UDM Pro)
- Search domain: home.arpa
- NTP: chrony (synced and active)

**Node IP Addresses:**
- pve-01: 10.20.11.11/24 (GPU node)
- pve-02: 10.20.11.12/24
- pve-03: 10.20.11.13/24

### Enabling VLAN-Aware Bridge

If VLAN-aware needs to be enabled or verified:

```bash
# Check current bridge config
cat /etc/network/interfaces | grep -A 7 "iface vmbr0"

# Add VLAN-aware to bridge (if not present)
# Edit /etc/network/interfaces and add this line under "iface vmbr0":
#   bridge-vlan-aware yes

# Apply configuration without reboot
ifreload -a

# Verify VLAN filtering is enabled
ip -d link show vmbr0 | grep vlan_filtering
# Should show: vlan_filtering 1
```

**Note:** VLAN-aware bridge allows VMs to use VLAN tagging. VMs can be assigned to specific VLANs when creating network interfaces in the Proxmox UI.

### Checking Storage

```bash
# List all storage
pvesm status

# Check disk usage
df -h

# Check ZFS pools (if using ZFS)
zpool status
zpool list

# Check NFS mounts
df -h | grep nfs
mount | grep nfs
```

### Storage Configuration

**Local Storage (each node):**
- **local-zfs**: VM disks (ZFS pool, ~900GB per node)
- **local**: ISOs, templates, backups (directory storage)

**Network Storage (NFS from UNAS Pro):**
- **nas-vmstorage**: Shared storage for ISOs, templates, backups
  - Server: 10.20.10.20 (nas.lab)
  - Export: `/volume/567898ba-8471-4adb-9be9-d3e1f96fa7ba/.srv/.unifi-drive/VMStorage/.data`
  - Mount: `/mnt/pve/nas-vmstorage`
  - Capacity: 37TB total, ~31TB available
  - Content types: ISO images, VM templates, backups
  - Available on all three nodes

### NFS Storage Operations

**Test NFS connectivity:**
```bash
# Show available NFS exports from UNAS
showmount -e 10.20.10.20

# Test mount manually
mount -t nfs 10.20.10.20:/volume/567898ba-8471-4adb-9be9-d3e1f96fa7ba/.srv/.unifi-drive/VMStorage/.data /mnt/test
```

**Add NFS storage (if removed):**
```bash
pvesm add nfs nas-vmstorage \
  --path /mnt/pve/nas-vmstorage \
  --server 10.20.10.20 \
  --export /volume/567898ba-8471-4adb-9be9-d3e1f96fa7ba/.srv/.unifi-drive/VMStorage/.data \
  --content iso,vztmpl,backup \
  --nodes pve-01,pve-02,pve-03
```

**Remove NFS storage:**
```bash
pvesm remove nas-vmstorage
```

**Note:** UNAS Pro is on VLAN 10 (Core-Infrastructure). Proxmox nodes on VLAN 11 access it via Layer 3 routing through the switch.

### System Updates

```bash
# Update package lists
apt update

# List available updates
apt list --upgradable

# Apply updates (do one node at a time)
apt upgrade -y

# Reboot if needed
reboot
```

---

## JetKVM Access

JetKVM devices provide out-of-band access to each node for BIOS configuration and boot monitoring.

**Access URLs:**
- pve-01 JetKVM: http://10.20.11.21
- pve-02 JetKVM: http://10.20.11.22
- pve-03 JetKVM: http://10.20.11.23

**Note:** JetKVM devices are powered by the MS-01 nodes they manage. When a node reboots, the JetKVM will temporarily lose power and disconnect.

**Use Cases:**
- BIOS configuration changes
- Boot order modification
- Monitoring boot process during installation
- Emergency console access when network is down

---

## Troubleshooting

### Cannot SSH to Node

```bash
# 1. Check if node is reachable
ping 10.20.11.11

# 2. Check if SSH service is running (from another node or JetKVM console)
systemctl status sshd

# 3. Verify SSH key is installed
ssh -v root@10.20.11.11
```

### Cluster Node Offline

```bash
# Check cluster status
pvecm status

# Check node status from web UI
# Datacenter > Cluster > Nodes

# Restart cluster services (on problematic node)
systemctl restart pve-cluster
systemctl restart corosync
```

### Network Issues

```bash
# Check interface status
ip link show

# Check if bridge is up
ip link show vmbr0

# Restart networking (will disconnect!)
systemctl restart networking

# Check Proxmox network daemon
systemctl status pveproxy
```

---

## Emergency Procedures

### Single Node Failure

- Cluster continues to operate with 2/3 nodes (quorum maintained)
- VMs on failed node will be unavailable until node recovers
- Do not force-remove node unless permanently failed

### Loss of Quorum (2+ nodes down)

```bash
# On remaining node, set expected votes to 1 (EMERGENCY ONLY)
pvecm expected 1

# After other nodes recover, reset to normal
pvecm expected 3
```

### Cluster Split Brain

- Never modify expected votes on multiple nodes
- Always resolve by bringing nodes back online
- Use JetKVM for console access if network is down

---

## Maintenance Windows

### Planned Node Reboot

```bash
# 1. Migrate VMs to other nodes (or shutdown non-critical VMs)
# 2. Put node in maintenance mode (optional)
# 3. Reboot
reboot

# 4. Wait for node to rejoin cluster
pvecm status
```

### Cluster-Wide Updates

1. Update one node at a time
2. Verify node rejoins cluster before proceeding
3. Migrate VMs away from node before updating (optional)
4. Update order: pve-03 → pve-02 → pve-01 (GPU node last)

---

## Backup and Recovery

*TODO: Add procedures as backup strategy is implemented*

---

## Notes

- Always use SSH keys for authentication (never password)
- Keep this document updated as new procedures are established
- Document any non-standard configurations or workarounds
- Include actual commands that work, not just concepts
