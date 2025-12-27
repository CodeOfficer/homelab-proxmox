import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import type {
  artists,
  albums,
  tracks,
  trackArtists,
  playlists,
  playlistTracks,
  spotifyCredentials,
  syncLog,
  syncProgress,
} from '../db/schema.js';

// =============================================================================
// Inferred Types from Drizzle Schema
// =============================================================================

export type Artist = InferSelectModel<typeof artists>;
export type NewArtist = InferInsertModel<typeof artists>;

export type Album = InferSelectModel<typeof albums>;
export type NewAlbum = InferInsertModel<typeof albums>;

export type Track = InferSelectModel<typeof tracks>;
export type NewTrack = InferInsertModel<typeof tracks>;

export type TrackArtist = InferSelectModel<typeof trackArtists>;
export type NewTrackArtist = InferInsertModel<typeof trackArtists>;

export type Playlist = InferSelectModel<typeof playlists>;
export type NewPlaylist = InferInsertModel<typeof playlists>;

export type PlaylistTrack = InferSelectModel<typeof playlistTracks>;
export type NewPlaylistTrack = InferInsertModel<typeof playlistTracks>;

export type SpotifyCredentials = InferSelectModel<typeof spotifyCredentials>;
export type NewSpotifyCredentials = InferInsertModel<typeof spotifyCredentials>;

export type SyncLog = InferSelectModel<typeof syncLog>;
export type NewSyncLog = InferInsertModel<typeof syncLog>;

export type SyncProgress = InferSelectModel<typeof syncProgress>;
export type NewSyncProgress = InferInsertModel<typeof syncProgress>;

// =============================================================================
// Composite Types for API Responses
// =============================================================================

export interface TrackWithDetails extends Track {
  primaryArtistName?: string | null;
  primaryArtistId?: string | null;
  albumName?: string | null;
  albumImageUrl?: string | null;
  artists?: Artist[];
}

export interface PlaylistWithTracks extends Playlist {
  tracks?: TrackWithDetails[];
  trackCount?: number;
}

export interface ArtistWithTracks extends Artist {
  tracks?: TrackWithDetails[];
}

export interface AlbumWithTracks extends Album {
  tracks?: TrackWithDetails[];
}

export interface GenreStats {
  genre: string;
  count: number;
}

export interface LibraryStats {
  totalPlaylists: number;
  totalTracks: number;
  totalArtists: number;
  totalAlbums: number;
  totalDurationMs: number;
  topGenres: GenreStats[];
}

export interface SyncStatus {
  isRunning: boolean;
  lastSync?: SyncLog;
  currentProgress?: SyncProgress[];
}

// =============================================================================
// Search Types
// =============================================================================

export interface SearchFilters {
  query?: string;
  genres?: string[];
  popularityMin?: number;
  popularityMax?: number;
  durationMinMs?: number;
  durationMaxMs?: number;
  explicit?: boolean;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
