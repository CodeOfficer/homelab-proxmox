# Spotify App Plan

Goal: reliable offline search of Spotify playlists with stable MCP access, plus predictable behavior across web, sync, and MCP components.

## Current findings to address

- Sync progress visibility is broken after phase 1 because the sync log is marked `success` early.
- OAuth state is generated but not stored/validated.
- MCP SSE toolset diverges from stdio MCP toolset.
- Access token refresh is not handled, causing expired-token failures.
- Database path fallback can mask bad mounts by silently using `/tmp/spotify.db`.
- Hardcoded MCP OAuth discovery URLs reduce portability.

## Plan

Phase 1: Sync progress correctness
- Keep sync log in `running` status until all phases complete.
- Make progress reporting reflect all phases (playlists, artists, audio_features).

Phase 2: OAuth + token hygiene
- Add real state storage and validation for OAuth callbacks.
- Implement refresh-token flow for web + sync endpoints.

Phase 3: MCP parity
- Unify stdio and SSE MCP tool definitions and responses.
- Ensure tools listed in README are present in both transports.

Phase 4: Operational hardening
- Revisit DB path fallback behavior and logging.
- Make MCP OAuth discovery URLs configurable.

## Open questions

- Preferred session store for OAuth state (signed cookie, in-memory, or SQLite)?
- Should the sync job update the same `sync_log` row or create per-phase logs?

## Local dev note

- Local OAuth requires HTTPS if Spotify rejects `http://localhost`.
- Create dev certs once with `pnpm dev:cert` (uses `mkcert`) and run `pnpm dev:local` (requires certs).
- Default local redirect is `https://127.0.0.1:3000/auth/callback`.
- Local sync (writes to the same `/tmp/spotify-dev.db`): run `pnpm dev:sync:local` in another terminal.
- Local sync defaults to writing a unique JSONL dump at `/tmp/spotify-sync-YYYYMMDD-HHMMSS.jsonl` (override with `SPOTIFY_SYNC_DUMP_PATH`).
- Schema expanded to store full Spotify metadata from playlist, track, album, artist, and audio feature responses.
- Sync logs now store `duration_seconds`.
- Sync always fetches playlist items (no snapshot-based skipping) to keep local DB and dumps complete.
- Local dev binds to `127.0.0.1` by default; override with `HOST` if needed.

## History

- (none yet)
