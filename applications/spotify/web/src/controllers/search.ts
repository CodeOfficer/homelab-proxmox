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

    if (!query || query.trim().length === 0) {
      return res.render('search', {
        query: '',
        filter: 'all',
        results: null,
        error: 'Please enter a search query'
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
      error: null
    });
  } catch (error) {
    console.error('Error in search:', error);
    res.status(500).render('error', {
      message: 'Search failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
