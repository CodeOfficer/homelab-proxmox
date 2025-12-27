<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { searchTracks, formatDuration, formatNumber, type Track, type PaginatedResponse, type SearchFilters } from '$lib';
  import VuMeter from '$lib/components/ui/VuMeter.svelte';

  let data: PaginatedResponse<Track> | null = $state(null);
  let loading = $state(false);
  let error = $state<string | null>(null);
  let currentPage = $state(1);
  const pageSize = 50;

  // Search filters
  let query = $state('');
  let genre = $state<string | undefined>(undefined);
  let popularityMin = $state<number | undefined>(undefined);
  let popularityMax = $state<number | undefined>(undefined);
  let explicit = $state<boolean | undefined>(undefined);

  let showFilters = $state(false);

  function getFilters(): SearchFilters {
    return {
      q: query || undefined,
      genre,
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
      genre = genreParam;
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
    genre = undefined;
    popularityMin = undefined;
    popularityMax = undefined;
    explicit = undefined;
    data = null;
  }

  function clearGenre() {
    genre = undefined;
    if (query || hasActiveFilters()) {
      performSearch();
    } else {
      data = null;
    }
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
  <title>Search - Spotify Sync PRO</title>
</svelte:head>

<div class="space-y-4">
  <!-- Header -->
  <div class="flex items-baseline gap-3">
    <h1 class="font-mono text-xl font-semibold text-[hsl(var(--foreground))] uppercase tracking-wide">Search</h1>
    <span class="font-mono text-xs text-[hsl(var(--muted-foreground))]">Find tracks by name or artist</span>
  </div>

  <!-- Search Form -->
  <form onsubmit={handleSearch} class="space-y-3">
    <div class="flex gap-2">
      <input
        type="text"
        placeholder="Search tracks, artists, albums..."
        bind:value={query}
        class="flex-1 rounded border border-[hsl(var(--border))] bg-[hsl(var(--input))] px-3 py-2 font-mono text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))]"
      />
      <button
        type="button"
        onclick={() => showFilters = !showFilters}
        class="rounded border border-[hsl(var(--border))] px-4 py-2 font-mono text-xs text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))] {hasActiveFilters() ? 'border-[hsl(var(--primary))] text-[hsl(var(--primary))]' : ''}"
      >
        Filters {hasActiveFilters() ? '(active)' : ''}
      </button>
      <button
        type="submit"
        class="rounded bg-[hsl(var(--primary))] px-6 py-2 font-mono text-xs font-medium text-[hsl(var(--primary-foreground))] uppercase tracking-wide hover:bg-[hsl(var(--primary))]/90"
      >
        Search
      </button>
    </div>

    <!-- Filter Panel -->
    {#if showFilters}
      <div class="console-panel p-4">
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <!-- Popularity -->
          <div>
            <span class="font-mono text-xs text-[hsl(var(--foreground))] uppercase tracking-wide block mb-2">Popularity</span>
            <div class="flex gap-2 items-center">
              <input
                type="number"
                placeholder="Min"
                aria-label="Minimum popularity"
                bind:value={popularityMin}
                min="0"
                max="100"
                class="w-full rounded border border-[hsl(var(--border))] bg-[hsl(var(--input))] px-2 py-1.5 font-mono text-sm text-[hsl(var(--foreground))]"
              />
              <span class="text-[hsl(var(--muted-foreground))]">-</span>
              <input
                type="number"
                placeholder="Max"
                aria-label="Maximum popularity"
                bind:value={popularityMax}
                min="0"
                max="100"
                class="w-full rounded border border-[hsl(var(--border))] bg-[hsl(var(--input))] px-2 py-1.5 font-mono text-sm text-[hsl(var(--foreground))]"
              />
            </div>
          </div>

          <!-- Explicit -->
          <div>
            <label for="explicit-filter" class="font-mono text-xs text-[hsl(var(--foreground))] uppercase tracking-wide block mb-2">Explicit Content</label>
            <select
              id="explicit-filter"
              bind:value={explicit}
              class="w-full rounded border border-[hsl(var(--border))] bg-[hsl(var(--input))] px-2 py-1.5 font-mono text-sm text-[hsl(var(--foreground))]"
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
            class="font-mono text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
          >
            Clear all filters
          </button>
        </div>
      </div>
    {/if}
  </form>

  <!-- Active Genre Filter -->
  {#if genre}
    <div class="flex items-center gap-2">
      <span class="font-mono text-xs text-[hsl(var(--muted-foreground))] uppercase">Genre:</span>
      <span class="inline-flex items-center gap-1 rounded border border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/10 px-2 py-1 font-mono text-xs text-[hsl(var(--primary))]">
        {genre}
        <button
          type="button"
          onclick={clearGenre}
          class="ml-1 hover:text-[hsl(var(--destructive))]"
          aria-label="Clear genre filter"
        >
          &times;
        </button>
      </span>
    </div>
  {/if}

  <!-- Results -->
  {#if loading}
    <div class="flex items-center justify-center py-12">
      <div class="flex items-center gap-3 text-[hsl(var(--muted-foreground))]">
        <div class="h-5 w-5 animate-spin rounded-full border-2 border-[hsl(var(--primary))] border-t-transparent"></div>
        <span class="font-mono text-xs uppercase tracking-wide">Searching...</span>
      </div>
    </div>
  {:else if error}
    <div class="console-panel p-4">
      <p class="font-mono text-sm text-[hsl(var(--destructive))]">{error}</p>
    </div>
  {:else if data}
    <div class="flex items-center justify-between">
      <p class="font-mono text-xs text-[hsl(var(--muted-foreground))]">
        {formatNumber(data.total)} result{data.total === 1 ? '' : 's'}
      </p>
    </div>

    {#if data.items.length === 0}
      <div class="py-12 text-center">
        <p class="font-mono text-sm text-[hsl(var(--muted-foreground))]">
          No tracks found matching your criteria
        </p>
      </div>
    {:else}
      <!-- Results Table -->
      <div class="console-panel overflow-hidden">
        <table class="data-table w-full">
          <thead>
            <tr class="bg-[hsl(var(--muted))]">
              <th>Track</th>
              <th>Artist</th>
              <th class="w-24">Level</th>
              <th class="w-16 text-right">Time</th>
            </tr>
          </thead>
          <tbody>
            {#each data.items as track}
              <tr class="group">
                <td>
                  <a href="/tracks/{track.id}" class="flex items-center gap-3 group-hover:text-[hsl(var(--primary))]">
                    {#if track.albumImageUrl}
                      <img
                        src={track.albumImageUrl}
                        alt=""
                        class="h-8 w-8 flex-shrink-0 rounded object-cover"
                      />
                    {:else}
                      <div class="h-8 w-8 flex-shrink-0 rounded bg-[hsl(var(--muted))]"></div>
                    {/if}
                    <span class="truncate">
                      {track.name}
                      {#if track.explicit}
                        <span class="ml-1 rounded bg-[hsl(var(--destructive))] px-1 text-[10px] font-bold text-[hsl(var(--destructive-foreground))]">E</span>
                      {/if}
                    </span>
                  </a>
                </td>
                <td class="truncate text-[hsl(var(--muted-foreground))]">
                  {track.primaryArtistName ?? '-'}
                </td>
                <td>
                  <VuMeter value={track.popularity ?? 0} segments={10} size="sm" />
                </td>
                <td class="text-right tabular-nums text-[hsl(var(--muted-foreground))]">
                  {track.durationMs ? formatDuration(track.durationMs) : '--:--'}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
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
  {:else}
    <div class="py-12 text-center">
      <p class="font-mono text-sm text-[hsl(var(--muted-foreground))]">
        Enter a search query or adjust filters to find tracks
      </p>
    </div>
  {/if}
</div>
