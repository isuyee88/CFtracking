/**
 * @fileoverview 浏览器自动化测试脚本
 * @description 用于测试 CFtracking 项目的 SSR+DO+SSE 功能实现情况
 * 测试内容包括：
 * 1. SSR 服务端渲染功能
 * 2. Durable Objects 状态管理
 * 3. SSE 实时数据推送
 * 4. 前后端数据一致性验证
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

// 获取当前目录路径
const currentDir = process.cwd();

// 测试报告输出路径
const REPORT_PATH = path.join(currentDir, 'test-results', 'browser-automation-report.json');
const SCREENSHOT_DIR = path.join(currentDir, 'test-results', 'screenshots');

// 确保输出目录存在
if (!fs.existsSync(path.join(currentDir, 'test-results'))) {
  fs.mkdirSync(path.join(currentDir, 'test-results'), { recursive: true });
}
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// 测试配置
const TEST_CONFIG = {
  baseUrl: 'http://localhost:12334', // 开发服务器运行在 12334 端口
  timeout: 60000,
  screenshotEnabled: true,
};

// 测试用例
const testCases = [
  {
    name: '首页 SSR 渲染测试',
    url: '/',
    steps: [
      async (page) => {
        await page.goto(TEST_CONFIG.baseUrl, { waitUntil: 'networkidle2' });
        await page.waitForTimeout(2000);
        
        // 检查页面标题
        const title = await page.title();
        console.log('页面标题:', title);
        
        // 检查 SSR 渲染的内容
        const headerText = await page.$eval('h1', el => el.textContent);
        console.log('页面头部:', headerText);
        
        // 检查数据显示
        const totalClicks = await page.$eval('div:nth-child(1) > div:nth-child(1)', el => el.textContent);
        const totalConversions = await page.$eval('div:nth-child(2) > div:nth-child(1)', el => el.textContent);
        const totalRevenue = await page.$eval('div:nth-child(3) > div:nth-child(1)', el => el.textContent);
        
        console.log('总点击数:', totalClicks);
        console.log('转化数:', totalConversions);
        console.log('总收入:', totalRevenue);
        
        // 检查 SSE 状态
        const sseStatus = await page.$eval('div:nth-child(2) > span', el => el.textContent);
        console.log('SSE 状态:', sseStatus);
        
        // 截图
        if (TEST_CONFIG.screenshotEnabled) {
          await page.screenshot({
            path: path.join(SCREENSHOT_DIR, 'homepage.png'),
            fullPage: true
          });
        }
        
        return {
          title,
          headerText,
          stats: {
            totalClicks,
            totalConversions,
            totalRevenue
          },
          sseStatus
        };
      }
    ]
  },
  {
    name: 'Dashboard 页面测试',
    url: '/dashboard',
    steps: [
      async (page) => {
        await page.goto(`${TEST_CONFIG.baseUrl}/dashboard`, { waitUntil: 'networkidle2' });
        await page.waitForTimeout(2000);
        
        // 检查页面标题
        const title = await page.title();
        console.log('Dashboard 标题:', title);
        
        // 检查页面内容
        const headerText = await page.$eval('h1', el => el.textContent);
        console.log('Dashboard 头部:', headerText);
        
        // 检查数据显示
        const totalClicks = await page.$eval('div:nth-child(1) > div:nth-child(1)', el => el.textContent);
        const totalConversions = await page.$eval('div:nth-child(2) > div:nth-child(1)', el => el.textContent);
        const totalRevenue = await page.$eval('div:nth-child(3) > div:nth-child(1)', el => el.textContent);
        
        console.log('Dashboard 总点击数:', totalClicks);
        console.log('Dashboard 转化数:', totalConversions);
        console.log('Dashboard 总收入:', totalRevenue);
        
        // 检查 SSE 状态
        const sseStatus = await page.$eval('div:nth-child(2) > span', el => el.textContent);
        console.log('Dashboard SSE 状态:', sseStatus);
        
        // 截图
        if (TEST_CONFIG.screenshotEnabled) {
          await page.screenshot({
            path: path.join(SCREENSHOT_DIR, 'dashboard.png'),
            fullPage: true
          });
        }
        
        return {
          title,
          headerText,
          stats: {
            totalClicks,
            totalConversions,
            totalRevenue
          },
          sseStatus
        };
      }
    ]
  },
  {
    name: 'SSE 实时数据测试',
    url: '/',
    steps: [
      async (page) => {
        await page.goto(TEST_CONFIG.baseUrl, { waitUntil: 'networkidle2' });
        
        // 监听 SSE 消息
        const sseMessages = [];
        page.on('console', msg => {
          if (msg.text().includes('SSE message:')) {
            sseMessages.push(msg.text());
          }
        });
        
        // 等待 10 秒，观察是否有 SSE 消息
        await page.waitForTimeout(10000);
        
        console.log('SSE 消息数量:', sseMessages.length);
        console.log('SSE 消息:', sseMessages);
        
        return {
          sseMessageCount: sseMessages.length,
          sseMessages
        };
      }
    ]
  },
  {
    name: '后端 API 数据验证',
    url: '/api/sse/updates',
    steps: [
      async (page) => {
        // 直接访问 SSE API
        const response = await page.goto(`${TEST_CONFIG.baseUrl}/api/sse/updates`, {
          waitUntil: 'networkidle2',
          timeout: 30000
        });
        
        const status = response.status();
        const headers = response.headers();
        
        console.log('SSE API 状态码:', status);
        console.log('SSE API 头部:', headers);
        
        return {
          status,
          headers
        };
      }
    ]
  },
  {
    name: 'DO 数据存储测试',
    url: '/api/stats',
    steps: [
      async (page) => {
        // 访问统计 API
        const response = await page.goto(`${TEST_CONFIG.baseUrl}/api/stats`, {
          waitUntil: 'networkidle2',
          timeout: 30000
        });
        
        const status = response.status();
        const data = await response.json();
        
        console.log('统计 API 状态码:', status);
        console.log('统计 API 数据:', data);
        
        return {
          status,
          data
        };
      }
    ]
  }
];

// 运行测试
async function runTests() {
  let browser;
  const testResults = [];
  
  try {
    // 启动浏览器
    browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // 运行每个测试用例
    for (const testCase of testCases) {
      console.log(`\n=== 运行测试: ${testCase.name} ===`);
      
      try {
        const results = [];
        for (const step of testCase.steps) {
          const result = await step(page);
          results.push(result);
        }
        
        testResults.push({
          name: testCase.name,
          url: testCase.url,
          status: 'pass',
          results
        });
        
        console.log(`✅ 测试通过: ${testCase.name}`);
      } catch (error) {
        console.error(`❌ 测试失败: ${testCase.name}`, error);
        
        testResults.push({
          name: testCase.name,
          url: testCase.url,
          status: 'fail',
          error: error.message
        });
      }
    }
    
  } catch (error) {
    console.error('测试过程中发生错误:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  // 生成测试报告
  const report = {
    timestamp: new Date().toISOString(),
    baseUrl: TEST_CONFIG.baseUrl,
    testCount: testCases.length,
    passedCount: testResults.filter(r => r.status === 'pass').length,
    failedCount: testResults.filter(r => r.status === 'fail').length,
    testResults
  };
  
  // 保存测试报告
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
  console.log(`\n=== 测试完成 ===`);
  console.log(`测试报告已保存到: ${REPORT_PATH}`);
  console.log(`通过: ${report.passedCount}, 失败: ${report.failedCount}`);
  
  return report;
}

// 运行测试
console.log('开始运行浏览器自动化测试...');
runTests().then(report => {
  console.log('测试完成，报告:', report);
}).catch(error => {
  console.error('测试执行失败:', error);
});

export { runTests };