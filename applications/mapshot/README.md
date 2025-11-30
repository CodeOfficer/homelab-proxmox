# Factorio Mapshot

Zoomable web map visualization for the homelab Factorio server.

**URL:** https://mapshot.codeofficer.com/mapshot/latest/

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Triggers                                                        │
│  ├── PRIMARY: Log watcher sidecar (event-driven, ~60s latency)  │
│  └── FALLBACK: CronJob every 4 hours                            │
│                          │                                       │
│                          ▼                                       │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Render Job                                              │    │
│  │  1. Copy latest save from Factorio pod                   │    │
│  │  2. Check SHA256 vs .last-render-checksum                │    │
│  │  3. If changed: render map, update checksum              │    │
│  │  4. If unchanged: skip (exit early)                      │    │
│  └─────────────────────────────────────────────────────────┘    │
│                          │                                       │
│                          ▼                                       │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Server Deployment                                       │    │
│  │  • Serves rendered tiles via HTTP :8080                  │    │
│  │  • Mounts mapshot-data PVC                               │    │
│  └─────────────────────────────────────────────────────────┘    │
│                          │                                       │
│                          ▼ Ingress (Traefik + TLS)              │
│                https://mapshot.codeofficer.com                   │
└─────────────────────────────────────────────────────────────────┘
```

## Prerequisites

1. **Factorio full client** pre-installed on the PVC (Steam-linked accounts cannot download via API)
   - Download Linux version from https://factorio.com/profile
   - Upload to cluster: see "Initial Setup" below
2. Factorio.com credentials in `.envrc` (for future updates):
   ```bash
   export FACTORIO_USERNAME="your-username"
   export FACTORIO_TOKEN="your-api-token"
   ```
3. Run `direnv allow`

## Initial Setup (One-time)

If Factorio isn't already on the PVC:

```bash
# 1. Download factorio-space-age_linux_X.X.X.tar.xz from factorio.com
# 2. Upload and extract:
kubectl run upload -n mapshot --image=busybox --restart=Never \
  --overrides='{"spec":{"volumes":[{"name":"d","persistentVolumeClaim":{"claimName":"mapshot-data"}}],...}}'
kubectl cp factorio-space-age_linux_*.tar.xz mapshot/upload:/mapshot/
kubectl exec -n mapshot upload -- tar xf /mapshot/factorio*.tar.xz -C /mapshot
kubectl exec -n mapshot upload -- mkdir -p /mapshot/factorio/mods
kubectl exec -n mapshot upload -- sh -c 'echo {} > /mapshot/factorio/mods/mod-list.json'
kubectl delete pod upload -n mapshot
```

## Deployment

```bash
# Deploy mapshot
make deploy-mapshot

# Verify
kubectl get pods -n mapshot
kubectl get certificate -n mapshot
```

## Commands

```bash
# Manual render (triggers immediately, respects checksum)
make mapshot-render

# Force re-render (delete checksum first)
kubectl exec -n mapshot deploy/mapshot-server -- rm /opt/factorio/script-output/.last-render-checksum
make mapshot-render

# Check render job status
kubectl get jobs -n mapshot

# View render logs
kubectl logs -n mapshot -l job-name --tail=100 -f

# View checksum
kubectl exec -n mapshot deploy/mapshot-server -- cat /opt/factorio/script-output/.last-render-checksum
```

## How It Works

### Checksum Gating
- Computes SHA256 of the Factorio save file
- Compares against `.last-render-checksum` on the PVC
- Skips render if unchanged (saves CPU/time)
- Updates checksum after successful render

### Event-Driven Trigger (requires sidecar)
- Log watcher sidecar monitors Factorio logs for `[LEAVE]` events
- When detected, checks player count via RCON (`/players count`)
- If count == 0 (last player left), waits 60s (debounce)
- Re-checks player count, then triggers render job

### Fallback CronJob
- Runs every 4 hours
- Catches edge cases (sidecar crash, very long sessions)
- Also checksum-gated (won't render if unchanged)

## Troubleshooting

### No map showing
1. Check if render job ran: `kubectl get jobs -n mapshot`
2. View render logs: `kubectl logs -n mapshot -l job-name`
3. Verify save file exists: `kubectl exec -n factorio deploy/factorio-factorio-server-charts -- ls /factorio/saves/`

### Render failing
1. Check Factorio credentials are set: `echo $FACTORIO_USERNAME`
2. View detailed logs: `kubectl logs -n mapshot job/mapshot-manual-XXX`
3. Check resources: `kubectl describe pod -n mapshot -l job-name`

### TLS certificate not issued
1. Check cert status: `kubectl get certificate -n mapshot`
2. Check cert-manager logs: `kubectl logs -n cert-manager deploy/cert-manager`
3. Verify DNS: `dig mapshot.codeofficer.com`

## Resources

- [Mapshot GitHub](https://github.com/Palats/mapshot)
- [martydingo/factorio-mapshot-docker](https://github.com/martydingo/factorio-mapshot-docker)
- [Factorio Mod Portal](https://mods.factorio.com/mod/mapshot)
