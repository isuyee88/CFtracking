const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const http = require('http');

const screenshotDir = path.join(__dirname, 'keitaro-screenshots');
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

const results = { pages: [] };

function fetchCDP(port = 9223) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:${port}/json`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function capturePage(page, name) {
  const screenshotPath = path.join(screenshotDir, `${name}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(`✅ Screenshot: ${screenshotPath}`);
  return screenshotPath;
}

async function extractPageData(page) {
  return await page.evaluate(() => {
    return {
      title: document.title,
      url: window.location.href,
      sidebarItems: Array.from(document.querySelectorAll('.sidebar a, .nav-sidebar a, [class*="sidebar"] a, nav a, .menu a, [class*="nav"] a')).map(a => ({
        text: a.innerText.trim(), href: a.getAttribute('href')
      })).filter(item => item.text && item.text.length > 0 && item.text.length < 100),
      headings: Array.from(document.querySelectorAll('h1, h2, h3, h4, h5')).map(h => ({
        tag: h.tagName, text: h.innerText.trim()
      })).filter(h => h.text),
      statsCards: Array.from(document.querySelectorAll('[class*="stat"], [class*="metric"], [class*="kpi"], [class*="card"], [class*="widget"]')).map(el => ({
        text: el.innerText.trim().substring(0, 400)
      })).filter(c => c.text && c.text.length > 5).slice(0, 20),
      tables: Array.from(document.querySelectorAll('table')).map((t, idx) => ({
        index: idx,
        headers: Array.from(t.querySelectorAll('thead th, tr:first-child th')).map(th => th.innerText.trim()).filter(h => h),
        firstRowData: Array.from(t.querySelectorAll('tbody tr:first-child td')).map(td => td.innerText.trim()),
        rowCount: t.querySelectorAll('tbody tr').length
      })).filter(t => t.headers.length > 0),
      buttons: Array.from(document.querySelectorAll('button, [role="button"], .btn, [class*="button"]')).map(b => ({
        text: b.innerText.trim()
      })).filter(b => b.text && b.text.length > 0 && b.text.length < 100).slice(0, 25),
      charts: Array.from(document.querySelectorAll('canvas, svg, [class*="chart"], [class*="graph"]')).map(el => ({
        tagName: el.tagName, width: el.width || el.clientWidth, height: el.height || el.clientHeight
      })).slice(0, 15),
      bodyText: document.body.innerText.substring(0, 3000).replace(/\s+/g, ' ')
    };
  });
}

async function exploreKeitaro() {
  console.log('🚀 Starting Keitaro Demo exploration...\n');
  
  try {
    // Try port 9223 (Chrome) first, then 9222 (Edge)
    let cdpData;
    let port;
    try {
      cdpData = await fetchCDP(9223);
      port = 9223;
      console.log('✅ Connected to Chrome on port 9223');
    } catch (e) {
      cdpData = await fetchCDP(9222);
      port = 9222;
      console.log('✅ Connected to Edge on port 9222');
    }
    
    console.log('Found', cdpData.length, 'CDP targets');
    
    const keitaroPage = cdpData.find(p => p.url && p.url.includes('demo.keitaro'));
    if (!keitaroPage) {
      console.log('❌ Keitaro page not found. Available pages:');
      cdpData.filter(p => p.type === 'page').forEach(p => {
        console.log(`  - ${p.title}: ${p.url}`);
      });
      return;
    }
    
    console.log('✅ Found Keitaro page:', keitaroPage.title);
    console.log('   URL:', keitaroPage.url);
    
    // Connect using Playwright
    console.log('\n🔌 Connecting with Playwright...');
    const browser = await chromium.connectOverCDP(`http://localhost:${port}`);
    
    const contexts = browser.contexts();
    console.log('Contexts:', contexts.length);
    
    // Get the page
    let page = null;
    for (const context of contexts) {
      const pages = context.pages();
      console.log('  Context pages:', pages.length);
      page = pages.find(p => p.url().includes('demo.keitaro'));
      if (page) {
        console.log('  Found page:', await page.title());
        break;
      }
    }
    
    if (!page) {
      console.log('❌ No page available');
      await browser.close();
      return;
    }
    
    await page.bringToFront();
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(3000);
    
    // Capture Dashboard
    console.log('\n📸 Capturing Dashboard...');
    await capturePage(page, '01-dashboard');
    const dashboardData = await extractPageData(page);
    results.pages.push({ name: 'Dashboard', data: dashboardData });
    
    console.log('\n📊 Dashboard Analysis:');
    console.log('Title:', dashboardData.title);
    console.log('Sidebar Items:', dashboardData.sidebarItems.length);
    dashboardData.sidebarItems.slice(0, 15).forEach((item, i) => {
      console.log(`  ${i + 1}. ${item.text}`);
    });
    
    // Explore navigation
    const uniqueNavItems = [...new Set(dashboardData.sidebarItems.map(i => i.text))]
      .filter(text => text && text.length > 1 && text.length < 50)
      .slice(0, 10);
    
    console.log('\n🧭 Exploring:', uniqueNavItems.join(', '));
    
    for (let i = 0; i < uniqueNavItems.length; i++) {
      const navName = uniqueNavItems[i];
      console.log(`\n📍 ${navName}...`);
      
      try {
        const navLink = await page.$(`a:has-text("${navName}")`);
        if (navLink) {
          await navLink.click();
          await page.waitForTimeout(4000);
          
          const screenshotNum = String(i + 2).padStart(2, '0');
          const safeName = navName.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 30);
          await capturePage(page, `${screenshotNum}-${safeName}`);
          
          const pageData = await extractPageData(page);
          results.pages.push({ name: navName, data: pageData });
          
          console.log(`✅ Captured - Tables: ${pageData.tables.length}, Buttons: ${pageData.buttons.slice(0, 5).map(b => b.text).join(', ')}`);
        }
      } catch (e) {
        console.log(`❌ Error: ${e.message}`);
      }
    }
    
    // Save results
    fs.writeFileSync(path.join(__dirname, 'keitaro-analysis-data.json'), JSON.stringify(results, null, 2));
    
    // Generate report
    let report = '# Keitaro Demo 详细分析报告\n\n';
    report += `生成时间: ${new Date().toISOString()}\n\n`;
    report += `共分析 ${results.pages.length} 个页面\n\n`;
    
    results.pages.forEach((page, idx) => {
      report += `## ${idx + 1}. ${page.name}\n\n`;
      report += `**URL:** ${page.data.url}\n\n`;
      report += `**Title:** ${page.data.title}\n\n`;
      
      if (page.data.sidebarItems.length > 0) {
        report += '### 侧边栏导航\n\n';
        page.data.sidebarItems.forEach(item => report += `- ${item.text}\n`);
        report += '\n';
      }
      
      if (page.data.headings.length > 0) {
        report += '### 页面标题\n\n';
        page.data.headings.forEach(h => report += `- **${h.tag}:** ${h.text}\n`);
        report += '\n';
      }
      
      if (page.data.statsCards.length > 0) {
        report += '### 统计卡片/KPI\n\n';
        page.data.statsCards.slice(0, 15).forEach((card, i) => {
          report += `${i + 1}. ${card.text.replace(/\n/g, ' ').substring(0, 250)}\n`;
        });
        report += '\n';
      }
      
      if (page.data.tables.length > 0) {
        report += '### 数据表格\n\n';
        page.data.tables.forEach((t, i) => {
          report += `**表格 ${i + 1}** (${t.rowCount} 行)\n`;
          report += `- 表头: ${t.headers.join(' | ')}\n`;
          if (t.firstRowData.length > 0) report += `- 示例: ${t.firstRowData.join(' | ')}\n`;
          report += '\n';
        });
      }
      
      if (page.data.buttons.length > 0) {
        report += '### 主要按钮\n\n';
        page.data.buttons.slice(0, 20).forEach((b, i) => report += `${i + 1}. ${b.text}\n`);
        report += '\n';
      }
      
      if (page.data.charts.length > 0) {
        report += '### 图表元素\n\n';
        report += `发现 ${page.data.charts.length} 个图表\n\n`;
        page.data.charts.forEach((c, i) => report += `${i + 1}. ${c.tagName}${c.width ? ` (${c.width}x${c.height})` : ''}\n`);
        report += '\n';
      }
      
      report += '### 页面内容\n\n```\n' + page.data.bodyText.substring(0, 1500) + '\n```\n\n---\n\n';
    });
    
    fs.writeFileSync(path.join(__dirname, 'keitaro-detailed-report.md'), report);
    console.log('\n✅ Complete! Check keitaro-screenshots/ and keitaro-detailed-report.md');
    
    await browser.close();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

exploreKeitaro().catch(console.error);
