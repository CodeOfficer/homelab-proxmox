import { Request, Response } from 'express';
import { getDatabase } from '@homelab/spotify-shared';

/**
 * Display all playlists with pagination
 */
export async function showAllPlaylists(req: Request, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = 50;
    const offset = (page - 1) * limit;

    const db = getDatabase();

    const playlists = db.getAllPlaylists(limit, offset);
    const totalCount = db.getPlaylistCount();
    const totalPages = Math.ceil(totalCount / limit);

    res.render('playlists', {
      playlists,
      page,
      totalPages,
      totalCount
    });
  } catch (error) {
    console.error('Error loading all playlists:', error);
    res.status(500).render('error', {
      message: 'Failed to load playlists',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
