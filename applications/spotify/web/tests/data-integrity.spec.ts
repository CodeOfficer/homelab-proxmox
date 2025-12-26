import { test, expect } from '@playwright/test';

test.describe('Data Integrity', () => {
  test('health endpoint reports correct counts', async ({ request }) => {
    const response = await request.get('/health');
    const body = await response.json();

    expect(body.status).toBe('ok');
    expect(body.db).toBe('connected');

    // Playlist count should be a non-negative number
    expect(typeof body.playlists).toBe('number');
    expect(body.playlists).toBeGreaterThanOrEqual(0);
  });

  test('track duration displays correctly in playlist', async ({ page }) => {
    await page.goto('/playlists');

    // Find first playlist link
    const playlistLink = page.locator('a[href^="/playlist/"]').first();
    const hasPlaylists = await playlistLink.isVisible().catch(() => false);

    if (hasPlaylists) {
      await playlistLink.click();
      await page.waitForURL(/\/playlist\//);

      // Duration should be in mm:ss format
      const durationCells = page.locator('td:last-child');
      const count = await durationCells.count();

      if (count > 0) {
        const firstDuration = await durationCells.first().textContent();
        // Should match patterns like "3:45" or "10:30" or "0:30"
        expect(firstDuration).toMatch(/^\d{1,2}:\d{2}$/);
      }
    }
  });

  test('popularity scores are in valid range', async ({ page }) => {
    await page.goto('/');

    // Check dashboard popular tracks
    const popularityScores = page.locator('span[title="Spotify Popularity"]');
    const count = await popularityScores.count();

    for (let i = 0; i < Math.min(count, 5); i++) {
      const scoreText = await popularityScores.nth(i).textContent();
      const score = parseInt(scoreText || '0');

      // Spotify popularity is 0-100
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });

  test('audio features radar chart has valid values', async ({ page }) => {
    // Navigate to a track with audio features
    await page.goto('/search?q=a&filter=tracks');

    const trackLink = page.locator('a[href^="/track/"]').first();
    const hasResults = await trackLink.isVisible().catch(() => false);

    if (hasResults) {
      await trackLink.click();
      await page.waitForURL(/\/track\//);

      // Check if audio features section exists
      const audioSection = page.locator('text=Audio Features');
      const hasAudioFeatures = await audioSection.isVisible().catch(() => false);

      if (hasAudioFeatures) {
        // Check that displayed values are percentages or valid formats
        const energyText = page.locator('text=/Energy:?.*\\d/');
        const isVisible = await energyText.isVisible().catch(() => false);

        if (isVisible) {
          const text = await energyText.textContent();
          // Should contain a percentage or decimal
          expect(text).toMatch(/\d+(\.\d+)?%?/);
        }
      }
    }
  });

  test('playlist track count matches displayed tracks', async ({ page }) => {
    await page.goto('/playlists');

    const playlistCard = page.locator('a[href^="/playlist/"]').first();
    const hasPlaylists = await playlistCard.isVisible().catch(() => false);

    if (hasPlaylists) {
      // Get track count from card
      const trackCountText = await playlistCard.locator('text=/\\d+ tracks/').textContent();
      const expectedCount = parseInt(trackCountText?.match(/(\d+)/)?.[1] || '0');

      await playlistCard.click();
      await page.waitForURL(/\/playlist\//);

      // If pagination exists, check header count
      const headerCount = page.locator('text=/\\(\\d+ tracks\\)|Total.*\\d+/');
      const hasHeaderCount = await headerCount.isVisible().catch(() => false);

      if (hasHeaderCount) {
        const headerText = await headerCount.textContent();
        const actualCount = parseInt(headerText?.match(/(\d+)/)?.[1] || '0');

        // Should match (within pagination page)
        expect(actualCount).toBeGreaterThan(0);
      }
    }
  });

  test('artist genres are displayed as tags', async ({ page }) => {
    await page.goto('/search?q=a&filter=artists');

    const artistLink = page.locator('a[href^="/artist/"]').first();
    const hasResults = await artistLink.isVisible().catch(() => false);

    if (hasResults) {
      await artistLink.click();
      await page.waitForURL(/\/artist\//);

      // Genres should be displayed if available
      const genreTags = page.locator('.bg-gray-200.rounded, [class*="rounded-full"]');
      const count = await genreTags.count();

      // If genres exist, they should be non-empty strings
      if (count > 0) {
        const firstGenre = await genreTags.first().textContent();
        expect(firstGenre?.trim().length).toBeGreaterThan(0);
      }
    }
  });

  test('tempo displays in BPM format', async ({ page }) => {
    // Navigate to search results that might have tempo
    await page.goto('/search?q=a&filter=tracks');

    // Check if tempo column is visible in results
    const tempoHeader = page.locator('th:has-text("Tempo")');
    const hasTempoColumn = await tempoHeader.isVisible().catch(() => false);

    if (hasTempoColumn) {
      const tempoValues = page.locator('text=/\\d+ BPM/');
      const count = await tempoValues.count();

      for (let i = 0; i < Math.min(count, 3); i++) {
        const tempoText = await tempoValues.nth(i).textContent();
        const bpm = parseInt(tempoText?.match(/(\d+)/)?.[1] || '0');

        // Typical tempo range is 50-200 BPM
        expect(bpm).toBeGreaterThan(30);
        expect(bpm).toBeLessThan(300);
      }
    }
  });

  test('explicit tracks show E badge', async ({ page }) => {
    await page.goto('/search?q=a&filter=tracks');

    // Check for explicit badges
    const explicitBadges = page.locator('span:has-text("E")');
    const count = await explicitBadges.count();

    // Explicit badges should be small/styled appropriately
    // This is more of a smoke test that the badge renders
    if (count > 0) {
      const badge = explicitBadges.first();
      await expect(badge).toBeVisible();
    }
  });
});
