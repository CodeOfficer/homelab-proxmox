import { Request, Response } from 'express';
import { getDatabase } from '@homelab/spotify-shared';

/**
 * Display dashboard with playlists, sync status, and library stats
 */
export async function showDashboard(req: Request, res: Response) {
  try {
    const db = getDatabase();

    // Check if authenticated
    const credentials = db.getCredentials();
    const authenticated = !!credentials;

    // Get playlists (if authenticated)
    const playlists = authenticated ? db.getPlaylists(50) : [];

    // Get recent syncs
    const recentSyncs = authenticated ? db.getRecentSyncs(5) : [];

    // Get library stats (always fetch, will be 0 if no data)
    const stats = db.getLibraryStats();
    const topGenres = db.getTopGenres(8);
    const popularTracks = db.getMostPopularTracks(5);
    const totalDuration = db.getTotalDuration();
    const lastSync = db.getLastSyncTime();

    // Format total duration
    const totalHours = Math.floor(totalDuration / (1000 * 60 * 60));
    const totalMinutes = Math.floor((totalDuration % (1000 * 60 * 60)) / (1000 * 60));

    // Render dashboard
    res.render('dashboard', {
      authenticated,
      playlists,
      recentSyncs,
      stats,
      topGenres,
      popularTracks,
      totalDuration: { hours: totalHours, minutes: totalMinutes },
      lastSync,
      error: req.query.error || null,
      success: req.query.success || null
    });
  } catch (error) {
    console.error('Error loading dashboard:', error);
    res.status(500).render('error', {
      message: 'Failed to load dashboard',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
