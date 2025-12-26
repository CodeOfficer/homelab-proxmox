-- Spotify Sync SQLite Schema
-- Normalized schema for playlists, tracks, artists, albums

-- Core entities
CREATE TABLE IF NOT EXISTS artists (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  genres TEXT,                   -- JSON array: ["rock", "indie"]
  popularity INTEGER,
  image_url TEXT,
  external_url TEXT,
  href TEXT,
  uri TEXT,
  followers_total INTEGER,
  images_json TEXT,              -- JSON array of images
  synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS albums (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  release_date TEXT,
  album_type TEXT,               -- album, single, compilation
  total_tracks INTEGER,
  image_url TEXT,
  external_url TEXT,
  href TEXT,
  uri TEXT,
  release_date_precision TEXT,
  images_json TEXT,              -- JSON array of images
  available_markets_json TEXT,   -- JSON array
  restrictions_reason TEXT,
  synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tracks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  album_id TEXT REFERENCES albums(id),
  duration_ms INTEGER,
  explicit BOOLEAN,
  popularity INTEGER,
  preview_url TEXT,
  external_url TEXT,
  href TEXT,
  uri TEXT,
  disc_number INTEGER,
  track_number INTEGER,
  is_local BOOLEAN,
  is_playable BOOLEAN,
  isrc TEXT,
  external_ids_json TEXT,        -- JSON object
  available_markets_json TEXT,   -- JSON array
  restrictions_reason TEXT,
  linked_from_json TEXT,         -- JSON object
  synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS track_artists (
  track_id TEXT REFERENCES tracks(id),
  artist_id TEXT REFERENCES artists(id),
  position INTEGER,              -- Order in artist list
  PRIMARY KEY (track_id, artist_id)
);

CREATE TABLE IF NOT EXISTS playlists (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  owner_id TEXT,
  owner_name TEXT,
  public BOOLEAN,
  collaborative BOOLEAN,
  snapshot_id TEXT,              -- Spotify version identifier
  image_url TEXT,
  external_url TEXT,
  href TEXT,
  uri TEXT,
  primary_color TEXT,
  tracks_total INTEGER,
  owner_uri TEXT,
  owner_external_url TEXT,
  owner_type TEXT,
  images_json TEXT,              -- JSON array of images
  synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS playlist_tracks (
  playlist_id TEXT REFERENCES playlists(id),
  track_id TEXT REFERENCES tracks(id),
  position INTEGER,              -- Order in playlist
  added_at TIMESTAMP,
  added_by TEXT,                 -- User ID
  added_by_type TEXT,
  added_by_uri TEXT,
  added_by_href TEXT,
  added_by_external_url TEXT,
  is_local BOOLEAN,
  video_thumbnail_url TEXT,
  PRIMARY KEY (playlist_id, track_id, position)
);

-- OAuth credentials (encrypted)
CREATE TABLE IF NOT EXISTS spotify_credentials (
  id INTEGER PRIMARY KEY CHECK (id = 1),  -- Single row
  access_token TEXT,
  refresh_token TEXT NOT NULL,            -- Encrypted with AES-256-GCM
  expires_at TIMESTAMP,
  scope TEXT
);

-- Sync metadata
CREATE TABLE IF NOT EXISTS sync_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sync_type TEXT NOT NULL,       -- 'playlists', 'history', 'full'
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  status TEXT,                   -- 'running', 'success', 'failed'
  error TEXT,
  items_synced INTEGER,
  items_updated INTEGER,
  items_added INTEGER,
  duration_seconds INTEGER
);

-- Schema versioning
CREATE TABLE IF NOT EXISTS _schema_version (
  version INTEGER PRIMARY KEY,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_tracks_album ON tracks(album_id);
CREATE INDEX IF NOT EXISTS idx_track_artists_track ON track_artists(track_id);
CREATE INDEX IF NOT EXISTS idx_track_artists_artist ON track_artists(artist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_playlist ON playlist_tracks(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_track ON playlist_tracks(track_id);
CREATE INDEX IF NOT EXISTS idx_sync_log_status ON sync_log(status, started_at DESC);
