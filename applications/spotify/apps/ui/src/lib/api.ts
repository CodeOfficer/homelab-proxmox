const API_BASE = '/api';

async function fetchApi<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Request failed: ${response.status}`);
  }

  return response.json();
}

// Stats
export interface LibraryStats {
  totalPlaylists: number;
  totalTracks: number;
  totalArtists: number;
  totalAlbums: number;
  totalDurationMs: number;
  topGenres: Array<{ genre: string; count: number }>;
}

export function getStats(): Promise<LibraryStats> {
  return fetchApi('/stats');
}

// Playlists
export interface Playlist {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  tracksTotal: number | null;
  ownerName: string | null;
  externalUrl: string | null;
}

export interface PlaylistWithTracks extends Playlist {
  tracks: Track[];
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function getPlaylists(page = 1, pageSize = 50, q?: string): Promise<PaginatedResponse<Playlist>> {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (q) params.set('q', q);
  return fetchApi(`/playlists?${params}`);
}

export function getPlaylist(id: string): Promise<PlaylistWithTracks> {
  return fetchApi(`/playlists/${id}`);
}

// Tracks
export interface Track {
  id: string;
  name: string;
  albumId: string | null;
  durationMs: number | null;
  explicit: boolean;
  popularity: number | null;
  externalUrl: string | null;
  primaryArtistName?: string;
  primaryArtistId?: string;
  albumName?: string;
  albumImageUrl?: string;
}

export interface TrackWithDetails extends Track {
  artists: Array<{ id: string; name: string }>;
}

export function getTracks(page = 1, pageSize = 50, q?: string): Promise<PaginatedResponse<Track>> {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (q) params.set('q', q);
  return fetchApi(`/tracks?${params}`);
}

export function getTrack(id: string): Promise<TrackWithDetails> {
  return fetchApi(`/tracks/${id}`);
}

// Artists
export interface Artist {
  id: string;
  name: string;
  genres: string | null;
  popularity: number | null;
  imageUrl: string | null;
  externalUrl: string | null;
  trackCount?: number;
}

export interface ArtistWithTracks extends Artist {
  tracks: Track[];
}

export function getArtists(page = 1, pageSize = 48, q?: string): Promise<PaginatedResponse<Artist>> {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (q) params.set('q', q);
  return fetchApi(`/artists?${params}`);
}

export function getArtist(id: string): Promise<ArtistWithTracks> {
  return fetchApi(`/artists/${id}`);
}

// Albums
export interface Album {
  id: string;
  name: string;
  releaseDate: string | null;
  albumType: string | null;
  totalTracks: number | null;
  imageUrl: string | null;
  externalUrl: string | null;
}

export interface AlbumWithTracks extends Album {
  tracks: Track[];
}

export function getAlbum(id: string): Promise<AlbumWithTracks> {
  return fetchApi(`/albums/${id}`);
}

// Genres
export interface GenreCount {
  genre: string;
  count: number;
}

export function getGenres(q?: string): Promise<{ items: GenreCount[] }> {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  return fetchApi(`/genres?${params}`);
}

export function getTopGenres(limit = 10): Promise<{ items: GenreCount[] }> {
  return fetchApi(`/genres/top?limit=${limit}`);
}

// Search
export interface SearchFilters {
  q?: string;
  popularityMin?: number;
  popularityMax?: number;
  durationMinMs?: number;
  durationMaxMs?: number;
  explicit?: boolean;
}

export function searchTracks(
  filters: SearchFilters,
  page = 1,
  pageSize = 50
): Promise<PaginatedResponse<Track>> {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });

  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  }

  return fetchApi(`/search?${params}`);
}

// Sync
export interface SyncStatus {
  isRunning: boolean;
  lastSync?: {
    id: number;
    syncType: string;
    startedAt: string;
    completedAt: string | null;
    status: string;
    itemsSynced: number | null;
  };
  currentProgress?: Array<{
    step: string;
    totalItems: number;
    processedItems: number;
  }>;
}

export function getSyncStatus(): Promise<SyncStatus> {
  return fetchApi('/sync/status');
}

export function getSyncProgress(): Promise<{ isRunning: boolean; progress: unknown }> {
  return fetchApi('/sync/progress');
}

// Auth
export interface AuthStatus {
  authenticated: boolean;
  hasRefreshToken: boolean;
}

export function getAuthStatus(): Promise<AuthStatus> {
  return fetchApi('/auth/status');
}
