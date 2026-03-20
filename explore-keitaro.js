const { chromium } = require('playwright');
const http = require('http');

// Helper function to fetch from CDP
function fetchCDP() {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:9222/json', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

(async () => {
  try {
    // Get the WebSocket URL from the Edge browser
    const pages = await fetchCDP();
    
    // Find the Keitaro page
    const keitaroPage = pages.find(p => p.url && p.url.includes('demo.keitaro'));
    
    if (!keitaroPage) {
      console.log('Keitaro page not found');
      return;
    }
    
    console.log('Found Keitaro page:', keitaroPage.title);
    console.log('URL:', keitaroPage.url);
    console.log('WebSocket:', keitaroPage.webSocketDebuggerUrl);
    
    // Connect to the browser using the full WebSocket URL for the specific page
    const browser = await chromium.connectOverCDP(keitaroPage.webSocketDebuggerUrl);
    
    // Get contexts and pages
    const contexts = browser.contexts();
    console.log('Contexts:', contexts.length);
    
    const context = contexts[0];
    const allPages = context.pages();
    console.log('Pages in context:', allPages.length);
    
    // Find the Keitaro page
    const page = allPages.find(p => p.url().includes('demo.keitaro')) || allPages[0];
    
    console.log('Active page URL:', page.url());
    console.log('Active page Title:', await page.title());
    
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Take screenshot
    await page.screenshot({ path: 'keitaro-dashboard.png', fullPage: false });
    console.log('Screenshot saved: keitaro-dashboard.png');
    
    // Extract comprehensive page information
    const pageInfo = await page.evaluate(() => {
      const data = {
        title: document.title,
        url: window.location.href,
        // Sidebar navigation
        sidebarNav: Array.from(document.querySelectorAll('.sidebar-nav a, .nav-sidebar a, [class*="sidebar"] a, nav a')).map(a => ({
          text: a.innerText.trim(),
          href: a.href,
          class: a.className
        })),
        // Main content headings
        headings: Array.from(document.querySelectorAll('h1, h2, h3, h4')).map(h => ({
          tag: h.tagName,
          text: h.innerText.trim()
        })),
        // Dashboard stats/cards
        statsCards: Array.from(document.querySelectorAll('[class*="stat"], [class*="card"], [class*="metric"], [class*="kpi"]')).map(el => ({
          class: el.className,
          text: el.innerText.trim().substring(0, 200)
        })).slice(0, 20),
        // Tables
        tables: Array.from(document.querySelectorAll('table')).map(t => ({
          headers: Array.from(t.querySelectorAll('th')).map(th => th.innerText.trim()),
          rowCount: t.querySelectorAll('tbody tr').length
        })),
        // Charts/graphs indicators
        charts: Array.from(document.querySelectorAll('[class*="chart"], [class*="graph"], canvas, svg')).map(el => ({
          tag: el.tagName,
          class: el.className
        })).slice(0, 10),
        // Buttons
        buttons: Array.from(document.querySelectorAll('button, [role="button"], .btn')).map(b => ({
          text: b.innerText.trim(),
          class: b.className
        })).slice(0, 20),
        // Forms
        forms: Array.from(document.querySelectorAll('form')).map(f => ({
          action: f.action,
          inputs: Array.from(f.querySelectorAll('input, select, textarea')).map(i => ({
            type: i.type,
            name: i.name,
            placeholder: i.placeholder
          }))
        })),
        // Body text preview
        bodyPreview: document.body.innerText.substring(0, 1500).replace(/\s+/g, ' ')
      };
      return data;
    });
    
    console.log('\n=== KEITARO DEMO ANALYSIS ===\n');
    console.log('Title:', pageInfo.title);
    console.log('\n--- Sidebar Navigation ---');
    pageInfo.sidebarNav.forEach((nav, i) => {
      console.log(`${i + 1}. ${nav.text}`);
    });
    
    console.log('\n--- Headings ---');
    pageInfo.headings.forEach(h => {
      console.log(`${h.tag}: ${h.text}`);
    });
    
    console.log('\n--- Stats/Cards ---');
    pageInfo.statsCards.slice(0, 10).forEach((card, i) => {
      console.log(`${i + 1}. ${card.text.substring(0, 100)}`);
    });
    
    console.log('\n--- Tables ---');
    pageInfo.tables.forEach((t, i) => {
      console.log(`Table ${i + 1}: Headers [${t.headers.join(', ')}], Rows: ${t.rowCount}`);
    });
    
    console.log('\n--- Charts/Graphs ---');
    console.log(`Found ${pageInfo.charts.length} chart elements`);
    
    console.log('\n--- Key Buttons ---');
    pageInfo.buttons.slice(0, 10).forEach((b, i) => {
      if (b.text) console.log(`${i + 1}. ${b.text}`);
    });
    
    console.log('\n--- Body Preview ---');
    console.log(pageInfo.bodyPreview);
    
    // Try to navigate to other sections
    console.log('\n=== EXPLORING OTHER SECTIONS ===\n');
    
    const sections = ['Campaigns', 'Offers', 'Landers', 'Traffic Sources', 'Reports', 'Settings'];
    
    for (const section of sections) {
      try {
        // Try to find and click on navigation item
        const navLink = await page.$(`a:has-text("${section}"), [class*="nav"] a:has-text("${section}"), .sidebar a:has-text("${section}")`);
        
        if (navLink) {
          console.log(`\nClicking on ${section}...`);
          await navLink.click();
          await page.waitForTimeout(2000);
          
          await page.screenshot({ path: `keitaro-${section.toLowerCase().replace(' ', '-')}.png`, fullPage: false });
          console.log(`Screenshot saved: keitaro-${section.toLowerCase().replace(' ', '-')}.png`);
          
          const title = await page.title();
          console.log(`Page title: ${title}`);
        }
      } catch (e) {
        console.log(`Could not navigate to ${section}: ${e.message}`);
      }
    }
    
    // Close browser
    await browser.close();
    console.log('\n✅ Exploration complete!');
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  }
})();
