# Packer configuration for Ubuntu 24.04 K3s template
# Uses Ubuntu Server ISO with autoinstall (not cloud images)

packer {
  required_plugins {
    proxmox = {
      version = ">= 1.2.0"
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
  description = "SSH password for provisioning"
  sensitive   = true
}

variable "storage_pool" {
  type        = string
  description = "Proxmox storage pool for VM disks"
  default     = "local-lvm"
}

variable "iso_storage_pool" {
  type        = string
  description = "Proxmox storage pool for ISO images"
  default     = "local"
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

  # Ubuntu 24.04 Server ISO - pre-downloaded to Proxmox storage
  # Download manually: ssh root@pve-01 'cd /var/lib/vz/template/iso && wget https://releases.ubuntu.com/24.04.1/ubuntu-24.04.1-live-server-amd64.iso'
  boot_iso {
    type     = "scsi"
    iso_file = "${var.iso_storage_pool}:iso/ubuntu-24.04.1-live-server-amd64.iso"
    unmount  = true
  }

  # HTTP server for autoinstall cloud-init files
  http_directory = "${path.root}/http"

  # Boot command for Ubuntu autoinstall (UEFI)
  # Pattern from working homelab-k3s config
  boot_wait = "10s"
  boot_command = [
    "e<down><down><down><end>",
    " autoinstall ds=nocloud-net\\;s=http://{{.HTTPIP}}:{{.HTTPPort}}/ ---",
    "<f10>",
  ]

  # Hardware configuration
  cores   = 2
  sockets = 1
  memory  = 4096

  # BIOS settings (UEFI)
  bios = "ovmf"
  efi_config {
    efi_storage_pool  = var.storage_pool
    efi_type          = "4m"
    pre_enrolled_keys = true
  }

  # Disk configuration
  scsi_controller = "virtio-scsi-single"
  disks {
    type         = "scsi"
    disk_size    = "20G"
    storage_pool = var.storage_pool
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

  # SSH configuration for provisioning
  ssh_username         = var.ssh_username
  ssh_password         = var.ssh_password
  ssh_timeout          = "30m"
  ssh_handshake_attempts = 100

  # QEMU guest agent
  qemu_agent = true
  os         = "l26"
}

# Build configuration
build {
  name    = "ubuntu-k3s-template"
  sources = ["source.proxmox-iso.ubuntu-k3s"]

  # Wait for cloud-init to complete
  provisioner "shell" {
    inline = [
      "while [ ! -f /var/lib/cloud/instance/boot-finished ]; do echo 'Waiting for cloud-init...'; sleep 5; done",
      "echo 'Cloud-init finished'"
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
