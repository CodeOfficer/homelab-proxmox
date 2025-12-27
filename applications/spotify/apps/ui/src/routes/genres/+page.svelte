<script lang="ts">
  import { onMount } from 'svelte';
  import { getGenres, formatNumber, type GenreCount } from '$lib';
  import VuMeter from '$lib/components/ui/VuMeter.svelte';

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

  function getVuValue(count: number): number {
    return Math.round((count / getMaxCount()) * 100);
  }
</script>

<svelte:head>
  <title>Genres - Spotify Sync PRO</title>
</svelte:head>

<div class="space-y-4">
  <!-- Header -->
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div class="flex items-baseline gap-3">
      <h1 class="font-mono text-xl font-semibold text-[hsl(var(--foreground))] uppercase tracking-wide">Genres</h1>
      <span class="font-mono text-xs text-[hsl(var(--muted-foreground))]">
        {formatNumber(genres.length)} total
      </span>
    </div>

    <form onsubmit={handleSearch} class="flex gap-2">
      <input
        type="text"
        placeholder="Search genres..."
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
  {:else if genres.length === 0}
    <div class="py-12 text-center">
      <p class="font-mono text-sm text-[hsl(var(--muted-foreground))]">
        {searchQuery ? `No results for "${searchQuery}"` : 'No genres found'}
      </p>
    </div>
  {:else}
    <!-- Genre Tags Cloud -->
    <div class="console-panel p-4">
      <div class="flex items-center justify-between border-b border-[hsl(var(--border))] pb-3 mb-4">
        <h2 class="font-mono text-xs font-medium text-[hsl(var(--foreground))] uppercase tracking-wide">Tag Cloud</h2>
      </div>
      <div class="flex flex-wrap gap-2">
        {#each genres.slice(0, 50) as genre}
          <a
            href="/search?genre={encodeURIComponent(genre.genre)}"
            class="rounded border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2 py-1 font-mono text-xs text-[hsl(var(--foreground))] transition-colors hover:border-[hsl(var(--primary))] hover:text-[hsl(var(--primary))]"
          >
            {genre.genre}
          </a>
        {/each}
      </div>
    </div>

    <!-- Genre List with VU Meters -->
    <div class="console-panel overflow-hidden">
      <table class="data-table w-full">
        <thead>
          <tr class="bg-[hsl(var(--muted))]">
            <th class="w-10">#</th>
            <th>Genre</th>
            <th class="w-32">Level</th>
            <th class="w-20 text-right">Tracks</th>
          </tr>
        </thead>
        <tbody>
          {#each genres.slice(0, 100) as genre, i}
            <tr class="group">
              <td class="text-[hsl(var(--muted-foreground))] tabular-nums">{i + 1}</td>
              <td>
                <a
                  href="/search?genre={encodeURIComponent(genre.genre)}"
                  class="group-hover:text-[hsl(var(--primary))]"
                >
                  {genre.genre}
                </a>
              </td>
              <td>
                <VuMeter value={getVuValue(genre.count)} segments={10} size="sm" />
              </td>
              <td class="text-right tabular-nums text-[hsl(var(--muted-foreground))]">
                {formatNumber(genre.count)}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>

      {#if genres.length > 100}
        <div class="border-t border-[hsl(var(--border))] px-4 py-3 text-center">
          <span class="font-mono text-xs text-[hsl(var(--muted-foreground))]">
            Showing 100 of {formatNumber(genres.length)} genres
          </span>
        </div>
      {/if}
    </div>
  {/if}
</div>
