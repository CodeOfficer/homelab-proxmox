import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import Database, { type Database as SqliteDatabase } from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.js';

type DB = BetterSQLite3Database<typeof schema>;

let db: DB | null = null;
let sqlite: SqliteDatabase | null = null;

/**
 * Get or create database connection
 * Uses SPOTIFY_DB_PATH env var, defaults to .local/spotify.db for dev
 */
export function getDatabase(): DB {
  if (db) return db;

  const dbPath = process.env.SPOTIFY_DB_PATH || './.local/spotify.db';

  // Ensure directory exists
  const dbDir = dirname(dbPath);
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }

  sqlite = new Database(dbPath);

  // Enable WAL mode for concurrent reads
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('busy_timeout = 5000');
  sqlite.pragma('synchronous = NORMAL');
  sqlite.pragma('foreign_keys = ON');

  db = drizzle(sqlite, { schema });

  return db;
}

/**
 * Get raw SQLite connection for advanced operations
 */
export function getSqlite(): SqliteDatabase {
  if (!sqlite) {
    getDatabase(); // Initialize if needed
  }
  return sqlite!;
}

/**
 * Close database connection
 */
export function closeDatabase() {
  if (sqlite) {
    sqlite.close();
    sqlite = null;
    db = null;
  }
}

/**
 * Initialize database with schema
 * Creates tables if they don't exist
 */
export function initializeDatabase(): DB {
  const database = getDatabase();
  const rawDb = getSqlite();

  // Check if tables exist
  const tableCheck = rawDb.prepare(`
    SELECT name FROM sqlite_master
    WHERE type='table' AND name='artists'
  `).get();

  if (!tableCheck) {
    console.log('Initializing database schema...');

    // Run the schema SQL
    // Note: Drizzle push or migrate should be used in production
    // This is a fallback for development
    const schemaStatements = getSchemaSQL();
    for (const stmt of schemaStatements) {
      if (stmt.trim()) {
        rawDb.exec(stmt);
      }
    }

    console.log('Database schema initialized.');
  }

  return database;
}

/**
 * Get schema SQL statements for initialization
 */
function getSchemaSQL(): string[] {
  return [`
    -- Core entities
    CREATE TABLE IF NOT EXISTS artists (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      genres TEXT,
      popularity INTEGER,
      image_url TEXT,
      external_url TEXT,
      href TEXT,
      uri TEXT,
      followers_total INTEGER,
      images_json TEXT,
      synced_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS albums (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      release_date TEXT,
      album_type TEXT,
      total_tracks INTEGER,
      image_url TEXT,
      external_url TEXT,
      href TEXT,
      uri TEXT,
      release_date_precision TEXT,
      images_json TEXT,
      available_markets_json TEXT,
      restrictions_reason TEXT,
      synced_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tracks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      album_id TEXT REFERENCES albums(id),
      duration_ms INTEGER,
      explicit INTEGER,
      popularity INTEGER,
      preview_url TEXT,
      external_url TEXT,
      href TEXT,
      uri TEXT,
      disc_number INTEGER,
      track_number INTEGER,
      is_local INTEGER,
      is_playable INTEGER,
      isrc TEXT,
      external_ids_json TEXT,
      available_markets_json TEXT,
      restrictions_reason TEXT,
      linked_from_json TEXT,
      synced_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS track_artists (
      track_id TEXT NOT NULL REFERENCES tracks(id),
      artist_id TEXT NOT NULL REFERENCES artists(id),
      position INTEGER,
      PRIMARY KEY (track_id, artist_id)
    );

    CREATE TABLE IF NOT EXISTS playlists (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      owner_id TEXT,
      owner_name TEXT,
      public INTEGER,
      collaborative INTEGER,
      snapshot_id TEXT,
      image_url TEXT,
      external_url TEXT,
      href TEXT,
      uri TEXT,
      primary_color TEXT,
      tracks_total INTEGER,
      owner_uri TEXT,
      owner_external_url TEXT,
      owner_type TEXT,
      images_json TEXT,
      synced_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS playlist_tracks (
      playlist_id TEXT NOT NULL REFERENCES playlists(id),
      track_id TEXT NOT NULL REFERENCES tracks(id),
      position INTEGER NOT NULL,
      added_at TEXT,
      added_by TEXT,
      added_by_type TEXT,
      added_by_uri TEXT,
      added_by_href TEXT,
      added_by_external_url TEXT,
      is_local INTEGER,
      video_thumbnail_url TEXT,
      PRIMARY KEY (playlist_id, track_id, position)
    );

    CREATE TABLE IF NOT EXISTS spotify_credentials (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      access_token TEXT,
      refresh_token TEXT NOT NULL,
      expires_at TEXT,
      scope TEXT
    );

    CREATE TABLE IF NOT EXISTS sync_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sync_type TEXT NOT NULL,
      started_at TEXT DEFAULT CURRENT_TIMESTAMP,
      completed_at TEXT,
      status TEXT,
      error TEXT,
      items_synced INTEGER,
      items_updated INTEGER,
      items_added INTEGER,
      duration_seconds INTEGER
    );

    CREATE TABLE IF NOT EXISTS sync_progress (
      sync_log_id INTEGER NOT NULL REFERENCES sync_log(id) ON DELETE CASCADE,
      step TEXT NOT NULL,
      total_items INTEGER DEFAULT 0,
      processed_items INTEGER DEFAULT 0,
      failed_items INTEGER DEFAULT 0,
      started_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      completed_at TEXT,
      PRIMARY KEY (sync_log_id, step)
    );

    CREATE TABLE IF NOT EXISTS _schema_version (
      version INTEGER PRIMARY KEY,
      applied_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_tracks_album ON tracks(album_id);
    CREATE INDEX IF NOT EXISTS idx_track_artists_track ON track_artists(track_id);
    CREATE INDEX IF NOT EXISTS idx_track_artists_artist ON track_artists(artist_id);
    CREATE INDEX IF NOT EXISTS idx_playlist_tracks_playlist ON playlist_tracks(playlist_id);
    CREATE INDEX IF NOT EXISTS idx_playlist_tracks_track ON playlist_tracks(track_id);
    CREATE INDEX IF NOT EXISTS idx_sync_log_status ON sync_log(status, started_at DESC);
  `];
}

// Re-export schema for convenience
export * from './schema.js';
