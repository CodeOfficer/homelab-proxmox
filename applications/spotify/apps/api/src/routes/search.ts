import type { FastifyInstance } from 'fastify';
import { searchTracks } from '@spotify/shared';
import type { SearchFilters } from '@spotify/shared';

export function registerSearchRoutes(app: FastifyInstance) {
  // GET /api/search - Advanced search with filters
  app.get('/api/search', async (request) => {
    const query = request.query as Record<string, string | undefined>;

    const filters: SearchFilters = {
      query: query.q,
      tempoMin: query.tempoMin ? Number(query.tempoMin) : undefined,
      tempoMax: query.tempoMax ? Number(query.tempoMax) : undefined,
      energyMin: query.energyMin ? Number(query.energyMin) : undefined,
      energyMax: query.energyMax ? Number(query.energyMax) : undefined,
      danceabilityMin: query.danceabilityMin ? Number(query.danceabilityMin) : undefined,
      danceabilityMax: query.danceabilityMax ? Number(query.danceabilityMax) : undefined,
      valenceMin: query.valenceMin ? Number(query.valenceMin) : undefined,
      valenceMax: query.valenceMax ? Number(query.valenceMax) : undefined,
      popularityMin: query.popularityMin ? Number(query.popularityMin) : undefined,
      popularityMax: query.popularityMax ? Number(query.popularityMax) : undefined,
      durationMinMs: query.durationMinMs ? Number(query.durationMinMs) : undefined,
      durationMaxMs: query.durationMaxMs ? Number(query.durationMaxMs) : undefined,
      explicit: query.explicit === 'true' ? true : query.explicit === 'false' ? false : undefined,
    };

    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 50;

    return searchTracks(filters, page, pageSize);
  });
}
