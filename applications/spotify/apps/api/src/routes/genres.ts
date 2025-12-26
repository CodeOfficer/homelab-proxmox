import type { FastifyInstance } from 'fastify';
import { getAllGenres, getTopGenres } from '@spotify/shared';

export function registerGenreRoutes(app: FastifyInstance) {
  // GET /api/genres - List all genres
  app.get('/api/genres', async (request) => {
    const { q } = request.query as { q?: string };
    const genres = await getAllGenres(q);
    return { items: genres };
  });

  // GET /api/genres/top - Top genres by track count
  app.get('/api/genres/top', async (request) => {
    const { limit = 10 } = request.query as { limit?: number };
    const genres = await getTopGenres(Number(limit));
    return { items: genres };
  });
}
