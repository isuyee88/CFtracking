import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE_URL = 'https://t.isuyee.com';
const PROXY_SERVER = 'http://127.0.0.1:12334';
const OUTPUT_DIR = path.resolve('output/playwright/prod-audit');

const ROUTES = [
  { path: '/', name: 'home' },
  { path: '/dashboard', name: 'dashboard' },
  { path: '/campaigns', name: 'campaigns' },
  { path: '/rules', name: 'rules' },
  { path: '/platforms', name: 'platforms' },
  { path: '/landings', name: 'landings' },
  { path: '/offers', name: 'offers' },
  { path: '/traffic-sources', name: 'traffic-sources' },
  { path: '/affiliate-networks', name: 'affiliate-networks' },
  { path: '/trends', name: 'trends' },
  { path: '/reports', name: 'reports' },
  { path: '/audit', name: 'audit' },
  { path: '/conversions', name: 'conversions' },
  { path: '/blacklist', name: 'blacklist' },
  { path: '/whitelist', name: 'whitelist' },
  { path: '/target', name: 'target' },
  { path: '/settings', name: 'settings' },
  { path: '/help', name: 'help' },
];

const VIEWPORTS = [
  {
    name: 'desktop',
    viewport: { width: 1440, height: 960 },
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
  },
  {
    name: 'mobile',
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  },
];

const READ_ONLY_ENDPOINTS = [
  '/health',
  '/api/deployment/info',
  '/api/analytics/dashboard?range=last7days',
  '/api/analytics/recent-clicks?limit=5',
  '/api/analytics/entity-stats?type=campaign&range=last7days',
  '/api/campaigns?page=1&pageSize=5',
  '/api/offers?page=1&pageSize=5&withStats=true',
  '/api/landing-pages?page=1&pageSize=5&withStats=true',
  '/api/traffic-sources?page=1&pageSize=5&withStats=true',
  '/api/affiliate-networks?page=1&pageSize=5&withStats=true',
  '/api/rules?page=1&pageSize=5',
  '/api/platforms',
  '/api/trends/report?interval=day',
  '/api/clicks?page=1&pageSize=5',
  '/api/conversions?page=1&pageSize=5',
  '/api/blacklist?page=1&pageSize=5',
  '/api/whitelist?page=1&pageSize=5',
  '/api/migration/status',
];

const SAFE_MUTATION_PROBES = [
  {
    name: 'traffic-source-test-connection-invalid',
    path: '/api/traffic-sources/test-connection',
    method: 'POST',
    body: {
      apiBaseUrl: 'https://example.invalid',
      apiKey: 'invalid-key',
      platformType: 'generic',
    },
  },
  {
    name: 'platform-test-oddbytes',
    path: '/api/platforms/oddbytes/test',
    method: 'POST',
  },
  {
    name: 'platform-test-propellerads',
    path: '/api/platforms/propellerads/test',
    method: 'POST',
  },
  {
    name: 'report-export-traffic-csv',
    path: '/api/analytics/reports/export',
    method: 'POST',
    body: {
      type: 'traffic',
      format: 'csv',
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      endDate: new Date().toISOString().slice(0, 10),
      limit: 20,
    },
  },
  {
    name: 'campaign-update-nonexistent',
    path: '/api/campaigns/__prod-audit__',
    method: 'PUT',
    body: { name: 'prod-audit' },
  },
  {
    name: 'campaign-delete-nonexistent',
    path: '/api/campaigns/__prod-audit__',
    method: 'DELETE',
  },
  {
    name: 'rule-delete-nonexistent',
    path: '/api/rules/__prod-audit__',
    method: 'DELETE',
  },
];

function sanitizeFileName(value) {
  return value.replace(/[^a-z0-9-]+/gi, '-').replace(/^-+|-+$/g, '');
}

function buildRouteUrl(routePath) {
  if (routePath === '/') {
    return `${BASE_URL}/`;
  }
  return `${BASE_URL}/#${routePath}`;
}

function summarizeText(value, max = 220) {
  const normalized = (value || '').replace(/\s+/g, ' ').trim();
  return normalized.slice(0, max);
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function pageFetch(page, requestPath, options = {}) {
  return page.evaluate(
    async ({ baseUrl, requestPath, options }) => {
      const response = await fetch(baseUrl + requestPath, options);
      const contentType = response.headers.get('content-type') || '';
      let body;
      if (contentType.includes('application/json')) {
        body = await response.json();
      } else if (contentType.includes('text/') || contentType.includes('application/xml')) {
        body = await response.text();
      } else {
        const blob = await response.blob();
        body = {
          size: blob.size,
          type: blob.type,
        };
      }
      return {
        status: response.status,
        ok: response.ok,
        contentType,
        body,
      };
    },
    { baseUrl: BASE_URL, requestPath, options }
  );
}

async function collectPageSignals(page, routeName, viewportName) {
  return page.evaluate(
    ({ routeName, viewportName }) => {
      const getTexts = (selectors, limit = 8) =>
        Array.from(document.querySelectorAll(selectors))
          .map((el) => (el.textContent || '').trim())
          .filter(Boolean)
          .slice(0, limit);

      const unique = (items) => [...new Set(items)];
      const heading =
        document.querySelector('h1, h2, [data-testid="page-title"]')?.textContent?.trim() || '';
      const bodyText = (document.body?.innerText || '').trim();
      const navLinks = Array.from(document.querySelectorAll('a[href]'))
        .map((el) => ({
          text: (el.textContent || '').trim(),
          href: el.getAttribute('href') || '',
        }))
        .filter((item) => item.href && !item.href.startsWith('http'))
        .slice(0, 30);
      const buttons = Array.from(document.querySelectorAll('button'))
        .map((el) => ({
          text: (el.textContent || '').trim(),
          disabled: el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true',
        }))
        .filter((item) => item.text)
        .slice(0, 30);
      const tabLabels = unique([
        ...getTexts('[role="tab"]', 12),
        ...getTexts('.mobile-chart-tabs button', 12),
      ]).slice(0, 12);
      const dialogTitle =
        document.querySelector('[role="dialog"] h1, [role="dialog"] h2, .ant-modal h1, .ant-modal h2, .ant-modal-title')
          ?.textContent?.trim() || '';

      const hasHorizontalOverflow =
        document.documentElement.scrollWidth > window.innerWidth + 4 ||
        document.body.scrollWidth > window.innerWidth + 4;

      return {
        routeName,
        viewportName,
        title: document.title,
        heading,
        bodySample: bodyText.slice(0, 400),
        bodyLength: bodyText.length,
        tableCount: document.querySelectorAll('table, [role="table"], .ant-table').length,
        formCount: document.querySelectorAll('form').length,
        inputCount: document.querySelectorAll('input, textarea, select').length,
        dialogCount: document.querySelectorAll('[role="dialog"], .ant-modal').length,
        chartCount:
          document.querySelectorAll('svg, canvas, .recharts-wrapper, [class*="chart"], [class*="Chart"]').length,
        tabCount: document.querySelectorAll('[role="tab"], .mobile-chart-tabs button').length,
        tabLabels,
        navLinks,
        buttons,
        hasHorizontalOverflow,
        viewport: {
          innerWidth: window.innerWidth,
          innerHeight: window.innerHeight,
          scrollWidth: document.documentElement.scrollWidth,
          scrollHeight: document.documentElement.scrollHeight,
        },
        style: {
          bodyBackground: getComputedStyle(document.body).backgroundColor,
          bodyColor: getComputedStyle(document.body).color,
          fontFamily: getComputedStyle(document.body).fontFamily,
        },
        dialogTitle,
      };
    },
    { routeName, viewportName }
  );
}

async function clickVisible(locator) {
  if ((await locator.count()) === 0) return false;
  const target = locator.first();
  if (!(await target.isVisible().catch(() => false))) return false;
  await target.click({ timeout: 3000 }).catch(() => {});
  return true;
}

async function exerciseTabs(page) {
  const labels = [];
  const selectors = ['[role="tab"]', '.mobile-chart-tabs button'];

  for (const selector of selectors) {
    const count = await page.locator(selector).count();
    for (let index = 0; index < Math.min(count, 5); index += 1) {
      const locator = page.locator(selector).nth(index);
      const text = summarizeText(await locator.innerText().catch(() => ''), 80);
      if (!text) continue;
      await locator.click({ timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(400);
      labels.push(text);
    }
  }

  return [...new Set(labels)];
}

async function exerciseModal(page) {
  const buttonPatterns = [/new/i, /create/i, /add/i, /edit/i, /configure/i, /preference/i, /setting/i, /新建/, /新增/, /添加/, /编辑/, /配置/, /偏好/];
  const buttons = page.locator('button');
  const count = await buttons.count();

  for (let index = 0; index < Math.min(count, 18); index += 1) {
    const button = buttons.nth(index);
    const text = summarizeText(await button.innerText().catch(() => ''), 80);
    if (!text || !buttonPatterns.some((pattern) => pattern.test(text))) continue;
    if (!(await button.isVisible().catch(() => false))) continue;
    if (await button.isDisabled().catch(() => false)) continue;

    await button.click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(1000);

    const dialog = page.locator('[role="dialog"], .ant-modal').first();
    if ((await dialog.count()) > 0 && (await dialog.isVisible().catch(() => false))) {
      const dialogTitle = summarizeText(
        await dialog.locator('h1, h2, .ant-modal-title').first().innerText().catch(() => text),
        120
      );
      await page.keyboard.press('Escape').catch(() => {});
      await page.waitForTimeout(300);
      return { opened: true, triggerText: text, dialogTitle };
    }
  }

  return { opened: false };
}

async function inspectRoute(page, route, viewportName) {
  const consoleMessages = [];
  const pageErrors = [];
  const failedRequests = [];

  const onConsole = (msg) => {
    if (['error', 'warning'].includes(msg.type())) {
      consoleMessages.push({
        type: msg.type(),
        text: summarizeText(msg.text(), 300),
      });
    }
  };
  const onPageError = (error) => {
    pageErrors.push(summarizeText(error.message, 300));
  };
  const onRequestFailed = (request) => {
    failedRequests.push({
      url: request.url(),
      errorText: request.failure()?.errorText || 'unknown',
    });
  };

  page.on('console', onConsole);
  page.on('pageerror', onPageError);
  page.on('requestfailed', onRequestFailed);

  const url = buildRouteUrl(route.path);
  let gotoError = null;

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  } catch (error) {
    gotoError = error instanceof Error ? error.message : String(error);
  }

  await page.waitForTimeout(2500);

  const signals = await collectPageSignals(page, route.name, viewportName).catch((error) => ({
    collectionError: error instanceof Error ? error.message : String(error),
  }));
  const exercisedTabs = await exerciseTabs(page).catch(() => []);
  const modalResult = await exerciseModal(page).catch(() => ({ opened: false, error: true }));

  const screenshotPath = path.join(OUTPUT_DIR, `${viewportName}-${sanitizeFileName(route.name)}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});

  page.off('console', onConsole);
  page.off('pageerror', onPageError);
  page.off('requestfailed', onRequestFailed);

  return {
    route: route.path,
    name: route.name,
    url,
    gotoError,
    consoleMessages,
    pageErrors,
    failedRequests,
    exercisedTabs,
    modalResult,
    screenshotPath,
    ...signals,
  };
}

async function discoverCampaignDetailRoute(page) {
  await page.goto(buildRouteUrl('/campaigns'), { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(2500);
  const candidate = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll('a[href]'))
      .map((el) => el.getAttribute('href') || '')
      .filter((href) => /#\/campaigns\/[^/]+$/.test(href));
    return anchors[0] || null;
  });
  if (!candidate) return null;
  return { path: candidate.replace(/^#/, ''), name: 'campaign-detail' };
}

async function runRouteAudit(browser) {
  const results = {};

  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: viewport.viewport,
      deviceScaleFactor: viewport.deviceScaleFactor,
      isMobile: viewport.isMobile,
      hasTouch: viewport.hasTouch,
      userAgent: viewport.userAgent,
      ignoreHTTPSErrors: true,
    });

    const page = await context.newPage();
    const viewportResults = [];

    const dynamicRoute = viewport.name === 'desktop' ? await discoverCampaignDetailRoute(page) : null;
    const routesToInspect = dynamicRoute ? [...ROUTES, dynamicRoute] : ROUTES;

    for (const route of routesToInspect) {
      const result = await inspectRoute(page, route, viewport.name);
      viewportResults.push(result);
    }

    results[viewport.name] = viewportResults;
    await context.close();
  }

  return results;
}

async function runApiAudit(browser) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();
  await page.goto(buildRouteUrl('/dashboard'), { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(1500);

  const readOnlyResults = [];
  for (const endpoint of READ_ONLY_ENDPOINTS) {
    const response = await pageFetch(page, endpoint).catch((error) => ({
      status: 0,
      ok: false,
      contentType: 'error',
      body: { message: error instanceof Error ? error.message : String(error) },
    }));
    readOnlyResults.push({
      endpoint,
      ...response,
      bodySample: summarizeText(JSON.stringify(response.body), 280),
    });
  }

  const mutationProbeResults = [];
  for (const probe of SAFE_MUTATION_PROBES) {
    const response = await pageFetch(page, probe.path, {
      method: probe.method,
      headers: probe.body ? { 'Content-Type': 'application/json' } : undefined,
      body: probe.body ? JSON.stringify(probe.body) : undefined,
    }).catch((error) => ({
      status: 0,
      ok: false,
      contentType: 'error',
      body: { message: error instanceof Error ? error.message : String(error) },
    }));
    mutationProbeResults.push({
      ...probe,
      status: response.status,
      ok: response.ok,
      contentType: response.contentType,
      bodySample: summarizeText(JSON.stringify(response.body), 280),
    });
  }

  await context.close();
  return { readOnlyResults, mutationProbeResults };
}

async function main() {
  await ensureDir(OUTPUT_DIR);

  const browser = await chromium.launch({
    headless: true,
    args: [`--proxy-server=${PROXY_SERVER}`, '--ignore-certificate-errors'],
  });

  try {
    const routeAudit = await runRouteAudit(browser);
    const apiAudit = await runApiAudit(browser);
    const report = {
      generatedAt: new Date().toISOString(),
      baseUrl: BASE_URL,
      proxyServer: PROXY_SERVER,
      routeAudit,
      apiAudit,
    };

    const reportPath = path.join(OUTPUT_DIR, 'production-audit-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');
    console.log(JSON.stringify({ ok: true, reportPath }, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
