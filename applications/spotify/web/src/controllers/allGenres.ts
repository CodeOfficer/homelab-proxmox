import { Request, Response } from 'express';
import { getDatabase } from '@homelab/spotify-shared';

/**
 * Display all genres with counts
 */
export async function showAllGenres(req: Request, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = 100;
    const offset = (page - 1) * limit;

    const db = getDatabase();
    const genres = db.getAllGenres(limit, offset);
    const totalCount = db.getGenreCount();
    const totalPages = Math.ceil(totalCount / limit);
    const stats = db.getLibraryStats();

    res.render('genres', {
      genres,
      page,
      totalPages,
      totalCount,
      stats
    });
  } catch (error) {
    console.error('Error loading genres:', error);
    res.status(500).render('error', {
      message: 'Failed to load genres',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
