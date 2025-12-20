# Spotify Sync + MCP Server

Self-hosted Kubernetes service that syncs Spotify playlist/track metadata to SQLite and exposes an MCP server for offline queries via Claude Desktop.

## Architecture

- **Web UI** (`spotify.codeofficer.com`) - Express.js dashboard with OAuth, manual sync trigger
- **MCP Server** (`spotify-mcp.codeofficer.com`) - SSE-based MCP server for Claude Desktop
- **Sync Job** - Kubernetes Job triggered manually via web UI
- **SQLite Database** - Shared storage on nfs-client PVC (WAL mode for concurrent reads)
- **Backup CronJob** - Daily backups to UNAS K3sStorage with Telegram notifications

## Directory Structure

```
spotify/
├── shared/          # Shared TypeScript library
│   └── src/
│       ├── db/      # SQLite schema, database wrapper, migrations
│       ├── services/# Spotify API client, crypto helpers
│       └── types/   # TypeScript interfaces
├── web/             # Web UI (Express.js)
│   └── src/
│       ├── controllers/  # OAuth, sync trigger
│       ├── services/     # K8s API client
│       └── views/        # EJS templates
├── mcp/             # MCP server (SSE transport)
│   └── src/
│       └── tools/   # MCP tool implementations
├── sync/            # Sync job
│   └── src/         # Playlist/track sync logic
└── k8s/             # Kubernetes manifests
```

## Deployment

```bash
# Deploy infrastructure
make deploy-spotify

# Trigger sync
make spotify-sync-trigger

# View logs
make spotify-logs

# Backup/restore
make spotify-backup
make spotify-restore
```

## Development

See implementation plan: `~/.claude/plans/cheerful-percolating-hamming.md`

## Related

- GitHub Issue: https://github.com/CodeOfficer/homelab-proxmox/issues/2
- Spotify Developer Dashboard: https://developer.spotify.com/dashboard
