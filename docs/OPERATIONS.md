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

## SSH Access to K3s VMs

### SSH Key Configuration

**Key used for VMs:** `~/.ssh/id_ed25519`
**User:** `ubuntu`

VMs are provisioned via cloud-init with the SSH public key from `TF_VAR_vm_ssh_keys`.

### Connecting to VMs

```bash
# Direct SSH (must specify key to avoid conflicts with ~/.ssh/config)
ssh -o IdentitiesOnly=yes -i ~/.ssh/id_ed25519 ubuntu@10.20.11.80  # k3s-cp-01
ssh -o IdentitiesOnly=yes -i ~/.ssh/id_ed25519 ubuntu@10.20.11.81  # k3s-cp-02
ssh -o IdentitiesOnly=yes -i ~/.ssh/id_ed25519 ubuntu@10.20.11.85  # k3s-gpu-01
```

### SSH Config Override Issue

If `~/.ssh/config` defines `IdentityFile` for all hosts, SSH may try wrong keys first and fail with "Too many authentication failures". Use `-o IdentitiesOnly=yes` to force the specified key.

### Ansible SSH Configuration

Ansible inventory must include explicit SSH settings to avoid key conflicts:

```yaml
all:
  vars:
    ansible_user: ubuntu
    ansible_ssh_private_key_file: ~/.ssh/id_ed25519
    ansible_ssh_common_args: '-o StrictHostKeyChecking=no -o IdentitiesOnly=yes -i ~/.ssh/id_ed25519'
```

The `-i` flag in `ansible_ssh_common_args` is redundant but ensures the key is used even if other SSH config interferes.

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

---

## GPU Passthrough Configuration (pve-01 only)

### eGPU Hardware Details

**Device:** NVIDIA RTX 4000 Ada Generation
**Connection:** Thunderbolt 4 via Sonnet Breakaway Box Developer Edition
**PCI Address:** 0000:2f:00.0 (GPU), 0000:2f:00.1 (Audio)
**PCI IDs:** 10de:27b2 (GPU), 10de:22bc (Audio)
**IOMMU Group:** 17 (GPU and audio controller isolated together)

### Configuration Files

**GRUB Configuration (`/etc/default/grub`):**
```bash
GRUB_CMDLINE_LINUX_DEFAULT="quiet intel_iommu=on iommu=pt"
```

**VFIO Modules (`/etc/modules-load.d/vfio.conf`):**
```
vfio
vfio_iommu_type1
vfio_pci
vfio_virqfd
```

**Nouveau Blacklist (`/etc/modprobe.d/blacklist-nouveau.conf`):**
```
blacklist nouveau
options nouveau modeset=0
```

**Thunderbolt Auto-Authorization (`/etc/udev/rules.d/99-thunderbolt-egpu.rules`):**
```
# Auto-authorize Sonnet Breakaway Box eGPU enclosure
ACTION=="add", SUBSYSTEM=="thunderbolt", ATTR{device_name}=="Breakaway Box Developer Edition", ATTR{authorized}=="0", ATTR{authorized}="1"
```

### Proxmox PCI Device Mapping

**Mapping ID:** `rtx4000ada`
**Description:** NVIDIA RTX 4000 Ada Generation (eGPU via Thunderbolt)

**View mapping:**
```bash
pvesh get /cluster/mapping/pci --output-format json-pretty
```

### Verifying GPU Configuration

**Check IOMMU is enabled:**
```bash
dmesg | grep -i iommu | head -20
# Should show: "DMAR-IR: IOAPIC" and "iommu: Default domain type: Translated"
```

**Check VFIO modules loaded:**
```bash
lsmod | grep vfio
# Should show: vfio_pci, vfio_iommu_type1, vfio, etc.
```

**Check nouveau driver is NOT loaded:**
```bash
lsmod | grep nouveau
# Should return nothing
```

**Check Thunderbolt authorization:**
```bash
cat /sys/bus/thunderbolt/devices/1-1/authorized
# Should return: 1
cat /sys/bus/thunderbolt/devices/1-1/device_name
# Should return: Breakaway Box Developer Edition
```

**Verify GPU is detected:**
```bash
lspci -nn | grep -i nvidia
# Should show:
# 2f:00.0 VGA compatible controller [0300]: NVIDIA Corporation AD104GL [RTX 4000 Ada Generation] [10de:27b2]
# 2f:00.1 Audio device [0403]: NVIDIA Corporation AD104 High Definition Audio Controller [10de:22bc]
```

**Check IOMMU groups:**
```bash
for d in /sys/kernel/iommu_groups/*/devices/*; do
    n=${d#*/iommu_groups/*}; n=${n%%/*}
    printf 'IOMMU Group %s ' "$n"
    lspci -nns "${d##*/}"
done | grep 2f:00
# Should show GPU and audio in IOMMU Group 17
```

### Using GPU in VMs

**Option 1: Via PCI Device Mapping (Recommended)**
- In VM Hardware tab, click "Add" → "PCI Device"
- Select "Mapping: rtx4000ada"
- Enable "All Functions" to include audio controller
- Enable "Primary GPU" if using for display output
- Enable "PCI-Express" for better performance

**Option 2: Via CLI**
```bash
# Add GPU passthrough to VM (replace VMID with actual VM ID)
qm set VMID -hostpci0 mapping=rtx4000ada,pcie=1
```

### Troubleshooting

**GPU not detected after reboot:**
1. Check Thunderbolt enclosure is powered on
2. Verify Thunderbolt authorization:
   ```bash
   cat /sys/bus/thunderbolt/devices/1-1/authorized
   # If 0, manually authorize:
   echo 1 > /sys/bus/thunderbolt/devices/1-1/authorized
   ```
3. Check GPU appears in lspci:
   ```bash
   lspci -nn | grep -i nvidia
   ```

**VM fails to start with GPU:**
1. Ensure UEFI BIOS is selected (not SeaBIOS)
2. Enable "Primary GPU" in PCI device settings
3. Check VM logs: `qm showcmd VMID`
4. Verify IOMMU group isolation

**Performance issues:**
- Ensure "PCI-Express" is enabled in VM hardware
- Use virtio drivers for disk and network
- Consider CPU pinning for better performance

### Important Notes

- **eGPU Connection:** GPU must remain connected via Thunderbolt during VM operation
- **Hot-plug:** Thunderbolt eGPU supports hot-plug, but not recommended during VM operation
- **Power:** Ensure Sonnet Breakaway Box is powered on before booting pve-01
- **Boot Order:** GPU must be authorized before VM starts (automated via udev rule)
- **Driver Installation:** Install NVIDIA drivers inside the VM, not on Proxmox host

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
