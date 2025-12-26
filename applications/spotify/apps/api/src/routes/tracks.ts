import type { FastifyInstance } from 'fastify';
import { getAllTracks, getTrackById } from '@spotify/shared';

export function registerTrackRoutes(app: FastifyInstance) {
  // GET /api/tracks - List tracks
  app.get('/api/tracks', async (request) => {
    const { page = 1, pageSize = 50, q } = request.query as {
      page?: number;
      pageSize?: number;
      q?: string;
    };
    return getAllTracks(Number(page), Number(pageSize), q);
  });

  // GET /api/tracks/:id - Track detail
  app.get('/api/tracks/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const track = await getTrackById(id);

    if (!track) {
      reply.code(404);
      return { error: 'Track not found' };
    }

    return track;
  });
}
