import { type FastifyInstance } from 'fastify';
import { initializeDatabase, closeDatabase } from '@spotify/shared';
import { buildApp } from '../index.js';

let app: FastifyInstance | null = null;

export async function getTestApp(): Promise<FastifyInstance> {
  if (!app) {
    initializeDatabase();
    app = await buildApp({ logger: false });
    await app.ready();
  }
  return app;
}

export async function closeTestApp(): Promise<void> {
  if (app) {
    await app.close();
    closeDatabase();
    app = null;
  }
}
