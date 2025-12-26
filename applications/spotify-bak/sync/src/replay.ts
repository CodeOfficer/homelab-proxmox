import { readFileSync } from 'fs';
import { SpotifyDatabase } from '@homelab/spotify-shared';

type DumpEntry = {
  type: string;
  timestamp: string;
  payload: any;
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function parseLines(path: string): DumpEntry[] {
  const raw = readFileSync(path, 'utf8');
  return raw
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line));
}

function normalizePlaylistName(name: string | null | undefined): string {
  return name && name.trim().length > 0 ? name : 'Untitled playlist';
}

function extractPlaylistItems(payload: any): { playlistId: string; offset: number; items: any[] } | null {
  if (!payload || !payload.playlist_id) return null;
  const offset = payload.offset ?? 0;
  const itemsContainer = payload.items;
  if (!itemsContainer) return null;
  const items = Array.isArray(itemsContainer) ? itemsContainer : itemsContainer.items;
  if (!Array.isArray(items)) return null;
  return { playlistId: payload.playlist_id, offset, items };
}

function upsertPlaylistFromApi(db: SpotifyDatabase, playlist: any) {
  db.upsertPlaylist({
    id: playlist.id,
    name: normalizePlaylistName(playlist.name),
    description: playlist.description || null,
    owner_id: playlist.owner?.id || null,
    owner_name: playlist.owner?.display_name || null,
    public: playlist.public || false,
    collaborative: playlist.collaborative || false,
    snapshot_id: playlist.snapshot_id || null,
    image_url: playlist.images?.[0]?.url || null,
    external_url: playlist.external_urls?.spotify || null,
    href: playlist.href || null,
    uri: playlist.uri || null,
    primary_color: playlist.primary_color || null,
    tracks_total: playlist.tracks?.total ?? null,
    owner_uri: playlist.owner?.uri || null,
    owner_external_url: playlist.owner?.external_urls?.spotify || null,
    owner_type: playlist.owner?.type || null,
    images_json: playlist.images ? JSON.stringify(playlist.images) : null
  });
}

function upsertTrackItem(db: SpotifyDatabase, item: any, playlistId: string, position: number) {
  if (!item.track || item.track.type !== 'track' || item.is_local || item.track.is_local) {
    return;
  }

  const track = item.track;
  if (!track.id) {
    return;
  }

  if (track.album?.id) {
    db.upsertAlbum({
      id: track.album.id,
      name: track.album.name,
      release_date: track.album.release_date || null,
      album_type: track.album.album_type || null,
      total_tracks: track.album.total_tracks || null,
      image_url: track.album.images?.[0]?.url || null,
      external_url: track.album.external_urls?.spotify || null,
      href: track.album.href || null,
      uri: track.album.uri || null,
      release_date_precision: track.album.release_date_precision || null,
      images_json: track.album.images ? JSON.stringify(track.album.images) : null,
      available_markets_json: track.album.available_markets ? JSON.stringify(track.album.available_markets) : null,
      restrictions_reason: track.album.restrictions?.reason || null
    });
  }

  if (track.artists) {
    for (const artist of track.artists) {
      if (!artist.id) continue;
      db.upsertArtist({
        id: artist.id,
        name: artist.name,
        genres: null,
        popularity: null,
        image_url: null,
        external_url: artist.external_urls?.spotify || null,
        href: artist.href || null,
        uri: artist.uri || null,
        followers_total: null,
        images_json: null
      });
    }
  }

  db.upsertTrack({
    id: track.id,
    name: track.name,
    album_id: track.album?.id || null,
    duration_ms: track.duration_ms,
    explicit: track.explicit || false,
    popularity: track.popularity || 0,
    preview_url: track.preview_url || null,
    external_url: track.external_urls?.spotify || null,
    href: track.href || null,
    uri: track.uri || null,
    disc_number: track.disc_number ?? null,
    track_number: track.track_number ?? null,
    is_local: track.is_local || false,
    is_playable: track.is_playable ?? null,
    isrc: track.external_ids?.isrc || null,
    external_ids_json: track.external_ids ? JSON.stringify(track.external_ids) : null,
    available_markets_json: track.available_markets ? JSON.stringify(track.available_markets) : null,
    restrictions_reason: track.restrictions?.reason || null,
    linked_from_json: track.linked_from ? JSON.stringify(track.linked_from) : null
  });

  if (track.artists) {
    for (let i = 0; i < track.artists.length; i++) {
      const artist = track.artists[i];
      if (!artist.id) continue;
      db.linkTrackArtist(track.id, artist.id, i);
    }
  }

  db.addPlaylistTrack(
    playlistId,
    track.id,
    position,
    item.added_at || null,
    item.added_by?.id || null,
    item.added_by?.type || null,
    item.added_by?.uri || null,
    item.added_by?.href || null,
    item.added_by?.external_urls?.spotify || null,
    item.is_local || track.is_local || false,
    item.video_thumbnail?.url || null
  );
}

async function main() {
  const dbPath = requireEnv('DATABASE_PATH');
  const dumpPath = requireEnv('SPOTIFY_SYNC_DUMP_PATH');

  console.log(`Replaying dump into database: ${dbPath}`);
  console.log(`Dump file: ${dumpPath}`);
  console.log('Clearing existing library data...');

  const db = new SpotifyDatabase(dbPath);
  db.clearLibraryData();

  const entries = parseLines(dumpPath);

  const playlistPages = entries.filter((e) => e.type === 'playlists.page');
  const playlistItemPages = entries.filter((e) => e.type === 'playlists.items.page');
  const artistBatches = entries.filter((e) => e.type === 'artists.batch');
  const audioFeatureBatches = entries.filter((e) => e.type === 'audio_features.batch');

  for (const entry of playlistPages) {
    const items = entry.payload?.items;
    if (!Array.isArray(items)) continue;
    for (const playlist of items) {
      if (playlist?.id) {
        upsertPlaylistFromApi(db, playlist);
      }
    }
  }

  for (const entry of playlistItemPages) {
    const parsed = extractPlaylistItems(entry.payload);
    if (!parsed) continue;
    const { playlistId, offset, items } = parsed;
    for (let i = 0; i < items.length; i++) {
      upsertTrackItem(db, items[i], playlistId, offset + i);
    }
  }

  for (const entry of artistBatches) {
    const artists = entry.payload?.artists;
    if (!Array.isArray(artists)) continue;
    for (const artist of artists) {
      if (!artist?.id) continue;
      db.upsertArtist({
        id: artist.id,
        name: artist.name,
        genres: artist.genres || [],
        popularity: artist.popularity || 0,
        image_url: artist.images?.[0]?.url || null,
        external_url: artist.external_urls?.spotify || null,
        href: artist.href || null,
        uri: artist.uri || null,
        followers_total: artist.followers?.total ?? null,
        images_json: artist.images ? JSON.stringify(artist.images) : null
      });
    }
  }

  for (const entry of audioFeatureBatches) {
    const featuresList = entry.payload?.audio_features;
    if (!Array.isArray(featuresList)) continue;
    for (const features of featuresList) {
      if (!features?.id) continue;
      db.upsertAudioFeatures({
        track_id: features.id,
        danceability: features.danceability,
        energy: features.energy,
        key: features.key,
        loudness: features.loudness,
        mode: features.mode,
        speechiness: features.speechiness,
        acousticness: features.acousticness,
        instrumentalness: features.instrumentalness,
        liveness: features.liveness,
        valence: features.valence,
        tempo: features.tempo,
        time_signature: features.time_signature,
        duration_ms: features.duration_ms,
        analysis_url: features.analysis_url || null,
        track_href: features.track_href || null,
        uri: features.uri || null
      });
    }
  }

  db.close();

  console.log('Replay complete.');
}

main().catch((error) => {
  console.error('Replay failed:', error);
  process.exit(1);
});
