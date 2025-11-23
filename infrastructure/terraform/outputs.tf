output "k3s_server_ips" {
  description = "IP addresses of K3s server nodes"
  value       = module.k3s_cluster.server_ips
}

output "k3s_agent_ips" {
  description = "IP addresses of K3s agent nodes"
  value       = module.k3s_cluster.agent_ips
}

output "k3s_cluster_endpoint" {
  description = "K3s cluster API endpoint"
  value       = "https://${var.k3s_cluster_domain}:6443"
}

output "kubeconfig_path" {
  description = "Path to kubeconfig file"
  value       = "${path.module}/kubeconfig"
}
