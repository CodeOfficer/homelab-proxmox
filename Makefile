.PHONY: help check init plan apply destroy infra setup-kube test clean setup-mac
.PHONY: deploy deploy-all deploy-infrastructure deploy-applications deploy-k8s
.PHONY: logs status kubectl ssh-server ssh-agent
.PHONY: template template-validate template-init template-clean
.PHONY: iso-upload iso-check
.PHONY: ansible-deps ansible-k3s ansible-expand-disk ansible-tailscale kubeconfig save-token clean-known-hosts
.PHONY: deploy-7dtd 7dtd-logs 7dtd-shell 7dtd-update 7dtd-status
.PHONY: deploy-factorio factorio-logs factorio-status factorio-rcon factorio-restore-import factorio-restore-latest
.PHONY: deploy-monitoring monitoring-status grafana-password
.PHONY: deploy-mapshot mapshot-render mapshot-status mapshot-logs
.PHONY: deploy-loki loki-status
.PHONY: deploy-k8s-dashboard k8s-dashboard-token k8s-dashboard-status

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
# Mac Setup
# =============================================================================

setup-mac: ## Install Mac dependencies via Homebrew
	@echo "$(BLUE)Installing Mac dependencies...$(NC)"
	@if ! command -v brew >/dev/null 2>&1; then \
		echo "$(RED)Homebrew not installed. Install from https://brew.sh$(NC)"; \
		exit 1; \
	fi
	brew bundle --no-upgrade
	@echo ""
	@echo "$(GREEN)All dependencies installed!$(NC)"
	@if [ -z "$$DIRENV_DIR" ]; then \
		echo "$(YELLOW)Next: Configure direnv in your shell:$(NC)"; \
		echo "  Add to ~/.zshrc: eval \"\$$(direnv hook zsh)\""; \
		echo "  Then: source ~/.zshrc"; \
	fi

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

clean-known-hosts: ## Remove K3s VM host keys from known_hosts (for rebuilds)
	@echo "$(BLUE)Clearing known_hosts for K3s VMs...$(NC)"
	@ssh-keygen -R 10.20.11.80 2>/dev/null || true
	@ssh-keygen -R 10.20.11.81 2>/dev/null || true
	@ssh-keygen -R 10.20.11.85 2>/dev/null || true
	@echo "$(GREEN)Known hosts cleared$(NC)"

ansible-k3s: ansible-deps clean-known-hosts ## Install K3s on VMs using Ansible
	@echo "$(BLUE)Installing K3s cluster...$(NC)"
	@if [ ! -f ".secrets/k3s-token" ] && [ -z "$${K3S_TOKEN:-}" ]; then \
		echo "$(YELLOW)WARNING: No K3s token found (.secrets/k3s-token or K3S_TOKEN env)$(NC)"; \
		echo "$(YELLOW)This will create a FRESH cluster. If rebuilding, restore token first.$(NC)"; \
		echo ""; \
		read -p "Continue with fresh install? [y/N] " confirm && [ "$$confirm" = "y" ] || exit 1; \
	fi
	$(DIRENV) ansible-playbook -i $(ANSIBLE_DIR)/inventory/hosts.yml $(ANSIBLE_DIR)/playbooks/k3s-install.yml
	@$(MAKE) save-token
	@echo "$(GREEN)K3s cluster installed!$(NC)"
	@echo ""
	@echo "$(YELLOW)Next: make kubeconfig$(NC)"

save-token: ## Save K3s cluster token to .secrets/k3s-token
	@echo "$(BLUE)Saving K3s cluster token...$(NC)"
	@mkdir -p .secrets
	@$(DIRENV) ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ubuntu@$(FIRST_SERVER_IP) "sudo cat /var/lib/rancher/k3s/server/node-token" > .secrets/k3s-token 2>/dev/null
	@chmod 600 .secrets/k3s-token
	@echo "$(GREEN)Token saved to .secrets/k3s-token$(NC)"

ansible-expand-disk: ## Expand filesystem after disk resize (idempotent)
	@echo "$(BLUE)Expanding filesystems to fill disks...$(NC)"
	$(DIRENV) ansible-playbook -i $(ANSIBLE_DIR)/inventory/hosts.yml $(ANSIBLE_DIR)/playbooks/expand-disk.yml
	@echo "$(GREEN)Filesystems expanded!$(NC)"

ansible-tailscale: ansible-deps ## Install Tailscale subnet router on k3s-cp-01
	@echo "$(BLUE)Installing Tailscale subnet router...$(NC)"
	$(DIRENV) ansible-playbook -i $(ANSIBLE_DIR)/inventory/hosts.yml $(ANSIBLE_DIR)/playbooks/tailscale-install.yml
	@echo "$(GREEN)Tailscale installed!$(NC)"
	@echo ""
	@echo "$(YELLOW)Next: SSH to k3s-cp-01 and run:$(NC)"
	@echo "  sudo tailscale up --advertise-routes=10.20.11.0/24"
	@echo ""
	@echo "$(YELLOW)Then approve route in Tailscale admin:$(NC)"
	@echo "  https://login.tailscale.com/admin/machines"

kubeconfig: ## Fetch kubeconfig from K3s cluster
	@echo "$(BLUE)Fetching kubeconfig...$(NC)"
	$(DIRENV) ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o IdentitiesOnly=yes ubuntu@$(FIRST_SERVER_IP) "sudo cat /etc/rancher/k3s/k3s.yaml" 2>/dev/null | \
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

NFS_SERVER ?= 10.20.10.20

check-nfs: ## Verify NFS server is reachable before deployment
	@echo "$(BLUE)Checking NFS availability...$(NC)"
	@if nc -z -w 5 $(NFS_SERVER) 2049 2>/dev/null; then \
		echo "$(GREEN)NFS server $(NFS_SERVER) is reachable$(NC)"; \
	else \
		echo "$(RED)ERROR: NFS server $(NFS_SERVER) is not reachable on port 2049$(NC)"; \
		echo "$(RED)Deployment will fail - ensure UNAS is online$(NC)"; \
		exit 1; \
	fi

deploy-k8s: check-nfs ## Deploy all K8s manifests from applications/ (ordered)
	@echo "$(BLUE)Deploying K8s manifests...$(NC)"
	@export KUBECONFIG=$(TF_DIR)/kubeconfig; \
	echo "$(YELLOW)1/11 Installing MetalLB...$(NC)"; \
	kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.14.9/config/manifests/metallb-native.yaml; \
	kubectl wait --for=condition=Available deployment --all -n metallb-system --timeout=120s; \
	kubectl apply -f applications/metallb/config.yaml; \
	echo "$(YELLOW)2/11 Deploying nvidia-device-plugin...$(NC)"; \
	kubectl apply -f applications/nvidia-device-plugin/; \
	echo "$(YELLOW)3/11 Installing cert-manager...$(NC)"; \
	kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.17.1/cert-manager.yaml; \
	kubectl wait --for=condition=Available deployment --all -n cert-manager --timeout=120s; \
	echo "$(YELLOW)4/11 Deploying cert-manager config...$(NC)"; \
	envsubst < applications/cert-manager/secret.yaml.example > applications/cert-manager/secret.yaml; \
	kubectl apply -f applications/cert-manager/secret.yaml; \
	kubectl apply -f applications/cert-manager/clusterissuer.yaml; \
	echo "$(YELLOW)5/11 Installing NFS provisioner...$(NC)"; \
	helm repo add nfs-subdir-external-provisioner https://kubernetes-sigs.github.io/nfs-subdir-external-provisioner/ 2>/dev/null || true; \
	helm upgrade --install nfs-provisioner nfs-subdir-external-provisioner/nfs-subdir-external-provisioner \
		-n kube-system -f applications/nfs-provisioner/values.yaml --wait; \
	echo "$(YELLOW)6/11 Deploying Traefik middleware...$(NC)"; \
	kubectl apply -f applications/traefik/middleware.yaml; \
	echo "$(YELLOW)7/11 Deploying hello-world...$(NC)"; \
	kubectl apply -f applications/hello-world/; \
	echo "$(YELLOW)8/11 Deploying ollama...$(NC)"; \
	kubectl apply -f applications/ollama/; \
	kubectl rollout status deployment/ollama -n ollama --timeout=180s || true; \
	echo "$(YELLOW)9/11 Deploying open-webui...$(NC)"; \
	kubectl apply -f applications/open-webui/; \
	echo "$(YELLOW)10/11 Installing PostgreSQL...$(NC)"; \
	kubectl apply -f applications/postgresql/namespace.yaml; \
	envsubst < applications/postgresql/values.yaml > /tmp/postgresql-values.yaml; \
	helm upgrade --install postgresql oci://registry-1.docker.io/bitnamicharts/postgresql \
		-n databases -f /tmp/postgresql-values.yaml --wait; \
	echo "$(YELLOW)11/11 Installing Redis...$(NC)"; \
	envsubst < applications/redis/values.yaml > /tmp/redis-values.yaml; \
	helm upgrade --install redis oci://registry-1.docker.io/bitnamicharts/redis \
		-n databases -f /tmp/redis-values.yaml --wait
	@echo "$(GREEN)All K8s manifests deployed!$(NC)"

deploy: ## Deploy a specific application (usage: make deploy APP=postgresql)
	@if [ -z "$(APP)" ]; then \
		echo "$(RED)Error: APP not specified$(NC)"; \
		echo "Usage: make deploy APP=<app-name>"; \
		exit 1; \
	fi
	@echo "$(BLUE)Deploying $(APP)...$(NC)"
	./scripts/deploy-app.sh $(APP)

deploy-all-apps: ## Deploy all applications with deploy.sh scripts (after deploy-k8s)
	@echo "$(BLUE)Deploying all applications...$(NC)"
	@echo "$(YELLOW)1/8 PostgreSQL...$(NC)"
	@./applications/postgresql/deploy.sh
	@echo "$(YELLOW)2/8 Monitoring (Prometheus/Grafana)...$(NC)"
	@./applications/monitoring/deploy.sh
	@echo "$(YELLOW)3/8 Loki...$(NC)"
	@./applications/loki/deploy.sh
	@echo "$(YELLOW)4/8 7 Days to Die...$(NC)"
	@./applications/7dtd/deploy.sh
	@echo "$(YELLOW)5/8 Factorio...$(NC)"
	@./applications/factorio/deploy.sh
	@echo "$(YELLOW)6/8 Mapshot...$(NC)"
	@./applications/mapshot/deploy.sh
	@echo "$(YELLOW)7/8 UnPoller...$(NC)"
	@./applications/unpoller/deploy.sh || echo "$(YELLOW)UnPoller skipped (credentials may be missing)$(NC)"
	@echo "$(YELLOW)8/8 Kubernetes Dashboard...$(NC)"
	@./applications/kubernetes-dashboard/deploy.sh
	@echo "$(GREEN)All applications deployed!$(NC)"

deploy-full: deploy-k8s deploy-all-apps ## Full deployment (infrastructure + all applications)
	@echo "$(GREEN)Full deployment complete!$(NC)"

deploy-all: deploy-infrastructure deploy-applications ## [DEPRECATED] Use deploy-full instead
	@echo "$(GREEN)All applications deployed!$(NC)"

deploy-infrastructure: ## [DEPRECATED] Infrastructure deployed via deploy-k8s
	@echo "$(BLUE)Deploying infrastructure services...$(NC)"
	@make deploy APP=postgresql
	@make deploy APP=redis
	@make deploy APP=minio
	@echo "$(GREEN)Infrastructure services deployed!$(NC)"

deploy-applications: ## [DEPRECATED] Use deploy-all-apps instead
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

# =============================================================================
# Game Servers
# =============================================================================

deploy-7dtd: ## Deploy 7 Days to Die game server
	@echo "$(BLUE)Deploying 7 Days to Die...$(NC)"
	@./applications/7dtd/deploy.sh

7dtd-logs: ## Tail 7DTD server logs
	kubectl logs -n sdtd -l app.kubernetes.io/name=7dtd -f --tail=100

7dtd-shell: ## Open shell in 7DTD container
	kubectl exec -it -n sdtd $$(kubectl get pods -n sdtd -l app.kubernetes.io/name=7dtd -o jsonpath='{.items[0].metadata.name}') -- /bin/bash

7dtd-update: ## Update 7DTD (restarts pod, triggers game update)
	@echo "$(BLUE)Restarting 7DTD to trigger update...$(NC)"
	kubectl rollout restart deployment -n sdtd sdtd-7dtd
	@echo "$(GREEN)Update triggered. Check logs with: make 7dtd-logs$(NC)"

7dtd-status: ## Show 7DTD server status
	@echo "$(BLUE)7 Days to Die Status$(NC)"
	@echo ""
	helm status sdtd -n sdtd 2>/dev/null || echo "$(YELLOW)Not deployed$(NC)"
	@echo ""
	kubectl get pods -n sdtd 2>/dev/null || true

deploy-factorio: ## Deploy Factorio game server
	@echo "$(BLUE)Deploying Factorio...$(NC)"
	@./applications/factorio/deploy.sh

factorio-logs: ## Tail Factorio server logs
	kubectl logs -n factorio -l app=factorio-factorio-server-charts -f --tail=100

factorio-status: ## Show Factorio server status
	@echo "$(BLUE)Factorio Status$(NC)"
	@echo ""
	helm status factorio -n factorio 2>/dev/null || echo "$(YELLOW)Not deployed$(NC)"
	@echo ""
	kubectl get pods -n factorio 2>/dev/null || true
	@echo ""
	@echo "$(YELLOW)LoadBalancer IP:$(NC)"
	kubectl get svc -n factorio -o jsonpath='{.items[0].status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "pending"

factorio-rcon: ## Port-forward to Factorio RCON
	@echo "$(BLUE)Port-forwarding to RCON on localhost:27015...$(NC)"
	kubectl port-forward -n factorio svc/factorio-factorio-server-charts-rcon 27015:27015

factorio-restore-import: ## Restore Factorio save from game-imports/homelab.zip
	@echo "$(BLUE)Restoring Factorio save from game-imports...$(NC)"
	@echo "Scaling down deployment..."
	@kubectl scale deployment/factorio-factorio-server-charts -n factorio --replicas=0
	@sleep 10
	@echo "Copying save from NFS..."
	@kubectl run factorio-restore --rm -i --restart=Never --image=alpine:latest -n factorio \
		--overrides='{"spec":{"nodeSelector":{"node-role.kubernetes.io/control-plane":"true"},"tolerations":[{"key":"node-role.kubernetes.io/control-plane","operator":"Exists","effect":"NoSchedule"}],"containers":[{"name":"restore","image":"alpine:latest","command":["/bin/sh","-c","cp /nfs/factorio/game-imports/homelab.zip /factorio/saves/homelab.zip && chown 845:845 /factorio/saves/homelab.zip && echo Done && ls -la /factorio/saves/"],"volumeMounts":[{"name":"data","mountPath":"/factorio"},{"name":"nfs","mountPath":"/nfs"}]}],"volumes":[{"name":"data","persistentVolumeClaim":{"claimName":"factorio-factorio-server-charts-datadir"}},{"name":"nfs","nfs":{"server":"10.20.10.20","path":"/volume/567898ba-8471-4adb-9be9-d3e1f96fa7ba/.srv/.unifi-drive/K3sStorage/.data"}}]}}'
	@echo "Scaling up deployment..."
	@kubectl scale deployment/factorio-factorio-server-charts -n factorio --replicas=1
	@kubectl rollout status deployment/factorio-factorio-server-charts -n factorio --timeout=120s
	@echo "$(GREEN)Restore complete! Verifying...$(NC)"
	@sleep 10
	@kubectl logs -n factorio -l app=factorio-factorio-server-charts --tail=5 | grep -E "Loading map|bytes" || true

factorio-restore-latest: ## Restore Factorio save from backups/latest.zip
	@echo "$(BLUE)Restoring Factorio save from backups/latest.zip...$(NC)"
	@echo "Scaling down deployment..."
	@kubectl scale deployment/factorio-factorio-server-charts -n factorio --replicas=0
	@sleep 10
	@echo "Copying save from NFS..."
	@kubectl run factorio-restore --rm -i --restart=Never --image=alpine:latest -n factorio \
		--overrides='{"spec":{"nodeSelector":{"node-role.kubernetes.io/control-plane":"true"},"tolerations":[{"key":"node-role.kubernetes.io/control-plane","operator":"Exists","effect":"NoSchedule"}],"containers":[{"name":"restore","image":"alpine:latest","command":["/bin/sh","-c","cp /nfs/factorio/backups/latest.zip /factorio/saves/homelab.zip && chown 845:845 /factorio/saves/homelab.zip && echo Done && ls -la /factorio/saves/"],"volumeMounts":[{"name":"data","mountPath":"/factorio"},{"name":"nfs","mountPath":"/nfs"}]}],"volumes":[{"name":"data","persistentVolumeClaim":{"claimName":"factorio-factorio-server-charts-datadir"}},{"name":"nfs","nfs":{"server":"10.20.10.20","path":"/volume/567898ba-8471-4adb-9be9-d3e1f96fa7ba/.srv/.unifi-drive/K3sStorage/.data"}}]}}'
	@echo "Scaling up deployment..."
	@kubectl scale deployment/factorio-factorio-server-charts -n factorio --replicas=1
	@kubectl rollout status deployment/factorio-factorio-server-charts -n factorio --timeout=120s
	@echo "$(GREEN)Restore complete! Verifying...$(NC)"
	@sleep 10
	@kubectl logs -n factorio -l app=factorio-factorio-server-charts --tail=5 | grep -E "Loading map|bytes" || true

# =============================================================================
# Monitoring (Prometheus + Grafana)
# =============================================================================

deploy-monitoring: ## Deploy Prometheus + Grafana monitoring stack
	@echo "$(BLUE)Deploying monitoring stack...$(NC)"
	@./applications/monitoring/deploy.sh

monitoring-status: ## Show monitoring stack status
	@echo "$(BLUE)Monitoring Stack Status$(NC)"
	@echo ""
	helm status monitoring -n monitoring 2>/dev/null || echo "$(YELLOW)Not deployed$(NC)"
	@echo ""
	kubectl get pods -n monitoring 2>/dev/null || true
	@echo ""
	@echo "$(YELLOW)Grafana URL: https://grafana.codeofficer.com$(NC)"

grafana-password: ## Show Grafana admin password
	@if [ -f .secrets/grafana-admin-password ]; then \
		echo "$(BLUE)Grafana Admin Password:$(NC)"; \
		cat .secrets/grafana-admin-password; \
		echo ""; \
	else \
		echo "$(RED)Password file not found. Run deploy-monitoring first.$(NC)"; \
	fi

# =============================================================================
# Mapshot (Factorio Map Visualization)
# =============================================================================

deploy-mapshot: ## Deploy Mapshot for Factorio map rendering
	@echo "$(BLUE)Deploying Mapshot...$(NC)"
	@./applications/mapshot/deploy.sh

mapshot-render: ## Trigger manual map render
	@echo "$(BLUE)Triggering Mapshot render...$(NC)"
	kubectl create job --from=cronjob/mapshot-render -n mapshot mapshot-manual-$$(date +%s)
	@echo "$(GREEN)Render job created. View logs with: make mapshot-logs$(NC)"

mapshot-status: ## Show Mapshot status
	@echo "$(BLUE)Mapshot Status$(NC)"
	@echo ""
	@echo "$(YELLOW)Server:$(NC)"
	kubectl get pods -n mapshot -l app=mapshot-server 2>/dev/null || echo "Not deployed"
	@echo ""
	@echo "$(YELLOW)Recent render jobs:$(NC)"
	kubectl get jobs -n mapshot --sort-by=.metadata.creationTimestamp 2>/dev/null | tail -5 || true
	@echo ""
	@echo "$(YELLOW)URL: https://mapshot.codeofficer.com$(NC)"

mapshot-logs: ## View latest Mapshot render logs
	@echo "$(BLUE)Mapshot Render Logs$(NC)"
	@LATEST=$$(kubectl get jobs -n mapshot --sort-by=.metadata.creationTimestamp -o jsonpath='{.items[-1].metadata.name}' 2>/dev/null); \
	if [ -n "$$LATEST" ]; then \
		echo "Job: $$LATEST"; \
		kubectl logs -n mapshot job/$$LATEST --all-containers; \
	else \
		echo "$(YELLOW)No render jobs found$(NC)"; \
	fi

# =============================================================================
# Loki (Log Aggregation)
# =============================================================================

deploy-loki: ## Deploy Loki log aggregation stack
	@echo "$(BLUE)Deploying Loki stack...$(NC)"
	@./applications/loki/deploy.sh

loki-status: ## Show Loki deployment status
	@echo "$(BLUE)Loki Status$(NC)"
	@echo ""
	helm status loki -n loki 2>/dev/null || echo "$(YELLOW)Not deployed$(NC)"
	@echo ""
	kubectl get pods -n loki 2>/dev/null || true
	@echo ""
	@echo "$(YELLOW)Query logs in Grafana: Explore -> Loki datasource$(NC)"
# =============================================================================
# Kubernetes Dashboard
# =============================================================================

deploy-k8s-dashboard: ## Deploy Kubernetes Dashboard with Let's Encrypt TLS
	@echo "$(BLUE)Deploying Kubernetes Dashboard...$(NC)"
	@./applications/kubernetes-dashboard/deploy.sh

k8s-dashboard-token: ## Display dashboard login token
	@if [ -f ".secrets/k8s-dashboard-token" ]; then \
		echo "$(BLUE)Dashboard Login Token:$(NC)"; \
		echo ""; \
		cat .secrets/k8s-dashboard-token; \
		echo ""; \
		echo ""; \
		echo "$(YELLOW)Dashboard URL: https://k8s.codeofficer.com$(NC)"; \
	else \
		echo "$(RED)Token not found. Generate with:$(NC)"; \
		echo "  kubectl -n kubernetes-dashboard create token admin-user --duration=87600h > .secrets/k8s-dashboard-token"; \
	fi

k8s-dashboard-status: ## Show Kubernetes Dashboard status
	@echo "$(BLUE)Kubernetes Dashboard Status$(NC)"
	@echo ""
	helm status kubernetes-dashboard -n kubernetes-dashboard 2>/dev/null || echo "$(YELLOW)Not deployed$(NC)"
	@echo ""
	@echo "$(BLUE)Pods:$(NC)"
	kubectl get pods -n kubernetes-dashboard 2>/dev/null || true
	@echo ""
	@echo "$(BLUE)Certificate:$(NC)"
	kubectl get certificate -n kubernetes-dashboard 2>/dev/null || true
	@echo ""
	@echo "$(BLUE)Ingress:$(NC)"
	kubectl get ingress -n kubernetes-dashboard 2>/dev/null || true
	@echo ""
	@echo "$(YELLOW)Dashboard URL: https://k8s.codeofficer.com$(NC)"
	@echo "$(YELLOW)Get token: make k8s-dashboard-token$(NC)"
