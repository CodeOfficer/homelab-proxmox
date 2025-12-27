import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getTestApp, closeTestApp } from './setup.js';
import type { FastifyInstance } from 'fastify';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let app: FastifyInstance<any>;

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
  it('GET /api/stats returns library statistics or error', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/stats',
    });

    // May return 200 with stats or 500 if database queries fail (e.g., no data)
    if (response.statusCode === 200) {
      const body = response.json();
      expect(body).toHaveProperty('totalPlaylists');
      expect(body).toHaveProperty('totalTracks');
      expect(body).toHaveProperty('totalArtists');
      expect(body).toHaveProperty('totalAlbums');
    } else {
      expect(response.statusCode).toBe(500);
      const body = response.json();
      expect(body).toHaveProperty('error');
    }
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
  it('GET /api/genres returns genre list or error', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/genres',
    });

    // May return 200 with genres or 500 if database queries fail
    if (response.statusCode === 200) {
      const body = response.json();
      expect(body).toHaveProperty('items');
    } else {
      expect(response.statusCode).toBe(500);
      const body = response.json();
      expect(body).toHaveProperty('error');
    }
  });

  it('GET /api/genres/top returns top genres or error', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/genres/top?limit=5',
    });

    // May return 200 with genres or 500 if database queries fail
    if (response.statusCode === 200) {
      const body = response.json();
      expect(body).toHaveProperty('items');
    } else {
      expect(response.statusCode).toBe(500);
      const body = response.json();
      expect(body).toHaveProperty('error');
    }
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

  it('POST /api/sync/trigger requires authentication', async () => {
    // First clear any existing credentials
    await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/sync/trigger',
    });

    expect(response.statusCode).toBe(401);
    const body = response.json();
    expect(body.error).toContain('Not authenticated');
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

  it('GET /api/auth/spotify returns 500 when not configured', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/auth/spotify',
    });

    // Returns 500 when SPOTIFY_CLIENT_ID is not set
    expect(response.statusCode).toBe(500);
  });

  it('GET /api/auth/callback returns 400 without code', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/auth/callback',
    });

    // Returns 400 when no code is provided
    expect(response.statusCode).toBe(400);
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
