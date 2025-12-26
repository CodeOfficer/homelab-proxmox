<script lang="ts">
  import '../app.css';

  let { children } = $props();

  const navItems = [
    { href: '/', label: 'Dashboard' },
    { href: '/playlists', label: 'Playlists' },
    { href: '/tracks', label: 'Tracks' },
    { href: '/artists', label: 'Artists' },
    { href: '/genres', label: 'Genres' },
    { href: '/search', label: 'Search' },
  ];
</script>

<div class="min-h-screen bg-[hsl(var(--background))]">
  <nav class="border-b border-[hsl(var(--border))] bg-[hsl(var(--card))]">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div class="flex h-16 items-center justify-between">
        <div class="flex items-center">
          <a href="/" class="flex items-center gap-2">
            <svg
              class="h-8 w-8 text-[hsl(var(--primary))]"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path
                d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"
              />
            </svg>
            <span class="text-xl font-bold text-[hsl(var(--foreground))]">Spotify Sync</span>
          </a>
        </div>

        <div class="flex items-center gap-1">
          {#each navItems as item}
            <a
              href={item.href}
              class="rounded-md px-3 py-2 text-sm font-medium text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]"
            >
              {item.label}
            </a>
          {/each}
        </div>
      </div>
    </div>
  </nav>

  <main class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    {@render children()}
  </main>
</div>
