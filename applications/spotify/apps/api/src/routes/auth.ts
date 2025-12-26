import type { FastifyInstance } from 'fastify';
import { getCredentials, clearCredentials } from '@spotify/shared';

export function registerAuthRoutes(app: FastifyInstance) {
  // GET /api/auth/status - Check authentication status
  app.get('/api/auth/status', async () => {
    const creds = await getCredentials();
    return {
      authenticated: creds !== null,
      hasRefreshToken: creds?.refreshToken ? true : false,
    };
  });

  // GET /api/auth/spotify - Initiate OAuth (placeholder)
  app.get('/api/auth/spotify', async (_request, reply) => {
    // TODO: Implement OAuth flow
    // Redirect to Spotify authorization URL
    reply.code(501);
    return { error: 'OAuth not yet implemented' };
  });

  // GET /api/auth/callback - OAuth callback (placeholder)
  app.get('/api/auth/callback', async (_request, reply) => {
    // TODO: Handle OAuth callback
    reply.code(501);
    return { error: 'OAuth callback not yet implemented' };
  });

  // POST /api/auth/logout - Clear credentials
  app.post('/api/auth/logout', async () => {
    await clearCredentials();
    return { success: true };
  });
}
