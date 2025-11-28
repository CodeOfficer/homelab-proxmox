# K3s Cluster Module for Proxmox
# Creates K3s server (control plane) and agent (worker) VMs

locals {
  # Generate K3s token (consistent for cluster)
  k3s_token = random_password.k3s_token.result

  # First server node is the initializer
  first_server = var.k3s_server_nodes[0]

  # Additional servers join the cluster
  additional_servers = slice(var.k3s_server_nodes, 1, length(var.k3s_server_nodes))
}

# Generate random token for K3s cluster
resource "random_password" "k3s_token" {
  length  = 64
  special = false
}

# K3s Server Nodes (Control Plane)
# First server initializes the cluster with embedded etcd
resource "proxmox_virtual_environment_vm" "k3s_server_init" {
  name        = local.first_server.name
  node_name   = local.first_server.target_node
  vm_id       = local.first_server.vmid
  description = "K3s control plane - initial server"

  clone {
    vm_id     = var.vm_template_vmid
    node_name = var.vm_template_node
    full      = true
  }

  cpu {
    cores = local.first_server.cpu_cores
    type  = "host"
  }

  memory {
    dedicated = local.first_server.memory
  }

  network_device {
    bridge  = "vmbr0"
    vlan_id = local.first_server.vlan_tag
  }

  disk {
    datastore_id = var.storage_pool
    interface    = "scsi0"
    size         = parseint(replace(local.first_server.disk_size, "G", ""), 10)
    file_format  = "raw"
  }

  initialization {
    datastore_id = var.storage_pool

    ip_config {
      ipv4 {
        address = "${local.first_server.ip_address}/24"
        gateway = local.first_server.gateway
      }
    }

    user_account {
      username = var.vm_ssh_user
      password = var.vm_ssh_password
      keys     = var.vm_ssh_keys
    }

    dns {
      servers = var.dns_servers
      domain  = var.search_domain
    }
  }

  # K3s installation is handled by Ansible (Phase 3.5)
  # This module only provisions VMs with cloud-init

  depends_on = [random_password.k3s_token]
}

# Additional K3s Server Nodes
resource "proxmox_virtual_environment_vm" "k3s_server_additional" {
  count = length(local.additional_servers)

  name        = local.additional_servers[count.index].name
  node_name   = local.additional_servers[count.index].target_node
  vm_id       = local.additional_servers[count.index].vmid
  description = "K3s control plane - additional server"

  clone {
    vm_id     = var.vm_template_vmid
    node_name = var.vm_template_node
    full      = true
  }

  cpu {
    cores = local.additional_servers[count.index].cpu_cores
    type  = "host"
  }

  memory {
    dedicated = local.additional_servers[count.index].memory
  }

  network_device {
    bridge  = "vmbr0"
    vlan_id = local.additional_servers[count.index].vlan_tag
  }

  disk {
    datastore_id = var.storage_pool
    interface    = "scsi0"
    size         = parseint(replace(local.additional_servers[count.index].disk_size, "G", ""), 10)
    file_format  = "raw"
  }

  initialization {
    datastore_id = var.storage_pool

    ip_config {
      ipv4 {
        address = "${local.additional_servers[count.index].ip_address}/24"
        gateway = local.additional_servers[count.index].gateway
      }
    }

    user_account {
      username = var.vm_ssh_user
      password = var.vm_ssh_password
      keys     = var.vm_ssh_keys
    }

    dns {
      servers = var.dns_servers
      domain  = var.search_domain
    }
  }

  # K3s installation is handled by Ansible (Phase 3.5)

  depends_on = [proxmox_virtual_environment_vm.k3s_server_init]
}

# K3s Agent Nodes (Workers)
resource "proxmox_virtual_environment_vm" "k3s_agent" {
  count = length(var.k3s_agent_nodes)

  name        = var.k3s_agent_nodes[count.index].name
  node_name   = var.k3s_agent_nodes[count.index].target_node
  vm_id       = var.k3s_agent_nodes[count.index].vmid
  description = "K3s worker node${var.k3s_agent_nodes[count.index].gpu_passthrough ? " (GPU enabled)" : ""}"

  # GPU VMs can take longer to stop
  timeout_stop_vm = 600

  clone {
    vm_id     = var.vm_template_vmid
    node_name = var.vm_template_node
    full      = true
  }

  cpu {
    cores = var.k3s_agent_nodes[count.index].cpu_cores
    type  = "host"
  }

  memory {
    dedicated = var.k3s_agent_nodes[count.index].memory
  }

  # q35 machine type + OVMF BIOS required for GPU passthrough
  machine = var.k3s_agent_nodes[count.index].gpu_passthrough ? "q35" : null
  bios    = var.k3s_agent_nodes[count.index].gpu_passthrough ? "ovmf" : null

  # EFI disk for OVMF boot (required when bios = ovmf)
  dynamic "efi_disk" {
    for_each = var.k3s_agent_nodes[count.index].gpu_passthrough ? [1] : []
    content {
      datastore_id = var.storage_pool
      type         = "4m"
    }
  }

  network_device {
    bridge  = "vmbr0"
    vlan_id = var.k3s_agent_nodes[count.index].vlan_tag
  }

  disk {
    datastore_id = var.storage_pool
    interface    = "scsi0"
    size         = parseint(replace(var.k3s_agent_nodes[count.index].disk_size, "G", ""), 10)
    file_format  = "raw"
  }

  # GPU passthrough configuration (if enabled)
  dynamic "hostpci" {
    for_each = var.k3s_agent_nodes[count.index].gpu_passthrough ? [1] : []
    content {
      device  = "hostpci0"
      pcie    = true
      rombar  = true
      mapping = var.gpu_mapping_name # Proxmox PCI device mapping
    }
  }

  initialization {
    datastore_id = var.storage_pool

    ip_config {
      ipv4 {
        address = "${var.k3s_agent_nodes[count.index].ip_address}/24"
        gateway = var.k3s_agent_nodes[count.index].gateway
      }
    }

    user_account {
      username = var.vm_ssh_user
      password = var.vm_ssh_password
      keys     = var.vm_ssh_keys
    }

    dns {
      servers = var.dns_servers
      domain  = var.search_domain
    }
  }

  # K3s installation is handled by Ansible (Phase 3.5)

  depends_on = [proxmox_virtual_environment_vm.k3s_server_init]
}

# NOTE: Kubeconfig retrieval is handled by Ansible after K3s installation (Phase 3.5)
