import { Request, Response } from 'express';
import { getDatabase } from '@homelab/spotify-shared';

/**
 * Display all artists with pagination
 */
export async function showAllArtists(req: Request, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = 48;
    const offset = (page - 1) * limit;

    const db = getDatabase();
    const artists = db.getAllArtists(limit, offset);
    const totalCount = db.getArtistCount();
    const totalPages = Math.ceil(totalCount / limit);
    const stats = db.getLibraryStats();

    res.render('artists', {
      artists,
      page,
      totalPages,
      totalCount,
      stats
    });
  } catch (error) {
    console.error('Error loading all artists:', error);
    res.status(500).render('error', {
      message: 'Failed to load artists',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
