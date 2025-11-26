# Outputs for Ansible inventory generation

output "server_ips" {
  description = "IP addresses of K3s server nodes"
  value = concat(
    [local.first_server.ip_address],
    [for node in local.additional_servers : node.ip_address]
  )
}

output "agent_ips" {
  description = "IP addresses of K3s agent nodes"
  value = [for node in var.k3s_agent_nodes : node.ip_address]
}

output "first_server_ip" {
  description = "IP address of the first K3s server (cluster initializer)"
  value       = local.first_server.ip_address
}

output "k3s_token" {
  description = "K3s cluster token for node joining"
  value       = random_password.k3s_token.result
  sensitive   = true
}

# Ansible inventory outputs
output "ansible_inventory" {
  description = "Structured data for Ansible inventory generation"
  value = {
    ssh_user = var.vm_ssh_user

    servers = concat(
      [{
        name       = local.first_server.name
        ip         = local.first_server.ip_address
        is_initial = true
      }],
      [for node in local.additional_servers : {
        name       = node.name
        ip         = node.ip_address
        is_initial = false
      }]
    )

    agents = [for node in var.k3s_agent_nodes : {
      name           = node.name
      ip             = node.ip_address
      gpu_passthrough = node.gpu_passthrough
    }]

    k3s_config = {
      version        = var.k3s_version
      cluster_domain = var.k3s_cluster_domain
    }
  }
}

output "server_names" {
  description = "Names of K3s server nodes"
  value = concat(
    [local.first_server.name],
    [for node in local.additional_servers : node.name]
  )
}

output "agent_names" {
  description = "Names of K3s agent nodes"
  value = [for node in var.k3s_agent_nodes : node.name]
}

output "gpu_nodes" {
  description = "Names of nodes with GPU passthrough enabled"
  value = [for node in var.k3s_agent_nodes : node.name if node.gpu_passthrough]
}
