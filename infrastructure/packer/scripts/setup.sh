#!/bin/bash
set -e

echo "================================"
echo "Ubuntu 24.04 K3s Template Setup"
echo "================================"

# Update system
echo "Updating system packages..."
sudo apt-get update
sudo apt-get upgrade -y

# Install essential packages
echo "Installing essential packages..."
sudo apt-get install -y \
    qemu-guest-agent \
    cloud-init \
    cloud-initramfs-growroot \
    curl \
    wget \
    vim \
    git \
    htop \
    net-tools \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release \
    nfs-common \
    open-iscsi

# Enable and start qemu-guest-agent
echo "Enabling qemu-guest-agent..."
sudo systemctl enable qemu-guest-agent
sudo systemctl start qemu-guest-agent

# Configure cloud-init for Proxmox
echo "Configuring cloud-init..."
sudo tee /etc/cloud/cloud.cfg.d/99-pve.cfg > /dev/null <<EOF
datasource_list: [NoCloud, ConfigDrive]
EOF

# Disable automatic updates (K3s nodes should be updated manually)
echo "Disabling automatic updates..."
sudo systemctl disable apt-daily.timer
sudo systemctl disable apt-daily-upgrade.timer

# Configure system for K3s
echo "Optimizing system for K3s..."

# Enable IP forwarding
sudo tee -a /etc/sysctl.d/k8s.conf > /dev/null <<EOF
net.ipv4.ip_forward = 1
net.ipv6.conf.all.forwarding = 1
net.bridge.bridge-nf-call-iptables = 1
net.bridge.bridge-nf-call-ip6tables = 1
EOF

# Load required kernel modules
sudo tee /etc/modules-load.d/k8s.conf > /dev/null <<EOF
overlay
br_netfilter
EOF

# Disable swap (required for K8s)
echo "Disabling swap..."
sudo swapoff -a
sudo sed -i '/ swap / s/^/#/' /etc/fstab

# Configure system limits
echo "Configuring system limits..."
sudo tee -a /etc/security/limits.conf > /dev/null <<EOF
* soft nofile 65536
* hard nofile 65536
* soft nproc 32768
* hard nproc 32768
EOF

# Install Docker (optional, K3s can use containerd)
# Uncomment if you want Docker pre-installed
# echo "Installing Docker..."
# curl -fsSL https://get.docker.com | sh
# sudo usermod -aG docker ubuntu

# Clean up
echo "Cleaning up..."
sudo apt-get autoremove -y
sudo apt-get autoclean -y

# Clear logs and caches
sudo journalctl --vacuum-time=1s
sudo rm -rf /var/log/*.log
sudo rm -rf /var/log/syslog*
sudo rm -rf /var/cache/apt/archives/*.deb

echo "================================"
echo "Setup complete!"
echo "================================"
