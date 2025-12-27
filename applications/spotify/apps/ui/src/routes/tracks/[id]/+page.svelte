<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { getTrack, formatDuration, type TrackWithDetails } from '$lib';

  let track: TrackWithDetails | null = $state(null);
  let loading = $state(true);
  let error = $state<string | null>(null);

  $effect(() => {
    const id = $page.params.id;
    if (id) {
      loadTrack(id);
    }
  });

  async function loadTrack(id: string) {
    loading = true;
    error = null;
    try {
      track = await getTrack(id);
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load track';
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    const id = $page.params.id;
    if (id) {
      loadTrack(id);
    }
  });
</script>

<svelte:head>
  <title>{track?.name ?? 'Track'} - Spotify Sync</title>
</svelte:head>

<div class="space-y-6">
  <a
    href="/tracks"
    class="inline-flex items-center gap-1 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
  >
    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
    </svg>
    Back to Tracks
  </a>

  {#if loading}
    <div class="flex items-center justify-center py-12">
      <div class="h-8 w-8 animate-spin rounded-full border-4 border-[hsl(var(--primary))] border-t-transparent"></div>
    </div>
  {:else if error}
    <div class="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
      {error}
    </div>
  {:else if track}
    <!-- Header -->
    <div class="flex flex-col gap-6 sm:flex-row">
      <div class="h-48 w-48 flex-shrink-0 overflow-hidden rounded-lg bg-[hsl(var(--muted))]">
        {#if track.albumImageUrl}
          <img src={track.albumImageUrl} alt={track.albumName ?? ''} class="h-full w-full object-cover" />
        {:else}
          <div class="flex h-full w-full items-center justify-center">
            <svg class="h-16 w-16 text-[hsl(var(--muted-foreground))]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
        {/if}
      </div>
      <div class="flex flex-col justify-end">
        <p class="text-sm font-medium uppercase text-[hsl(var(--muted-foreground))]">Track</p>
        <h1 class="mt-2 text-4xl font-bold text-[hsl(var(--foreground))]">
          {track.name}
          {#if track.explicit}
            <span class="ml-2 rounded bg-[hsl(var(--muted))] px-2 py-0.5 text-sm text-[hsl(var(--muted-foreground))]">Explicit</span>
          {/if}
        </h1>
        {#if track.artists && track.artists.length > 0}
          <p class="mt-2 text-lg text-[hsl(var(--muted-foreground))]">
            {#each track.artists as artist, i}
              <a href="/artists/{artist.id}" class="hover:text-[hsl(var(--foreground))] hover:underline">{artist.name}</a>{#if i < track.artists.length - 1}, {/if}
            {/each}
          </p>
        {/if}
        <div class="mt-4 flex flex-wrap items-center gap-4 text-sm text-[hsl(var(--muted-foreground))]">
          {#if track.albumName}
            <a href="/albums/{track.albumId}" class="hover:text-[hsl(var(--foreground))] hover:underline">{track.albumName}</a>
          {/if}
          {#if track.durationMs}
            <span>{formatDuration(track.durationMs)}</span>
          {/if}
          {#if track.popularity !== null}
            <span>Popularity: {track.popularity}</span>
          {/if}
        </div>
        {#if track.externalUrl}
          <a
            href={track.externalUrl}
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

  {/if}
</div>
