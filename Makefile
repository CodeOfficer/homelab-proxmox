.PHONY: help init plan apply destroy infra setup-kube test clean
.PHONY: deploy deploy-all deploy-infrastructure deploy-applications
.PHONY: logs status kubectl ssh-server ssh-agent
.PHONY: template template-validate template-init template-clean

# =============================================================================
# Homelab Proxmox Infrastructure Management
# =============================================================================

# Default target
.DEFAULT_GOAL := help

# Colors for output
RED := \033[0;31m
GREEN := \033[0;32m
YELLOW := \033[0;33m
BLUE := \033[0;34m
NC := \033[0m # No Color

# Terraform directory
TF_DIR := infrastructure/terraform

# Packer directory
PKR_DIR := infrastructure/packer

# =============================================================================
# Help
# =============================================================================

help: ## Show this help message
	@echo "$(BLUE)Homelab Proxmox Infrastructure Management$(NC)"
	@echo ""
	@echo "$(YELLOW)Prerequisites:$(NC)"
	@echo "  1. Copy .envrc.example to .envrc and fill in values"
	@echo "  2. Run: direnv allow"
	@echo "  3. Ensure Proxmox cluster is configured"
	@echo "  4. Create VM template (see docs/setup.md)"
	@echo ""
	@echo "$(YELLOW)Available commands:$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""

# =============================================================================
# Template Management (Packer)
# =============================================================================

template-init: ## Initialize Packer plugins
	@echo "$(BLUE)Initializing Packer...$(NC)"
	cd $(PKR_DIR) && packer init .

template-validate: template-init ## Validate Packer configuration
	@echo "$(BLUE)Validating Packer configuration...$(NC)"
	cd $(PKR_DIR) && packer validate ubuntu-k3s.pkr.hcl

template: template-validate ## Build VM template with Packer
	@echo "$(BLUE)Building VM template...$(NC)"
	@echo "$(YELLOW)This will create template on Proxmox (VMID: 9000)$(NC)"
	cd $(PKR_DIR) && packer build ubuntu-k3s.pkr.hcl
	@echo ""
	@echo "$(GREEN)Template built successfully!$(NC)"
	@echo "$(YELLOW)Template name: ubuntu-2404-k3s-template$(NC)"
	@echo "$(YELLOW)VM ID: 9000$(NC)"

template-clean: ## Remove template from Proxmox (VMID 9000)
	@echo "$(YELLOW)Removing template from Proxmox...$(NC)"
	@read -p "Delete template VMID 9000? Type 'yes' to confirm: " confirm; \
	if [ "$$confirm" = "yes" ]; then \
		ssh root@10.20.11.11 "qm destroy 9000"; \
		echo "$(GREEN)Template deleted$(NC)"; \
	else \
		echo "$(YELLOW)Aborted$(NC)"; \
	fi

# =============================================================================
# Infrastructure Deployment
# =============================================================================

init: ## Initialize Terraform
	@echo "$(BLUE)Initializing Terraform...$(NC)"
	cd $(TF_DIR) && terraform init

plan: init ## Plan infrastructure changes
	@echo "$(BLUE)Planning infrastructure changes...$(NC)"
	cd $(TF_DIR) && terraform plan

apply: init ## Apply infrastructure changes (deploy VMs and K3s)
	@echo "$(BLUE)Applying infrastructure changes...$(NC)"
	@echo "$(YELLOW)This will create VMs and install K3s cluster$(NC)"
	cd $(TF_DIR) && terraform apply

infra: apply setup-kube ## Full infrastructure deployment (VMs + K3s + kubectl setup)
	@echo "$(GREEN)Infrastructure deployment complete!$(NC)"
	@echo ""
	@echo "$(YELLOW)Next steps:$(NC)"
	@echo "  1. Verify cluster: make test"
	@echo "  2. Deploy applications: make deploy-all"
	@echo "  3. Access cluster: kubectl get nodes"

destroy: ## Destroy all infrastructure (DANGEROUS!)
	@echo "$(RED)WARNING: This will destroy ALL infrastructure!$(NC)"
	@read -p "Are you sure? Type 'yes' to confirm: " confirm; \
	if [ "$$confirm" = "yes" ]; then \
		cd $(TF_DIR) && terraform destroy; \
	else \
		echo "$(YELLOW)Aborted$(NC)"; \
	fi

# =============================================================================
# Cluster Management
# =============================================================================

setup-kube: ## Configure kubectl to access the cluster
	@echo "$(BLUE)Setting up kubectl...$(NC)"
	@if [ ! -f $(TF_DIR)/kubeconfig ]; then \
		echo "$(RED)Error: kubeconfig not found. Run 'make infra' first.$(NC)"; \
		exit 1; \
	fi
	@echo "$(GREEN)kubectl configured!$(NC)"
	@echo "$(YELLOW)Kubeconfig location: $(TF_DIR)/kubeconfig$(NC)"
	@echo ""
	@echo "$(YELLOW)Testing connection...$(NC)"
	kubectl get nodes

test: ## Run cluster health checks
	@echo "$(BLUE)Running cluster health checks...$(NC)"
	@echo ""
	@echo "$(YELLOW)1. Cluster nodes:$(NC)"
	kubectl get nodes -o wide
	@echo ""
	@echo "$(YELLOW)2. System pods:$(NC)"
	kubectl get pods -n kube-system
	@echo ""
	@echo "$(YELLOW)3. Cluster info:$(NC)"
	kubectl cluster-info
	@echo ""
	@echo "$(GREEN)Health check complete!$(NC)"

status: ## Show cluster status
	@echo "$(BLUE)Cluster Status$(NC)"
	@echo ""
	kubectl get nodes
	@echo ""
	@echo "$(YELLOW)Namespaces:$(NC)"
	kubectl get namespaces
	@echo ""
	@echo "$(YELLOW)All pods:$(NC)"
	kubectl get pods --all-namespaces

kubectl: ## Run arbitrary kubectl command (usage: make kubectl CMD="get pods")
	kubectl $(CMD)

# =============================================================================
# Application Deployment
# =============================================================================

deploy: ## Deploy a specific application (usage: make deploy APP=postgresql)
	@if [ -z "$(APP)" ]; then \
		echo "$(RED)Error: APP not specified$(NC)"; \
		echo "Usage: make deploy APP=<app-name>"; \
		exit 1; \
	fi
	@echo "$(BLUE)Deploying $(APP)...$(NC)"
	./scripts/deploy-app.sh $(APP)

deploy-all: deploy-infrastructure deploy-applications ## Deploy all infrastructure services and applications
	@echo "$(GREEN)All applications deployed!$(NC)"

deploy-infrastructure: ## Deploy infrastructure services (PostgreSQL, Redis, MinIO)
	@echo "$(BLUE)Deploying infrastructure services...$(NC)"
	@make deploy APP=postgresql
	@make deploy APP=redis
	@make deploy APP=minio
	@echo "$(GREEN)Infrastructure services deployed!$(NC)"

deploy-applications: ## Deploy application services (Home Assistant, n8n, Grafana)
	@echo "$(BLUE)Deploying applications...$(NC)"
	@make deploy APP=homeassistant
	@make deploy APP=n8n
	@make deploy APP=grafana
	@echo "$(GREEN)Applications deployed!$(NC)"

logs: ## Get logs for an application (usage: make logs APP=postgresql)
	@if [ -z "$(APP)" ]; then \
		echo "$(RED)Error: APP not specified$(NC)"; \
		echo "Usage: make logs APP=<app-name>"; \
		exit 1; \
	fi
	@echo "$(BLUE)Getting logs for $(APP)...$(NC)"
	kubectl logs -n $(NAMESPACE) -l app=$(APP) --tail=100 -f

# =============================================================================
# SSH Access
# =============================================================================

ssh-server: ## SSH to first K3s server node
	@echo "$(BLUE)Connecting to first K3s server...$(NC)"
	ssh $(TF_VAR_vm_ssh_user)@$(FIRST_SERVER_IP)

ssh-agent: ## SSH to first K3s agent (GPU node)
	@echo "$(BLUE)Connecting to first K3s agent (GPU node)...$(NC)"
	ssh $(TF_VAR_vm_ssh_user)@$(FIRST_AGENT_IP)

# =============================================================================
# Cleanup
# =============================================================================

clean: ## Clean up local terraform state and kubeconfig
	@echo "$(YELLOW)Cleaning up local files...$(NC)"
	rm -rf $(TF_DIR)/.terraform
	rm -f $(TF_DIR)/.terraform.lock.hcl
	rm -f $(TF_DIR)/terraform.tfstate*
	rm -f $(TF_DIR)/kubeconfig
	@echo "$(GREEN)Cleanup complete!$(NC)"

# =============================================================================
# Documentation
# =============================================================================

docs: ## Open documentation in default browser
	@echo "$(BLUE)Opening documentation...$(NC)"
	@if command -v open >/dev/null 2>&1; then \
		open docs/HOMELAB.md; \
	elif command -v xdg-open >/dev/null 2>&1; then \
		xdg-open docs/HOMELAB.md; \
	else \
		echo "$(YELLOW)Please manually open docs/HOMELAB.md$(NC)"; \
	fi

# =============================================================================
# Advanced
# =============================================================================

validate: ## Validate Terraform configuration
	@echo "$(BLUE)Validating Terraform configuration...$(NC)"
	cd $(TF_DIR) && terraform validate

fmt: ## Format Terraform code
	@echo "$(BLUE)Formatting Terraform code...$(NC)"
	cd $(TF_DIR) && terraform fmt -recursive
	cd infrastructure/modules && terraform fmt -recursive

output: ## Show Terraform outputs
	@echo "$(BLUE)Terraform outputs:$(NC)"
	cd $(TF_DIR) && terraform output

refresh: ## Refresh Terraform state
	@echo "$(BLUE)Refreshing Terraform state...$(NC)"
	cd $(TF_DIR) && terraform refresh
