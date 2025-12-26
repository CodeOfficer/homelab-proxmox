import { SpotifyDatabase } from './database';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

/**
 * Database singleton module
 *
 * Provides a single shared database connection across all requests.
 * This prevents WAL lock contention that occurs when creating
 * multiple connections under concurrent load.
 */

let instance: SpotifyDatabase | null = null;

/**
 * Get the shared database instance.
 * Initializes on first call, returns existing instance thereafter.
 */
export function getDatabase(): SpotifyDatabase {
  if (!instance) {
    // Default to /data in production, /tmp for local dev/test
    let dbPath = process.env.DATABASE_PATH || '/data/spotify.db';

    // Ensure directory exists (for local dev/test)
    const dir = dirname(dbPath);
    if (!existsSync(dir)) {
      // Fall back to /tmp for local development/testing
      dbPath = '/tmp/spotify.db';
      console.log(`Directory ${dir} not found, using fallback: ${dbPath}`);
    }

    console.log(`Initializing database singleton at: ${dbPath}`);
    instance = new SpotifyDatabase(dbPath);
  }
  return instance;
}

/**
 * Close the database connection.
 * Call this during graceful shutdown.
 */
export function closeDatabase(): void {
  if (instance) {
    console.log('Closing database connection...');
    instance.close();
    instance = null;
  }
}

/**
 * Check if database is initialized.
 */
export function isDatabaseInitialized(): boolean {
  return instance !== null;
}
