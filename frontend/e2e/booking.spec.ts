import { test, expect } from '@playwright/test';

test.describe('Booking flow', () => {
  test('home page loads movies', async ({ page }) => {
    await page.goto('/#/home');
    await expect(page.locator('.section-title')).toContainText(/Now Showing|अभी चल रही/i);
    await expect(page.locator('.movie-card').first()).toBeVisible({ timeout: 15_000 });
  });

  test('navigate to movie and show seat map', async ({ page }) => {
    await page.goto('/#/home');
    await page.locator('.movie-card').first().click();
    await expect(page.locator('.section-title')).toBeVisible({ timeout: 10_000 });
    const showBtn = page.locator('.showtime-btn').first();
    if (await showBtn.isVisible()) {
      await showBtn.click();
      await expect(page.locator('.seat-map')).toBeVisible({ timeout: 10_000 });
    }
  });
});
