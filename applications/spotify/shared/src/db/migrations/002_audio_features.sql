-- Migration 002: Audio Features, Progress Tracking, and Search Indexes
-- Adds complete data sync capabilities with graceful degradation

-- ============================================================================
-- Audio Features Table
-- ============================================================================
-- Stores Spotify audio analysis data for tracks
-- If API access is unavailable (403), this table will remain empty but won't break functionality

CREATE TABLE IF NOT EXISTS audio_features (
  track_id TEXT PRIMARY KEY REFERENCES tracks(id) ON DELETE CASCADE,
  danceability REAL,           -- 0.0-1.0: How suitable for dancing
  energy REAL,                 -- 0.0-1.0: Intensity and activity level
  key INTEGER,                 -- -1 to 11: Pitch class notation (0=C, 1=C#, etc.)
  loudness REAL,               -- dB: Overall loudness (-60 to 0 typical)
  mode INTEGER,                -- 0=minor, 1=major
  speechiness REAL,            -- 0.0-1.0: Presence of spoken words
  acousticness REAL,           -- 0.0-1.0: Acoustic vs. electric
  instrumentalness REAL,       -- 0.0-1.0: Likelihood of no vocals
  liveness REAL,               -- 0.0-1.0: Presence of audience/live performance
  valence REAL,                -- 0.0-1.0: Musical positiveness (happy vs sad)
  tempo REAL,                  -- BPM: Beats per minute
  time_signature INTEGER,      -- 3-7: Beats per measure
  duration_ms INTEGER,         -- Redundant with tracks.duration_ms but useful for validation
  synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for audio feature searches
CREATE INDEX IF NOT EXISTS idx_audio_features_tempo ON audio_features(tempo);
CREATE INDEX IF NOT EXISTS idx_audio_features_energy ON audio_features(energy);
CREATE INDEX IF NOT EXISTS idx_audio_features_danceability ON audio_features(danceability);
CREATE INDEX IF NOT EXISTS idx_audio_features_valence ON audio_features(valence);
CREATE INDEX IF NOT EXISTS idx_audio_features_key ON audio_features(key);

-- ============================================================================
-- Sync Progress Tracking
-- ============================================================================
-- Tracks detailed progress for each sync phase (playlists, artists, audio_features)

CREATE TABLE IF NOT EXISTS sync_progress (
  sync_log_id INTEGER REFERENCES sync_log(id) ON DELETE CASCADE,
  step TEXT NOT NULL,               -- 'playlists', 'artists', 'audio_features'
  total_items INTEGER DEFAULT 0,
  processed_items INTEGER DEFAULT 0,
  failed_items INTEGER DEFAULT 0,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  PRIMARY KEY (sync_log_id, step)
);

-- Index for progress queries
CREATE INDEX IF NOT EXISTS idx_sync_progress_log_id ON sync_progress(sync_log_id);

-- ============================================================================
-- Sync Log Enhancements
-- ============================================================================
-- Add ETA columns to existing sync_log table

-- Note: SQLite doesn't support ADD COLUMN IF NOT EXISTS, so we use a conditional approach
-- Check if columns exist before adding (idempotent migration)

-- This is a workaround for SQLite's limited ALTER TABLE support
-- We'll handle this in the database.ts migration runner with a try-catch

-- ALTER TABLE sync_log ADD COLUMN estimated_duration_seconds INTEGER;
-- ALTER TABLE sync_log ADD COLUMN estimated_completion_at TIMESTAMP;

-- ============================================================================
-- Search Optimization Indexes
-- ============================================================================
-- Full-text search indexes for fast queries

CREATE INDEX IF NOT EXISTS idx_tracks_name_lower ON tracks(LOWER(name));
CREATE INDEX IF NOT EXISTS idx_artists_name_lower ON artists(LOWER(name));
CREATE INDEX IF NOT EXISTS idx_playlists_name_lower ON playlists(LOWER(name));

-- Range query indexes
CREATE INDEX IF NOT EXISTS idx_artists_popularity ON artists(popularity DESC);
CREATE INDEX IF NOT EXISTS idx_tracks_popularity ON tracks(popularity DESC);
CREATE INDEX IF NOT EXISTS idx_tracks_duration ON tracks(duration_ms);
CREATE INDEX IF NOT EXISTS idx_tracks_explicit ON tracks(explicit);

-- Composite indexes for common drill-down queries
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_playlist_position ON playlist_tracks(playlist_id, position);
CREATE INDEX IF NOT EXISTS idx_track_artists_track_position ON track_artists(track_id, position);

-- ============================================================================
-- Views for Common Queries (Optional Performance Optimization)
-- ============================================================================

-- Track details with primary artist and audio features
CREATE VIEW IF NOT EXISTS v_track_details AS
SELECT
  t.*,
  a.name as primary_artist_name,
  a.id as primary_artist_id,
  al.name as album_name,
  al.image_url as album_image_url,
  af.tempo,
  af.energy,
  af.danceability,
  af.valence,
  af.key,
  af.mode
FROM tracks t
LEFT JOIN track_artists ta ON t.id = ta.track_id AND ta.position = 0
LEFT JOIN artists a ON ta.artist_id = a.id
LEFT JOIN albums al ON t.album_id = al.id
LEFT JOIN audio_features af ON t.id = af.track_id;

-- Playlist summary with track count
CREATE VIEW IF NOT EXISTS v_playlist_summary AS
SELECT
  p.*,
  COUNT(pt.track_id) as track_count,
  MAX(pt.added_at) as last_track_added
FROM playlists p
LEFT JOIN playlist_tracks pt ON p.id = pt.playlist_id
GROUP BY p.id;

-- ============================================================================
-- Migration Metadata
-- ============================================================================

-- Record that this migration has been applied
-- (Will be inserted by the database.ts migration runner)
