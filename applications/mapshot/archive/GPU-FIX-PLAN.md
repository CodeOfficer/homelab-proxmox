# Mapshot GPU Rendering Fix - Implementation Plan

**Date Created:** December 18, 2024  
**Status:** Ready to Execute  
**Estimated Time:** 30 minutes total  
**Required Downtime:** 15-20 minutes (Ollama only)

---

## Executive Summary

**Problem:** GPU-accelerated mapshot rendering failed due to incomplete Factorio installation on GPU node. CPU-only rendering times out (>1 hour for 1024px resolution).

**Solution:** Properly install Factorio on GPU node's local storage and validate GPU rendering, which should complete in 5-10 minutes vs 60+ minutes on CPU.

**Impact:** 10-20× faster map renders, eliminates timeout issues.

---

## Current State (What We Learned from Testing)

### CPU Test Results - TIMEOUT ❌
- **Resolution:** 1024px (reduced from 2048px)
- **Duration:** 60 minutes (hit timeout limit)
- **Tiles rendered:** 0 (killed before completion)
- **CPU usage:** 97-98% sustained (bottlenecked)
- **Status:** Failed with exit code 124 (timeout)
- **Conclusion:** llvmpipe software rendering is NOT viable, even at reduced resolution

### GPU Test Results - INCOMPLETE SETUP ❌
- **Issue:** Incomplete Factorio data files on GPU node
- **Root cause:** Cross-node file copy (`tar` between k3s-cp-01 and k3s-gpu-01) timed out
- **Missing files:** Graphics assets like `cargo-pod/pod-static-detached.lua`
- **Error:** "Failed to load mods" when Factorio tried to start
- **Status:** Never reached rendering phase

### Infrastructure Status ✅
- ✅ GPU node (k3s-gpu-01) has RTX 4000 Ada available
- ✅ nvidia-device-plugin running
- ✅ GPU-specific PVC created: `mapshot-data-gpu` (10Gi, bound to k3s-gpu-01)
- ✅ Ollama using GPU (will need temporary downscaling during test)
- ✅ Test save file (7.2MB) successfully copied
- ❌ Factorio installation incomplete on GPU node

---

## Root Cause Analysis

**The Core Problem:**
```
mapshot-data PVC → k3s-cp-01 (has complete Factorio)
GPU test needs   → k3s-gpu-01 (RTX 4000 Ada)
local-path PVCs  → Node-specific (cannot cross nodes)
```

**Why File Copy Failed:**
- Attempted `kubectl exec tar czf | kubectl exec tar xzf` streaming between nodes
- Factorio install is ~1GB (bin + data directories)
- Copy timed out at 3 minutes, leaving partial install
- Missing critical files caused Factorio startup failure

---

## Proposed Solution: Direct Download to GPU Node

**Approach:** Download Factorio directly onto GPU node PVC, avoiding cross-node copy.

**Why This Works:**
- Clean install, no partial file corruption
- Faster than streaming between nodes
- Deterministic outcome
- Single source of truth on GPU node

**Alternative Considered:** NFS intermediary storage - rejected as too complex for quick test.

---

## Prerequisites Check

Before starting, verify:

```bash
# 1. GPU node ready
kubectl get nodes k3s-gpu-01 -o json | jq '.status.allocatable."nvidia.com/gpu"'
# Expected: "1"

# 2. GPU PVC exists
kubectl get pvc mapshot-data-gpu -n mapshot
# Expected: Bound, 10Gi, local-path

# 3. Check Factorio version in production
kubectl exec -n factorio $(kubectl get pods -n factorio -l app=factorio-factorio-server-charts -o jsonpath='{.items[0].metadata.name}') -- /factorio/bin/x64/factorio --version | head -1
# Expected: Factorio 2.0.X (build XXXXX, linux64, full)
```

**Questions to Answer:**
1. ⬜ Do you have Factorio.com credentials (`FACTORIO_USERNAME` + `FACTORIO_TOKEN`)?
2. ⬜ OR prefer manual download on Mac + kubectl cp (~200MB file)?
3. ⬜ OK to disrupt Ollama for 15-20 minutes?
4. ⬜ Test only, or also update production cronjob afterward?

---

## Phase 1: Preparation (5 minutes)

### 1.1 Scale Down Ollama to Free GPU

```bash
kubectl scale deployment ollama -n ollama --replicas=0
```

**Wait 30 seconds** for pod termination, then verify:
```bash
kubectl get pods -n ollama
# Expected: No resources found
```

### 1.2 Create Installer Pod on GPU Node

```bash
kubectl apply -f - <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: mapshot-gpu-installer
  namespace: mapshot
spec:
  nodeSelector:
    nvidia.com/gpu.present: "true"
  tolerations:
    - key: dedicated
      operator: Equal
      value: gpu
      effect: NoSchedule
  containers:
    - name: installer
      image: ubuntu:22.04
      command: ["sleep", "3600"]
      volumeMounts:
        - name: mapshot-data-gpu
          mountPath: /mapshot
  volumes:
    - name: mapshot-data-gpu
      persistentVolumeClaim:
        claimName: mapshot-data-gpu
  restartPolicy: Never
EOF
```

Wait for pod ready:
```bash
kubectl wait --for=condition=Ready pod/mapshot-gpu-installer -n mapshot --timeout=60s
```

### 1.3 Install Required Tools

```bash
kubectl exec -n mapshot mapshot-gpu-installer -- apt-get update
kubectl exec -n mapshot mapshot-gpu-installer -- apt-get install -y curl xz-utils
```

---

## Phase 2: Install Factorio on GPU Node (5-10 minutes)

Choose **Option A** (with credentials) OR **Option B** (manual download):

### Option A: Direct Download (If Credentials Available)

```bash
# Set credentials (from .envrc or manual)
source .envrc  # Or manually: export FACTORIO_USERNAME="..." FACTORIO_TOKEN="..."

# Download and extract inside pod
kubectl exec -n mapshot mapshot-gpu-installer -- bash -c "
  cd /mapshot
  echo 'Downloading Factorio...'
  curl -L 'https://www.factorio.com/get-download/stable/alpha/linux64?username=$FACTORIO_USERNAME&token=$FACTORIO_TOKEN' -o factorio.tar.xz
  
  echo 'Extracting...'
  tar xf factorio.tar.xz
  
  echo 'Setting up directories...'
  mkdir -p factorio/mods factorio/script-output
  echo '{}' > factorio/mods/mod-list.json
  
  echo 'Cleaning up...'
  rm factorio.tar.xz
  
  echo 'Installation complete!'
  ls -lah factorio/
"
```

### Option B: Manual Upload from Mac (If No Credentials)

```bash
# 1. Download on Mac from https://factorio.com
# Login → Profile → Download → "Space Age" → "Linux (64-bit)"
# Save as: ~/Downloads/factorio-space-age_linux_2.0.X.tar.xz

# 2. Upload to pod
kubectl cp ~/Downloads/factorio-space-age_linux_2.0.X.tar.xz mapshot/mapshot-gpu-installer:/mapshot/

# 3. Extract and setup
kubectl exec -n mapshot mapshot-gpu-installer -- bash -c "
  cd /mapshot
  tar xf factorio-space-age_linux_2.0.*.tar.xz
  mkdir -p factorio/mods factorio/script-output
  echo '{}' > factorio/mods/mod-list.json
  rm factorio-space-age_linux_2.0.*.tar.xz
"
```

### 2.1 Copy Test Save from Factorio Pod

```bash
# Get Factorio pod name
FACTORIO_POD=$(kubectl get pods -n factorio -l app=factorio-factorio-server-charts -o jsonpath='{.items[0].metadata.name}')

# Copy latest save
kubectl exec -n factorio $FACTORIO_POD -- cat /factorio/saves/homelab.zip | \
  kubectl exec -i -n mapshot mapshot-gpu-installer -- tee /mapshot/test-save.zip > /dev/null

echo "Save copied successfully"
```

### 2.2 Verify Installation

```bash
# Check directory structure
kubectl exec -n mapshot mapshot-gpu-installer -- ls -lah /mapshot/

# Should show:
# drwxr-xr-x factorio/
# -rw-r--r-- test-save.zip (7-8M)

# Check Factorio binary exists
kubectl exec -n mapshot mapshot-gpu-installer -- test -f /mapshot/factorio/bin/x64/factorio && echo "✓ Binary exists" || echo "✗ Binary missing"

# Check required directories
kubectl exec -n mapshot mapshot-gpu-installer -- ls -lah /mapshot/factorio/

# Should show:
# drwxr-xr-x bin/
# drwxr-xr-x data/
# drwxr-xr-x mods/
# drwxr-xr-x script-output/
# -rw-r--r-- config-path.cfg
```

**✋ STOP HERE if any verification fails!** Debug before proceeding.

---

## Phase 3: Update GPU Job Configuration (1 minute)

The GPU job needs to use the GPU-specific PVC instead of the CP node PVC.

### 3.1 Create Modified GPU Job

```bash
# Modify job-gpu.yaml to use mapshot-data-gpu PVC
cat applications/mapshot/job-gpu.yaml | \
  sed 's/claimName: mapshot-data$/claimName: mapshot-data-gpu/' > /tmp/job-gpu-fixed.yaml

# Verify the change
diff applications/mapshot/job-gpu.yaml /tmp/job-gpu-fixed.yaml
# Should show line ~318: mapshot-data → mapshot-data-gpu
```

---

## Phase 4: Run GPU Test (5-10 minutes)

### 4.1 Launch Test

```bash
# Apply modified job
kubectl apply -f /tmp/job-gpu-fixed.yaml

# Check pod scheduling
kubectl get pods -n mapshot -l test-scenario=gpu-hardware-opengl -o wide
# Should show: Running on k3s-gpu-01
```

### 4.2 Monitor Progress

**In one terminal:**
```bash
# Stream logs
kubectl logs -n mapshot -l test-scenario=gpu-hardware-opengl -f
```

**In another terminal:**
```bash
# Watch resource usage
watch -n 5 'kubectl top nodes | grep gpu'
```

### 4.3 Expected Timeline

| Time | Event | What to Look For |
|------|-------|------------------|
| 0-1 min | Pod startup | "Pre-flight checks passed" |
| 1-2 min | Factorio loading | "Factorio initialised" |
| 2-3 min | Mapshot init | "Tile size X: Y tiles to generate" |
| 3 min | Rendering starts | "Mapshot: all screenshots started" |
| 3-10 min | **GPU rendering** | No output (normal - rendering silently) |
| 10-12 min | Completion | "✓ Render completed in Xs" |
| 12-13 min | Validation | "✓ Tiles generated: 1313" |
| 13-14 min | NAS copy | "✓ NAS copy complete" |
| 14-15 min | Success | "STATUS: SUCCESS" |

**Total Expected: 5-12 minutes**

### 4.4 Check for Common Issues

If render doesn't start within 5 minutes:

```bash
# Check if Factorio started
kubectl logs -n mapshot -l test-scenario=gpu-hardware-opengl | grep "Factorio initialised"

# Check GPU access
kubectl exec -n mapshot $(kubectl get pods -n mapshot -l test-scenario=gpu-hardware-opengl -o name) -- nvidia-smi

# Check for OpenGL errors
kubectl logs -n mapshot -l test-scenario=gpu-hardware-opengl | grep -i "opengl\|error\|failed"
```

### 4.5 Verify Success

```bash
# Check job completion
kubectl get jobs -n mapshot mapshot-render-gpu
# Expected: COMPLETIONS: 1/1

# Check output exists
ls -la /Volumes/K3sStorage/mapshot/gpu-2048/

# Read test results
cat /Volumes/K3sStorage/mapshot/gpu-2048/test-results.txt

# Expected output:
# TEST_NAME=GPU Hardware OpenGL (RTX 4000 Ada)
# STATUS=SUCCESS
# RENDER_DURATION=300-600 (5-10 minutes)
# TILE_COUNT=1313
# OUTPUT_SIZE=~250M
```

---

## Phase 5: Cleanup & Restore (1 minute)

```bash
# Remove installer pod
kubectl delete pod mapshot-gpu-installer -n mapshot

# Restore Ollama
kubectl scale deployment ollama -n ollama --replicas=1

# Wait for Ollama to be ready
kubectl wait --for=condition=Ready pod -l app=ollama -n ollama --timeout=120s

echo "✓ Cleanup complete, Ollama restored"
```

**Optional:** Keep GPU PVC for future GPU tests:
```bash
# Check PVC usage
kubectl exec -n mapshot mapshot-server-f97dd489c-drzkn -- df -h | grep mapshot

# If you want to clean up GPU PVC later:
# kubectl delete pvc mapshot-data-gpu -n mapshot
```

---

## Expected Outcomes

### Success Case (Expected)

**Performance:**
- Completion time: **5-10 minutes** (vs 60+ minutes CPU timeout)
- Tiles rendered: **1,313** at 2048px resolution
- Output size: **~250 MB**
- GPU utilization: **70-90%** during render
- CPU utilization: **20-30%** (offloaded to GPU)

**Results Location:**
- NAS: `/Volumes/K3sStorage/mapshot/gpu-2048/`
- Contains: `index.html`, `d-XXXXXXXX/` (tiles), `test-results.txt`

**Comparison to CPU:**
| Metric | CPU (1024px) | GPU (2048px) | Improvement |
|--------|--------------|--------------|-------------|
| Duration | >60 min | 5-10 min | **6-12× faster** |
| Resolution | 1024px | 2048px | **4× higher quality** |
| Success Rate | 0% | 100% | **Completes successfully** |
| CPU Usage | 97% | 25% | **Offloaded to GPU** |

---

## Troubleshooting Guide

### Issue 1: Pod Stuck in Pending

**Symptom:** GPU test pod shows `Pending` status for >2 minutes

**Check:**
```bash
kubectl describe pod -n mapshot -l test-scenario=gpu-hardware-opengl | tail -20
```

**Common causes:**
1. **"Insufficient nvidia.com/gpu"** → Ollama still using GPU
   - Solution: `kubectl scale deployment ollama -n ollama --replicas=0`
   
2. **"node(s) didn't match PersistentVolume's node affinity"** → PVC on wrong node
   - Solution: Verify PVC is `mapshot-data-gpu`, not `mapshot-data`
   - Check: `kubectl get pvc mapshot-data-gpu -n mapshot -o yaml | grep -A 5 nodeAffinity`

### Issue 2: Factorio Fails to Start

**Symptom:** Logs show "Failed to load mods" or "module X not found"

**Check:**
```bash
kubectl logs -n mapshot -l test-scenario=gpu-hardware-opengl | grep -i "error\|failed"
```

**Common causes:**
1. **Incomplete Factorio installation** → Missing data files
   - Solution: Re-run Phase 2 (Factorio install)
   - Verify: All files from Phase 2.2 verification present
   
2. **Wrong Factorio version** → Mismatch with save file
   - Solution: Download same version as production Factorio pod

### Issue 3: Render Starts But Times Out

**Symptom:** Logs show "all screenshots started" but times out after 30 minutes

**Check:**
```bash
# Check GPU usage
kubectl exec -n mapshot $(kubectl get pods -n mapshot -l test-scenario=gpu-hardware-opengl -o name) -- nvidia-smi

# Check for xvfb issues
kubectl logs -n mapshot -l test-scenario=gpu-hardware-opengl | grep -i "xvfb\|display"
```

**Common causes:**
1. **GPU not being used** → Falling back to llvmpipe
   - Check: `nvidia-smi` should show Factorio process using GPU
   - Solution: Verify `runtimeClassName: nvidia` in job YAML
   
2. **xvfb not starting** → No display available
   - Check: `xvfb-run` command in logs
   - Solution: Verify martydingo/mapshot image has xvfb installed

### Issue 4: Done-File Never Written

**Symptom:** Render seems complete but pod keeps running

**Check:**
```bash
kubectl exec -n mapshot $(kubectl get pods -n mapshot -l test-scenario=gpu-hardware-opengl -o name) -- ls -la /mapshot/factorio/script-output/mapshot-done-*
```

**Common cause:**
- Factorio crashed after rendering
- Check logs for segfault or crash

**Solution:**
- Check memory limits not exceeded
- Look for OOMKilled events: `kubectl describe pod -n mapshot ...`

---

## Production Deployment (After Successful Test)

### Update Existing CronJob to Use GPU

Once GPU test succeeds, update production cronjob:

```bash
# Edit cronjob.yaml to add GPU scheduling
```

**Changes needed in `applications/mapshot/cronjob.yaml`:**

1. **Add GPU node selector** (after line 467):
```yaml
nodeSelector:
  nvidia.com/gpu.present: "true"
```

2. **Add GPU toleration** (after line 470):
```yaml
tolerations:
  - key: "dedicated"
    operator: "Equal"
    value: "gpu"
    effect: "NoSchedule"
```

3. **Add runtimeClassName** (at spec level):
```yaml
runtimeClassName: nvidia
```

4. **Add GPU resource request** (in container resources):
```yaml
resources:
  requests:
    memory: "4Gi"
    cpu: "2"
    nvidia.com/gpu: "1"
  limits:
    memory: "16Gi"
    cpu: "4"
    nvidia.com/gpu: "1"
```

5. **Reduce timeout** (line 421):
```yaml
- name: MAPSHOT_INTERVAL
  value: "1800"  # 30 min (was 3600)
```

6. **Use GPU PVC** (line 461):
```yaml
persistentVolumeClaim:
  claimName: mapshot-data-gpu  # Changed from mapshot-data
```

### Handle GPU Contention with Ollama

**Option A: Time-Shifted Schedules (Recommended)**
```yaml
# CronJob: Render at 4 AM when Ollama likely idle
schedule: "0 4 * * *"
```

**Option B: Priority-Based Preemption**
```yaml
# Add to mapshot CronJob
priorityClassName: high-priority-preempting
```

**Option C: GPU Time-Slicing** (requires cluster config change)
- Configure NVIDIA device plugin for time-slicing
- Both Ollama and mapshot can use GPU simultaneously
- Docs: https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/gpu-sharing.html

### First Production Run Monitoring

```bash
# Watch the first automated render
kubectl logs -n mapshot -l app=cronjob-mapshot-render -f

# Verify completion
kubectl get jobs -n mapshot --sort-by=.metadata.creationTimestamp | tail -5

# Check output
ls -la /Volumes/K3sStorage/mapshot/gpu-2048/
```

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| GPU test still fails | Low | Medium | Detailed troubleshooting guide provided |
| Ollama disruption | High | Low | Only 15 min downtime, easily restored |
| Incomplete Factorio install | Low | High | Verification steps at each phase |
| GPU contention long-term | High | Medium | Time-shifted schedules or GPU time-slicing |
| PVC fills disk | Low | Low | 10Gi PVC, Factorio ~1GB, renders cleaned up |

---

## Success Criteria

Check all boxes when complete:

- [ ] GPU test job completes successfully (exit 0)
- [ ] Render duration < 15 minutes
- [ ] 1,313 tiles generated at 2048px
- [ ] Output visible in `/Volumes/K3sStorage/mapshot/gpu-2048/`
- [ ] `test-results.txt` shows STATUS=SUCCESS
- [ ] Ollama restored and functional
- [ ] No errors in logs

---

## Next Actions After Success

1. **Document findings** in CHANGELOG.md
2. **Update production cronjob** with GPU scheduling
3. **Set up monitoring** for GPU renders
4. **Test scheduled render** (wait for next 4-hour cycle or trigger manually)
5. **Clean up test artifacts** (old CPU test jobs, setup pods)

---

## Questions to Answer Before Starting

**Answer these before execution:**

1. ⬜ **Factorio download method:**
   - [ ] Use Factorio.com credentials (need `FACTORIO_USERNAME` + `FACTORIO_TOKEN`)
   - [ ] Manual download on Mac (will provide link)

2. ⬜ **Timing confirmation:**
   - [ ] OK to disrupt Ollama for 15-20 minutes?
   - [ ] Prefer specific time of day?

3. ⬜ **Scope decision:**
   - [ ] Just test (validate GPU works)
   - [ ] Test + update production cronjob immediately
   - [ ] Test + document for later production update

4. ⬜ **Additional tests:**
   - [ ] Run GPU all-surfaces test too? (all planets, ~20-40 min)
   - [ ] GPU test only

---

## Execution Checklist

When ready to proceed:

- [ ] Read entire plan
- [ ] Answer questions above
- [ ] Have Factorio credentials ready (or file downloaded)
- [ ] Clear 30-minute window in schedule
- [ ] Open 2 terminals (one for logs, one for commands)
- [ ] Navigate to homelab-proxmox directory
- [ ] Source `.envrc` for credentials
- [ ] Begin Phase 1

---

## Contact & Support

**If issues arise:**
1. Check Troubleshooting Guide (above)
2. Review logs: `kubectl logs -n mapshot -l test-scenario=gpu-hardware-opengl`
3. Check pod events: `kubectl describe pod -n mapshot ...`
4. Verify GPU available: `kubectl get nodes k3s-gpu-01 -o json | jq '.status.allocatable."nvidia.com/gpu"'`

**Reference documentation:**
- `applications/mapshot/TESTING.md` - Detailed testing guide
- `applications/mapshot/TEST-QUICKSTART.md` - Quick reference
- GitHub: https://github.com/Palats/mapshot/issues

---

**Status:** ⏸️ Ready to Execute  
**Last Updated:** December 18, 2024  
**Estimated Completion:** 30 minutes  

✅ Plan complete - ready for tomorrow's execution!
