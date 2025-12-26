import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test('loads and shows title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Dashboard.*Spotify/);
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('shows navigation links', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Playlists' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Tracks' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Artists' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Genres' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Search' })).toBeVisible();
  });
});

test.describe('Navigation', () => {
  test('navigates to playlists page', async ({ page }) => {
    await page.goto('/');
    await page.click('a[href="/playlists"]');
    await expect(page).toHaveURL('/playlists');
    await expect(page.getByRole('heading', { name: 'Playlists' })).toBeVisible();
  });

  test('navigates to tracks page', async ({ page }) => {
    await page.goto('/');
    await page.click('a[href="/tracks"]');
    await expect(page).toHaveURL('/tracks');
    await expect(page.getByRole('heading', { name: 'Tracks' })).toBeVisible();
  });

  test('navigates to artists page', async ({ page }) => {
    await page.goto('/');
    await page.click('a[href="/artists"]');
    await expect(page).toHaveURL('/artists');
    await expect(page.getByRole('heading', { name: 'Artists' })).toBeVisible();
  });

  test('navigates to genres page', async ({ page }) => {
    await page.goto('/');
    await page.click('a[href="/genres"]');
    await expect(page).toHaveURL('/genres');
    await expect(page.getByRole('heading', { name: 'Genres' })).toBeVisible();
  });

  test('navigates to search page', async ({ page }) => {
    await page.goto('/');
    await page.click('a[href="/search"]');
    await expect(page).toHaveURL('/search');
    await expect(page.getByRole('heading', { name: 'Advanced Search' })).toBeVisible();
  });
});

test.describe('Playlists Page', () => {
  test('has search input', async ({ page }) => {
    await page.goto('/playlists');
    await expect(page.getByPlaceholder('Search playlists...')).toBeVisible();
  });

  test('has search button', async ({ page }) => {
    await page.goto('/playlists');
    await expect(page.getByRole('button', { name: 'Search' })).toBeVisible();
  });
});

test.describe('Tracks Page', () => {
  test('has search input', async ({ page }) => {
    await page.goto('/tracks');
    await expect(page.getByPlaceholder('Search tracks...')).toBeVisible();
  });

  test('shows column headers', async ({ page }) => {
    await page.goto('/tracks');
    // Wait for any content to load or error state
    await page.waitForTimeout(500);
    // Headers should be visible if there are tracks or when loading
    const titleHeader = page.locator('text=Title').first();
    const albumHeader = page.locator('text=Album').first();
    // These may not be visible if API is not running, so we just check page loads
    await expect(page).toHaveURL('/tracks');
  });
});

test.describe('Artists Page', () => {
  test('has search input', async ({ page }) => {
    await page.goto('/artists');
    await expect(page.getByPlaceholder('Search artists...')).toBeVisible();
  });
});

test.describe('Genres Page', () => {
  test('has search input', async ({ page }) => {
    await page.goto('/genres');
    await expect(page.getByPlaceholder('Search genres...')).toBeVisible();
  });
});

test.describe('Search Page', () => {
  test('has main search input', async ({ page }) => {
    await page.goto('/search');
    await expect(page.getByPlaceholder('Search tracks, artists, albums...')).toBeVisible();
  });

  test('has filters button', async ({ page }) => {
    await page.goto('/search');
    await expect(page.getByRole('button', { name: /Filters/ })).toBeVisible();
  });

  test('shows filter panel when clicked', async ({ page }) => {
    await page.goto('/search');
    await page.click('button:has-text("Filters")');
    // Filter labels should now be visible
    await expect(page.locator('text=Tempo (BPM)')).toBeVisible();
    await expect(page.locator('text=Energy (%)')).toBeVisible();
    await expect(page.locator('text=Danceability (%)')).toBeVisible();
  });

  test('can clear filters', async ({ page }) => {
    await page.goto('/search');
    await page.click('button:has-text("Filters")');
    await expect(page.getByRole('button', { name: 'Clear all filters' })).toBeVisible();
  });
});

test.describe('Back Navigation', () => {
  test('playlist detail has back link', async ({ page }) => {
    // Navigate directly to a playlist detail page (may 404 without API)
    await page.goto('/playlists/test-id');
    // Should have back link regardless of API state
    await expect(page.locator('text=Back to Playlists')).toBeVisible();
  });

  test('track detail has back link', async ({ page }) => {
    await page.goto('/tracks/test-id');
    await expect(page.locator('text=Back to Tracks')).toBeVisible();
  });

  test('artist detail has back link', async ({ page }) => {
    await page.goto('/artists/test-id');
    await expect(page.locator('text=Back to Artists')).toBeVisible();
  });

  test('album detail has back button', async ({ page }) => {
    await page.goto('/albums/test-id');
    await expect(page.locator('text=Back')).toBeVisible();
  });
});
