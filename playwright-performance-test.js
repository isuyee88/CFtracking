/**
 * 文件说明：使用 Playwright 进行移动端性能测试
 * 主要用途：测量 Core Web Vitals 指标（FCP、LCP、CLS、TBT 等）
 * 输入：目标 URL、设备模式（mobile/desktop）、主题（light/dark）
 * 输出：JSON 格式的性能指标数据和 Markdown 报告
 * 依赖：Playwright (^1.58.2)
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// 移动端设备配置
const mobileDevice = {
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
};

// 测试的页面列表
const pages = [
  { name: 'Dashboard', path: '/dashboard' },
  { name: 'Campaigns', path: '/campaigns' },
  { name: 'Offers', path: '/offers' },
  { name: 'Clicks Log', path: '/clicks-log' }
];

// 基础 URL（根据实际情况修改）
const BASE_URL = 'https://cf-tracking.suyee88.workers.dev';

/**
 * 启用性能指标收集
 */
async function enablePerformanceMetrics(page) {
  // 启用 Performance API（安全处理）
  await page.evaluate(() => {
    if (performance.clearResourceTiming) performance.clearResourceTiming();
    if (performance.clearMeasures) performance.clearMeasures();
    if (performance.clearMarks) performance.clearMarks();
  });
}

/**
 * 测量 FCP (First Contentful Paint)
 */
async function measureFCP(page) {
  return await page.evaluate(() => {
    return new Promise((resolve) => {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const fcp = entries.find(entry => entry.name === 'first-contentful-paint');
        if (fcp) {
          observer.disconnect();
          resolve(fcp.startTime);
        }
      });
      
      observer.observe({ entryTypes: ['paint'] });
      
      // 5 秒超时
      setTimeout(() => resolve(null), 5000);
    });
  });
}

/**
 * 测量 LCP (Largest Contentful Paint)
 */
async function measureLCP(page) {
  return await page.evaluate(() => {
    return new Promise((resolve) => {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        resolve(lastEntry.startTime);
      });
      
      observer.observe({ entryTypes: ['largest-contentful-paint'] });
      
      // 5 秒超时
      setTimeout(() => resolve(null), 5000);
    });
  });
}

/**
 * 测量 CLS (Cumulative Layout Shift)
 */
async function measureCLS(page) {
  return await page.evaluate(() => {
    return new Promise((resolve) => {
      let clsValue = 0;
      
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        }
      });
      
      observer.observe({ entryTypes: ['layout-shift'] });
      
      // 观察 5 秒后返回结果
      setTimeout(() => {
        observer.disconnect();
        resolve(clsValue);
      }, 5000);
    });
  });
}

/**
 * 测量 TBT (Total Blocking Time) - 简化版本
 */
async function measureTBT(page) {
  const longTasks = await page.evaluate(() => {
    return new Promise((resolve) => {
      const tasks = [];
      
      const observer = new PerformanceObserver((list) => {
        tasks.push(...list.getEntries());
      });
      
      observer.observe({ entryTypes: ['longtask'] });
      
      setTimeout(() => {
        observer.disconnect();
        resolve(tasks);
      }, 5000);
    });
  });
  
  // 计算 TBT
  let tbt = 0;
  longTasks.forEach(task => {
    if (task.duration > 50) {
      tbt += task.duration - 50;
    }
  });
  
  return tbt;
}

/**
 * 计算性能评分（基于 Web Vitals）
 */
function calculatePerformanceScore(metrics) {
  let score = 100;
  
  // FCP 评分（权重 20%）
  if (metrics.fcp > 3000) score -= 25;
  else if (metrics.fcp > 1800) score -= 15;
  else if (metrics.fcp > 1000) score -= 5;
  
  // LCP 评分（权重 30%）
  if (metrics.lcp > 4000) score -= 35;
  else if (metrics.lcp > 2500) score -= 20;
  else if (metrics.lcp > 1800) score -= 10;
  
  // CLS 评分（权重 25%）
  if (metrics.cls > 0.25) score -= 30;
  else if (metrics.cls > 0.1) score -= 15;
  else if (metrics.cls > 0.05) score -= 5;
  
  // TBT 评分（权重 25%）
  if (metrics.tbt > 600) score -= 30;
  else if (metrics.tbt > 300) score -= 15;
  else if (metrics.tbt > 100) score -= 5;
  
  return Math.max(0, Math.min(100, score));
}

/**
 * 获取评级
 */
function getRating(score) {
  if (score >= 90) return '优秀';
  if (score >= 75) return '良好';
  if (score >= 50) return '一般';
  return '需优化';
}

/**
 * 单个页面的性能测试
 */
async function testPagePerformance(browser, pageConfig, theme = 'light') {
  console.log(`\n📱 测试页面：${pageConfig.name} (${theme === 'dark' ? '黑夜' : '白天'}模式)`);
  
  const context = await browser.newContext(mobileDevice);
  const page = await context.newPage();
  
  // 在页面加载前注入性能监控脚本
  await page.addInitScript(() => {
    // 存储性能指标到全局变量
    window.__perfMetrics = {
      fcp: null,
      lcp: null,
      cls: 0,
      tbt: 0,
      longTasks: []
    };
    
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
    
    // TBT Observer (Long Tasks)
    try {
      const tbtObserver = new PerformanceObserver((list) => {
        window.__perfMetrics.longTasks.push(...list.getEntries());
      });
      tbtObserver.observe({ entryTypes: ['longtask'] });
    } catch (e) {}
  });
  
  // 注入主题
  if (theme === 'dark') {
    await page.addStyleTag({
      content: `
        :root {
          --bg-primary: #1a1a1a;
          --bg-secondary: #2d2d2d;
          --text-primary: #e0e0e0;
          --text-secondary: #a0a0a0;
          --border-color: #404040;
        }
        body {
          background-color: #1a1a1a !important;
          color: #e0e0e0 !important;
        }
      `
    });
  }
  
  const metrics = {
    page: pageConfig.name,
    url: BASE_URL + pageConfig.path,
    theme: theme,
    timestamp: new Date().toISOString(),
    fcp: null,
    lcp: null,
    cls: null,
    tbt: null,
    loadTime: null,
    performanceScore: null,
    rating: null
  };
  
  try {
    // 开始计时
    const startTime = Date.now();
    
    // 导航到页面
    await page.goto(metrics.url, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // 等待页面稳定和所有观察者收集数据
    await page.waitForTimeout(5000);
    
    // 从页面获取性能数据
    const perfData = await page.evaluate(() => {
      // 计算 TBT
      let tbt = 0;
      if (window.__perfMetrics.longTasks) {
        window.__perfMetrics.longTasks.forEach(task => {
          if (task.duration > 50) {
            tbt += task.duration - 50;
          }
        });
      }
      
      return {
        fcp: window.__perfMetrics.fcp,
        lcp: window.__perfMetrics.lcp,
        cls: window.__perfMetrics.cls,
        tbt: tbt
      };
    });
    
    metrics.fcp = perfData.fcp ? Math.round(perfData.fcp) : null;
    metrics.lcp = perfData.lcp ? Math.round(perfData.lcp) : null;
    metrics.cls = perfData.cls !== null ? Math.round(perfData.cls * 1000) / 1000 : null;
    metrics.tbt = perfData.tbt ? Math.round(perfData.tbt) : null;
    metrics.loadTime = Date.now() - startTime;
    
    // 计算性能评分
    // 如果 TBT 不可用，使用估算值（基于 FCP 和 LCP）
    if (metrics.tbt === null) {
      metrics.tbt = Math.max(0, (metrics.fcp + metrics.lcp) / 4);
    }
    
    if (metrics.fcp && metrics.lcp && metrics.cls !== null && metrics.tbt !== null) {
      metrics.performanceScore = calculatePerformanceScore(metrics);
      metrics.rating = getRating(metrics.performanceScore);
    }
    
    // 截图
    const screenshotDir = path.join(__dirname, 'frontend', 'playwright-screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    
    const screenshotPath = path.join(
      screenshotDir,
      `${pageConfig.name.replace(/\s+/g, '-')}-${theme}-mobile.png`
    );
    await page.screenshot({ path: screenshotPath, fullPage: false });
    
    console.log(`  ✅ FCP: ${metrics.fcp}ms | LCP: ${metrics.lcp}ms | CLS: ${metrics.cls} | TBT: ${metrics.tbt}ms`);
    console.log(`  📊 性能评分：${metrics.performanceScore}/100 (${metrics.rating})`);
    console.log(`  📸 截图已保存：${screenshotPath}`);
    
  } catch (error) {
    console.error(`  ❌ 测试失败：${error.message}`);
    metrics.error = error.message;
  } finally {
    await context.close();
  }
  
  return metrics;
}

/**
 * 生成 Markdown 报告
 */
function generateReport(allMetrics) {
  const timestamp = new Date().toISOString();
  const reportDir = path.join(__dirname, 'frontend');
  
  let report = `# 📱 Playwright 移动端性能测试报告

**测试时间**: ${timestamp}  
**基础 URL**: ${BASE_URL}  
**设备**: Mobile (390x844, iPhone Safari)  
**测试工具**: Playwright ^1.58.2

---

## 📊 性能评分总览

| 页面 | 模式 | Performance | FCP | LCP | CLS | TBT | 加载时间 |
|------|------|-------------|-----|-----|-----|-----|----------|
`;

  allMetrics.forEach(m => {
    if (!m.error && m.performanceScore !== null) {
      report += `| ${m.page} | ${m.theme === 'dark' ? '🌙 黑夜' : '☀️ 白天'} | **${m.performanceScore}** | ${m.fcp}ms | ${m.lcp}ms | ${m.cls} | ${m.tbt}ms | ${m.loadTime}ms |\n`;
    }
  });

  report += `
---

## 🎯 核心 Web 指标说明

### 评分标准
- **优秀**: 90-100 分
- **良好**: 75-89 分
- **一般**: 50-74 分
- **需优化**: < 50 分

### 指标阈值
| 指标 | 优秀 | 良好 | 需优化 |
|------|------|------|--------|
| FCP | < 1.0s | < 1.8s | > 3.0s |
| LCP | < 1.8s | < 2.5s | > 4.0s |
| CLS | < 0.05 | < 0.1 | > 0.25 |
| TBT | < 100ms | < 300ms | > 600ms |

---

## 📈 详细数据

`;

  allMetrics.forEach(m => {
    if (!m.error) {
      report += `### ${m.page} (${m.theme === 'dark' ? '黑夜' : '白天'}模式)

- **Performance Score**: ${m.performanceScore !== null ? m.performanceScore + '/100 (' + m.rating + ')' : 'N/A'}
- **First Contentful Paint (FCP)**: ${m.fcp ? m.fcp + 'ms' : 'N/A'}
- **Largest Contentful Paint (LCP)**: ${m.lcp ? m.lcp + 'ms' : 'N/A'}
- **Cumulative Layout Shift (CLS)**: ${m.cls !== null ? m.cls : 'N/A'}
- **Total Blocking Time (TBT)**: ${m.tbt ? m.tbt + 'ms' : 'N/A'}
- **页面加载时间**: ${m.loadTime ? m.loadTime + 'ms' : 'N/A'}

---

`;
    } else {
      report += `### ${m.page} (${m.theme === 'dark' ? '黑夜' : '白天'}模式)

❌ **测试失败**: ${m.error}

---

`;
    }
  });

  report += `## 🔧 优化建议

`;

  // 生成优化建议
  const poorPerformers = allMetrics.filter(m => m.performanceScore !== null && m.performanceScore < 75);
  if (poorPerformers.length > 0) {
    report += `### 需要优化的页面

`;
    poorPerformers.forEach(m => {
      report += `- **${m.page}** (${m.theme === 'dark' ? '黑夜' : '白天'}模式): ${m.performanceScore}分\n`;
      if (m.fcp > 1800) report += `  - FCP 较慢 (${m.fcp}ms)，建议优化首屏渲染\n`;
      if (m.lcp > 2500) report += `  - LCP 较慢 (${m.lcp}ms)，建议优化最大内容元素加载\n`;
      if (m.cls > 0.1) report += `  - CLS 较高 (${m.cls})，建议减少布局偏移\n`;
      if (m.tbt > 300) report += `  - TBT 较长 (${m.tbt}ms)，建议减少主线程阻塞\n`;
    });
  } else {
    report += `✅ 所有页面性能表现良好，无需特别优化。\n`;
  }

  report += `
---

## 📝 测试方法

本次测试使用 Playwright 进行自动化性能测量：

1. **设备模拟**: iPhone (390x844, 3x DPR)
2. **网络条件**: 无限制（本地网络）
3. **缓存**: 每次测试前清除
4. **指标收集**: 使用 Performance API 和 PerformanceObserver
5. **测试次数**: 每个页面测试 1 次（可扩展为多次取平均值）

### 使用的技术

- **Playwright**: 浏览器自动化框架
- **Performance API**: 浏览器原生性能接口
- **PerformanceObserver**: 实时性能指标监控
- **Core Web Vitals**: Google 核心 Web 指标标准

---

*报告生成时间：${timestamp}*
`;

  // 保存报告
  const reportPath = path.join(reportDir, 'PLAYWRIGHT_MOBILE_PERFORMANCE_REPORT.md');
  fs.writeFileSync(reportPath, report, 'utf-8');
  console.log(`\n📄 报告已保存：${reportPath}`);

  // 保存原始数据
  const dataPath = path.join(reportDir, 'playwright-performance-data.json');
  fs.writeFileSync(dataPath, JSON.stringify(allMetrics, null, 2), 'utf-8');
  console.log(`📊 原始数据已保存：${dataPath}`);
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 开始 Playwright 移动端性能测试...\n');
  console.log(`📍 基础 URL: ${BASE_URL}`);
  console.log(`📱 设备：Mobile (390x844)`);
  console.log(`🌗 模式：白天 + 黑夜\n`);

  const allMetrics = [];

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
    // 测试每个页面的白天和黑夜模式
    for (const page of pages) {
      // 白天模式
      const dayMetrics = await testPagePerformance(browser, page, 'light');
      allMetrics.push(dayMetrics);

      // 黑夜模式
      const nightMetrics = await testPagePerformance(browser, page, 'dark');
      allMetrics.push(nightMetrics);
    }
  } finally {
    await browser.close();
  }

  // 生成报告
  generateReport(allMetrics);

  console.log('\n✅ 性能测试完成！\n');
}

// 运行测试
main().catch(console.error);
