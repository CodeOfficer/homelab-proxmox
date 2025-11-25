# Packer VM Template for K3s

This directory contains Packer configuration to build an Ubuntu 24.04 LTS VM template optimized for K3s deployment in Proxmox.

## Overview

**Template Name:** `ubuntu-2404-k3s-template`
**VM ID:** 9000
**Base Image:** Ubuntu 24.04 LTS Cloud Image
**Builder:** Proxmox ISO

## What Gets Installed

The provisioning script (`scripts/setup.sh`) installs and configures:

- **System packages:** qemu-guest-agent, cloud-init, curl, wget, vim, git, htop, nfs-common
- **K3s prerequisites:** IP forwarding, bridge netfilter, kernel modules (overlay, br_netfilter)
- **System optimizations:** Disabled swap, increased file descriptor limits
- **Cloud-init:** Configured for Proxmox with NoCloud datasource

## Prerequisites

1. **Packer installed:**
   ```bash
   brew install packer  # macOS
   # or visit: https://www.packer.io/downloads
   ```

2. **Proxmox API token created:**
   - Go to Datacenter > Permissions > API Tokens
   - Create token: `root@pam!terraform` (or separate token for Packer)
   - Required privileges: PVEDatastoreUser, PVEVMAdmin, PVEPoolAdmin

3. **Environment variables configured:**
   ```bash
   # Copy .envrc.example to .envrc and fill in values
   cp ../../.envrc.example ../../.envrc

   # Edit .envrc and set:
   # - TF_VAR_proxmox_api_token_id
   # - TF_VAR_proxmox_api_token_secret

   # Allow direnv
   direnv allow
   ```

## Usage

### Build the Template

```bash
# From project root
make template

# Or from this directory
cd infrastructure/packer
packer init .
packer build ubuntu-k3s.pkr.hcl
```

### Validate Configuration

```bash
# From project root
make template-validate

# Or from this directory
packer validate ubuntu-k3s.pkr.hcl
```

### Format Configuration

```bash
packer fmt ubuntu-k3s.pkr.hcl
```

## Build Process

1. **Download Ubuntu cloud image** from canonical
2. **Create VM** (ID 9000) on specified Proxmox node
3. **Configure hardware:** UEFI, 2 CPU, 2GB RAM, 20GB disk
4. **Enable cloud-init** for future customization
5. **Run provisioning script:**
   - Update system packages
   - Install qemu-guest-agent and essentials
   - Configure K3s prerequisites
   - Optimize system settings
6. **Clean up** cloud-init data, logs, caches
7. **Convert to template** in Proxmox

## Template Specifications

| Setting | Value |
|---------|-------|
| BIOS | OVMF (UEFI) |
| CPU | 2 cores, 1 socket |
| Memory | 2048 MB |
| Disk | 20GB (virtio-scsi, thin provisioned) |
| Network | virtio on vmbr0 |
| Cloud-init | Enabled |
| QEMU Agent | Enabled |

## Using the Template

After the template is created, Terraform will clone it to create K3s VMs:

```bash
# The template will be available as:
# - Name: ubuntu-2404-k3s-template
# - ID: 9000
# - Node: pve-01

# Terraform will reference it via:
# TF_VAR_vm_template_name="ubuntu-2404-k3s-template"
```

## Customization

### Change Template Settings

Edit `variables.pkrvars.hcl.example`:
```hcl
proxmox_node = "pve-02"          # Build on different node
template_name = "my-template"     # Different template name
vm_id = 9001                      # Different VM ID
```

### Modify Provisioning

Edit `scripts/setup.sh` to:
- Add additional packages
- Configure different settings
- Install Docker or other tools
- Customize kernel parameters

### Override Variables

```bash
# Via environment variables (preferred)
export PKR_VAR_proxmox_node="pve-02"

# Via command line
packer build -var 'proxmox_node=pve-02' ubuntu-k3s.pkr.hcl

# Via variables file
packer build -var-file=variables.pkrvars.hcl ubuntu-k3s.pkr.hcl
```

## Troubleshooting

### Build fails with authentication error
- Verify API token has correct privileges
- Check `PKR_VAR_proxmox_api_token_id` and `PKR_VAR_proxmox_api_token_secret` are set
- Ensure token hasn't expired

### Build fails with timeout
- Check Proxmox node has internet access
- Verify Ubuntu cloud image URL is accessible
- Increase `ssh_timeout` in ubuntu-k3s.pkr.hcl

### Cloud-init doesn't start
- Check qemu-guest-agent is installed
- Verify cloud-init datasource configuration
- Review VM console logs in Proxmox

### Template already exists
- Delete existing template: `qm destroy 9000` on Proxmox
- Or change `vm_id` variable to use different ID

## Rebuilding the Template

To rebuild the template after making changes:

```bash
# 1. Delete old template on Proxmox
ssh root@10.20.11.11 "qm destroy 9000"

# 2. Rebuild with Packer
make template

# 3. Verify template exists
ssh root@10.20.11.11 "qm list | grep 9000"
```

## Next Steps

After template is created:
1. Proceed to Phase 3: Terraform Infrastructure
2. Run `terraform init` and `terraform plan`
3. Deploy K3s cluster VMs from template
