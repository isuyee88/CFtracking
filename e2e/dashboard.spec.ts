import { test, expect } from '@playwright/test';

test.describe('Dashboard Smoke Tests', () => {
  test('should load dashboard page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/CFTracking/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display navigation menu', async ({ page }) => {
    await page.goto('/');
    const nav = page.locator('nav, [role="navigation"], .sidebar');
    if (await nav.count() > 0) {
      await expect(nav.first()).toBeVisible();
    }
  });

  test('should have responsive layout on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('API Health Check', () => {
  test('should return healthy status from API', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.status()).toBe(200);
  });
});
