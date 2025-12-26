import type { FastifyInstance } from 'fastify';
import { getAlbumWithTracks } from '@spotify/shared';

export function registerAlbumRoutes(app: FastifyInstance) {
  // GET /api/albums/:id - Album with tracks
  app.get('/api/albums/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const album = await getAlbumWithTracks(id);

    if (!album) {
      reply.code(404);
      return { error: 'Album not found' };
    }

    return album;
  });
}
