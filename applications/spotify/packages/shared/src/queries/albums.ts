import { eq } from 'drizzle-orm';
import { getDatabase } from '../db/client.js';
import { albums, tracks, trackArtists, artists } from '../db/schema.js';
import type { Album, AlbumWithTracks, TrackWithDetails } from '../types/index.js';

export async function getAlbumById(id: string): Promise<Album | null> {
  const db = getDatabase();
  const result = await db.select().from(albums).where(eq(albums.id, id)).limit(1);
  return result[0] ?? null;
}

export async function getAlbumWithTracks(id: string): Promise<AlbumWithTracks | null> {
  const db = getDatabase();

  const album = await getAlbumById(id);
  if (!album) return null;

  // Get all tracks in this album
  const trackRows = await db
    .select({
      track: tracks,
      artist: artists,
    })
    .from(tracks)
    .leftJoin(trackArtists, eq(trackArtists.trackId, tracks.id))
    .leftJoin(artists, eq(trackArtists.artistId, artists.id))
    .where(eq(tracks.albumId, id))
    .orderBy(tracks.discNumber, tracks.trackNumber);

  // Group by track to get primary artist
  const trackMap = new Map<string, TrackWithDetails>();
  for (const row of trackRows) {
    const existing = trackMap.get(row.track.id);
    if (!existing) {
      trackMap.set(row.track.id, {
        ...row.track,
        primaryArtistName: row.artist?.name,
        primaryArtistId: row.artist?.id,
        albumName: album.name,
        albumImageUrl: album.imageUrl,
      });
    }
  }

  return {
    ...album,
    tracks: Array.from(trackMap.values()),
  };
}
