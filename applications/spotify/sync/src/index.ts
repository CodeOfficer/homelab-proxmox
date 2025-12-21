import { SpotifyDatabase } from '@homelab/spotify-shared';
import { syncPlaylists } from './syncPlaylists';

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

  const db = new SpotifyDatabase(dbPath);

  try {
    console.log('Starting Spotify playlist sync...');
    console.log(`Time: ${new Date().toISOString()}`);

    await syncPlaylists(db);

    console.log('Sync completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('Sync failed:', error);
    process.exit(1);

  } finally {
    db.close();
  }
}

main();
