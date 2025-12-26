#!/usr/bin/env node
/**
 * SSE-based MCP server for remote deployment (K8s).
 * Allows MCP clients to connect over HTTP/SSE.
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { getDatabase, closeDatabase } from '@homelab/spotify-shared';
import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

// Health check
app.get('/health', (req, res) => {
  try {
    const db = getDatabase();
    const count = db.getPlaylistCount();
    res.json({ status: 'ok', service: 'spotify-mcp', db: 'connected', playlists: count });
  } catch (error) {
    res.status(503).json({ status: 'error', service: 'spotify-mcp', db: 'disconnected' });
  }
});

// OAuth Protected Resource Metadata - indicates no auth required
// Per RFC 9728 / MCP spec 2025-06-18
app.get('/.well-known/oauth-protected-resource', (req, res) => {
  console.log('OAuth discovery request');
  res.json({
    resource: 'https://spotify-mcp.codeofficer.com',
    // No authorization_servers = no auth required
    bearer_methods_supported: [],
    resource_documentation: 'https://github.com/CodeOfficer/homelab-proxmox'
  });
});

// Also handle the /sse path version some clients expect
app.get('/.well-known/oauth-protected-resource/sse', (req, res) => {
  console.log('OAuth discovery request (sse path)');
  res.json({
    resource: 'https://spotify-mcp.codeofficer.com/sse',
    bearer_methods_supported: [],
    resource_documentation: 'https://github.com/CodeOfficer/homelab-proxmox'
  });
});

// Helper functions
function formatTrack(track: any): string {
  const duration = Math.floor(track.duration_ms / 1000);
  const mins = Math.floor(duration / 60);
  const secs = duration % 60;
  const explicit = track.explicit ? ' [E]' : '';
  return `"${track.name}" by ${track.artist_name || 'Unknown'}${explicit} (${mins}:${secs.toString().padStart(2, '0')}) - Popularity: ${track.popularity || 'N/A'}`;
}

function formatAudioFeatures(af: any): string {
  if (!af) return 'No audio features available';
  return `Tempo: ${Math.round(af.tempo)} BPM, Energy: ${Math.round(af.energy * 100)}%, Danceability: ${Math.round(af.danceability * 100)}%, Valence: ${Math.round(af.valence * 100)}%, Acousticness: ${Math.round(af.acousticness * 100)}%`;
}

// Create MCP server factory
function createServer() {
  const server = new Server(
    { name: 'spotify-mcp', version: '1.0.0' },
    { capabilities: { tools: {}, resources: {} } }
  );

  // List tools
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
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
  }));

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
          return { content: [{ type: 'text', text: `Found ${tracks.length} tracks:\n\n${formatted}` }] };
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
              text: `Playlist: ${playlist.name}\n${playlist.description || ''}\n\nTracks (${(playlist as any).tracks.length}):\n${trackList}`,
            }],
          };
        }

        case 'list_playlists': {
          const limit = Number(a.limit) || 50;
          const playlists = db.getAllPlaylists(limit);
          if (playlists.length === 0) {
            return { content: [{ type: 'text', text: 'No playlists found' }] };
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

          let details = `Track: ${track.name}\nArtists: ${artists}\n`;
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
          const formatted = genres.map((g, i) => `${i + 1}. ${g.genre} (${g.count} artists)`).join('\n');
          return { content: [{ type: 'text', text: `Top Genres:\n\n${formatted}` }] };
        }

        case 'get_popular_tracks': {
          const limit = Number(a.limit) || 20;
          const tracks = db.getMostPopularTracks(limit);
          if (tracks.length === 0) {
            return { content: [{ type: 'text', text: 'No tracks found' }] };
          }
          const formatted = tracks.map((t: any, i: number) => `${i + 1}. ${formatTrack(t)}`).join('\n');
          return { content: [{ type: 'text', text: `Most Popular Tracks:\n\n${formatted}` }] };
        }

        case 'search_all': {
          const query = String(a.query || '');
          const limit = Number(a.limit) || 10;
          const results = db.searchAll(query, limit);

          let text = `Search results for "${query}":\n\n`;
          if (results.tracks.length > 0) {
            text += `TRACKS (${results.tracks.length}):\n`;
            text += results.tracks.map((t: any) => `  • ${formatTrack(t)}`).join('\n') + '\n\n';
          }
          if (results.artists.length > 0) {
            text += `ARTISTS (${results.artists.length}):\n`;
            text += results.artists.map((ar: any) => `  • ${ar.name} (ID: ${ar.id})`).join('\n') + '\n\n';
          }
          if (results.playlists.length > 0) {
            text += `PLAYLISTS (${results.playlists.length}):\n`;
            text += results.playlists.map((p: any) => `  • ${p.name} (${p.track_count} tracks)`).join('\n');
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

  // List resources
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
      if (!playlist) throw new Error(`Playlist not found: ${playlistId}`);

      const trackList = (playlist as any).tracks
        .map((t: any, i: number) => `${i + 1}. "${t.name}" by ${t.artist_name || 'Unknown'}`)
        .join('\n');
      return { contents: [{ uri, mimeType: 'text/plain', text: `Playlist: ${playlist.name}\n\n${trackList}` }] };
    }
    throw new Error(`Unknown resource: ${uri}`);
  });

  return server;
}

// Track active transports
const transports = new Map<SSEServerTransport, express.Response>();

// Track transports by sessionId for proper routing
const transportsBySession = new Map<string, { transport: SSEServerTransport; res: express.Response }>();

// SSE endpoint
app.get('/sse', async (req, res) => {
  const connectionId = Math.random().toString(36).substring(7);
  console.log(`New SSE connection [${connectionId}]`);

  const transport = new SSEServerTransport('/message', res);
  const server = createServer();

  // Capture sessionId from the endpoint event
  const originalWrite = res.write.bind(res);
  let sessionId: string | null = null;

  res.write = function(chunk: any, encoding?: any, callback?: any) {
    const data = typeof chunk === 'string' ? chunk : chunk.toString();
    console.log(`[${connectionId}] SSE write: ${data.substring(0, 150).replace(/\n/g, '\\n')}`);

    // Extract sessionId from endpoint event
    if (!sessionId && data.includes('event: endpoint')) {
      const match = data.match(/sessionId=([a-f0-9-]+)/);
      if (match && match[1]) {
        sessionId = match[1];
        transportsBySession.set(sessionId as string, { transport, res });
        console.log(`[${connectionId}] Registered session: ${sessionId}`);
      }
    }

    return originalWrite(chunk, encoding, callback);
  };

  res.on('close', () => {
    console.log(`[${connectionId}] SSE connection closed (session: ${sessionId})`);
    if (sessionId) {
      transportsBySession.delete(sessionId);
    }
    transports.delete(transport);
    server.close().catch(console.error);
  });

  transports.set(transport, res);

  try {
    await server.connect(transport);
    console.log(`[${connectionId}] Server connected to transport`);
  } catch (error) {
    console.error(`[${connectionId}] Server connect error:`, error);
  }
});

// Message endpoint - NO body parsing middleware (SDK reads raw stream)
app.post('/message', async (req, res) => {
  const sessionId = req.query.sessionId as string;
  console.log(`POST /message sessionId=${sessionId}, sessions=${transportsBySession.size}, transports=${transports.size}`);

  if (!sessionId) {
    console.log('Missing sessionId');
    res.status(400).json({ error: 'Missing sessionId' });
    return;
  }

  // Try direct session lookup first
  const session = transportsBySession.get(sessionId);
  if (session) {
    try {
      console.log(`Found session ${sessionId}, calling handlePostMessage...`);
      await session.transport.handlePostMessage(req, res);
      console.log(`handlePostMessage completed for session ${sessionId}`);
      return;
    } catch (error: any) {
      console.error(`handlePostMessage error for session ${sessionId}:`, error?.message || error);
      if (!res.headersSent) {
        res.status(500).json({ error: error?.message || 'Internal error' });
      }
      return;
    }
  }

  // Fallback: try all transports (for edge cases)
  console.log(`Session ${sessionId} not in map, trying all transports...`);
  for (const [transport] of transports) {
    try {
      await transport.handlePostMessage(req, res);
      console.log('handlePostMessage completed via fallback');
      return;
    } catch (error: any) {
      // Continue to next transport
    }
  }

  console.log('No transport handled the message');
  if (!res.headersSent) {
    res.status(404).json({ error: 'Session not found' });
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down...');
  closeDatabase();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Shutting down...');
  closeDatabase();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`Spotify MCP SSE server listening on port ${PORT}`);
});
