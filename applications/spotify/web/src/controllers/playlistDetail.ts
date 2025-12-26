import { Request, Response } from 'express';
import { getDatabase } from '@homelab/spotify-shared';

/**
 * Display playlist detail with tracks
 */
export async function showPlaylistDetail(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = 50;
    const offset = (page - 1) * limit;

    const db = getDatabase();

    // Get playlist with tracks (includes audio features)
    const playlistData = db.getPlaylistWithTracks(id, limit, offset);

    if (!playlistData) {
      return res.status(404).render('error', {
        message: 'Playlist not found',
        error: `No playlist with ID: ${id}`
      });
    }

    // Count total tracks in playlist
    const totalTracks = db.getPlaylistTrackCount(id);
    const totalPages = Math.ceil(totalTracks / limit);

    res.render('playlist', {
      playlist: playlistData,
      tracks: playlistData.tracks,
      page,
      totalPages,
      totalTracks
    });
  } catch (error) {
    console.error('Error loading playlist detail:', error);
    res.status(500).render('error', {
      message: 'Failed to load playlist',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
