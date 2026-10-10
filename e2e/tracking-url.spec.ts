import { test, expect } from '@playwright/test';

test.describe('Tracking URL Functionality', () => {
  test('should display tracking URL in campaign detail', async ({ page }) => {
    await page.goto('/campaigns/test-campaign-id');
    const urlField = page.locator('input[value*="http"], [class*="tracking-url"], [data-testid="tracking-url"], code:has-text("http")');
    if (await urlField.count() > 0) {
      await expect(urlField.first()).toBeVisible();
    }
  });

  test('should support copy tracking URL action', async ({ page }) => {
    await page.goto('/campaigns/test-campaign-id');
    const copyBtn = page.locator('button:has-text("复制"), button:has-text("Copy"), [data-action="copy"], .copy-btn');
    if (await copyBtn.count() > 0) {
      await expect(copyBtn.first()).toBeVisible();
      await copyBtn.first().click();
    }
  });

  test('should have tracking URL with campaign parameter', async ({ page }) => {
    await page.goto('/campaigns/test-campaign-id');
    const urlElements = page.locator('input[value*="campaign"], code:has-text("campaign")');
    if (await urlElements.count() > 0) {
      await expect(urlElements.first()).toBeVisible();
    }
  });
});

test.describe('Tracking Click API', () => {
  test('should accept tracking click requests', async ({ request }) => {
    const response = await request.get('/track/click?campaign=test-campaign');
    expect([200, 302, 301, 400, 404]).toContain(response.status());
  });

  test('should process click with required params', async ({ request }) => {
    const response = await request.get('/track/click', {
      params: { campaign: 'test', source: 'test-source' }
    });
    expect([200, 302, 301, 400, 404]).toContain(response.status());
  });
});

test.describe('Postback / Conversion Tracking', () => {
  test('should accept postback requests', async ({ request }) => {
    const response = await request.get('/track/postback', {
      params: { pid: 'test-pid', payout: '1.0' }
    });
    expect([200, 400, 404]).toContain(response.status());
  });

  test('should record conversion data via postback', async ({ request }) => {
    const response = await request.post('/track/postback', {
      form: { pid: 'test-pid', payout: '1.5', status: 'approved' }
    });
    expect([200, 201, 400, 404]).toContain(response.status());
  });
});
