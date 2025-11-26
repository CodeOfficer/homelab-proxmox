module "k3s_cluster" {
  source = "../modules/k3s-cluster"

  # Proxmox connection
  proxmox_api_url      = var.proxmox_api_url
  proxmox_api_token_id = var.proxmox_api_token_id
  proxmox_insecure     = var.proxmox_insecure
  proxmox_ssh_user     = var.proxmox_ssh_user

  # K3s configuration
  k3s_cluster_name   = var.k3s_cluster_name
  k3s_version        = var.k3s_version
  k3s_cluster_domain = var.k3s_cluster_domain

  # VM configuration
  vm_template_name = var.vm_template_name
  vm_template_vmid = var.vm_template_vmid
  vm_template_node = var.vm_template_node
  vm_ssh_user      = var.vm_ssh_user
  vm_ssh_password  = var.vm_ssh_password
  vm_ssh_keys      = var.vm_ssh_keys

  # Node configurations
  k3s_server_nodes = var.k3s_server_nodes
  k3s_agent_nodes  = var.k3s_agent_nodes

  # Network
  dns_servers   = var.dns_servers
  search_domain = var.search_domain

  # Storage
  storage_pool = var.storage_pool

  # GPU Passthrough
  gpu_mapping_name = var.gpu_mapping_name
}
