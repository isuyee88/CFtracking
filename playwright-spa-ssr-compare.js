/**
 * @fileoverview SPA vs SSR 性能对比测试
 * @description 使用 Playwright 测试 SPA 和 SSR 版本的性能差异
 * 
 * 使用方法:
 * node playwright-spa-ssr-compare.js
 * 
 * 输出:
 * - playwright-spa-results.json (SPA 原始数据)
 * - playwright-ssr-results.json (SSR 原始数据)
 * - SPA_VS_SSR_COMPARISON.md (对比报告)
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// 测试配置
const CONFIG = {
  spaUrl: 'http://localhost:5173', // SPA 开发服务器
  ssrUrl: 'http://localhost:5174', // SSR 开发服务器（稍后启动）
  pages: [
    { name: '首页', path: '/#/' },
    { name: '设置页面', path: '/#/settings' },
  ],
  viewport: { width: 1350, height: 940 },
  deviceScaleFactor: 1,
};

// 性能指标收集
async function collectPerformanceMetrics(page) {
  // 注入性能监控脚本
  await page.addInitScript(() => {
    window.__perfMetrics = {
      fcp: null,
      lcp: null,
      cls: 0,
      tbt: 0,
      longTasks: [],
      ttfb: null,
    };

    // TTFB
    const navigationEntry = performance.getEntriesByType('navigation')[0];
    if (navigationEntry) {
      window.__perfMetrics.ttfb = navigationEntry.responseStart;
    }

    // FCP Observer
    try {
      const fcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const fcp = entries.find(entry => entry.name === 'first-contentful-paint');
        if (fcp) {
          window.__perfMetrics.fcp = fcp.startTime;
        }
      });
      fcpObserver.observe({ entryTypes: ['paint'] });
    } catch (e) {}

    // LCP Observer
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        if (entries.length > 0) {
          window.__perfMetrics.lcp = entries[entries.length - 1].startTime;
        }
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (e) {}

    // CLS Observer
    try {
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            window.__perfMetrics.cls += entry.value;
          }
        }
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    } catch (e) {}
  });

  // 等待并收集数据
  await page.waitForTimeout(5000);

  // 获取性能数据
  const perfData = await page.evaluate(() => {
    return {
      fcp: window.__perfMetrics?.fcp,
      lcp: window.__perfMetrics?.lcp,
      cls: window.__perfMetrics?.cls ?? 0,
      tbt: 0, // 简化：暂不计算 TBT
      ttfb: window.__perfMetrics?.ttfb,
    };
  });

  return perfData;
}

// 计算性能评分
function calculatePerformanceScore(metrics) {
  let score = 100;

  // FCP 评分（20%）
  if (metrics.fcp > 3000) score -= 25;
  else if (metrics.fcp > 1800) score -= 15;
  else if (metrics.fcp > 1000) score -= 5;

  // LCP 评分（30%）
  if (metrics.lcp > 4000) score -= 35;
  else if (metrics.lcp > 2500) score -= 20;
  else if (metrics.lcp > 1800) score -= 10;

  // CLS 评分（25%）
  if (metrics.cls > 0.25) score -= 30;
  else if (metrics.cls > 0.1) score -= 15;
  else if (metrics.cls > 0.05) score -= 5;

  // TBT 评分（25%）
  if (metrics.tbt > 600) score -= 30;
  else if (metrics.tbt > 300) score -= 15;
  else if (metrics.tbt > 100) score -= 5;

  return Math.max(0, Math.min(100, score));
}

function getRating(score) {
  if (score >= 90) return '优秀';
  if (score >= 75) return '良好';
  if (score >= 50) return '一般';
  return '需优化';
}

// 测试单个页面
async function testPagePerformance(browser, url, pageName, mode = 'SPA') {
  console.log(`\n📊 测试 ${mode} - ${pageName}: ${url}`);

  const context = await browser.newContext({
    viewport: CONFIG.viewport,
    deviceScaleFactor: CONFIG.deviceScaleFactor,
  });
  const page = await context.newPage();

  const metrics = {
    page: pageName,
    url,
    mode,
    timestamp: new Date().toISOString(),
    fcp: null,
    lcp: null,
    cls: null,
    tbt: null,
    ttfb: null,
    loadTime: null,
    performanceScore: null,
    rating: null,
  };

  try {
    // 开始计时
    const startTime = Date.now();

    // 导航到页面
    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    // 收集性能指标
    const perfData = await collectPerformanceMetrics(page);

    metrics.fcp = perfData.fcp ? Math.round(perfData.fcp) : null;
    metrics.lcp = perfData.lcp ? Math.round(perfData.lcp) : null;
    metrics.cls = perfData.cls !== null ? Math.round(perfData.cls * 1000) / 1000 : null;
    metrics.tbt = perfData.tbt ? Math.round(perfData.tbt) : null;
    metrics.ttfb = perfData.ttfb ? Math.round(perfData.ttfb) : null;
    metrics.loadTime = Date.now() - startTime;

    // 计算性能评分
    if (metrics.fcp && metrics.lcp && metrics.cls !== null && metrics.tbt !== null) {
      metrics.performanceScore = calculatePerformanceScore(metrics);
      metrics.rating = getRating(metrics.performanceScore);
    }

    // 截图
    const screenshotDir = path.join(__dirname, 'performance-results', 'screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    const screenshotPath = path.join(
      screenshotDir,
      `${pageName.replace(/\s+/g, '-')}-${mode.toLowerCase()}.png`
    );
    await page.screenshot({ path: screenshotPath, fullPage: false });

    console.log(`  ✅ TTFB: ${metrics.ttfb}ms | FCP: ${metrics.fcp}ms | LCP: ${metrics.lcp}ms`);
    console.log(`  📊 性能评分：${metrics.performanceScore}/100 (${metrics.rating})`);

  } catch (error) {
    console.error(`  ❌ 测试失败：${error.message}`);
    metrics.error = error.message;
  } finally {
    await context.close();
  }

  return metrics;
}

// 生成对比报告
function generateComparisonReport(spaMetrics, ssrMetrics) {
  const timestamp = new Date().toISOString();

  let report = `# 🚀 SPA vs SSR 性能对比报告

**测试时间**: ${timestamp}  
**测试工具**: Playwright + Performance API  
**设备**: Desktop (1350x940)

---

## 📊 性能评分对比

| 页面 | 模式 | Performance | TTFB | FCP | LCP | CLS | TBT | 加载时间 |
|------|------|-------------|------|-----|-----|-----|-----|----------|
`;

  const allMetrics = [...spaMetrics, ...ssrMetrics];
  allMetrics.forEach(m => {
    if (!m.error && m.performanceScore !== null) {
      const modeEmoji = m.mode === 'SPA' ? '💻' : '⚡';
      report += `| ${m.page} | ${modeEmoji} ${m.mode} | **${m.performanceScore}** | ${m.ttfb}ms | ${m.fcp}ms | ${m.lcp}ms | ${m.cls} | ${m.tbt}ms | ${m.loadTime}ms |\n`;
    }
  });

  report += `
---

## 📈 详细对比

`;

  CONFIG.pages.forEach(pageConfig => {
    const spaData = spaMetrics.find(m => m.page === pageConfig.name && !m.error);
    const ssrData = ssrMetrics.find(m => m.page === pageConfig.name && !m.error);

    if (spaData && ssrData) {
      report += `### ${pageConfig.name}\n\n`;

      report += `#### 💻 SPA 性能数据\n`;
      report += `- **Performance Score**: ${spaData.performanceScore}/100 (${spaData.rating})\n`;
      report += `- **TTFB**: ${spaData.ttfb}ms\n`;
      report += `- **FCP**: ${spaData.fcp}ms\n`;
      report += `- **LCP**: ${spaData.lcp}ms\n`;
      report += `- **CLS**: ${spaData.cls}\n`;
      report += `- **TBT**: ${spaData.tbt}ms\n`;
      report += `- **加载时间**: ${spaData.loadTime}ms\n\n`;

      report += `#### ⚡ SSR 性能数据\n`;
      report += `- **Performance Score**: ${ssrData.performanceScore}/100 (${ssrData.rating})\n`;
      report += `- **TTFB**: ${ssrData.ttfb}ms\n`;
      report += `- **FCP**: ${ssrData.fcp}ms\n`;
      report += `- **LCP**: ${ssrData.lcp}ms\n`;
      report += `- **CLS**: ${ssrData.cls}\n`;
      report += `- **TBT**: ${ssrData.tbt}ms\n`;
      report += `- **加载时间**: ${ssrData.loadTime}ms\n\n`;

      // 计算提升倍数
      if (spaData.performanceScore > 0 && ssrData.performanceScore > 0) {
        const ttfbImprovement = spaData.ttfb && ssrData.ttfb 
          ? (spaData.ttfb / ssrData.ttfb).toFixed(2)
          : 'N/A';
        const fcpImprovement = spaData.fcp && ssrData.fcp
          ? (spaData.fcp / ssrData.fcp).toFixed(2)
          : 'N/A';
        const lcpImprovement = spaData.lcp && ssrData.lcp
          ? (spaData.lcp / ssrData.lcp).toFixed(2)
          : 'N/A';

        report += `#### 📊 性能提升\n`;
        report += `- **TTFB 提升**: ${ttfbImprovement}x ${ttfbImprovement > 1 ? '✅' : '⚠️'}\n`;
        report += `- **FCP 提升**: ${fcpImprovement}x ${fcpImprovement > 1 ? '✅' : '⚠️'}\n`;
        report += `- **LCP 提升**: ${lcpImprovement}x ${lcpImprovement > 1 ? '✅' : '⚠️'}\n`;
        report += `- **Performance 评分提升**: +${ssrData.performanceScore - spaData.performanceScore}分\n\n`;
      }

      report += `---\n\n`;
    }
  });

  // 总结
  const spaAvgScore = spaMetrics
    .filter(m => !m.error && m.performanceScore !== null)
    .reduce((sum, m) => sum + m.performanceScore, 0) / 
    spaMetrics.filter(m => !m.error && m.performanceScore !== null).length;

  const ssrAvgScore = ssrMetrics
    .filter(m => !m.error && m.performanceScore !== null)
    .reduce((sum, m) => sum + m.performanceScore, 0) / 
    ssrMetrics.filter(m => !m.error && m.performanceScore !== null).length;

  report += `## 🎯 总结\n\n`;
  report += `### 平均性能评分\n`;
  report += `- **SPA**: ${spaAvgScore.toFixed(0)}/100\n`;
  report += `- **SSR**: ${ssrAvgScore.toFixed(0)}/100\n`;
  report += `- **提升**: +${(ssrAvgScore - spaAvgScore).toFixed(0)}分\n\n`;

  if (ssrAvgScore > spaAvgScore) {
    const improvement = (ssrAvgScore / spaAvgScore).toFixed(2);
    report += `✅ **SSR 相比 SPA 性能提升 ${improvement}x 倍**\n\n`;
    
    if (improvement >= 3) {
      report += `🎉 **达到预期的 3-5 倍性能提升目标！**\n`;
      report += `💡 **建议：考虑迁移到 SSR 架构**\n`;
    } else if (improvement >= 2) {
      report += `👍 **性能提升明显，建议考虑迁移**\n`;
    } else {
      report += `⚠️ **性能提升有限，建议保持现状 + 优化**\n`;
    }
  } else {
    report += `⚠️ **SSR 性能未明显提升，建议保持现状**\n`;
  }

  report += `\n---\n\n`;
  report += `## 📝 测试方法\n\n`;
  report += `1. **测试工具**: Playwright (Chromium)\n`;
  report += `2. **设备模拟**: Desktop (1350x940)\n`;
  report += `3. **网络条件**: 无限制（本地网络）\n`;
  report += `4. **指标收集**: Performance API + PerformanceObserver\n`;
  report += `5. **测试页面**: ${CONFIG.pages.map(p => p.name).join(', ')}\n`;
  report += `6. **每个页面**: 测试 1 次（可扩展为多次取平均）\n`;

  report += `\n---\n\n`;
  report += `*报告生成时间：${timestamp}*\n`;

  // 保存报告
  const reportPath = path.join(__dirname, 'SPA_VS_SSR_COMPARISON.md');
  fs.writeFileSync(reportPath, report, 'utf-8');
  console.log(`\n📄 对比报告已保存：${reportPath}`);

  // 保存原始数据
  const spaDataPath = path.join(__dirname, 'performance-results', 'spa-results.json');
  fs.writeFileSync(spaDataPath, JSON.stringify(spaMetrics, null, 2), 'utf-8');
  console.log(`📊 SPA 数据已保存：${spaDataPath}`);

  const ssrDataPath = path.join(__dirname, 'performance-results', 'ssr-results.json');
  fs.writeFileSync(ssrDataPath, JSON.stringify(ssrMetrics, null, 2), 'utf-8');
  console.log(`📊 SSR 数据已保存：${ssrDataPath}`);
}

// 主函数
async function main() {
  console.log('🚀 开始 SPA vs SSR 性能对比测试...\n');
  console.log(`💻 SPA URL: ${CONFIG.spaUrl}`);
  console.log(`⚡ SSR URL: ${CONFIG.ssrUrl}`);
  console.log(`📄 测试页面：${CONFIG.pages.map(p => p.name).join(', ')}\n`);

  const spaMetrics = [];
  const ssrMetrics = [];

  // 启动浏览器
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu'
    ]
  });

  try {
    // 测试 SPA
    console.log('💻 开始测试 SPA 版本...\n');
    for (const page of CONFIG.pages) {
      const url = `${CONFIG.spaUrl}${page.path}`;
      const metrics = await testPagePerformance(browser, url, page.name, 'SPA');
      spaMetrics.push(metrics);
    }

    // 测试 SSR（如果可用）
    try {
      console.log('\n⚡ 开始测试 SSR 版本...\n');
      for (const page of CONFIG.pages) {
        const url = `${CONFIG.ssrUrl}${page.path}`;
        const metrics = await testPagePerformance(browser, url, page.name, 'SSR');
        ssrMetrics.push(metrics);
      }
    } catch (error) {
      console.log('\n⚠️  SSR 服务器未启动，仅测试 SPA 版本');
      console.log('提示：启动 SSR 服务器后再运行完整对比测试');
    }

  } finally {
    await browser.close();
  }

  // 生成对比报告
  if (ssrMetrics.length > 0) {
    generateComparisonReport(spaMetrics, ssrMetrics);
  } else {
    // 仅保存 SPA 数据
    const spaDataPath = path.join(__dirname, 'performance-results', 'spa-baseline-results.json');
    fs.writeFileSync(spaDataPath, JSON.stringify(spaMetrics, null, 2), 'utf-8');
    console.log(`\n📊 SPA 基线数据已保存：${spaDataPath}`);
  }

  console.log('\n✅ 性能测试完成！\n');
}

// 运行测试
main().catch(console.error);
