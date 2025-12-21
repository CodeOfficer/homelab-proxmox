import { Request, Response } from 'express';
import { SpotifyApi } from '@spotify/web-api-ts-sdk';

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || '';
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:3000/auth/callback';

const SCOPES = [
  'playlist-read-private',
  'playlist-read-collaborative',
  'user-read-recently-played',
  'user-top-read'
];

interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
  expires_in: number;
  refresh_token: string;
}

/**
 * Initiate Spotify OAuth flow
 * Redirects to Spotify authorization page
 */
export async function initiateAuth(req: Request, res: Response) {
  try {
    // Generate state for CSRF protection
    const state = generateRandomString(16);

    // Store state in session (for now, just pass it through - we'll validate in callback)
    const authUrl = `https://accounts.spotify.com/authorize?` +
      `response_type=code` +
      `&client_id=${encodeURIComponent(CLIENT_ID)}` +
      `&scope=${encodeURIComponent(SCOPES.join(' '))}` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&state=${encodeURIComponent(state)}`;

    res.redirect(authUrl);
  } catch (error) {
    console.error('Error initiating auth:', error);
    res.status(500).json({ error: 'Failed to initiate authentication' });
  }
}

/**
 * Handle OAuth callback from Spotify
 * Exchange authorization code for access/refresh tokens
 */
export async function handleCallback(req: Request, res: Response) {
  const { code, state, error } = req.query;

  if (error) {
    console.error('OAuth error:', error);
    return res.redirect('/?error=access_denied');
  }

  if (!code) {
    return res.redirect('/?error=missing_code');
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code as string,
        redirect_uri: REDIRECT_URI
      })
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token exchange failed:', errorData);
      return res.redirect('/?error=token_exchange_failed');
    }

    const tokens = await tokenResponse.json() as SpotifyTokenResponse;

    // Store tokens in database
    const { SpotifyDatabase } = await import('@homelab/spotify-shared');
    const db = new SpotifyDatabase(process.env.DATABASE_PATH || '/tmp/spotify.db');

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
    db.saveCredentials(
      tokens.access_token,
      tokens.refresh_token,
      expiresAt,
      tokens.scope
    );

    db.close();

    // Redirect to dashboard
    res.redirect('/?success=authenticated');
  } catch (error) {
    console.error('Error handling callback:', error);
    res.redirect('/?error=callback_failed');
  }
}

/**
 * Logout - clear credentials
 */
export async function logout(req: Request, res: Response) {
  try {
    const { SpotifyDatabase } = await import('@homelab/spotify-shared');
    const db = new SpotifyDatabase(process.env.DATABASE_PATH || '/tmp/spotify.db');

    db.deleteCredentials();
    db.close();

    res.redirect('/?success=logged_out');
  } catch (error) {
    console.error('Error logging out:', error);
    res.status(500).json({ error: 'Failed to logout' });
  }
}

/**
 * Generate random string for CSRF state
 */
function generateRandomString(length: number): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let text = '';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
