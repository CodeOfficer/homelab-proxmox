import { SpotifyApi } from '@spotify/web-api-ts-sdk';
import { SpotifyDatabase } from '@homelab/spotify-shared';

const BATCH_SIZE = 100; // Spotify max for /audio-features endpoint
const RATE_LIMIT_DELAY = 100; // 10 req/s = safe margin under 300/30s

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Sync audio features for tracks (tempo, energy, danceability, etc.)
 *
 * **CRITICAL**: Spotify deprecated audio features access on Nov 27, 2024 for apps
 * without extended quota mode. This function gracefully handles 403 responses.
 *
 * If audio features API returns 403 Forbidden:
 * - Logs warning and exits gracefully (doesn't throw error)
 * - Returns { available: false, processed: 0 }
 * - PRO tool still works with enhanced artist data and text search
 *
 * If audio features API is accessible:
 * - Fetches audio features in batches of 100 tracks
 * - Populates audio_features table
 * - Enables tempo/energy/mood search features in UI
 *
 * Batch processing: 100 tracks per request (Spotify API limit)
 * Rate limiting: 100ms delay = 10 req/s (safe under 300 req/30s)
 */
export async function syncAudioFeatures(
  db: SpotifyDatabase,
  spotifyApi: SpotifyApi,
  syncLogId: number
): Promise<{ available: boolean; processed: number; failed: number }> {
  console.log('Starting audio features sync...');

  // Get all track IDs that need audio features
  const trackIds = db.getTracksWithoutAudioFeatures(1000); // Process in chunks

  if (trackIds.length === 0) {
    console.log('  No tracks need audio features');
    return { available: true, processed: 0, failed: 0 };
  }

  console.log(`  Found ${trackIds.length} tracks needing audio features`);

  // Initialize progress tracking
  db.upsertSyncProgress(syncLogId, 'audio_features', trackIds.length, 0, 0);

  let processed = 0;
  let failed = 0;
  let isAvailable = true;

  // Process in batches of 100
  for (let i = 0; i < trackIds.length; i += BATCH_SIZE) {
    const batch = trackIds.slice(i, i + BATCH_SIZE);

    try {
      // Batch API call: GET /audio-features?ids=id1,id2,...
      // Returns { audio_features: [...] } with array of feature objects
      const response = await spotifyApi.tracks.audioFeatures(batch);

      // Check if response is valid
      if (!response || !response.audio_features) {
        console.warn(`  Empty response for batch ${i}-${i + batch.length}`);
        failed += batch.length;
        db.updateSyncProgress(syncLogId, 'audio_features', processed, failed);
        continue;
      }

      for (const features of response.audio_features) {
        if (features) {
          db.upsertAudioFeatures({
            track_id: features.id,
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
            time_signature: features.time_signature,
            duration_ms: features.duration_ms
          });
          processed++;
        } else {
          // Track may not have audio features available
          failed++;
        }
      }

      // Update progress in DB every batch
      db.updateSyncProgress(syncLogId, 'audio_features', processed, failed);

      console.log(`  Synced ${processed}/${trackIds.length} audio features`);

      // Rate limiting
      if (i + BATCH_SIZE < trackIds.length) {
        await sleep(RATE_LIMIT_DELAY);
      }

    } catch (error: any) {
      // Handle 403 Forbidden (API access restricted)
      if (error.status === 403 || error.message?.includes('403') || error.message?.includes('Forbidden')) {
        console.warn('⚠ Audio features API access is restricted (403 Forbidden)');
        console.warn('  Spotify deprecated audio features on Nov 27, 2024 for apps without extended quota mode.');
        console.warn('  The PRO tool will still work with enhanced artist data (genres, popularity) and text search.');
        console.warn('  Skipping audio features sync...');

        // Mark as failed but don't throw error
        isAvailable = false;
        failed += trackIds.length - processed;
        db.updateSyncProgress(syncLogId, 'audio_features', processed, failed);
        db.completeSyncProgress(syncLogId, 'audio_features');

        return { available: false, processed, failed };
      }

      // Handle other errors (rate limiting, network issues, etc.)
      console.error(`  Failed to fetch audio features for batch ${i}-${i + batch.length}:`, error.message);
      failed += batch.length;
      db.updateSyncProgress(syncLogId, 'audio_features', processed, failed);

      // Continue with next batch despite errors (partial success better than total failure)
    }
  }

  // Mark step as complete
  db.completeSyncProgress(syncLogId, 'audio_features');

  console.log(`✓ Audio features sync complete: ${processed} synced, ${failed} failed`);

  return { available: isAvailable, processed, failed };
}
