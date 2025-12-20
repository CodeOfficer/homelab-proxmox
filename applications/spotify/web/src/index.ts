import express from 'express';
import path from 'path';
import { initiateAuth, handleCallback, logout } from './controllers/spotifyAuth';
import { showDashboard } from './controllers/dashboard';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'spotify-web'
  });
});

// OAuth routes
app.get('/auth/spotify', initiateAuth);
app.get('/auth/callback', handleCallback);
app.get('/auth/logout', logout);

// Dashboard
app.get('/', showDashboard);

// Sync trigger (stub for now)
app.post('/sync/trigger', async (req, res) => {
  try {
    // TODO: Create Kubernetes Job to run sync
    res.json({ status: 'Job created (stub - not implemented yet)' });
  } catch (error) {
    console.error('Error triggering sync:', error);
    res.status(500).json({ error: 'Failed to trigger sync' });
  }
});

// Start server only if not in test mode
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Spotify Web UI listening on port ${PORT}`);
  });
}

export default app;
