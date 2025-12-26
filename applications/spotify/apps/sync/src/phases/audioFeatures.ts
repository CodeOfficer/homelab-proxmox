import { SpotifyApi } from '@spotify/web-api-ts-sdk';
import {
  getCredentials,
  upsertSyncProgress,
  upsertAudioFeatures,
  getTracksNeedingAudioFeatures,
} from '@spotify/shared';

const BATCH_SIZE = 100;
const RATE_LIMIT_DELAY = 100;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function syncAudioFeatures(
  syncLogId: number
): Promise<{ available: boolean; processed: number; failed: number }> {
  console.log('Starting audio features sync...');

  const credentials = await getCredentials();
  if (!credentials || !credentials.accessToken) {
    throw new Error('Credentials missing for audio features sync');
  }

  const spotifyApi = SpotifyApi.withAccessToken(process.env.SPOTIFY_CLIENT_ID!, {
    access_token: credentials.accessToken,
    refresh_token: credentials.refreshToken,
    expires_in: 3600,
    token_type: 'Bearer',
  });

  // Get track IDs that need audio features
  const trackIds = await getTracksNeedingAudioFeatures(1000);

  if (trackIds.length === 0) {
    console.log('  No tracks need audio features');
    return { available: true, processed: 0, failed: 0 };
  }

  console.log('  Found', trackIds.length, 'tracks needing audio features');

  // Initialize progress tracking
  await upsertSyncProgress({
    syncLogId,
    step: 'audio_features',
    totalItems: trackIds.length,
    processedItems: 0,
    failedItems: 0,
  });

  let processed = 0;
  let failed = 0;
  let isAvailable = true;

  // Process in batches of 100
  for (let i = 0; i < trackIds.length; i += BATCH_SIZE) {
    const batch = trackIds.slice(i, i + BATCH_SIZE);

    try {
      const response = await spotifyApi.tracks.audioFeatures(batch);

      if (!response || response.length === 0) {
        console.warn('  Empty response for batch', i + '-' + (i + batch.length));
        failed += batch.length;
        await upsertSyncProgress({
          syncLogId,
          step: 'audio_features',
          totalItems: trackIds.length,
          processedItems: processed,
          failedItems: failed,
        });
        continue;
      }

      for (const features of response) {
        if (features) {
          await upsertAudioFeatures({
            trackId: features.id,
            danceability: features.danceability,
            energy: features.energy,
            key: features.key,
            loudness: features.loudness,
            mode: features.mode,
            speechiness: features.speechiness,
            acousticness: features.acousticness,
            instrumentalness: features.instrumentalness,
            liveness: features.liveness,
            valence: features.valence,
            tempo: features.tempo,
            timeSignature: features.time_signature,
            durationMs: features.duration_ms,
            analysisUrl: (features as any).analysis_url || null,
            trackHref: (features as any).track_href || null,
            uri: (features as any).uri || null,
          });
          processed++;
        } else {
          failed++;
        }
      }

      // Update progress
      await upsertSyncProgress({
        syncLogId,
        step: 'audio_features',
        totalItems: trackIds.length,
        processedItems: processed,
        failedItems: failed,
      });

      console.log('  Synced', processed + '/' + trackIds.length, 'audio features');

      // Rate limiting
      if (i + BATCH_SIZE < trackIds.length) {
        await sleep(RATE_LIMIT_DELAY);
      }
    } catch (error: any) {
      // Handle 403 Forbidden (API access restricted)
      if (
        error.status === 403 ||
        error.message?.includes('403') ||
        error.message?.includes('Forbidden')
      ) {
        console.warn('  Audio features API access is restricted (403 Forbidden)');
        console.warn('  Spotify deprecated audio features on Nov 27, 2024 for apps without extended quota mode.');
        console.warn('  Skipping audio features sync...');

        isAvailable = false;
        failed += trackIds.length - processed;
        await upsertSyncProgress({
          syncLogId,
          step: 'audio_features',
          totalItems: trackIds.length,
          processedItems: processed,
          failedItems: failed,
          completedAt: new Date().toISOString(),
        });

        return { available: false, processed, failed };
      }

      console.error('  Failed to fetch audio features for batch:', error.message);
      failed += batch.length;
      await upsertSyncProgress({
        syncLogId,
        step: 'audio_features',
        totalItems: trackIds.length,
        processedItems: processed,
        failedItems: failed,
      });
    }
  }

  // Mark step as complete
  await upsertSyncProgress({
    syncLogId,
    step: 'audio_features',
    totalItems: trackIds.length,
    processedItems: processed,
    failedItems: failed,
    completedAt: new Date().toISOString(),
  });

  console.log('  Audio features sync complete:', processed, 'synced,', failed, 'failed');

  return { available: isAvailable, processed, failed };
}
