import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import { initializeDatabase, closeDatabase } from '@spotify/shared';

// Create Fastify instance
const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
});

// Configuration
const PORT = Number(process.env.API_PORT) || 3001;
const HOST = process.env.API_HOST || '127.0.0.1';
const isDev = process.env.NODE_ENV !== 'production';

// Register plugins
async function registerPlugins() {
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
}

// Health check
app.get('/health', async () => ({
  status: 'ok',
  timestamp: new Date().toISOString(),
}));

// Register API routes
async function registerRoutes() {
  // Import and register route modules
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
}

// Graceful shutdown
async function shutdown() {
  app.log.info('Shutting down...');
  await app.close();
  closeDatabase();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start server
async function start() {
  try {
    // Initialize database
    app.log.info('Initializing database...');
    initializeDatabase();

    // Register plugins and routes
    await registerPlugins();
    await registerRoutes();

    // Start listening
    await app.listen({ port: PORT, host: HOST });
    app.log.info(`API server running at http://${HOST}:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();

export { app };
