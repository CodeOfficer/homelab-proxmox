# Proxmox Connection
variable "proxmox_api_url" {
  description = "Proxmox API endpoint URL"
  type        = string
}

variable "proxmox_api_token_id" {
  description = "Proxmox API token ID"
  type        = string
  sensitive   = true
}

variable "proxmox_insecure" {
  description = "Skip TLS verification for Proxmox API"
  type        = bool
  default     = true
}

variable "proxmox_ssh_user" {
  description = "SSH username for Proxmox nodes"
  type        = string
  default     = "root"
}

# K3s Configuration
variable "k3s_cluster_name" {
  description = "Name of the K3s cluster"
  type        = string
}

variable "k3s_version" {
  description = "K3s version to install"
  type        = string
}

variable "k3s_cluster_domain" {
  description = "Domain name for K3s cluster API endpoint"
  type        = string
}

# VM Template
variable "vm_template_vmid" {
  description = "VMID of the VM template to clone"
  type        = number
  default     = 9000
}

variable "vm_template_name" {
  description = "Name of the VM template to clone"
  type        = string
}

variable "vm_template_node" {
  description = "Proxmox node where the template is located"
  type        = string
  default     = "pve-01"
}

variable "vm_ssh_user" {
  description = "SSH username for VMs"
  type        = string
}

variable "vm_ssh_password" {
  description = "SSH password for VMs"
  type        = string
  sensitive   = true
}

variable "vm_ssh_keys" {
  description = "List of SSH public keys for VM access"
  type        = list(string)
  default     = []
}

# Node Configurations
variable "k3s_server_nodes" {
  description = "List of K3s server (control plane) nodes"
  type = list(object({
    name        = string
    target_node = string
    vmid        = number
    ip_address  = string
    gateway     = string
    cpu_cores   = number
    memory      = number
    disk_size   = string
    vlan_tag    = optional(number)
  }))
}

variable "k3s_agent_nodes" {
  description = "List of K3s agent (worker) nodes"
  type = list(object({
    name            = string
    target_node     = string
    vmid            = number
    ip_address      = string
    gateway         = string
    cpu_cores       = number
    memory          = number
    disk_size       = string
    vlan_tag        = optional(number)
    gpu_passthrough = optional(bool, false)
  }))
}

# Network
variable "dns_servers" {
  description = "List of DNS servers"
  type        = list(string)
}

variable "search_domain" {
  description = "DNS search domain"
  type        = string
}

# Storage
variable "storage_pool" {
  description = "Proxmox storage pool for VM disks"
  type        = string
}

# GPU Passthrough
variable "gpu_mapping_name" {
  description = "Name of the GPU PCI device mapping in Proxmox"
  type        = string
  default     = "gpu0"
}
