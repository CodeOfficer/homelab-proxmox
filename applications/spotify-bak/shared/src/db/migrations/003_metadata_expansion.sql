-- Migration 003: Expanded metadata fields for playlists, tracks, albums, artists

-- Playlists
ALTER TABLE playlists ADD COLUMN external_url TEXT;
ALTER TABLE playlists ADD COLUMN href TEXT;
ALTER TABLE playlists ADD COLUMN uri TEXT;
ALTER TABLE playlists ADD COLUMN primary_color TEXT;
ALTER TABLE playlists ADD COLUMN tracks_total INTEGER;
ALTER TABLE playlists ADD COLUMN owner_uri TEXT;
ALTER TABLE playlists ADD COLUMN owner_external_url TEXT;
ALTER TABLE playlists ADD COLUMN owner_type TEXT;
ALTER TABLE playlists ADD COLUMN images_json TEXT;

-- Artists
ALTER TABLE artists ADD COLUMN external_url TEXT;
ALTER TABLE artists ADD COLUMN href TEXT;
ALTER TABLE artists ADD COLUMN uri TEXT;
ALTER TABLE artists ADD COLUMN followers_total INTEGER;
ALTER TABLE artists ADD COLUMN images_json TEXT;

-- Albums
ALTER TABLE albums ADD COLUMN external_url TEXT;
ALTER TABLE albums ADD COLUMN href TEXT;
ALTER TABLE albums ADD COLUMN uri TEXT;
ALTER TABLE albums ADD COLUMN release_date_precision TEXT;
ALTER TABLE albums ADD COLUMN images_json TEXT;
ALTER TABLE albums ADD COLUMN available_markets_json TEXT;
ALTER TABLE albums ADD COLUMN restrictions_reason TEXT;

-- Tracks
ALTER TABLE tracks ADD COLUMN external_url TEXT;
ALTER TABLE tracks ADD COLUMN href TEXT;
ALTER TABLE tracks ADD COLUMN uri TEXT;
ALTER TABLE tracks ADD COLUMN disc_number INTEGER;
ALTER TABLE tracks ADD COLUMN track_number INTEGER;
ALTER TABLE tracks ADD COLUMN is_local BOOLEAN;
ALTER TABLE tracks ADD COLUMN is_playable BOOLEAN;
ALTER TABLE tracks ADD COLUMN isrc TEXT;
ALTER TABLE tracks ADD COLUMN external_ids_json TEXT;
ALTER TABLE tracks ADD COLUMN available_markets_json TEXT;
ALTER TABLE tracks ADD COLUMN restrictions_reason TEXT;
ALTER TABLE tracks ADD COLUMN linked_from_json TEXT;

-- Audio features extras
ALTER TABLE audio_features ADD COLUMN analysis_url TEXT;
ALTER TABLE audio_features ADD COLUMN track_href TEXT;
ALTER TABLE audio_features ADD COLUMN uri TEXT;

-- Playlist tracks
ALTER TABLE playlist_tracks ADD COLUMN added_by_type TEXT;
ALTER TABLE playlist_tracks ADD COLUMN added_by_uri TEXT;
ALTER TABLE playlist_tracks ADD COLUMN added_by_href TEXT;
ALTER TABLE playlist_tracks ADD COLUMN added_by_external_url TEXT;
ALTER TABLE playlist_tracks ADD COLUMN is_local BOOLEAN;
ALTER TABLE playlist_tracks ADD COLUMN video_thumbnail_url TEXT;

-- Sync log duration
ALTER TABLE sync_log ADD COLUMN duration_seconds INTEGER;
