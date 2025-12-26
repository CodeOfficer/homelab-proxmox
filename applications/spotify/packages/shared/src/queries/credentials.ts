import { eq } from 'drizzle-orm';
import { getDatabase } from '../db/client.js';
import { spotifyCredentials } from '../db/schema.js';
import type { SpotifyCredentials, NewSpotifyCredentials } from '../types/index.js';

/**
 * Get Spotify OAuth credentials
 * Note: refresh_token is encrypted
 */
export async function getCredentials(): Promise<SpotifyCredentials | null> {
  const db = getDatabase();
  const result = await db
    .select()
    .from(spotifyCredentials)
    .where(eq(spotifyCredentials.id, 1))
    .limit(1);
  return result[0] ?? null;
}

/**
 * Save or update Spotify OAuth credentials
 * Note: refresh_token should already be encrypted
 */
export async function saveCredentials(data: NewSpotifyCredentials): Promise<void> {
  const db = getDatabase();

  await db
    .insert(spotifyCredentials)
    .values({
      id: 1,
      ...data,
    })
    .onConflictDoUpdate({
      target: spotifyCredentials.id,
      set: {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: data.expiresAt,
        scope: data.scope,
      },
    });
}

/**
 * Clear credentials (logout)
 */
export async function clearCredentials(): Promise<void> {
  const db = getDatabase();
  await db.delete(spotifyCredentials).where(eq(spotifyCredentials.id, 1));
}

/**
 * Update access token only (after refresh)
 */
export async function updateAccessToken(
  accessToken: string,
  expiresAt: string
): Promise<void> {
  const db = getDatabase();
  await db
    .update(spotifyCredentials)
    .set({ accessToken, expiresAt })
    .where(eq(spotifyCredentials.id, 1));
}
