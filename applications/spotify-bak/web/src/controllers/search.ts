import { Request, Response } from 'express';
import { getDatabase } from '@homelab/spotify-shared';

/**
 * Display search results
 */
export async function showSearchResults(req: Request, res: Response) {
  try {
    const query = (req.query.q as string) || '';
    const filter = (req.query.filter as string) || 'all';
    const limit = 50;
    const filters = {
      min_bpm: req.query.min_bpm as string | undefined,
      max_bpm: req.query.max_bpm as string | undefined,
      min_energy: req.query.min_energy as string | undefined,
      max_energy: req.query.max_energy as string | undefined,
      min_danceability: req.query.min_danceability as string | undefined,
      max_danceability: req.query.max_danceability as string | undefined,
      min_valence: req.query.min_valence as string | undefined,
      max_valence: req.query.max_valence as string | undefined,
      min_popularity: req.query.min_popularity as string | undefined,
      max_popularity: req.query.max_popularity as string | undefined,
      min_duration: req.query.min_duration as string | undefined,
      max_duration: req.query.max_duration as string | undefined,
      explicit: req.query.explicit as string | undefined
    };

    const isAdvancedFilter = ['tempo', 'energy', 'danceability', 'mood', 'popularity', 'duration', 'explicit'].includes(filter);

    if (!isAdvancedFilter && (!query || query.trim().length === 0)) {
      return res.render('search', {
        query: '',
        filter: 'all',
        results: null,
        error: 'Please enter a search query',
        filters
      });
    }

    const db = getDatabase();

    let results;

    try {
      switch (filter) {
        case 'tracks':
          results = { tracks: db.searchTracks(query, limit), artists: [], playlists: [] };
          break;
        case 'artists':
          // Note: searchArtists doesn't exist, use searchAll and filter
          const all = db.searchAll(query, limit);
          results = { tracks: [], artists: all.artists, playlists: [] };
          break;
        case 'playlists':
          const allP = db.searchAll(query, limit);
          results = { tracks: [], artists: [], playlists: allP.playlists };
          break;
        case 'genre':
          results = { tracks: db.searchByGenre(query, limit), artists: [], playlists: [] };
          break;
        case 'tempo': {
          const min = Number(filters.min_bpm || 0);
          const max = Number(filters.max_bpm || 300);
          results = { tracks: db.searchByTempo(min, max, limit), artists: [], playlists: [] };
          break;
        }
        case 'energy': {
          const min = Number(filters.min_energy || 0) / 100;
          const max = Number(filters.max_energy || 100) / 100;
          results = { tracks: db.searchByAudioFeature('energy', min, max, limit), artists: [], playlists: [] };
          break;
        }
        case 'danceability': {
          const min = Number(filters.min_danceability || 0) / 100;
          const max = Number(filters.max_danceability || 100) / 100;
          results = { tracks: db.searchByAudioFeature('danceability', min, max, limit), artists: [], playlists: [] };
          break;
        }
        case 'mood': {
          const min = Number(filters.min_valence || 0) / 100;
          const max = Number(filters.max_valence || 100) / 100;
          results = { tracks: db.searchByAudioFeature('valence', min, max, limit), artists: [], playlists: [] };
          break;
        }
        case 'popularity': {
          const min = Number(filters.min_popularity || 0);
          const max = Number(filters.max_popularity || 100);
          results = { tracks: db.searchByPopularity(min, max, limit), artists: [], playlists: [] };
          break;
        }
        case 'duration': {
          const minSeconds = Number(filters.min_duration);
          const maxSeconds = Number(filters.max_duration);
          const min = Number.isFinite(minSeconds) ? minSeconds * 1000 : 0;
          const max = Number.isFinite(maxSeconds) ? maxSeconds * 1000 : 600000;
          results = { tracks: db.searchByDuration(min, max, limit), artists: [], playlists: [] };
          break;
        }
        case 'explicit': {
          const explicitVal = filters.explicit === 'true';
          results = { tracks: db.searchExplicitTracks(explicitVal, limit), artists: [], playlists: [] };
          break;
        }
        case 'all':
        default:
          results = db.searchAll(query, limit);
          break;
      }
    } catch (error) {
      console.error('Search error:', error);
      results = { tracks: [], artists: [], playlists: [] };
    }

    res.render('search', {
      query,
      filter,
      results,
      error: null,
      filters
    });
  } catch (error) {
    console.error('Error in search:', error);
    res.status(500).render('error', {
      message: 'Search failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
