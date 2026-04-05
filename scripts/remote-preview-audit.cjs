const fs = require('fs');
const os = require('os');
const path = require('path');
const axios = require('axios');
const { chromium, devices } = require('playwright');

const BASE_URL = process.env.AUDIT_BASE_URL || 'http://127.0.0.1:8787';
const DATE_STAMP = new Date().toISOString().replace(/[:.]/g, '-');
const DEFAULT_OUT_ROOT = path.join(process.cwd(), 'output');
const OUT_ROOT = process.env.AUDIT_OUT_ROOT || DEFAULT_OUT_ROOT || os.tmpdir();
const OUT_DIR = path.join(OUT_ROOT, `remote-preview-audit-${DATE_STAMP}`);
const SCREENSHOT_DIR = path.join(OUT_DIR, 'screenshots');

const ROUTES = [
  { key: 'dashboard', path: '#/dashboard', label: 'Dashboard' },
  { key: 'campaigns', path: '#/campaigns', label: 'Campaigns' },
  { key: 'rules', path: '#/rules', label: 'Rule Management' },
  { key: 'platforms', path: '#/platforms', label: 'Platform Management' },
  { key: 'landings', path: '#/landings', label: 'Landings' },
  { key: 'offers', path: '#/offers', label: 'Offers' },
  { key: 'traffic-sources', path: '#/traffic-sources', label: 'Traffic Sources' },
  { key: 'affiliate-networks', path: '#/affiliate-networks', label: 'Affiliate Networks' },
  { key: 'trends', path: '#/trends', label: 'Trends' },
  { key: 'reports', path: '#/reports', label: 'Reports' },
  { key: 'audit', path: '#/audit', label: 'Clicks Log' },
  { key: 'conversions', path: '#/conversions', label: 'Conversions Log' },
  { key: 'blacklist', path: '#/blacklist', label: 'Blacklist' },
  { key: 'whitelist', path: '#/whitelist', label: 'Whitelist' },
  { key: 'target', path: '#/target', label: 'Target' },
  { key: 'settings', path: '#/settings', label: 'Settings' },
  { key: 'help', path: '#/help', label: 'Help Center' },
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function sanitizeFileName(name) {
  return name.replace(/[^a-z0-9-_]+/gi, '-').toLowerCase();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function capturePageSummary(page, route, mode, screenshot = true) {
  const apiResponses = [];
  const consoleEntries = [];
  const pageErrors = [];

  const onResponse = response => {
    if (response.url().includes('/api/')) {
      apiResponses.push({
        url: response.url().replace(BASE_URL, ''),
        status: response.status(),
        method: response.request().method(),
      });
    }
  };

  const onConsole = msg => {
    consoleEntries.push({ type: msg.type(), text: msg.text() });
  };

  const onPageError = error => {
    pageErrors.push(error.message);
  };

  page.on('response', onResponse);
  page.on('console', onConsole);
  page.on('pageerror', onPageError);

  const targetUrl = `${BASE_URL}/${route.path}`;
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await sleep(5000);

  const summary = await page.evaluate(() => {
    const text = document.body.innerText || '';
    const dialogTexts = Array.from(document.querySelectorAll('[role="dialog"], .fixed.inset-0'))
      .map(node => node.textContent || '')
      .filter(Boolean)
      .slice(0, 5);

    return {
      title: document.title,
      url: window.location.href,
      h1s: Array.from(document.querySelectorAll('h1')).map(node => node.textContent?.trim()).filter(Boolean),
      buttons: document.querySelectorAll('button').length,
      links: document.querySelectorAll('a').length,
      inputs: document.querySelectorAll('input, textarea, select').length,
      tables: document.querySelectorAll('table').length,
      rows: document.querySelectorAll('tbody tr').length,
      dialogs: document.querySelectorAll('[role="dialog"], .fixed.inset-0').length,
      tabs: Array.from(document.querySelectorAll('button')).map(node => node.textContent?.trim()).filter(Boolean).slice(0, 30),
      textLength: text.length,
      textSample: text.slice(0, 500),
      dialogTexts,
    };
  });

  if (screenshot) {
    const fileName = `${mode}-${sanitizeFileName(route.key)}.png`;
    const filePath = path.join(SCREENSHOT_DIR, fileName);
    try {
      await page.screenshot({
        path: filePath,
        fullPage: true,
        timeout: 120000,
        animations: 'disabled',
      });
      summary.screenshot = filePath;
    } catch (error) {
      summary.screenshotError = error instanceof Error ? error.message : String(error);
    }
  }

  summary.apiResponses = apiResponses;
  summary.consoleEntries = consoleEntries;
  summary.pageErrors = pageErrors;
  summary.apiFailures = apiResponses.filter(item => item.status >= 400);
  summary.consoleErrors = consoleEntries.filter(item => item.type === 'error');

  page.off('response', onResponse);
  page.off('console', onConsole);
  page.off('pageerror', onPageError);

  return summary;
}

async function tryClick(page, namePattern, options = {}) {
  const locator = page.getByRole('button', { name: namePattern }).first();
  if (await locator.count()) {
    await locator.click(options);
    await sleep(1000);
    return true;
  }
  return false;
}

async function runDesktopInteractions(browser, campaignId) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  const interactions = [];

  async function run(routePath, label, fn) {
    try {
      await page.goto(`${BASE_URL}/${routePath}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
      await sleep(3000);
      const result = await fn();
      interactions.push({ label, ok: true, result });
    } catch (error) {
      interactions.push({ label, ok: false, error: error.message });
    }
  }

  await run('#/campaigns', 'Campaign modal', async () => {
    const clicked = await tryClick(page, /create campaign/i);
    const dialogText = clicked ? await page.locator('.fixed.inset-0, [role="dialog"]').first().textContent().catch(() => '') : '';
    return {
      clicked,
      dialogOpened: Boolean(dialogText),
      dialogText: (dialogText || '').slice(0, 200),
      hasSchemaTab: await page.getByRole('button', { name: /schema/i }).first().count(),
      hasFiltersTab: await page.getByRole('button', { name: /filters/i }).first().count(),
    };
  });

  if (campaignId) {
    await run(`#/campaigns/${campaignId}`, 'Campaign detail tabs and edit modal', async () => {
      const tabs = ['Overview', 'Flow', 'Reports', 'Filters', 'Tracking Code', 'Settings'];
      const tabClicks = [];
      for (const tab of tabs) {
        const clicked = await tryClick(page, new RegExp(tab, 'i'));
        tabClicks.push({ tab, clicked });
      }
      const editClicked = await tryClick(page, /edit/i);
      return {
        tabClicks,
        editClicked,
        editDialogVisible: await page.locator('.fixed.inset-0, [role="dialog"]').count(),
      };
    });
  }

  await run('#/landings', 'Landings create modal', async () => {
    const clicked = await tryClick(page, /create|add/i);
    return {
      clicked,
      dialogVisible: await page.locator('.fixed.inset-0, [role="dialog"]').count(),
    };
  });

  await run('#/offers', 'Offers create modal', async () => {
    const clicked = await tryClick(page, /create|add/i);
    return {
      clicked,
      dialogVisible: await page.locator('.fixed.inset-0, [role="dialog"]').count(),
    };
  });

  await run('#/traffic-sources', 'Traffic sources create modal', async () => {
    const clicked = await tryClick(page, /create|add/i);
    return {
      clicked,
      dialogVisible: await page.locator('.fixed.inset-0, [role="dialog"]').count(),
    };
  });

  await run('#/affiliate-networks', 'Affiliate networks create modal', async () => {
    const clicked = await tryClick(page, /create|add/i);
    return {
      clicked,
      dialogVisible: await page.locator('.fixed.inset-0, [role="dialog"]').count(),
    };
  });

  await run('#/rules', 'Rules create modal', async () => {
    const clicked = await tryClick(page, /create rule/i);
    return {
      clicked,
      dialogVisible: await page.locator('.fixed.inset-0, [role="dialog"]').count(),
    };
  });

  await run('#/blacklist', 'Blacklist add modal', async () => {
    const clicked = await tryClick(page, /add entry/i);
    return {
      clicked,
      dialogVisible: await page.locator('.fixed.inset-0, [role="dialog"]').count(),
    };
  });

  await run('#/whitelist', 'Whitelist add modal', async () => {
    const clicked = await tryClick(page, /add entry/i);
    return {
      clicked,
      dialogVisible: await page.locator('.fixed.inset-0, [role="dialog"]').count(),
    };
  });

  await run('#/settings', 'Settings tab switching', async () => {
    const labels = ['Account', 'Notifications', 'Security'];
    const switches = [];
    for (const label of labels) {
      switches.push({ label, clicked: await tryClick(page, new RegExp(label, 'i')) });
    }
    return { switches };
  });

  await page.close();
  return interactions;
}

async function runMobileInteractions(browser) {
  const context = await browser.newContext({
    ...devices['iPhone 13'],
  });
  const page = await context.newPage();
  const results = [];

  try {
    await page.goto(`${BASE_URL}/#/trends`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await sleep(4000);
    const labels = ['Clicks', 'Revenue', 'ROI', 'EPC'];
    const clicks = [];
    for (const label of labels) {
      clicks.push({ label, clicked: await tryClick(page, new RegExp(label, 'i')) });
    }
    results.push({ label: 'Mobile trends tabs', ok: true, result: { clicks } });
  } catch (error) {
    results.push({ label: 'Mobile trends tabs', ok: false, error: error.message });
  }

  await context.close();
  return results;
}

async function runCrudAudit() {
  const client = axios.create({
    baseURL: BASE_URL,
    timeout: 30000,
    validateStatus: () => true,
  });

  const stamp = Date.now();
  const results = [];
  const cleanup = [];

  async function createCase(name, pathName, payload, updatePayload) {
    const create = await client.post(pathName, payload);
    const item = {
      name,
      createStatus: create.status,
      createBody: create.data,
    };

    const id = create.data?.data?.id || create.data?.data?.displayId || create.data?.id;
    if (create.status < 400 && id) {
      cleanup.push({ pathName, id });
      const update = await client.put(`${pathName}/${id}`, updatePayload);
      item.updateStatus = update.status;
      item.updateBody = update.data;
    }

    results.push(item);
    return item;
  }

  const landing = await createCase(
    'landing',
    '/api/landing-pages',
    {
      name: `E2E_AUDIT_LANDING_${stamp}`,
      url: `https://example.com/landing-${stamp}`,
      status: 'paused',
    },
    { name: `E2E_AUDIT_LANDING_${stamp}_UPDATED`, status: 'paused' }
  );

  await createCase(
    'rule',
    '/api/rules',
    {
      name: `E2E_AUDIT_RULE_${stamp}`,
      description: 'Automated production audit record',
      type: 'campaign',
      priority: 999,
      enabled: false,
      conditions: [{ metric: 'roi', operator: '<', value: 0.5, duration: '24h' }],
      actions: [{ type: 'pause_campaign', platform: 'all', parameters: {} }],
    },
    { name: `E2E_AUDIT_RULE_${stamp}_UPDATED`, enabled: false }
  );

  await createCase(
    'trafficSource',
    '/api/traffic-sources',
    {
      name: `E2E_AUDIT_TS_${stamp}`,
      type: 'other',
      postbackUrl: '',
      costModel: 'cpc',
      costValue: 0.1,
      currency: 'USD',
      status: 'paused',
      templateId: '',
      parameters: [],
      postbackConfig: { url: '', sendOnlyStatuses: ['sale'], customParams: {}, taboolaKey: '' },
      apiConfig: { enabled: false, baseUrl: '', apiKey: '' },
    },
    { name: `E2E_AUDIT_TS_${stamp}_UPDATED` }
  );

  await createCase(
    'offer',
    '/api/offers',
    {
      name: `E2E_AUDIT_OFFER_${stamp}`,
      url: `https://example.com/offer-${stamp}`,
      payout: 1.23,
      payoutType: 'fixed',
      redirectType: 'http',
      status: 'paused',
    },
    { name: `E2E_AUDIT_OFFER_${stamp}_UPDATED`, status: 'paused' }
  );

  await createCase(
    'affiliateNetwork',
    '/api/affiliate-networks',
    {
      name: `E2E_AUDIT_NET_${stamp}`,
      templateId: 'custom',
      type: 'api',
      status: 'paused',
      apiUrl: 'https://api.example.com',
      offerParameters: [],
    },
    { name: `E2E_AUDIT_NET_${stamp}_UPDATED`, status: 'paused' }
  );

  const campaign = await createCase(
    'campaign',
    '/api/campaigns',
    {
      name: `E2E_AUDIT_CAMPAIGN_${stamp}`,
      alias: `e2e-audit-campaign-${stamp}`,
      domain: 'example.com',
      group: 'E2E',
      trafficSource: '',
      flowRotation: 'weight',
      costModel: 'cpc',
      costValue: 0.1,
      currency: 'USD',
      uniquenessMethod: 'none',
      uniquenessParameter: '',
      uniquenessTTL: 86400,
      visitorBinding: 'none',
      status: 'paused',
      filterConfig: {
        groups: [{ id: 'default-group', name: 'Default Group', logic: 'AND', conditions: [] }],
        globalLogic: 'AND',
      },
      notes: 'Automated production audit record',
      flows: [],
      connections: [],
    },
    { name: `E2E_AUDIT_CAMPAIGN_${stamp}_UPDATED`, status: 'paused' }
  );

  return {
    results,
    campaignId: campaign.createBody?.data?.id || null,
    landingId: landing.createBody?.data?.id || null,
    cleanup,
  };
}

async function runCleanup(cleanup) {
  const client = axios.create({
    baseURL: BASE_URL,
    timeout: 30000,
    validateStatus: () => true,
  });

  const results = [];
  const queue = Array.isArray(cleanup) ? [...cleanup] : [];

  while (queue.length) {
    const item = queue.pop();
    const del = await client.delete(`${item.pathName}/${item.id}`);
    results.push({
      name: `${item.pathName}:${item.id}:delete`,
      deleteStatus: del.status,
      deleteBody: del.data,
    });
  }

  return results;
}

async function runApiSmoke() {
  const client = axios.create({
    baseURL: BASE_URL,
    timeout: 30000,
    validateStatus: () => true,
  });
  const endpoints = [
    '/health',
    '/api/campaigns',
    '/api/landing-pages',
    '/api/offers',
    '/api/traffic-sources',
    '/api/affiliate-networks',
    '/api/rules',
    '/api/platforms',
    '/api/platforms/configured',
    '/api/blacklist',
    '/api/whitelist',
    '/api/clicks',
    '/api/clicks/stats?startDate=2026-04-01&endDate=2026-04-05',
    '/api/analytics/dashboard?range=today',
    '/api/analytics/recent-clicks?limit=10',
    '/api/analytics/entity-stats?type=campaigns&range=today',
    '/api/trends/report',
  ];

  const results = [];
  for (const endpoint of endpoints) {
    const response = await client.get(endpoint);
    results.push({
      endpoint,
      status: response.status,
      bodySample: JSON.stringify(response.data).slice(0, 400),
    });
  }
  return results;
}

async function runPageAudits(campaignId) {
  const browser = await chromium.launch({ headless: true });
  const desktopPage = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  const desktop = [];
  for (const route of ROUTES) {
    desktop.push({
      route: route.key,
      label: route.label,
      ...await capturePageSummary(desktopPage, route, 'desktop'),
    });
  }

  if (campaignId) {
    desktop.push({
      route: 'campaign-detail',
      label: 'Campaign Detail',
      ...await capturePageSummary(
        desktopPage,
        { key: 'campaign-detail', path: `#/campaigns/${campaignId}`, label: 'Campaign Detail' },
        'desktop'
      ),
    });
  }
  await desktopPage.close();

  const mobileContext = await browser.newContext({
    ...devices['iPhone 13'],
  });
  const mobilePage = await mobileContext.newPage();
  const mobile = [];
  for (const route of ROUTES) {
    mobile.push({
      route: route.key,
      label: route.label,
      ...await capturePageSummary(mobilePage, route, 'mobile'),
    });
  }
  await mobileContext.close();

  const desktopInteractions = await runDesktopInteractions(browser, campaignId);
  const mobileInteractions = await runMobileInteractions(browser);

  await browser.close();
  return { desktop, mobile, desktopInteractions, mobileInteractions };
}

async function main() {
  ensureDir(SCREENSHOT_DIR);

  const outputPath = path.join(OUT_DIR, 'audit-results.json');
  const report = {
    meta: {
      baseUrl: BASE_URL,
      startedAt: new Date().toISOString(),
      outDir: OUT_DIR,
      note: 'Executed against local wrangler remote preview of the deployed Worker because direct workers.dev browser access was blocked by network/proxy conditions.',
    },
  };

  try {
    report.apiSmoke = await runApiSmoke();
    report.crudAudit = await runCrudAudit();
    report.pageAudit = await runPageAudits(report.crudAudit.campaignId);
    report.cleanup = await runCleanup(report.crudAudit.cleanup);
    report.meta.finishedAt = new Date().toISOString();
  } catch (error) {
    if (report.crudAudit?.cleanup) {
      report.cleanup = await runCleanup(report.crudAudit.cleanup);
    }
    report.meta.finishedAt = new Date().toISOString();
    report.meta.error = error instanceof Error ? error.message : String(error);
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    throw error;
  }

  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(outputPath);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
