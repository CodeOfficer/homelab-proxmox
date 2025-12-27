import { eq, like, desc, sql, count, and, gte, lte, or } from 'drizzle-orm';
import { getDatabase } from '../db/client.js';
import { tracks, trackArtists, artists, albums } from '../db/schema.js';
import type { TrackWithDetails, PaginatedResult, SearchFilters } from '../types/index.js';

export async function getAllTracks(
  page = 1,
  pageSize = 50,
  query?: string
): Promise<PaginatedResult<TrackWithDetails>> {
  const db = getDatabase();
  const offset = (page - 1) * pageSize;

  let whereClause = undefined;
  if (query) {
    whereClause = like(sql`LOWER(${tracks.name})`, `%${query.toLowerCase()}%`);
  }

  const [items, totalResult] = await Promise.all([
    db
      .select({
        track: tracks,
        artist: artists,
        album: albums,
      })
      .from(tracks)
      .leftJoin(trackArtists, sql`${trackArtists.trackId} = ${tracks.id} AND ${trackArtists.position} = 0`)
      .leftJoin(artists, eq(trackArtists.artistId, artists.id))
      .leftJoin(albums, eq(tracks.albumId, albums.id))
      .where(whereClause)
      .orderBy(desc(tracks.popularity))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ count: count() })
      .from(tracks)
      .where(whereClause),
  ]);

  const tracksWithDetails: TrackWithDetails[] = items.map((row) => ({
    ...row.track,
    primaryArtistName: row.artist?.name,
    primaryArtistId: row.artist?.id,
    albumName: row.album?.name,
    albumImageUrl: row.album?.imageUrl,
  }));

  const total = totalResult[0]?.count ?? 0;

  return {
    items: tracksWithDetails,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getTrackById(id: string): Promise<TrackWithDetails | null> {
  const db = getDatabase();

  const result = await db
    .select({
      track: tracks,
      album: albums,
    })
    .from(tracks)
    .leftJoin(albums, eq(tracks.albumId, albums.id))
    .where(eq(tracks.id, id))
    .limit(1);

  if (!result[0]) return null;

  // Get all artists for this track
  const trackArtistRows = await db
    .select({ artist: artists, position: trackArtists.position })
    .from(trackArtists)
    .innerJoin(artists, eq(trackArtists.artistId, artists.id))
    .where(eq(trackArtists.trackId, id))
    .orderBy(trackArtists.position);

  const row = result[0];
  return {
    ...row.track,
    primaryArtistName: trackArtistRows[0]?.artist.name,
    primaryArtistId: trackArtistRows[0]?.artist.id,
    albumName: row.album?.name,
    albumImageUrl: row.album?.imageUrl,
    artists: trackArtistRows.map((r) => r.artist),
  };
}

export async function searchTracks(
  filters: SearchFilters,
  page = 1,
  pageSize = 50
): Promise<PaginatedResult<TrackWithDetails>> {
  const db = getDatabase();
  const offset = (page - 1) * pageSize;

  const conditions: ReturnType<typeof eq>[] = [];

  if (filters.query) {
    conditions.push(
      or(
        like(sql`LOWER(${tracks.name})`, `%${filters.query.toLowerCase()}%`),
        like(sql`LOWER(${artists.name})`, `%${filters.query.toLowerCase()}%`)
      )!
    );
  }

  if (filters.popularityMin !== undefined) {
    conditions.push(gte(tracks.popularity, filters.popularityMin));
  }
  if (filters.popularityMax !== undefined) {
    conditions.push(lte(tracks.popularity, filters.popularityMax));
  }
  if (filters.durationMinMs !== undefined) {
    conditions.push(gte(tracks.durationMs, filters.durationMinMs));
  }
  if (filters.durationMaxMs !== undefined) {
    conditions.push(lte(tracks.durationMs, filters.durationMaxMs));
  }
  if (filters.explicit !== undefined) {
    conditions.push(eq(tracks.explicit, filters.explicit));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [items, totalResult] = await Promise.all([
    db
      .select({
        track: tracks,
        artist: artists,
        album: albums,
      })
      .from(tracks)
      .leftJoin(trackArtists, sql`${trackArtists.trackId} = ${tracks.id} AND ${trackArtists.position} = 0`)
      .leftJoin(artists, eq(trackArtists.artistId, artists.id))
      .leftJoin(albums, eq(tracks.albumId, albums.id))
      .where(whereClause)
      .orderBy(desc(tracks.popularity))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ count: count() })
      .from(tracks)
      .leftJoin(trackArtists, sql`${trackArtists.trackId} = ${tracks.id} AND ${trackArtists.position} = 0`)
      .leftJoin(artists, eq(trackArtists.artistId, artists.id))
      .where(whereClause),
  ]);

  const tracksWithDetails: TrackWithDetails[] = items.map((row) => ({
    ...row.track,
    primaryArtistName: row.artist?.name,
    primaryArtistId: row.artist?.id,
    albumName: row.album?.name,
    albumImageUrl: row.album?.imageUrl,
  }));

  const total = totalResult[0]?.count ?? 0;

  return {
    items: tracksWithDetails,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}
