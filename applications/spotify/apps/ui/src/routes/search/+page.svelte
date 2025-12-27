<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { searchTracks, formatDuration, formatNumber, type Track, type PaginatedResponse, type SearchFilters } from '$lib';

  let data: PaginatedResponse<Track> | null = $state(null);
  let loading = $state(false);
  let error = $state<string | null>(null);
  let currentPage = $state(1);
  const pageSize = 50;

  // Search filters
  let query = $state('');
  let popularityMin = $state<number | undefined>(undefined);
  let popularityMax = $state<number | undefined>(undefined);
  let explicit = $state<boolean | undefined>(undefined);

  let showFilters = $state(false);

  function getFilters(): SearchFilters {
    return {
      q: query || undefined,
      popularityMin,
      popularityMax,
      explicit,
    };
  }

  async function performSearch() {
    loading = true;
    error = null;
    try {
      data = await searchTracks(getFilters(), currentPage, pageSize);
    } catch (e) {
      error = e instanceof Error ? e.message : 'Search failed';
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    // Check for genre query param from genres page
    const genreParam = $page.url.searchParams.get('genre');
    if (genreParam) {
      query = genreParam;
      performSearch();
    }
  });

  function handleSearch(e: Event) {
    e.preventDefault();
    currentPage = 1;
    performSearch();
  }

  function clearFilters() {
    query = '';
    popularityMin = undefined;
    popularityMax = undefined;
    explicit = undefined;
    data = null;
  }

  function goToPage(page: number) {
    currentPage = page;
    performSearch();
  }

  function hasActiveFilters(): boolean {
    return popularityMin !== undefined || popularityMax !== undefined ||
           explicit !== undefined;
  }
</script>

<svelte:head>
  <title>Search - Spotify Sync</title>
</svelte:head>

<div class="space-y-6">
  <div>
    <h1 class="text-3xl font-bold text-[hsl(var(--foreground))]">Search</h1>
    <p class="mt-1 text-[hsl(var(--muted-foreground))]">Find tracks by name or artist</p>
  </div>

  <form onsubmit={handleSearch} class="space-y-4">
    <!-- Main Search -->
    <div class="flex gap-2">
      <input
        type="text"
        placeholder="Search tracks, artists, albums..."
        bind:value={query}
        class="flex-1 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 py-2 text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
      />
      <button
        type="button"
        onclick={() => showFilters = !showFilters}
        class="rounded-md border border-[hsl(var(--border))] px-4 py-2 text-sm text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))] {hasActiveFilters() ? 'bg-[hsl(var(--primary))]/10' : ''}"
      >
        Filters {hasActiveFilters() ? '(active)' : ''}
      </button>
      <button
        type="submit"
        class="rounded-md bg-[hsl(var(--primary))] px-6 py-2 text-sm font-medium text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary))]/90"
      >
        Search
      </button>
    </div>

    <!-- Filter Panel -->
    {#if showFilters}
      <div class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <!-- Popularity -->
          <div>
            <label class="text-sm font-medium text-[hsl(var(--foreground))]">Popularity</label>
            <div class="mt-1 flex gap-2">
              <input
                type="number"
                placeholder="Min"
                bind:value={popularityMin}
                min="0"
                max="100"
                class="w-full rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-1.5 text-sm text-[hsl(var(--foreground))]"
              />
              <span class="py-1.5 text-[hsl(var(--muted-foreground))]">-</span>
              <input
                type="number"
                placeholder="Max"
                bind:value={popularityMax}
                min="0"
                max="100"
                class="w-full rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-1.5 text-sm text-[hsl(var(--foreground))]"
              />
            </div>
          </div>

          <!-- Explicit -->
          <div>
            <label class="text-sm font-medium text-[hsl(var(--foreground))]">Explicit Content</label>
            <select
              bind:value={explicit}
              class="mt-1 w-full rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-1.5 text-sm text-[hsl(var(--foreground))]"
            >
              <option value={undefined}>Any</option>
              <option value={true}>Explicit only</option>
              <option value={false}>Clean only</option>
            </select>
          </div>
        </div>

        <div class="mt-4 flex justify-end">
          <button
            type="button"
            onclick={clearFilters}
            class="text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
          >
            Clear all filters
          </button>
        </div>
      </div>
    {/if}
  </form>

  <!-- Results -->
  {#if loading}
    <div class="flex items-center justify-center py-12">
      <div class="h-8 w-8 animate-spin rounded-full border-4 border-[hsl(var(--primary))] border-t-transparent"></div>
    </div>
  {:else if error}
    <div class="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
      {error}
    </div>
  {:else if data}
    <div class="flex items-center justify-between">
      <p class="text-sm text-[hsl(var(--muted-foreground))]">
        {formatNumber(data.total)} result{data.total === 1 ? '' : 's'}
      </p>
    </div>

    {#if data.items.length === 0}
      <div class="py-12 text-center text-[hsl(var(--muted-foreground))]">
        No tracks found matching your criteria
      </div>
    {:else}
      <div class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
        <div class="divide-y divide-[hsl(var(--border))]">
          {#each data.items as track}
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
                <p class="truncate text-sm text-[hsl(var(--muted-foreground))]">
                  {track.primaryArtistName ?? ''}{track.albumName ? ` · ${track.albumName}` : ''}
                </p>
              </div>
              <span class="text-sm text-[hsl(var(--muted-foreground))]">
                {track.durationMs ? formatDuration(track.durationMs) : '--:--'}
              </span>
            </a>
          {/each}
        </div>
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
  {:else}
    <div class="py-12 text-center text-[hsl(var(--muted-foreground))]">
      Enter a search query or adjust filters to find tracks
    </div>
  {/if}
</div>
