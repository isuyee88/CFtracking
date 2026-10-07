const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://cf-tracking.suyee88.workers.dev';
const USERNAME = 'admin';
const PASSWORD = 'admin123';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function collectMetrics(page, scenarioName) {
    const metrics = await page.evaluate(() => {
        return new Promise((resolve) => {
            const result = { scenario: window.__scenarioName || 'unknown' };
            
            // Navigation Timing
            const nav = performance.getEntriesByType('navigation')[0];
            if (nav) {
                result.ttfb = Math.round(nav.responseStart - nav.requestStart);
                result.domInteractive = Math.round(nav.domInteractive - nav.fetchStart);
                result.domContentLoaded = Math.round(nav.domContentLoadedEventEnd - nav.fetchStart);
                result.loadComplete = Math.round(nav.loadEventEnd - nav.fetchStart);
                result.transferSize = nav.transferSize;
            }
            
            // Paint Timing
            const fcpEntry = performance.getEntriesByName('first-contentful-paint')[0];
            if (fcpEntry) result.fcp = Math.round(fcpEntry.startTime);
            
            const fmpEntry = performance.getEntriesByName('first-meaningful-paint')[0];
            if (fmpEntry) result.fmp = Math.round(fmpEntry.startTime);
            
            // LCP via PerformanceObserver
            let lcp = 0;
            const lcpObserver = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                const lastEntry = entries[entries.length - 1];
                lcp = Math.round(lastEntry.startTime);
                result.lcpElement = lastEntry.element ? lastEntry.element.tagName + (lastEntry.element.id ? '#' + lastEntry.element.id : '') : 'unknown';
                result.lcpSize = lastEntry.size;
            });
            lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
            
            // CLS via PerformanceObserver
            let clsValue = 0;
            let clsEntries = [];
            const clsObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (!entry.hadRecentInput) {
                        clsValue += entry.value;
                        clsEntries.push({
                            value: entry.value,
                            sources: entry.sources?.map(s => ({
                                node: s.node?.tagName + (s.node?.id ? '#' + s.node.id : ''),
                                previousRect: s.previousRect,
                                currentRect: s.currentRect
                            }))
                        });
                    }
                }
            });
            clsObserver.observe({ type: 'layout-shift', buffered: true });
            
            // INP/FID via PerformanceObserver
            let inp = 0;
            let fid = 0;
            const interactionObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (entry.entryType === 'first-input') {
                        fid = Math.round(entry.processingStart - entry.startTime);
                    }
                    if (entry.duration > inp && entry.interactionId !== undefined) {
                        inp = Math.round(entry.duration);
                    }
                }
            });
            interactionObserver.observe({ type: 'first-input', buffered: true });
            interactionObserver.observe({ type: 'event', buffered: true });
            
            // Resource Statistics
            const resources = performance.getEntriesByType('resource');
            result.totalResources = resources.length;
            result.jsResources = resources.filter(r => r.initiatorType === 'script').length;
            result.cssResources = resources.filter(r => r.initiatorType === 'stylesheet').length;
            result.imageResources = resources.filter(r => r.initiatorType === 'img' || r.initiatorType === 'image').length;
            result.fontResources = resources.filter(r => r.initiatorType === 'font').length;
            result.xhrResources = resources.filter(r => r.initiatorType === 'xmlhttprequest' || r.initiatorType === 'fetch').length;
            
            // JS Size calculation
            const jsTotal = resources
                .filter(r => r.initiatorType === 'script')
                .reduce((sum, r) => sum + (r.transferSize || 0), 0);
            result.jsTotalSizeKB = Math.round(jsTotal / 1024);
            
            const cssTotal = resources
                .filter(r => r.initiatorType === 'stylesheet')
                .reduce((sum, r) => sum + (r.transferSize || 0), 0);
            result.cssTotalSizeKB = Math.round(cssTotal / 1024);
            
            // DOM Stats
            result.domElements = document.querySelectorAll('*').length;
            
            function getMaxDOMDepth(element, depth) {
                depth = depth || 0;
                let maxDepth = depth;
                for (const child of element.children) {
                    maxDepth = Math.max(maxDepth, getMaxDOMDepth(child, depth + 1));
                }
                return maxDepth;
            }
            result.domDepth = getMaxDOMDepth(document.documentElement);
            
            // Long Tasks / TBT
            const longTasks = performance.getEntriesByType('longtask');
            let tbt = 0;
            longTasks.forEach(task => {
                const duration = task.duration - 50;
                if (duration > 0) tbt += duration;
            });
            result.tbt = Math.round(tbt);
            result.longTaskCount = longTasks.length;
            
            // Wait a bit for LCP to finalize, then resolve
            setTimeout(() => {
                result.lcp = lcp;
                result.cls = Math.round(clsValue * 1000) / 1000;
                result.clsEntriesCount = clsEntries.length;
                result.inp = inp;
                result.fid = fid;
                resolve(result);
            }, 1500);
        });
    });
    
    return metrics;
}

function getMaxDOMDepth(element, depth = 0) {
    let maxDepth = depth;
    for (const child of element.children) {
        maxDepth = Math.max(maxDepth, getMaxDOMDepth(child, depth + 1));
    }
    return maxDepth;
}

async function login(page) {
    console.log('🔐 正在登录...');
    
    // Check if we're already on the login page or redirected there
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
    
    const currentUrl = page.url();
    console.log(`当前URL: ${currentUrl}`);
    
    if (currentUrl.includes('/login')) {
        // Fill in credentials
        try {
            await page.waitForSelector('input[type="text"], input[type="email"], input[name*="user"], input[name*="email"]', { timeout: 10000 });
            await page.waitForSelector('input[type="password"]', { timeout: 5000 });
        } catch (e) {
            console.log('未找到登录表单元素，尝试其他选择器...');
        }
        
        // Try to find and fill username field
        const usernameInput = await page.$('input[type="text"], input[type="email"], input[name*="user"], input[name*="email"], input[placeholder*="用户"], input[placeholder*="User"], input[placeholder*="邮箱"]');
        if (usernameInput) await usernameInput.type(USERNAME, { delay: 50 });
        
        // Fill password
        const passwordInput = await page.$('input[type="password"]');
        if (passwordInput) await passwordInput.type(PASSWORD, { delay: 50 });
        
        // Take screenshot before clicking
        await page.screenshot({ path: `.trae/specs/full-chain-test-validation/reports/login-form.png`, fullPage: false }).catch(() => {});
        
        // Click login button - use JavaScript to find it
        const clicked = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const submitBtn = buttons.find(b => 
                b.type === 'submit' || 
                b.textContent.includes('登录') || 
                b.textContent.includes('Login') ||
                b.textContent.includes('Sign')
            );
            if (submitBtn) { submitBtn.click(); return true; }
            return false;
        });
        if (clicked) {
            console.log('✅ 已点击登录按钮');
        } else {
            // Try pressing Enter
            await page.keyboard.press('Enter');
            console.log('✅ 已按Enter提交');
        }
        
        // Wait for redirect to dashboard
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
        await sleep(3000); // Extra wait for data loading
        
        console.log(`登录后URL: ${page.url()}`);
        await page.screenshot({ path: `.trae/specs/full-chain-test-validation/reports/after-login.png`, fullPage: false }).catch(() => {});
    } else {
        console.log('⚠️ 未检测到登录页面，可能已登录或重定向到其他页面');
        await page.screenshot({ path: `.trae/specs/full-chain-test-validation/reports/current-page.png`, fullPage: false }).catch(() => {});
    }
}

async function runAudit() {
    console.log('=== CFTracking 线上环境 Lighthouse 性能审计 ===\n');
    
    const browser = await puppeteer.launch({
        headless: 'new',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-gpu',
            '--disable-dev-shm-usage'
        ]
    });
    
    const results = {};
    
    try {
        // Scenario 1: Dashboard Desktop
        console.log('\n📊 场景1: Dashboard 桌面端 (1280x720)');
        const desktopPage = await browser.newPage();
        await desktopPage.setViewport({ width: 1280, height: 720 });
        await desktopPage.evaluateOnNewDocument(() => { window.__scenarioName = 'Dashboard-Desktop'; });
        
        await desktopPage.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 60000 });
        await login(desktopPage);
        
        // Make sure we're on dashboard
        const dashboardUrl = desktopPage.url();
        console.log(`Dashboard URL: ${dashboardUrl}`);
        
        // Wait for data to load
        await sleep(5000);
        
        // Collect metrics
        results.dashboardDesktop = await collectMetrics(desktopPage, 'Dashboard-Desktop');
        
        // Collect network info
        const desktopPerf = desktopPage.performance;
        console.log(`Dashboard 桌面端指标收集完成`);
        
        await desktopPage.screenshot({ 
            path: `.trae/specs/full-chain-test-validation/reports/dashboard-desktop.png`, 
            fullPage: false 
        }).catch(() => {});
        await desktopPage.close();
        
        // Scenario 2: Campaigns Desktop
        console.log('\n📊 场景2: Campaigns 列表页 (1280x720)');
        const campaignsPage = await browser.newPage();
        await campaignsPage.setViewport({ width: 1280, height: 720 });
        await campaignsPage.evaluateOnNewDocument(() => { window.__scenarioName = 'Campaigns-Desktop'; });
        
        // Navigate to campaigns (should be logged in from same browser context)
        await campaignsPage.goto(`${BASE_URL}/campaigns`, { waitUntil: 'networkidle2', timeout: 60000 });
        await sleep(4000);
        
        results.campaignsDesktop = await collectMetrics(campaignsPage, 'Campaigns-Desktop');
        console.log(`Campaigns 桌面端指标收集完成`);
        
        await campaignsPage.screenshot({ 
            path: `.trae/specs/full-chain-test-validation/reports/campaigns-desktop.png`, 
            fullPage: false 
        }).catch(() => {});
        await campaignsPage.close();
        
        // Scenario 3: Dashboard Mobile (Pixel 5)
        console.log('\n📊 场景3: Dashboard 移动端 (Pixel 5: 393x851)');
        const mobilePage = await browser.newPage();
        await mobilePage.setUserAgent('Mozilla/5.0 (Linux; Android 12; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36');
        await mobilePage.setViewport({ width: 393, height: 851 });
        await mobilePage.evaluateOnNewDocument(() => { window.__scenarioName = 'Dashboard-Mobile'; });
        
        await mobilePage.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 60000 });
        await sleep(5000);
        
        results.dashboardMobile = await collectMetrics(mobilePage, 'Dashboard-Mobile');
        console.log(`Dashboard 移动端指标收集完成`);
        
        await mobilePage.screenshot({ 
            path: `.trae/specs/full-chain-test-validation/reports/dashboard-mobile.png`, 
            fullPage: false 
        }).catch(() => {});
        await mobilePage.close();
        
    } catch (error) {
        console.error('审计过程出错:', error.message);
        results.error = error.message;
    } finally {
        await browser.close();
    }
    
    // Save results
    const outputPath = '.trae/specs/full-chain-test-validation/reports/online-performance-metrics.json';
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`\n✅ 结果已保存到: ${outputPath}`);
    
    // Print summary table
    console.log('\n' + '='.repeat(80));
    console.log('📈 Core Web Vitals 汇总表 (线上生产环境)');
    console.log('='.repeat(80));
    
    for (const [scenario, metrics] of Object.entries(results)) {
        if (scenario === 'error') continue;
        console.log(`\n--- ${metrics.scenario} ---`);
        console.log(`TTFB:     ${metrics.ttfb || 'N/A'}ms${metrics.ttfb && metrics.ttfb < 800 ? ' ✅' : metrics.ttfb >= 1800 ? ' ❌' : ' ⚠️'}`);
        console.log(`FCP:      ${metrics.fcp || 'N/A'}ms${metrics.fcp && metrics.fcp < 1800 ? ' ✅' : metrics.fcp >= 3000 ? ' ❌' : ' ⚠️'}`);
        console.log(`LCP:      ${metrics.lcp || 'N/A'}ms${metrics.lcp && metrics.lcp < 2500 ? ' ✅' : metrics.lcp >= 4000 ? ' ❌' : ' ⚠️'}`);
        console.log(`CLS:      ${metrics.cls ?? 'N/A'}${metrics.cls !== undefined && metrics.cls < 0.1 ? ' ✅' : metrics.cls >= 0.25 ? ' ❌' : ' ⚠️'}`);
        console.log(`TBT:      ${metrics.tbt || 0}ms${metrics.tbt !== undefined && metrics.tbt < 200 ? ' ✅' : metrics.tbt >= 600 ? ' ❌' : ' ⚠️'}`);
        console.log(`FID:      ${metrics.fid || 'N/A'}ms`);
        console.log(`INP:      ${metrics.inp || 'N/A'}ms`);
        console.log(`资源总数: ${metrics.totalResources || 0}`);
        console.log(`JS文件数: ${metrics.jsResources || 0} (${metrics.jsTotalSizeKB || 0}KB)`);
        console.log(`CSS文件数: ${metrics.cssResources || 0} (${metrics.cssTotalSizeKB || 0}KB)`);
        console.log(`API请求:  ${metrics.xhrResources || 0}`);
        console.log(`DOM元素:  ${metrics.domElements || 0}`);
        console.log(`长任务数: ${metrics.longTaskCount || 0}`);
    }
    
    return results;
}

runAudit().catch(console.error);
