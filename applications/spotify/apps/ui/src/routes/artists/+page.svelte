<script lang="ts">
  import { onMount } from 'svelte';
  import { getArtists, formatNumber, type Artist, type PaginatedResponse } from '$lib';

  let data: PaginatedResponse<Artist> | null = $state(null);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let searchQuery = $state('');
  let currentPage = $state(1);
  const pageSize = 48;

  async function loadArtists() {
    loading = true;
    error = null;
    try {
      data = await getArtists(currentPage, pageSize, searchQuery || undefined);
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load artists';
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    loadArtists();
  });

  function handleSearch(e: Event) {
    e.preventDefault();
    currentPage = 1;
    loadArtists();
  }

  function goToPage(page: number) {
    currentPage = page;
    loadArtists();
  }

  function getGenreList(genres: string | null): string[] {
    if (!genres) return [];
    return genres.split(',').map(g => g.trim()).filter(Boolean).slice(0, 3);
  }
</script>

<svelte:head>
  <title>Artists - Spotify Sync</title>
</svelte:head>

<div class="space-y-6">
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h1 class="text-3xl font-bold text-[hsl(var(--foreground))]">Artists</h1>
      {#if data}
        <p class="mt-1 text-[hsl(var(--muted-foreground))]">{formatNumber(data.total)} artists</p>
      {/if}
    </div>

    <form onsubmit={handleSearch} class="flex gap-2">
      <input
        type="text"
        placeholder="Search artists..."
        bind:value={searchQuery}
        class="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 py-2 text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
      />
      <button
        type="submit"
        class="rounded-md bg-[hsl(var(--primary))] px-4 py-2 text-sm font-medium text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary))]/90"
      >
        Search
      </button>
    </form>
  </div>

  {#if loading}
    <div class="flex items-center justify-center py-12">
      <div class="h-8 w-8 animate-spin rounded-full border-4 border-[hsl(var(--primary))] border-t-transparent"></div>
    </div>
  {:else if error}
    <div class="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
      {error}
    </div>
  {:else if data}
    {#if data.items.length === 0}
      <div class="py-12 text-center text-[hsl(var(--muted-foreground))]">
        {searchQuery ? `No artists found for "${searchQuery}"` : 'No artists found'}
      </div>
    {:else}
      <div class="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {#each data.items as artist}
          <a
            href="/artists/{artist.id}"
            class="group rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 transition-colors hover:bg-[hsl(var(--accent))]"
          >
            <div class="aspect-square overflow-hidden rounded-full bg-[hsl(var(--muted))]">
              {#if artist.imageUrl}
                <img
                  src={artist.imageUrl}
                  alt={artist.name}
                  class="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
              {:else}
                <div class="flex h-full w-full items-center justify-center">
                  <svg class="h-12 w-12 text-[hsl(var(--muted-foreground))]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              {/if}
            </div>
            <div class="mt-3 text-center">
              <h3 class="truncate font-medium text-[hsl(var(--foreground))] group-hover:text-[hsl(var(--accent-foreground))]">
                {artist.name}
              </h3>
              {#if artist.trackCount}
                <p class="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                  {artist.trackCount} track{artist.trackCount === 1 ? '' : 's'}
                </p>
              {/if}
              {#if artist.genres}
                <div class="mt-2 flex flex-wrap justify-center gap-1">
                  {#each getGenreList(artist.genres) as genre}
                    <span class="rounded-full bg-[hsl(var(--muted))] px-2 py-0.5 text-xs text-[hsl(var(--muted-foreground))]">
                      {genre}
                    </span>
                  {/each}
                </div>
              {/if}
            </div>
          </a>
        {/each}
      </div>

      <!-- Pagination -->
      {#if data.totalPages > 1}
        <div class="flex items-center justify-center gap-2 pt-6">
          <button
            onclick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            class="rounded-md border border-[hsl(var(--border))] px-3 py-2 text-sm text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          <span class="px-4 text-sm text-[hsl(var(--muted-foreground))]">
            Page {currentPage} of {data.totalPages}
          </span>
          <button
            onclick={() => goToPage(currentPage + 1)}
            disabled={currentPage === data.totalPages}
            class="rounded-md border border-[hsl(var(--border))] px-3 py-2 text-sm text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      {/if}
    {/if}
  {/if}
</div>
