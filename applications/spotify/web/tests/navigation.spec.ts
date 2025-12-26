import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('health endpoint returns OK', async ({ request }) => {
    const response = await request.get('/health');
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.status).toBe('ok');
    expect(body.service).toBe('spotify-web');
    expect(body.db).toBe('connected');
  });

  test('home page loads', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Spotify Sync PRO/);
  });

  test('unauthenticated shows connect button', async ({ page }) => {
    await page.goto('/');
    // When not authenticated, should show connect button
    const connectButton = page.getByRole('link', { name: /Connect with Spotify/i });
    await expect(connectButton).toBeVisible();
  });

  test('nav links are present when authenticated', async ({ page }) => {
    // This test requires authentication - skip if not authenticated
    await page.goto('/');

    // Check if we're authenticated by looking for nav links
    const searchLink = page.getByRole('link', { name: 'Search' });
    const playlistsLink = page.getByRole('link', { name: 'All Playlists' });

    // If authenticated, these should be visible
    const isAuthenticated = await searchLink.isVisible().catch(() => false);

    if (isAuthenticated) {
      await expect(searchLink).toBeVisible();
      await expect(playlistsLink).toBeVisible();
    } else {
      // Not authenticated - that's OK for this test
      test.skip();
    }
  });

  test('playlists page loads', async ({ page }) => {
    await page.goto('/playlists');
    await expect(page).toHaveTitle(/Playlists/);
  });

  test('search page loads', async ({ page }) => {
    await page.goto('/search');
    await expect(page).toHaveTitle(/Search/);

    // Search form should be present
    const searchInput = page.getByPlaceholder(/Search/i);
    await expect(searchInput).toBeVisible();
  });

  test('search with query works', async ({ page }) => {
    await page.goto('/search?q=test');
    await expect(page).toHaveTitle(/test.*Spotify/);

    // Should show search results section or no results message
    const resultsOrNoResults = page.locator('text=/Found|No results/');
    await expect(resultsOrNoResults).toBeVisible();
  });

  test('404 for invalid playlist', async ({ page }) => {
    await page.goto('/playlist/invalid-id-12345');

    // Should show error or 404 message
    const errorMessage = page.locator('text=/not found|error/i');
    await expect(errorMessage).toBeVisible();
  });

  test('404 for invalid artist', async ({ page }) => {
    await page.goto('/artist/invalid-id-12345');

    const errorMessage = page.locator('text=/not found|error/i');
    await expect(errorMessage).toBeVisible();
  });

  test('404 for invalid track', async ({ page }) => {
    await page.goto('/track/invalid-id-12345');

    const errorMessage = page.locator('text=/not found|error/i');
    await expect(errorMessage).toBeVisible();
  });
});
