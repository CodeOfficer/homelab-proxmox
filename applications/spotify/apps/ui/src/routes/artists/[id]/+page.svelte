<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { getArtist, formatDuration, formatNumber, type ArtistWithTracks } from '$lib';

  let artist: ArtistWithTracks | null = $state(null);
  let loading = $state(true);
  let error = $state<string | null>(null);

  $effect(() => {
    const id = $page.params.id;
    if (id) {
      loadArtist(id);
    }
  });

  async function loadArtist(id: string) {
    loading = true;
    error = null;
    try {
      artist = await getArtist(id);
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load artist';
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    const id = $page.params.id;
    if (id) {
      loadArtist(id);
    }
  });

  function getGenreList(genres: string | null): string[] {
    if (!genres) return [];
    return genres.split(',').map(g => g.trim()).filter(Boolean);
  }
</script>

<svelte:head>
  <title>{artist?.name ?? 'Artist'} - Spotify Sync</title>
</svelte:head>

<div class="space-y-6">
  <a
    href="/artists"
    class="inline-flex items-center gap-1 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
  >
    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
    </svg>
    Back to Artists
  </a>

  {#if loading}
    <div class="flex items-center justify-center py-12">
      <div class="h-8 w-8 animate-spin rounded-full border-4 border-[hsl(var(--primary))] border-t-transparent"></div>
    </div>
  {:else if error}
    <div class="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
      {error}
    </div>
  {:else if artist}
    <!-- Header -->
    <div class="flex flex-col gap-6 sm:flex-row">
      <div class="h-48 w-48 flex-shrink-0 overflow-hidden rounded-full bg-[hsl(var(--muted))]">
        {#if artist.imageUrl}
          <img src={artist.imageUrl} alt={artist.name} class="h-full w-full object-cover" />
        {:else}
          <div class="flex h-full w-full items-center justify-center">
            <svg class="h-16 w-16 text-[hsl(var(--muted-foreground))]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        {/if}
      </div>
      <div class="flex flex-col justify-end">
        <p class="text-sm font-medium uppercase text-[hsl(var(--muted-foreground))]">Artist</p>
        <h1 class="mt-2 text-4xl font-bold text-[hsl(var(--foreground))]">{artist.name}</h1>
        <div class="mt-4 flex flex-wrap items-center gap-4 text-sm text-[hsl(var(--muted-foreground))]">
          <span>{formatNumber(artist.tracks?.length ?? 0)} tracks</span>
          {#if artist.popularity !== null}
            <span>·</span>
            <span>Popularity: {artist.popularity}</span>
          {/if}
        </div>
        {#if artist.genres}
          <div class="mt-4 flex flex-wrap gap-2">
            {#each getGenreList(artist.genres) as genre}
              <span class="rounded-full bg-[hsl(var(--muted))] px-3 py-1 text-sm text-[hsl(var(--muted-foreground))]">
                {genre}
              </span>
            {/each}
          </div>
        {/if}
        {#if artist.externalUrl}
          <a
            href={artist.externalUrl}
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
      <div class="border-b border-[hsl(var(--border))] px-4 py-3">
        <h2 class="font-semibold text-[hsl(var(--foreground))]">Tracks</h2>
      </div>

      {#if artist.tracks && artist.tracks.length > 0}
        <div class="divide-y divide-[hsl(var(--border))]">
          {#each artist.tracks as track}
            <a
              href="/tracks/{track.id}"
              class="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-[hsl(var(--accent))]"
            >
              <div class="h-10 w-10 flex-shrink-0 overflow-hidden rounded bg-[hsl(var(--muted))]">
                {#if track.albumImageUrl}
                  <img src={track.albumImageUrl} alt={track.albumName ?? ''} class="h-full w-full object-cover" />
                {/if}
              </div>
              <div class="min-w-0 flex-1">
                <p class="truncate font-medium text-[hsl(var(--foreground))]">
                  {track.name}
                  {#if track.explicit}
                    <span class="ml-1 rounded bg-[hsl(var(--muted))] px-1 text-xs text-[hsl(var(--muted-foreground))]">E</span>
                  {/if}
                </p>
                {#if track.albumName}
                  <p class="truncate text-sm text-[hsl(var(--muted-foreground))]">{track.albumName}</p>
                {/if}
              </div>
              <span class="text-sm text-[hsl(var(--muted-foreground))]">
                {track.durationMs ? formatDuration(track.durationMs) : '--:--'}
              </span>
            </a>
          {/each}
        </div>
      {:else}
        <div class="py-8 text-center text-[hsl(var(--muted-foreground))]">
          No tracks found for this artist
        </div>
      {/if}
    </div>
  {/if}
</div>
