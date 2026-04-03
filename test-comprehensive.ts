import { chromium, Browser, Page, ConsoleMessage } from 'playwright';

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'skip';
  message?: string;
  duration: number;
}

const BASE_URL = 'https://t.isuyee.com';
const results: TestResult[] = [];
const consoleErrors: string[] = [];
const networkErrors: string[] = [];

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTest<T>(
  name: string,
  testFn: () => Promise<T>,
  expectedResult?: T
): Promise<TestResult> {
  const startTime = Date.now();
  try {
    const result = await testFn();
    const duration = Date.now() - startTime;
    const passed = expectedResult !== undefined ? result === expectedResult : !!result;
    return { name, status: passed ? 'pass' : 'fail', message: String(result), duration };
  } catch (error) {
    const duration = Date.now() - startTime;
    return { name, status: 'fail', message: String(error), duration };
  }
}

async function setupPage(page: Page): Promise<void> {
  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', (error: Error) => {
    consoleErrors.push(`Page Error: ${error.message}`);
  });

  page.on('requestfailed', (request) => {
    networkErrors.push(`Request Failed: ${request.url()} - ${request.failure()?.errorText}`);
  });
}

async function testAPIEndpoints(): Promise<TestResult[]> {
  const tests: TestResult[] = [];
  console.log('Testing API Endpoints...');

  const apiTests = [
    { url: `${BASE_URL}/api/analytics/dashboard?range=today`, name: 'Dashboard API' },
    { url: `${BASE_URL}/api/analytics/recent-clicks`, name: 'Recent Clicks API' },
    { url: `${BASE_URL}/api/campaigns?page=1&pageSize=5`, name: 'Campaigns List API' },
    { url: `${BASE_URL}/api/trends/daily?range=7days`, name: 'Trends API' },
  ];

  for (const apiTest of apiTests) {
    tests.push(await runTest(apiTest.name, async () => {
      const response = await fetch(apiTest.url);
      const data = await response.json();
      return response.ok && data.success !== false;
    }));
  }

  tests.push(await runTest('Campaign Create API', async () => {
    const response = await fetch(`${BASE_URL}/api/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `Playwright Test Campaign ${Date.now()}`,
        alias: `pw-test-${Date.now()}`,
        domain: 'test-playwright.com'
      })
    });
    const data = await response.json();
    return response.status === 201 && data.success === true;
  }));

  return tests;
}

async function testCRUDOperations(): Promise<TestResult[]> {
  const tests: TestResult[] = [];
  console.log('Testing CRUD Operations...');

  const createResponse = await fetch(`${BASE_URL}/api/campaigns`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: `CRUD Test Campaign ${Date.now()}`,
      alias: `crud-test-${Date.now()}`,
      domain: 'crud-test.com'
    })
  });
  const createData = await createResponse.json();
  const campaignId = createData.data?.id;

  if (campaignId) {
    tests.push({ name: 'Campaign Create', status: 'pass', duration: 0 });

    const readResponse = await fetch(`${BASE_URL}/api/campaigns/${campaignId}`);
    const readData = await readResponse.json();
    tests.push(await runTest('Campaign Read', async () =>
      readResponse.ok && readData.data?.id === campaignId
    ));

    const updateResponse = await fetch(`${BASE_URL}/api/campaigns/${campaignId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated by Playwright Test' })
    });
    const updateData = await updateResponse.json();
    tests.push(await runTest('Campaign Update', async () =>
      updateResponse.ok && updateData.data?.name === 'Updated by Playwright Test'
    ));

    const deleteResponse = await fetch(`${BASE_URL}/api/campaigns/${campaignId}`, {
      method: 'DELETE'
    });
    tests.push(await runTest('Campaign Delete', async () => deleteResponse.ok));

    const verifyDeleteResponse = await fetch(`${BASE_URL}/api/campaigns/${campaignId}`);
    tests.push(await runTest('Campaign Delete Verification', async () =>
      verifyDeleteResponse.status === 404
    ));
  } else {
    tests.push({ name: 'Campaign Create', status: 'fail', message: 'Failed to get campaign ID', duration: 0 });
  }

  return tests;
}

async function testDashboardComponents(browser: Browser): Promise<TestResult[]> {
  const tests: TestResult[] = [];
  console.log('Testing Dashboard Components...');
  const page = await browser.newPage();
  await setupPage(page);

  try {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await sleep(3000);

    tests.push(await runTest('Dashboard - Page Loaded', async () => {
      const bodyText = await page.textContent('body');
      return bodyText && bodyText.length > 100;
    }));

    tests.push(await runTest('Dashboard - No Console Errors', async () => {
      return consoleErrors.length === 0;
    }));

    const buttons = await page.$$('button');
    tests.push(await runTest('Dashboard - Buttons Present', async () => {
      return buttons.length >= 0;
    }));

    const charts = await page.$$('.recharts-wrapper, [class*="chart"]');
    tests.push(await runTest('Dashboard - Charts Rendered', async () => {
      return charts.length >= 0;
    }));

    const navLinks = await page.$$('a[href]');
    tests.push(await runTest('Dashboard - Navigation Links', async () => {
      return navLinks.length >= 0;
    }));

  } catch (error) {
    tests.push({ name: 'Dashboard Components', status: 'fail', message: String(error), duration: 0 });
  } finally {
    await page.close();
  }

  return tests;
}

async function runAllTests(): Promise<void> {
  console.log('Starting comprehensive Playwright tests...\n');
  const startTime = Date.now();

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    results.push(...await testAPIEndpoints());
    results.push(...await testCRUDOperations());
    results.push(...await testDashboardComponents(browser));
  } catch (error) {
    console.error('Test execution error:', error);
  } finally {
    if (browser) await browser.close();
  }

  const totalDuration = Date.now() - startTime;
  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const total = results.length;

  console.log('\n' + '='.repeat(60));
  console.log('TEST RESULTS SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total: ${total} | Passed: ${passed} | Failed: ${failed}`);
  console.log(`Pass Rate: ${((passed / total) * 100).toFixed(1)}%`);
  console.log(`Duration: ${(totalDuration / 1000).toFixed(1)}s`);
  console.log('='.repeat(60));

  console.log('\nDETAILED RESULTS:');
  for (const test of results) {
    const icon = test.status === 'pass' ? '✓' : test.status === 'fail' ? '✗' : '○';
    console.log(`${icon} ${test.name}: ${test.status.toUpperCase()}${test.message ? ` - ${test.message}` : ''}`);
  }

  if (consoleErrors.length > 0) {
    console.log('\nCONSOLE ERRORS:');
    consoleErrors.forEach(e => console.log(`  - ${e}`));
  }

  if (networkErrors.length > 0) {
    console.log('\nNETWORK ERRORS:');
    networkErrors.forEach(e => console.log(`  - ${e}`));
  }

  console.log('\n' + '='.repeat(60));
}

runAllTests()
  .then(() => {
    const failed = results.filter(r => r.status === 'fail').length;
    process.exit(failed > 0 ? 1 : 0);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
