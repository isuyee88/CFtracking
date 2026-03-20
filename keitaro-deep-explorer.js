const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const http = require('http');

const screenshotDir = path.join(__dirname, 'keitaro-screenshots-detailed');
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

async function captureFullPage(page, baseName) {
  const screenshots = [];
  
  // Get page dimensions
  const pageHeight = await page.evaluate(() => document.body.scrollHeight);
  const viewportHeight = 1080;
  const scrollSteps = Math.ceil(pageHeight / viewportHeight);
  
  console.log(`   Page height: ${pageHeight}, Viewport: ${viewportHeight}, Steps: ${scrollSteps}`);
  
  // Capture each scroll position
  for (let i = 0; i < scrollSteps; i++) {
    const scrollY = i * viewportHeight;
    await page.evaluate((y) => window.scrollTo(0, y), scrollY);
    await page.waitForTimeout(1000);
    
    const screenshotPath = path.join(screenshotDir, `${baseName}-scroll-${i + 1}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });
    screenshots.push(screenshotPath);
    console.log(`   ✅ Scroll ${i + 1}/${scrollSteps}: ${screenshotPath}`);
  }
  
  // Scroll back to top
  await page.evaluate(() => window.scrollTo(0, 0));
  
  return screenshots;
}

async function captureElement(page, selector, name) {
  try {
    const element = await page.$(selector);
    if (element) {
      const screenshotPath = path.join(screenshotDir, `${name}.png`);
      await element.screenshot({ path: screenshotPath });
      console.log(`   ✅ Element screenshot: ${screenshotPath}`);
      return screenshotPath;
    }
  } catch (e) {
    console.log(`   ⚠️ Could not capture ${name}: ${e.message}`);
  }
  return null;
}

async function extractDetailedData(page) {
  return await page.evaluate(() => {
    const data = {
      title: document.title,
      url: window.location.href,
      
      // All text content organized by sections
      sections: Array.from(document.querySelectorAll('section, .section, [class*="section"]')).map((section, idx) => ({
        index: idx,
        className: section.className,
        text: section.innerText.substring(0, 500)
      })),
      
      // All form fields
      formFields: Array.from(document.querySelectorAll('input, select, textarea')).map(field => ({
        type: field.type || field.tagName.toLowerCase(),
        name: field.name,
        id: field.id,
        placeholder: field.placeholder,
        value: field.value?.substring(0, 100),
        label: field.labels?.[0]?.innerText || field.getAttribute('aria-label')
      })).filter(f => f.name || f.id || f.placeholder),
      
      // All tables with full data
      tables: Array.from(document.querySelectorAll('table')).map((t, idx) => ({
        index: idx,
        headers: Array.from(t.querySelectorAll('thead th')).map(th => th.innerText.trim()),
        rows: Array.from(t.querySelectorAll('tbody tr')).slice(0, 5).map(tr => 
          Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim())
        ),
        totalRows: t.querySelectorAll('tbody tr').length
      })).filter(t => t.headers.length > 0),
      
      // Modal/Popup content
      modals: Array.from(document.querySelectorAll('.modal, [class*="modal"], .popup, [class*="popup"], .dialog, [role="dialog"]')).map((m, idx) => ({
        index: idx,
        className: m.className,
        text: m.innerText.substring(0, 800),
        visible: m.offsetParent !== null
      })).filter(m => m.text.length > 10),
      
      // Cards and panels
      cards: Array.from(document.querySelectorAll('.card, [class*="card"], .panel, [class*="panel"]')).map((c, idx) => ({
        index: idx,
        className: c.className,
        text: c.innerText.substring(0, 400)
      })).filter(c => c.text.length > 20).slice(0, 20),
      
      // Navigation items
      navItems: Array.from(document.querySelectorAll('nav a, .sidebar a, .menu a, [class*="nav"] a')).map(a => ({
        text: a.innerText.trim(),
        href: a.getAttribute('href')
      })).filter(item => item.text && item.text.length > 0 && item.text.length < 100),
      
      // Buttons
      buttons: Array.from(document.querySelectorAll('button, [role="button"], .btn, input[type="submit"]')).map(b => ({
        text: b.innerText.trim() || b.value,
        type: b.type
      })).filter(b => b.text).slice(0, 30),
      
      // Charts
      charts: Array.from(document.querySelectorAll('canvas, svg, [class*="chart"]')).map((el, idx) => ({
        index: idx,
        tagName: el.tagName,
        className: el.className
      })),
      
      // Full page text
      fullText: document.body.innerText
    };
    return data;
  });
}

async function exploreModalsAndPopups(page, pageName) {
  console.log(`   🔍 Checking for modals and popups...`);
  
  // Look for buttons that might open modals
  const modalTriggers = await page.$$('button:has-text("Add"), button:has-text("New"), button:has-text("Create"), button:has-text("Edit"), a:has-text("Add"), a:has-text("New")');
  
  for (let i = 0; i < Math.min(modalTriggers.length, 3); i++) {
    try {
      const btn = modalTriggers[i];
      const btnText = await btn.innerText();
      console.log(`   🖱️ Clicking "${btnText}"...`);
      
      await btn.click();
      await page.waitForTimeout(2000);
      
      // Capture modal
      await captureElement(page, '.modal, [class*="modal"], .popup, [class*="popup"]', `${pageName}-modal-${i + 1}`);
      
      // Try to close modal (ESC or close button)
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
      
      // Click outside to close if still open
      await page.mouse.click(100, 100);
      await page.waitForTimeout(500);
    } catch (e) {
      console.log(`   ⚠️ Modal error: ${e.message}`);
    }
  }
}

async function exploreKeitaroDeep() {
  console.log('🚀 Starting Deep Keitaro Demo exploration...\n');
  
  try {
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
    
    const keitaroPage = cdpData.find(p => p.url && p.url.includes('demo.keitaro'));
    if (!keitaroPage) {
      console.log('❌ Keitaro page not found');
      return;
    }
    
    console.log('✅ Found Keitaro page:', keitaroPage.title);
    
    const browser = await chromium.connectOverCDP(`http://localhost:${port}`);
    const contexts = browser.contexts();
    
    let page = null;
    for (const context of contexts) {
      const pages = context.pages();
      page = pages.find(p => p.url().includes('demo.keitaro'));
      if (page) break;
    }
    
    if (!page) {
      console.log('❌ No page available');
      await browser.close();
      return;
    }
    
    await page.bringToFront();
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(2000);
    
    // Define pages to explore
    const pagesToExplore = [
      { name: 'dashboard', navText: 'Dashboard' },
      { name: 'campaigns', navText: 'Campaigns' },
      { name: 'landing-pages', navText: 'Landing Pages' },
      { name: 'offers', navText: 'Offers' },
      { name: 'traffic-sources', navText: 'Traffic Sources' },
      { name: 'affiliate-networks', navText: 'Affiliate Networks' },
      { name: 'clicks-log', navText: 'Clicks log' },
      { name: 'conversions-log', navText: 'Conversions log' },
      { name: 'reports', navText: 'Create report' },
      { name: 'trends', navText: 'Trends' },
    ];
    
    for (const { name, navText } of pagesToExplore) {
      console.log(`\n📍 Exploring ${navText}...`);
      
      try {
        // Navigate to page
        const navLink = await page.$(`a:has-text("${navText}")`);
        if (navLink) {
          await navLink.click();
          await page.waitForTimeout(3000);
        }
        
        // Full page scroll screenshots
        console.log('   📸 Taking full page screenshots...');
        const scrollShots = await captureFullPage(page, name);
        
        // Extract detailed data
        console.log('   📊 Extracting data...');
        const pageData = await extractDetailedData(page);
        results.pages.push({ name: navText, screenshots: scrollShots, data: pageData });
        
        // Explore modals and popups
        await exploreModalsAndPopups(page, name);
        
        // Try to click on first row to see detail/edit view
        const firstRow = await page.$('table tbody tr:first-child');
        if (firstRow) {
          console.log('   🖱️ Clicking first table row...');
          await firstRow.click();
          await page.waitForTimeout(2000);
          await captureFullPage(page, `${name}-detail`);
          
          // Go back
          await page.goBack();
          await page.waitForTimeout(2000);
        }
        
        console.log(`   ✅ ${navText} complete`);
        
      } catch (e) {
        console.log(`   ❌ Error: ${e.message}`);
      }
    }
    
    // Save results
    fs.writeFileSync(path.join(__dirname, 'keitaro-deep-analysis.json'), JSON.stringify(results, null, 2));
    
    // Generate detailed report
    generateDeepReport(results);
    
    console.log('\n✅ Deep exploration complete!');
    console.log(`📁 Screenshots: ${screenshotDir}`);
    console.log(`📄 Report: keitaro-deep-report.md`);
    
    await browser.close();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

function generateDeepReport(results) {
  let report = '# Keitaro Demo 深度分析报告\n\n';
  report += `生成时间: ${new Date().toISOString()}\n\n`;
  report += `共分析 ${results.pages.length} 个页面\n\n`;
  
  results.pages.forEach((page) => {
    report += `## ${page.name}\n\n`;
    report += `**URL:** ${page.data.url}\n\n`;
    
    if (page.screenshots && page.screenshots.length > 0) {
      report += `**截图文件:**\n`;
      page.screenshots.forEach(s => {
        report += `- ${path.basename(s)}\n`;
      });
      report += '\n';
    }
    
    // Navigation
    if (page.data.navItems && page.data.navItems.length > 0) {
      report += '### 导航菜单\n\n';
      page.data.navItems.slice(0, 20).forEach(item => {
        report += `- ${item.text}\n`;
      });
      report += '\n';
    }
    
    // Form Fields
    if (page.data.formFields && page.data.formFields.length > 0) {
      report += '### 表单字段\n\n';
      page.data.formFields.forEach(field => {
        report += `- **${field.name || field.id || '未命名'}** (${field.type})`;
        if (field.placeholder) report += ` - 占位符: "${field.placeholder}"`;
        if (field.label) report += ` - 标签: "${field.label}"`;
        report += '\n';
      });
      report += '\n';
    }
    
    // Tables
    if (page.data.tables && page.data.tables.length > 0) {
      report += '### 数据表格\n\n';
      page.data.tables.forEach((t, i) => {
        report += `**表格 ${i + 1}** (${t.totalRows} 行)\n\n`;
        report += `表头: ${t.headers.join(' | ')}\n\n`;
        if (t.rows.length > 0) {
          report += '示例数据:\n';
          t.rows.forEach((row, ri) => {
            report += `${ri + 1}. ${row.join(' | ')}\n`;
          });
        }
        report += '\n';
      });
    }
    
    // Cards
    if (page.data.cards && page.data.cards.length > 0) {
      report += '### 卡片/面板\n\n';
      page.data.cards.slice(0, 15).forEach((card, i) => {
        report += `**卡片 ${i + 1}:**\n`;
        report += `${card.text.replace(/\n/g, ' ').substring(0, 300)}\n\n`;
      });
    }
    
    // Modals
    if (page.data.modals && page.data.modals.length > 0) {
      report += '### 弹窗/模态框\n\n';
      page.data.modals.forEach((m, i) => {
        report += `**弹窗 ${i + 1}** (${m.visible ? '可见' : '隐藏'})\n`;
        report += `${m.text.replace(/\n/g, ' ').substring(0, 400)}\n\n`;
      });
    }
    
    // Buttons
    if (page.data.buttons && page.data.buttons.length > 0) {
      report += '### 按钮\n\n';
      page.data.buttons.slice(0, 25).forEach((b, i) => {
        report += `${i + 1}. ${b.text}${b.type ? ` (${b.type})` : ''}\n`;
      });
      report += '\n';
    }
    
    // Charts
    if (page.data.charts && page.data.charts.length > 0) {
      report += '### 图表\n\n';
      report += `发现 ${page.data.charts.length} 个图表元素\n\n`;
      page.data.charts.forEach((c, i) => {
        report += `${i + 1}. ${c.tagName}${c.className ? ` - ${c.className}` : ''}\n`;
      });
      report += '\n';
    }
    
    report += '---\n\n';
  });
  
  fs.writeFileSync(path.join(__dirname, 'keitaro-deep-report.md'), report);
  console.log('📝 Deep report saved!');
}

exploreKeitaroDeep().catch(console.error);
