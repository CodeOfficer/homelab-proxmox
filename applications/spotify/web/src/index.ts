import express from 'express';
import path from 'path';
import { getDatabase, closeDatabase } from '@homelab/spotify-shared';
import { initiateAuth, handleCallback, logout } from './controllers/spotifyAuth';
import { showDashboard } from './controllers/dashboard';
import { triggerSync } from './controllers/syncTrigger';
import { testAudioFeaturesAccess } from './controllers/testAudioFeatures';
import { getSyncProgress } from './controllers/syncProgress';
import { showAllPlaylists } from './controllers/allPlaylists';
import { showPlaylistDetail } from './controllers/playlistDetail';
import { showArtistDetail } from './controllers/artistDetail';
import { showTrackDetail } from './controllers/trackDetail';
import { showSearchResults } from './controllers/search';

const app = express();
const PORT = process.env.PORT || 3000;

// Global error handlers - catch unhandled errors to prevent silent crashes
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  closeDatabase();
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing database...');
  closeDatabase();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, closing database...');
  closeDatabase();
  process.exit(0);
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Health check endpoint - verifies database is accessible
app.get('/health', (req, res) => {
  try {
    const db = getDatabase();
    // Simple query to verify DB is accessible
    const count = db.getPlaylistCount();
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'spotify-web',
      db: 'connected',
      playlists: count
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      service: 'spotify-web',
      db: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Test audio features API access
app.get('/test-audio-features', testAudioFeaturesAccess);

// OAuth routes
app.get('/auth/spotify', initiateAuth);
app.get('/auth/callback', handleCallback);
app.get('/auth/logout', logout);

// Dashboard
app.get('/', showDashboard);

// Sync trigger and progress
app.post('/sync/trigger', triggerSync);
app.get('/api/sync/progress', getSyncProgress);

// Drill-down pages
app.get('/playlists', showAllPlaylists);
app.get('/playlist/:id', showPlaylistDetail);
app.get('/artist/:id', showArtistDetail);
app.get('/track/:id', showTrackDetail);
app.get('/search', showSearchResults);

// Start server only if not in test mode
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Spotify Web UI listening on port ${PORT}`);
  });
}

export default app;
