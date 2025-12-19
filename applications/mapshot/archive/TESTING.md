# Mapshot GPU vs CPU Testing Guide

This guide walks through testing Factorio mapshot rendering on GPU (RTX 4000 Ada) vs CPU (llvmpipe software OpenGL).

## Goal

Determine the optimal rendering backend by comparing:
- **Completion time** (GPU should be 10-20× faster)
- **Success rate** (does it complete without timeout?)
- **Output quality** (visual comparison at different resolutions)

## Test Scenarios

| Scenario | Backend | Node | Resolution | Surface | Expected Time | Timeout | Output Path |
|----------|---------|------|------------|---------|---------------|---------|-------------|
| **1. GPU** | RTX 4000 Ada | k3s-gpu-01 | 2048px | nauvis | 5-10 min | 30 min | `/mnt/k3s-nfs/mapshot/gpu-2048/` |
| **2. CPU llvmpipe** | Software | k3s-cp-01/02 | 2048px | nauvis | 30-120 min | 2 hours | `/mnt/k3s-nfs/mapshot/cpu-llvmpipe-2048/` |
| **3. CPU fast** | Software | k3s-cp-01/02 | 1024px | nauvis | 10-30 min | 1 hour | `/mnt/k3s-nfs/mapshot/cpu-llvmpipe-1024/` |
| **4. GPU all** | RTX 4000 Ada | k3s-gpu-01 | 2048px | ALL | 20-40 min | 1 hour | `/mnt/k3s-nfs/mapshot/gpu-all-2048/` |

---

## Prerequisites

### 1. Factorio Must Be Pre-installed on PVC

The test Jobs expect Factorio to exist at `/mapshot/factorio/` on the mapshot-data PVC.

**One-time setup:**

```bash
# 1. Download Factorio full client (NOT headless) from factorio.com
# Login → Profile → Download → Space Age (Linux 64-bit)
# Save as: factorio-space-age_linux_2.0.X.tar.xz

# 2. Get mapshot pod name
MAPSHOT_POD=$(kubectl get pods -n mapshot -l app=mapshot-server -o jsonpath='{.items[0].metadata.name}')

# 3. Upload to PVC
kubectl cp factorio-space-age_linux_2.0.X.tar.xz mapshot/$MAPSHOT_POD:/mapshot/

# 4. Extract
kubectl exec -n mapshot $MAPSHOT_POD -- tar xf /mapshot/factorio-space-age_linux_2.0.X.tar.xz -C /mapshot

# 5. Create mods directory
kubectl exec -n mapshot $MAPSHOT_POD -- mkdir -p /mapshot/factorio/mods
kubectl exec -n mapshot $MAPSHOT_POD -- sh -c 'echo {} > /mapshot/factorio/mods/mod-list.json'

# 6. Verify
kubectl exec -n mapshot $MAPSHOT_POD -- /mapshot/factorio/bin/x64/factorio --version
# Should output: Factorio 2.0.X (build XXXXX, linux64, full)
```

**Important:** Must be the **full client** (alpha), NOT headless. Headless cannot render screenshots.

### 2. Copy Test Save to PVC

```bash
make mapshot-test-setup
```

This will:
- Find the latest Factorio save
- Copy it to `/mapshot/test-save.zip` on the PVC
- Verify Factorio installation

---

## Running Tests

### Quick Test (GPU - 10 minutes)

Start here to validate GPU rendering works:

```bash
make mapshot-test-gpu
```

**Watch logs in real-time:**
```bash
make mapshot-test-logs-gpu
```

**Expected output:**
```
[STEP 1] Pre-flight checks passed
[STEP 2] State cleared
[STEP 3] Starting render...
[STEP 4] ✓ Tiles generated: 1420
[STEP 5] ✓ NAS copy complete: 234M
[STEP 6] SUCCESS - Render completed in 347s (5m)
```

**If it fails:**
- Check GPU availability: `kubectl exec -n mapshot <pod> -- nvidia-smi`
- Check logs for OpenGL errors
- Verify node scheduling: `kubectl get pod -n mapshot -o wide` (should be on k3s-gpu-01)

---

### CPU Baseline Test (2 hours)

**Only run if you have time** - this is SLOW:

```bash
make mapshot-test-cpu-llvmpipe
```

Starts job in background. Monitor with:
```bash
make mapshot-test-logs-cpu-llvmpipe
```

Check status:
```bash
kubectl get jobs -n mapshot -l test-scenario=cpu-llvmpipe-software
```

**Expected:** Completes in 30-120 minutes, or times out after 2 hours (current problem).

---

### CPU Fast Test (30 minutes)

Practical fallback option with reduced resolution:

```bash
make mapshot-test-cpu-fast
```

**If this succeeds but 2048px fails**, it confirms the timeout issue and validates 1024px as a viable fallback.

---

### GPU All Surfaces Test (Optional)

Only if you need all planets rendered:

```bash
make mapshot-test-gpu-all
```

Takes 3-4× longer than nauvis-only, depending on how built-out your planets are.

---

## Viewing Results

### Check Test Status

```bash
make mapshot-test-results
```

**Output:**
```
Job Status:
NAME                        SCENARIO                  RESOLUTION  STATUS     DURATION
mapshot-render-gpu          gpu-hardware-opengl       2048        Complete   2024-12-18T10:15:23Z
mapshot-render-cpu-fast     cpu-llvmpipe-reduced      1024        Complete   2024-12-18T11:02:45Z

Test Results (from NAS):
--- gpu-2048 ---
TEST_NAME=GPU Hardware OpenGL (RTX 4000 Ada)
STATUS=SUCCESS
RENDER_DURATION=347
TILE_COUNT=1420

--- cpu-llvmpipe-1024 ---
TEST_NAME=CPU Fast (llvmpipe, 1024px reduced resolution)
STATUS=SUCCESS
RENDER_DURATION=1823
TILE_COUNT=355
```

### View Renders on Mac

All outputs are synced to NAS for easy Mac access:

```bash
open /Volumes/K3sStorage/mapshot/gpu-2048/
open /Volumes/K3sStorage/mapshot/cpu-llvmpipe-1024/
```

Each folder contains:
- `index.html` - Viewer (open in browser)
- `d-XXXXXXXX/` - Render directory with tiles
- `test-results.txt` - Performance metrics

---

## Data Collection

### Automated Metrics

Each test writes `test-results.txt` with:
```
TEST_NAME=...
STATUS=SUCCESS|TIMEOUT|FAIL
RENDER_DURATION=347       # seconds (render only)
TOTAL_DURATION=362        # seconds (including setup/cleanup)
TILE_COUNT=1420           # tiles generated
OUTPUT_SIZE=234M          # disk usage
RESOLUTION=2048
SURFACE=nauvis
FACTORIO_VERSION=Factorio 2.0.16
GPU_MODEL=NVIDIA RTX 4000 Ada Generation  # (GPU tests only)
CPU_MODEL=Intel i9-12900H                 # (CPU tests only)
TIMESTAMP=2024-12-18T10:15:23+00:00
```

### Manual Comparison Table

| Metric | GPU 2048px | CPU 2048px | CPU 1024px | GPU All |
|--------|-----------|-----------|-----------|---------|
| **Status** | | | | |
| **Duration (min)** | | | | |
| **Tile Count** | | | | |
| **Output Size (MB)** | | | | |
| **Quality** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Notes** | | | | |

**Fill this in after running tests!**

---

## Troubleshooting

### Job Fails Immediately

**Check logs:**
```bash
kubectl logs -n mapshot job/mapshot-render-gpu --tail=50
```

**Common errors:**

1. **"Factorio not found"**
   - Solution: Install Factorio on PVC (see Prerequisites)

2. **"Test save not found"**
   - Solution: Run `make mapshot-test-setup`

3. **"nvidia-smi not available"** (GPU tests)
   - Check: `kubectl get nodes -o wide` - is k3s-gpu-01 Ready?
   - Check: `kubectl describe node k3s-gpu-01 | grep nvidia.com/gpu`
   - Verify: nvidia-device-plugin is running

4. **"NAS not mounted"**
   - Check: `kubectl exec -n mapshot <pod> -- ls /nas`
   - Verify: hostPath volume in Job YAML points to `/mnt/k3s-nfs`

### Job Times Out

**CPU llvmpipe timeout after 2 hours:**
- This is the **current problem** - validates the issue
- Expected behavior with software rendering at 2048px
- Try `make mapshot-test-cpu-fast` (1024px) instead

**GPU timeout after 30 minutes:**
- Unexpected! GPU should complete in 5-10 min
- Check GPU utilization: `kubectl exec -n mapshot <pod> -- nvidia-smi`
- Check for OpenGL errors in logs
- May need VirtualGL wrapper (see Advanced section)

### Rendering Stalls at "all screenshots started"

**Symptoms:**
- Log shows "Mapshot: all screenshots started..."
- No progress for 10+ minutes
- Job eventually times out

**This is the core issue we're debugging!**

**Diagnosis:**
1. Check if done-file ever gets written:
   ```bash
   kubectl exec -n mapshot <pod> -- ls -la /mapshot/factorio/script-output/mapshot-done-*
   ```

2. Check Factorio process:
   ```bash
   kubectl exec -n mapshot <pod> -- ps aux | grep factorio
   ```

3. Check for lock file:
   ```bash
   kubectl exec -n mapshot <pod> -- ls -la /mapshot/factorio/.lock
   ```

**If GPU test also stalls**, it may be an xvfb/OpenGL issue, not just llvmpipe slowness.

---

## Advanced: VirtualGL (If GPU Test Fails)

If GPU test stalls like CPU, try enabling VirtualGL for hardware acceleration in xvfb:

**Edit `job-gpu.yaml`:**
```yaml
# Add before "timeout ${MAPSHOT_INTERVAL}" line
Xvfb :99 -screen 0 1920x1080x24 -ac +extension GLX +render -noreset &
export DISPLAY=:99

# Replace "xvfb-run" with "vglrun"
vglrun mapshot render ...
```

**Requires:** VirtualGL installed in container (may need custom image).

---

## Cleanup

### Remove Test Jobs (keep outputs)
```bash
make mapshot-test-cleanup
```

### Remove All Outputs from NAS
```bash
make mapshot-test-cleanup-nas
```

**Warning:** This deletes all test renders! Download anything you want to keep first.

---

## Decision Tree

After testing, follow this logic:

```
✅ GPU test succeeded in <15 min?
   ├─ YES → Use GPU as primary
   │   ├─ Need all surfaces?
   │   │   ├─ YES → Deploy job-gpu-all.yaml (scheduled)
   │   │   └─ NO → Deploy job-gpu.yaml (scheduled)
   │   └─ Add CPU fallback?
   │       └─ Deploy job-cpu-fast.yaml (scheduled, offset 4h)
   │
   └─ NO → GPU failed/slow
       ├─ Try VirtualGL (see Advanced)
       ├─ Check nvidia-device-plugin
       └─ Fallback: Use job-cpu-fast.yaml (1024px) as primary

✅ CPU llvmpipe 2048px succeeded?
   ├─ YES → Use as fallback for GPU downtime
   └─ NO (timeout) → Use CPU 1024px instead

✅ CPU fast 1024px succeeded?
   ├─ YES → Viable fallback, acceptable quality
   └─ NO → Investigate xvfb/OpenGL setup
```

---

## Next Steps After Testing

1. **Record results** in the comparison table above
2. **Take screenshots** of each render for visual comparison
3. **Choose primary backend** based on success + speed
4. **Convert winning Job to CronJob** (add schedule, remove backoffLimit: 0)
5. **Update production cronjob.yaml** with winning config
6. **Document findings** in CHANGELOG.md

---

## Quick Reference

```bash
# Setup (one-time)
make mapshot-test-setup

# Run tests (choose one or all)
make mapshot-test-gpu              # GPU 2048px - 10 min
make mapshot-test-cpu-fast         # CPU 1024px - 30 min
make mapshot-test-cpu-llvmpipe     # CPU 2048px - 2 hours (slow!)
make mapshot-test-gpu-all          # GPU all surfaces - 40 min

# Monitor
make mapshot-test-logs-gpu
make mapshot-test-logs-cpu-fast
make mapshot-test-results

# View outputs
open /Volumes/K3sStorage/mapshot/gpu-2048/
open /Volumes/K3sStorage/mapshot/cpu-llvmpipe-1024/

# Cleanup
make mapshot-test-cleanup          # Remove jobs
make mapshot-test-cleanup-nas      # Remove outputs (WARNING: destructive)
```

---

## Expected Timeline

**Fastest path (GPU validation only):**
- Setup: 5 min
- GPU test: 10 min
- Review: 5 min
- **Total: 20 minutes**

**Full comparison (GPU + CPU fast):**
- Setup: 5 min
- GPU test: 10 min
- CPU fast test: 30 min
- Review: 10 min
- **Total: 55 minutes**

**Thorough testing (all scenarios):**
- Setup: 5 min
- GPU test: 10 min
- CPU fast test: 30 min
- CPU llvmpipe test: 120 min (background)
- GPU all test: 40 min (optional)
- Review: 15 min
- **Total: 3-4 hours** (most of it waiting)

---

## Support

**If tests fail:**
1. Check logs: `make mapshot-test-logs-<scenario>`
2. Check pod scheduling: `kubectl get pods -n mapshot -o wide`
3. Check GPU: `kubectl exec -n mapshot <pod> -- nvidia-smi`
4. Verify NAS: `kubectl exec -n mapshot <pod> -- ls /nas/mapshot`
5. Review Job YAML: `kubectl get job -n mapshot <job-name> -o yaml`

**GitHub Issues:**
- [Palats/mapshot Issues](https://github.com/Palats/mapshot/issues)
- Issue #16: xvfb/VirtualGL workarounds
- Issue #54: Factorio 2.0 rendering problems

Good luck! 🚀
