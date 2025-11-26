#!/bin/bash
# Generate Ansible inventory from Terraform output
# Called by: make ansible-inventory

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ANSIBLE_DIR="$(dirname "$SCRIPT_DIR")"
INVENTORY_JSON="${ANSIBLE_DIR}/inventory.json"
INVENTORY_DIR="${ANSIBLE_DIR}/inventory"
INVENTORY_FILE="${INVENTORY_DIR}/hosts.yml"

# Check if inventory.json exists
if [ ! -f "$INVENTORY_JSON" ]; then
    echo "Error: $INVENTORY_JSON not found"
    echo "Run: cd infrastructure/terraform && terraform output -json ansible_inventory > ../ansible/inventory.json"
    exit 1
fi

# Create inventory directory if it doesn't exist
mkdir -p "$INVENTORY_DIR"

# Parse JSON and generate YAML inventory
cat > "$INVENTORY_FILE" << 'EOF'
# Ansible Inventory - Auto-generated from Terraform
# DO NOT EDIT MANUALLY - regenerate with: make ansible-inventory

all:
  vars:
    ansible_user: ubuntu
    ansible_ssh_common_args: '-o StrictHostKeyChecking=no'

    # K3s configuration
    k3s_version: v1.28.5+k3s1
    k3s_become: true

    # First server initializes the cluster
    k3s_server_init: true
    # Note: k3s_etcd_datastore requires 3+ control plane nodes for HA

  children:
    k3s_cluster:
      children:
        server:
          hosts:
EOF

# Add server nodes
jq -r '.servers[] | "            \(.name):\n              ansible_host: \(.ip)\n              k3s_control_node: true"' "$INVENTORY_JSON" >> "$INVENTORY_FILE"

# Add agent section
cat >> "$INVENTORY_FILE" << 'EOF'
        agent:
          hosts:
EOF

# Add agent nodes
jq -r '.agents[] | "            \(.name):\n              ansible_host: \(.ip)"' "$INVENTORY_JSON" >> "$INVENTORY_FILE"

# Add GPU nodes group
cat >> "$INVENTORY_FILE" << 'EOF'
    gpu_nodes:
      hosts:
EOF

# Add GPU nodes
jq -r '.agents[] | select(.gpu_passthrough == true) | "        \(.name):\n          ansible_host: \(.ip)"' "$INVENTORY_JSON" >> "$INVENTORY_FILE"

echo "Generated: $INVENTORY_FILE"
