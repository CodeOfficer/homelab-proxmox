import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import { initializeDatabase, closeDatabase } from '@spotify/shared';

export interface BuildAppOptions {
  logger?: boolean;
}

// Build app with all routes registered (used for testing)
export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger: options.logger ?? false,
  });

  const isDev = process.env.NODE_ENV !== 'production';

  // CORS for development
  if (isDev) {
    await app.register(cors, {
      origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
      credentials: true,
    });
  }

  // Cookies for session management
  await app.register(cookie, {
    secret: process.env.COOKIE_SECRET || 'spotify-sync-dev-secret-change-in-prod',
    parseOptions: {},
  });

  // Health check
  app.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
  }));

  // Register route modules
  const { registerStatsRoutes } = await import('./routes/stats.js');
  const { registerPlaylistRoutes } = await import('./routes/playlists.js');
  const { registerTrackRoutes } = await import('./routes/tracks.js');
  const { registerArtistRoutes } = await import('./routes/artists.js');
  const { registerAlbumRoutes } = await import('./routes/albums.js');
  const { registerGenreRoutes } = await import('./routes/genres.js');
  const { registerSearchRoutes } = await import('./routes/search.js');
  const { registerSyncRoutes } = await import('./routes/sync.js');
  const { registerAuthRoutes } = await import('./routes/auth.js');

  registerStatsRoutes(app);
  registerPlaylistRoutes(app);
  registerTrackRoutes(app);
  registerArtistRoutes(app);
  registerAlbumRoutes(app);
  registerGenreRoutes(app);
  registerSearchRoutes(app);
  registerSyncRoutes(app);
  registerAuthRoutes(app);

  return app;
}

// Start server (entry point)
async function start() {
  const PORT = Number(process.env.API_PORT) || 3001;
  const HOST = process.env.API_HOST || '127.0.0.1';

  // Initialize database
  console.log('Initializing database...');
  initializeDatabase();

  const app = await buildApp({
    logger: true,
  });

  // Graceful shutdown
  async function shutdown() {
    app.log.info('Shutting down...');
    await app.close();
    closeDatabase();
    process.exit(0);
  }

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  try {
    await app.listen({ port: PORT, host: HOST });
    app.log.info(`API server running at http://${HOST}:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

// Only start when run directly (not imported)
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  start();
}
