import { count, sum } from 'drizzle-orm';
import { getDatabase, getSqlite } from '../db/client.js';
import { playlists, tracks, artists, albums } from '../db/schema.js';
import { getTopGenres } from './genres.js';
import type { LibraryStats, TrackWithDetails } from '../types/index.js';

/**
 * Get library statistics
 */
export async function getLibraryStats(): Promise<LibraryStats> {
  const db = getDatabase();

  const [
    playlistCount,
    trackCount,
    artistCount,
    albumCount,
    durationResult,
    topGenres,
  ] = await Promise.all([
    db.select({ count: count() }).from(playlists),
    db.select({ count: count() }).from(tracks),
    db.select({ count: count() }).from(artists),
    db.select({ count: count() }).from(albums),
    db.select({ total: sum(tracks.durationMs) }).from(tracks),
    getTopGenres(10),
  ]);

  return {
    totalPlaylists: playlistCount[0]?.count ?? 0,
    totalTracks: trackCount[0]?.count ?? 0,
    totalArtists: artistCount[0]?.count ?? 0,
    totalAlbums: albumCount[0]?.count ?? 0,
    totalDurationMs: Number(durationResult[0]?.total) || 0,
    topGenres,
  };
}

/**
 * Get most popular tracks
 */
export async function getPopularTracks(limit = 20): Promise<TrackWithDetails[]> {
  const sqlite = getSqlite();

  const sql = `
    SELECT
      t.*,
      a.name as primary_artist_name,
      a.id as primary_artist_id,
      al.name as album_name,
      al.image_url as album_image_url
    FROM tracks t
    LEFT JOIN track_artists ta ON t.id = ta.track_id AND ta.position = 0
    LEFT JOIN artists a ON ta.artist_id = a.id
    LEFT JOIN albums al ON t.album_id = al.id
    ORDER BY t.popularity DESC
    LIMIT ?
  `;

  const rows = sqlite.prepare(sql).all(limit) as Array<Record<string, unknown>>;

  return rows.map((row) => ({
    id: row.id as string,
    name: row.name as string,
    albumId: row.album_id as string | null,
    durationMs: row.duration_ms as number | null,
    explicit: Boolean(row.explicit),
    popularity: row.popularity as number | null,
    previewUrl: row.preview_url as string | null,
    externalUrl: row.external_url as string | null,
    href: row.href as string | null,
    uri: row.uri as string | null,
    discNumber: row.disc_number as number | null,
    trackNumber: row.track_number as number | null,
    isLocal: Boolean(row.is_local),
    isPlayable: Boolean(row.is_playable),
    isrc: row.isrc as string | null,
    externalIdsJson: row.external_ids_json as string | null,
    availableMarketsJson: row.available_markets_json as string | null,
    restrictionsReason: row.restrictions_reason as string | null,
    linkedFromJson: row.linked_from_json as string | null,
    syncedAt: row.synced_at as string | null,
    primaryArtistName: row.primary_artist_name as string | undefined,
    primaryArtistId: row.primary_artist_id as string | undefined,
    albumName: row.album_name as string | undefined,
    albumImageUrl: row.album_image_url as string | undefined,
  }));
}
