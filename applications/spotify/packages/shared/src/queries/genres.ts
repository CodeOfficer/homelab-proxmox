import { getSqlite } from '../db/client.js';
import type { GenreStats } from '../types/index.js';

/**
 * Get all genres with track counts
 * Genres are stored as JSON arrays in artists.genres
 */
export async function getAllGenres(query?: string): Promise<GenreStats[]> {
  const sqlite = getSqlite();

  // Use raw SQL for JSON extraction
  const sql = `
    WITH genre_list AS (
      SELECT json_each.value as genre
      FROM artists, json_each(genres)
      WHERE genres IS NOT NULL AND genres != '[]'
    )
    SELECT genre, COUNT(*) as count
    FROM genre_list
    ${query ? `WHERE LOWER(genre) LIKE '%' || LOWER(?) || '%'` : ''}
    GROUP BY genre
    ORDER BY count DESC
    LIMIT 100
  `;

  const result = query
    ? sqlite.prepare(sql).all(query) as Array<{ genre: string; count: number }>
    : sqlite.prepare(sql).all() as Array<{ genre: string; count: number }>;

  return result;
}

/**
 * Get tracks by genre
 * Returns track IDs for a given genre
 */
export async function getTrackIdsByGenre(genre: string): Promise<string[]> {
  const sqlite = getSqlite();

  const sql = `
    SELECT DISTINCT ta.track_id
    FROM track_artists ta
    JOIN artists a ON ta.artist_id = a.id
    WHERE a.genres LIKE '%' || ? || '%'
    LIMIT 500
  `;

  const result = sqlite.prepare(sql).all(genre) as Array<{ track_id: string }>;
  return result.map((r) => r.track_id);
}

/**
 * Get top genres by track count
 */
export async function getTopGenres(limit = 10): Promise<GenreStats[]> {
  const sqlite = getSqlite();

  const sql = `
    WITH genre_list AS (
      SELECT json_each.value as genre, ta.track_id
      FROM artists a
      JOIN track_artists ta ON a.id = ta.artist_id
      JOIN json_each(a.genres)
      WHERE a.genres IS NOT NULL AND a.genres != '[]'
    )
    SELECT genre, COUNT(DISTINCT track_id) as count
    FROM genre_list
    GROUP BY genre
    ORDER BY count DESC
    LIMIT ?
  `;

  const result = sqlite.prepare(sql).all(limit) as Array<{ genre: string; count: number }>;
  return result;
}
