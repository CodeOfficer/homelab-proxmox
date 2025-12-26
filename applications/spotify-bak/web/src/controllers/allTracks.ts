import { Request, Response } from 'express';
import { getDatabase } from '@homelab/spotify-shared';

/**
 * Display all tracks with pagination
 */
export async function showAllTracks(req: Request, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const query = (req.query.q as string) || '';
    const limit = 50;
    const offset = (page - 1) * limit;

    const db = getDatabase();
    const tracks = db.getTracksPage(query, limit, offset);
    const totalCount = db.getTrackCountFiltered(query);
    const totalPages = Math.ceil(totalCount / limit);
    const stats = db.getLibraryStats();

    res.render('tracks', {
      tracks,
      page,
      totalPages,
      totalCount,
      stats,
      query
    });
  } catch (error) {
    console.error('Error loading all tracks:', error);
    res.status(500).render('error', {
      message: 'Failed to load tracks',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
