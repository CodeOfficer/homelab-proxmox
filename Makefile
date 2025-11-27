.PHONY: help check init plan apply destroy infra setup-kube test clean
.PHONY: deploy deploy-all deploy-infrastructure deploy-applications
.PHONY: logs status kubectl ssh-server ssh-agent
.PHONY: template template-validate template-init template-clean
.PHONY: iso-upload iso-check
.PHONY: ansible-deps ansible-k3s ansible-expand-disk kubeconfig

# =============================================================================
# Homelab Proxmox Infrastructure Management
# =============================================================================

# Default target
.DEFAULT_GOAL := help

# Direnv wrapper - ensures environment is loaded
DIRENV := direnv exec .

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

# Ansible directory
ANSIBLE_DIR := infrastructure/ansible

# Ubuntu ISO configuration
UBUNTU_VERSION := 24.04.1
UBUNTU_ISO := ubuntu-$(UBUNTU_VERSION)-live-server-amd64.iso
UBUNTU_ISO_URL := https://releases.ubuntu.com/$(UBUNTU_VERSION)/$(UBUNTU_ISO)
PROXMOX_ISO_PATH := /var/lib/vz/template/iso/$(UBUNTU_ISO)

# =============================================================================
# Help
# =============================================================================

help: ## Show this help message
	@echo "$(BLUE)Homelab Proxmox Infrastructure Management$(NC)"
	@echo ""
	@echo "$(YELLOW)Quick Start Workflow:$(NC)"
	@echo "  1. make check         # Verify prerequisites"
	@echo "  2. make iso-upload    # Upload Ubuntu ISO (one-time)"
	@echo "  3. make template      # Build VM template"
	@echo "  4. make apply         # Create VMs from template"
	@echo "  5. make ansible-k3s   # Install K3s cluster"
	@echo "  6. make kubeconfig    # Get cluster access"
	@echo "  7. make test          # Verify cluster health"
	@echo ""
	@echo "$(YELLOW)Available commands:$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""

# =============================================================================
# Prerequisites Check
# =============================================================================

check: ## Verify all prerequisites are configured
	@echo "$(BLUE)Checking prerequisites...$(NC)"
	@echo ""
	@# Check .envrc is sourced
	@if [ -z "$(PROXMOX_NODE_IP)" ]; then \
		echo "$(RED)✗ PROXMOX_NODE_IP not set$(NC)"; \
		echo "  Run: cp .envrc.example .envrc && direnv allow"; \
		exit 1; \
	else \
		echo "$(GREEN)✓ Environment configured$(NC)"; \
	fi
	@# Check Proxmox API access
	@if curl -sk "https://$(PROXMOX_NODE_IP):8006/api2/json" >/dev/null 2>&1; then \
		echo "$(GREEN)✓ Proxmox API reachable$(NC)"; \
	else \
		echo "$(RED)✗ Cannot reach Proxmox API at $(PROXMOX_NODE_IP)$(NC)"; \
		exit 1; \
	fi
	@# Check SSH access
	@if ssh -q -o BatchMode=yes -o ConnectTimeout=5 root@$(PROXMOX_NODE_IP) exit 2>/dev/null; then \
		echo "$(GREEN)✓ SSH access to Proxmox$(NC)"; \
	else \
		echo "$(RED)✗ Cannot SSH to root@$(PROXMOX_NODE_IP)$(NC)"; \
		echo "  Ensure SSH key is configured"; \
		exit 1; \
	fi
	@# Check required tools
	@if command -v packer >/dev/null 2>&1; then \
		echo "$(GREEN)✓ Packer installed$(NC)"; \
	else \
		echo "$(RED)✗ Packer not installed$(NC)"; \
		echo "  Run: brew install packer"; \
		exit 1; \
	fi
	@if command -v terraform >/dev/null 2>&1; then \
		echo "$(GREEN)✓ Terraform installed$(NC)"; \
	else \
		echo "$(RED)✗ Terraform not installed$(NC)"; \
		echo "  Run: brew install terraform"; \
		exit 1; \
	fi
	@if command -v ansible >/dev/null 2>&1; then \
		echo "$(GREEN)✓ Ansible installed$(NC)"; \
	else \
		echo "$(YELLOW)⚠ Ansible not installed (needed for K3s)$(NC)"; \
		echo "  Run: brew install ansible"; \
	fi
	@echo ""
	@echo "$(GREEN)All prerequisites OK!$(NC)"

# =============================================================================
# ISO Management
# =============================================================================

iso-check: ## Check if Ubuntu ISO exists on Proxmox
	@if ssh root@$(PROXMOX_NODE_IP) "test -f $(PROXMOX_ISO_PATH)" 2>/dev/null; then \
		echo "$(GREEN)✓ ISO exists: $(UBUNTU_ISO)$(NC)"; \
	else \
		echo "$(YELLOW)✗ ISO not found: $(UBUNTU_ISO)$(NC)"; \
		echo "  Run: make iso-upload"; \
		exit 1; \
	fi

iso-upload: ## Download Ubuntu ISO and upload to Proxmox
	@echo "$(BLUE)Checking for Ubuntu ISO on Proxmox...$(NC)"
	@if ssh root@$(PROXMOX_NODE_IP) "test -f $(PROXMOX_ISO_PATH)" 2>/dev/null; then \
		echo "$(GREEN)ISO already exists on Proxmox$(NC)"; \
	else \
		echo "$(YELLOW)ISO not found. Downloading and uploading...$(NC)"; \
		echo "$(BLUE)Downloading $(UBUNTU_ISO) (~2.6GB)...$(NC)"; \
		curl -L --progress-bar -o /tmp/$(UBUNTU_ISO) $(UBUNTU_ISO_URL); \
		echo "$(BLUE)Uploading to Proxmox...$(NC)"; \
		scp /tmp/$(UBUNTU_ISO) root@$(PROXMOX_NODE_IP):$(PROXMOX_ISO_PATH); \
		rm -f /tmp/$(UBUNTU_ISO); \
		echo "$(GREEN)ISO uploaded successfully!$(NC)"; \
	fi

# =============================================================================
# Template Management (Packer)
# =============================================================================

template-init: ## Initialize Packer plugins
	@echo "$(BLUE)Initializing Packer...$(NC)"
	$(DIRENV) packer init $(PKR_DIR)

template-validate: template-init ## Validate Packer configuration
	@echo "$(BLUE)Validating Packer configuration...$(NC)"
	$(DIRENV) packer validate $(PKR_DIR)/ubuntu-k3s.pkr.hcl

template: iso-check template-validate ## Build VM template with Packer
	@echo "$(BLUE)Building VM template...$(NC)"
	$(DIRENV) packer build $(PKR_DIR)/ubuntu-k3s.pkr.hcl
	@echo ""
	@echo "$(GREEN)Template built successfully!$(NC)"
	@echo "$(YELLOW)Template name: $(PKR_VAR_template_name)$(NC)"
	@echo "$(YELLOW)VM ID: $(PKR_VAR_vm_id)$(NC)"
	@echo ""
	@echo "$(YELLOW)Next: make apply$(NC)"

template-clean: ## Remove template from Proxmox
	@echo "$(YELLOW)Removing template from Proxmox...$(NC)"
	@if [ -z "$(PROXMOX_NODE_IP)" ]; then \
		echo "$(RED)Error: PROXMOX_NODE_IP not set. Source .envrc first.$(NC)"; \
		exit 1; \
	fi
	@read -p "Delete template VMID $(PKR_VAR_vm_id)? Type 'yes' to confirm: " confirm; \
	if [ "$$confirm" = "yes" ]; then \
		ssh root@$(PROXMOX_NODE_IP) "qm destroy $(PKR_VAR_vm_id)"; \
		echo "$(GREEN)Template deleted$(NC)"; \
	else \
		echo "$(YELLOW)Aborted$(NC)"; \
	fi

# =============================================================================
# Infrastructure Deployment
# =============================================================================

init: ## Initialize Terraform
	@echo "$(BLUE)Initializing Terraform...$(NC)"
	$(DIRENV) terraform -chdir=$(TF_DIR) init

plan: init ## Plan infrastructure changes
	@echo "$(BLUE)Planning infrastructure changes...$(NC)"
	$(DIRENV) terraform -chdir=$(TF_DIR) plan

apply: init ## Apply infrastructure changes (deploy VMs)
	@echo "$(BLUE)Applying infrastructure changes...$(NC)"
	@echo "$(YELLOW)This will create VMs from template$(NC)"
	$(DIRENV) terraform -chdir=$(TF_DIR) apply -auto-approve

infra: apply ## Alias for apply
	@echo ""

# =============================================================================
# Ansible / K3s Installation
# =============================================================================

ansible-deps: ## Install Ansible dependencies (k3s-ansible role)
	@echo "$(BLUE)Installing Ansible dependencies...$(NC)"
	@if [ ! -d "$(ANSIBLE_DIR)" ]; then \
		echo "$(RED)Error: $(ANSIBLE_DIR) not found$(NC)"; \
		exit 1; \
	fi
	$(DIRENV) ansible-galaxy install -r $(ANSIBLE_DIR)/requirements.yml
	@echo "$(GREEN)Ansible dependencies installed!$(NC)"

ansible-k3s: ansible-deps ## Install K3s on VMs using Ansible
	@echo "$(BLUE)Installing K3s cluster...$(NC)"
	$(DIRENV) ansible-playbook -i $(ANSIBLE_DIR)/inventory/hosts.yml $(ANSIBLE_DIR)/playbooks/k3s-install.yml
	@echo "$(GREEN)K3s cluster installed!$(NC)"
	@echo ""
	@echo "$(YELLOW)Next: make kubeconfig$(NC)"

ansible-expand-disk: ## Expand filesystem after disk resize (idempotent)
	@echo "$(BLUE)Expanding filesystems to fill disks...$(NC)"
	$(DIRENV) ansible-playbook -i $(ANSIBLE_DIR)/inventory/hosts.yml $(ANSIBLE_DIR)/playbooks/expand-disk.yml
	@echo "$(GREEN)Filesystems expanded!$(NC)"

kubeconfig: ## Fetch kubeconfig from K3s cluster
	@echo "$(BLUE)Fetching kubeconfig...$(NC)"
	$(DIRENV) ssh ubuntu@$(FIRST_SERVER_IP) "sudo cat /etc/rancher/k3s/k3s.yaml" | \
		sed "s/127.0.0.1/$(FIRST_SERVER_IP)/g" > $(TF_DIR)/kubeconfig
	@chmod 600 $(TF_DIR)/kubeconfig
	@echo "$(GREEN)Kubeconfig saved to: $(TF_DIR)/kubeconfig$(NC)"
	@echo ""
	@echo "$(YELLOW)Next: make test$(NC)"

destroy: ## Destroy all infrastructure (DANGEROUS!)
	@echo "$(RED)WARNING: This will destroy ALL infrastructure!$(NC)"
	@read -p "Are you sure? Type 'yes' to confirm: " confirm; \
	if [ "$$confirm" = "yes" ]; then \
		$(DIRENV) terraform -chdir=$(TF_DIR) destroy; \
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
		open docs/SOFTWARE.md; \
	elif command -v xdg-open >/dev/null 2>&1; then \
		xdg-open docs/SOFTWARE.md; \
	else \
		echo "$(YELLOW)Please manually open docs/SOFTWARE.md$(NC)"; \
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
