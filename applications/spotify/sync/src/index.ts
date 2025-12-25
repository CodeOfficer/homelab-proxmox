import { SpotifyDatabase } from '@homelab/spotify-shared';
import { syncPlaylists } from './syncPlaylists';
import { syncArtistDetails } from './syncArtists';
import { syncAudioFeatures } from './syncAudioFeatures';

/**
 * Main sync orchestrator - runs 3-phase sync with progress tracking
 *
 * Phase 1: Playlists + Tracks (existing sync logic)
 * Phase 2: Artist enrichment (genres, popularity, images)
 * Phase 3: Audio features (tempo, energy, danceability) - gracefully skipped if API blocked
 *
 * Progress is tracked in sync_progress table for real-time UI updates
 */
async function main() {
  // Validate required environment variables
  const requiredVars = ['DATABASE_PATH', 'SPOTIFY_CLIENT_ID', 'SPOTIFY_CLIENT_SECRET'];
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      console.error(`ERROR: Missing required environment variable: ${varName}`);
      process.exit(1);
    }
  }

  const dbPath = process.env.DATABASE_PATH!;
  console.log(`Opening database: ${dbPath}`);
  console.log(`Time: ${new Date().toISOString()}`);
  console.log('');

  const db = new SpotifyDatabase(dbPath);

  try {
    console.log('============================================================');
    console.log('  Spotify PRO Sync - Complete Data Sync');
    console.log('============================================================');
    console.log('');

    // Phase 1: Sync playlists and tracks
    console.log('Phase 1: Syncing playlists and tracks...');
    await syncPlaylists(db);
    console.log('');

    // Get credentials for phases 2 & 3
    const credentials = db.getCredentials();
    if (!credentials || !credentials.access_token) {
      throw new Error('Credentials missing after playlist sync - this should not happen');
    }

    // Create Spotify API client for enrichment phases
    // Note: We import SpotifyApi dynamically to avoid circular dependencies
    const { SpotifyApi } = await import('@spotify/web-api-ts-sdk');
    const spotifyApi = SpotifyApi.withAccessToken(
      process.env.SPOTIFY_CLIENT_ID!,
      {
        access_token: credentials.access_token,
        refresh_token: credentials.refresh_token,
        expires_in: 3600,
        token_type: 'Bearer'
      }
    );

    // Get sync log ID (created by syncPlaylists)
    const recentSyncs = db.getRecentSyncs(1);
    const syncLogId = recentSyncs[0]?.id;

    if (!syncLogId) {
      throw new Error('No sync log found after playlist sync');
    }

    // Phase 2: Enrich artist data (genres, popularity, images)
    console.log('Phase 2: Enriching artist data...');
    const artistResult = await syncArtistDetails(db, spotifyApi, syncLogId);
    console.log('');

    // Phase 3: Fetch audio features (tempo, energy, danceability, etc.)
    console.log('Phase 3: Fetching audio features...');
    const audioResult = await syncAudioFeatures(db, spotifyApi, syncLogId);
    console.log('');

    // Summary
    console.log('============================================================');
    console.log('  Sync Summary');
    console.log('============================================================');
    console.log(`  Artists enriched: ${artistResult.processed} (${artistResult.failed} failed)`);
    console.log(`  Audio features synced: ${audioResult.processed} (${audioResult.failed} failed)`);

    if (!audioResult.available) {
      console.log('');
      console.log('  ⚠  Audio features API is not accessible.');
      console.log('     Your PRO tool will work with:');
      console.log('       ✓ Full artist details (genres, popularity)');
      console.log('       ✓ Text search (tracks, artists, playlists)');
      console.log('       ✓ Genre filtering');
      console.log('       ✗ Tempo/energy/mood filtering (requires audio features)');
    } else {
      console.log('');
      console.log('  ✓ All features available!');
      console.log('     Your PRO tool includes:');
      console.log('       ✓ Full artist details (genres, popularity)');
      console.log('       ✓ Audio features (tempo, energy, danceability)');
      console.log('       ✓ Advanced search (text, genre, tempo, mood)');
    }

    console.log('');
    console.log('Sync completed successfully!');
    process.exit(0);

  } catch (error: any) {
    console.error('');
    console.error('============================================================');
    console.error('  Sync Failed');
    console.error('============================================================');
    console.error('Error:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);

  } finally {
    db.close();
  }
}

main();
