import { Request, Response } from 'express';
import { SpotifyApi } from '@spotify/web-api-ts-sdk';
import { SpotifyDatabase } from '@homelab/spotify-shared';

/**
 * Test if audio features API is accessible
 *
 * Spotify deprecated audio features for new apps on Nov 27, 2024.
 * This endpoint tests if the current app has access.
 *
 * Test track: "Bohemian Rhapsody" by Queen (3z8h0TU7ReDPLIbEnYhWZb)
 */
export async function testAudioFeaturesAccess(req: Request, res: Response) {
  try {
    const db = new SpotifyDatabase(process.env.DATABASE_PATH!);
    const credentials = db.getCredentials();
    db.close();

    if (!credentials || !credentials.access_token) {
      return res.status(401).json({
        available: false,
        error: 'Not authenticated. Please connect your Spotify account first.',
        needsAuth: true
      });
    }

    // Create Spotify API client
    const spotifyApi = SpotifyApi.withAccessToken(
      process.env.SPOTIFY_CLIENT_ID!,
      {
        access_token: credentials.access_token,
        refresh_token: credentials.refresh_token,
        expires_in: 3600,
        token_type: 'Bearer'
      }
    );

    // Test audio features endpoint with a known track
    const testTrackId = '3z8h0TU7ReDPLIbEnYhWZb'; // Bohemian Rhapsody

    console.log('Testing audio features API access...');
    const audioFeatures = await spotifyApi.tracks.audioFeatures(testTrackId);

    if (audioFeatures && audioFeatures.tempo) {
      console.log('✓ Audio features API is accessible');
      return res.json({
        available: true,
        message: 'Audio features API is accessible! Tempo, energy, danceability, and other features can be synced.',
        testData: {
          trackId: testTrackId,
          trackName: 'Bohemian Rhapsody',
          tempo: Math.round(audioFeatures.tempo),
          energy: audioFeatures.energy,
          danceability: audioFeatures.danceability,
          valence: audioFeatures.valence
        }
      });
    } else {
      console.warn('✗ Audio features API returned no data');
      return res.json({
        available: false,
        error: 'Audio features API returned no data',
        message: 'The API responded but did not return audio features. This app may not have extended quota mode access.'
      });
    }

  } catch (error: any) {
    console.error('Audio features API test failed:', error);

    // Check for specific error codes
    if (error.status === 403 || error.message?.includes('403')) {
      return res.json({
        available: false,
        error: 'Forbidden: Audio features API is not accessible for this app',
        message: 'Spotify deprecated audio features access on Nov 27, 2024 for apps without extended quota mode. ' +
                 'The PRO tool will still work with enhanced artist data (genres, popularity) and text search.',
        recommendation: 'Proceed with Phase 1B (without audio features)'
      });
    }

    if (error.status === 401 || error.message?.includes('401')) {
      return res.status(401).json({
        available: false,
        error: 'Unauthorized: Access token expired',
        message: 'Please re-authenticate via the web UI.',
        needsAuth: true
      });
    }

    // Generic error
    return res.status(500).json({
      available: false,
      error: error.message || 'Unknown error',
      message: 'Failed to test audio features API. Check server logs for details.'
    });
  }
}
