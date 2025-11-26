# Proxmox Connection
variable "proxmox_api_url" {
  description = "Proxmox API endpoint URL (e.g., https://pve-node-01.home.arpa:8006/api2/json)"
  type        = string
}

variable "proxmox_api_token_id" {
  description = "Proxmox API token ID (e.g., root@pam!terraform)"
  type        = string
  sensitive   = true
}

variable "proxmox_api_token_secret" {
  description = "Proxmox API token secret (UUID)"
  type        = string
  sensitive   = true
}

variable "proxmox_insecure" {
  description = "Skip TLS verification for Proxmox API"
  type        = bool
  default     = true # Set to false in production with valid certs
}

variable "proxmox_ssh_user" {
  description = "SSH username for Proxmox nodes"
  type        = string
  default     = "root"
}

# K3s Cluster Configuration
variable "k3s_cluster_name" {
  description = "Name of the K3s cluster"
  type        = string
  default     = "homelab"
}

variable "k3s_version" {
  description = "K3s version to install"
  type        = string
  default     = "v1.33.6+k3s1"
}

variable "k3s_cluster_domain" {
  description = "Domain name for K3s cluster API endpoint (e.g., k3s.home.arpa)"
  type        = string
}

# VM Configuration
variable "vm_template_name" {
  description = "Name of the VM template to clone"
  type        = string
  default     = "ubuntu-2404-cloud-init"
}

variable "vm_ssh_user" {
  description = "SSH username for VMs"
  type        = string
  default     = "ubuntu"
}

variable "vm_ssh_password" {
  description = "SSH password for VMs (used for initial provisioning)"
  type        = string
  sensitive   = true
}

variable "vm_ssh_keys" {
  description = "List of SSH public keys for VM access"
  type        = list(string)
  default     = []
}

# K3s Server Nodes (Control Plane)
variable "k3s_server_nodes" {
  description = "List of K3s server (control plane) nodes"
  type = list(object({
    name         = string
    target_node  = string # Proxmox node to deploy on
    vmid         = number
    ip_address   = string
    gateway      = string
    cpu_cores    = number
    memory       = number # in MB
    disk_size    = string # e.g., "32G"
    vlan_tag     = optional(number)
  }))
}

# K3s Agent Nodes (Workers)
variable "k3s_agent_nodes" {
  description = "List of K3s agent (worker) nodes"
  type = list(object({
    name         = string
    target_node  = string # Proxmox node to deploy on
    vmid         = number
    ip_address   = string
    gateway      = string
    cpu_cores    = number
    memory       = number # in MB
    disk_size    = string # e.g., "32G"
    vlan_tag     = optional(number)
    gpu_passthrough = optional(bool, false)
  }))
}

# Network Configuration
variable "dns_servers" {
  description = "List of DNS servers"
  type        = list(string)
  default     = ["10.10.10.1"] # UDM as DNS
}

variable "search_domain" {
  description = "DNS search domain"
  type        = string
  default     = "home.arpa"
}

# Storage
variable "storage_pool" {
  description = "Proxmox storage pool for VM disks"
  type        = string
  default     = "local-lvm"
}

# VM Template
variable "vm_template_vmid" {
  description = "VMID of the VM template to clone"
  type        = number
  default     = 9000
}

variable "vm_template_node" {
  description = "Proxmox node where the template is located"
  type        = string
  default     = "pve-01"
}

# GPU Passthrough
variable "gpu_mapping_name" {
  description = "Name of the GPU PCI device mapping in Proxmox"
  type        = string
  default     = "rtx4000ada"
}
