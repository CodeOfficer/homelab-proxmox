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
│       ├── latest.tar.gz           # 7DTD world save (~8 MB)
│       ├── latest-world.tar.gz     # 7DTD generated world (~200 MB)
│       └── history/                # Timestamped backups (5 max)
├── factorio/
│   ├── backups/
│   │   ├── latest.zip              # Factorio save (~2 MB)
│   │   └── history/                # Timestamped backups (5 max)
│   └── factorio-space-age_*.tar.xz # Game installer (~4 GB, manual)
├── mapshot/
│   ├── index.html                  # Viewer entry point
│   ├── manifest.json               # Render metadata
│   ├── viewer-*.js                 # Leaflet viewer
│   ├── thumbnail.png               # Preview image
│   └── renders/
│       └── d-*/                    # Tile folders (hash-named)
├── postgresql/
│   └── backups/
│       ├── latest.sql.gz           # PostgreSQL dump
│       └── history/                # Timestamped backups (7 max)
├── open-webui/
│   └── backups/
│       ├── latest.db               # Conversation history (~300 KB)
│       └── history/                # Timestamped backups (7 max)
├── ollama-ollama-models/           # Live LLM models (nfs-client PVC)
│   └── models/                     # Downloaded models
└── open-webui-open-webui-data/     # Live app data (nfs-client PVC)
    ├── cache/
    ├── uploads/
    ├── vector_db/
    └── webui.db
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

## Cleanup Tasks

**Manual cleanup required:**

- [ ] **Remove SSH keys from ollama-ollama-models/** - `id_ed25519` and `id_ed25519.pub` should not be in the NFS share. Delete these files from Mac Finder.

**Automated cleanup:**

- **Mapshot renders** - Old render folders (`d-*`) are automatically deleted after each successful render. Only the latest render is kept on both PVC and NAS.

**PVC naming note:** The `ollama-ollama-models` and `open-webui-open-webui-data` folders have redundant names due to nfs-client provisioner naming convention (`namespace-pvcname`). This is expected behavior.
