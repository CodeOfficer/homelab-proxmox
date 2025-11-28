# Edge Cases and Failure Scenarios

This document covers failure modes, their symptoms, and recovery procedures.

## Infrastructure Dependencies

```
┌─────────────────────────────────────────────────────────────────┐
│                    Failure Impact Map                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  UNAS (10.20.10.20) ──────┐                                     │
│       │                    │                                     │
│       ▼                    ▼                                     │
│  ┌─────────┐         ┌──────────┐                               │
│  │ Ollama  │         │ Open     │  ← NFS dependent              │
│  │ (100Gi) │         │ WebUI    │                               │
│  └─────────┘         └──────────┘                               │
│                                                                  │
│  k3s-gpu-01 (pve-01) ─────┐                                     │
│       │                    │                                     │
│       ▼                    ▼                                     │
│  ┌─────────┐         ┌──────────┐                               │
│  │ Ollama  │         │PostgreSQL│  ← local-path on this node    │
│  │ (GPU)   │         │  Redis   │                               │
│  └─────────┘         └──────────┘                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Failure Scenarios

### 1. UNAS NFS Server Down

**Symptoms:**
- Ollama/Open WebUI pods stuck in `ContainerCreating` or crash with I/O errors
- `kubectl describe pod` shows `MountVolume.SetUp failed`
- Existing running pods may hang on disk I/O

**Impact:**
- Ollama: DOWN (models on NFS)
- Open WebUI: DOWN (data on NFS)
- PostgreSQL: UNAFFECTED (local-path)
- Redis: UNAFFECTED (local-path)

**Recovery:**
```bash
# 1. Wait for UNAS to come back online
ping 10.20.10.20

# 2. Verify NFS export is accessible
ssh root@10.20.11.11 "showmount -e 10.20.10.20"

# 3. Restart affected pods (they may be stuck)
kubectl delete pod -n ollama -l app=ollama
kubectl delete pod -n open-webui -l app=open-webui

# 4. Verify recovery
kubectl get pods -n ollama
kubectl get pods -n open-webui
```

**Prevention:**
- UNAS has RAID 5 - survives single disk failure
- Consider UPS for UNAS to prevent unclean shutdown
- Future: Add NFS server health check to monitoring

---

### 2. GPU Node (k3s-gpu-01) Down

**Symptoms:**
- Ollama pod in `Pending` state
- `kubectl describe pod` shows `0/3 nodes are available: 1 node(s) didn't match Pod's node selector`
- PostgreSQL/Redis may also be down if they scheduled to this node

**Impact:**
- Ollama: DOWN (requires GPU node)
- PostgreSQL: POSSIBLY DOWN (check which node)
- Redis: POSSIBLY DOWN (check which node)
- Open WebUI: UP but can't reach Ollama

**Check which node has databases:**
```bash
kubectl get pods -n databases -o wide
```

**Recovery:**
```bash
# 1. Check node status
kubectl get nodes

# 2. If node is NotReady, check Proxmox
# SSH to pve-01 and check VM status
ssh root@10.20.11.11 "qm status 210"

# 3. Start VM if stopped
ssh root@10.20.11.11 "qm start 210"

# 4. Wait for node to rejoin
kubectl wait --for=condition=Ready node/k3s-gpu-01 --timeout=300s

# 5. Pods should auto-reschedule
kubectl get pods -A -o wide
```

**If VM is corrupted:**
```bash
# Rebuild from Terraform (preserves nothing on local-path!)
cd infrastructure/terraform
terraform apply -target=module.k3s_agents

# Rejoin cluster
make ansible-k3s
```

**Prevention:**
- Proxmox HA can auto-restart VMs (not configured)
- Consider: databases on control plane nodes instead

---

### 3. Control Plane Node Down (k3s-cp-01 or k3s-cp-02)

**Symptoms:**
- `kubectl` commands may be slow or fail
- One node shows `NotReady`

**Impact:**
- Cluster: DEGRADED but operational (etcd has 2 members, needs 2 for quorum)
- Workloads: Keep running on healthy nodes

**CRITICAL: Both CP nodes down = cluster DOWN**

**Recovery:**
```bash
# 1. Check which node is down
kubectl get nodes

# 2. Check VM on Proxmox
ssh root@10.20.11.12 "qm status 200"  # k3s-cp-01 on pve-02
ssh root@10.20.11.13 "qm status 201"  # k3s-cp-02 on pve-03

# 3. Start if stopped
ssh root@10.20.11.12 "qm start 200"

# 4. Verify etcd health after recovery
kubectl get pods -n kube-system -l component=etcd
```

**Prevention:**
- Never reboot both CP nodes simultaneously
- Proxmox HA can protect against host failure

---

### 4. Full Homelab Reboot (Power Outage)

**Boot Order Dependencies:**
1. Network switch must be up first
2. UDM Pro (gateway/DNS)
3. UNAS (NFS storage)
4. Proxmox nodes
5. K3s VMs (auto-start in Proxmox)
6. K3s cluster forms (etcd quorum)
7. Pods start (may fail if NFS not ready)

**Symptoms after power restore:**
- Pods stuck in `ContainerCreating` (NFS not ready)
- Pods in `CrashLoopBackOff` (dependencies not ready)

**Recovery:**
```bash
# 1. Verify all infrastructure is up
ping 10.20.10.1   # UDM
ping 10.20.10.20  # UNAS
ping 10.20.11.11  # pve-01

# 2. Check K3s nodes
kubectl get nodes

# 3. Check pods
kubectl get pods -A

# 4. If NFS pods are stuck, restart them after UNAS is confirmed up
kubectl delete pod -n ollama -l app=ollama
kubectl delete pod -n open-webui -l app=open-webui

# 5. Full cluster restart if needed
kubectl delete pods --all -A  # Nuclear option
```

**Prevention:**
- UPS for critical infrastructure (switch, UNAS)
- Proxmox VM start delay: stagger VM boot times
- Future: Add startup health checks

---

### 5. PostgreSQL Password Mismatch

**Scenario:** Helm release deleted and reinstalled, but PVC retained old data with old password.

**Symptoms:**
- PostgreSQL pod in `CrashLoopBackOff`
- Logs show: `FATAL: password authentication failed`

**Recovery:**
```bash
# Option A: Delete PVC and lose data
kubectl delete pvc data-postgresql-0 -n databases
helm upgrade --install postgresql ...  # Fresh install

# Option B: Reset password in existing database
# 1. Edit postgres to trust local connections temporarily
kubectl exec -it postgresql-0 -n databases -- bash
# Edit pg_hba.conf to use 'trust' for local
# Restart postgres, reset password, revert pg_hba.conf
```

**Prevention:**
- Store passwords in `.secrets/` and reference them
- Never delete PVCs without backup
- Document passwords in password manager

---

### 6. NFS Provisioner Pod Not Running

**Symptoms:**
- New PVCs stuck in `Pending`
- `kubectl describe pvc` shows no provisioner responding

**Check:**
```bash
kubectl get pods -n kube-system -l app=nfs-subdir-external-provisioner
kubectl logs -n kube-system -l app=nfs-subdir-external-provisioner
```

**Recovery:**
```bash
# Restart provisioner
kubectl rollout restart deployment -n kube-system nfs-provisioner-nfs-subdir-external-provisioner

# If still failing, check NFS connectivity
kubectl exec -n kube-system -l app=nfs-subdir-external-provisioner -- df -h
```

---

### 7. Ollama Out of Disk Space

**Symptoms:**
- Model downloads fail
- Ollama logs show disk full errors

**Check:**
```bash
kubectl exec -n ollama deploy/ollama -- df -h /root/.ollama
```

**Recovery:**
```bash
# List models and remove unused ones
kubectl exec -n ollama deploy/ollama -- ollama list
kubectl exec -n ollama deploy/ollama -- ollama rm <model-name>

# Or expand PVC (if storage class supports it)
kubectl patch pvc ollama-models -n ollama -p '{"spec":{"resources":{"requests":{"storage":"200Gi"}}}}'
```

---

### 8. Certificate Renewal Failure

**Symptoms:**
- Browser shows certificate expired
- cert-manager logs show renewal errors

**Check:**
```bash
kubectl get certificates -A
kubectl describe certificate -n ollama ollama-tls
kubectl logs -n cert-manager -l app=cert-manager
```

**Recovery:**
```bash
# Force renewal by deleting the secret
kubectl delete secret ollama-tls -n ollama
# cert-manager will recreate it

# If Cloudflare API token expired
# Update in .envrc and redeploy secret
envsubst < applications/cert-manager/secret.yaml.example | kubectl apply -f -
```

---

## Quick Diagnostic Commands

```bash
# Overall health
kubectl get nodes
kubectl get pods -A | grep -v Running
kubectl get pvc -A

# NFS health
kubectl logs -n kube-system -l app=nfs-subdir-external-provisioner --tail=20

# Database health
kubectl exec -n databases postgresql-0 -- pg_isready
kubectl exec -n databases redis-master-0 -- redis-cli ping

# GPU health
kubectl exec -n ollama deploy/ollama -- nvidia-smi

# Storage usage
kubectl exec -n ollama deploy/ollama -- df -h /root/.ollama
kubectl exec -n databases postgresql-0 -- df -h /bitnami/postgresql
```

## Data Loss Risk Matrix

| Component | Storage | Node Failure | NFS Failure | Risk Level |
|-----------|---------|--------------|-------------|------------|
| Ollama models | NFS | Survives | **LOST** until NFS returns | Medium |
| Open WebUI data | NFS | Survives | **LOST** until NFS returns | Medium |
| PostgreSQL | local-path | **LOST** | Survives | **HIGH** |
| Redis | local-path | **LOST** | Survives | **HIGH** |

## Recommended Improvements

1. ~~**PostgreSQL backup CronJob**~~ - ✅ Implemented (daily 3 AM to Synology)
2. **Move databases to NFS** - Trade performance for resilience
3. **Proxmox HA** - Auto-restart VMs on node failure
4. **Monitoring/Alerting** - Know when things fail before users complain
5. **etcd snapshots** - Backup K3s cluster state
