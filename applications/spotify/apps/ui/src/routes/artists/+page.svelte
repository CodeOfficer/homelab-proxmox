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
  <title>Artists - Spotify Sync PRO</title>
</svelte:head>

<div class="space-y-4">
  <!-- Header -->
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div class="flex items-baseline gap-3">
      <h1 class="font-mono text-xl font-semibold text-[hsl(var(--foreground))] uppercase tracking-wide">Artists</h1>
      {#if data}
        <span class="font-mono text-xs text-[hsl(var(--muted-foreground))]">
          {formatNumber(data.total)} total
        </span>
      {/if}
    </div>

    <form onsubmit={handleSearch} class="flex gap-2">
      <input
        type="text"
        placeholder="Search artists..."
        bind:value={searchQuery}
        class="w-64 rounded border border-[hsl(var(--border))] bg-[hsl(var(--input))] px-3 py-1.5 font-mono text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))]"
      />
      <button
        type="submit"
        class="rounded bg-[hsl(var(--primary))] px-4 py-1.5 font-mono text-xs font-medium text-[hsl(var(--primary-foreground))] uppercase tracking-wide hover:bg-[hsl(var(--primary))]/90"
      >
        Filter
      </button>
    </form>
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
  {:else if data}
    {#if data.items.length === 0}
      <div class="py-12 text-center">
        <p class="font-mono text-sm text-[hsl(var(--muted-foreground))]">
          {searchQuery ? `No results for "${searchQuery}"` : 'No artists found'}
        </p>
      </div>
    {:else}
      <!-- Artist Grid -->
      <div class="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {#each data.items as artist}
          <a
            href="/artists/{artist.id}"
            class="console-panel group p-3 transition-colors hover:bg-[hsl(var(--accent))]"
          >
            <div class="aspect-square overflow-hidden rounded-full bg-[hsl(var(--muted))] ring-2 ring-[hsl(var(--border))] group-hover:ring-[hsl(var(--primary))] transition-all">
              {#if artist.imageUrl}
                <img
                  src={artist.imageUrl}
                  alt={artist.name}
                  class="h-full w-full object-cover"
                />
              {:else}
                <div class="flex h-full w-full items-center justify-center">
                  <span class="font-mono text-2xl text-[hsl(var(--muted-foreground))]">
                    {artist.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              {/if}
            </div>
            <div class="mt-3 text-center">
              <h3 class="truncate font-mono text-sm font-medium text-[hsl(var(--foreground))] group-hover:text-[hsl(var(--primary))]">
                {artist.name}
              </h3>
              {#if artist.trackCount}
                <p class="mt-1 font-mono text-xs text-[hsl(var(--muted-foreground))] tabular-nums">
                  {artist.trackCount} track{artist.trackCount === 1 ? '' : 's'}
                </p>
              {/if}
              {#if artist.genres}
                <div class="mt-2 flex flex-wrap justify-center gap-1">
                  {#each getGenreList(artist.genres) as genre}
                    <span class="rounded bg-[hsl(var(--muted))] px-1.5 py-0.5 font-mono text-[10px] text-[hsl(var(--muted-foreground))]">
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
        <div class="flex items-center justify-between pt-2">
          <span class="font-mono text-xs text-[hsl(var(--muted-foreground))]">
            Page {currentPage} of {data.totalPages}
          </span>
          <div class="flex gap-2">
            <button
              onclick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              class="rounded border border-[hsl(var(--border))] px-3 py-1 font-mono text-xs text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Prev
            </button>
            <button
              onclick={() => goToPage(currentPage + 1)}
              disabled={currentPage === data.totalPages}
              class="rounded border border-[hsl(var(--border))] px-3 py-1 font-mono text-xs text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      {/if}
    {/if}
  {/if}
</div>
