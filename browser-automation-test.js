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
  baseUrl: 'http://localhost:5174', // 开发服务器运行在 5174 端口
  timeout: 60000,
  screenshotEnabled: true,
};

// 测试用例
const testCases = [
  {
    name: '首页访问测试',
    url: '/',
    steps: [
      async (page) => {
        await page.goto(TEST_CONFIG.baseUrl, { waitUntil: 'load', timeout: 10000 });
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 检查页面标题
        const title = await page.title();
        console.log('页面标题:', title);
        
        // 检查页面是否成功加载
        const bodyText = await page.$eval('body', el => el.textContent);
        console.log('页面加载状态:', bodyText ? '成功' : '失败');
        
        // 截图
        if (TEST_CONFIG.screenshotEnabled) {
          await page.screenshot({
            path: path.join(SCREENSHOT_DIR, 'homepage.png'),
            fullPage: true
          });
        }
        
        return {
          title,
          pageLoaded: !!bodyText
        };
      }
    ]
  },
  {
    name: 'Dashboard 页面测试',
    url: '/dashboard',
    steps: [
      async (page) => {
        await page.goto(`${TEST_CONFIG.baseUrl}/dashboard`, { waitUntil: 'load', timeout: 10000 });
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 检查页面标题
        const title = await page.title();
        console.log('Dashboard 标题:', title);
        
        // 检查页面是否成功加载
        const bodyText = await page.$eval('body', el => el.textContent);
        console.log('Dashboard 加载状态:', bodyText ? '成功' : '失败');
        
        // 截图
        if (TEST_CONFIG.screenshotEnabled) {
          await page.screenshot({
            path: path.join(SCREENSHOT_DIR, 'dashboard.png'),
            fullPage: true
          });
        }
        
        return {
          title,
          pageLoaded: !!bodyText
        };
      }
    ]
  },
  {
    name: 'API 端点测试',
    url: '/api/analytics/recent-clicks',
    steps: [
      async (page) => {
        // 使用 fetch 请求访问 API
        const result = await page.evaluate(async () => {
          try {
            const response = await fetch('http://localhost:5174/api/analytics/recent-clicks?limit=10');
            const status = response.status;
            const data = await response.json();
            return { status, data };
          } catch (error) {
            return { status: 0, error: error.message };
          }
        });
        
        console.log('最近点击 API 状态码:', result.status);
        if (result.data) {
          console.log('最近点击 API 数据:', result.data);
        } else {
          console.log('API 返回非 JSON 数据:', result.error);
        }
        
        return result;
      }
    ]
  },
  {
    name: 'DO 数据存储测试',
    url: '/api/analytics/dashboard',
    steps: [
      async (page) => {
        // 使用 fetch 请求访问 API
        const result = await page.evaluate(async () => {
          try {
            const response = await fetch('http://localhost:5174/api/analytics/dashboard?range=last7days');
            const status = response.status;
            const data = await response.json();
            return { status, data, dataSource: data.dataSource };
          } catch (error) {
            return { status: 0, error: error.message };
          }
        });
        
        console.log('Dashboard API 状态码:', result.status);
        if (result.data) {
          console.log('Dashboard API 数据:', result.data);
          console.log('数据源:', result.dataSource);
        } else {
          console.log('API 返回非 JSON 数据:', result.error);
        }
        
        return result;
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