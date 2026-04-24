import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium, devices } from 'playwright';

const BASE_URL = process.env.BASE_URL || 'https://t.isuyee.com';
const PROXY_SERVER = process.env.PROXY_SERVER || '';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const RUN_ID = new Date().toISOString().replace(/[:.]/g, '-');
const OUTPUT_DIR = path.resolve('output', 'playwright', `prod-auth-audit-${RUN_ID}`);

const ROUTES = [
  { key: 'dashboard', path: '/dashboard' },
  { key: 'campaigns', path: '/campaigns' },
  { key: 'rules', path: '/rules' },
  { key: 'platforms', path: '/platforms' },
  { key: 'landings', path: '/landings' },
  { key: 'offers', path: '/offers' },
  { key: 'traffic-sources', path: '/traffic-sources' },
  { key: 'affiliate-networks', path: '/affiliate-networks' },
  { key: 'reports', path: '/reports' },
  { key: 'audit', path: '/audit' },
  { key: 'conversions', path: '/conversions' },
  { key: 'blacklist', path: '/blacklist' },
  { key: 'whitelist', path: '/whitelist' },
  { key: 'target', path: '/target' },
  { key: 'settings', path: '/settings' },
  { key: 'domains', path: '/domains' },
  { key: 'help', path: '/help' },
];

const FORM_ROUTES = [
  '/campaigns',
  '/rules',
  '/landings',
  '/offers',
  '/traffic-sources',
  '/affiliate-networks',
  '/blacklist',
  '/whitelist',
  '/domains',
];

function toUrl(routePath) {
  return `${BASE_URL}/#${routePath}`;
}

function truncate(value, max = 300) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function normalizePath(value) {
  return value.replace(/[\\/:*?"<>|]+/g, '-');
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function safeParseResponse(response) {
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return {
    status: response.status(),
    ok: response.ok(),
    text: truncate(text, 400),
    json,
  };
}

async function loginAndGetToken(browser) {
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  try {
    const response = await context.request.post(`${BASE_URL}/api/auth/login`, {
      data: {
        username: ADMIN_USERNAME,
        password: ADMIN_PASSWORD,
      },
    });
    const result = await safeParseResponse(response);
    const token = result.json?.data?.token || null;
    return { ...result, token };
  } finally {
    await context.close();
  }
}

async function collectPageSignals(page) {
  return page.evaluate(() => {
    const text = document.body?.innerText || '';
    const fixedOverlays = Array.from(document.querySelectorAll('*'))
      .map((element) => {
        const style = getComputedStyle(element);
        if (style.position !== 'fixed') return null;
        const rect = element.getBoundingClientRect();
        const area = rect.width * rect.height;
        const viewportArea = window.innerWidth * window.innerHeight;
        const ratio = viewportArea > 0 ? area / viewportArea : 0;
        const zIndex = Number.parseInt(style.zIndex || '0', 10);
        if (ratio < 0.2 || zIndex < 100) return null;
        return {
          tag: element.tagName.toLowerCase(),
          className: element.className,
          ratio: Number(ratio.toFixed(3)),
          zIndex,
        };
      })
      .filter(Boolean)
      .slice(0, 8);

    const scrollContainers = Array.from(document.querySelectorAll('*'))
      .filter((element) => {
        const style = getComputedStyle(element);
        const overflowY = style.overflowY;
        const hasScrollableY = overflowY === 'auto' || overflowY === 'scroll';
        return hasScrollableY && element.scrollHeight > element.clientHeight + 4;
      })
      .map((element) => ({
        tag: element.tagName.toLowerCase(),
        className: element.className,
        scrollHeight: element.scrollHeight,
        clientHeight: element.clientHeight,
      }))
      .slice(0, 8);

    return {
      title: document.title,
      url: window.location.href,
      heading: document.querySelector('h1,h2,[data-testid="page-title"]')?.textContent?.trim() || '',
      textSample: text.trim().slice(0, 240),
      textLength: text.trim().length,
      tableCount: document.querySelectorAll('table,[role="table"],.ant-table').length,
      formCount: document.querySelectorAll('form').length,
      inputCount: document.querySelectorAll('input,textarea,select').length,
      dialogCount: document.querySelectorAll('[role="dialog"],.ant-modal,.fixed.inset-0').length,
      hasHorizontalOverflow:
        document.documentElement.scrollWidth > window.innerWidth + 4 ||
        document.body.scrollWidth > window.innerWidth + 4,
      fixedOverlays,
      scrollContainers,
      viewport: {
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight,
      },
    };
  });
}

async function auditRoutes(context, mode) {
  const page = await context.newPage();
  const routeAudit = [];

  for (const route of ROUTES) {
    const consoleErrors = [];
    const pageErrors = [];
    const failedRequests = [];

    const onConsole = (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(truncate(msg.text()));
      }
    };
    const onPageError = (err) => pageErrors.push(truncate(err.message));
    const onRequestFailed = (request) =>
      failedRequests.push({
        url: request.url(),
        method: request.method(),
        errorText: request.failure()?.errorText || 'unknown',
      });

    page.on('console', onConsole);
    page.on('pageerror', onPageError);
    page.on('requestfailed', onRequestFailed);

    let gotoError = null;
    try {
      await page.goto(toUrl(route.path), { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(2200);
    } catch (error) {
      gotoError = error instanceof Error ? error.message : String(error);
    }

    const signals = await collectPageSignals(page).catch((error) => ({
      collectError: error instanceof Error ? error.message : String(error),
    }));

    const screenshotPath = path.join(
      OUTPUT_DIR,
      'screenshots',
      mode,
      `${normalizePath(route.key)}.png`
    );
    await ensureDir(path.dirname(screenshotPath));
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});

    page.off('console', onConsole);
    page.off('pageerror', onPageError);
    page.off('requestfailed', onRequestFailed);

    routeAudit.push({
      route: route.path,
      mode,
      gotoError,
      consoleErrors,
      pageErrors,
      failedRequests,
      screenshotPath,
      ...signals,
    });
  }

  await page.close();
  return routeAudit;
}

async function findCreateButton(page) {
  const buttons = page.locator('button, [role="button"], a');
  const count = await buttons.count();
  const triggerRegex = /(create|add|new|新增|新建|创建)/i;

  for (let index = 0; index < Math.min(count, 120); index += 1) {
    const candidate = buttons.nth(index);
    const visible = await candidate.isVisible().catch(() => false);
    if (!visible) continue;
    const disabled =
      (await candidate.isDisabled().catch(() => false)) ||
      (await candidate.getAttribute('aria-disabled').catch(() => null)) === 'true';
    if (disabled) continue;
    const text = truncate(await candidate.innerText().catch(() => ''), 120);
    if (!text || !triggerRegex.test(text)) continue;
    return { locator: candidate, text };
  }

  return null;
}

async function auditForms(context) {
  const page = await context.newPage();
  const formAudit = [];

  for (const route of FORM_ROUTES) {
    await page.goto(toUrl(route), { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(2200);
    const createButton = await findCreateButton(page);

    if (!createButton) {
      const sampledTexts = await page.evaluate(() =>
        Array.from(document.querySelectorAll('button, [role="button"], a'))
          .map((element) => (element.textContent || '').trim())
          .filter(Boolean)
          .slice(0, 24)
      );
      formAudit.push({
        route,
        opened: false,
        reason: 'create-button-not-found',
        sampledTexts,
      });
      continue;
    }

    await createButton.locator.click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(900);

    const dialog = page.locator('[role="dialog"]:visible, .ant-modal:visible, .fixed.inset-0:visible').first();
    const dialogVisible = (await dialog.count()) > 0;
    const inputCount = dialogVisible
      ? await dialog.locator('input,textarea,select').count().catch(() => 0)
      : 0;
    const title = dialogVisible
      ? truncate(await dialog.locator('h1,h2,h3,.ant-modal-title').first().innerText().catch(() => ''), 120)
      : '';

    const screenshotPath = path.join(
      OUTPUT_DIR,
      'screenshots',
      'forms',
      `${normalizePath(route)}.png`
    );
    await ensureDir(path.dirname(screenshotPath));
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});

    formAudit.push({
      route,
      opened: dialogVisible,
      triggerText: createButton.text,
      title,
      inputCount,
      screenshotPath,
    });

    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(250);
  }

  await page.close();
  return formAudit;
}

async function apiCall(context, method, endpoint, data) {
  const response = await context.request.fetch(`${BASE_URL}${endpoint}`, {
    method,
    data,
    headers: data ? { 'Content-Type': 'application/json' } : undefined,
  });
  return safeParseResponse(response);
}

function pushResult(results, entity, step, response, expectedStatus) {
  const expected = Array.isArray(expectedStatus) ? expectedStatus : [expectedStatus];
  results.push({
    entity,
    step,
    status: response.status,
    ok: expected.includes(response.status),
    bodyPreview: response.text,
  });
}

async function runCrudAudit(context) {
  const results = [];
  const cleanup = [];
  const suffix = Date.now().toString();

  const unauthorizedContext = await context.browser().newContext({ ignoreHTTPSErrors: true });
  try {
    const unauthorizedResponse = await unauthorizedContext.request.get(`${BASE_URL}/api/campaigns?page=1&pageSize=1`);
    const unauthorizedParsed = await safeParseResponse(unauthorizedResponse);
    pushResult(results, 'auth', 'unauthorized-api-guard', unauthorizedParsed, 401);
  } finally {
    await unauthorizedContext.close();
  }

  const support = {
    trafficSourceId: null,
    domainId: null,
    domainHostname: null,
  };

  const trafficCreate = await apiCall(context, 'POST', '/api/traffic-sources', {
    name: `audit-ts-${suffix}`,
    type: 'other',
    postbackUrl: `https://example.com/postback/${suffix}`,
    costModel: 'cpc',
    costValue: 0.1,
    currency: 'USD',
  });
  pushResult(results, 'traffic-source', 'create', trafficCreate, 201);
  support.trafficSourceId = trafficCreate.json?.data?.id || null;
  if (support.trafficSourceId) {
    cleanup.push({ entity: 'traffic-source', id: support.trafficSourceId });
    const read = await apiCall(context, 'GET', `/api/traffic-sources/${support.trafficSourceId}`);
    pushResult(results, 'traffic-source', 'read', read, 200);
    const update = await apiCall(context, 'PUT', `/api/traffic-sources/${support.trafficSourceId}`, {
      name: `audit-ts-${suffix}-u`,
    });
    pushResult(results, 'traffic-source', 'update', update, 200);
  }

  const domainHostname = `audit-${suffix}.example.com`;
  const domainCreate = await apiCall(context, 'POST', '/api/domains', {
    hostname: domainHostname,
    usage: 'tracking',
    dnsProvider: 'manual',
    sslStatus: 'auto',
    validationEnabled: false,
  });
  pushResult(results, 'domain', 'create', domainCreate, 201);
  support.domainId = domainCreate.json?.data?.id || null;
  support.domainHostname = domainHostname;
  if (support.domainId) {
    cleanup.push({ entity: 'domain', id: support.domainId });
    const read = await apiCall(context, 'GET', `/api/domains/${support.domainId}`);
    pushResult(results, 'domain', 'read', read, 200);
    const update = await apiCall(context, 'PUT', `/api/domains/${support.domainId}`, {
      notes: `audit-updated-${suffix}`,
    });
    pushResult(results, 'domain', 'update', update, 200);
  }

  const offerCreate = await apiCall(context, 'POST', '/api/offers', {
    name: `audit-offer-${suffix}`,
    url: `https://example.com/offer/${suffix}`,
    payout: 1.23,
    currency: 'USD',
    payoutType: 'fixed',
    redirectType: 'http',
    actionType: 'redirect',
  });
  pushResult(results, 'offer', 'create', offerCreate, 201);
  const offerId = offerCreate.json?.data?.id || null;
  if (offerId) {
    const read = await apiCall(context, 'GET', `/api/offers/${offerId}`);
    pushResult(results, 'offer', 'read', read, 200);
    const update = await apiCall(context, 'PUT', `/api/offers/${offerId}`, {
      name: `audit-offer-${suffix}-u`,
    });
    pushResult(results, 'offer', 'update', update, 200);
    const remove = await apiCall(context, 'DELETE', `/api/offers/${offerId}`);
    pushResult(results, 'offer', 'delete', remove, 200);
  }

  const landingCreate = await apiCall(context, 'POST', '/api/landing-pages', {
    name: `audit-landing-${suffix}`,
    url: `https://example.com/landing/${suffix}`,
    preloadType: 'none',
    preloadEnabled: false,
  });
  pushResult(results, 'landing-page', 'create', landingCreate, 201);
  const landingId = landingCreate.json?.data?.id || null;
  if (landingId) {
    const read = await apiCall(context, 'GET', `/api/landing-pages/${landingId}`);
    pushResult(results, 'landing-page', 'read', read, 200);
    const update = await apiCall(context, 'PUT', `/api/landing-pages/${landingId}`, {
      name: `audit-landing-${suffix}-u`,
    });
    pushResult(results, 'landing-page', 'update', update, 200);
    const remove = await apiCall(context, 'DELETE', `/api/landing-pages/${landingId}`);
    pushResult(results, 'landing-page', 'delete', remove, 200);
  }

  const affiliateCreate = await apiCall(context, 'POST', '/api/affiliate-networks', {
    name: `audit-aff-${suffix}`,
    type: 'other',
  });
  pushResult(results, 'affiliate-network', 'create', affiliateCreate, 201);
  const affiliateId = affiliateCreate.json?.data?.id || null;
  if (affiliateId) {
    const read = await apiCall(context, 'GET', `/api/affiliate-networks/${affiliateId}`);
    pushResult(results, 'affiliate-network', 'read', read, 200);
    const update = await apiCall(context, 'PUT', `/api/affiliate-networks/${affiliateId}`, {
      notes: `audit-updated-${suffix}`,
    });
    pushResult(results, 'affiliate-network', 'update', update, 200);
    const remove = await apiCall(context, 'DELETE', `/api/affiliate-networks/${affiliateId}`);
    pushResult(results, 'affiliate-network', 'delete', remove, 200);
  }

  const campaignCreate = await apiCall(context, 'POST', '/api/campaigns', {
    name: `audit-campaign-${suffix}`,
    alias: `a${suffix}`.slice(0, 30),
    domain: support.domainHostname || 'example.com',
    trafficSource: support.trafficSourceId || undefined,
  });
  pushResult(results, 'campaign', 'create', campaignCreate, 201);
  const campaignId = campaignCreate.json?.data?.id || null;
  if (campaignId) {
    const read = await apiCall(context, 'GET', `/api/campaigns/${campaignId}`);
    pushResult(results, 'campaign', 'read', read, 200);
    const update = await apiCall(context, 'PUT', `/api/campaigns/${campaignId}`, {
      name: `audit-campaign-${suffix}-u`,
    });
    pushResult(results, 'campaign', 'update', update, 200);
    const remove = await apiCall(context, 'DELETE', `/api/campaigns/${campaignId}`);
    pushResult(results, 'campaign', 'delete', remove, 200);
  }

  const ruleCreate = await apiCall(context, 'POST', '/api/rules', {
    name: `audit-rule-${suffix}`,
    type: 'performance',
    conditions: [
      {
        metric: 'roi',
        operator: '<',
        value: 0,
        duration: '24h',
        aggregation: 'avg',
      },
    ],
    actions: [
      {
        type: 'pause_campaign',
        platform: 'system',
        parameters: {},
        delay: 0,
        retry: 0,
      },
    ],
    priority: 10,
    enabled: true,
  });
  pushResult(results, 'rule', 'create', ruleCreate, 201);
  const ruleId = ruleCreate.json?.data?.id || null;
  if (ruleId) {
    const read = await apiCall(context, 'GET', `/api/rules/${ruleId}`);
    pushResult(results, 'rule', 'read', read, 200);
    const update = await apiCall(context, 'PUT', `/api/rules/${ruleId}`, {
      priority: 20,
    });
    pushResult(results, 'rule', 'update', update, 200);
    const remove = await apiCall(context, 'DELETE', `/api/rules/${ruleId}`);
    pushResult(results, 'rule', 'delete', remove, 200);
  }

  if (support.trafficSourceId) {
    const blacklistCreate = await apiCall(context, 'POST', '/api/blacklist', {
      trafficSourceId: support.trafficSourceId,
      type: 'ip',
      value: `203.0.113.${Number(suffix.slice(-2)) % 200}`,
      name: `audit-black-${suffix}`,
      reason: 'prod-audit',
      ipMatchMode: 'exact',
      syncToPlatform: false,
    });
    pushResult(results, 'blacklist', 'create', blacklistCreate, 201);
    const blacklistId = blacklistCreate.json?.data?.id || null;
    if (blacklistId) {
      const read = await apiCall(context, 'GET', `/api/blacklist/${blacklistId}`);
      pushResult(results, 'blacklist', 'read', read, 200);
      const update = await apiCall(context, 'PUT', `/api/blacklist/${blacklistId}`, {
        reason: `prod-audit-updated-${suffix}`,
      });
      pushResult(results, 'blacklist', 'update', update, 200);
      const remove = await apiCall(context, 'DELETE', `/api/blacklist/${blacklistId}`);
      pushResult(results, 'blacklist', 'delete', remove, 200);
    }

    const whitelistCreate = await apiCall(context, 'POST', '/api/whitelist', {
      trafficSourceId: support.trafficSourceId,
      type: 'ip',
      value: `203.0.114.${Number(suffix.slice(-2)) % 200}`,
      name: `audit-white-${suffix}`,
      reason: 'prod-audit',
      ipMatchMode: 'exact',
      syncToPlatform: false,
    });
    pushResult(results, 'whitelist', 'create', whitelistCreate, 201);
    const whitelistId = whitelistCreate.json?.data?.id || null;
    if (whitelistId) {
      const read = await apiCall(context, 'GET', `/api/whitelist/${whitelistId}`);
      pushResult(results, 'whitelist', 'read', read, 200);
      const update = await apiCall(context, 'PUT', `/api/whitelist/${whitelistId}`, {
        reason: `prod-audit-updated-${suffix}`,
      });
      pushResult(results, 'whitelist', 'update', update, 200);
      const remove = await apiCall(context, 'DELETE', `/api/whitelist/${whitelistId}`);
      pushResult(results, 'whitelist', 'delete', remove, 200);
    }
  }

  const flowsCheck = await apiCall(context, 'GET', '/api/flows?page=1&pageSize=1');
  pushResult(results, 'keitaro-parity', 'flows-endpoint', flowsCheck, 200);
  const reportsCheck = await apiCall(context, 'POST', '/api/analytics/reports/query', {
    type: 'traffic',
    range: 'last7days',
    limit: 10,
  });
  pushResult(results, 'keitaro-parity', 'report-query-endpoint', reportsCheck, [200, 400]);

  for (const item of cleanup.reverse()) {
    const endpoint = item.entity === 'traffic-source' ? '/api/traffic-sources' : '/api/domains';
    const remove = await apiCall(context, 'DELETE', `${endpoint}/${item.id}`);
    pushResult(results, item.entity, 'delete', remove, 200);
  }

  return results;
}

function summarizeCrud(results) {
  const byEntity = new Map();
  for (const row of results) {
    const current = byEntity.get(row.entity) || { total: 0, ok: 0, failedSteps: [] };
    current.total += 1;
    if (row.ok) {
      current.ok += 1;
    } else {
      current.failedSteps.push({
        step: row.step,
        status: row.status,
        bodyPreview: row.bodyPreview,
      });
    }
    byEntity.set(row.entity, current);
  }

  return Object.fromEntries(byEntity.entries());
}

async function main() {
  await ensureDir(OUTPUT_DIR);
  const launchOptions = {
    headless: true,
    args: ['--ignore-certificate-errors'],
  };

  if (PROXY_SERVER) {
    launchOptions.proxy = { server: PROXY_SERVER };
  }

  const browser = await chromium.launch(launchOptions);

  try {
    const loginResult = await loginAndGetToken(browser);
    if (!loginResult.token) {
      const reportPath = path.join(OUTPUT_DIR, 'report.json');
      const report = {
        ok: false,
        generatedAt: new Date().toISOString(),
        baseUrl: BASE_URL,
        proxyServer: PROXY_SERVER,
        loginResult,
        error: 'Failed to acquire auth token from /api/auth/login',
      };
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');
      console.log(JSON.stringify({ ok: false, reportPath, reason: report.error }, null, 2));
      process.exitCode = 1;
      return;
    }

    const desktopContext = await browser.newContext({
      viewport: { width: 1440, height: 960 },
      ignoreHTTPSErrors: true,
      extraHTTPHeaders: {
        Authorization: `Bearer ${loginResult.token}`,
        Accept: 'application/json',
      },
    });
    await desktopContext.addInitScript(({ token, username }) => {
      try {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify({ userId: 'admin', email: username }));
      } catch {
        // Ignore storage write errors in restricted contexts.
      }
    }, { token: loginResult.token, username: ADMIN_USERNAME });

    const mobileContext = await browser.newContext({
      ...devices['iPhone 13'],
      ignoreHTTPSErrors: true,
      extraHTTPHeaders: {
        Authorization: `Bearer ${loginResult.token}`,
        Accept: 'application/json',
      },
    });
    await mobileContext.addInitScript(({ token, username }) => {
      try {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify({ userId: 'admin', email: username }));
      } catch {
        // Ignore storage write errors in restricted contexts.
      }
    }, { token: loginResult.token, username: ADMIN_USERNAME });

    const desktopRoutes = await auditRoutes(desktopContext, 'desktop');
    const mobileRoutes = await auditRoutes(mobileContext, 'mobile');
    const formAudit = await auditForms(desktopContext);
    const crudResults = await runCrudAudit(desktopContext);

    await desktopContext.close();
    await mobileContext.close();

    const routeIssues = [...desktopRoutes, ...mobileRoutes].filter(
      (entry) =>
        entry.gotoError ||
        entry.pageErrors?.length ||
        entry.consoleErrors?.length ||
        entry.hasHorizontalOverflow
    );
    const formsNotOpened = formAudit.filter((entry) => !entry.opened);
    const crudFailures = crudResults.filter((entry) => !entry.ok);

    const report = {
      ok: true,
      generatedAt: new Date().toISOString(),
      baseUrl: BASE_URL,
      proxyServer: PROXY_SERVER,
      credentials: {
        username: ADMIN_USERNAME,
        passwordProvided: Boolean(ADMIN_PASSWORD),
      },
      loginResult: {
        status: loginResult.status,
        ok: loginResult.ok,
      },
      summary: {
        routesAudited: desktopRoutes.length + mobileRoutes.length,
        routeIssueCount: routeIssues.length,
        formsAudited: formAudit.length,
        formsNotOpened: formsNotOpened.length,
        crudSteps: crudResults.length,
        crudFailureCount: crudFailures.length,
      },
      routeAudit: {
        desktop: desktopRoutes,
        mobile: mobileRoutes,
      },
      formAudit,
      crudAudit: {
        results: crudResults,
        byEntity: summarizeCrud(crudResults),
      },
    };

    const reportPath = path.join(OUTPUT_DIR, 'report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');
    console.log(
      JSON.stringify(
        {
          ok: true,
          reportPath,
          outputDir: OUTPUT_DIR,
          summary: report.summary,
        },
        null,
        2
      )
    );
  } finally {
    await browser.close();
  }
}

main().catch(async (error) => {
  await ensureDir(OUTPUT_DIR);
  const crashPath = path.join(OUTPUT_DIR, 'crash.json');
  await fs.writeFile(
    crashPath,
    JSON.stringify(
      {
        ok: false,
        generatedAt: new Date().toISOString(),
        baseUrl: BASE_URL,
        proxyServer: PROXY_SERVER,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      null,
      2
    ),
    'utf8'
  );
  console.error(error);
  process.exit(1);
});
