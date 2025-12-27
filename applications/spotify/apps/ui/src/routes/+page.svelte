<script lang="ts">
  import { onMount } from 'svelte';
  import { getStats, getSyncStatus, formatDuration, formatNumber, type LibraryStats, type SyncStatus } from '$lib';
  import VuMeter from '$lib/components/ui/VuMeter.svelte';

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

  // Calculate a "library health" score for VU meter display
  function getLibraryScore(): number {
    if (!stats) return 0;
    // Arbitrary scoring based on library size
    const trackScore = Math.min(stats.totalTracks / 10000 * 100, 100);
    return Math.round(trackScore);
  }
</script>

<svelte:head>
  <title>Dashboard - Spotify Sync PRO</title>
</svelte:head>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex items-baseline gap-3">
    <h1 class="font-mono text-xl font-semibold text-[hsl(var(--foreground))] uppercase tracking-wide">Dashboard</h1>
    <span class="font-mono text-xs text-[hsl(var(--muted-foreground))]">Library Overview</span>
  </div>

  {#if loading}
    <div class="flex items-center justify-center py-12">
      <div class="flex items-center gap-3 text-[hsl(var(--muted-foreground))]">
        <div class="h-5 w-5 animate-spin rounded-full border-2 border-[hsl(var(--primary))] border-t-transparent"></div>
        <span class="font-mono text-xs uppercase tracking-wide">Loading...</span>
      </div>
    </div>
  {:else if error}
    <div class="console-panel p-4">
      <p class="font-mono text-sm text-[hsl(var(--destructive))]">{error}</p>
    </div>
  {:else if stats}
    <!-- Stats Grid -->
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div class="console-panel p-4">
        <div class="flex items-center justify-between">
          <span class="font-mono text-[10px] text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Playlists</span>
          <div class="h-2 w-2 rounded-full bg-[hsl(var(--secondary))]"></div>
        </div>
        <div class="mt-2 font-mono text-2xl font-semibold text-[hsl(var(--foreground))] tabular-nums">
          {formatNumber(stats.totalPlaylists)}
        </div>
      </div>

      <div class="console-panel p-4">
        <div class="flex items-center justify-between">
          <span class="font-mono text-[10px] text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Tracks</span>
          <div class="h-2 w-2 rounded-full bg-[hsl(var(--primary))]"></div>
        </div>
        <div class="mt-2 font-mono text-2xl font-semibold text-[hsl(var(--foreground))] tabular-nums">
          {formatNumber(stats.totalTracks)}
        </div>
      </div>

      <div class="console-panel p-4">
        <div class="flex items-center justify-between">
          <span class="font-mono text-[10px] text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Artists</span>
          <div class="h-2 w-2 rounded-full bg-[hsl(var(--vu-green))]"></div>
        </div>
        <div class="mt-2 font-mono text-2xl font-semibold text-[hsl(var(--foreground))] tabular-nums">
          {formatNumber(stats.totalArtists)}
        </div>
      </div>

      <div class="console-panel p-4">
        <div class="flex items-center justify-between">
          <span class="font-mono text-[10px] text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Albums</span>
          <div class="h-2 w-2 rounded-full bg-[hsl(var(--vu-yellow))]"></div>
        </div>
        <div class="mt-2 font-mono text-2xl font-semibold text-[hsl(var(--foreground))] tabular-nums">
          {formatNumber(stats.totalAlbums)}
        </div>
      </div>
    </div>

    <!-- Main Panels -->
    <div class="grid gap-4 lg:grid-cols-2">
      <!-- Top Genres -->
      <div class="console-panel p-4">
        <div class="flex items-center justify-between border-b border-[hsl(var(--border))] pb-3">
          <h2 class="font-mono text-xs font-medium text-[hsl(var(--foreground))] uppercase tracking-wide">Top Genres</h2>
          <span class="font-mono text-[10px] text-[hsl(var(--muted-foreground))]">{stats.topGenres.length} genres</span>
        </div>
        {#if stats.topGenres.length === 0}
          <p class="mt-4 font-mono text-sm text-[hsl(var(--muted-foreground))]">No genres found</p>
        {:else}
          <div class="mt-3 space-y-2">
            {#each stats.topGenres as genre, i}
              <div class="flex items-center justify-between py-1">
                <div class="flex items-center gap-3">
                  <span class="font-mono text-xs text-[hsl(var(--muted-foreground))] w-4">{i + 1}.</span>
                  <span class="font-mono text-sm text-[hsl(var(--foreground))]">{genre.genre}</span>
                </div>
                <div class="flex items-center gap-3">
                  <VuMeter value={Math.min(genre.count / 100, 100)} segments={8} size="sm" />
                  <span class="font-mono text-xs text-[hsl(var(--muted-foreground))] tabular-nums w-12 text-right">
                    {formatNumber(genre.count)}
                  </span>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Sync Status -->
      <div class="console-panel p-4">
        <div class="flex items-center justify-between border-b border-[hsl(var(--border))] pb-3">
          <h2 class="font-mono text-xs font-medium text-[hsl(var(--foreground))] uppercase tracking-wide">Sync Status</h2>
          <div class="flex items-center gap-2">
            <span class="h-2 w-2 rounded-full {syncStatus?.isRunning ? 'animate-pulse bg-[hsl(var(--vu-green))]' : 'bg-[hsl(var(--muted-foreground))]'}"></span>
            <span class="font-mono text-[10px] text-[hsl(var(--muted-foreground))] uppercase">
              {syncStatus?.isRunning ? 'Running' : 'Idle'}
            </span>
          </div>
        </div>
        <div class="mt-4 space-y-3">
          {#if syncStatus?.lastSync}
            <div class="grid grid-cols-2 gap-4">
              <div>
                <span class="font-mono text-[10px] text-[hsl(var(--muted-foreground))] uppercase block">Last Sync</span>
                <span class="font-mono text-sm text-[hsl(var(--foreground))]">
                  {new Date(syncStatus.lastSync.startedAt).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span class="font-mono text-[10px] text-[hsl(var(--muted-foreground))] uppercase block">Status</span>
                <span class="font-mono text-sm text-[hsl(var(--foreground))] {syncStatus.lastSync.status === 'completed' ? 'text-[hsl(var(--vu-green))]' : ''}">
                  {syncStatus.lastSync.status}
                </span>
              </div>
            </div>
            {#if syncStatus.lastSync.itemsSynced}
              <div>
                <span class="font-mono text-[10px] text-[hsl(var(--muted-foreground))] uppercase block">Items Synced</span>
                <span class="font-mono text-sm text-[hsl(var(--foreground))] tabular-nums">
                  {formatNumber(syncStatus.lastSync.itemsSynced)}
                </span>
              </div>
            {/if}
          {:else}
            <p class="font-mono text-sm text-[hsl(var(--muted-foreground))]">No sync history</p>
          {/if}
        </div>
      </div>
    </div>

    <!-- Library Duration -->
    <div class="console-panel p-4">
      <div class="flex items-center justify-between">
        <div>
          <span class="font-mono text-[10px] text-[hsl(var(--muted-foreground))] uppercase tracking-wider block">Total Duration</span>
          <span class="font-mono text-3xl font-semibold text-[hsl(var(--primary))] tabular-nums">
            {formatDuration(stats.totalDurationMs)}
          </span>
        </div>
        <div class="text-right">
          <span class="font-mono text-[10px] text-[hsl(var(--muted-foreground))] uppercase tracking-wider block">Library Level</span>
          <div class="mt-1">
            <VuMeter value={getLibraryScore()} segments={12} size="lg" showValue />
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>
