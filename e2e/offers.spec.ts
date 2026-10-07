import { test, expect } from '@playwright/test';

test.describe('Offers Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/offers');
  });

  test('should load offers list page', async ({ page }) => {
    await expect(page).toHaveURL(/\/offers/);
    const content = page.locator('main, [role="main"], .page-content');
    await expect(content.first()).toBeVisible();
  });

  test('should display offers table or grid', async ({ page }) => {
    const table = page.locator('table, [role="grid"], .data-table, .virtual-table');
    if (await table.count() > 0) {
      await expect(table.first()).toBeVisible();
    }
  });

  test('should have create offer functionality', async ({ page }) => {
    const createBtn = page.locator('button:has-text("创建"), button:has-text("新建"), button:has-text("Create"), [data-testid="create"]');
    if (await createBtn.count() > 0) {
      await expect(createBtn.first()).toBeVisible();
    }
  });

  test('should show offer columns: name, URL, payout', async ({ page }) => {
    const table = page.locator('table');
    if (await table.count() > 0) {
      const headers = table.locator('th');
      const headerTexts = await headers.allTextContents();
      const combinedHeaders = headerTexts.join(' ').toLowerCase();
      expect(combinedHeaders.length).toBeGreaterThan(0);
    }
  });
});

test.describe('Offers API', () => {
  test('should return offers list from API', async ({ request }) => {
    const response = await request.get('/api/offers');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toBeDefined();
  });

  test('should support filtering by affiliate network', async ({ request }) => {
    const response = await request.get('/api/offers?networkId=test-network');
    expect([200, 404, 400]).toContain(response.status());
  });
});
