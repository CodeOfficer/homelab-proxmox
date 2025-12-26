<script lang="ts">
  import { onMount } from 'svelte';
  import { getTracks, formatDuration, formatNumber, type Track, type PaginatedResponse } from '$lib';

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
  <title>Tracks - Spotify Sync</title>
</svelte:head>

<div class="space-y-6">
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h1 class="text-3xl font-bold text-[hsl(var(--foreground))]">Tracks</h1>
      {#if data}
        <p class="mt-1 text-[hsl(var(--muted-foreground))]">{formatNumber(data.total)} tracks</p>
      {/if}
    </div>

    <form onsubmit={handleSearch} class="flex gap-2">
      <input
        type="text"
        placeholder="Search tracks..."
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
        {searchQuery ? `No tracks found for "${searchQuery}"` : 'No tracks found'}
      </div>
    {:else}
      <div class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
        <div class="grid grid-cols-[1fr_1fr_auto_auto] gap-4 border-b border-[hsl(var(--border))] px-4 py-3 text-sm font-medium text-[hsl(var(--muted-foreground))]">
          <span>Title</span>
          <span>Album</span>
          <span class="w-16 text-center">Pop.</span>
          <span class="w-16 text-right">Duration</span>
        </div>

        <div class="divide-y divide-[hsl(var(--border))]">
          {#each data.items as track}
            <a
              href="/tracks/{track.id}"
              class="grid grid-cols-[1fr_1fr_auto_auto] items-center gap-4 px-4 py-3 transition-colors hover:bg-[hsl(var(--accent))]"
            >
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
                  <p class="truncate font-medium text-[hsl(var(--foreground))]">
                    {track.name}
                    {#if track.explicit}
                      <span class="ml-1 rounded bg-[hsl(var(--muted))] px-1 text-xs text-[hsl(var(--muted-foreground))]">E</span>
                    {/if}
                  </p>
                  {#if track.primaryArtistName}
                    <p class="truncate text-sm text-[hsl(var(--muted-foreground))]">{track.primaryArtistName}</p>
                  {/if}
                </div>
              </div>
              <span class="truncate text-sm text-[hsl(var(--muted-foreground))]">{track.albumName ?? ''}</span>
              <span class="w-16 text-center text-sm text-[hsl(var(--muted-foreground))]">{track.popularity ?? '-'}</span>
              <span class="w-16 text-right text-sm text-[hsl(var(--muted-foreground))]">
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
  {/if}
</div>
