import type { FastifyInstance } from 'fastify';
import { getSyncStatus, getRecentSyncLogs } from '@spotify/shared';

export function registerSyncRoutes(app: FastifyInstance) {
  // GET /api/sync/status - Current sync status
  app.get('/api/sync/status', async () => {
    return getSyncStatus();
  });

  // GET /api/sync/progress - Real-time progress (for polling)
  app.get('/api/sync/progress', async () => {
    const status = await getSyncStatus();
    return {
      isRunning: status.isRunning,
      progress: status.currentProgress ?? null,
    };
  });

  // GET /api/sync/logs - Recent sync logs
  app.get('/api/sync/logs', async (request) => {
    const { limit = 10 } = request.query as { limit?: number };
    const logs = await getRecentSyncLogs(Number(limit));
    return { items: logs };
  });

  // POST /api/sync/trigger - Trigger sync (placeholder)
  app.post('/api/sync/trigger', async (_request, reply) => {
    // TODO: Implement sync trigger
    // This will call the sync worker or spawn a k8s job
    reply.code(501);
    return { error: 'Sync trigger not yet implemented' };
  });
}
