import {
  chromium,
  request as playwrightRequest,
  type Browser,
  type BrowserContext,
  type Page,
  type APIRequestContext,
} from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

type TestStatus = 'pass' | 'fail' | 'skip';

interface TestResult {
  name: string;
  status: TestStatus;
  durationMs: number;
  error?: string;
  details?: Record<string, unknown>;
}

interface RouteSpec {
  path: string;
  heading: string;
  note?: string;
}

interface ViewportSpec {
  name: 'desktop' | 'mobile';
  width: number;
  height: number;
  isMobile?: boolean;
  hasTouch?: boolean;
}

interface SummaryReport {
  appBaseUrl: string;
  workerBaseUrl: string;
  generatedAt: string;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  results: TestResult[];
}

const APP_BASE_URL = process.env.APP_BASE_URL || 'http://127.0.0.1:12342';
const WORKER_BASE_URL = process.env.WORKER_BASE_URL || APP_BASE_URL;
const HEADLESS = process.env.HEADLESS !== 'false';
const OUTPUT_DIR = 'output/e2e';
const REPORT_PATH = `${OUTPUT_DIR}/regression-matrix-report.json`;

const VIEWPORTS: ViewportSpec[] = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844, isMobile: true, hasTouch: true },
];

const STATIC_ROUTES: RouteSpec[] = [
  { path: '#/dashboard', heading: 'Dashboard' },
  { path: '#/campaigns', heading: 'Campaign Management' },
  { path: '#/rules', heading: 'Rule Management' },
  { path: '#/platforms', heading: 'Platform Management' },
  { path: '#/landings', heading: 'Landing Pages' },
  { path: '#/offers', heading: 'Offers' },
  { path: '#/traffic-sources', heading: 'Traffic Sources' },
  { path: '#/affiliate-networks', heading: 'Affiliate Networks' },
  { path: '#/trends', heading: 'Trends' },
  { path: '#/reports', heading: 'Reports Center' },
  { path: '#/audit', heading: 'Clicks Log' },
  { path: '#/conversions', heading: 'Conversions Log' },
  { path: '#/blacklist', heading: 'Blacklist' },
  { path: '#/whitelist', heading: 'Whitelist' },
  { path: '#/target', heading: 'Target Management', note: 'mock-style page, non-blocking business surface' },
  { path: '#/settings', heading: 'Settings' },
  { path: '#/help', heading: 'Help Center', note: 'content page' },
];

class RegressionMatrixSuite {
  private browser: Browser | null = null;
  private request: APIRequestContext | null = null;
  private readonly results: TestResult[] = [];

  async run(): Promise<void> {
    await this.setup();

    try {
      await this.testWorkerHealth();
      await this.testApiSmoke();
      await this.testAllStaticRoutes();
      await this.testCampaignDetailIfAvailable();
      await this.testSettingsTabs();
      await this.testReportsInteractions();
      await this.testConversionsInteractions();
    } finally {
      await this.teardown();
    }

    this.writeReport();
    this.printReport();
  }

  private async setup(): Promise<void> {
    mkdirSync(OUTPUT_DIR, { recursive: true });
    this.browser = await chromium.launch({
      headless: HEADLESS,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    this.request = await playwrightRequest.newContext({
      baseURL: WORKER_BASE_URL,
    });
  }

  private async teardown(): Promise<void> {
    await this.request?.dispose();
    await this.browser?.close();
  }

  private async createContext(viewport: ViewportSpec): Promise<BrowserContext> {
    return this.browser!.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      isMobile: viewport.isMobile ?? false,
      hasTouch: viewport.hasTouch ?? false,
    });
  }

  private async record(name: string, fn: () => Promise<void>, details?: Record<string, unknown>): Promise<void> {
    const startedAt = Date.now();

    try {
      await fn();
      this.results.push({
        name,
        status: 'pass',
        durationMs: Date.now() - startedAt,
        details,
      });
      console.log(`PASS ${name}`);
    } catch (error) {
      this.results.push({
        name,
        status: 'fail',
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : String(error),
        details,
      });
      console.error(`FAIL ${name}`);
      console.error(error);
    }
  }

  private recordSkip(name: string, reason: string, details?: Record<string, unknown>) {
    this.results.push({
      name,
      status: 'skip',
      durationMs: 0,
      error: reason,
      details,
    });
    console.log(`SKIP ${name}: ${reason}`);
  }

  private async visit(page: Page, hashRoute: string): Promise<void> {
    await page.goto(`${APP_BASE_URL}/${hashRoute}`, {
      waitUntil: 'domcontentloaded',
    });
  }

  private async waitForPageHeading(page: Page, heading: string): Promise<void> {
    const headingLocator = page.getByRole('heading', { name: heading, exact: true }).first();
    await headingLocator.waitFor({ state: 'visible', timeout: 15000 });
  }

  private async testWorkerHealth(): Promise<void> {
    await this.record('api: /health returns 200', async () => {
      const response = await this.request!.get('/health');
      if (response.status() !== 200) {
        throw new Error(`Expected 200, got ${response.status()}`);
      }
    });
  }

  private async testApiSmoke(): Promise<void> {
    const getChecks = [
      { name: 'api: campaigns list', url: '/api/campaigns' },
      { name: 'api: offers list', url: '/api/offers' },
      { name: 'api: landings list', url: '/api/landing-pages' },
      { name: 'api: traffic sources list', url: '/api/traffic-sources' },
      { name: 'api: affiliate networks list', url: '/api/affiliate-networks' },
      { name: 'api: rules list', url: '/api/rules' },
      { name: 'api: platforms list', url: '/api/platforms' },
      { name: 'api: dashboard stats', url: '/api/analytics/dashboard?range=today' },
      { name: 'api: reports traffic', url: '/api/analytics/reports/traffic?startDate=2026-04-01&endDate=2026-04-05&groupBy=campaign&limit=20' },
      { name: 'api: clicks list', url: '/api/clicks?page=1&pageSize=10' },
      { name: 'api: conversions list', url: '/api/conversions?page=1&pageSize=10' },
      { name: 'api: conversion stats', url: '/api/conversions/stats?startDate=2026-04-01&endDate=2026-04-05' },
      { name: 'api: trends report', url: '/api/trends/report?startDate=2026-04-01&endDate=2026-04-05&interval=day' },
      { name: 'api: user preferences', url: '/api/user-preferences/preferences/default-user', headers: { 'X-Device-ID': 'regression-matrix-device' } },
    ] as const;

    for (const check of getChecks) {
      await this.record(check.name, async () => {
        const response = await this.request!.get(check.url, {
          headers: check.headers,
        });
        if (response.status() !== 200) {
          throw new Error(`Expected 200, got ${response.status()}`);
        }
      });
    }

    const validationChecks = [
      {
        name: 'api validation: entity-stats requires type',
        run: async () => this.request!.get('/api/analytics/entity-stats?range=today'),
      },
      {
        name: 'api validation: invalid report type rejected',
        run: async () =>
          this.request!.get('/api/analytics/reports/not-a-report?startDate=2026-04-01&endDate=2026-04-05'),
      },
      {
        name: 'api validation: export requires date range',
        run: async () =>
          this.request!.post('/api/analytics/reports/export', {
            data: { type: 'traffic', format: 'csv' },
          }),
      },
      {
        name: 'api validation: tracking conversion requires body fields',
        run: async () =>
          this.request!.post('/api/tracking/conversion', {
            data: {},
          }),
      },
    ] as const;

    for (const check of validationChecks) {
      await this.record(check.name, async () => {
        const response = await check.run();
        if (response.status() !== 400) {
          throw new Error(`Expected 400, got ${response.status()}`);
        }
      });
    }
  }

  private async testAllStaticRoutes(): Promise<void> {
    for (const viewport of VIEWPORTS) {
      for (const route of STATIC_ROUTES) {
        await this.record(
          `ui ${viewport.name}: ${route.path} renders ${route.heading}`,
          async () => {
            const context = await this.createContext(viewport);
            const page = await context.newPage();

            try {
              await this.visit(page, route.path);
              await this.waitForPageHeading(page, route.heading);
            } finally {
              await context.close();
            }
          },
          route.note ? { note: route.note } : undefined
        );
      }
    }
  }

  private async testCampaignDetailIfAvailable(): Promise<void> {
    const response = await this.request!.get('/api/campaigns');
    if (response.status() !== 200) {
      this.recordSkip('ui desktop: dynamic campaign detail', `campaigns endpoint returned ${response.status()}`);
      return;
    }

    const payload = await response.json();
    const campaigns = Array.isArray(payload?.data?.list)
      ? payload.data.list
      : Array.isArray(payload?.data)
        ? payload.data
        : [];
    const campaignId = campaigns[0]?.id;
    const campaignName = campaigns[0]?.name;

    if (!campaignId || !campaignName) {
      this.recordSkip('ui desktop: dynamic campaign detail', 'no campaign fixture available');
      return;
    }

    await this.record('ui desktop: campaign detail route renders live campaign', async () => {
      const context = await this.createContext(VIEWPORTS[0]);
      const page = await context.newPage();

      try {
        await this.visit(page, `#/campaigns/${campaignId}`);
        await this.waitForPageHeading(page, 'Campaign Details');
        await page.getByText(campaignName, { exact: true }).first().waitFor({ state: 'visible', timeout: 15000 });
      } finally {
        await context.close();
      }
    });
  }

  private async testSettingsTabs(): Promise<void> {
    await this.record('ui desktop: settings tabs switch correctly', async () => {
      const context = await this.createContext(VIEWPORTS[0]);
      const page = await context.newPage();

      try {
        await this.visit(page, '#/settings');
        await this.waitForPageHeading(page, 'Settings');

        await page.locator('button', { hasText: 'General' }).last().click();
        await this.waitForPageHeading(page, 'General Settings');

        await page.locator('button', { hasText: 'Account' }).last().click();
        await this.waitForPageHeading(page, 'Account Settings');

        await page.locator('button', { hasText: 'Notifications' }).last().click();
        await this.waitForPageHeading(page, 'Notification Settings');

        await page.locator('button', { hasText: 'Security' }).last().click();
        await this.waitForPageHeading(page, 'Security Settings');
        await page.getByText('Cloudflare One', { exact: false }).first().waitFor({ state: 'visible', timeout: 10000 });
      } finally {
        await context.close();
      }
    });
  }

  private async testReportsInteractions(): Promise<void> {
    await this.record('ui desktop: reports switches types and toggles columns panel', async () => {
      const context = await this.createContext(VIEWPORTS[0]);
      const page = await context.newPage();

      try {
        await this.visit(page, '#/reports');
        await this.waitForPageHeading(page, 'Reports Center');

        const reportTypeSelect = page.locator('select').first();

        await reportTypeSelect.selectOption('conversion');
        if ((await reportTypeSelect.inputValue()) !== 'conversion') {
          throw new Error('Expected report type to switch to conversion');
        }

        await reportTypeSelect.selectOption('financial');
        if ((await reportTypeSelect.inputValue()) !== 'financial') {
          throw new Error('Expected report type to switch to financial');
        }

        await reportTypeSelect.selectOption('roi');
        if ((await reportTypeSelect.inputValue()) !== 'roi') {
          throw new Error('Expected report type to switch to roi');
        }

        await page.getByRole('button', { name: 'Columns' }).click();
        await page.getByRole('button', { name: 'Campaign / Dimension', exact: true }).waitFor({ state: 'visible', timeout: 10000 });
        await page.getByRole('button', { name: 'Spend', exact: true }).waitFor({ state: 'visible', timeout: 10000 });
      } finally {
        await context.close();
      }
    });
  }

  private async testConversionsInteractions(): Promise<void> {
    await this.record('ui desktop: conversions filters and details render', async () => {
      const context = await this.createContext(VIEWPORTS[0]);
      const page = await context.newPage();

      try {
        await this.visit(page, '#/conversions');
        await this.waitForPageHeading(page, 'Conversions Log');

        const selects = page.locator('select');
        const count = await selects.count();
        if (count < 1) {
          throw new Error('Expected at least one filter select on conversions page');
        }

        const emptyState = page.getByText('No conversions found.', { exact: true });
        if (await emptyState.isVisible().catch(() => false)) {
          await page.getByRole('button', { name: /Export/i }).waitFor({ state: 'visible', timeout: 10000 });
          const exportDisabled = await page.getByRole('button', { name: /Export/i }).isDisabled();
          if (!exportDisabled) {
            throw new Error('Expected export button to stay disabled for empty conversions state');
          }

          return;
        }

        const dataRows = page.locator('tbody > tr');
        await dataRows.first().waitFor({ state: 'visible', timeout: 15000 });

        const searchInput = page.getByPlaceholder('Search conversion ID, click ID, campaign...');
        await searchInput.waitFor({ state: 'visible', timeout: 10000 });

        const expandButtons = page.locator('tbody > tr button');
        if ((await expandButtons.count()) > 0) {
          await expandButtons.first().click();
          await page.getByText('Click ID', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
        } else {
          await page.getByRole('button', { name: /Export/i }).waitFor({ state: 'visible', timeout: 10000 });
        }
      } finally {
        await context.close();
      }
    });
  }

  private writeReport(): void {
    const passed = this.results.filter((result) => result.status === 'pass').length;
    const failed = this.results.filter((result) => result.status === 'fail').length;
    const skipped = this.results.filter((result) => result.status === 'skip').length;

    const summary: SummaryReport = {
      appBaseUrl: APP_BASE_URL,
      workerBaseUrl: WORKER_BASE_URL,
      generatedAt: new Date().toISOString(),
      total: this.results.length,
      passed,
      failed,
      skipped,
      results: this.results,
    };

    writeFileSync(REPORT_PATH, JSON.stringify(summary, null, 2));
  }

  private printReport(): void {
    const passed = this.results.filter((result) => result.status === 'pass').length;
    const failed = this.results.filter((result) => result.status === 'fail').length;
    const skipped = this.results.filter((result) => result.status === 'skip').length;

    console.log(
      JSON.stringify(
        {
          appBaseUrl: APP_BASE_URL,
          workerBaseUrl: WORKER_BASE_URL,
          total: this.results.length,
          passed,
          failed,
          skipped,
          reportPath: REPORT_PATH,
        },
        null,
        2
      )
    );

    if (failed > 0) {
      process.exitCode = 1;
    }
  }
}

async function main(): Promise<void> {
  const suite = new RegressionMatrixSuite();
  await suite.run();
}

void main();
