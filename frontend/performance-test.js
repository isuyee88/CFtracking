/**
 * File: performance-test.js
 * Purpose: 性能测试脚本，测量 bundle 加载性能
 * Input: 构建产物 dist 目录
 * Output: 性能测试报告
 * Logic: 使用 Puppeteer 测量实际加载性能
 */

import puppeteer from 'puppeteer-core';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 测试配置
const CONFIG = {
  port: 3456,
  scenarios: [
    { name: '首页加载', url: '/', waitUntil: 'networkidle0' },
    { name: 'Dashboard 加载', url: '/#/', waitUntil: 'networkidle0' },
    { name: 'Campaigns 页面', url: '/#/campaigns', waitUntil: 'networkidle0' },
    { name: 'Reports 页面', url: '/#/reports', waitUntil: 'networkidle0' },
  ],
  // 模拟网络条件
  networkConditions: {
    'Fast 3G': {
      download: (1.6 * 1024 * 1024) / 8, // 1.6 Mbps
      upload: (750 * 1024) / 8, // 750 Kbps
      latency: 562.5, // 562.5ms RTT
    },
    'Slow 3G': {
      download: (500 * 1024) / 8, // 500 Kbps
      upload: (500 * 1024) / 8, // 500 Kbps
      latency: 2000, // 2000ms RTT
    },
    '4G': {
      download: (9 * 1024 * 1024) / 8, // 9 Mbps
      upload: (9 * 1024 * 1024) / 8, // 9 Mbps
      latency: 170, // 170ms RTT
    },
  }
};

// 启动静态服务器
async function startServer() {
  const app = express();
  const distPath = path.join(__dirname, 'dist');
  
  app.use(express.static(distPath));
  
  return new Promise((resolve) => {
    const server = app.listen(CONFIG.port, () => {
      console.log(`🚀 测试服务器已启动：http://localhost:${CONFIG.port}`);
      resolve(server);
    });
  });
}

// 分析 bundle 大小
function analyzeBundleSize() {
  const distPath = path.join(__dirname, 'dist', 'assets');
  const files = fs.readdirSync(distPath);
  
  const stats = {
    total: 0,
    js: 0,
    css: 0,
    files: []
  };
  
  files.forEach(file => {
    const filePath = path.join(distPath, file);
    const stat = fs.statSync(filePath);
    
    if (file.endsWith('.js')) {
      stats.js += stat.size;
      stats.files.push({
        name: file,
        size: stat.size,
        type: 'js'
      });
    } else if (file.endsWith('.css')) {
      stats.css += stat.size;
      stats.files.push({
        name: file,
        size: stat.size,
        type: 'css'
      });
    }
    
    stats.total += stat.size;
  });
  
  // 按大小排序
  stats.files.sort((a, b) => b.size - a.size);
  
  return stats;
}

// 运行性能测试
async function runPerformanceTest(browser, scenario, networkType = '4G') {
  const page = await browser.newPage();
  
  // 设置网络条件
  const client = await page.target().createCDPSession();
  await client.send('Network.emulateNetworkConditions', {
    offline: false,
    downloadThroughput: CONFIG.networkConditions[networkType].download,
    uploadThroughput: CONFIG.networkConditions[networkType].upload,
    latency: CONFIG.networkConditions[networkType].latency,
  });
  
  // 启用性能指标收集
  await page.setCacheEnabled(false);
  
  const metrics = {
    name: scenario.name,
    url: scenario.url,
    network: networkType,
    timestamps: {},
    metrics: {}
  };
  
  // 设置性能指标收集
  page.on('request', request => {
    const url = request.url();
    if (url.includes('assets/')) {
      const fileName = url.split('/').pop();
      metrics.timestamps[`request_${fileName}`] = Date.now();
    }
  });
  
  page.on('response', response => {
    const url = response.url();
    if (url.includes('assets/')) {
      const fileName = url.split('/').pop();
      metrics.timestamps[`response_${fileName}`] = Date.now();
    }
  });
  
  // 开始导航
  const startTime = Date.now();
  metrics.timestamps.navigationStart = startTime;
  
  try {
    await page.goto(`http://localhost:${CONFIG.port}${scenario.url}`, {
      waitUntil: scenario.waitUntil,
      timeout: 60000
    });
    
    metrics.timestamps.loadComplete = Date.now();
    metrics.metrics.loadTime = metrics.timestamps.loadComplete - startTime;
    
    // 获取性能指标
    const performanceMetrics = await page.metrics();
    metrics.metrics.JSHeapUsedSize = performanceMetrics.JSHeapUsedSize;
    metrics.metrics.JSHeapTotalSize = performanceMetrics.JSHeapTotalSize;
    metrics.metrics.Documents = performanceMetrics.Documents;
    metrics.metrics.Frames = performanceMetrics.Frames;
    
    // 获取 Lighthouse 风格的核心指标
    const timing = await page.evaluate(() => {
      const perf = performance.getEntriesByType('navigation')[0];
      if (!perf) return null;
      
      return {
        domContentLoaded: perf.domContentLoadedEventEnd - perf.fetchStart,
        fullyLoaded: perf.loadEventEnd - perf.fetchStart,
        firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
        firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0,
        domInteractive: perf.domInteractive - perf.fetchStart,
      };
    });
    
    if (timing) {
      metrics.metrics.domContentLoaded = timing.domContentLoaded;
      metrics.metrics.fullyLoaded = timing.fullyLoaded;
      metrics.metrics.firstPaint = timing.firstPaint;
      metrics.metrics.firstContentfulPaint = timing.firstContentfulPaint;
      metrics.metrics.domInteractive = timing.domInteractive;
    }
    
    // 获取资源加载详情
    const resources = await page.evaluate(() => {
      return performance.getEntriesByType('resource').map(r => ({
        name: r.name.split('/').pop(),
        duration: r.duration,
        transferSize: r.transferSize,
        encodedBodySize: r.encodedBodySize,
        decodedBodySize: r.decodedBodySize,
        initiatorType: r.initiatorType
      }));
    });
    
    metrics.resources = resources.filter(r => r.name && r.name.endsWith('.js'));
    
    console.log(`✅ ${scenario.name} (${networkType}): ${metrics.metrics.loadTime}ms`);
    
  } catch (error) {
    console.error(`❌ ${scenario.name} 失败:`, error.message);
    metrics.error = error.message;
  }
  
  await page.close();
  return metrics;
}

// 生成报告
function generateReport(results, bundleStats) {
  const report = {
    timestamp: new Date().toISOString(),
    bundleAnalysis: {
      totalSize: `${(bundleStats.total / 1024).toFixed(2)} KB`,
      jsSize: `${(bundleStats.js / 1024).toFixed(2)} KB`,
      cssSize: `${(bundleStats.css / 1024).toFixed(2)} KB`,
      top10Files: bundleStats.files.slice(0, 10).map(f => ({
        name: f.name,
        size: `${(f.size / 1024).toFixed(2)} KB`
      }))
    },
    performanceMetrics: results,
    summary: {}
  };
  
  // 计算平均指标
  const allLoadTimes = results
    .filter(r => r.metrics && r.metrics.loadTime)
    .map(r => r.metrics.loadTime);
  
  const avgLoadTime = allLoadTimes.length > 0
    ? allLoadTimes.reduce((a, b) => a + b, 0) / allLoadTimes.length
    : 0;
  
  const avgFCP = results
    .filter(r => r.metrics && r.metrics.firstContentfulPaint)
    .map(r => r.metrics.firstContentfulPaint);
  
  const avgFCPTime = avgFCP.length > 0
    ? avgFCP.reduce((a, b) => a + b, 0) / avgFCP.length
    : 0;
  
  report.summary = {
    averageLoadTime: `${avgLoadTime.toFixed(0)}ms`,
    averageFCP: `${avgFCPTime.toFixed(0)}ms`,
    totalScenarios: results.length,
    successfulScenarios: results.filter(r => !r.error).length,
    bundleSizeGrade: bundleStats.total < 500 * 1024 ? 'A' : bundleStats.total < 1024 * 1024 ? 'B' : 'C'
  };
  
  return report;
}

// 主函数
async function main() {
  console.log('🚀 开始性能测试...\n');
  
  // 分析 bundle 大小
  console.log('📊 分析 Bundle 大小...');
  const bundleStats = analyzeBundleSize();
  console.log(`   总大小：${(bundleStats.total / 1024).toFixed(2)} KB`);
  console.log(`   JS: ${(bundleStats.js / 1024).toFixed(2)} KB`);
  console.log(`   CSS: ${(bundleStats.css / 1024).toFixed(2)} KB\n`);
  
  console.log('📦 Top 10 最大文件:');
  bundleStats.files.slice(0, 10).forEach((file, i) => {
    console.log(`   ${i + 1}. ${file.name}: ${(file.size / 1024).toFixed(2)} KB`);
  });
  console.log('');
  
  // 启动服务器
  const server = await startServer();
  
  // 启动浏览器
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const results = [];
  
  // 运行测试
  console.log('🏃 运行性能测试...\n');
  for (const scenario of CONFIG.scenarios) {
    for (const networkType of ['4G', 'Fast 3G']) {
      const metrics = await runPerformanceTest(browser, scenario, networkType);
      results.push(metrics);
    }
  }
  
  await browser.close();
  server.close();
  
  // 生成报告
  console.log('\n📝 生成报告...\n');
  const report = generateReport(results, bundleStats);
  
  // 保存报告
  const reportPath = path.join(__dirname, 'performance-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log('✅ 性能报告已保存到:', reportPath);
  console.log('\n📊 性能摘要:');
  console.log(`   平均加载时间：${report.summary.averageLoadTime}`);
  console.log(`   平均 FCP: ${report.summary.averageFCP}`);
  console.log(`   Bundle 评级：${report.summary.bundleSizeGrade}`);
  console.log(`   成功场景：${report.summary.successfulScenarios}/${report.summary.totalScenarios}\n`);
  
  // 打印详细报告
  console.log('📋 详细性能数据:');
  results.forEach(result => {
    if (!result.error) {
      console.log(`   ${result.name} (${result.network}):`);
      console.log(`     - 加载时间：${result.metrics.loadTime}ms`);
      console.log(`     - FCP: ${result.metrics.firstContentfulPaint}ms`);
      console.log(`     - DOM 交互：${result.metrics.domInteractive}ms`);
    }
  });
}

// 运行测试
main().catch(console.error);
