// @spotify/api - Fastify JSON API
// Will be implemented in Phase 3

import Fastify from 'fastify';

const app = Fastify({ logger: true });

app.get('/health', async () => ({ status: 'ok' }));

const PORT = Number(process.env.API_PORT) || 3001;
const HOST = process.env.API_HOST || '127.0.0.1';

app.listen({ port: PORT, host: HOST }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
});
