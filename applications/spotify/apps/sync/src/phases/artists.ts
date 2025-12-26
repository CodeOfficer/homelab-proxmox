import { SpotifyApi } from '@spotify/web-api-ts-sdk';
import {
  getCredentials,
  upsertSyncProgress,
  upsertArtist,
  getArtistsNeedingEnrichment,
} from '@spotify/shared';

const BATCH_SIZE = 50;
const RATE_LIMIT_DELAY = 100;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function syncArtistDetails(
  syncLogId: number
): Promise<{ processed: number; failed: number }> {
  console.log('Starting artist enrichment...');

  const credentials = await getCredentials();
  if (!credentials || !credentials.accessToken) {
    throw new Error('Credentials missing for artist enrichment');
  }

  const spotifyApi = SpotifyApi.withAccessToken(process.env.SPOTIFY_CLIENT_ID!, {
    access_token: credentials.accessToken,
    refresh_token: credentials.refreshToken,
    expires_in: 3600,
    token_type: 'Bearer',
  });

  // Get artist IDs that need full details
  const artistIds = await getArtistsNeedingEnrichment(500);

  if (artistIds.length === 0) {
    console.log('  All artists have full details');
    return { processed: 0, failed: 0 };
  }

  console.log('  Found', artistIds.length, 'artists needing enrichment');

  // Initialize progress tracking
  await upsertSyncProgress({
    syncLogId,
    step: 'artists',
    totalItems: artistIds.length,
    processedItems: 0,
    failedItems: 0,
  });

  let processed = 0;
  let failed = 0;

  // Process in batches of 50
  for (let i = 0; i < artistIds.length; i += BATCH_SIZE) {
    const batch = artistIds.slice(i, i + BATCH_SIZE);

    try {
      const response = await spotifyApi.artists.get(batch);

      for (const artist of response) {
        if (artist) {
          await upsertArtist({
            id: artist.id,
            name: artist.name,
            genres: artist.genres?.join(',') || null,
            popularity: artist.popularity || 0,
            imageUrl: artist.images?.[0]?.url || null,
            externalUrl: artist.external_urls?.spotify || null,
            href: artist.href || null,
            uri: artist.uri || null,
            followersTotal: artist.followers?.total ?? null,
            imagesJson: artist.images ? JSON.stringify(artist.images) : null,
          });
          processed++;
        } else {
          failed++;
        }
      }

      // Update progress
      await upsertSyncProgress({
        syncLogId,
        step: 'artists',
        totalItems: artistIds.length,
        processedItems: processed,
        failedItems: failed,
      });

      console.log('  Enriched', processed + '/' + artistIds.length, 'artists');

      // Rate limiting
      if (i + BATCH_SIZE < artistIds.length) {
        await sleep(RATE_LIMIT_DELAY);
      }
    } catch (error: any) {
      console.error('  Failed to fetch artist details for batch:', error.message);
      failed += batch.length;
      await upsertSyncProgress({
        syncLogId,
        step: 'artists',
        totalItems: artistIds.length,
        processedItems: processed,
        failedItems: failed,
      });
    }
  }

  // Mark step as complete
  await upsertSyncProgress({
    syncLogId,
    step: 'artists',
    totalItems: artistIds.length,
    processedItems: processed,
    failedItems: failed,
    completedAt: new Date().toISOString(),
  });

  console.log('  Artist enrichment complete:', processed, 'enriched,', failed, 'failed');

  return { processed, failed };
}
