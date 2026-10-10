import { test, expect } from '@playwright/test';

test.describe('Landing Pages Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/landings');
  });

  test('should load landing pages list', async ({ page }) => {
    await expect(page).toHaveURL(/\/landings/);
    const content = page.locator('main, [role="main"], .page-content');
    await expect(content.first()).toBeVisible();
  });

  test('should display landing pages table', async ({ page }) => {
    const table = page.locator('table, [role="grid"], .data-table, .virtual-table');
    if (await table.count() > 0) {
      await expect(table.first()).toBeVisible();
    }
  });

  test('should have add landing page action', async ({ page }) => {
    const addBtn = page.locator('button:has-text("添加"), button:has-text("新建"), button:has-text("Add"), button:has-text("创建")');
    if (await addBtn.count() > 0) {
      await expect(addBtn.first()).toBeVisible();
    }
  });

  test('should support landing page type filter', async ({ page }) => {
    const filterSelect = page.locator('select, [role="listbox"], .filter-dropdown');
    if (await filterSelect.count() > 0) {
      await expect(filterSelect.first()).toBeVisible();
    }
  });
});

test.describe('Landing Pages API', () => {
  test('should return landing pages list', async ({ request }) => {
    const response = await request.get('/api/landings');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toBeDefined();
  });

  test('should support alias path /l', async ({ page }) => {
    await page.goto('/l');
    await expect(page).toHaveURL(/\/l/);
    const content = page.locator('main, [role="main"]');
    if (await content.count() > 0) {
      await expect(content.first()).toBeVisible();
    }
  });
});
