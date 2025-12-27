<script lang="ts">
  import { onMount } from 'svelte';
  import { getTracks, formatDuration, formatNumber, type Track, type PaginatedResponse } from '$lib';
  import VuMeter from '$lib/components/ui/VuMeter.svelte';

  let data: PaginatedResponse<Track> | null = $state(null);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let searchQuery = $state('');
  let currentPage = $state(1);
  const pageSize = 50;

  async function loadTracks() {
    loading = true;
    error = null;
    try {
      data = await getTracks(currentPage, pageSize, searchQuery || undefined);
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load tracks';
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    loadTracks();
  });

  function handleSearch(e: Event) {
    e.preventDefault();
    currentPage = 1;
    loadTracks();
  }

  function goToPage(page: number) {
    currentPage = page;
    loadTracks();
  }
</script>

<svelte:head>
  <title>Tracks - Spotify Sync PRO</title>
</svelte:head>

<div class="space-y-4">
  <!-- Header -->
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div class="flex items-baseline gap-3">
      <h1 class="font-mono text-xl font-semibold text-[hsl(var(--foreground))] uppercase tracking-wide">Tracks</h1>
      {#if data}
        <span class="font-mono text-xs text-[hsl(var(--muted-foreground))]">
          {formatNumber(data.total)} total
        </span>
      {/if}
    </div>

    <form onsubmit={handleSearch} class="flex gap-2">
      <input
        type="text"
        placeholder="Filter tracks..."
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
          {searchQuery ? `No results for "${searchQuery}"` : 'No tracks found'}
        </p>
      </div>
    {:else}
      <!-- Data Table -->
      <div class="console-panel overflow-hidden">
        <table class="data-table w-full">
          <thead>
            <tr class="bg-[hsl(var(--muted))]">
              <th class="w-10">#</th>
              <th>Title</th>
              <th>Artist</th>
              <th>Album</th>
              <th class="w-24">Level</th>
              <th class="w-16 text-right">Time</th>
            </tr>
          </thead>
          <tbody>
            {#each data.items as track, i}
              <tr class="group">
                <td class="text-[hsl(var(--muted-foreground))] tabular-nums">
                  {(currentPage - 1) * pageSize + i + 1}
                </td>
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
                <td class="truncate text-[hsl(var(--muted-foreground))]">
                  {track.albumName ?? '-'}
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
  {/if}
</div>
