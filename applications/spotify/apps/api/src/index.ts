import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import fastifyStatic from '@fastify/static';
import { initializeDatabase, closeDatabase } from '@spotify/shared';

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface BuildAppOptions {
  logger?: boolean;
  https?: { key: Buffer; cert: Buffer };
}

// Build app with all routes registered (used for testing)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance<any>> {
  // Use type assertion to handle both HTTP and HTTPS server types
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const app = Fastify({
    logger: options.logger ?? false,
    https: options.https,
  } as any) as FastifyInstance<any>;

  const isDev = process.env.NODE_ENV !== 'production';
  const appBaseUrl = process.env.APP_BASE_URL;

  // CORS configuration
  const corsOrigins: string[] = [];
  if (isDev) {
    corsOrigins.push('http://localhost:5173', 'http://127.0.0.1:5173');
  }
  if (appBaseUrl) {
    corsOrigins.push(appBaseUrl);
  }

  if (corsOrigins.length > 0) {
    await app.register(cors, {
      origin: corsOrigins,
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

  // Cast to any to bypass strict server type checking (works with both HTTP and HTTPS)
  const appAny = app as any;
  registerStatsRoutes(appAny);
  registerPlaylistRoutes(appAny);
  registerTrackRoutes(appAny);
  registerArtistRoutes(appAny);
  registerAlbumRoutes(appAny);
  registerGenreRoutes(appAny);
  registerSearchRoutes(appAny);
  registerSyncRoutes(appAny);
  registerAuthRoutes(appAny);

  // Serve SvelteKit static files (built UI)
  // Path: apps/api/src -> apps/ui/build (3 levels up, then into ui/build)
  const uiBuildPath = join(__dirname, '..', '..', 'ui', 'build');

  if (existsSync(uiBuildPath)) {
    await app.register(fastifyStatic, {
      root: uiBuildPath,
      prefix: '/',
      decorateReply: false, // Don't conflict with other static handlers
    });

    // SPA fallback: serve index.html for non-API routes only
    app.setNotFoundHandler(async (request, reply) => {
      // API routes should return JSON 404, not HTML
      if (request.url.startsWith('/api/')) {
        reply.code(404);
        return { error: 'Not found' };
      }

      const indexPath = join(uiBuildPath, 'index.html');
      if (existsSync(indexPath)) {
        reply.type('text/html');
        return reply.send(readFileSync(indexPath));
      }
      reply.code(404);
      return { error: 'Not found' };
    });

    app.log.info(`Serving static files from ${uiBuildPath}`);
  } else {
    app.log.warn(`UI build not found at ${uiBuildPath} - run 'pnpm build --filter @spotify/ui' first`);
  }

  return app;
}

// Start server (entry point)
async function start() {
  const PORT = Number(process.env.PORT) || 3000;
  const HOST = process.env.HOST || '127.0.0.1';
  const httpsKeyPath = process.env.HTTPS_KEY_PATH;
  const httpsCertPath = process.env.HTTPS_CERT_PATH;

  // Initialize database
  console.log('Initializing database...');
  initializeDatabase();

  // Load HTTPS certs if provided
  let httpsOptions: { key: Buffer; cert: Buffer } | undefined;
  if (httpsKeyPath && httpsCertPath) {
    httpsOptions = {
      key: readFileSync(httpsKeyPath),
      cert: readFileSync(httpsCertPath),
    };
  }

  const app = await buildApp({
    logger: true,
    https: httpsOptions,
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

  const protocol = httpsOptions ? 'https' : 'http';

  try {
    await app.listen({ port: PORT, host: HOST });
    app.log.info(`API server running at ${protocol}://${HOST}:${PORT}`);
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
