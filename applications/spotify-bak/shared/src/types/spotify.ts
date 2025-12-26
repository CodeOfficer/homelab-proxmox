// Database row types (matching SQLite schema)

export interface Artist {
  id: string;
  name: string;
  genres: string | null;  // JSON array
  popularity: number | null;
  image_url: string | null;
  external_url: string | null;
  href: string | null;
  uri: string | null;
  followers_total: number | null;
  images_json: string | null;
  synced_at: string;
}

export interface Album {
  id: string;
  name: string;
  release_date: string | null;
  album_type: string | null;  // album, single, compilation
  total_tracks: number | null;
  image_url: string | null;
  external_url: string | null;
  href: string | null;
  uri: string | null;
  release_date_precision: string | null;
  images_json: string | null;
  available_markets_json: string | null;
  restrictions_reason: string | null;
  synced_at: string;
}

export interface Track {
  id: string;
  name: string;
  album_id: string | null;
  duration_ms: number | null;
  explicit: boolean | null;
  popularity: number | null;
  preview_url: string | null;
  external_url: string | null;
  href: string | null;
  uri: string | null;
  disc_number: number | null;
  track_number: number | null;
  is_local: boolean | null;
  is_playable: boolean | null;
  isrc: string | null;
  external_ids_json: string | null;
  available_markets_json: string | null;
  restrictions_reason: string | null;
  linked_from_json: string | null;
  synced_at: string;
}

export interface TrackArtist {
  track_id: string;
  artist_id: string;
  position: number;
}

export interface Playlist {
  id: string;
  name: string;
  description: string | null;
  owner_id: string | null;
  owner_name: string | null;
  public: boolean | null;
  collaborative: boolean | null;
  snapshot_id: string | null;
  image_url: string | null;
  external_url: string | null;
  href: string | null;
  uri: string | null;
  primary_color: string | null;
  tracks_total: number | null;
  owner_uri: string | null;
  owner_external_url: string | null;
  owner_type: string | null;
  images_json: string | null;
  synced_at: string;
}

export interface PlaylistTrack {
  playlist_id: string;
  track_id: string;
  position: number;
  added_at: string | null;
  added_by: string | null;
  added_by_type: string | null;
  added_by_uri: string | null;
  added_by_href: string | null;
  added_by_external_url: string | null;
  is_local: boolean | null;
  video_thumbnail_url: string | null;
}

export interface SpotifyCredentials {
  id: number;
  access_token: string | null;
  refresh_token: string;  // Encrypted
  expires_at: string | null;
  scope: string | null;
}

export interface SyncLog {
  id: number;
  sync_type: string;  // 'playlists', 'history', 'full'
  started_at: string;
  completed_at: string | null;
  status: string;  // 'running', 'success', 'failed'
  error: string | null;
  items_synced: number | null;
  items_updated: number | null;
  items_added: number | null;
  duration_seconds: number | null;
}

export interface SchemaVersion {
  version: number;
  applied_at: string;
}

// Extended types with joined data

export interface PlaylistWithTracks extends Playlist {
  tracks: TrackWithArtists[];
  track_count: number;
}

export interface TrackWithArtists extends Track {
  artists: Artist[];
  album: Album | null;
}

// API response types

export interface SyncResult {
  success: boolean;
  sync_log_id: number;
  playlists_synced: number;
  tracks_synced: number;
  error?: string;
}
