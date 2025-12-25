import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join } from 'path';
import { encrypt, decrypt } from '../services/crypto';
import type { Playlist, SpotifyCredentials, SyncLog } from '../types/spotify';

export class SpotifyDatabase {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);

    // Enable WAL mode for concurrent reads
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('busy_timeout = 5000');
    this.db.pragma('foreign_keys = ON');

    this.runMigrations();
  }

  private runMigrations() {
    // Check if schema_version table exists
    const versionTable = this.db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='_schema_version'"
    ).get();

    if (!versionTable) {
      // Initial schema - read from schema.sql
      const schemaPath = join(__dirname, 'schema.sql');
      const schema = readFileSync(schemaPath, 'utf8');
      this.db.exec(schema);
      this.db.prepare('INSERT INTO _schema_version (version) VALUES (1)').run();
      console.log('✓ Database initialized with schema version 1');
      return;
    }

    const currentVersion = this.db.prepare(
      'SELECT version FROM _schema_version ORDER BY version DESC LIMIT 1'
    ).pluck().get() as number | undefined;

    // Migration 002: Audio features, progress tracking, search indexes
    if (!currentVersion || currentVersion < 2) {
      console.log('Running migration 002: Audio features + progress tracking...');
      const migration2Path = join(__dirname, 'migrations', '002_audio_features.sql');

      try {
        const migration2 = readFileSync(migration2Path, 'utf8');
        this.db.exec(migration2);

        // Add ETA columns to sync_log (SQLite doesn't support IF NOT EXISTS for columns)
        try {
          this.db.prepare('ALTER TABLE sync_log ADD COLUMN estimated_duration_seconds INTEGER').run();
          this.db.prepare('ALTER TABLE sync_log ADD COLUMN estimated_completion_at TIMESTAMP').run();
          console.log('  Added ETA columns to sync_log');
        } catch (e: any) {
          // Columns may already exist if migration ran partially before
          if (!e.message.includes('duplicate column name')) {
            console.warn('  Warning adding ETA columns:', e.message);
          }
        }

        this.db.prepare('INSERT INTO _schema_version (version) VALUES (2)').run();
        console.log('✓ Migration 002 complete');
      } catch (e: any) {
        console.error('✗ Migration 002 failed:', e.message);
        throw e;
      }
    }
  }

  /**
   * Close database connection
   */
  close() {
    this.db.close();
  }

  // ============================================================================
  // OAuth Credentials
  // ============================================================================

  saveCredentials(accessToken: string, refreshToken: string, expiresAt: Date, scope: string) {
    const encryptedRefreshToken = encrypt(refreshToken);

    this.db.prepare(`
      INSERT INTO spotify_credentials (id, access_token, refresh_token, expires_at, scope)
      VALUES (1, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        access_token = excluded.access_token,
        refresh_token = excluded.refresh_token,
        expires_at = excluded.expires_at,
        scope = excluded.scope
    `).run(accessToken, encryptedRefreshToken, expiresAt.toISOString(), scope);
  }

  getCredentials(): SpotifyCredentials | null {
    const row = this.db.prepare('SELECT * FROM spotify_credentials WHERE id = 1').get() as SpotifyCredentials | undefined;

    if (!row) return null;

    // Decrypt refresh token
    return {
      ...row,
      refresh_token: decrypt(row.refresh_token)
    };
  }

  deleteCredentials() {
    this.db.prepare('DELETE FROM spotify_credentials WHERE id = 1').run();
  }

  // ============================================================================
  // Playlists
  // ============================================================================

  upsertPlaylist(playlist: {
    id: string;
    name: string;
    description?: string | null;
    owner_id?: string | null;
    owner_name?: string | null;
    public?: boolean | null;
    collaborative?: boolean | null;
    snapshot_id?: string | null;
    image_url?: string | null;
  }) {
    this.db.prepare(`
      INSERT INTO playlists (id, name, description, owner_id, owner_name, public, collaborative, snapshot_id, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        description = excluded.description,
        snapshot_id = excluded.snapshot_id,
        image_url = excluded.image_url,
        synced_at = CURRENT_TIMESTAMP
    `).run(
      playlist.id,
      playlist.name,
      playlist.description || null,
      playlist.owner_id || null,
      playlist.owner_name || null,
      playlist.public ? 1 : 0,
      playlist.collaborative ? 1 : 0,
      playlist.snapshot_id || null,
      playlist.image_url || null
    );
  }

  getPlaylist(id: string): Playlist | null {
    return this.db.prepare('SELECT * FROM playlists WHERE id = ?').get(id) as Playlist | undefined || null;
  }

  getPlaylists(limit: number = 50): Playlist[] {
    return this.db.prepare(`
      SELECT p.*, COUNT(pt.track_id) as track_count
      FROM playlists p
      LEFT JOIN playlist_tracks pt ON p.id = pt.playlist_id
      GROUP BY p.id
      ORDER BY p.synced_at DESC
      LIMIT ?
    `).all(limit) as Playlist[];
  }

  // ============================================================================
  // Sync Logs
  // ============================================================================

  createSyncLog(syncType: string, status: string): number {
    const result = this.db.prepare(`
      INSERT INTO sync_log (sync_type, status, started_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `).run(syncType, status);

    return result.lastInsertRowid as number;
  }

  completeSyncLog(
    id: number,
    status: string,
    itemsSynced: number = 0,
    itemsAdded: number = 0,
    itemsUpdated: number = 0,
    error: string | null = null
  ) {
    this.db.prepare(`
      UPDATE sync_log
      SET completed_at = CURRENT_TIMESTAMP,
          status = ?,
          items_synced = ?,
          items_added = ?,
          items_updated = ?,
          error = ?
      WHERE id = ?
    `).run(status, itemsSynced, itemsAdded, itemsUpdated, error, id);
  }

  getRecentSyncs(limit: number = 10): SyncLog[] {
    return this.db.prepare(`
      SELECT * FROM sync_log
      ORDER BY started_at DESC
      LIMIT ?
    `).all(limit) as SyncLog[];
  }

  // ============================================================================
  // Tracks
  // ============================================================================

  upsertTrack(track: {
    id: string;
    name: string;
    album_id: string | null;
    duration_ms: number;
    explicit: boolean;
    popularity: number;
    preview_url: string | null;
  }) {
    this.db.prepare(`
      INSERT INTO tracks (id, name, album_id, duration_ms, explicit, popularity, preview_url)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        album_id = excluded.album_id,
        duration_ms = excluded.duration_ms,
        explicit = excluded.explicit,
        popularity = excluded.popularity,
        preview_url = excluded.preview_url,
        synced_at = CURRENT_TIMESTAMP
    `).run(
      track.id,
      track.name,
      track.album_id,
      track.duration_ms,
      track.explicit ? 1 : 0,
      track.popularity,
      track.preview_url
    );
  }

  // ============================================================================
  // Albums
  // ============================================================================

  upsertAlbum(album: {
    id: string;
    name: string;
    release_date: string | null;
    album_type: string | null;
    total_tracks: number | null;
    image_url: string | null;
  }) {
    this.db.prepare(`
      INSERT INTO albums (id, name, release_date, album_type, total_tracks, image_url)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        release_date = excluded.release_date,
        album_type = excluded.album_type,
        total_tracks = excluded.total_tracks,
        image_url = excluded.image_url,
        synced_at = CURRENT_TIMESTAMP
    `).run(
      album.id,
      album.name,
      album.release_date,
      album.album_type,
      album.total_tracks,
      album.image_url
    );
  }

  // ============================================================================
  // Artists
  // ============================================================================

  upsertArtist(artist: {
    id: string;
    name: string;
    genres: string[] | null;
    popularity: number | null;
    image_url: string | null;
  }) {
    this.db.prepare(`
      INSERT INTO artists (id, name, genres, popularity, image_url)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        genres = excluded.genres,
        popularity = excluded.popularity,
        image_url = excluded.image_url,
        synced_at = CURRENT_TIMESTAMP
    `).run(
      artist.id,
      artist.name,
      artist.genres ? JSON.stringify(artist.genres) : null,
      artist.popularity,
      artist.image_url
    );
  }

  // ============================================================================
  // Track-Artist Links
  // ============================================================================

  linkTrackArtist(trackId: string, artistId: string, position: number) {
    this.db.prepare(`
      INSERT INTO track_artists (track_id, artist_id, position)
      VALUES (?, ?, ?)
      ON CONFLICT(track_id, artist_id) DO UPDATE SET
        position = excluded.position
    `).run(trackId, artistId, position);
  }

  // ============================================================================
  // Playlist-Track Links
  // ============================================================================

  addPlaylistTrack(
    playlistId: string,
    trackId: string,
    position: number,
    addedAt: string | null,
    addedBy: string | null
  ) {
    this.db.prepare(`
      INSERT INTO playlist_tracks (playlist_id, track_id, position, added_at, added_by)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(playlist_id, track_id, position) DO UPDATE SET
        added_at = excluded.added_at,
        added_by = excluded.added_by
    `).run(playlistId, trackId, position, addedAt, addedBy);
  }

  clearPlaylistTracks(playlistId: string) {
    this.db.prepare('DELETE FROM playlist_tracks WHERE playlist_id = ?').run(playlistId);
  }

  // ============================================================================
  // Audio Features
  // ============================================================================

  upsertAudioFeatures(features: {
    track_id: string;
    danceability: number;
    energy: number;
    key: number;
    loudness: number;
    mode: number;
    speechiness: number;
    acousticness: number;
    instrumentalness: number;
    liveness: number;
    valence: number;
    tempo: number;
    time_signature: number;
    duration_ms: number;
  }) {
    this.db.prepare(`
      INSERT INTO audio_features (
        track_id, danceability, energy, key, loudness, mode,
        speechiness, acousticness, instrumentalness, liveness,
        valence, tempo, time_signature, duration_ms
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(track_id) DO UPDATE SET
        danceability = excluded.danceability,
        energy = excluded.energy,
        key = excluded.key,
        loudness = excluded.loudness,
        mode = excluded.mode,
        speechiness = excluded.speechiness,
        acousticness = excluded.acousticness,
        instrumentalness = excluded.instrumentalness,
        liveness = excluded.liveness,
        valence = excluded.valence,
        tempo = excluded.tempo,
        time_signature = excluded.time_signature,
        duration_ms = excluded.duration_ms,
        synced_at = CURRENT_TIMESTAMP
    `).run(
      features.track_id, features.danceability, features.energy,
      features.key, features.loudness, features.mode,
      features.speechiness, features.acousticness, features.instrumentalness,
      features.liveness, features.valence, features.tempo,
      features.time_signature, features.duration_ms
    );
  }

  getTracksWithoutAudioFeatures(limit: number = 1000): string[] {
    return this.db.prepare(`
      SELECT t.id
      FROM tracks t
      LEFT JOIN audio_features af ON t.id = af.track_id
      WHERE af.track_id IS NULL
      LIMIT ?
    `).pluck().all(limit) as string[];
  }

  hasAudioFeatures(): boolean {
    const count = this.db.prepare('SELECT COUNT(*) FROM audio_features').pluck().get() as number;
    return count > 0;
  }

  // ============================================================================
  // Artist Enrichment
  // ============================================================================

  getArtistsWithoutDetails(limit: number = 500): string[] {
    return this.db.prepare(`
      SELECT id FROM artists
      WHERE genres IS NULL OR popularity IS NULL
      LIMIT ?
    `).pluck().all(limit) as string[];
  }

  // ============================================================================
  // Sync Progress Tracking
  // ============================================================================

  upsertSyncProgress(
    syncLogId: number,
    step: string,
    totalItems: number,
    processedItems: number = 0,
    failedItems: number = 0
  ) {
    this.db.prepare(`
      INSERT INTO sync_progress (sync_log_id, step, total_items, processed_items, failed_items)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(sync_log_id, step) DO UPDATE SET
        total_items = excluded.total_items,
        processed_items = excluded.processed_items,
        failed_items = excluded.failed_items,
        updated_at = CURRENT_TIMESTAMP
    `).run(syncLogId, step, totalItems, processedItems, failedItems);
  }

  updateSyncProgress(
    syncLogId: number,
    step: string,
    processedItems: number,
    failedItems: number
  ) {
    this.db.prepare(`
      UPDATE sync_progress
      SET processed_items = ?,
          failed_items = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE sync_log_id = ? AND step = ?
    `).run(processedItems, failedItems, syncLogId, step);
  }

  completeSyncProgress(syncLogId: number, step: string) {
    this.db.prepare(`
      UPDATE sync_progress
      SET completed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE sync_log_id = ? AND step = ?
    `).run(syncLogId, step);
  }

  getLatestRunningSyncWithProgress() {
    const sync = this.db.prepare(`
      SELECT * FROM sync_log
      WHERE status = 'running'
      ORDER BY started_at DESC
      LIMIT 1
    `).get();

    if (!sync) return null;

    const steps = this.db.prepare(`
      SELECT * FROM sync_progress
      WHERE sync_log_id = ?
      ORDER BY started_at
    `).all((sync as any).id);

    return { ...sync, steps };
  }

  updateSyncETA(syncLogId: number, estimatedSeconds: number) {
    const completionTime = new Date(Date.now() + estimatedSeconds * 1000);
    this.db.prepare(`
      UPDATE sync_log
      SET estimated_duration_seconds = ?,
          estimated_completion_at = ?
      WHERE id = ?
    `).run(estimatedSeconds, completionTime.toISOString(), syncLogId);
  }

  // ============================================================================
  // Search Methods
  // ============================================================================

  /**
   * Search all entities (tracks, artists, playlists) by name
   */
  searchAll(query: string, limit: number = 50) {
    const pattern = `%${query.toLowerCase()}%`;

    const tracks = this.db.prepare(`
      SELECT t.*, a.name as artist_name, al.name as album_name
      FROM tracks t
      LEFT JOIN track_artists ta ON t.id = ta.track_id AND ta.position = 0
      LEFT JOIN artists a ON ta.artist_id = a.id
      LEFT JOIN albums al ON t.album_id = al.id
      WHERE LOWER(t.name) LIKE ?
      LIMIT ?
    `).all(pattern, limit);

    const artists = this.db.prepare(`
      SELECT * FROM artists
      WHERE LOWER(name) LIKE ?
      LIMIT ?
    `).all(pattern, limit);

    const playlists = this.db.prepare(`
      SELECT p.*, COUNT(pt.track_id) as track_count
      FROM playlists p
      LEFT JOIN playlist_tracks pt ON p.id = pt.playlist_id
      WHERE LOWER(p.name) LIKE ?
      GROUP BY p.id
      LIMIT ?
    `).all(pattern, limit);

    return { tracks, artists, playlists };
  }

  /**
   * Search tracks by name
   */
  searchTracks(query: string, limit: number = 50) {
    const pattern = `%${query.toLowerCase()}%`;

    return this.db.prepare(`
      SELECT t.*, a.name as artist_name, al.name as album_name
      FROM tracks t
      LEFT JOIN track_artists ta ON t.id = ta.track_id AND ta.position = 0
      LEFT JOIN artists a ON ta.artist_id = a.id
      LEFT JOIN albums al ON t.album_id = al.id
      WHERE LOWER(t.name) LIKE ?
      LIMIT ?
    `).all(pattern, limit);
  }

  /**
   * Search tracks by genre (from artist genres)
   */
  searchByGenre(genre: string, limit: number = 50) {
    const pattern = `%"${genre.toLowerCase()}"%`;

    return this.db.prepare(`
      SELECT DISTINCT t.*, a.name as artist_name
      FROM tracks t
      JOIN track_artists ta ON t.id = ta.track_id
      JOIN artists a ON ta.artist_id = a.id
      WHERE LOWER(a.genres) LIKE ?
      LIMIT ?
    `).all(pattern, limit);
  }

  /**
   * Search tracks by tempo range (BPM)
   */
  searchByTempo(minBpm: number, maxBpm: number, limit: number = 50) {
    return this.db.prepare(`
      SELECT t.*, af.tempo, a.name as artist_name
      FROM tracks t
      JOIN audio_features af ON t.id = af.track_id
      JOIN track_artists ta ON t.id = ta.track_id AND ta.position = 0
      JOIN artists a ON ta.artist_id = a.id
      WHERE af.tempo BETWEEN ? AND ?
      ORDER BY af.tempo
      LIMIT ?
    `).all(minBpm, maxBpm, limit);
  }

  /**
   * Search tracks by audio feature (energy, danceability, valence)
   */
  searchByAudioFeature(
    feature: 'energy' | 'danceability' | 'valence' | 'acousticness' | 'instrumentalness',
    min: number,
    max: number,
    limit: number = 50
  ) {
    // Validate feature name to prevent SQL injection
    const validFeatures = ['energy', 'danceability', 'valence', 'acousticness', 'instrumentalness'];
    if (!validFeatures.includes(feature)) {
      throw new Error(`Invalid audio feature: ${feature}`);
    }

    const sql = `
      SELECT t.*, af.${feature}, a.name as artist_name
      FROM tracks t
      JOIN audio_features af ON t.id = af.track_id
      JOIN track_artists ta ON t.id = ta.track_id AND ta.position = 0
      JOIN artists a ON ta.artist_id = a.id
      WHERE af.${feature} BETWEEN ? AND ?
      ORDER BY af.${feature} DESC
      LIMIT ?
    `;

    return this.db.prepare(sql).all(min, max, limit);
  }

  /**
   * Search tracks by popularity range
   */
  searchByPopularity(minPop: number, maxPop: number, limit: number = 50) {
    return this.db.prepare(`
      SELECT t.*, a.name as artist_name
      FROM tracks t
      JOIN track_artists ta ON t.id = ta.track_id AND ta.position = 0
      JOIN artists a ON ta.artist_id = a.id
      WHERE t.popularity BETWEEN ? AND ?
      ORDER BY t.popularity DESC
      LIMIT ?
    `).all(minPop, maxPop, limit);
  }

  /**
   * Search tracks by duration range (milliseconds)
   */
  searchByDuration(minMs: number, maxMs: number, limit: number = 50) {
    return this.db.prepare(`
      SELECT t.*, a.name as artist_name
      FROM tracks t
      JOIN track_artists ta ON t.id = ta.track_id AND ta.position = 0
      JOIN artists a ON ta.artist_id = a.id
      WHERE t.duration_ms BETWEEN ? AND ?
      ORDER BY t.duration_ms
      LIMIT ?
    `).all(minMs, maxMs, limit);
  }

  /**
   * Search explicit or clean tracks
   */
  searchExplicitTracks(explicit: boolean, limit: number = 50) {
    return this.db.prepare(`
      SELECT t.*, a.name as artist_name
      FROM tracks t
      JOIN track_artists ta ON t.id = ta.track_id AND ta.position = 0
      JOIN artists a ON ta.artist_id = a.id
      WHERE t.explicit = ?
      LIMIT ?
    `).all(explicit ? 1 : 0, limit);
  }

  // ============================================================================
  // Drill-Down Methods
  // ============================================================================

  /**
   * Get full track details with artists and audio features
   */
  getTrackDetails(trackId: string) {
    const track = this.db.prepare(`
      SELECT t.*, al.name as album_name, al.image_url as album_image
      FROM tracks t
      LEFT JOIN albums al ON t.album_id = al.id
      WHERE t.id = ?
    `).get(trackId);

    if (!track) return null;

    const artists = this.db.prepare(`
      SELECT a.*, ta.position
      FROM artists a
      JOIN track_artists ta ON a.id = ta.artist_id
      WHERE ta.track_id = ?
      ORDER BY ta.position
    `).all(trackId);

    const audioFeatures = this.db.prepare(`
      SELECT * FROM audio_features WHERE track_id = ?
    `).get(trackId);

    return { ...track, artists, audio_features: audioFeatures };
  }

  /**
   * Get playlist with all tracks
   */
  getPlaylistWithTracks(playlistId: string, limit: number = 100, offset: number = 0) {
    const playlist = this.getPlaylist(playlistId);
    if (!playlist) return null;

    const tracks = this.db.prepare(`
      SELECT t.*, pt.position, pt.added_at,
             a.name as artist_name,
             al.name as album_name,
             af.tempo, af.energy, af.danceability
      FROM playlist_tracks pt
      JOIN tracks t ON pt.track_id = t.id
      LEFT JOIN track_artists ta ON t.id = ta.track_id AND ta.position = 0
      LEFT JOIN artists a ON ta.artist_id = a.id
      LEFT JOIN albums al ON t.album_id = al.id
      LEFT JOIN audio_features af ON t.id = af.track_id
      WHERE pt.playlist_id = ?
      ORDER BY pt.position
      LIMIT ? OFFSET ?
    `).all(playlistId, limit, offset);

    return { ...playlist, tracks };
  }

  /**
   * Get all playlists with pagination
   */
  getAllPlaylists(limit: number = 50, offset: number = 0) {
    return this.db.prepare(`
      SELECT p.*, COUNT(pt.track_id) as track_count
      FROM playlists p
      LEFT JOIN playlist_tracks pt ON p.id = pt.playlist_id
      GROUP BY p.id
      ORDER BY p.synced_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);
  }

  /**
   * Get total playlist count
   */
  getPlaylistCount(): number {
    return this.db.prepare('SELECT COUNT(*) FROM playlists').pluck().get() as number;
  }
}
