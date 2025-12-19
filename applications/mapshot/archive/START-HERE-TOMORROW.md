# Start Here - GPU Mapshot Test Resumption

**Date:** Tomorrow (when resuming)  
**Estimated Time:** 30 minutes  
**Read First:** `GPU-FIX-PLAN.md` (full details)

---

## Quick Context Refresh

**What happened:**
- CPU test at 1024px resolution **timed out after 60 minutes** (0 tiles rendered)
- GPU test **failed to start** due to incomplete Factorio files on GPU node
- We need to properly install Factorio on GPU node and re-test

**Expected outcome:**
- GPU test should complete in **5-10 minutes** (vs 60+ min CPU)
- Will render 1,313 tiles at 2048px resolution
- Proves GPU is 10-20× faster than CPU

---

## ⚠️ QUESTIONS I NEED TO ASK YOU FIRST

Before we start Phase 1 of the plan, I need answers to:

### 1. Factorio Download Method

How should we get Factorio onto the GPU node?

**Option A:** Use Factorio.com API credentials
- ✅ Faster, automated
- ❌ Requires `FACTORIO_USERNAME` and `FACTORIO_TOKEN`
- **Question:** Do you have these credentials? (check `.envrc` or factorio.com profile)

**Option B:** Manual download on Mac + kubectl cp
- ✅ No credentials needed
- ❌ Slower, manual step
- **Question:** Should I provide the download link?

**Your answer:** _________________

---

### 2. Timing & Disruption

**Ollama Impact:**
- We need to scale down Ollama for ~15-20 minutes to free the GPU
- Ollama will be restored afterward

**Question:** Is now a good time, or should we schedule for later?

**Your answer:** _________________

---

### 3. Scope

What's the goal today?

- [ ] **Just test** - Validate GPU works, document results
- [ ] **Test + deploy** - If successful, update production cronjob immediately
- [ ] **Test + plan** - Success means we document deployment for later

**Your answer:** _________________

---

### 4. Additional Testing (Optional)

After GPU nauvis test succeeds, should we also test:

- [ ] **GPU all-surfaces** - Render all planets/platforms (20-40 min)
- [ ] **Skip** - Just nauvis test is enough

**Your answer:** _________________

---

## Quick Pre-Flight Check

Before starting, verify:

```bash
# 1. GPU available
kubectl get nodes k3s-gpu-01 -o json | jq '.status.allocatable."nvidia.com/gpu"'
# Should show: "1"

# 2. GPU PVC exists
kubectl get pvc mapshot-data-gpu -n mapshot
# Should show: Bound, 10Gi

# 3. In correct directory
pwd
# Should show: /Users/codeofficer/homelab-proxmox
```

---

## Once You've Answered Questions Above

Tell me your answers, and I'll:

1. ✅ Confirm prerequisites
2. ✅ Execute Phase 1-5 of GPU-FIX-PLAN.md
3. ✅ Monitor test in real-time
4. ✅ Compare results vs CPU test
5. ✅ Provide final recommendation

**Ready to start when you are!** 🚀

---

**Files to reference:**
- `GPU-FIX-PLAN.md` - Full detailed plan (read if confused)
- `TESTING.md` - Background on testing approach
- `TEST-QUICKSTART.md` - Quick command reference
