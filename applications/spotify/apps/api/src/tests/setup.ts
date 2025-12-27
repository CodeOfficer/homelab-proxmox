import { type FastifyInstance } from 'fastify';
import { initializeDatabase, closeDatabase } from '@spotify/shared';
import { buildApp } from '../index.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let app: FastifyInstance<any> | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getTestApp(): Promise<FastifyInstance<any>> {
  if (!app) {
    initializeDatabase();
    app = await buildApp({ logger: false });
    await app.ready();
  }
  return app!;
}

export async function closeTestApp(): Promise<void> {
  if (app) {
    await app.close();
    closeDatabase();
    app = null;
  }
}
