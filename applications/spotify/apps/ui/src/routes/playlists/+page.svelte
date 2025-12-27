<script lang="ts">
  import { onMount } from 'svelte';
  import { getPlaylists, formatNumber, type Playlist, type PaginatedResponse } from '$lib';

  let data: PaginatedResponse<Playlist> | null = $state(null);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let searchQuery = $state('');
  let currentPage = $state(1);
  const pageSize = 24;

  async function loadPlaylists() {
    loading = true;
    error = null;
    try {
      data = await getPlaylists(currentPage, pageSize, searchQuery || undefined);
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load playlists';
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    loadPlaylists();
  });

  function handleSearch(e: Event) {
    e.preventDefault();
    currentPage = 1;
    loadPlaylists();
  }

  function goToPage(page: number) {
    currentPage = page;
    loadPlaylists();
  }
</script>

<svelte:head>
  <title>Playlists - Spotify Sync PRO</title>
</svelte:head>

<div class="space-y-4">
  <!-- Header -->
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div class="flex items-baseline gap-3">
      <h1 class="font-mono text-xl font-semibold text-[hsl(var(--foreground))] uppercase tracking-wide">Playlists</h1>
      {#if data}
        <span class="font-mono text-xs text-[hsl(var(--muted-foreground))]">
          {formatNumber(data.total)} total
        </span>
      {/if}
    </div>

    <form onsubmit={handleSearch} class="flex gap-2">
      <input
        type="text"
        placeholder="Search playlists..."
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
          {searchQuery ? `No results for "${searchQuery}"` : 'No playlists found'}
        </p>
      </div>
    {:else}
      <!-- Playlist Grid -->
      <div class="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {#each data.items as playlist}
          <a
            href="/playlists/{playlist.id}"
            class="console-panel group p-3 transition-colors hover:bg-[hsl(var(--accent))]"
          >
            <div class="aspect-square overflow-hidden rounded bg-[hsl(var(--muted))]">
              {#if playlist.imageUrl}
                <img
                  src={playlist.imageUrl}
                  alt={playlist.name}
                  class="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
              {:else}
                <div class="flex h-full w-full items-center justify-center">
                  <svg class="h-12 w-12 text-[hsl(var(--muted-foreground))]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                </div>
              {/if}
            </div>
            <div class="mt-3">
              <h3 class="truncate font-mono text-sm font-medium text-[hsl(var(--foreground))] group-hover:text-[hsl(var(--primary))]">
                {playlist.name}
              </h3>
              <p class="mt-1 font-mono text-xs text-[hsl(var(--muted-foreground))]">
                <span class="tabular-nums">{playlist.tracksTotal ?? 0}</span> tracks
                {#if playlist.ownerName}
                  <span class="mx-1 text-[hsl(var(--border))]">|</span>
                  {playlist.ownerName}
                {/if}
              </p>
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
