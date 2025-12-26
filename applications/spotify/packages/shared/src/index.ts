// @spotify/shared - Shared library for Spotify Sync PRO
// Exports: DB client, schema, types, queries

export {
  getDatabase,
  getSqlite,
  closeDatabase,
  initializeDatabase,
} from './db/client.js';

export * from './db/schema.js';
export * from './types/index.js';
export * from './queries/index.js';
