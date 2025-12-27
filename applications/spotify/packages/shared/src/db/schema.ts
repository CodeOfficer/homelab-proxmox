import { sqliteTable, text, integer, primaryKey, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// =============================================================================
// Core Entities
// =============================================================================

export const artists = sqliteTable('artists', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  genres: text('genres'), // JSON array
  popularity: integer('popularity'),
  imageUrl: text('image_url'),
  externalUrl: text('external_url'),
  href: text('href'),
  uri: text('uri'),
  followersTotal: integer('followers_total'),
  imagesJson: text('images_json'), // JSON array
  syncedAt: text('synced_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index('idx_artists_name_lower').on(sql`LOWER(${table.name})`),
  index('idx_artists_popularity').on(table.popularity),
]);

export const albums = sqliteTable('albums', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  releaseDate: text('release_date'),
  albumType: text('album_type'), // album, single, compilation
  totalTracks: integer('total_tracks'),
  imageUrl: text('image_url'),
  externalUrl: text('external_url'),
  href: text('href'),
  uri: text('uri'),
  releaseDatePrecision: text('release_date_precision'),
  imagesJson: text('images_json'), // JSON array
  availableMarketsJson: text('available_markets_json'), // JSON array
  restrictionsReason: text('restrictions_reason'),
  syncedAt: text('synced_at').default(sql`CURRENT_TIMESTAMP`),
});

export const tracks = sqliteTable('tracks', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  albumId: text('album_id').references(() => albums.id),
  durationMs: integer('duration_ms'),
  explicit: integer('explicit', { mode: 'boolean' }),
  popularity: integer('popularity'),
  previewUrl: text('preview_url'),
  externalUrl: text('external_url'),
  href: text('href'),
  uri: text('uri'),
  discNumber: integer('disc_number'),
  trackNumber: integer('track_number'),
  isLocal: integer('is_local', { mode: 'boolean' }),
  isPlayable: integer('is_playable', { mode: 'boolean' }),
  isrc: text('isrc'),
  externalIdsJson: text('external_ids_json'), // JSON object
  availableMarketsJson: text('available_markets_json'), // JSON array
  restrictionsReason: text('restrictions_reason'),
  linkedFromJson: text('linked_from_json'), // JSON object
  syncedAt: text('synced_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index('idx_tracks_album').on(table.albumId),
  index('idx_tracks_name_lower').on(sql`LOWER(${table.name})`),
  index('idx_tracks_popularity').on(table.popularity),
  index('idx_tracks_duration').on(table.durationMs),
  index('idx_tracks_explicit').on(table.explicit),
]);

export const trackArtists = sqliteTable('track_artists', {
  trackId: text('track_id').notNull().references(() => tracks.id),
  artistId: text('artist_id').notNull().references(() => artists.id),
  position: integer('position'),
}, (table) => [
  primaryKey({ columns: [table.trackId, table.artistId] }),
  index('idx_track_artists_track').on(table.trackId),
  index('idx_track_artists_artist').on(table.artistId),
  index('idx_track_artists_track_position').on(table.trackId, table.position),
]);

export const playlists = sqliteTable('playlists', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  ownerId: text('owner_id'),
  ownerName: text('owner_name'),
  public: integer('public', { mode: 'boolean' }),
  collaborative: integer('collaborative', { mode: 'boolean' }),
  snapshotId: text('snapshot_id'),
  imageUrl: text('image_url'),
  externalUrl: text('external_url'),
  href: text('href'),
  uri: text('uri'),
  primaryColor: text('primary_color'),
  tracksTotal: integer('tracks_total'),
  ownerUri: text('owner_uri'),
  ownerExternalUrl: text('owner_external_url'),
  ownerType: text('owner_type'),
  imagesJson: text('images_json'), // JSON array
  syncedAt: text('synced_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index('idx_playlists_name_lower').on(sql`LOWER(${table.name})`),
]);

export const playlistTracks = sqliteTable('playlist_tracks', {
  playlistId: text('playlist_id').notNull().references(() => playlists.id),
  trackId: text('track_id').notNull().references(() => tracks.id),
  position: integer('position').notNull(),
  addedAt: text('added_at'),
  addedBy: text('added_by'),
  addedByType: text('added_by_type'),
  addedByUri: text('added_by_uri'),
  addedByHref: text('added_by_href'),
  addedByExternalUrl: text('added_by_external_url'),
  isLocal: integer('is_local', { mode: 'boolean' }),
  videoThumbnailUrl: text('video_thumbnail_url'),
}, (table) => [
  primaryKey({ columns: [table.playlistId, table.trackId, table.position] }),
  index('idx_playlist_tracks_playlist').on(table.playlistId),
  index('idx_playlist_tracks_track').on(table.trackId),
  index('idx_playlist_tracks_playlist_position').on(table.playlistId, table.position),
]);

// =============================================================================
// OAuth Credentials (encrypted refresh token)
// =============================================================================

export const spotifyCredentials = sqliteTable('spotify_credentials', {
  id: integer('id').primaryKey().$default(() => 1),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token').notNull(), // Encrypted
  expiresAt: text('expires_at'),
  scope: text('scope'),
});

// =============================================================================
// Sync Metadata
// =============================================================================

export const syncLog = sqliteTable('sync_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  syncType: text('sync_type').notNull(), // 'playlists', 'history', 'full'
  startedAt: text('started_at').default(sql`CURRENT_TIMESTAMP`),
  completedAt: text('completed_at'),
  status: text('status'), // 'running', 'success', 'failed'
  error: text('error'),
  itemsSynced: integer('items_synced'),
  itemsUpdated: integer('items_updated'),
  itemsAdded: integer('items_added'),
  durationSeconds: integer('duration_seconds'),
}, (table) => [
  index('idx_sync_log_status').on(table.status, table.startedAt),
]);

export const syncProgress = sqliteTable('sync_progress', {
  syncLogId: integer('sync_log_id').notNull().references(() => syncLog.id, { onDelete: 'cascade' }),
  step: text('step').notNull(), // 'playlists', 'artists', 'audio_features'
  totalItems: integer('total_items').default(0),
  processedItems: integer('processed_items').default(0),
  failedItems: integer('failed_items').default(0),
  startedAt: text('started_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
  completedAt: text('completed_at'),
}, (table) => [
  primaryKey({ columns: [table.syncLogId, table.step] }),
  index('idx_sync_progress_log_id').on(table.syncLogId),
]);

// =============================================================================
// Schema Versioning
// =============================================================================

export const schemaVersion = sqliteTable('_schema_version', {
  version: integer('version').primaryKey(),
  appliedAt: text('applied_at').default(sql`CURRENT_TIMESTAMP`),
});
