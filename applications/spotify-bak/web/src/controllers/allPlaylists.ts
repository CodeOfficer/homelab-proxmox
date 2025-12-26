import { Request, Response } from 'express';
import { getDatabase } from '@homelab/spotify-shared';

/**
 * Display all playlists with pagination
 */
export async function showAllPlaylists(req: Request, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const query = (req.query.q as string) || '';
    const limit = 50;
    const offset = (page - 1) * limit;

    const db = getDatabase();

    const playlists = db.getPlaylistsPage(query, limit, offset);
    const totalCount = db.getPlaylistCountFiltered(query);
    const totalPages = Math.ceil(totalCount / limit);
    const stats = db.getLibraryStats();

    res.render('playlists', {
      playlists,
      page,
      totalPages,
      totalCount,
      stats,
      query
    });
  } catch (error) {
    console.error('Error loading all playlists:', error);
    res.status(500).render('error', {
      message: 'Failed to load playlists',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
