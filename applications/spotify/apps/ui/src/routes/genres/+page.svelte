<script lang="ts">
  import { onMount } from 'svelte';
  import { getGenres, formatNumber, type GenreCount } from '$lib';

  let genres: GenreCount[] = $state([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let searchQuery = $state('');

  async function loadGenres() {
    loading = true;
    error = null;
    try {
      const data = await getGenres(searchQuery || undefined);
      genres = data.items;
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load genres';
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    loadGenres();
  });

  function handleSearch(e: Event) {
    e.preventDefault();
    loadGenres();
  }

  function getMaxCount(): number {
    if (genres.length === 0) return 1;
    return Math.max(...genres.map(g => g.count));
  }

  function getSizeClass(count: number): string {
    const max = getMaxCount();
    const ratio = count / max;
    if (ratio > 0.8) return 'text-2xl font-bold';
    if (ratio > 0.5) return 'text-xl font-semibold';
    if (ratio > 0.3) return 'text-lg font-medium';
    if (ratio > 0.1) return 'text-base';
    return 'text-sm';
  }
</script>

<svelte:head>
  <title>Genres - Spotify Sync</title>
</svelte:head>

<div class="space-y-6">
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h1 class="text-3xl font-bold text-[hsl(var(--foreground))]">Genres</h1>
      <p class="mt-1 text-[hsl(var(--muted-foreground))]">{formatNumber(genres.length)} genres</p>
    </div>

    <form onsubmit={handleSearch} class="flex gap-2">
      <input
        type="text"
        placeholder="Search genres..."
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
  {:else if genres.length === 0}
    <div class="py-12 text-center text-[hsl(var(--muted-foreground))]">
      {searchQuery ? `No genres found for "${searchQuery}"` : 'No genres found'}
    </div>
  {:else}
    <!-- Genre Cloud -->
    <div class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
      <div class="flex flex-wrap gap-3">
        {#each genres as genre}
          <a
            href="/search?genre={encodeURIComponent(genre.genre)}"
            class="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 py-2 transition-colors hover:bg-[hsl(var(--accent))] {getSizeClass(genre.count)}"
          >
            <span class="text-[hsl(var(--foreground))]">{genre.genre}</span>
            <span class="text-[hsl(var(--muted-foreground))] text-sm font-normal">{formatNumber(genre.count)}</span>
          </a>
        {/each}
      </div>
    </div>

    <!-- Genre List -->
    <div class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
      <div class="grid grid-cols-[1fr_auto] gap-4 border-b border-[hsl(var(--border))] px-4 py-3 text-sm font-medium text-[hsl(var(--muted-foreground))]">
        <span>Genre</span>
        <span class="w-20 text-right">Tracks</span>
      </div>

      <div class="divide-y divide-[hsl(var(--border))]">
        {#each genres.slice(0, 100) as genre}
          <a
            href="/search?genre={encodeURIComponent(genre.genre)}"
            class="grid grid-cols-[1fr_auto] items-center gap-4 px-4 py-3 transition-colors hover:bg-[hsl(var(--accent))]"
          >
            <span class="font-medium text-[hsl(var(--foreground))]">{genre.genre}</span>
            <div class="flex items-center gap-3 w-40">
              <div class="flex-1 h-2 overflow-hidden rounded-full bg-[hsl(var(--muted))]">
                <div
                  class="h-full rounded-full bg-[hsl(var(--primary))]"
                  style="width: {(genre.count / getMaxCount()) * 100}%"
                ></div>
              </div>
              <span class="w-12 text-right text-sm text-[hsl(var(--muted-foreground))]">{formatNumber(genre.count)}</span>
            </div>
          </a>
        {/each}
      </div>

      {#if genres.length > 100}
        <div class="border-t border-[hsl(var(--border))] px-4 py-3 text-center text-sm text-[hsl(var(--muted-foreground))]">
          Showing 100 of {formatNumber(genres.length)} genres. Use search to filter.
        </div>
      {/if}
    </div>
  {/if}
</div>
