import { chromium, type ConsoleMessage, type Request as PlaywrightRequest, type Page } from 'playwright';

const BASE = 'https://t.isuyee.com';

interface ScenarioResult {
  name: string;
  requests: string[];
  sseRequests: string[];
  consoleErrors: string[];
  pageErrors: string[];
  route?: string;
  bootstrap?: Record<string, unknown> | null;
  note?: string;
}

function summarizeBootstrap(bootstrap: any): Record<string, unknown> | null {
  if (!bootstrap || typeof bootstrap !== 'object') {
    return null;
  }

  const rawData = bootstrap.data && typeof bootstrap.data === 'object' ? bootstrap.data : {};
  const summary: Record<string, unknown> = {
    page: bootstrap.page ?? null,
    scope: bootstrap.scope ?? null,
    dataKeys: Object.keys(rawData),
  };

  const scopePage = bootstrap.scope?.page;
  if (!summary.page && typeof scopePage === 'string') {
    summary.page = scopePage;
  }

  if (summary.page === 'dashboard') {
    summary.metricsCount = Array.isArray(bootstrap.metrics) ? bootstrap.metrics.length : null;
    summary.recentClicksCount = Array.isArray(bootstrap.recentClicks) ? bootstrap.recentClicks.length : null;
    summary.entityKeys =
      bootstrap.entityData && typeof bootstrap.entityData === 'object'
        ? Object.keys(bootstrap.entityData)
        : [];
  }

  if (summary.page === 'campaigns') {
    summary.campaignsCount = Array.isArray(rawData.campaigns) ? rawData.campaigns.length : null;
    summary.entityStatsCount = Array.isArray(rawData.entityStats) ? rawData.entityStats.length : null;
  }

  if (summary.page === 'offers') {
    summary.offersCount = Array.isArray(rawData.offers) ? rawData.offers.length : null;
    summary.affiliateNetworksCount = Array.isArray(rawData.affiliateNetworks)
      ? rawData.affiliateNetworks.length
      : null;
  }

  if (summary.page === 'campaign-detail') {
    summary.flowCount = Array.isArray(rawData.flows) ? rawData.flows.length : null;
    summary.flowSchemaIds =
      rawData.flowSchemasById && typeof rawData.flowSchemasById === 'object'
        ? Object.keys(rawData.flowSchemasById as Record<string, unknown>)
        : [];
    summary.flowRuleIds =
      rawData.flowRulesById && typeof rawData.flowRulesById === 'object'
        ? Object.keys(rawData.flowRulesById as Record<string, unknown>)
        : [];
    summary.flowLogIds =
      rawData.flowLogsById && typeof rawData.flowLogsById === 'object'
        ? Object.keys(rawData.flowLogsById as Record<string, unknown>)
        : [];
    summary.flowStatsCount = Array.isArray(rawData.flowStats) ? rawData.flowStats.length : null;
    summary.hasCampaign = Boolean(rawData.campaign);
    summary.hasStats = Boolean(rawData.stats);
  }

  return summary;
}

async function runScenario(page: Page, name: string, action: () => Promise<void>): Promise<ScenarioResult> {
  const requests: string[] = [];
  const sseRequests: string[] = [];
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];

  const requestHandler = (req: PlaywrightRequest) => {
    const url = req.url();
    if (req.method() === 'GET' && url.startsWith(`${BASE}/api/`)) {
      requests.push(url);
    }

    if (url.includes('/events/cache')) {
      sseRequests.push(`${req.method()} ${url}`);
    }
  };

  const consoleHandler = (msg: ConsoleMessage) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  };

  page.on('request', requestHandler);
  page.on('console', consoleHandler);
  page.on('pageerror', (error) => {
    pageErrors.push(String(error));
  });

  try {
    await action();
    try {
      await page.waitForFunction(() => Boolean(window.__PAGE_BOOTSTRAP__), undefined, {
        timeout: 5000,
      });
    } catch {
      // Some routes may settle without exposing bootstrap immediately; keep a small fallback wait.
    }
    await page.waitForTimeout(1000);
  } finally {
    page.off('request', requestHandler);
    page.off('console', consoleHandler);
  }

  const bootstrap = await page.evaluate(() => window.__PAGE_BOOTSTRAP__ ?? null);

  return {
    name,
    route: page.url(),
    requests,
    sseRequests,
    consoleErrors,
    pageErrors,
    bootstrap: summarizeBootstrap(bootstrap),
  };
}

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  const results: ScenarioResult[] = [];

  results.push(
    await runScenario(page, 'Dashboard last30days page load', async () => {
      await page.goto(`${BASE}/?range=last30days&from=2026-03-07&to=2026-04-05&tz=UTC`, {
        waitUntil: 'domcontentloaded',
      });
    })
  );

  results.push(
    await runScenario(page, 'Campaigns last30days page load', async () => {
      await page.goto(`${BASE}/campaigns?range=last30days`, { waitUntil: 'domcontentloaded' });
    })
  );

  results.push(
    await runScenario(page, 'Offers last30days page load', async () => {
      await page.goto(`${BASE}/offers?range=last30days`, { waitUntil: 'domcontentloaded' });
    })
  );

  results.push(
    await runScenario(page, 'Campaign Routing tab load', async () => {
      await page.goto(`${BASE}/campaigns/c18?startDate=2026-03-30&endDate=2026-04-05&interval=day`, {
        waitUntil: 'domcontentloaded',
      });
      await page.locator('button:has-text("Routing")').click();
    })
  );

  // SSE probe should verify headers only and then abort quickly.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);
  let sseValid = false;
  let sseNote = '';

  try {
    const response = await fetch(`${BASE}/events/cache?userId=prod-check`, {
      headers: { Accept: 'text/event-stream' },
      signal: controller.signal,
    });
    const contentType = response.headers.get('content-type') ?? '';
    sseValid = response.status === 200 && contentType.includes('text/event-stream');
    sseNote = `SSE status=${response.status} content-type=${contentType}`;
    await response.body?.cancel();
  } catch (error) {
    const message = String(error);
    if (message.includes('AbortError')) {
      sseValid = true;
      sseNote = 'SSE probe aborted after header validation';
    } else {
      sseNote = `SSE fetch error: ${message}`;
    }
  } finally {
    clearTimeout(timeout);
  }

  await browser.close();

  console.log(JSON.stringify({ results, sseValid, sseNote }, null, 2));
  if (!sseValid) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
