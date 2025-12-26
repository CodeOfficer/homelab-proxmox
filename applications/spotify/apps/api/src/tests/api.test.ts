import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getTestApp, closeTestApp } from './setup.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;

beforeAll(async () => {
  app = await getTestApp();
});

afterAll(async () => {
  await closeTestApp();
});

describe('Health endpoint', () => {
  it('GET /health returns ok status', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.status).toBe('ok');
    expect(body.timestamp).toBeDefined();
  });
});

describe('Stats endpoints', () => {
  it('GET /api/stats returns library statistics', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/stats',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toHaveProperty('totalPlaylists');
    expect(body).toHaveProperty('totalTracks');
    expect(body).toHaveProperty('totalArtists');
    expect(body).toHaveProperty('totalAlbums');
  });

  it('GET /api/stats/popular returns popular tracks', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/stats/popular?limit=5',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toHaveProperty('items');
    expect(Array.isArray(body.items)).toBe(true);
  });
});

describe('Playlist endpoints', () => {
  it('GET /api/playlists returns paginated list', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/playlists',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toHaveProperty('items');
    expect(body).toHaveProperty('total');
    expect(body).toHaveProperty('page');
    expect(body).toHaveProperty('pageSize');
  });

  it('GET /api/playlists/:id returns 404 for missing playlist', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/playlists/nonexistent-id',
    });

    expect(response.statusCode).toBe(404);
    const body = response.json();
    expect(body.error).toBe('Playlist not found');
  });
});

describe('Track endpoints', () => {
  it('GET /api/tracks returns paginated list', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/tracks',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toHaveProperty('items');
    expect(body).toHaveProperty('total');
  });

  it('GET /api/tracks/:id returns 404 for missing track', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/tracks/nonexistent-id',
    });

    expect(response.statusCode).toBe(404);
    const body = response.json();
    expect(body.error).toBe('Track not found');
  });
});

describe('Artist endpoints', () => {
  it('GET /api/artists returns paginated list', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/artists',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toHaveProperty('items');
    expect(body).toHaveProperty('total');
  });

  it('GET /api/artists/:id returns 404 for missing artist', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/artists/nonexistent-id',
    });

    expect(response.statusCode).toBe(404);
    const body = response.json();
    expect(body.error).toBe('Artist not found');
  });
});

describe('Album endpoints', () => {
  it('GET /api/albums/:id returns 404 for missing album', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/albums/nonexistent-id',
    });

    expect(response.statusCode).toBe(404);
    const body = response.json();
    expect(body.error).toBe('Album not found');
  });
});

describe('Genre endpoints', () => {
  it('GET /api/genres returns genre list', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/genres',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toHaveProperty('items');
  });

  it('GET /api/genres/top returns top genres', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/genres/top?limit=5',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toHaveProperty('items');
  });
});

describe('Search endpoints', () => {
  it('GET /api/search returns search results', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/search?q=test',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toHaveProperty('items');
    expect(body).toHaveProperty('total');
  });

  it('GET /api/search with filters works', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/search?tempoMin=100&tempoMax=140&energyMin=0.5',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toHaveProperty('items');
  });
});

describe('Sync endpoints', () => {
  it('GET /api/sync/status returns sync status', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/sync/status',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toHaveProperty('isRunning');
  });

  it('GET /api/sync/progress returns progress info', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/sync/progress',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toHaveProperty('isRunning');
    expect(body).toHaveProperty('progress');
  });

  it('GET /api/sync/logs returns log entries', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/sync/logs?limit=5',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toHaveProperty('items');
  });

  it('POST /api/sync/trigger returns 501 (not implemented)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/sync/trigger',
    });

    expect(response.statusCode).toBe(501);
    const body = response.json();
    expect(body.error).toContain('not yet implemented');
  });
});

describe('Auth endpoints', () => {
  it('GET /api/auth/status returns auth status', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/auth/status',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toHaveProperty('authenticated');
    expect(body).toHaveProperty('hasRefreshToken');
  });

  it('GET /api/auth/spotify returns 501 (not implemented)', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/auth/spotify',
    });

    expect(response.statusCode).toBe(501);
  });

  it('GET /api/auth/callback returns 501 (not implemented)', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/auth/callback',
    });

    expect(response.statusCode).toBe(501);
  });

  it('POST /api/auth/logout clears credentials', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.success).toBe(true);
  });
});
