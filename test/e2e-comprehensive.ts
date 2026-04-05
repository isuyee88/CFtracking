import { chromium, type Browser, type Page } from 'playwright';

type TestStatus = 'pass' | 'fail';

interface TestResult {
  name: string;
  status: TestStatus;
  durationMs: number;
  error?: string;
}

interface ReportSummary {
  appBaseUrl: string;
  workerBaseUrl: string;
  timestamp: string;
  total: number;
  passed: number;
  failed: number;
  results: TestResult[];
}

const APP_BASE_URL = process.env.APP_BASE_URL || 'http://127.0.0.1:12342';
const WORKER_BASE_URL = process.env.WORKER_BASE_URL || APP_BASE_URL;
const HEADLESS = process.env.HEADLESS !== 'false';

class SmokeSuite {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private readonly results: TestResult[] = [];

  async run(): Promise<void> {
    await this.setup();

    try {
      await this.testHealth();
      await this.testDashboard();
      await this.testReports();
      await this.testConversions();
      await this.testSettings();
    } finally {
      await this.teardown();
    }

    this.printReport();
  }

  private async setup(): Promise<void> {
    this.browser = await chromium.launch({
      headless: HEADLESS,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    this.page = await this.browser.newPage({
      viewport: { width: 1440, height: 900 },
    });
  }

  private async teardown(): Promise<void> {
    await this.browser?.close();
  }

  private async record(name: string, fn: () => Promise<void>): Promise<void> {
    const startedAt = Date.now();

    try {
      await fn();
      this.results.push({
        name,
        status: 'pass',
        durationMs: Date.now() - startedAt,
      });
      console.log(`PASS ${name}`);
    } catch (error) {
      this.results.push({
        name,
        status: 'fail',
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : String(error),
      });
      console.error(`FAIL ${name}`);
      console.error(error);
    }
  }

  private async gotoHashRoute(hashRoute: string): Promise<void> {
    await this.page!.goto(`${APP_BASE_URL}/${hashRoute}`, {
      waitUntil: 'domcontentloaded',
    });
  }

  private async testHealth(): Promise<void> {
    await this.record('worker health endpoint', async () => {
      const response = await this.page!.request.get(`${WORKER_BASE_URL}/health`);
      if (response.status() !== 200) {
        throw new Error(`Expected 200, got ${response.status()}`);
      }
    });
  }

  private async testDashboard(): Promise<void> {
    await this.record('dashboard renders core metrics shell', async () => {
      await this.gotoHashRoute('#/dashboard');
      await this.page!.waitForSelector('text=Dashboard', { timeout: 15000 });
      await this.page!.waitForSelector('text=Campaign', { timeout: 15000 });
    });
  }

  private async testReports(): Promise<void> {
    await this.record('reports page loads live report controls', async () => {
      await this.gotoHashRoute('#/reports');
      await this.page!.waitForSelector('text=Reports Center', { timeout: 15000 });
      await this.page!.waitForSelector('text=Export CSV', { timeout: 15000 });
      await this.page!.waitForSelector('text=Columns', { timeout: 15000 });
    });
  }

  private async testConversions(): Promise<void> {
    await this.record('conversions page loads real conversions shell', async () => {
      await this.gotoHashRoute('#/conversions');
      await this.page!.waitForSelector('text=Conversions Log', { timeout: 15000 });
      await this.page!.waitForSelector('text=Real conversion data from `/api/conversions`.', {
        timeout: 15000,
      });
    });
  }

  private async testSettings(): Promise<void> {
    await this.record('settings page loads durable object preferences UI', async () => {
      await this.gotoHashRoute('#/settings');
      await this.page!.waitForSelector('text=Settings', { timeout: 15000 });
      await this.page!.waitForSelector('text=Cloudflare One', { timeout: 15000 });
      await this.page!.waitForSelector('text=Save Changes', { timeout: 15000 });
    });
  }

  private printReport(): void {
    const passed = this.results.filter((result) => result.status === 'pass').length;
    const failed = this.results.length - passed;

    const summary: ReportSummary = {
      appBaseUrl: APP_BASE_URL,
      workerBaseUrl: WORKER_BASE_URL,
      timestamp: new Date().toISOString(),
      total: this.results.length,
      passed,
      failed,
      results: this.results,
    };

    console.log(JSON.stringify(summary, null, 2));

    if (failed > 0) {
      process.exitCode = 1;
    }
  }
}

async function main(): Promise<void> {
  const suite = new SmokeSuite();
  await suite.run();
}

void main();
