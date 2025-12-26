import { Request, Response } from 'express';
import { getDatabase } from '@homelab/spotify-shared';

/**
 * Display artist detail with tracks
 */
export async function showArtistDetail(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = 50;
    const offset = (page - 1) * limit;

    const db = getDatabase();

    const artist = db.getArtistDetails(id);

    if (!artist) {
      return res.status(404).render('error', {
        message: 'Artist not found',
        error: `No artist with ID: ${id}`
      });
    }

    const tracks = db.getArtistTracks(id, limit, offset);
    const totalTracks = db.getArtistTrackCount(id);
    const totalPages = Math.ceil(totalTracks / limit);

    res.render('artist', {
      artist,
      tracks,
      page,
      totalPages,
      totalTracks
    });
  } catch (error) {
    console.error('Error loading artist detail:', error);
    res.status(500).render('error', {
      message: 'Failed to load artist',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
