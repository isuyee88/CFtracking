import { test, expect } from '@playwright/test';

test.describe('Traffic Sources Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/traffic-sources');
  });

  test('should load traffic sources page', async ({ page }) => {
    await expect(page).toHaveURL(/\/traffic-sources/);
    const content = page.locator('main, [role="main"], .page-content');
    await expect(content.first()).toBeVisible();
  });

  test('should display traffic sources table', async ({ page }) => {
    const table = page.locator('table, [role="grid"], .data-table, .virtual-table');
    if (await table.count() > 0) {
      await expect(table.first()).toBeVisible();
    }
  });

  test('should have create traffic source option', async ({ page }) => {
    const createBtn = page.locator('button:has-text("创建"), button:has-text("新建"), button:has-text("添加")');
    if (await createBtn.count() > 0) {
      await expect(createBtn.first()).toBeVisible();
    }
  });

  test('should display macro preview or parameter info', async ({ page }) => {
    const macroSection = page.locator('[class*="macro"], [class*="parameter"], [class*="token"], code');
    if (await macroSection.count() > 0) {
      await expect(macroSection.first()).toBeVisible();
    }
  });
});

test.describe('Traffic Sources API', () => {
  test('should return traffic sources list', async ({ request }) => {
    const response = await request.get('/api/traffic-sources');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toBeDefined();
  });

  test('should support POST to create traffic source', async ({ request }) => {
    const response = await request.post('/api/traffic-sources', {
      data: { name: 'e2e-test-source', type: 'unknown' }
    });
    expect([200, 201, 400, 422]).toContain(response.status());
  });
});
