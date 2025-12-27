import { readFileSync } from 'node:fs';
import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import { initializeDatabase, closeDatabase } from '@spotify/shared';

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

  // Root route - simple landing page
  app.get('/', async (_request, reply) => {
    const { getCredentials, getLibraryStats } = await import('@spotify/shared');
    const creds = await getCredentials();
    const stats = await getLibraryStats();
    const authenticated = creds !== null;

    reply.type('text/html');
    return `<!DOCTYPE html>
<html>
<head>
  <title>Spotify Sync PRO</title>
  <style>
    body { font-family: system-ui; max-width: 600px; margin: 40px auto; padding: 20px; }
    h1 { color: #1DB954; }
    .status { padding: 10px; border-radius: 4px; margin: 10px 0; }
    .ok { background: #d4edda; color: #155724; }
    .warn { background: #fff3cd; color: #856404; }
    a { color: #1DB954; }
    pre { background: #f4f4f4; padding: 10px; overflow-x: auto; }
  </style>
</head>
<body>
  <h1>Spotify Sync PRO</h1>
  <div class="status ${authenticated ? 'ok' : 'warn'}">
    ${authenticated ? 'Authenticated with Spotify' : 'Not authenticated - <a href="/auth/spotify">Connect to Spotify</a>'}
  </div>
  <h2>Stats</h2>
  <pre>${JSON.stringify(stats, null, 2)}</pre>
  <h2>Actions</h2>
  <ul>
    ${authenticated ? '<li><a href="/api/sync/trigger" onclick="fetch(this.href,{method:\'POST\'}).then(r=>r.json()).then(d=>alert(JSON.stringify(d)));return false;">Trigger Sync</a></li>' : ''}
    ${authenticated ? '<li><a href="/auth/logout" onclick="fetch(this.href,{method:\'POST\'}).then(()=>location.reload());return false;">Logout</a></li>' : ''}
    <li><a href="/api/stats">API: Stats</a></li>
    <li><a href="/api/playlists">API: Playlists</a></li>
    <li><a href="/health">Health Check</a></li>
  </ul>
</body>
</html>`;
  });

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
