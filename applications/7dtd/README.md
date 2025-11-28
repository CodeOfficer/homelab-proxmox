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
| Game Server | `10.20.11.210:26900` |
| Web Admin | `http://10.20.11.210:8080` |
| Telnet | `10.20.11.210:8081` |

**First startup takes 30-45 minutes** (downloads ~12GB via Steam).

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
kubectl logs -n 7dtd -l app.kubernetes.io/name=7dtd -f

# Shell access
kubectl exec -it -n 7dtd deploy/7dtd-7dtd -- /bin/bash

# Restart (triggers game update)
kubectl rollout restart deployment -n 7dtd

# Helm status
helm status 7dtd -n 7dtd

# Uninstall
helm uninstall 7dtd -n 7dtd
```

## Game Updates

The server checks for updates on each pod restart:

```bash
# Trigger update
kubectl rollout restart deployment -n 7dtd
```

World data is preserved in persistent storage during updates.

## Backups

### Built-in Backups (Helm Chart)
- **Schedule:** Daily at 4 AM
- **Retention:** 7 backups
- **Location:** `7dtd-backups` PVC (local-path)

### NFS Sync (Optional)
The `backup-sync.yaml` CronJob copies backups to Synology NFS at 4:30 AM.

```bash
# Manual sync
kubectl create job --from=cronjob/7dtd-backup-sync manual-sync -n 7dtd
```

### Manual Backup

```bash
# Create backup
kubectl exec -n 7dtd deploy/7dtd-7dtd -- /backup-saves.sh

# List backups
kubectl exec -n 7dtd deploy/7dtd-7dtd -- ls -la /data/backups/
```

### Restore

```bash
# Stop server
kubectl scale deployment 7dtd-7dtd -n 7dtd --replicas=0

# Shell into a debug pod with the PVC mounted
# Copy backup files to /data/Saves/

# Restart
kubectl scale deployment 7dtd-7dtd -n 7dtd --replicas=1
```

## Configuration

Edit `values.yaml` and redeploy:

```bash
helm upgrade 7dtd 7dtd/7dtd -n 7dtd -f values.yaml
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
kubectl logs -n 7dtd -l app.kubernetes.io/name=7dtd --tail=200
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

Connect: `telnet 10.20.11.210 8081`

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
