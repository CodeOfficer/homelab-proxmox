output "server_ips" {
  description = "IP addresses of K3s server nodes"
  value = concat(
    [proxmox_virtual_environment_vm.k3s_server_init.initialization[0].ip_config[0].ipv4.address],
    [for vm in proxmox_virtual_environment_vm.k3s_server_additional : vm.initialization[0].ip_config[0].ipv4.address]
  )
}

output "agent_ips" {
  description = "IP addresses of K3s agent nodes"
  value = [for vm in proxmox_virtual_environment_vm.k3s_agent : vm.initialization[0].ip_config[0].ipv4.address]
}

output "k3s_token" {
  description = "K3s cluster token"
  value       = random_password.k3s_token.result
  sensitive   = true
}

output "first_server_ip" {
  description = "IP address of the first K3s server"
  value       = local.first_server.ip_address
}
