import type { FastifyInstance } from 'fastify';
import { getAllArtists, getArtistWithTracks } from '@spotify/shared';

export function registerArtistRoutes(app: FastifyInstance) {
  // GET /api/artists - List artists
  app.get('/api/artists', async (request) => {
    const { page = 1, pageSize = 48, q } = request.query as {
      page?: number;
      pageSize?: number;
      q?: string;
    };
    return getAllArtists(Number(page), Number(pageSize), q);
  });

  // GET /api/artists/:id - Artist with tracks
  app.get('/api/artists/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const artist = await getArtistWithTracks(id);

    if (!artist) {
      reply.code(404);
      return { error: 'Artist not found' };
    }

    return artist;
  });
}
