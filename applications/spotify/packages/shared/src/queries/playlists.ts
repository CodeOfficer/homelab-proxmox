import { eq, like, desc, sql, count } from 'drizzle-orm';
import { getDatabase } from '../db/client.js';
import { playlists, playlistTracks, tracks, trackArtists, artists, albums } from '../db/schema.js';
import type { Playlist, PlaylistWithTracks, PaginatedResult, TrackWithDetails } from '../types/index.js';

export async function getAllPlaylists(
  page = 1,
  pageSize = 50,
  query?: string
): Promise<PaginatedResult<Playlist>> {
  const db = getDatabase();
  const offset = (page - 1) * pageSize;

  let whereClause = undefined;
  if (query) {
    whereClause = like(sql`LOWER(${playlists.name})`, `%${query.toLowerCase()}%`);
  }

  const [items, totalResult] = await Promise.all([
    db
      .select()
      .from(playlists)
      .where(whereClause)
      .orderBy(desc(playlists.syncedAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ count: count() })
      .from(playlists)
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

export async function getPlaylistById(id: string): Promise<Playlist | null> {
  const db = getDatabase();
  const result = await db.select().from(playlists).where(eq(playlists.id, id)).limit(1);
  return result[0] ?? null;
}

export async function getPlaylistWithTracks(id: string): Promise<PlaylistWithTracks | null> {
  const db = getDatabase();

  const playlist = await getPlaylistById(id);
  if (!playlist) return null;

  // Get tracks with details
  const trackRows = await db
    .select({
      track: tracks,
      position: playlistTracks.position,
      addedAt: playlistTracks.addedAt,
      artist: artists,
      album: albums,
    })
    .from(playlistTracks)
    .innerJoin(tracks, eq(playlistTracks.trackId, tracks.id))
    .leftJoin(trackArtists, sql`${trackArtists.trackId} = ${tracks.id} AND ${trackArtists.position} = 0`)
    .leftJoin(artists, eq(trackArtists.artistId, artists.id))
    .leftJoin(albums, eq(tracks.albumId, albums.id))
    .where(eq(playlistTracks.playlistId, id))
    .orderBy(playlistTracks.position);

  const tracksWithDetails: TrackWithDetails[] = trackRows.map((row) => ({
    ...row.track,
    primaryArtistName: row.artist?.name,
    primaryArtistId: row.artist?.id,
    albumName: row.album?.name,
    albumImageUrl: row.album?.imageUrl,
  }));

  return {
    ...playlist,
    tracks: tracksWithDetails,
    trackCount: tracksWithDetails.length,
  };
}

export async function getPlaylistTrackCount(id: string): Promise<number> {
  const db = getDatabase();
  const result = await db
    .select({ count: count() })
    .from(playlistTracks)
    .where(eq(playlistTracks.playlistId, id));
  return result[0]?.count ?? 0;
}
