import type { FastifyInstance } from 'fastify';
import { getAllPlaylists, getPlaylistWithTracks } from '@spotify/shared';

export function registerPlaylistRoutes(app: FastifyInstance) {
  // GET /api/playlists - List playlists
  app.get('/api/playlists', async (request) => {
    const { page = 1, pageSize = 50, q } = request.query as {
      page?: number;
      pageSize?: number;
      q?: string;
    };
    return getAllPlaylists(Number(page), Number(pageSize), q);
  });

  // GET /api/playlists/:id - Playlist with tracks
  app.get('/api/playlists/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const playlist = await getPlaylistWithTracks(id);

    if (!playlist) {
      reply.code(404);
      return { error: 'Playlist not found' };
    }

    return playlist;
  });
}
