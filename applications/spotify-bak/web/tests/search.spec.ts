import { test, expect } from '@playwright/test';

test.describe('Search', () => {
  test('search page has form elements', async ({ page }) => {
    await page.goto('/search');

    // Search input
    const searchInput = page.getByPlaceholder(/Search tracks, artists, playlists/i);
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toBeEnabled();

    // Filter dropdown
    const filterSelect = page.locator('select[name="filter"]');
    await expect(filterSelect).toBeVisible();

    // Submit button
    const searchButton = page.getByRole('button', { name: /Search/i });
    await expect(searchButton).toBeVisible();
  });

  test('empty search shows prompt', async ({ page }) => {
    await page.goto('/search');

    // Should prompt user to enter query
    const promptText = page.locator('text=/Please enter a search query|Search Your Library/i');
    await expect(promptText).toBeVisible();
  });

  test('filter options are correct', async ({ page }) => {
    await page.goto('/search');

    const filterSelect = page.locator('select[name="filter"]');

    // Check all filter options exist
    await expect(filterSelect.locator('option[value="all"]')).toHaveText('All');
    await expect(filterSelect.locator('option[value="tracks"]')).toHaveText('Tracks');
    await expect(filterSelect.locator('option[value="artists"]')).toHaveText('Artists');
    await expect(filterSelect.locator('option[value="playlists"]')).toHaveText('Playlists');
    await expect(filterSelect.locator('option[value="genre"]')).toHaveText('Genre');
  });

  test('search with query displays results or no results', async ({ page }) => {
    await page.goto('/search?q=test&filter=all');

    // Should show either results or "No results found"
    await page.waitForSelector('text=/Found|No results/i', { timeout: 5000 });

    const resultsMessage = page.locator('text=/Found.*result|No results found/i');
    await expect(resultsMessage).toBeVisible();
  });

  test('search preserves query in input', async ({ page }) => {
    const query = 'testquery123';
    await page.goto(`/search?q=${query}`);

    const searchInput = page.locator('input[name="q"]');
    await expect(searchInput).toHaveValue(query);
  });

  test('search preserves filter selection', async ({ page }) => {
    await page.goto('/search?q=test&filter=artists');

    const filterSelect = page.locator('select[name="filter"]');
    await expect(filterSelect).toHaveValue('artists');
  });

  test('tracks filter shows only tracks section', async ({ page }) => {
    await page.goto('/search?q=a&filter=tracks');

    // When filtering by tracks, should only show tracks section (if results exist)
    const tracksSection = page.locator('text=Tracks (');
    const hasResults = await tracksSection.isVisible().catch(() => false);

    if (hasResults) {
      // Artists and Playlists sections should not be visible or be empty
      const artistsSection = page.locator('h2:has-text("Artists (")');
      const playlistsSection = page.locator('h2:has-text("Playlists (")');

      // These should either not exist or show 0 results
      const artistsVisible = await artistsSection.isVisible().catch(() => false);
      const playlistsVisible = await playlistsSection.isVisible().catch(() => false);

      // When filtering, other sections shouldn't appear
      expect(artistsVisible || playlistsVisible).toBeFalsy();
    }
  });

  test('genre search works', async ({ page }) => {
    await page.goto('/search?q=rock&filter=genre');

    // Should attempt genre search
    const resultsOrEmpty = page.locator('text=/Found|No results/i');
    await expect(resultsOrEmpty).toBeVisible();
  });

  test('clicking track result navigates to detail', async ({ page }) => {
    await page.goto('/search?q=a&filter=tracks');

    // Find first track link
    const trackLink = page.locator('a[href^="/track/"]').first();
    const hasResults = await trackLink.isVisible().catch(() => false);

    if (hasResults) {
      const href = await trackLink.getAttribute('href');
      await trackLink.click();

      // Should navigate to track detail page
      await expect(page).toHaveURL(new RegExp(href!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    }
  });

  test('clicking artist result navigates to detail', async ({ page }) => {
    await page.goto('/search?q=a&filter=artists');

    const artistLink = page.locator('a[href^="/artist/"]').first();
    const hasResults = await artistLink.isVisible().catch(() => false);

    if (hasResults) {
      const href = await artistLink.getAttribute('href');
      await artistLink.click();

      await expect(page).toHaveURL(new RegExp(href!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    }
  });

  test('clicking playlist result navigates to detail', async ({ page }) => {
    await page.goto('/search?q=a&filter=playlists');

    const playlistLink = page.locator('a[href^="/playlist/"]').first();
    const hasResults = await playlistLink.isVisible().catch(() => false);

    if (hasResults) {
      const href = await playlistLink.getAttribute('href');
      await playlistLink.click();

      await expect(page).toHaveURL(new RegExp(href!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    }
  });
});
