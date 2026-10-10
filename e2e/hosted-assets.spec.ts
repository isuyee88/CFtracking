import { test, expect } from '@playwright/test';

const htmlAssetId = process.env.HOSTED_ASSET_HTML_ID;
const zipAssetId = process.env.HOSTED_ASSET_ZIP_ID;
const missingR2AssetId = process.env.HOSTED_ASSET_MISSING_R2_ID;
const unknownAssetId = process.env.HOSTED_ASSET_UNKNOWN_ID || 'e2e-hosted-asset-does-not-exist';

function hostedPath(id: string, suffix: 'content' | 'archive' = 'content') {
  return `/hosted-assets/${encodeURIComponent(id)}/${suffix}`;
}

test.describe('Hosted Asset public delivery', () => {
  test('unknown asset returns 404 and never falls through to SPA index', async ({ request }) => {
    const response = await request.get(hostedPath(unknownAssetId));
    expect(response.status()).toBe(404);
    expect(await response.text()).not.toContain('<div id="root"></div>');
  });

  test('configured hosted HTML asset is served as HTML with security headers', async ({ request }) => {
    test.skip(!htmlAssetId, 'Set HOSTED_ASSET_HTML_ID to run against a real hosted HTML fixture');

    const response = await request.get(hostedPath(htmlAssetId!));
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('text/html');
    expect(response.headers()['content-security-policy']).toContain('sandbox');
    expect(response.headers()['x-content-type-options']).toBe('nosniff');
    expect(await response.text()).not.toContain('<div id="root"></div>');
  });

  test('configured hosted ZIP asset is downloadable with archive metadata', async ({ request }) => {
    test.skip(!zipAssetId, 'Set HOSTED_ASSET_ZIP_ID to run against a real hosted ZIP fixture');

    const response = await request.get(hostedPath(zipAssetId!, 'archive'));
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/zip');
    expect(response.headers()['content-disposition']).toMatch(/attachment/i);
    expect(Number(response.headers()['content-length'] || 0)).toBeGreaterThan(0);
  });

  test('configured D1 metadata with missing R2 object returns uncached 503', async ({ request }) => {
    test.skip(!missingR2AssetId, 'Set HOSTED_ASSET_MISSING_R2_ID to run against a metadata-only fixture');

    const response = await request.get(hostedPath(missingR2AssetId!));
    expect(response.status()).toBe(503);
    expect(response.headers()['cache-control']).toBe('no-store');
  });

  for (const viewport of [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', width: 390, height: 844 },
  ]) {
    test(`error response stays within ${viewport.name} viewport`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      const response = await page.goto(hostedPath(unknownAssetId));
      expect(response?.status()).toBe(404);

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(overflow).toBe(false);
    });
  }
});
