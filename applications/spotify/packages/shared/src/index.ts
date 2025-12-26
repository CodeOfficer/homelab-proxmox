// @spotify/shared - Shared library for Spotify Sync PRO
// Exports: DB client, schema, types

export {
  getDatabase,
  getSqlite,
  closeDatabase,
  initializeDatabase,
} from './db/client.js';

export * from './db/schema.js';
export * from './types/index.js';
