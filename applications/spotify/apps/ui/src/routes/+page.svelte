<script lang="ts">
  import { onMount } from 'svelte';
  import { getStats, getSyncStatus, formatDuration, formatNumber, type LibraryStats, type SyncStatus } from '$lib';

  let stats: LibraryStats | null = $state(null);
  let syncStatus: SyncStatus | null = $state(null);
  let loading = $state(true);
  let error = $state<string | null>(null);

  onMount(async () => {
    try {
      [stats, syncStatus] = await Promise.all([getStats(), getSyncStatus()]);
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load data';
    } finally {
      loading = false;
    }
  });
</script>

<svelte:head>
  <title>Dashboard - Spotify Sync</title>
</svelte:head>

<div class="space-y-8">
  <div>
    <h1 class="text-3xl font-bold text-[hsl(var(--foreground))]">Dashboard</h1>
    <p class="mt-1 text-[hsl(var(--muted-foreground))]">Your Spotify library at a glance</p>
  </div>

  {#if loading}
    <div class="flex items-center justify-center py-12">
      <div class="h-8 w-8 animate-spin rounded-full border-4 border-[hsl(var(--primary))] border-t-transparent"></div>
    </div>
  {:else if error}
    <div class="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
      {error}
    </div>
  {:else if stats}
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
        <div class="text-sm font-medium text-[hsl(var(--muted-foreground))]">Playlists</div>
        <div class="mt-2 text-3xl font-bold text-[hsl(var(--foreground))]">{formatNumber(stats.totalPlaylists)}</div>
      </div>

      <div class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
        <div class="text-sm font-medium text-[hsl(var(--muted-foreground))]">Tracks</div>
        <div class="mt-2 text-3xl font-bold text-[hsl(var(--foreground))]">{formatNumber(stats.totalTracks)}</div>
      </div>

      <div class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
        <div class="text-sm font-medium text-[hsl(var(--muted-foreground))]">Artists</div>
        <div class="mt-2 text-3xl font-bold text-[hsl(var(--foreground))]">{formatNumber(stats.totalArtists)}</div>
      </div>

      <div class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
        <div class="text-sm font-medium text-[hsl(var(--muted-foreground))]">Albums</div>
        <div class="mt-2 text-3xl font-bold text-[hsl(var(--foreground))]">{formatNumber(stats.totalAlbums)}</div>
      </div>
    </div>

    <div class="grid gap-8 lg:grid-cols-2">
      <div class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
        <h2 class="text-lg font-semibold text-[hsl(var(--foreground))]">Top Genres</h2>
        {#if stats.topGenres.length === 0}
          <p class="mt-4 text-[hsl(var(--muted-foreground))]">No genres found</p>
        {:else}
          <ul class="mt-4 space-y-3">
            {#each stats.topGenres as genre}
              <li class="flex items-center justify-between">
                <span class="text-[hsl(var(--foreground))]">{genre.genre}</span>
                <span class="text-sm text-[hsl(var(--muted-foreground))]">{formatNumber(genre.count)} tracks</span>
              </li>
            {/each}
          </ul>
        {/if}
      </div>

      <div class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
        <h2 class="text-lg font-semibold text-[hsl(var(--foreground))]">Sync Status</h2>
        <div class="mt-4 space-y-4">
          <div class="flex items-center gap-2">
            <div class="h-3 w-3 rounded-full {syncStatus?.isRunning ? 'animate-pulse bg-green-500' : 'bg-gray-400'}"></div>
            <span class="text-[hsl(var(--foreground))]">
              {syncStatus?.isRunning ? 'Sync in progress' : 'Idle'}
            </span>
          </div>
          {#if syncStatus?.lastSync}
            <div class="text-sm text-[hsl(var(--muted-foreground))]">
              <p>Last sync: {new Date(syncStatus.lastSync.startedAt).toLocaleString()}</p>
              <p>Status: {syncStatus.lastSync.status}</p>
              {#if syncStatus.lastSync.itemsSynced}
                <p>Items synced: {formatNumber(syncStatus.lastSync.itemsSynced)}</p>
              {/if}
            </div>
          {/if}
        </div>
      </div>
    </div>

    <div class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
      <h2 class="text-lg font-semibold text-[hsl(var(--foreground))]">Library Duration</h2>
      <p class="mt-2 text-3xl font-bold text-[hsl(var(--primary))]">
        {formatDuration(stats.totalDurationMs)}
      </p>
      <p class="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
        Total listening time
      </p>
    </div>
  {/if}
</div>
