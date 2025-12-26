<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { getPlaylist, formatDuration, formatNumber, type PlaylistWithTracks } from '$lib';

  let playlist: PlaylistWithTracks | null = $state(null);
  let loading = $state(true);
  let error = $state<string | null>(null);

  $effect(() => {
    const id = $page.params.id;
    if (id) {
      loadPlaylist(id);
    }
  });

  async function loadPlaylist(id: string) {
    loading = true;
    error = null;
    try {
      playlist = await getPlaylist(id);
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load playlist';
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    const id = $page.params.id;
    if (id) {
      loadPlaylist(id);
    }
  });

  function getTotalDuration(): number {
    if (!playlist?.tracks) return 0;
    return playlist.tracks.reduce((sum, t) => sum + (t.durationMs ?? 0), 0);
  }
</script>

<svelte:head>
  <title>{playlist?.name ?? 'Playlist'} - Spotify Sync</title>
</svelte:head>

<div class="space-y-6">
  <a
    href="/playlists"
    class="inline-flex items-center gap-1 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
  >
    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
    </svg>
    Back to Playlists
  </a>

  {#if loading}
    <div class="flex items-center justify-center py-12">
      <div class="h-8 w-8 animate-spin rounded-full border-4 border-[hsl(var(--primary))] border-t-transparent"></div>
    </div>
  {:else if error}
    <div class="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
      {error}
    </div>
  {:else if playlist}
    <!-- Header -->
    <div class="flex flex-col gap-6 sm:flex-row">
      <div class="h-48 w-48 flex-shrink-0 overflow-hidden rounded-lg bg-[hsl(var(--muted))]">
        {#if playlist.imageUrl}
          <img src={playlist.imageUrl} alt={playlist.name} class="h-full w-full object-cover" />
        {:else}
          <div class="flex h-full w-full items-center justify-center">
            <svg class="h-16 w-16 text-[hsl(var(--muted-foreground))]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
        {/if}
      </div>
      <div class="flex flex-col justify-end">
        <p class="text-sm font-medium uppercase text-[hsl(var(--muted-foreground))]">Playlist</p>
        <h1 class="mt-2 text-4xl font-bold text-[hsl(var(--foreground))]">{playlist.name}</h1>
        {#if playlist.description}
          <p class="mt-2 text-[hsl(var(--muted-foreground))]">{playlist.description}</p>
        {/if}
        <div class="mt-4 flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]">
          {#if playlist.ownerName}
            <span>{playlist.ownerName}</span>
            <span>·</span>
          {/if}
          <span>{formatNumber(playlist.tracks?.length ?? 0)} tracks</span>
          <span>·</span>
          <span>{formatDuration(getTotalDuration())}</span>
        </div>
        {#if playlist.externalUrl}
          <a
            href={playlist.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            class="mt-4 inline-flex items-center gap-2 text-sm text-[hsl(var(--primary))] hover:underline"
          >
            Open in Spotify
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        {/if}
      </div>
    </div>

    <!-- Track List -->
    <div class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
      <div class="grid grid-cols-[auto_1fr_1fr_auto] gap-4 border-b border-[hsl(var(--border))] px-4 py-3 text-sm font-medium text-[hsl(var(--muted-foreground))]">
        <span class="w-8 text-center">#</span>
        <span>Title</span>
        <span>Album</span>
        <span class="w-16 text-right">Duration</span>
      </div>

      {#if playlist.tracks && playlist.tracks.length > 0}
        <div class="divide-y divide-[hsl(var(--border))]">
          {#each playlist.tracks as track, index}
            <a
              href="/tracks/{track.id}"
              class="grid grid-cols-[auto_1fr_1fr_auto] items-center gap-4 px-4 py-3 transition-colors hover:bg-[hsl(var(--accent))]"
            >
              <span class="w-8 text-center text-sm text-[hsl(var(--muted-foreground))]">{index + 1}</span>
              <div class="flex items-center gap-3 overflow-hidden">
                {#if track.albumImageUrl}
                  <img
                    src={track.albumImageUrl}
                    alt={track.albumName ?? ''}
                    class="h-10 w-10 flex-shrink-0 rounded object-cover"
                  />
                {:else}
                  <div class="h-10 w-10 flex-shrink-0 rounded bg-[hsl(var(--muted))]"></div>
                {/if}
                <div class="min-w-0">
                  <p class="truncate font-medium text-[hsl(var(--foreground))]">{track.name}</p>
                  {#if track.primaryArtistName}
                    <p class="truncate text-sm text-[hsl(var(--muted-foreground))]">{track.primaryArtistName}</p>
                  {/if}
                </div>
              </div>
              <span class="truncate text-sm text-[hsl(var(--muted-foreground))]">{track.albumName ?? ''}</span>
              <span class="w-16 text-right text-sm text-[hsl(var(--muted-foreground))]">
                {track.durationMs ? formatDuration(track.durationMs) : '--:--'}
              </span>
            </a>
          {/each}
        </div>
      {:else}
        <div class="py-8 text-center text-[hsl(var(--muted-foreground))]">
          No tracks in this playlist
        </div>
      {/if}
    </div>
  {/if}
</div>
