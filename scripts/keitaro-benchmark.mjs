import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const runId = new Date().toISOString().replace(/[:.]/g, '-');
const artifactDir = path.join(repoRoot, 'output', 'playwright', `keitaro-benchmark-${runId}`);
const screenshotDir = path.join(artifactDir, 'screenshots');

const BASE_URL = 'https://demo.keitaro.io/admin/';
const PROXY_SERVER = 'http://127.0.0.1:12334';

const routeSpecs = [
  { id: 'dashboard', route: '#!/dashboard/' },
  { id: 'campaigns', route: '#!/campaigns/' },
  { id: 'landings', route: '#!/landings/' },
  { id: 'affiliate-networks', route: '#!/affiliate_networks/' },
  { id: 'offers', route: '#!/offers/' },
  { id: 'traffic-sources', route: '#!/traffic_sources/' },
  { id: 'reports-create', route: '#!/reports/build' },
  { id: 'reports-clicks-log', route: '#!/clicks/log' },
  { id: 'reports-conversions-log', route: '#!/conversions/log' },
  { id: 'reports-exported', route: '#!/reports/exported' },
  { id: 'trends', route: '#!/trends' },
  { id: 'domains', route: '#!/domains' },
  { id: 'users', route: '#!/users' },
  { id: 'settings-main', route: '#!/settings/main' },
  { id: 'settings-bots', route: '#!/settings/bots' },
  { id: 'settings-system', route: '#!/settings/system' },
  { id: 'settings-privacy', route: '#!/settings/privacy' },
  { id: 'settings-branding', route: '#!/settings/branding' },
  { id: 'custom-metrics', route: '#!/custom_metrics' },
  { id: 'conversion-types', route: '#!/conversion_types' },
  { id: 'geo-dbs', route: '#!/geo_dbs/' },
  { id: 'geo-profiles', route: '#!/geo_profiles' },
  { id: 'logs', route: '#!/logs' },
  { id: 'archive', route: '#!/archive' },
  { id: 'integrations', route: '#!/integrations' },
];

const createActions = [
  { sourceId: 'campaigns', createLabel: 'Create', createdId: 'campaigns-create' },
  { sourceId: 'landings', createLabel: 'Create', createdId: 'landings-create' },
  { sourceId: 'affiliate-networks', createLabel: 'Create', createdId: 'affiliate-networks-create' },
  { sourceId: 'offers', createLabel: 'Create', createdId: 'offers-create' },
  { sourceId: 'traffic-sources', createLabel: 'Create', createdId: 'traffic-sources-create' },
  { sourceId: 'domains', createLabel: 'Add', createdId: 'domains-add' },
  { sourceId: 'users', createLabel: 'Create', createdId: 'users-create' },
  { sourceId: 'custom-metrics', createLabel: 'Create', createdId: 'custom-metrics-create' },
  { sourceId: 'conversion-types', createLabel: 'Create', createdId: 'conversion-types-create' },
];

const popupActions = [
  { id: 'maintenance-status', expand: 'Maintenance', click: 'Status' },
  { id: 'maintenance-postback-url', expand: 'Settings', click: 'Postback URL' },
  { id: 'maintenance-import-conversions', expand: 'Maintenance', click: 'Import conversions' },
  { id: 'maintenance-simulate-traffic', expand: 'Maintenance', click: 'Simulate traffic' },
  { id: 'maintenance-delete-statistics', expand: 'Maintenance', click: 'Delete statistics' },
];

function sanitizeFileName(value) {
  return value.replace(/[^a-z0-9-]+/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').toLowerCase();
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function waitForStableUi(page, timeout = 12000) {
  await page.waitForLoadState('domcontentloaded', { timeout }).catch(() => {});
  await page.waitForTimeout(5000);
}

async function login(page) {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.fill('input[name="login"]', 'admin');
  await page.fill('input[name="password"]', 'admin');
  await page.click('button[type="submit"], input[type="submit"]');
  await waitForStableUi(page, 20000);
}

async function openAccordion(page, label) {
  const button = page.getByRole('button', { name: label }).first();
  if (!(await button.count())) {
    return false;
  }

  try {
    await button.click();
    await page.waitForTimeout(1500);
    return true;
  } catch {
    return false;
  }
}

async function collectPage(page, id) {
  const snapshot = await page.evaluate(() => {
    const visibleTexts = (selector, limit = 30) =>
      Array.from(document.querySelectorAll(selector))
        .map((node) => node.textContent?.replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .slice(0, limit);

    const inputSummary = Array.from(document.querySelectorAll('input, select, textarea'))
      .map((node) => ({
        tag: node.tagName.toLowerCase(),
        type: node.getAttribute('type'),
        name: node.getAttribute('name'),
        placeholder: node.getAttribute('placeholder'),
      }))
      .slice(0, 80);

    const navLinks = Array.from(document.querySelectorAll('a[href^="#!"]'))
      .map((node) => ({
        text: node.textContent?.replace(/\s+/g, ' ').trim(),
        href: node.getAttribute('href'),
      }))
      .filter((item) => item.text)
      .slice(0, 60);

    return {
      title: document.title,
      url: window.location.href,
      bodyText: document.body.innerText.replace(/\n{2,}/g, '\n').slice(0, 6000),
      headings: visibleTexts('h1, h2, h3'),
      tabs: visibleTexts('.nav-tabs a, .nav-tabs button, [role="tab"], .nav-link'),
      buttons: visibleTexts('button, .btn'),
      labels: visibleTexts('label'),
      navLinks,
      tables: document.querySelectorAll('table').length,
      dialogs: document.querySelectorAll('[role="dialog"], .modal.show').length,
      forms: document.querySelectorAll('form').length,
      inputSummary,
    };
  });

  const screenshotPath = path.join(screenshotDir, `${sanitizeFileName(id)}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});

  return {
    id,
    ...snapshot,
    screenshotPath,
  };
}

async function collectRoute(page, spec) {
  await page.goto(`${BASE_URL}${spec.route}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await waitForStableUi(page);
  return collectPage(page, spec.id);
}

async function collectCreatePages(page, pageMap) {
  const results = [];

  for (const action of createActions) {
    const source = pageMap.get(action.sourceId);
    if (!source) continue;

    await page.goto(source.url, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await waitForStableUi(page);

    const button = page.getByRole('button', { name: action.createLabel }).first();
    if (!(await button.count())) {
      results.push({
        id: action.createdId,
        skipped: true,
        reason: `Button "${action.createLabel}" not found`,
        sourceId: action.sourceId,
      });
      continue;
    }

    try {
      await button.click();
      await waitForStableUi(page);
      results.push({
        ...(await collectPage(page, action.createdId)),
        sourceId: action.sourceId,
      });
    } catch (error) {
      results.push({
        id: action.createdId,
        sourceId: action.sourceId,
        skipped: true,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return results;
}

async function collectPopup(page, popup) {
  await page.goto(`${BASE_URL}#!/dashboard/`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await waitForStableUi(page);

  if (popup.expand) {
    await openAccordion(page, popup.expand);
  }

  const target = page.getByRole('link', { name: popup.click }).first();
  const targetButton = page.getByRole('button', { name: popup.click }).first();
  const clickable = (await target.count()) ? target : targetButton;

  if (!(await clickable.count())) {
    return {
      id: popup.id,
      skipped: true,
      reason: `Target "${popup.click}" not found`,
    };
  }

  try {
    await clickable.click();
    await waitForStableUi(page, 8000);
    const data = await collectPage(page, popup.id);

    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(800);

    return data;
  } catch (error) {
    return {
      id: popup.id,
      skipped: true,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

async function main() {
  await ensureDir(screenshotDir);

  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    proxy: { server: PROXY_SERVER },
  });

  const page = await browser.newPage({
    ignoreHTTPSErrors: true,
    viewport: { width: 1440, height: 1200 },
  });

  try {
    await login(page);

    const routeResults = [];
    for (const spec of routeSpecs) {
      routeResults.push(await collectRoute(page, spec));
    }

    const pageMap = new Map(routeResults.map((item) => [item.id, item]));
    const createResults = await collectCreatePages(page, pageMap);

    const popupResults = [];
    for (const popup of popupActions) {
      popupResults.push(await collectPopup(page, popup));
    }

    const summary = {
      runId,
      baseUrl: BASE_URL,
      capturedAt: new Date().toISOString(),
      routeResults,
      createResults,
      popupResults,
    };

    const outputPath = path.join(artifactDir, 'benchmark.json');
    await fs.writeFile(outputPath, JSON.stringify(summary, null, 2), 'utf8');
    console.log(outputPath);
  } finally {
    await browser.close();
  }
}

await main();
