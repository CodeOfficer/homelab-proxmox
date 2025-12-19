# Mapshot GPU vs CPU Testing - Quick Start

## TL;DR

Run GPU and CPU tests **in parallel** to get comparison data in ~30 minutes:

```bash
# 1. Setup (one-time)
make mapshot-test-setup

# 2. Run simplest comparison (GPU 2048px + CPU 1024px)
make mapshot-test-parallel-simple

# 3. Watch progress (live updates)
make mapshot-test-watch-parallel

# 4. View results
make mapshot-test-results
open /Volumes/K3sStorage/mapshot/gpu-2048/
open /Volumes/K3sStorage/mapshot/cpu-llvmpipe-1024/
```

**Done!** You'll know which backend wins in 30 minutes.

---

## What's Being Tested

| Test | Node | Resolution | Expected Time | Why? |
|------|------|------------|---------------|------|
| **GPU** | k3s-gpu-01 (RTX 4000 Ada) | 2048px | 5-10 min | Hardware OpenGL - should be fast |
| **CPU Fast** | k3s-cp-01/02 (llvmpipe) | 1024px | 10-30 min | Software OpenGL - reduced resolution fallback |

Both run **simultaneously** on different nodes - no resource contention.

---

## Expected Outcomes

### ✅ Success Scenario (Most Likely)
- **GPU completes in 5-10 min** → Use as primary (10-20× faster)
- **CPU completes in 10-30 min** → Use as fallback when GPU node down
- **Decision:** Deploy GPU job with CronJob, keep CPU as manual fallback

### ⚠️ GPU Fails (Unlikely)
- **GPU times out after 30 min** → xvfb/OpenGL issue on GPU node
- **CPU completes in 10-30 min** → CPU is viable, just slower
- **Decision:** Debug GPU (try VirtualGL), use CPU 1024px as primary for now

### ❌ Both Fail (Needs Investigation)
- Both timeout → Fundamental issue with mapshot/xvfb setup
- Check: Factorio version, save file corruption, mod conflicts
- **Decision:** Review logs, check GitHub issues, test with minimal save

---

## Monitoring During Test

### Option 1: Live Watch (Recommended)
```bash
make mapshot-test-watch-parallel
```
Refreshes every 10 seconds. Shows:
- Job status (Active/Complete/Failed)
- Pod status (Running/Succeeded)
- Last 3 log lines from each test

**Press Ctrl+C to exit** (jobs continue in background).

### Option 2: Individual Logs
```bash
# Separate terminals
make mapshot-test-logs-gpu        # GPU logs
make mapshot-test-logs-cpu-fast   # CPU logs
```

### Option 3: Quick Status Check
```bash
make mapshot-test-status
```
Shows completion status without streaming logs.

---

## After Tests Complete

### View Performance Data
```bash
make mapshot-test-results
```

**Output:**
```
Job Status:
NAME                    SCENARIO              RESOLUTION  STATUS     DURATION
mapshot-render-gpu      gpu-hardware-opengl   2048        Complete   10:15:23Z
mapshot-render-cpu-fast cpu-llvmpipe-reduced  1024        Complete   11:02:45Z

Test Results (from NAS):
--- gpu-2048 ---
TEST_NAME=GPU Hardware OpenGL (RTX 4000 Ada)
STATUS=SUCCESS
RENDER_DURATION=347        ← 5.8 minutes
TILE_COUNT=1420

--- cpu-llvmpipe-1024 ---
TEST_NAME=CPU Fast (llvmpipe, 1024px)
STATUS=SUCCESS
RENDER_DURATION=1823       ← 30.4 minutes
TILE_COUNT=355
```

### Visual Comparison
```bash
# Open both renders side-by-side
open /Volumes/K3sStorage/mapshot/gpu-2048/index.html
open /Volumes/K3sStorage/mapshot/cpu-llvmpipe-1024/index.html
```

Compare:
- **Tile detail** (zoom in to factory details)
- **File size** (GPU 2048px will be 4× larger than CPU 1024px)
- **Loading speed** (more tiles = slower initial load)

---

## Advanced: Full Resolution CPU Comparison

If you want to test CPU at **same resolution** as GPU (2048px):

```bash
make mapshot-test-parallel-full
```

**Warning:** CPU llvmpipe at 2048px takes **30-120 minutes**. GPU will finish in 10 min, then you wait for CPU.

**Why run this?**
- Validates that timeout is the issue (not data corruption)
- Shows worst-case CPU performance
- Confirms 1024px is a necessary compromise

---

## Troubleshooting

### "Test save not found"
```bash
make mapshot-test-setup
```
This copies latest save from Factorio pod to mapshot PVC.

### "Factorio not found"
Install Factorio on PVC (one-time):
```bash
# Download from factorio.com, then:
MAPSHOT_POD=$(kubectl get pods -n mapshot -l app=mapshot-server -o jsonpath='{.items[0].metadata.name}')
kubectl cp factorio-space-age_linux_2.0.X.tar.xz mapshot/$MAPSHOT_POD:/mapshot/
kubectl exec -n mapshot $MAPSHOT_POD -- tar xf /mapshot/factorio*.tar.xz -C /mapshot
```

See `TESTING.md` for detailed instructions.

### Jobs stuck in "Pending"
```bash
kubectl describe pod -n mapshot -l test-scenario
```
Check:
- GPU job: Is `nvidia.com/gpu: 1` resource available?
- CPU job: Are control plane nodes schedulable?

### Jobs fail immediately
```bash
make mapshot-test-logs-gpu
make mapshot-test-logs-cpu-fast
```
Look for:
- "Pre-flight checks" section - what failed?
- OpenGL errors
- NAS mount issues

---

## Cleanup

### After Each Test Run
```bash
make mapshot-test-cleanup      # Remove jobs (keep outputs)
```

### Before Fresh Test
```bash
make mapshot-test-cleanup-nas  # Remove all outputs (WARNING: destructive)
make mapshot-test-setup        # Re-copy latest save
```

---

## Next Steps

1. **Run test:** `make mapshot-test-parallel-simple`
2. **Wait 30 min:** GPU finishes first (~10 min), CPU finishes ~20 min later
3. **Review results:** `make mapshot-test-results`
4. **Compare visuals:** Open both renders in browser
5. **Make decision:** GPU wins? CPU fallback? Both fail?
6. **Update production:** Convert winning Job to CronJob, deploy

---

## Command Reference

```bash
# Setup
make mapshot-test-setup              # Copy save, verify Factorio

# Parallel tests (recommended)
make mapshot-test-parallel-simple    # GPU 2048px + CPU 1024px (~30 min)
make mapshot-test-parallel-full      # GPU 2048px + CPU 2048px (~120 min)

# Individual tests
make mapshot-test-gpu                # GPU only (~10 min)
make mapshot-test-cpu-fast           # CPU 1024px only (~30 min)
make mapshot-test-cpu-llvmpipe       # CPU 2048px only (~120 min)

# Monitoring
make mapshot-test-watch-parallel     # Live dashboard (refreshes every 10s)
make mapshot-test-status             # Quick status check
make mapshot-test-logs-gpu           # Stream GPU logs
make mapshot-test-logs-cpu-fast      # Stream CPU logs
make mapshot-test-results            # Performance summary

# Cleanup
make mapshot-test-cleanup            # Remove jobs
make mapshot-test-cleanup-nas        # Remove outputs (WARNING)
```

---

## Files Created

All test artifacts are in `applications/mapshot/`:

- `job-gpu.yaml` - GPU render Job (nauvis, 2048px)
- `job-cpu-fast.yaml` - CPU render Job (nauvis, 1024px)
- `job-cpu-llvmpipe.yaml` - CPU render Job (nauvis, 2048px)
- `job-gpu-all.yaml` - GPU render Job (all surfaces, 2048px)
- `TESTING.md` - Detailed testing guide
- `TEST-QUICKSTART.md` - This file

**Outputs:**
- `/mnt/k3s-nfs/mapshot/gpu-2048/` - GPU render
- `/mnt/k3s-nfs/mapshot/cpu-llvmpipe-1024/` - CPU fast render
- Each contains `test-results.txt` with performance metrics

---

Ready to test! Start with `make mapshot-test-setup` then `make mapshot-test-parallel-simple`. 🚀
