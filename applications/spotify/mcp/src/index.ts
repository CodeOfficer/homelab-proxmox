#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { getDatabase } from '@homelab/spotify-shared';

const server = new Server(
  {
    name: 'spotify-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// Helper to format track for display
function formatTrack(track: any): string {
  const duration = Math.floor(track.duration_ms / 1000);
  const mins = Math.floor(duration / 60);
  const secs = duration % 60;
  const explicit = track.explicit ? ' [E]' : '';
  return `"${track.name}" by ${track.artist_name || 'Unknown'}${explicit} (${mins}:${secs.toString().padStart(2, '0')}) - Popularity: ${track.popularity || 'N/A'}`;
}

// Helper to format audio features
function formatAudioFeatures(af: any): string {
  if (!af) return 'No audio features available';
  return `Tempo: ${Math.round(af.tempo)} BPM, Energy: ${Math.round(af.energy * 100)}%, Danceability: ${Math.round(af.danceability * 100)}%, Valence: ${Math.round(af.valence * 100)}%, Acousticness: ${Math.round(af.acousticness * 100)}%`;
}

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'search_tracks',
        description: 'Search for tracks by name in your Spotify library',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query for track name' },
            limit: { type: 'number', description: 'Maximum results to return (default 20)' },
          },
          required: ['query'],
        },
      },
      {
        name: 'search_by_genre',
        description: 'Find tracks by genre (e.g., "rock", "jazz", "electronic")',
        inputSchema: {
          type: 'object',
          properties: {
            genre: { type: 'string', description: 'Genre to search for' },
            limit: { type: 'number', description: 'Maximum results to return (default 20)' },
          },
          required: ['genre'],
        },
      },
      {
        name: 'search_by_tempo',
        description: 'Find tracks within a BPM (beats per minute) range',
        inputSchema: {
          type: 'object',
          properties: {
            min_bpm: { type: 'number', description: 'Minimum BPM' },
            max_bpm: { type: 'number', description: 'Maximum BPM' },
            limit: { type: 'number', description: 'Maximum results to return (default 20)' },
          },
          required: ['min_bpm', 'max_bpm'],
        },
      },
      {
        name: 'search_by_energy',
        description: 'Find tracks by energy level (0-100, higher = more energetic)',
        inputSchema: {
          type: 'object',
          properties: {
            min_energy: { type: 'number', description: 'Minimum energy (0-100)' },
            max_energy: { type: 'number', description: 'Maximum energy (0-100)' },
            limit: { type: 'number', description: 'Maximum results to return (default 20)' },
          },
          required: ['min_energy', 'max_energy'],
        },
      },
      {
        name: 'search_by_danceability',
        description: 'Find tracks by danceability (0-100, higher = more danceable)',
        inputSchema: {
          type: 'object',
          properties: {
            min_danceability: { type: 'number', description: 'Minimum danceability (0-100)' },
            max_danceability: { type: 'number', description: 'Maximum danceability (0-100)' },
            limit: { type: 'number', description: 'Maximum results to return (default 20)' },
          },
          required: ['min_danceability', 'max_danceability'],
        },
      },
      {
        name: 'search_by_mood',
        description: 'Find tracks by mood/valence (0-100, higher = happier/more positive)',
        inputSchema: {
          type: 'object',
          properties: {
            min_valence: { type: 'number', description: 'Minimum valence (0-100)' },
            max_valence: { type: 'number', description: 'Maximum valence (0-100)' },
            limit: { type: 'number', description: 'Maximum results to return (default 20)' },
          },
          required: ['min_valence', 'max_valence'],
        },
      },
      {
        name: 'get_playlist',
        description: 'Get details and tracks from a specific playlist',
        inputSchema: {
          type: 'object',
          properties: {
            playlist_id: { type: 'string', description: 'Spotify playlist ID' },
            limit: { type: 'number', description: 'Maximum tracks to return (default 50)' },
          },
          required: ['playlist_id'],
        },
      },
      {
        name: 'list_playlists',
        description: 'List all playlists in your library',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum playlists to return (default 50)' },
          },
        },
      },
      {
        name: 'get_track_details',
        description: 'Get detailed information about a specific track including audio features',
        inputSchema: {
          type: 'object',
          properties: {
            track_id: { type: 'string', description: 'Spotify track ID' },
          },
          required: ['track_id'],
        },
      },
      {
        name: 'get_library_stats',
        description: 'Get overall statistics about your music library',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_top_genres',
        description: 'Get the most common genres in your library',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Number of genres to return (default 20)' },
          },
        },
      },
      {
        name: 'get_popular_tracks',
        description: 'Get your most popular tracks (by Spotify popularity score)',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Number of tracks to return (default 20)' },
          },
        },
      },
      {
        name: 'get_artist_tracks',
        description: 'Get all tracks by a specific artist in your library',
        inputSchema: {
          type: 'object',
          properties: {
            artist_id: { type: 'string', description: 'Spotify artist ID' },
            limit: { type: 'number', description: 'Maximum tracks to return (default 50)' },
          },
          required: ['artist_id'],
        },
      },
      {
        name: 'search_all',
        description: 'Search across tracks, artists, and playlists',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
            limit: { type: 'number', description: 'Maximum results per category (default 10)' },
          },
          required: ['query'],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const db = getDatabase();
  const a = args || {};

  try {
    switch (name) {
      case 'search_tracks': {
        const query = String(a.query || '');
        const limit = Number(a.limit) || 20;
        const tracks = db.searchTracks(query, limit);
        if (tracks.length === 0) {
          return { content: [{ type: 'text', text: `No tracks found matching "${query}"` }] };
        }
        const formatted = tracks.map((t: any) => formatTrack(t)).join('\n');
        return { content: [{ type: 'text', text: `Found ${tracks.length} tracks:\n\n${formatted}` }] };
      }

      case 'search_by_genre': {
        const genre = String(a.genre || '');
        const limit = Number(a.limit) || 20;
        const tracks = db.searchByGenre(genre, limit);
        if (tracks.length === 0) {
          return { content: [{ type: 'text', text: `No tracks found in genre "${genre}"` }] };
        }
        const formatted = tracks.map((t: any) => formatTrack(t)).join('\n');
        return { content: [{ type: 'text', text: `Found ${tracks.length} ${genre} tracks:\n\n${formatted}` }] };
      }

      case 'search_by_tempo': {
        const minBpm = Number(a.min_bpm) || 0;
        const maxBpm = Number(a.max_bpm) || 300;
        const limit = Number(a.limit) || 20;
        const tracks = db.searchByTempo(minBpm, maxBpm, limit);
        if (tracks.length === 0) {
          return { content: [{ type: 'text', text: `No tracks found between ${minBpm}-${maxBpm} BPM` }] };
        }
        const formatted = tracks.map((t: any) => `${formatTrack(t)} - ${Math.round(t.tempo)} BPM`).join('\n');
        return { content: [{ type: 'text', text: `Found ${tracks.length} tracks (${minBpm}-${maxBpm} BPM):\n\n${formatted}` }] };
      }

      case 'search_by_energy': {
        const minEnergy = (Number(a.min_energy) || 0) / 100;
        const maxEnergy = (Number(a.max_energy) || 100) / 100;
        const limit = Number(a.limit) || 20;
        const tracks = db.searchByAudioFeature('energy', minEnergy, maxEnergy, limit);
        if (tracks.length === 0) {
          return { content: [{ type: 'text', text: `No tracks found with energy ${Math.round(minEnergy * 100)}-${Math.round(maxEnergy * 100)}%` }] };
        }
        const formatted = tracks.map((t: any) => `${formatTrack(t)} - Energy: ${Math.round(t.energy * 100)}%`).join('\n');
        return { content: [{ type: 'text', text: `Found ${tracks.length} tracks (${Math.round(minEnergy * 100)}-${Math.round(maxEnergy * 100)}% energy):\n\n${formatted}` }] };
      }

      case 'search_by_danceability': {
        const minDance = (Number(a.min_danceability) || 0) / 100;
        const maxDance = (Number(a.max_danceability) || 100) / 100;
        const limit = Number(a.limit) || 20;
        const tracks = db.searchByAudioFeature('danceability', minDance, maxDance, limit);
        if (tracks.length === 0) {
          return { content: [{ type: 'text', text: `No tracks found with danceability ${Math.round(minDance * 100)}-${Math.round(maxDance * 100)}%` }] };
        }
        const formatted = tracks.map((t: any) => `${formatTrack(t)} - Danceability: ${Math.round(t.danceability * 100)}%`).join('\n');
        return { content: [{ type: 'text', text: `Found ${tracks.length} tracks (${Math.round(minDance * 100)}-${Math.round(maxDance * 100)}% danceability):\n\n${formatted}` }] };
      }

      case 'search_by_mood': {
        const minVal = (Number(a.min_valence) || 0) / 100;
        const maxVal = (Number(a.max_valence) || 100) / 100;
        const limit = Number(a.limit) || 20;
        const tracks = db.searchByAudioFeature('valence', minVal, maxVal, limit);
        if (tracks.length === 0) {
          return { content: [{ type: 'text', text: `No tracks found with mood ${Math.round(minVal * 100)}-${Math.round(maxVal * 100)}%` }] };
        }
        const formatted = tracks.map((t: any) => `${formatTrack(t)} - Valence: ${Math.round(t.valence * 100)}%`).join('\n');
        return { content: [{ type: 'text', text: `Found ${tracks.length} tracks (${Math.round(minVal * 100)}-${Math.round(maxVal * 100)}% valence/mood):\n\n${formatted}` }] };
      }

      case 'get_playlist': {
        const playlistId = String(a.playlist_id || '');
        const limit = Number(a.limit) || 50;
        const playlist = db.getPlaylistWithTracks(playlistId, limit);
        if (!playlist) {
          return { content: [{ type: 'text', text: `Playlist not found: ${playlistId}` }] };
        }
        const trackList = (playlist as any).tracks
          .map((t: any, i: number) => `${i + 1}. ${formatTrack(t)}`)
          .join('\n');
        return {
          content: [{
            type: 'text',
            text: `Playlist: ${playlist.name}\n${playlist.description || ''}\nOwner: ${playlist.owner_name || 'Unknown'}\n\nTracks (${(playlist as any).tracks.length}):\n${trackList}`,
          }],
        };
      }

      case 'list_playlists': {
        const limit = Number(a.limit) || 50;
        const playlists = db.getAllPlaylists(limit);
        if (playlists.length === 0) {
          return { content: [{ type: 'text', text: 'No playlists found in library' }] };
        }
        const formatted = playlists
          .map((p: any) => `• ${p.name} (${p.track_count} tracks) - ID: ${p.id}`)
          .join('\n');
        return { content: [{ type: 'text', text: `Your Playlists (${playlists.length}):\n\n${formatted}` }] };
      }

      case 'get_track_details': {
        const trackId = String(a.track_id || '');
        const track = db.getTrackDetails(trackId) as any;
        if (!track) {
          return { content: [{ type: 'text', text: `Track not found: ${trackId}` }] };
        }
        const artists = track.artists?.map((ar: any) => ar.name).join(', ') || 'Unknown';
        const duration = Math.floor(track.duration_ms / 1000);
        const mins = Math.floor(duration / 60);
        const secs = duration % 60;

        let details = `Track: ${track.name}\n`;
        details += `Artists: ${artists}\n`;
        details += `Album: ${track.album_name || 'Unknown'}\n`;
        details += `Duration: ${mins}:${secs.toString().padStart(2, '0')}\n`;
        details += `Popularity: ${track.popularity}/100\n`;
        details += `Explicit: ${track.explicit ? 'Yes' : 'No'}\n`;
        details += `\nAudio Features:\n${formatAudioFeatures(track.audio_features)}`;

        return { content: [{ type: 'text', text: details }] };
      }

      case 'get_library_stats': {
        const stats = db.getLibraryStats();
        const totalDuration = db.getTotalDuration();
        const hours = Math.floor(totalDuration / 1000 / 60 / 60);
        const minutes = Math.floor((totalDuration / 1000 / 60) % 60);
        const lastSync = db.getLastSyncTime();

        let text = `Library Statistics:\n\n`;
        text += `Tracks: ${stats.totalTracks.toLocaleString()}\n`;
        text += `Playlists: ${stats.totalPlaylists.toLocaleString()}\n`;
        text += `Artists: ${stats.totalArtists.toLocaleString()}\n`;
        text += `Albums: ${stats.totalAlbums.toLocaleString()}\n`;
        text += `Tracks with Audio Features: ${stats.tracksWithAudioFeatures.toLocaleString()}\n`;
        text += `\nTotal Listening Time: ${hours}h ${minutes}m\n`;
        text += `Last Sync: ${lastSync || 'Never'}`;

        return { content: [{ type: 'text', text }] };
      }

      case 'get_top_genres': {
        const limit = Number(a.limit) || 20;
        const genres = db.getTopGenres(limit);
        if (genres.length === 0) {
          return { content: [{ type: 'text', text: 'No genre data available' }] };
        }
        const formatted = genres
          .map((g, i) => `${i + 1}. ${g.genre} (${g.count} artists)`)
          .join('\n');
        return { content: [{ type: 'text', text: `Top Genres:\n\n${formatted}` }] };
      }

      case 'get_popular_tracks': {
        const limit = Number(a.limit) || 20;
        const tracks = db.getMostPopularTracks(limit);
        if (tracks.length === 0) {
          return { content: [{ type: 'text', text: 'No tracks found' }] };
        }
        const formatted = tracks
          .map((t: any, i: number) => `${i + 1}. ${formatTrack(t)}`)
          .join('\n');
        return { content: [{ type: 'text', text: `Most Popular Tracks:\n\n${formatted}` }] };
      }

      case 'get_artist_tracks': {
        const artistId = String(a.artist_id || '');
        const limit = Number(a.limit) || 50;
        const artist = db.getArtistDetails(artistId);
        if (!artist) {
          return { content: [{ type: 'text', text: `Artist not found: ${artistId}` }] };
        }
        const tracks = db.getArtistTracks(artistId, limit);
        const formatted = tracks.map((t: any, i: number) => `${i + 1}. ${formatTrack(t)}`).join('\n');
        const genres = artist.genres?.join(', ') || 'Unknown';

        return {
          content: [{
            type: 'text',
            text: `Artist: ${artist.name}\nGenres: ${genres}\nPopularity: ${artist.popularity || 'N/A'}/100\n\nTracks in your library (${tracks.length}):\n${formatted}`,
          }],
        };
      }

      case 'search_all': {
        const query = String(a.query || '');
        const limit = Number(a.limit) || 10;
        const results = db.searchAll(query, limit);

        let text = `Search results for "${query}":\n\n`;

        if (results.tracks.length > 0) {
          text += `TRACKS (${results.tracks.length}):\n`;
          text += results.tracks.map((t: any) => `  • ${formatTrack(t)}`).join('\n');
          text += '\n\n';
        }

        if (results.artists.length > 0) {
          text += `ARTISTS (${results.artists.length}):\n`;
          text += results.artists.map((ar: any) => `  • ${ar.name} (ID: ${ar.id})`).join('\n');
          text += '\n\n';
        }

        if (results.playlists.length > 0) {
          text += `PLAYLISTS (${results.playlists.length}):\n`;
          text += results.playlists.map((p: any) => `  • ${p.name} (${p.track_count} tracks, ID: ${p.id})`).join('\n');
        }

        if (results.tracks.length === 0 && results.artists.length === 0 && results.playlists.length === 0) {
          text = `No results found for "${query}"`;
        }

        return { content: [{ type: 'text', text }] };
      }

      default:
        return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true };
  }
});

// List resources (playlists as browsable resources)
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  const db = getDatabase();
  const playlists = db.getAllPlaylists(100);

  return {
    resources: playlists.map((p: any) => ({
      uri: `spotify://playlist/${p.id}`,
      name: p.name,
      description: `${p.track_count} tracks`,
      mimeType: 'text/plain',
    })),
  };
});

// Read resource
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;
  const db = getDatabase();

  if (uri.startsWith('spotify://playlist/')) {
    const playlistId = uri.replace('spotify://playlist/', '');
    const playlist = db.getPlaylistWithTracks(playlistId, 100);

    if (!playlist) {
      throw new Error(`Playlist not found: ${playlistId}`);
    }

    const trackList = (playlist as any).tracks
      .map((t: any, i: number) => `${i + 1}. "${t.name}" by ${t.artist_name || 'Unknown'}`)
      .join('\n');

    return {
      contents: [{
        uri,
        mimeType: 'text/plain',
        text: `Playlist: ${playlist.name}\n\n${trackList}`,
      }],
    };
  }

  throw new Error(`Unknown resource: ${uri}`);
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Spotify MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
