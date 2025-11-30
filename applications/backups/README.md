# K8s App Backups

All K8s app backups go to UNAS K3sStorage for Mac accessibility.

## NFS Configuration

| Setting | Value |
|---------|-------|
| Server | 10.20.10.20 (UNAS Pro) |
| Base Path | `/volume/567898ba-8471-4adb-9be9-d3e1f96fa7ba/.srv/.unifi-drive/K3sStorage/.data` |

## Directory Structure

Pattern: `namespace/purpose/` with `history/` subfolder for timestamped backups.

```
K3sStorage/
├── sdtd/
│   └── backups/
│       ├── latest.tar.gz           # 7DTD world save
│       ├── latest-world.tar.gz     # 7DTD generated world
│       └── history/                # Timestamped backups (5 max)
├── factorio/
│   ├── backups/
│   │   ├── latest.zip              # Factorio save
│   │   └── history/                # Timestamped backups (5 max)
│   └── factorio-space-age_*.tar.xz # Manual installer
├── mapshot/
│   └── renders/                    # Zoomable map tiles + viewer
├── postgresql/
│   └── backups/
│       ├── latest.sql.gz           # PostgreSQL dump
│       └── history/                # Timestamped backups (7 max)
├── open-webui/
│   └── backups/
│       ├── latest.db               # Conversation history
│       └── history/                # Timestamped backups (7 max)
├── ollama-ollama-models/           # Live LLM models (nfs-client PVC)
└── open-webui-open-webui-data/     # Live app data (nfs-client PVC)
```

## Implementation

Each backup CronJob uses direct NFS volume mounts.

Example volume mount:
```yaml
volumes:
  - name: dest
    nfs:
      server: 10.20.10.20
      path: /volume/567898ba-8471-4adb-9be9-d3e1f96fa7ba/.srv/.unifi-drive/K3sStorage/.data
```

Scripts create their namespace/purpose directories: `mkdir -p /dest/sdtd/backups`

## Backup Jobs

| App | Namespace | Schedule | Retention | Output |
|-----|-----------|----------|-----------|--------|
| 7DTD | sdtd | Every 6h | 5 + latest | `sdtd/backups/latest.tar.gz` |
| Factorio | factorio | Every 6h | 5 + latest | `factorio/backups/latest.zip` |
| Mapshot | mapshot | Every 4h | Latest only | `mapshot/renders/` |
| PostgreSQL | databases | Daily 3AM | 7 + latest | `postgresql/backups/latest.sql.gz` |
| Open-WebUI | open-webui | Daily 4AM | 7 + latest | `open-webui/backups/latest.db` |

All backups are checksum-gated (skip if unchanged) with Telegram notifications.
