# Spotify Sync + MCP Server

Self-hosted Kubernetes service that syncs Spotify playlist/track metadata to SQLite and exposes an MCP server for offline queries via Claude Desktop.

## Architecture

- **Web UI** (`spotify.codeofficer.com`) - Express.js dashboard with OAuth, manual sync trigger
- **MCP Server** (`spotify-mcp.codeofficer.com`) - SSE-based MCP server for remote access
- **Local MCP** - stdio-based MCP server for Claude Desktop (local database)
- **Sync Job** - Kubernetes Job triggered manually via web UI
- **SQLite Database** - Shared storage on PVC (WAL mode for concurrent reads)
- **Backup CronJob** - Daily backups to UNAS K3sStorage with Telegram notifications

## Claude Desktop Setup

### Option 1: Local MCP Server (Recommended)

Run the MCP server locally with your synced database for best performance.

1. **Copy the database from K8s** (or sync it locally):
   ```bash
   # From running pod
   kubectl cp spotify/spotify-web-xxx:/data/spotify.db ~/spotify.db
   ```

2. **Add to Claude Desktop config** (`~/Library/Application Support/Claude/claude_desktop_config.json`):
   ```json
   {
     "mcpServers": {
       "spotify": {
         "command": "node",
         "args": ["/path/to/homelab-proxmox/applications/spotify/mcp/dist/index.js"],
         "env": {
           "DATABASE_PATH": "/Users/you/spotify.db",
           "SPOTIFY_DB_ENCRYPTION_KEY": "your-32-byte-hex-key"
         }
       }
     }
   }
   ```

3. **Restart Claude Desktop**

### Option 2: Remote SSE Server

Connect to the K8s-deployed MCP server over HTTPS.

```json
{
  "mcpServers": {
    "spotify": {
      "url": "https://spotify-mcp.codeofficer.com/sse"
    }
  }
}
```

## Available MCP Tools

| Tool | Description |
|------|-------------|
| `search_tracks` | Search tracks by name |
| `search_by_genre` | Find tracks by genre |
| `search_by_tempo` | Find tracks by BPM range |
| `search_by_energy` | Find high/low energy tracks |
| `search_by_danceability` | Find danceable tracks |
| `search_by_mood` | Find happy/sad tracks (valence) |
| `get_playlist` | Get playlist details and tracks |
| `list_playlists` | List all playlists |
| `get_track_details` | Get track info with audio features |
| `get_library_stats` | Overall library statistics |
| `get_top_genres` | Most common genres |
| `get_popular_tracks` | Most popular tracks |
| `get_artist_tracks` | All tracks by an artist |
| `search_all` | Search tracks, artists, playlists |

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
├── mcp/             # MCP server
│   └── src/
│       ├── index.ts      # stdio transport (Claude Desktop local)
│       └── sse-server.ts # SSE transport (K8s remote)
├── sync/            # Sync job
│   └── src/         # Playlist/track sync logic
└── k8s/             # Kubernetes manifests
```

## Deployment

```bash
# Deploy all spotify services
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

```bash
cd applications/spotify

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run web UI locally
DATABASE_PATH=/tmp/spotify.db pnpm dev:web

# Run MCP server locally (stdio)
DATABASE_PATH=/tmp/spotify.db pnpm dev:mcp

# Run MCP server locally (SSE)
DATABASE_PATH=/tmp/spotify.db pnpm dev:mcp:sse
```

## Related

- GitHub Issue: https://github.com/CodeOfficer/homelab-proxmox/issues/2
- Spotify Developer Dashboard: https://developer.spotify.com/dashboard
