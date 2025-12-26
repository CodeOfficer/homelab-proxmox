import { eq, like, desc, sql, count } from 'drizzle-orm';
import { getDatabase } from '../db/client.js';
import { artists, trackArtists, tracks, albums, audioFeatures } from '../db/schema.js';
import type { Artist, ArtistWithTracks, PaginatedResult, TrackWithDetails } from '../types/index.js';

export async function getAllArtists(
  page = 1,
  pageSize = 48,
  query?: string
): Promise<PaginatedResult<Artist>> {
  const db = getDatabase();
  const offset = (page - 1) * pageSize;

  let whereClause = undefined;
  if (query) {
    whereClause = like(sql`LOWER(${artists.name})`, `%${query.toLowerCase()}%`);
  }

  const [items, totalResult] = await Promise.all([
    db
      .select()
      .from(artists)
      .where(whereClause)
      .orderBy(desc(artists.popularity))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ count: count() })
      .from(artists)
      .where(whereClause),
  ]);

  const total = totalResult[0]?.count ?? 0;

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getArtistById(id: string): Promise<Artist | null> {
  const db = getDatabase();
  const result = await db.select().from(artists).where(eq(artists.id, id)).limit(1);
  return result[0] ?? null;
}

export async function getArtistWithTracks(id: string): Promise<ArtistWithTracks | null> {
  const db = getDatabase();

  const artist = await getArtistById(id);
  if (!artist) return null;

  // Get all tracks by this artist
  const trackRows = await db
    .select({
      track: tracks,
      album: albums,
      audio: audioFeatures,
    })
    .from(trackArtists)
    .innerJoin(tracks, eq(trackArtists.trackId, tracks.id))
    .leftJoin(albums, eq(tracks.albumId, albums.id))
    .leftJoin(audioFeatures, eq(tracks.id, audioFeatures.trackId))
    .where(eq(trackArtists.artistId, id))
    .orderBy(desc(tracks.popularity));

  const tracksWithDetails: TrackWithDetails[] = trackRows.map((row) => ({
    ...row.track,
    primaryArtistName: artist.name,
    primaryArtistId: artist.id,
    albumName: row.album?.name,
    albumImageUrl: row.album?.imageUrl,
    audioFeatures: row.audio,
  }));

  return {
    ...artist,
    tracks: tracksWithDetails,
  };
}

export async function getArtistTrackCount(id: string): Promise<number> {
  const db = getDatabase();
  const result = await db
    .select({ count: count() })
    .from(trackArtists)
    .where(eq(trackArtists.artistId, id));
  return result[0]?.count ?? 0;
}
