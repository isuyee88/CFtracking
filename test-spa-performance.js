#!/usr/bin/env node

/**
 * @fileoverview SPA 性能测试脚本
 * @description 使用 Lighthouse 测试当前项目的性能基线
 * 
 * 使用方法:
 * node test-spa-performance.js
 * 
 * 输出:
 * - performance-results/spa-baseline.json (原始数据)
 * - performance-results/spa-report.md (可视化报告)
 */

const lighthouse = require('lighthouse');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// 测试配置
const CONFIG = {
  baseUrl: 'http://localhost:5173', // Vite 开发服务器
  // baseUrl: 'https://cf-tracking.suyee88.workers.dev', // 生产环境
  outputDir: path.join(__dirname, 'performance-results'),
  pages: [
    {
      name: '首页',
      path: '/#/',
      category: 'landing',
    },
    {
      name: '设置页面',
      path: '/#/settings',
      category: 'interactive',
    },
    {
      name: '数据看板',
      path: '/#/?s=eyJyYW5nZSI6eyJpbnRlcnZhbCI6Imxhc3Q3ZGF5cyJ9fQ==',
      category: 'data-intensive',
    },
  ],
  lighthouseConfig: {
    extends: 'lighthouse:default',
    onlyCategories: ['performance'],
    onlyAudits: [
      'first-contentful-paint',
      'largest-contentful-paint',
      'total-blocking-time',
      'speed-index',
      'interactive',
      'cumulative-layout-shift',
    ],
    screenEmulation: {
      mobile: false,
      width: 1350,
      height: 940,
      deviceScaleFactor: 1,
      disabled: false,
    },
    throttling: {
      rttMs: 40,
      throughputKbps: 10240,
      requestLatencyMs: 10,
      downloadThroughputKbps: 10240,
      uploadThroughputKbps: 10240,
      cpuSlowdownMultiplier: 1,
    },
  },
};

// 确保输出目录存在
if (!fs.existsSync(CONFIG.outputDir)) {
  fs.mkdirSync(CONFIG.outputDir, { recursive: true });
}

// 性能指标中文映射
const METRIC_NAMES = {
  'first-contentful-paint': '首次内容绘制 (FCP)',
  'largest-contentful-paint': '最大内容绘制 (LCP)',
  'total-blocking-time': '总阻塞时间 (TBT)',
  'speed-index': '速度指数 (SI)',
  'interactive': '可交互时间 (TTI)',
  'cumulative-layout-shift': '累积布局偏移 (CLS)',
  'time-to-first-byte': '首字节时间 (TTFB)',
};

// 评级标准
const RATING_STANDARDS = {
  'first-contentful-paint': { good: 1800, needs: 3000 },
  'largest-contentful-paint': { good: 2500, needs: 4000 },
  'total-blocking-time': { good: 200, needs: 600 },
  'speed-index': { good: 3400, needs: 5800 },
  'interactive': { good: 3800, needs: 7300 },
  'cumulative-layout-shift': { good: 0.1, needs: 0.25 },
};

async function testPage(page) {
  const url = `${CONFIG.baseUrl}${page.path}`;
  console.log(`\n📊 开始测试：${page.name} (${url})`);
  
  try {
    // 启动 Lighthouse
    const runnerResult = await lighthouse(url, {
      ...CONFIG.lighthouseConfig,
      port: 9222, // 使用已打开的 Chrome
      output: ['json', 'html'],
    });

    if (!runnerResult?.lhr) {
      throw new Error('Lighthouse 测试失败');
    }

    // 提取性能数据
    const audits = runnerResult.lhr.audits;
    const metrics = {
      name: page.name,
      path: page.path,
      category: page.category,
      url,
      timestamp: new Date().toISOString(),
      performanceScore: runnerResult.lhr.categories.performance.score * 100,
      metrics: {
        fcp: audits['first-contentful-paint']?.numericValue || 0,
        lcp: audits['largest-contentful-paint']?.numericValue || 0,
        tbt: audits['total-blocking-time']?.numericValue || 0,
        si: audits['speed-index']?.numericValue || 0,
        tti: audits['interactive']?.numericValue || 0,
        cls: audits['cumulative-layout-shift']?.numericValue || 0,
        ttfb: audits['time-to-first-byte']?.numericValue || 0,
      },
      displayMetrics: {
        fcp: audits['first-contentful-paint']?.displayValue || 'N/A',
        lcp: audits['largest-contentful-paint']?.displayValue || 'N/A',
        tbt: audits['total-blocking-time']?.displayValue || 'N/A',
        si: audits['speed-index']?.displayValue || 'N/A',
        tti: audits['interactive']?.displayValue || 'N/A',
        cls: audits['cumulative-layout-shift']?.displayValue || 'N/A',
        ttfb: audits['time-to-first-byte']?.displayValue || 'N/A',
      },
    };

    // 保存 JSON 结果
    const jsonPath = path.join(CONFIG.outputDir, `spa-${page.category}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(metrics, null, 2));

    // 保存 HTML 报告
    const htmlPath = path.join(CONFIG.outputDir, `spa-${page.category}.html`);
    if (runnerResult.report) {
      fs.writeFileSync(htmlPath, runnerResult.report);
    }

    console.log(`✅ 测试完成：${page.name}`);
    console.log(`   性能评分：${metrics.performanceScore}/100`);
    console.log(`   FCP: ${metrics.displayMetrics.fcp}`);
    console.log(`   LCP: ${metrics.displayMetrics.lcp}`);
    console.log(`   TTI: ${metrics.displayMetrics.tti}`);

    return metrics;

  } catch (error) {
    console.error(`❌ 测试失败：${page.name}`, error.message);
    return null;
  }
}

function generateReport(results) {
  console.log('\n📈 生成性能报告...');
  
  const validResults = results.filter(r => r !== null);
  
  let markdown = `# SPA 性能测试报告\n\n`;
  markdown += `**测试时间**: ${new Date().toLocaleString('zh-CN')}\n`;
  markdown += `**测试环境**: ${CONFIG.baseUrl}\n`;
  markdown += `**测试工具**: Lighthouse ${require('lighthouse/package.json').version}\n\n`;
  
  markdown += `## 📊 总览\n\n`;
  markdown += `| 页面 | 性能评分 | FCP | LCP | TTI | TBT | CLS |\n`;
  markdown += `|------|----------|-----|-----|-----|-----|-----|\n`;
  
  validResults.forEach(result => {
    const score = result.performanceScore.toFixed(0);
    markdown += `| ${result.name} | ${score} | ${result.displayMetrics.fcp} | ${result.displayMetrics.lcp} | ${result.displayMetrics.tti} | ${result.displayMetrics.tbt} | ${result.displayMetrics.cls} |\n`;
  });
  
  markdown += `\n## 📈 详细数据\n\n`;
  
  validResults.forEach(result => {
    markdown += `### ${result.name}\n\n`;
    markdown += `- **URL**: ${result.url}\n`;
    markdown += `- **性能评分**: ${result.performanceScore.toFixed(0)}/100\n\n`;
    
    markdown += `| 指标 | 数值 | 评级 |\n`;
    markdown += `|------|------|------|\n`;
    
    Object.entries(result.metrics).forEach(([key, value]) => {
      const standard = RATING_STANDARDS[key];
      let rating = '⚪ 一般';
      
      if (standard) {
        if (value <= standard.good) rating = '🟢 优秀';
        else if (value <= standard.needs) rating = '🟡 需改进';
        else rating = '🔴 差';
      }
      
      const displayName = METRIC_NAMES[key] || key;
      const displayValue = result.displayMetrics[key] || value.toFixed(2);
      markdown += `| ${displayName} | ${displayValue} | ${rating} |\n`;
    });
    
    markdown += `\n---\n\n`;
  });
  
  // 计算平均性能
  const avgScore = validResults.reduce((sum, r) => sum + r.performanceScore, 0) / validResults.length;
  
  markdown += `## 🎯 总结\n\n`;
  markdown += `- **平均性能评分**: ${avgScore.toFixed(0)}/100\n`;
  markdown += `- **测试页面数**: ${validResults.length}\n`;
  markdown += `- **最佳表现页面**: ${validResults.reduce((best, r) => r.performanceScore > best.performanceScore ? r : best).name}\n`;
  markdown += `- **待改进页面**: ${validResults.reduce((worst, r) => r.performanceScore < worst.performanceScore ? r : worst).name}\n\n`;
  
  markdown += `## 📋 评级说明\n\n`;
  markdown += `- 🟢 优秀：达到 Google Core Web Vitals 优秀标准\n`;
  markdown += `- 🟡 需改进：未达到优秀标准，但可接受\n`;
  markdown += `- 🔴 差：需要立即优化\n`;
  markdown += `- ⚪ 一般：无明确标准\n\n`;
  
  // 保存报告
  const reportPath = path.join(CONFIG.outputDir, 'spa-baseline-report.md');
  fs.writeFileSync(reportPath, markdown);
  
  console.log(`✅ 报告已保存：${reportPath}`);
  
  return markdown;
}

async function main() {
  console.log('🚀 开始 SPA 性能测试...\n');
  console.log(`📍 测试基础 URL: ${CONFIG.baseUrl}`);
  console.log(`📁 输出目录：${CONFIG.outputDir}`);
  console.log(`📄 测试页面数：${CONFIG.pages.length}\n`);
  
  // 提示用户启动 Chrome
  console.log('⚠️  请确保 Chrome 已启动并开启调试端口:');
  console.log('   chrome.exe --remote-debugging-port=9222\n');
  
  // 等待用户确认
  console.log('⏳ 等待 5 秒后开始测试...\n');
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  const results = [];
  
  for (const page of CONFIG.pages) {
    const result = await testPage(page);
    results.push(result);
    
    // 页面之间等待 2 秒
    if (page !== CONFIG.pages[CONFIG.pages.length - 1]) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  // 生成报告
  generateReport(results);
  
  console.log('\n✅ 所有测试完成！\n');
}

// 运行测试
main().catch(console.error);
