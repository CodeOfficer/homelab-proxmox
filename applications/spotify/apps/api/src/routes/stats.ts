import type { FastifyInstance } from 'fastify';
import { getLibraryStats, getPopularTracks } from '@spotify/shared';

export function registerStatsRoutes(app: FastifyInstance) {
  // GET /api/stats - Library statistics
  app.get('/api/stats', async () => {
    const stats = await getLibraryStats();
    return stats;
  });

  // GET /api/stats/popular - Popular tracks
  app.get('/api/stats/popular', async (request) => {
    const { limit = 20 } = request.query as { limit?: number };
    const tracks = await getPopularTracks(Number(limit));
    return { items: tracks };
  });
}
