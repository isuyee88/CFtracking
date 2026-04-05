import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, devices } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const runId = new Date().toISOString().replace(/[:.]/g, '-');
const artifactDir = path.join(repoRoot, 'output', 'playwright', `prod-audit-${runId}`);

const BASE_URL = 'https://t.isuyee.com';
const PROXY_SERVER = 'http://127.0.0.1:12334';

const desktopRoutes = [
  { id: 'root', label: 'Root', url: `${BASE_URL}/` },
  { id: 'dashboard', label: 'Dashboard', url: `${BASE_URL}/#/dashboard` },
  { id: 'campaigns', label: 'Campaigns', url: `${BASE_URL}/#/campaigns` },
  { id: 'rules', label: 'Rules', url: `${BASE_URL}/#/rules` },
  { id: 'platforms', label: 'Platforms', url: `${BASE_URL}/#/platforms` },
  { id: 'landings', label: 'Landings', url: `${BASE_URL}/#/landings` },
  { id: 'offers', label: 'Offers', url: `${BASE_URL}/#/offers` },
  { id: 'traffic-sources', label: 'Traffic Sources', url: `${BASE_URL}/#/traffic-sources` },
  { id: 'affiliate-networks', label: 'Affiliate Networks', url: `${BASE_URL}/#/affiliate-networks` },
  { id: 'trends', label: 'Trends', url: `${BASE_URL}/#/trends` },
  { id: 'reports', label: 'Reports', url: `${BASE_URL}/#/reports` },
  { id: 'audit', label: 'Click Log', url: `${BASE_URL}/#/audit` },
  { id: 'conversions', label: 'Conversions', url: `${BASE_URL}/#/conversions` },
  { id: 'blacklist', label: 'Blacklist', url: `${BASE_URL}/#/blacklist` },
  { id: 'whitelist', label: 'Whitelist', url: `${BASE_URL}/#/whitelist` },
  { id: 'target', label: 'Target', url: `${BASE_URL}/#/target` },
  { id: 'settings', label: 'Settings', url: `${BASE_URL}/#/settings` },
  { id: 'help', label: 'Help Center', url: `${BASE_URL}/#/help` },
];

const mobileRoutes = [
  { id: 'dashboard-mobile', label: 'Dashboard', url: `${BASE_URL}/#/dashboard` },
  { id: 'campaigns-mobile', label: 'Campaigns', url: `${BASE_URL}/#/campaigns` },
  { id: 'landings-mobile', label: 'Landings', url: `${BASE_URL}/#/landings` },
  { id: 'offers-mobile', label: 'Offers', url: `${BASE_URL}/#/offers` },
  { id: 'traffic-sources-mobile', label: 'Traffic Sources', url: `${BASE_URL}/#/traffic-sources` },
  { id: 'trends-mobile', label: 'Trends', url: `${BASE_URL}/#/trends` },
  { id: 'audit-mobile', label: 'Click Log', url: `${BASE_URL}/#/audit` },
  { id: 'rules-mobile', label: 'Rules', url: `${BASE_URL}/#/rules` },
  { id: 'settings-mobile', label: 'Settings', url: `${BASE_URL}/#/settings` },
  { id: 'blacklist-mobile', label: 'Blacklist', url: `${BASE_URL}/#/blacklist` },
  { id: 'whitelist-mobile', label: 'Whitelist', url: `${BASE_URL}/#/whitelist` },
  { id: 'help-mobile', label: 'Help Center', url: `${BASE_URL}/#/help` },
];

function reservedIp(seed, offset = 0) {
  const suffix = ((seed % 200) + 10 + offset) % 250;
  return `203.0.113.${suffix}`;
}

function sanitizeFileName(value) {
  return value.replace(/[^a-z0-9-]+/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').toLowerCase();
}

function summarizeApiCalls(apiCalls) {
  return apiCalls
    .map((call) => ({
      path: call.path,
      status: call.status,
      method: call.method,
      ok: call.ok,
    }))
    .slice(0, 50);
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function safeClick(locator) {
  if (await locator.count()) {
    try {
      await locator.first().click({ timeout: 3000 });
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

async function collectPageSnapshot(page) {
  return page.evaluate(() => {
    const text = document.body.innerText || '';
    const headings = Array.from(document.querySelectorAll('h1,h2,h3'))
      .map((node) => node.textContent?.trim())
      .filter(Boolean)
      .slice(0, 10);
    const buttons = Array.from(document.querySelectorAll('button'))
      .map((node) => node.textContent?.trim())
      .filter(Boolean)
      .slice(0, 20);
    const dialogTitles = Array.from(document.querySelectorAll('[role="dialog"] h1,[role="dialog"] h2,[role="dialog"] h3,.fixed.inset-0 h1,.fixed.inset-0 h2,.fixed.inset-0 h3'))
      .map((node) => node.textContent?.trim())
      .filter(Boolean)
      .slice(0, 10);

    return {
      title: document.title,
      locationHref: window.location.href,
      locationHash: window.location.hash,
      textLength: text.trim().length,
      textSample: text.trim().slice(0, 240),
      hasMain: Boolean(document.querySelector('[role="main"], main')),
      headings,
      buttons,
      dialogTitles,
      tableCount: document.querySelectorAll('table,[role="table"]').length,
      formCount: document.querySelectorAll('form').length,
      inputCount: document.querySelectorAll('input,select,textarea').length,
      svgCount: document.querySelectorAll('svg').length,
      chartLikeCount: document.querySelectorAll('[class*="chart"],[class*="Chart"],svg').length,
      mobileNavVisible: Boolean(document.querySelector('.mobile-bottom-nav')),
      darkMode: document.documentElement.classList.contains('dark-mode'),
      hasKnownErrorText: /failed to|something went wrong|campaign not found|error/i.test(text),
      bodyClassName: document.body.className,
    };
  });
}

async function auditRoute(page, route, mode) {
  const consoleErrors = [];
  const pageErrors = [];
  const requestFailures = [];
  const apiCalls = [];

  const onConsole = (msg) => {
    const type = msg.type();
    if (type === 'error') {
      consoleErrors.push(msg.text());
    }
  };
  const onPageError = (err) => pageErrors.push(err.message);
  const onRequestFailed = (req) => {
    requestFailures.push({
      url: req.url(),
      method: req.method(),
      failure: req.failure()?.errorText || 'unknown',
    });
  };
  const onResponse = (response) => {
    const url = response.url();
    if (url.startsWith(BASE_URL) && url.includes('/api/')) {
      apiCalls.push({
        path: url.replace(BASE_URL, ''),
        status: response.status(),
        ok: response.ok(),
        method: response.request().method(),
      });
    }
  };

  page.on('console', onConsole);
  page.on('pageerror', onPageError);
  page.on('requestfailed', onRequestFailed);
  page.on('response', onResponse);

  let navigateError = null;
  try {
    await page.goto(route.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);
  } catch (error) {
    navigateError = error instanceof Error ? error.message : String(error);
  }

  const snapshot = await collectPageSnapshot(page).catch((error) => ({
    snapshotError: error instanceof Error ? error.message : String(error),
  }));

  const screenshotPath = path.join(
    artifactDir,
    'screenshots',
    `${mode}-${sanitizeFileName(route.id)}.png`
  );
  await ensureDir(path.dirname(screenshotPath));
  await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});

  page.off('console', onConsole);
  page.off('pageerror', onPageError);
  page.off('requestfailed', onRequestFailed);
  page.off('response', onResponse);

  const status =
    navigateError || snapshot.snapshotError
      ? 'fail'
      : pageErrors.length || requestFailures.length
        ? 'warn'
        : snapshot.hasKnownErrorText
          ? 'warn'
          : 'pass';

  return {
    route: route.label,
    mode,
    status,
    url: route.url,
    navigateError,
    snapshot,
    consoleErrors,
    pageErrors,
    requestFailures,
    apiCalls: summarizeApiCalls(apiCalls),
    screenshotPath,
  };
}

async function runSettingsInteractions(page) {
  const findings = [];
  await page.goto(`${BASE_URL}/#/settings`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(1500);

  for (const tab of ['Account', 'Notifications', 'Security', 'General']) {
    const button = page.getByRole('button', { name: tab });
    if (await button.count()) {
      await button.first().click();
      await page.waitForTimeout(300);
      findings.push({
        tab,
        visible: true,
        headings: await page.locator('h2').allTextContents().catch(() => []),
      });
    } else {
      findings.push({ tab, visible: false });
    }
  }

  return findings;
}

async function runTrendsInteractions(page, isMobile) {
  const findings = [];
  await page.goto(`${BASE_URL}/#/trends`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2500);

  const filterButton = page.getByRole('button', { name: /filter/i });
  findings.push({ action: 'filter-button', clicked: await safeClick(filterButton) });
  await page.waitForTimeout(300);

  const presetButton = page.getByRole('button', { name: /last 7 days|today|yesterday|this month|custom/i });
  findings.push({ action: 'date-preset-button', clicked: await safeClick(presetButton) });
  await page.waitForTimeout(300);

  if (await page.getByRole('button', { name: 'Custom' }).count()) {
    await page.getByRole('button', { name: 'Custom' }).first().click();
    await page.waitForTimeout(300);
    findings.push({
      action: 'custom-date-popup',
      visible: await page.locator('text=Custom Date Range').count(),
    });
    await safeClick(page.getByRole('button', { name: /cancel/i }));
  }

  if (isMobile) {
    for (const tab of ['Revenue', 'ROI', 'EPC', 'Clicks']) {
      const button = page.getByRole('button', { name: tab });
      findings.push({ action: `mobile-chart-tab-${tab}`, clicked: await safeClick(button) });
      await page.waitForTimeout(150);
    }
  }

  return findings;
}

async function runBlacklistModalCheck(page, routeName) {
  await page.goto(`${BASE_URL}/#/${routeName}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2000);

  const addButton = page.getByRole('button', { name: /add entry/i });
  const modalOpened = await safeClick(addButton);
  await page.waitForTimeout(300);
  const titleCount = await page.locator('text=Add Entry').count().catch(() => 0);
  const dialogVisible = await page.locator('.fixed.inset-0, [role="dialog"]').count().catch(() => 0);
  const cancelButton = page.getByRole('button', { name: /cancel/i });
  await safeClick(cancelButton);

  return {
    routeName,
    modalOpened,
    titleCount,
    dialogVisible,
  };
}

async function runDashboardThemeAndPreferences(page) {
  await page.goto(`${BASE_URL}/#/dashboard`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2500);

  const themeButton = page.getByRole('button', { name: /switch to dark mode|switch to light mode/i });
  const before = await page.evaluate(() => document.documentElement.classList.contains('dark-mode'));
  const themeClicked = await safeClick(themeButton);
  await page.waitForTimeout(400);
  const after = await page.evaluate(() => document.documentElement.classList.contains('dark-mode'));

  const preferenceButton = page.getByRole('button', { name: /preferences/i });
  const preferenceClicked = await safeClick(preferenceButton);
  await page.waitForTimeout(300);
  const preferenceVisible = await page.locator('text=Preferences').count().catch(() => 0);
  await page.keyboard.press('Escape').catch(() => {});

  return {
    themeClicked,
    darkModeBefore: before,
    darkModeAfter: after,
    preferenceClicked,
    preferenceVisible,
  };
}

async function runRulesModalCheck(page) {
  await page.goto(`${BASE_URL}/#/rules`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2000);

  const createButton = page.getByRole('button', { name: /create rule/i });
  const opened = await safeClick(createButton);
  await page.waitForTimeout(300);
  const modalVisible = await page.locator('text=Create Rule').count().catch(() => 0);
  await safeClick(page.getByRole('button', { name: /cancel/i }));

  return { opened, modalVisible };
}

async function runPlatformModalCheck(page) {
  await page.goto(`${BASE_URL}/#/platforms`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2000);
  const configureButton = page.locator('button[title="Configure"]');
  const opened = await safeClick(configureButton);
  await page.waitForTimeout(300);
  const modalVisible = await page.locator('text=Configure').count().catch(() => 0);
  await safeClick(page.getByRole('button', { name: /save configuration|cancel/i }));

  return { opened, modalVisible };
}

async function getCampaignDetailAudit(page) {
  const campaignsResponse = await page.evaluate(async () => {
    const response = await fetch('/api/campaigns');
    const data = await response.json();
    return data?.data?.list || data?.data || [];
  });

  if (!Array.isArray(campaignsResponse) || campaignsResponse.length === 0) {
    return { skipped: true, reason: 'No campaign data available in production' };
  }

  const first = campaignsResponse[0];
  const campaignId = first.id || first.displayId;

  await page.goto(`${BASE_URL}/#/campaigns/${campaignId}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2500);

  const tabFindings = [];
  for (const tab of ['Flow', 'Reports', 'Filters', 'Tracking Code', 'Settings', 'Overview']) {
    const button = page.getByRole('button', { name: new RegExp(tab, 'i') });
    const clicked = await safeClick(button);
    await page.waitForTimeout(250);
    tabFindings.push({ tab, clicked });
  }

  const editButton = page.getByRole('button', { name: /edit campaign/i });
  const editOpened = await safeClick(editButton);
  await page.waitForTimeout(300);
  const editSectionButtons = [];
  for (const section of ['Targeting', 'Filters', 'Tracking', 'Basic Info']) {
    const button = page.getByRole('button', { name: new RegExp(section, 'i') });
    editSectionButtons.push({ section, clicked: await safeClick(button) });
    await page.waitForTimeout(150);
  }
  await page.keyboard.press('Escape').catch(() => {});

  return {
    skipped: false,
    campaignId,
    campaignName: first.name,
    tabFindings,
    editOpened,
    editSectionButtons,
  };
}

async function browserApiFetch(page, endpoint, options = {}) {
  return page.evaluate(
    async ({ endpointArg, optionsArg }) => {
      const response = await fetch(endpointArg, optionsArg);
      const text = await response.text();
      let json = null;
      try {
        json = JSON.parse(text);
      } catch {
        json = null;
      }
      return {
        status: response.status,
        ok: response.ok,
        text,
        json,
      };
    },
    { endpointArg: endpoint, optionsArg: options }
  );
}

async function runApiAudit(page) {
  const now = new Date();
  const endDate = now.toISOString().split('T')[0];
  const start = new Date(now);
  start.setDate(start.getDate() - 7);
  const startDate = start.toISOString().split('T')[0];

  const getEndpoints = [
    '/health',
    '/api/deployment/info',
    '/api/analytics/dashboard?range=today',
    '/api/analytics/recent-clicks?limit=10',
    '/api/analytics/entity-stats?type=campaigns&range=today',
    `/api/trends/report?startDate=${startDate}&endDate=${endDate}&interval=day`,
    '/api/campaigns',
    '/api/offers?withStats=true',
    '/api/landing-pages?withStats=true',
    '/api/traffic-sources?withStats=true',
    '/api/affiliate-networks?withStats=true',
    '/api/rules',
    '/api/clicks?limit=10',
    '/api/conversions?limit=10',
    '/api/blacklist',
    '/api/whitelist',
    '/api/user-preferences/preferences/default-user',
    '/api/migration/status',
  ];

  const getResults = [];
  for (const endpoint of getEndpoints) {
    const result = await browserApiFetch(page, endpoint);
    getResults.push({
      endpoint,
      status: result.status,
      ok: result.ok,
      hasJson: Boolean(result.json),
      bodyPreview: result.text.slice(0, 200),
    });
  }

  const deploymentInfo = getResults.find((item) => item.endpoint === '/api/deployment/info');
  const deploymentLeakCheck = await browserApiFetch(page, '/api/deployment/info');
  const deploymentPayload = deploymentLeakCheck.json?.data || deploymentLeakCheck.json || {};
  const forbiddenKeys = ['hash', 'branch', 'message', 'author', 'authorEmail', 'commit', 'commitMessage'];
  const leakedKeys = forbiddenKeys.filter((key) => key in deploymentPayload);

  const trafficSourcesResponse = await browserApiFetch(page, '/api/traffic-sources');
  const trafficSources = trafficSourcesResponse.json?.data?.list || trafficSourcesResponse.json?.data || [];
  const trafficSourceId = Array.isArray(trafficSources) && trafficSources[0] ? trafficSources[0].id : null;

  const crudResults = [];
  if (trafficSourceId) {
    const uniqueSuffix = Date.now();
    const blacklistValue = reservedIp(uniqueSuffix, 0);
    const whitelistValue = reservedIp(uniqueSuffix, 1);

    const blacklistCreate = await browserApiFetch(page, '/api/blacklist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trafficSourceId,
        type: 'ip',
        value: blacklistValue,
        name: `codex-blacklist-${uniqueSuffix}`,
        reason: 'codex production audit',
        ipMatchMode: 'exact',
        syncToPlatform: false,
      }),
    });
    const blacklistId = blacklistCreate.json?.data?.id;
    crudResults.push({ entity: 'blacklist', step: 'create', status: blacklistCreate.status, ok: blacklistCreate.ok });

    if (blacklistId) {
      const blacklistGet = await browserApiFetch(page, `/api/blacklist/${blacklistId}`);
      const blacklistUpdate = await browserApiFetch(page, `/api/blacklist/${blacklistId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'codex production audit updated' }),
      });
      const blacklistDelete = await browserApiFetch(page, `/api/blacklist/${blacklistId}`, { method: 'DELETE' });

      crudResults.push({ entity: 'blacklist', step: 'get', status: blacklistGet.status, ok: blacklistGet.ok });
      crudResults.push({ entity: 'blacklist', step: 'update', status: blacklistUpdate.status, ok: blacklistUpdate.ok });
      crudResults.push({ entity: 'blacklist', step: 'delete', status: blacklistDelete.status, ok: blacklistDelete.ok });
    }

    const whitelistCreate = await browserApiFetch(page, '/api/whitelist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trafficSourceId,
        type: 'ip',
        value: whitelistValue,
        name: `codex-whitelist-${uniqueSuffix}`,
        reason: 'codex production audit',
        ipMatchMode: 'exact',
        syncToPlatform: false,
      }),
    });
    const whitelistId = whitelistCreate.json?.data?.id;
    crudResults.push({ entity: 'whitelist', step: 'create', status: whitelistCreate.status, ok: whitelistCreate.ok });

    if (whitelistId) {
      const whitelistGet = await browserApiFetch(page, `/api/whitelist/${whitelistId}`);
      const whitelistUpdate = await browserApiFetch(page, `/api/whitelist/${whitelistId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'codex production audit updated' }),
      });
      const whitelistDelete = await browserApiFetch(page, `/api/whitelist/${whitelistId}`, { method: 'DELETE' });

      crudResults.push({ entity: 'whitelist', step: 'get', status: whitelistGet.status, ok: whitelistGet.ok });
      crudResults.push({ entity: 'whitelist', step: 'update', status: whitelistUpdate.status, ok: whitelistUpdate.ok });
      crudResults.push({ entity: 'whitelist', step: 'delete', status: whitelistDelete.status, ok: whitelistDelete.ok });
    }
  }

  return {
    getResults,
    deploymentInfoStatus: deploymentInfo?.status || null,
    leakedKeys,
    trafficSourceId,
    crudResults,
  };
}

async function runUiAudit(browser) {
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 1080 },
    ignoreHTTPSErrors: true,
  });
  const desktopPage = await desktopContext.newPage();

  const desktopResults = [];
  for (const route of desktopRoutes) {
    desktopResults.push(await auditRoute(desktopPage, route, 'desktop'));
  }

  const interactionResults = {
    dashboard: await runDashboardThemeAndPreferences(desktopPage),
    settings: await runSettingsInteractions(desktopPage),
    trendsDesktop: await runTrendsInteractions(desktopPage, false),
    blacklist: await runBlacklistModalCheck(desktopPage, 'blacklist'),
    whitelist: await runBlacklistModalCheck(desktopPage, 'whitelist'),
    rules: await runRulesModalCheck(desktopPage),
    platforms: await runPlatformModalCheck(desktopPage),
    campaignDetail: await getCampaignDetailAudit(desktopPage),
  };

  const apiAudit = await runApiAudit(desktopPage);
  await desktopContext.close();

  const mobileContext = await browser.newContext({
    ...devices['iPhone 13'],
    ignoreHTTPSErrors: true,
  });
  const mobilePage = await mobileContext.newPage();

  const mobileResults = [];
  for (const route of mobileRoutes) {
    mobileResults.push(await auditRoute(mobilePage, route, 'mobile'));
  }

  const mobileInteractions = {
    trendsMobile: await runTrendsInteractions(mobilePage, true),
  };
  await mobileContext.close();

  return {
    desktopResults,
    mobileResults,
    interactionResults,
    mobileInteractions,
    apiAudit,
  };
}

async function main() {
  await ensureDir(artifactDir);
  const browser = await chromium.launch({
    headless: true,
    proxy: { server: PROXY_SERVER },
  });

  try {
    const uiAudit = await runUiAudit(browser);
    const report = {
      generatedAt: new Date().toISOString(),
      baseUrl: BASE_URL,
      proxy: PROXY_SERVER,
      artifactDir,
      ...uiAudit,
    };

    const reportPath = path.join(artifactDir, 'prod-audit.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');
    console.log(JSON.stringify({ ok: true, reportPath, artifactDir }, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
