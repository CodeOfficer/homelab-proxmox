import { spawn, type ChildProcess } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { FastifyInstance } from 'fastify';
import { getSyncStatus, getRecentSyncLogs, getCredentials } from '@spotify/shared';

// Track running sync process
let syncProcess: ChildProcess | null = null;

export function registerSyncRoutes(app: FastifyInstance) {
  // GET /api/sync/status - Current sync status
  app.get('/api/sync/status', async () => {
    const status = await getSyncStatus();
    return {
      ...status,
      processRunning: syncProcess !== null && syncProcess.exitCode === null,
    };
  });

  // GET /api/sync/progress - Real-time progress (for polling)
  app.get('/api/sync/progress', async () => {
    const status = await getSyncStatus();
    return {
      isRunning: status.isRunning || (syncProcess !== null && syncProcess.exitCode === null),
      progress: status.currentProgress ?? null,
    };
  });

  // GET /api/sync/logs - Recent sync logs
  app.get('/api/sync/logs', async (request) => {
    const { limit = 10 } = request.query as { limit?: number };
    const logs = await getRecentSyncLogs(Number(limit));
    return { items: logs };
  });

  // POST /api/sync/trigger - Trigger sync
  app.post('/api/sync/trigger', async (_request, reply) => {
    // Check if already running
    if (syncProcess !== null && syncProcess.exitCode === null) {
      reply.code(409);
      return { error: 'Sync already in progress' };
    }

    // Check for credentials
    const creds = await getCredentials();
    if (!creds || !creds.refreshToken) {
      reply.code(401);
      return { error: 'Not authenticated. Please connect to Spotify first.' };
    }

    // Find sync worker path (relative to api app)
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const syncWorkerPath = resolve(__dirname, '../../../sync/dist/index.js');

    app.log.info({ syncWorkerPath }, 'Starting sync worker');

    // Spawn sync worker process
    syncProcess = spawn('node', [syncWorkerPath], {
      env: {
        ...process.env,
        SPOTIFY_DB_PATH: process.env.SPOTIFY_DB_PATH || './.local/spotify.db',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    // Log output
    syncProcess.stdout?.on('data', (data) => {
      app.log.info({ source: 'sync' }, data.toString().trim());
    });
    syncProcess.stderr?.on('data', (data) => {
      app.log.error({ source: 'sync' }, data.toString().trim());
    });

    syncProcess.on('close', (code) => {
      app.log.info({ exitCode: code }, 'Sync worker finished');
      syncProcess = null;
    });

    return { success: true, message: 'Sync started' };
  });
}
