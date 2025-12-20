import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join } from 'path';
import { encrypt, decrypt } from '../services/crypto';
import type { Playlist, SpotifyCredentials, SyncLog } from '../types/spotify';

export class SpotifyDatabase {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);

    // Enable WAL mode for concurrent reads
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('busy_timeout = 5000');
    this.db.pragma('foreign_keys = ON');

    this.runMigrations();
  }

  private runMigrations() {
    // Check if schema_version table exists
    const versionTable = this.db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='_schema_version'"
    ).get();

    if (!versionTable) {
      // Initial schema - read from schema.sql
      const schemaPath = join(__dirname, 'schema.sql');
      const schema = readFileSync(schemaPath, 'utf8');
      this.db.exec(schema);
      this.db.prepare('INSERT INTO _schema_version (version) VALUES (1)').run();
      return;
    }

    const currentVersion = this.db.prepare(
      'SELECT version FROM _schema_version ORDER BY version DESC LIMIT 1'
    ).pluck().get() as number | undefined;

    // Future migrations go here
    // if (currentVersion < 2) { ... }
  }

  /**
   * Close database connection
   */
  close() {
    this.db.close();
  }

  // ============================================================================
  // OAuth Credentials
  // ============================================================================

  saveCredentials(accessToken: string, refreshToken: string, expiresAt: Date, scope: string) {
    const encryptedRefreshToken = encrypt(refreshToken);

    this.db.prepare(`
      INSERT INTO spotify_credentials (id, access_token, refresh_token, expires_at, scope)
      VALUES (1, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        access_token = excluded.access_token,
        refresh_token = excluded.refresh_token,
        expires_at = excluded.expires_at,
        scope = excluded.scope
    `).run(accessToken, encryptedRefreshToken, expiresAt.toISOString(), scope);
  }

  getCredentials(): SpotifyCredentials | null {
    const row = this.db.prepare('SELECT * FROM spotify_credentials WHERE id = 1').get() as SpotifyCredentials | undefined;

    if (!row) return null;

    // Decrypt refresh token
    return {
      ...row,
      refresh_token: decrypt(row.refresh_token)
    };
  }

  // ============================================================================
  // Playlists
  // ============================================================================

  upsertPlaylist(playlist: {
    id: string;
    name: string;
    description?: string | null;
    owner_id?: string | null;
    owner_name?: string | null;
    public?: boolean | null;
    collaborative?: boolean | null;
    snapshot_id?: string | null;
    image_url?: string | null;
  }) {
    this.db.prepare(`
      INSERT INTO playlists (id, name, description, owner_id, owner_name, public, collaborative, snapshot_id, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        description = excluded.description,
        snapshot_id = excluded.snapshot_id,
        image_url = excluded.image_url,
        synced_at = CURRENT_TIMESTAMP
    `).run(
      playlist.id,
      playlist.name,
      playlist.description || null,
      playlist.owner_id || null,
      playlist.owner_name || null,
      playlist.public ? 1 : 0,
      playlist.collaborative ? 1 : 0,
      playlist.snapshot_id || null,
      playlist.image_url || null
    );
  }

  getPlaylist(id: string): Playlist | null {
    return this.db.prepare('SELECT * FROM playlists WHERE id = ?').get(id) as Playlist | undefined || null;
  }

  getPlaylists(limit: number = 50): Playlist[] {
    return this.db.prepare(`
      SELECT p.*, COUNT(pt.track_id) as track_count
      FROM playlists p
      LEFT JOIN playlist_tracks pt ON p.id = pt.playlist_id
      GROUP BY p.id
      ORDER BY p.synced_at DESC
      LIMIT ?
    `).all(limit) as Playlist[];
  }

  // ============================================================================
  // Sync Logs
  // ============================================================================

  createSyncLog(syncType: string, status: string): number {
    const result = this.db.prepare(`
      INSERT INTO sync_log (sync_type, status, started_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `).run(syncType, status);

    return result.lastInsertRowid as number;
  }

  completeSyncLog(
    id: number,
    status: string,
    itemsSynced: number = 0,
    itemsAdded: number = 0,
    itemsUpdated: number = 0,
    error: string | null = null
  ) {
    this.db.prepare(`
      UPDATE sync_log
      SET completed_at = CURRENT_TIMESTAMP,
          status = ?,
          items_synced = ?,
          items_added = ?,
          items_updated = ?,
          error = ?
      WHERE id = ?
    `).run(status, itemsSynced, itemsAdded, itemsUpdated, error, id);
  }

  getRecentSyncs(limit: number = 10): SyncLog[] {
    return this.db.prepare(`
      SELECT * FROM sync_log
      ORDER BY started_at DESC
      LIMIT ?
    `).all(limit) as SyncLog[];
  }

  // ============================================================================
  // Placeholder methods for future implementation
  // ============================================================================

  // TODO: Implement track/artist/album upsert methods
  // TODO: Implement search methods for MCP tools
  // TODO: Implement playlist track linking methods
}
