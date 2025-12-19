# Ollama - LLM Inference Server

Ollama provides LLM inference with GPU acceleration on k3s-gpu-01.

## Architecture

- **Storage:** local-path PVC (100Gi on k3s-gpu-01 SSD)
- **Backup:** Daily rsync to NFS at 8 AM
- **GPU:** RTX 4000 Ada (20GB VRAM)
- **Models:** Stored in `/root/.ollama/models/`

## Model Management

### Pull Models

```bash
kubectl exec -n ollama $(kubectl get pod -n ollama -l app=ollama -o name) -- ollama pull qwen2.5-coder:7b
```

### List Models

```bash
kubectl exec -n ollama $(kubectl get pod -n ollama -l app=ollama -o name) -- ollama list
```

### Backup Models to NFS

```bash
make backup-ollama  # Manual backup (scales down Ollama during sync)
```

Auto-backup runs daily at 8 AM via CronJob.

### Restore Models from NFS

```bash
make restore-ollama  # Restores from NFS backup (scales down during sync)
```

Used after cluster rebuild or to recover from data loss.

## Storage Trade-offs

**Local-path storage** chosen for performance:
- ✅ Fast model loading (local SSD vs NFS latency)
- ✅ No network dependency for inference
- ❌ Requires explicit backup/restore workflow
- ❌ Models lost on PVC deletion

**NFS backup** provides durability:
- Automatic daily sync to UNAS
- Survives cluster rebuilds
- Mac Finder accessible at `/Volumes/K3sStorage/ollama/backups/models/`

## Troubleshooting

### Models Missing After Reboot

If Ollama shows no models after pod restart:

```bash
make restore-ollama  # Restore from NFS backup
```

### Backup Fails

Check NFS mount:

```bash
kubectl exec -n ollama <pod> -- ls -la /mnt/k3s-nfs/ollama/backups/
```

### GPU Not Available

Verify pod scheduled on GPU node:

```bash
kubectl get pod -n ollama -o wide  # Should show k3s-gpu-01
```

## Integration

**Open-WebUI:** https://chat.codeofficer.com
- Automatically detects models from Ollama
- Uses `OLLAMA_BASE_URL=http://ollama.ollama.svc.cluster.local:11434`

**External API:** https://ollama.codeofficer.com/api/tags
- List available models
- Requires authentication via Traefik

## Performance

- Model loading: ~5-10s from local-path SSD
- Inference: GPU-accelerated (RTX 4000 Ada)
- Backup time: ~2-3 min for 15GB of models
- Restore time: ~2-3 min from NFS
