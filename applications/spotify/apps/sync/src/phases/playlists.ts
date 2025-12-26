import { SpotifyApi } from '@spotify/web-api-ts-sdk';
import {
  getCredentials,
  createSyncLog,
  updateSyncLog,
  upsertPlaylist,
  getPlaylistById,
  upsertAlbum,
  upsertArtist,
  upsertTrack,
  linkTrackArtist,
  addPlaylistTrack,
  clearPlaylistTracks,
} from '@spotify/shared';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function syncPlaylists(): Promise<number | null> {
  const credentials = await getCredentials();
  if (!credentials) {
    throw new Error('No Spotify credentials found. Please authenticate via web UI first.');
  }

  if (!credentials.accessToken) {
    throw new Error('Access token is missing. Please re-authenticate via web UI.');
  }

  // Create Spotify API client
  const spotifyApi = SpotifyApi.withAccessToken(
    process.env.SPOTIFY_CLIENT_ID!,
    {
      access_token: credentials.accessToken,
      refresh_token: credentials.refreshToken,
      expires_in: 3600,
      token_type: 'Bearer',
    }
  );

  const syncLog = await createSyncLog({ syncType: 'playlists', status: 'running' });

  try {
    let playlistsAdded = 0;
    let playlistsUpdated = 0;
    let totalPlaylists = 0;

    console.log('Fetching user playlists...');

    // Fetch all playlists (handle pagination)
    let offset = 0;
    const limit = 50;
    let hasMore = true;

    while (hasMore) {
      const response = await spotifyApi.currentUser.playlists.playlists(limit, offset);

      for (const playlist of response.items) {
        totalPlaylists++;

        const existing = await getPlaylistById(playlist.id);
        const isNew = !existing;
        const playlistName =
          playlist.name && playlist.name.trim().length > 0 ? playlist.name : 'Untitled playlist';
        console.log('  ' + (isNew ? 'Adding' : 'Updating') + ' playlist:', playlistName);

        // Upsert playlist metadata
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

        if (isNew) {
          playlistsAdded++;
        } else {
          playlistsUpdated++;
        }

        // Clear existing tracks for this playlist
        if (!isNew) {
          await clearPlaylistTracks(playlist.id);
        }

        // Fetch all tracks in this playlist
        console.log('    Fetching tracks for:', playlist.name);
        let trackOffset = 0;
        const trackLimit = 50;
        let hasMoreTracks = true;
        let trackPosition = 0;

        while (hasMoreTracks) {
          const tracks = await spotifyApi.playlists.getPlaylistItems(
            playlist.id,
            undefined,
            undefined,
            trackLimit,
            trackOffset
          );

          for (const item of tracks.items) {
            // Skip local files, null tracks, and non-track items
            if (!item.track || item.track.type !== 'track' || (item as any).is_local || (item.track as any).is_local) {
              continue;
            }

            const track = item.track;
            if (!track.id) {
              continue;
            }

            // Upsert album FIRST (foreign key dependency)
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
                availableMarketsJson: track.album.available_markets
                  ? JSON.stringify(track.album.available_markets)
                  : null,
                restrictionsReason: (track.album as any).restrictions?.reason || null,
              });
            }

            // Upsert artists SECOND
            if (track.artists) {
              for (let i = 0; i < track.artists.length; i++) {
                const artist = track.artists[i];
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

            // Upsert track THIRD
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
              isPlayable: (track as any).is_playable ?? null,
              isrc: (track.external_ids as any)?.isrc || null,
              externalIdsJson: track.external_ids ? JSON.stringify(track.external_ids) : null,
              availableMarketsJson: track.available_markets
                ? JSON.stringify(track.available_markets)
                : null,
              restrictionsReason: (track.restrictions as any)?.reason || null,
              linkedFromJson: (track as any).linked_from
                ? JSON.stringify((track as any).linked_from)
                : null,
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
              playlistId: playlist.id,
              trackId: track.id,
              position: trackPosition++,
              addedAt: item.added_at || null,
              addedBy: item.added_by?.id || null,
              addedByType: item.added_by?.type || null,
              addedByUri: item.added_by?.uri || null,
              addedByHref: item.added_by?.href || null,
              addedByExternalUrl: item.added_by?.external_urls?.spotify || null,
              isLocal: (item as any).is_local || (track as any).is_local || false,
              videoThumbnailUrl: (item as any).video_thumbnail?.url || null,
            });
          }

          trackOffset += trackLimit;
          hasMoreTracks = tracks.next !== null;

          // Rate limiting
          if (hasMoreTracks) {
            await sleep(100);
          }
        }

        console.log('    Added', trackPosition, 'tracks to', playlist.name);
      }

      offset += limit;
      hasMore = response.next !== null;

      if (hasMore) {
        await sleep(100);
      }
    }

    console.log('Sync complete!');
    console.log('  Total playlists:', totalPlaylists);
    console.log('  New playlists:', playlistsAdded);
    console.log('  Updated playlists:', playlistsUpdated);

    await updateSyncLog(syncLog.id, {
      status: 'success',
      completedAt: new Date().toISOString(),
      itemsSynced: totalPlaylists,
      itemsAdded: playlistsAdded,
      itemsUpdated: playlistsUpdated,
    });

    return syncLog.id;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Sync failed:', errorMessage);

    await updateSyncLog(syncLog.id, {
      status: 'failed',
      completedAt: new Date().toISOString(),
      error: errorMessage,
    });

    throw error;
  }
}
