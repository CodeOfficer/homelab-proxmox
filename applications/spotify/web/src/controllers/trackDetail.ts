import { Request, Response } from 'express';
import { getDatabase } from '@homelab/spotify-shared';

/**
 * Display track detail with audio features and artists
 */
export async function showTrackDetail(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const trackData = db.getTrackDetails(id);

    if (!trackData) {
      return res.status(404).render('error', {
        message: 'Track not found',
        error: `No track with ID: ${id}`
      });
    }

    res.render('track', {
      track: trackData,
      artists: trackData.artists,
      audioFeatures: trackData.audio_features || null
    });
  } catch (error) {
    console.error('Error loading track detail:', error);
    res.status(500).render('error', {
      message: 'Failed to load track',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
