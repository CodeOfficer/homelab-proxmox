# 7 Days to Die Dedicated Server

Kubernetes deployment for 7 Days to Die using the [thelande/7dtd](https://github.com/thelande/7dtd) Helm chart.

## Quick Start

```bash
# Deploy
./deploy.sh

# Or via Makefile
make deploy-7dtd
```

## Connection Info

| Service | Address |
|---------|---------|
| Game Server | `10.20.11.201:26900` |

**First startup takes 30-45 minutes** (downloads ~12GB via Steam).

**Note:** Web admin and telnet are available via pod port-forward if needed:
```bash
kubectl port-forward -n sdtd deploy/sdtd-7dtd 8080:8080 8081:8081
```

## Steam Account

**No Steam account required.** The server uses anonymous SteamCMD login.

| Question | Answer |
|----------|--------|
| Do I need a Steam account? | **No** - uses anonymous login |
| Do I need to own the game? | **No** - dedicated server (App ID 294420) is free |
| Any credentials to configure? | **No** - just deploy |
| Can I play with my personal account? | **Yes** - no conflict |

The dedicated server downloads via Steam's public anonymous access. Connect and play using your personal Steam account normally.

## Management Commands

```bash
# View logs
kubectl logs -n sdtd -l app.kubernetes.io/name=7dtd -f

# Shell access
kubectl exec -it -n sdtd deploy/sdtd-7dtd -- /bin/bash

# Restart (triggers game update)
kubectl rollout restart deployment -n sdtd sdtd-7dtd

# Helm status
helm status sdtd -n sdtd

# Uninstall
helm uninstall sdtd -n sdtd
```

## Game Updates

The server checks for updates on each pod restart:

```bash
# Trigger update
kubectl rollout restart deployment -n sdtd
```

World data is preserved in persistent storage during updates.

## Backups

### Built-in Backups (Helm Chart)
- **Schedule:** Every 30 minutes (while server running)
- **Retention:** 48 backups (~24 hours)
- **Location:** `sdtd-7dtd-backups` PVC (local-path)

### NFS Sync (Optional)
The `backup-sync.yaml` CronJob copies backups to Synology NFS at 4:30 AM.

```bash
# Manual sync
kubectl create job --from=cronjob/sdtd-backup-sync manual-sync -n sdtd
```

### Manual Backup

```bash
# Create backup
kubectl exec -n sdtd deploy/sdtd-7dtd -- /backup-saves.sh

# List backups
kubectl exec -n sdtd deploy/sdtd-7dtd -- ls -la /data/backups/
```

### Restore

```bash
# Stop server
kubectl scale deployment sdtd-7dtd -n sdtd --replicas=0

# Shell into a debug pod with the PVC mounted
# Copy backup files to /data/Saves/

# Restart
kubectl scale deployment sdtd-7dtd -n sdtd --replicas=1
```

## Configuration

Edit `values.yaml` and redeploy:

```bash
helm upgrade sdtd 7dtd/7dtd -n sdtd -f values.yaml
```

### Key Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `serverName` | Homelab 7DTD | Server display name |
| `serverPassword` | (empty) | Password to join |
| `serverMaxPlayerCount` | 8 | Max players |
| `gameDifficulty` | 2 | 0-5 scale |
| `gameWorld` | Navezgane | Map (or "RWG" for random) |
| `bloodMoonFrequency` | 7 | Days between blood moons |

## Ports

| Port | Protocol | Purpose |
|------|----------|---------|
| 26900 | TCP/UDP | Game server |
| 26901-26903 | UDP | Game traffic |
| 8080 | TCP | Web admin dashboard |
| 8081 | TCP | Telnet console |

## Troubleshooting

### Server won't start

Check logs for Steam download issues:
```bash
kubectl logs -n sdtd -l app.kubernetes.io/name=7dtd --tail=200
```

### Out of memory

Increase limits in `values.yaml`:
```yaml
resources:
  limits:
    memory: "12Gi"
```

### Slow world loading

Game is disk-intensive. Using `local-path` StorageClass provides better I/O than NFS.

## Admin Commands (via Telnet)

```bash
# Port-forward first
kubectl port-forward -n sdtd deploy/sdtd-7dtd 8081:8081

# Then connect
telnet localhost 8081
```

```
help                 # List commands
listplayers          # Show online players
kick <name>          # Kick player
ban <name>           # Ban player
say "message"        # Server announcement
shutdown             # Graceful shutdown
```

## Resources

- [Helm Chart](https://github.com/thelande/7dtd)
- [7DTD Wiki](https://developer.valvesoftware.com/wiki/7_Days_to_Die_Dedicated_Server)
- [serverconfig.xml Options](https://7daystodie.fandom.com/wiki/Server)
