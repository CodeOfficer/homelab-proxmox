import { initializeDatabase } from '@spotify/shared';
import { syncPlaylists } from './phases/playlists.js';
import { syncArtistDetails } from './phases/artists.js';

/**
 * Main sync orchestrator - runs 2-phase sync with progress tracking
 *
 * Phase 1: Playlists + Tracks (core data)
 * Phase 2: Artist enrichment (genres, popularity, images)
 */
async function main() {
  // Validate required environment variables
  const requiredVars = ['SPOTIFY_CLIENT_ID', 'SPOTIFY_CLIENT_SECRET'];
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      console.error('ERROR: Missing required environment variable:', varName);
      process.exit(1);
    }
  }

  // Need either SPOTIFY_DB_PATH or DATABASE_PATH
  if (!process.env.SPOTIFY_DB_PATH && !process.env.DATABASE_PATH) {
    console.error('ERROR: Missing required environment variable: SPOTIFY_DB_PATH');
    process.exit(1);
  }

  const dbPath = process.env.SPOTIFY_DB_PATH || process.env.DATABASE_PATH;
  console.log('Opening database:', dbPath);
  console.log('Time:', new Date().toISOString());
  console.log('');

  // Set env var if DATABASE_PATH was used (for backwards compatibility)
  if (process.env.DATABASE_PATH && !process.env.SPOTIFY_DB_PATH) {
    process.env.SPOTIFY_DB_PATH = process.env.DATABASE_PATH;
  }

  // Initialize database
  initializeDatabase();

  try {
    console.log('============================================================');
    console.log('  Spotify PRO Sync - Complete Data Sync');
    console.log('============================================================');
    console.log('');

    // Phase 1: Sync playlists and tracks
    console.log('Phase 1: Syncing playlists and tracks...');
    const syncLogId = await syncPlaylists();
    console.log('');

    if (!syncLogId) {
      throw new Error('No sync log created - phase 1 failed');
    }

    // Phase 2: Enrich artist data (genres, popularity, images)
    console.log('Phase 2: Enriching artist data...');
    const artistResult = await syncArtistDetails(syncLogId);
    console.log('');

    // Summary
    console.log('============================================================');
    console.log('  Sync Summary');
    console.log('============================================================');
    console.log('  Artists enriched:', artistResult.processed, '(' + artistResult.failed + ' failed)');
    console.log('');
    console.log('Sync completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('');
    console.error('============================================================');
    console.error('  Sync Failed');
    console.error('============================================================');
    console.error('Error:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

main();
