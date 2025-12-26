import { Request, Response } from 'express';
import { getDatabase } from '@homelab/spotify-shared';

/**
 * Display album detail with tracks and artists
 */
export async function showAlbumDetail(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const albumData = db.getAlbumDetails(id);

    if (!albumData) {
      return res.status(404).render('error', {
        message: 'Album not found',
        error: `No album with ID: ${id}`
      });
    }

    res.render('album', {
      album: albumData.album,
      tracks: albumData.tracks,
      artists: albumData.artists,
      totalTracks: albumData.totalTracks
    });
  } catch (error) {
    console.error('Error loading album detail:', error);
    res.status(500).render('error', {
      message: 'Failed to load album',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
