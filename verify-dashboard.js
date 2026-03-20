const { chromium } = require('playwright');

(async () => {
  try {
    console.log('🚀 Verifying Dashboard...\n');
    
    // Launch browser with console logging
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page = await context.newPage();
    
    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('❌ Console Error:', msg.text());
      }
    });
    
    page.on('pageerror', error => {
      console.log('❌ Page Error:', error.message);
    });
    
    // Navigate to Dashboard
    console.log('📍 Loading Dashboard...');
    const response = await page.goto('https://cf-tracking.suyee88.workers.dev/', { 
      waitUntil: 'networkidle',
      timeout: 60000 
    });
    
    console.log('Response status:', response.status());
    console.log('Response URL:', response.url());
    
    await page.waitForTimeout(5000);
    
    // Get page content
    const content = await page.content();
    console.log('\nPage content length:', content.length);
    console.log('Contains "Dashboard":', content.includes('Dashboard'));
    console.log('Contains "root":', content.includes('root'));
    console.log('Contains "script":', content.includes('script'));
    
    // Take screenshot
    await page.screenshot({ path: 'verify-dashboard.png', fullPage: true });
    console.log('\n✅ Screenshot saved: verify-dashboard.png');
    
    // Check HTML structure
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log('\nBody text preview:', bodyText.substring(0, 500));
    
    console.log('\n=== Verification Complete ===');
    
    await browser.close();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
