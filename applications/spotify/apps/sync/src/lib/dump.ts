import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

/**
 * Save an API response to the JSONL dump file for later replay.
 * Only writes if SPOTIFY_SYNC_DUMP_PATH env var is set (local dev only).
 * In production, this is a no-op.
 */
export function dumpResponse(type: string, payload: unknown): void {
  const dumpPath = process.env.SPOTIFY_SYNC_DUMP_PATH;
  if (!dumpPath) return;

  try {
    mkdirSync(dirname(dumpPath), { recursive: true });
    const line = JSON.stringify({
      type,
      timestamp: new Date().toISOString(),
      payload,
    });
    appendFileSync(dumpPath, `${line}\n`);
  } catch (error) {
    console.warn('Failed to write sync dump:', error);
  }
}
