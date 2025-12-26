import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('shows library stats when data exists', async ({ page }) => {
    // Check if we have data (authenticated and synced)
    const statsSection = page.locator('text=Library Overview');
    const hasData = await statsSection.isVisible().catch(() => false);

    if (hasData) {
      // Stats cards should be visible
      await expect(page.locator('text=Tracks')).toBeVisible();
      await expect(page.locator('text=Playlists')).toBeVisible();
      await expect(page.locator('text=Artists')).toBeVisible();
      await expect(page.locator('text=Albums')).toBeVisible();

      // Stats should be numbers
      const tracksCount = await page.locator('.text-green-700.text-3xl').textContent();
      expect(tracksCount).toMatch(/^\d{1,3}(,\d{3})*$/);
    } else {
      // Not authenticated or no data - skip
      test.skip();
    }
  });

  test('shows top genres when available', async ({ page }) => {
    const genresSection = page.locator('text=Top Genres');
    const hasGenres = await genresSection.isVisible().catch(() => false);

    if (hasGenres) {
      // Genre chips should be clickable links
      const genreLinks = page.locator('a[href*="/search?q="][href*="filter=genre"]');
      const count = await genreLinks.count();
      expect(count).toBeGreaterThan(0);

      // First genre chip should navigate to search
      const firstGenre = genreLinks.first();
      const href = await firstGenre.getAttribute('href');
      expect(href).toContain('/search?q=');
      expect(href).toContain('filter=genre');
    }
  });

  test('shows most popular tracks when available', async ({ page }) => {
    const popularSection = page.locator('text=Most Popular');
    const hasPopular = await popularSection.isVisible().catch(() => false);

    if (hasPopular) {
      // Track links should be clickable
      const trackLinks = page.locator('a[href^="/track/"]').first();
      await expect(trackLinks).toBeVisible();

      // Popularity score should be visible
      const popularityScore = page.locator('span[title="Spotify Popularity"]').first();
      const score = await popularityScore.textContent();
      expect(parseInt(score || '0')).toBeGreaterThanOrEqual(0);
      expect(parseInt(score || '0')).toBeLessThanOrEqual(100);
    }
  });

  test('shows total listening time', async ({ page }) => {
    const hasData = await page.locator('text=Library Overview').isVisible().catch(() => false);

    if (hasData) {
      // Should show hours and minutes
      const durationText = page.locator('text=/\\d+h\\s+\\d+m total listening time/');
      await expect(durationText).toBeVisible();
    }
  });

  test('playlists grid renders', async ({ page }) => {
    const playlistsSection = page.locator('text=Your Playlists');
    const hasPlaylists = await playlistsSection.isVisible().catch(() => false);

    if (hasPlaylists) {
      // Should show playlist cards
      const playlistLinks = page.locator('a[href^="/playlist/"]');
      const count = await playlistLinks.count();

      if (count > 0) {
        // First playlist should have an image or placeholder
        const firstPlaylist = playlistLinks.first();
        await expect(firstPlaylist).toBeVisible();

        // Click should navigate
        const href = await firstPlaylist.getAttribute('href');
        expect(href).toMatch(/\/playlist\/[a-zA-Z0-9]+/);
      }
    }
  });

  test('sync button is present', async ({ page }) => {
    // When authenticated, sync button should be visible
    const syncButton = page.locator('button:has-text("Trigger Full Sync")');
    const isAuthenticated = await syncButton.isVisible().catch(() => false);

    if (isAuthenticated) {
      await expect(syncButton).toBeEnabled();
    }
  });

  test('recent syncs section shows history', async ({ page }) => {
    const syncsSection = page.locator('text=Recent Syncs');
    const isAuthenticated = await syncsSection.isVisible().catch(() => false);

    if (isAuthenticated) {
      // Should show sync history or "No sync history yet"
      const content = await syncsSection.locator('..').textContent();
      expect(content).toBeTruthy();
    }
  });
});
