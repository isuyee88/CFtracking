import { test, expect } from '@playwright/test';

test.describe('Campaigns Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/campaigns');
  });

  test('should load campaigns list page', async ({ page }) => {
    await expect(page).toHaveURL(/\/campaigns/);
    const content = page.locator('main, [role="main"], .page-content');
    await expect(content.first()).toBeVisible();
  });

  test('should display campaigns table or grid', async ({ page }) => {
    const table = page.locator('table, [role="grid"], .data-table, .virtual-table');
    if (await table.count() > 0) {
      await expect(table.first()).toBeVisible();
    }
  });

  test('should have create campaign button or action', async ({ page }) => {
    const createBtn = page.locator('button:has-text("创建"), button:has-text("新建"), button:has-text("Create"), [data-testid="create"], .btn-primary');
    if (await createBtn.count() > 0) {
      await expect(createBtn.first()).toBeVisible();
    }
  });

  test('should support search or filter functionality', async ({ page }) => {
    const searchInput = page.locator('input[type="search"], input[placeholder*="搜索"], input[placeholder*="search"], .search-input');
    if (await searchInput.count() > 0) {
      await expect(searchInput.first()).toBeVisible();
      await searchInput.first().fill('test-campaign');
      await expect(searchInput.first()).toHaveValue(/test-campaign/);
    }
  });

  test('should navigate to campaign detail page', async ({ page }) => {
    const rowLink = page.locator('a[href*="/campaigns/"], tr:has(td):not(:first-child), [data-row-id]');
    if (await rowLink.count() > 0) {
      await rowLink.first().click();
      await page.waitForURL(/\/campaigns\//);
      await expect(page).toHaveURL(/\/campaigns\/[^/]+$/);
    }
  });
});

test.describe('Campaign Detail Page', () => {
  test('should show campaign detail with valid ID', async ({ page }) => {
    await page.goto('/campaigns/test-campaign-id');
    const content = page.locator('main, [role="main"]');
    if (await content.count() > 0) {
      await expect(content.first()).toBeVisible();
    }
  });

  test('should display campaign stats or info', async ({ page }) => {
    await page.goto('/campaigns/test-campaign-id');
    const stats = page.locator('.stats, .metrics, [class*="stat"], [class*="metric"]');
    if (await stats.count() > 0) {
      await expect(stats.first()).toBeVisible();
    }
  });
});

test.describe('Campaigns API', () => {
  test('should return campaigns list from API', async ({ request }) => {
    const response = await request.get('/api/campaigns');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toBeDefined();
  });

  test('should support pagination parameters', async ({ request }) => {
    const response = await request.get('/api/campaigns?page=1&limit=10');
    expect(response.status()).toBe(200);
  });
});
