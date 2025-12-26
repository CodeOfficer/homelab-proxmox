import { SpotifyApi } from '@spotify/web-api-ts-sdk';
import { SpotifyDatabase } from '@homelab/spotify-shared';
import { appendFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const dumpPath = process.env.SPOTIFY_SYNC_DUMP_PATH;

function dumpResponse(type: string, payload: unknown) {
  if (!dumpPath) return;
  try {
    mkdirSync(dirname(dumpPath), { recursive: true });
    const line = JSON.stringify({ type, timestamp: new Date().toISOString(), payload });
    appendFileSync(dumpPath, `${line}\n`);
  } catch (error) {
    console.warn('Failed to write sync dump:', error);
  }
}

export async function syncPlaylists(db: SpotifyDatabase) {
  const credentials = db.getCredentials();
  if (!credentials) {
    throw new Error('No Spotify credentials found. Please authenticate via web UI first.');
  }

  if (!credentials.access_token) {
    throw new Error('Access token is missing. Please re-authenticate via web UI.');
  }

  // Create Spotify API client with existing credentials
  const spotifyApi = SpotifyApi.withAccessToken(
    process.env.SPOTIFY_CLIENT_ID!,
    {
      access_token: credentials.access_token,
      refresh_token: credentials.refresh_token,
      expires_in: 3600,
      token_type: 'Bearer'
    }
  );

  const logId = db.createSyncLog('playlists', 'running');

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
      dumpResponse('playlists.page', response);

      for (const playlist of response.items) {
        totalPlaylists++;

        // Always fetch playlist items to keep local DB and dumps complete
        const existing = db.getPlaylist(playlist.id);

        const isNew = !existing;
        console.log(`  ${isNew ? 'Adding' : 'Updating'} playlist: ${playlist.name}`);

        // Upsert playlist metadata
        db.upsertPlaylist({
          id: playlist.id,
          name: playlist.name,
          description: playlist.description || null,
          owner_id: playlist.owner.id,
          owner_name: playlist.owner.display_name || null,
          public: playlist.public || false,
          collaborative: playlist.collaborative || false,
          snapshot_id: playlist.snapshot_id,
          image_url: playlist.images?.[0]?.url || null,
          external_url: playlist.external_urls?.spotify || null,
          href: playlist.href || null,
          uri: playlist.uri || null,
          primary_color: playlist.primary_color || null,
          tracks_total: playlist.tracks?.total ?? null,
          owner_uri: playlist.owner?.uri || null,
          owner_external_url: playlist.owner?.external_urls?.spotify || null,
          owner_type: playlist.owner?.type || null,
          images_json: playlist.images ? JSON.stringify(playlist.images) : null
        });

        if (isNew) {
          playlistsAdded++;
        } else {
          playlistsUpdated++;
        }

        // Clear existing tracks for this playlist (will be re-added)
        if (!isNew) {
          db.clearPlaylistTracks(playlist.id);
        }

        // Fetch all tracks in this playlist (handle pagination)
        console.log(`    Fetching tracks for: ${playlist.name}`);
        let trackOffset = 0;
        const trackLimit = 50; // Use 50 to match SDK type constraints
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
          dumpResponse('playlists.items.page', { playlist_id: playlist.id, offset: trackOffset, items: tracks });

          for (const item of tracks.items) {
            // Skip local files, null tracks, and non-track items
            if (!item.track || item.track.type !== 'track' || (item as any).is_local || (item.track as any).is_local) {
              console.log(`    Skipping non-track item in ${playlist.name}`);
              continue;
            }

            const track = item.track;
            if (!track.id) {
              console.log(`    Skipping track with missing ID in ${playlist.name}`);
              continue;
            }

            // Upsert album FIRST (foreign key dependency)
            if (track.album?.id) {
              db.upsertAlbum({
                id: track.album.id,
                name: track.album.name,
                release_date: track.album.release_date || null,
                album_type: track.album.album_type || null,
                total_tracks: track.album.total_tracks || null,
                image_url: track.album.images?.[0]?.url || null,
                external_url: track.album.external_urls?.spotify || null,
                href: track.album.href || null,
                uri: track.album.uri || null,
                release_date_precision: track.album.release_date_precision || null,
                images_json: track.album.images ? JSON.stringify(track.album.images) : null,
                available_markets_json: track.album.available_markets ? JSON.stringify(track.album.available_markets) : null,
                restrictions_reason: (track.album as any).restrictions?.reason || null
              });
            }

            // Upsert artists SECOND (foreign key dependency)
            if (track.artists) {
              for (let i = 0; i < track.artists.length; i++) {
                const artist = track.artists[i];
                if (!artist.id) {
                  continue;
                }

                db.upsertArtist({
                  id: artist.id,
                  name: artist.name,
                  genres: null, // Artist details not available in playlist tracks
                  popularity: null,
                  image_url: null,
                  external_url: artist.external_urls?.spotify || null,
                  href: artist.href || null,
                  uri: artist.uri || null,
                  followers_total: null,
                  images_json: null
                });
              }
            }

            // Upsert track THIRD (after dependencies exist)
            db.upsertTrack({
              id: track.id,
              name: track.name,
              album_id: track.album?.id || null,
              duration_ms: track.duration_ms,
              explicit: track.explicit || false,
              popularity: track.popularity || 0,
              preview_url: track.preview_url || null,
              external_url: track.external_urls?.spotify || null,
              href: track.href || null,
              uri: track.uri || null,
              disc_number: track.disc_number ?? null,
              track_number: track.track_number ?? null,
              is_local: track.is_local || false,
              is_playable: (track as any).is_playable ?? null,
              isrc: (track.external_ids as any)?.isrc || null,
              external_ids_json: track.external_ids ? JSON.stringify(track.external_ids) : null,
              available_markets_json: track.available_markets ? JSON.stringify(track.available_markets) : null,
              restrictions_reason: (track.restrictions as any)?.reason || null,
              linked_from_json: (track as any).linked_from ? JSON.stringify((track as any).linked_from) : null
            });

            // Link track to artists LAST
            if (track.artists) {
              for (let i = 0; i < track.artists.length; i++) {
                const artist = track.artists[i];
                if (!artist.id) {
                  continue;
                }
                db.linkTrackArtist(track.id, artist.id, i);
              }
            }

            // Link track to playlist
            db.addPlaylistTrack(
              playlist.id,
              track.id,
              trackPosition++,
              item.added_at || null,
              item.added_by?.id || null,
              item.added_by?.type || null,
              item.added_by?.uri || null,
              item.added_by?.href || null,
              item.added_by?.external_urls?.spotify || null,
              (item as any).is_local || (track as any).is_local || false,
              (item as any).video_thumbnail?.url || null
            );
          }

          trackOffset += trackLimit;
          hasMoreTracks = tracks.next !== null;

          // Rate limit handling (Spotify: 300 req/30s)
          // Using 100ms delay = 10 req/s = safe margin
          if (hasMoreTracks) {
            await sleep(100);
          }
        }

        console.log(`    Added ${trackPosition} tracks to ${playlist.name}`);
      }

      offset += limit;
      hasMore = response.next !== null;

      // Rate limit handling
      if (hasMore) {
        await sleep(100);
      }
    }

    console.log('Sync complete!');
    console.log(`  Total playlists: ${totalPlaylists}`);
    console.log(`  New playlists: ${playlistsAdded}`);
    console.log(`  Updated playlists: ${playlistsUpdated}`);

    db.completeSyncLog(logId, 'success', totalPlaylists, playlistsAdded, playlistsUpdated);

    // Send Telegram notification if configured
    await sendTelegramNotification(
      `✅ Spotify sync complete\\n` +
      `Playlists: ${totalPlaylists}\\n` +
      `Added: ${playlistsAdded}, Updated: ${playlistsUpdated}`
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Sync failed:', errorMessage);

    db.completeSyncLog(logId, 'failed', 0, 0, 0, errorMessage);

    // Send Telegram notification if configured
    await sendTelegramNotification(
      `❌ Spotify sync failed\\n` +
      `Error: ${errorMessage}`
    );

    throw error;
  }
}

async function sendTelegramNotification(message: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.log('Telegram notifications not configured (skipping)');
    return;
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML'
        })
      }
    );

    if (!response.ok) {
      console.warn('Failed to send Telegram notification:', response.statusText);
    }
  } catch (error) {
    console.warn('Failed to send Telegram notification:', error);
  }
}
