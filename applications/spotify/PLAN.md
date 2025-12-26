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

## History

- (none yet)
