import type { FastifyInstance } from 'fastify';
import { getAllGenres, getTopGenres } from '@spotify/shared';

export function registerGenreRoutes(app: FastifyInstance) {
  // GET /api/genres - List all genres
  app.get('/api/genres', async (request, reply) => {
    try {
      const { q } = request.query as { q?: string };
      const genres = await getAllGenres(q);
      return { items: genres };
    } catch (error) {
      app.log.error({ error }, 'Failed to get genres');
      reply.code(500);
      return { error: 'Failed to get genres' };
    }
  });

  // GET /api/genres/top - Top genres by track count
  app.get('/api/genres/top', async (request, reply) => {
    try {
      const { limit = 10 } = request.query as { limit?: number };
      const genres = await getTopGenres(Number(limit));
      return { items: genres };
    } catch (error) {
      app.log.error({ error }, 'Failed to get top genres');
      reply.code(500);
      return { error: 'Failed to get top genres' };
    }
  });
}
