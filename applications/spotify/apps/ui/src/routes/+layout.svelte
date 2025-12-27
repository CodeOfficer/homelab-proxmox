<script lang="ts">
  import '../app.css';
  import { page } from '$app/stores';

  let { children } = $props();

  const navItems = [
    { href: '/', label: 'Dashboard' },
    { href: '/playlists', label: 'Playlists' },
    { href: '/tracks', label: 'Tracks' },
    { href: '/artists', label: 'Artists' },
    { href: '/genres', label: 'Genres' },
    { href: '/search', label: 'Search' },
  ];

  function isActive(href: string): boolean {
    const path = $page.url.pathname;
    if (href === '/') return path === '/';
    return path.startsWith(href);
  }
</script>

<div class="min-h-screen bg-[hsl(var(--background))] flex flex-col">
  <!-- Console Header -->
  <nav class="border-b border-[hsl(var(--border))] bg-[hsl(var(--card))]">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div class="flex h-14 items-center justify-between">
        <!-- Brand -->
        <div class="flex items-center gap-3">
          <a href="/" class="flex items-center gap-2 group">
            <!-- Waveform Icon -->
            <div class="flex items-end gap-0.5 h-6">
              <div class="w-1 bg-[hsl(var(--primary))] rounded-sm h-3 group-hover:h-4 transition-all"></div>
              <div class="w-1 bg-[hsl(var(--primary))] rounded-sm h-5 group-hover:h-6 transition-all"></div>
              <div class="w-1 bg-[hsl(var(--primary))] rounded-sm h-4 group-hover:h-5 transition-all"></div>
              <div class="w-1 bg-[hsl(var(--secondary))] rounded-sm h-6 group-hover:h-5 transition-all"></div>
              <div class="w-1 bg-[hsl(var(--secondary))] rounded-sm h-3 group-hover:h-4 transition-all"></div>
            </div>
            <span class="font-mono text-lg font-semibold text-[hsl(var(--foreground))] tracking-tight">
              SPOTIFY<span class="text-[hsl(var(--primary))]">SYNC</span>
            </span>
          </a>
          <span class="rounded bg-[hsl(var(--primary))] px-1.5 py-0.5 text-[10px] font-bold text-[hsl(var(--primary-foreground))] tracking-wider">
            PRO
          </span>
        </div>

        <!-- Navigation -->
        <div class="flex items-center">
          {#each navItems as item}
            <a
              href={item.href}
              class="relative px-3 py-2 font-mono text-xs font-medium uppercase tracking-wide transition-colors
                {isActive(item.href)
                  ? 'text-[hsl(var(--primary))]'
                  : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'}"
            >
              {item.label}
              {#if isActive(item.href)}
                <span class="absolute bottom-0 left-3 right-3 h-0.5 bg-[hsl(var(--primary))]"></span>
              {/if}
            </a>
          {/each}
        </div>
      </div>
    </div>
  </nav>

  <!-- Main Content -->
  <main class="flex-1 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
    {@render children()}
  </main>

  <!-- Console Footer -->
  <footer class="border-t border-[hsl(var(--border))] bg-[hsl(var(--card))]">
    <div class="mx-auto max-w-7xl px-4 py-2 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between font-mono text-[10px] text-[hsl(var(--muted-foreground))] uppercase tracking-wide">
        <div class="flex items-center gap-4">
          <span>Offline Library Browser</span>
          <span class="flex items-center gap-1">
            <span class="h-1.5 w-1.5 rounded-full bg-[hsl(var(--vu-green))]"></span>
            Ready
          </span>
        </div>
        <div class="flex items-center gap-4">
          <span>v2.0.0</span>
        </div>
      </div>
    </div>
  </footer>
</div>
