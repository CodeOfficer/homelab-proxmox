import { SpotifyApi } from '@spotify/web-api-ts-sdk';
import { SpotifyDatabase } from '@homelab/spotify-shared';
import { appendFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const BATCH_SIZE = 50; // Spotify max for /artists endpoint
const RATE_LIMIT_DELAY = 100; // 10 req/s = safe margin under 300/30s

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

/**
 * Enrich artist data with full details (genres, popularity, images)
 *
 * During playlist sync, we only get artist names from track.artists array.
 * This function fetches full artist details via GET /v1/artists/{ids} endpoint.
 *
 * Batch processing: 50 artists per request (Spotify API limit)
 * Rate limiting: 100ms delay = 10 req/s (safe under 300 req/30s)
 */
export async function syncArtistDetails(
  db: SpotifyDatabase,
  spotifyApi: SpotifyApi,
  syncLogId: number
) {
  console.log('Starting artist enrichment...');

  // Get artist IDs that need full details (genres, popularity, image)
  const artistIds = db.getArtistsWithoutDetails(500);

  if (artistIds.length === 0) {
    console.log('  All artists have full details');
    return { processed: 0, failed: 0 };
  }

  console.log(`  Found ${artistIds.length} artists needing enrichment`);

  // Initialize progress tracking
  db.upsertSyncProgress(syncLogId, 'artists', artistIds.length, 0, 0);

  let processed = 0;
  let failed = 0;

  // Process in batches of 50
  for (let i = 0; i < artistIds.length; i += BATCH_SIZE) {
    const batch = artistIds.slice(i, i + BATCH_SIZE);

    try {
      // Batch API call: GET /artists?ids=id1,id2,...
      // Returns array of artist objects with full details
      const response = await spotifyApi.artists.get(batch);
      dumpResponse('artists.batch', { ids: batch, artists: response });

      for (const artist of response) {
        if (artist) {
          db.upsertArtist({
            id: artist.id,
            name: artist.name,
            genres: artist.genres || [],
            popularity: artist.popularity || 0,
            image_url: artist.images?.[0]?.url || null,
            external_url: artist.external_urls?.spotify || null,
            href: artist.href || null,
            uri: artist.uri || null,
            followers_total: artist.followers?.total ?? null,
            images_json: artist.images ? JSON.stringify(artist.images) : null
          });
          processed++;
        } else {
          // Artist may have been deleted or is unavailable
          console.warn(`  Skipping null artist in batch ${i}-${i + batch.length}`);
          failed++;
        }
      }

      // Update progress in DB every batch
      db.updateSyncProgress(syncLogId, 'artists', processed, failed);

      console.log(`  Enriched ${processed}/${artistIds.length} artists`);

      // Rate limiting
      if (i + BATCH_SIZE < artistIds.length) {
        await sleep(RATE_LIMIT_DELAY);
      }

    } catch (error: any) {
      console.error(`  Failed to fetch artist details for batch ${i}-${i + batch.length}:`, error.message);
      failed += batch.length;
      db.updateSyncProgress(syncLogId, 'artists', processed, failed);

      // Continue with next batch despite errors (partial success better than total failure)
    }
  }

  // Mark step as complete
  db.completeSyncProgress(syncLogId, 'artists');

  console.log(`✓ Artist enrichment complete: ${processed} enriched, ${failed} failed`);

  return { processed, failed };
}
