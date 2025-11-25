# Packer configuration for Ubuntu 24.04 K3s template
# This creates a VM template in Proxmox optimized for K3s deployment

packer {
  required_plugins {
    proxmox = {
      version = ">= 1.1.8"
      source  = "github.com/hashicorp/proxmox"
    }
  }
}

# Variables
variable "proxmox_api_url" {
  type        = string
  description = "Proxmox API URL (e.g., https://10.20.11.11:8006/api2/json)"
}

variable "proxmox_api_token_id" {
  type        = string
  description = "Proxmox API token ID (e.g., root@pam!terraform)"
  sensitive   = true
}

variable "proxmox_api_token_secret" {
  type        = string
  description = "Proxmox API token secret"
  sensitive   = true
}

variable "proxmox_node" {
  type        = string
  description = "Proxmox node to build on"
  default     = "pve-01"
}

variable "template_name" {
  type        = string
  description = "Name of the template to create"
  default     = "ubuntu-2404-k3s-template"
}

variable "template_description" {
  type        = string
  description = "Description of the template"
  default     = "Ubuntu 24.04 LTS template for K3s - built with Packer"
}

variable "iso_url" {
  type        = string
  description = "URL to Ubuntu 24.04 cloud image"
  default     = "https://cloud-images.ubuntu.com/noble/current/noble-server-cloudimg-amd64.img"
}

variable "iso_checksum" {
  type        = string
  description = "Checksum for Ubuntu image (leave empty for latest)"
  default     = "file:https://cloud-images.ubuntu.com/noble/current/SHA256SUMS"
}

variable "vm_id" {
  type        = number
  description = "VM ID for the template"
  default     = 9000
}

variable "ssh_username" {
  type        = string
  description = "SSH username for provisioning"
  default     = "ubuntu"
}

variable "ssh_password" {
  type        = string
  description = "Temporary SSH password for provisioning"
  default     = "ubuntu"
  sensitive   = true
}

# Source configuration
source "proxmox-iso" "ubuntu-k3s" {
  # Proxmox connection
  proxmox_url              = var.proxmox_api_url
  username                 = var.proxmox_api_token_id
  token                    = var.proxmox_api_token_secret
  insecure_skip_tls_verify = true
  node                     = var.proxmox_node

  # VM configuration
  vm_id                = var.vm_id
  vm_name              = var.template_name
  template_description = var.template_description

  # ISO configuration
  iso_url          = var.iso_url
  iso_checksum     = var.iso_checksum
  iso_storage_pool = "local"
  unmount_iso      = true

  # Hardware configuration
  cores   = 2
  sockets = 1
  memory  = 2048

  # BIOS settings
  bios = "ovmf"
  efi_config {
    efi_storage_pool  = "local-zfs"
    efi_type          = "4m"
    pre_enrolled_keys = true
  }

  # Disk configuration
  scsi_controller = "virtio-scsi-single"
  disks {
    type         = "scsi"
    disk_size    = "20G"
    storage_pool = "local-zfs"
    format       = "raw"
    io_thread    = true
    discard      = true
  }

  # Network configuration
  network_adapters {
    model    = "virtio"
    bridge   = "vmbr0"
    firewall = false
  }

  # Cloud-init configuration
  cloud_init              = true
  cloud_init_storage_pool = "local-zfs"

  # SSH configuration for provisioning
  ssh_username = var.ssh_username
  ssh_password = var.ssh_password
  ssh_timeout  = "20m"

  # Additional settings
  qemu_agent = true
  os         = "l26"  # Linux kernel 2.6+
}

# Build configuration
build {
  name    = "ubuntu-k3s-template"
  sources = ["source.proxmox-iso.ubuntu-k3s"]

  # Wait for cloud-init to complete
  provisioner "shell" {
    inline = [
      "while [ ! -f /var/lib/cloud/instance/boot-finished ]; do echo 'Waiting for cloud-init...'; sleep 1; done",
      "sudo cloud-init status --wait"
    ]
  }

  # Run setup script
  provisioner "shell" {
    script = "${path.root}/scripts/setup.sh"
  }

  # Clean up for template conversion
  provisioner "shell" {
    inline = [
      "echo 'Cleaning up for template...'",
      "sudo cloud-init clean --logs --seed",
      "sudo rm -rf /var/lib/cloud/instances/*",
      "sudo rm -rf /tmp/*",
      "sudo rm -rf /var/tmp/*",
      "sudo truncate -s 0 /etc/machine-id",
      "sudo rm -f /var/lib/dbus/machine-id",
      "sudo ln -fs /etc/machine-id /var/lib/dbus/machine-id",
      "sudo sync"
    ]
  }
}
