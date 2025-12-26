import { Request, Response } from 'express';
import { getDatabase } from '@homelab/spotify-shared';

/**
 * Display dashboard with playlists and sync status
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

    // Render dashboard
    res.render('dashboard', {
      authenticated,
      playlists,
      recentSyncs,
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
