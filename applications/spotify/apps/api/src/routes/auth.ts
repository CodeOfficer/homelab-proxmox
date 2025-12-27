import type { FastifyInstance } from 'fastify';
import { getCredentials, clearCredentials, saveCredentials } from '@spotify/shared';

// OAuth scopes
const SCOPES = [
  'user-read-private',
  'user-read-email',
  'playlist-read-private',
  'playlist-read-collaborative',
  'user-library-read',
].join(' ');

export function registerAuthRoutes(app: FastifyInstance) {
  // GET /api/auth/status - Check authentication status
  app.get('/api/auth/status', async () => {
    const creds = await getCredentials();
    return {
      authenticated: creds !== null,
      hasRefreshToken: creds?.refreshToken ? true : false,
    };
  });

  // GET /api/auth/spotify - Initiate OAuth
  app.get('/api/auth/spotify', async (_request, reply) => {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI;

    if (!clientId) {
      reply.code(500);
      return { error: 'SPOTIFY_CLIENT_ID not configured' };
    }
    if (!redirectUri) {
      reply.code(500);
      return { error: 'SPOTIFY_REDIRECT_URI not configured' };
    }

    const state = Math.random().toString(36).substring(2, 15);
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      scope: SCOPES,
      redirect_uri: redirectUri,
      state,
    });

    const authUrl = `https://accounts.spotify.com/authorize?${params}`;
    reply.redirect(authUrl);
  });

  // GET /api/auth/callback - OAuth callback
  app.get<{
    Querystring: { code?: string; error?: string; state?: string };
  }>('/api/auth/callback', async (request, reply) => {
    const { code, error } = request.query;
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI;
    const appBaseUrl = process.env.APP_BASE_URL;

    if (error) {
      reply.code(400);
      return { error: `Authorization failed: ${error}` };
    }

    if (!code) {
      reply.code(400);
      return { error: 'No authorization code received' };
    }

    if (!redirectUri) {
      reply.code(500);
      return { error: 'SPOTIFY_REDIRECT_URI not configured' };
    }

    if (!appBaseUrl) {
      reply.code(500);
      return { error: 'APP_BASE_URL not configured' };
    }

    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      reply.code(500);
      return { error: 'Spotify credentials not configured' };
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      app.log.error({ errorText }, 'Token exchange failed');
      reply.code(400);
      return { error: 'Failed to exchange code for tokens' };
    }

    const tokens = (await tokenResponse.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
      scope: string;
    };

    // Calculate expiration timestamp
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    // Save credentials
    await saveCredentials({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt,
      scope: tokens.scope,
    });

    app.log.info('Spotify OAuth completed successfully');

    // Redirect to app base URL
    reply.redirect(appBaseUrl);
  });

  // POST /api/auth/logout - Clear credentials
  app.post('/api/auth/logout', async () => {
    await clearCredentials();
    return { success: true };
  });
}
