import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import {
  initializeDatabase,
  upsertPlaylist,
  upsertAlbum,
  upsertArtist,
  upsertTrack,
  linkTrackArtist,
  addPlaylistTrack,
  clearPlaylistTracks,
  getPlaylistById,
} from '@spotify/shared';

interface DumpLine {
  type: string;
  timestamp: string;
  payload: unknown;
}

/**
 * Restore database from a JSONL dump file.
 * Reads each line and populates the database using the same upsert functions
 * as the live sync - no Spotify API calls needed.
 */
async function restore() {
  const dumpPath = process.env.SPOTIFY_SYNC_DUMP_PATH;
  if (!dumpPath) {
    console.error('ERROR: SPOTIFY_SYNC_DUMP_PATH not set');
    process.exit(1);
  }

  console.log('============================================================');
  console.log('  Spotify PRO Sync - Restore from Cache');
  console.log('============================================================');
  console.log('');
  console.log('Dump file:', dumpPath);
  console.log('Database:', process.env.SPOTIFY_DB_PATH || './.local/spotify.db');
  console.log('');

  initializeDatabase();

  const fileStream = createReadStream(dumpPath);
  const rl = createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let lineCount = 0;
  let playlistCount = 0;
  let trackCount = 0;
  let artistCount = 0;

  for await (const line of rl) {
    if (!line.trim()) continue;

    lineCount++;
    const entry: DumpLine = JSON.parse(line);

    switch (entry.type) {
      case 'playlists.page':
        await processPlaylistsPage(entry.payload as PlaylistsPagePayload);
        playlistCount++;
        break;

      case 'playlists.items.page':
        trackCount += await processPlaylistItemsPage(entry.payload as PlaylistItemsPagePayload);
        break;

      case 'artists.batch':
        artistCount += await processArtistsBatch(entry.payload as ArtistsBatchPayload);
        break;

      default:
        console.warn('Unknown dump type:', entry.type);
    }

    if (lineCount % 100 === 0) {
      console.log(`  Processed ${lineCount} entries...`);
    }
  }

  console.log('');
  console.log('============================================================');
  console.log('  Restore Complete');
  console.log('============================================================');
  console.log('  Entries processed:', lineCount);
  console.log('  Playlist pages:', playlistCount);
  console.log('  Tracks restored:', trackCount);
  console.log('  Artists enriched:', artistCount);
  console.log('');

  process.exit(0);
}

// Type definitions for payloads
interface PlaylistsPagePayload {
  offset: number;
  limit: number;
  response: {
    items: Array<{
      id: string;
      name: string;
      description: string | null;
      owner: { id: string; display_name?: string; uri?: string; external_urls?: { spotify?: string }; type?: string };
      public: boolean;
      collaborative: boolean;
      snapshot_id: string;
      images?: Array<{ url: string }>;
      external_urls?: { spotify?: string };
      href?: string;
      uri?: string;
      primary_color?: string;
      tracks?: { total?: number };
    }>;
  };
}

interface PlaylistItemsPagePayload {
  playlistId: string;
  trackOffset: number;
  trackLimit: number;
  tracks: {
    items: Array<{
      track: {
        id: string;
        name: string;
        album?: {
          id: string;
          name: string;
          release_date?: string;
          album_type?: string;
          total_tracks?: number;
          images?: Array<{ url: string }>;
          external_urls?: { spotify?: string };
          href?: string;
          uri?: string;
          release_date_precision?: string;
          available_markets?: string[];
          restrictions?: { reason?: string };
        };
        artists?: Array<{
          id: string;
          name: string;
          external_urls?: { spotify?: string };
          href?: string;
          uri?: string;
        }>;
        duration_ms: number;
        explicit: boolean;
        popularity?: number;
        preview_url?: string;
        external_urls?: { spotify?: string };
        href?: string;
        uri?: string;
        disc_number?: number;
        track_number?: number;
        is_local?: boolean;
        is_playable?: boolean;
        external_ids?: { isrc?: string };
        available_markets?: string[];
        restrictions?: { reason?: string };
        linked_from?: unknown;
        type: string;
      } | null;
      added_at?: string;
      added_by?: { id?: string; type?: string; uri?: string; href?: string; external_urls?: { spotify?: string } };
      is_local?: boolean;
      video_thumbnail?: { url?: string };
    }>;
  };
}

interface ArtistsBatchPayload {
  batchIndex: number;
  batch: string[];
  response: Array<{
    id: string;
    name: string;
    genres?: string[];
    popularity?: number;
    images?: Array<{ url: string }>;
    external_urls?: { spotify?: string };
    href?: string;
    uri?: string;
    followers?: { total?: number };
  } | null>;
}

async function processPlaylistsPage(payload: PlaylistsPagePayload): Promise<void> {
  for (const playlist of payload.response.items) {
    const playlistName = playlist.name?.trim() || 'Untitled playlist';

    await upsertPlaylist({
      id: playlist.id,
      name: playlistName,
      description: playlist.description || null,
      ownerId: playlist.owner.id,
      ownerName: playlist.owner.display_name || null,
      public: playlist.public || false,
      collaborative: playlist.collaborative || false,
      snapshotId: playlist.snapshot_id,
      imageUrl: playlist.images?.[0]?.url || null,
      externalUrl: playlist.external_urls?.spotify || null,
      href: playlist.href || null,
      uri: playlist.uri || null,
      primaryColor: (playlist as any).primary_color || null,
      tracksTotal: playlist.tracks?.total ?? null,
      ownerUri: playlist.owner?.uri || null,
      ownerExternalUrl: playlist.owner?.external_urls?.spotify || null,
      ownerType: playlist.owner?.type || null,
      imagesJson: playlist.images ? JSON.stringify(playlist.images) : null,
    });
  }
}

async function processPlaylistItemsPage(payload: PlaylistItemsPagePayload): Promise<number> {
  const { playlistId, trackOffset, tracks } = payload;
  let trackPosition = trackOffset;
  let count = 0;

  // Clear existing tracks for this playlist on first page
  if (trackOffset === 0) {
    const existing = await getPlaylistById(playlistId);
    if (existing) {
      await clearPlaylistTracks(playlistId);
    }
  }

  for (const item of tracks.items) {
    if (!item.track || item.track.type !== 'track' || (item as any).is_local || (item.track as any).is_local) {
      continue;
    }

    const track = item.track;
    if (!track.id) continue;

    // Upsert album
    if (track.album?.id) {
      await upsertAlbum({
        id: track.album.id,
        name: track.album.name,
        releaseDate: track.album.release_date || null,
        albumType: track.album.album_type || null,
        totalTracks: track.album.total_tracks || null,
        imageUrl: track.album.images?.[0]?.url || null,
        externalUrl: track.album.external_urls?.spotify || null,
        href: track.album.href || null,
        uri: track.album.uri || null,
        releaseDatePrecision: track.album.release_date_precision || null,
        imagesJson: track.album.images ? JSON.stringify(track.album.images) : null,
        availableMarketsJson: track.album.available_markets ? JSON.stringify(track.album.available_markets) : null,
        restrictionsReason: track.album.restrictions?.reason || null,
      });
    }

    // Upsert artists
    if (track.artists) {
      for (const artist of track.artists) {
        if (!artist.id) continue;
        await upsertArtist({
          id: artist.id,
          name: artist.name,
          genres: null,
          popularity: null,
          imageUrl: null,
          externalUrl: artist.external_urls?.spotify || null,
          href: artist.href || null,
          uri: artist.uri || null,
          followersTotal: null,
          imagesJson: null,
        });
      }
    }

    // Upsert track
    await upsertTrack({
      id: track.id,
      name: track.name,
      albumId: track.album?.id || null,
      durationMs: track.duration_ms,
      explicit: track.explicit || false,
      popularity: track.popularity || 0,
      previewUrl: track.preview_url || null,
      externalUrl: track.external_urls?.spotify || null,
      href: track.href || null,
      uri: track.uri || null,
      discNumber: track.disc_number ?? null,
      trackNumber: track.track_number ?? null,
      isLocal: track.is_local || false,
      isPlayable: track.is_playable ?? null,
      isrc: track.external_ids?.isrc || null,
      externalIdsJson: track.external_ids ? JSON.stringify(track.external_ids) : null,
      availableMarketsJson: track.available_markets ? JSON.stringify(track.available_markets) : null,
      restrictionsReason: track.restrictions?.reason || null,
      linkedFromJson: track.linked_from ? JSON.stringify(track.linked_from) : null,
    });

    // Link track to artists
    if (track.artists) {
      for (let i = 0; i < track.artists.length; i++) {
        const artist = track.artists[i];
        if (!artist.id) continue;
        await linkTrackArtist(track.id, artist.id, i);
      }
    }

    // Link track to playlist
    await addPlaylistTrack({
      playlistId,
      trackId: track.id,
      position: trackPosition++,
      addedAt: item.added_at || null,
      addedBy: item.added_by?.id || null,
      addedByType: item.added_by?.type || null,
      addedByUri: item.added_by?.uri || null,
      addedByHref: item.added_by?.href || null,
      addedByExternalUrl: item.added_by?.external_urls?.spotify || null,
      isLocal: (item as any).is_local || false,
      videoThumbnailUrl: item.video_thumbnail?.url || null,
    });

    count++;
  }

  return count;
}

async function processArtistsBatch(payload: ArtistsBatchPayload): Promise<number> {
  let count = 0;

  for (const artist of payload.response) {
    if (!artist) continue;

    await upsertArtist({
      id: artist.id,
      name: artist.name,
      genres: artist.genres?.length ? JSON.stringify(artist.genres) : null,
      popularity: artist.popularity || 0,
      imageUrl: artist.images?.[0]?.url || null,
      externalUrl: artist.external_urls?.spotify || null,
      href: artist.href || null,
      uri: artist.uri || null,
      followersTotal: artist.followers?.total ?? null,
      imagesJson: artist.images ? JSON.stringify(artist.images) : null,
    });
    count++;
  }

  return count;
}

restore();
