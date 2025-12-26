import { eq, sql, isNull, and } from 'drizzle-orm';
import { getDatabase } from '../db/client.js';
import {
  artists,
  albums,
  tracks,
  trackArtists,
  playlists,
  playlistTracks,
  audioFeatures,
} from '../db/schema.js';
import type {
  NewArtist,
  NewAlbum,
  NewTrack,
  NewPlaylist,
  NewPlaylistTrack,
  NewAudioFeatures,
} from '../types/index.js';

// =============================================================================
// Artist Mutations
// =============================================================================

export async function upsertArtist(data: NewArtist): Promise<void> {
  const db = getDatabase();
  await db
    .insert(artists)
    .values({ ...data, syncedAt: sql`CURRENT_TIMESTAMP` })
    .onConflictDoUpdate({
      target: artists.id,
      set: {
        name: data.name,
        genres: data.genres,
        popularity: data.popularity,
        imageUrl: data.imageUrl,
        externalUrl: data.externalUrl,
        href: data.href,
        uri: data.uri,
        followersTotal: data.followersTotal,
        imagesJson: data.imagesJson,
        syncedAt: sql`CURRENT_TIMESTAMP`,
      },
    });
}

export async function getArtistsNeedingEnrichment(limit = 500): Promise<string[]> {
  const db = getDatabase();
  const result = await db
    .select({ id: artists.id })
    .from(artists)
    .where(and(isNull(artists.genres), isNull(artists.popularity)))
    .limit(limit);
  return result.map((r) => r.id);
}

// =============================================================================
// Album Mutations
// =============================================================================

export async function upsertAlbum(data: NewAlbum): Promise<void> {
  const db = getDatabase();
  await db
    .insert(albums)
    .values({ ...data, syncedAt: sql`CURRENT_TIMESTAMP` })
    .onConflictDoUpdate({
      target: albums.id,
      set: {
        name: data.name,
        releaseDate: data.releaseDate,
        albumType: data.albumType,
        totalTracks: data.totalTracks,
        imageUrl: data.imageUrl,
        externalUrl: data.externalUrl,
        href: data.href,
        uri: data.uri,
        releaseDatePrecision: data.releaseDatePrecision,
        imagesJson: data.imagesJson,
        availableMarketsJson: data.availableMarketsJson,
        restrictionsReason: data.restrictionsReason,
        syncedAt: sql`CURRENT_TIMESTAMP`,
      },
    });
}

// =============================================================================
// Track Mutations
// =============================================================================

export async function upsertTrack(data: NewTrack): Promise<void> {
  const db = getDatabase();
  await db
    .insert(tracks)
    .values({ ...data, syncedAt: sql`CURRENT_TIMESTAMP` })
    .onConflictDoUpdate({
      target: tracks.id,
      set: {
        name: data.name,
        albumId: data.albumId,
        durationMs: data.durationMs,
        explicit: data.explicit,
        popularity: data.popularity,
        previewUrl: data.previewUrl,
        externalUrl: data.externalUrl,
        href: data.href,
        uri: data.uri,
        discNumber: data.discNumber,
        trackNumber: data.trackNumber,
        isLocal: data.isLocal,
        isPlayable: data.isPlayable,
        isrc: data.isrc,
        externalIdsJson: data.externalIdsJson,
        availableMarketsJson: data.availableMarketsJson,
        restrictionsReason: data.restrictionsReason,
        linkedFromJson: data.linkedFromJson,
        syncedAt: sql`CURRENT_TIMESTAMP`,
      },
    });
}

export async function getTracksNeedingAudioFeatures(limit = 1000): Promise<string[]> {
  const db = getDatabase();
  const result = await db
    .select({ id: tracks.id })
    .from(tracks)
    .leftJoin(audioFeatures, eq(tracks.id, audioFeatures.trackId))
    .where(isNull(audioFeatures.trackId))
    .limit(limit);
  return result.map((r) => r.id);
}

// =============================================================================
// Track-Artist Mutations
// =============================================================================

export async function linkTrackArtist(
  trackId: string,
  artistId: string,
  position: number
): Promise<void> {
  const db = getDatabase();
  await db
    .insert(trackArtists)
    .values({ trackId, artistId, position })
    .onConflictDoNothing();
}

export async function clearTrackArtists(trackId: string): Promise<void> {
  const db = getDatabase();
  await db.delete(trackArtists).where(eq(trackArtists.trackId, trackId));
}

// =============================================================================
// Playlist Mutations
// =============================================================================

export async function upsertPlaylist(data: NewPlaylist): Promise<void> {
  const db = getDatabase();
  await db
    .insert(playlists)
    .values({ ...data, syncedAt: sql`CURRENT_TIMESTAMP` })
    .onConflictDoUpdate({
      target: playlists.id,
      set: {
        name: data.name,
        description: data.description,
        ownerId: data.ownerId,
        ownerName: data.ownerName,
        public: data.public,
        collaborative: data.collaborative,
        snapshotId: data.snapshotId,
        imageUrl: data.imageUrl,
        externalUrl: data.externalUrl,
        href: data.href,
        uri: data.uri,
        primaryColor: data.primaryColor,
        tracksTotal: data.tracksTotal,
        ownerUri: data.ownerUri,
        ownerExternalUrl: data.ownerExternalUrl,
        ownerType: data.ownerType,
        imagesJson: data.imagesJson,
        syncedAt: sql`CURRENT_TIMESTAMP`,
      },
    });
}

// =============================================================================
// Playlist-Track Mutations
// =============================================================================

export async function addPlaylistTrack(data: NewPlaylistTrack): Promise<void> {
  const db = getDatabase();
  await db.insert(playlistTracks).values(data).onConflictDoNothing();
}

export async function clearPlaylistTracks(playlistId: string): Promise<void> {
  const db = getDatabase();
  await db.delete(playlistTracks).where(eq(playlistTracks.playlistId, playlistId));
}

// =============================================================================
// Audio Features Mutations
// =============================================================================

export async function upsertAudioFeatures(data: NewAudioFeatures): Promise<void> {
  const db = getDatabase();
  await db
    .insert(audioFeatures)
    .values({ ...data, syncedAt: sql`CURRENT_TIMESTAMP` })
    .onConflictDoUpdate({
      target: audioFeatures.trackId,
      set: {
        danceability: data.danceability,
        energy: data.energy,
        key: data.key,
        loudness: data.loudness,
        mode: data.mode,
        speechiness: data.speechiness,
        acousticness: data.acousticness,
        instrumentalness: data.instrumentalness,
        liveness: data.liveness,
        valence: data.valence,
        tempo: data.tempo,
        timeSignature: data.timeSignature,
        durationMs: data.durationMs,
        analysisUrl: data.analysisUrl,
        trackHref: data.trackHref,
        uri: data.uri,
        syncedAt: sql`CURRENT_TIMESTAMP`,
      },
    });
}
