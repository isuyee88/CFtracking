/**
 * 浏览器自动化测试脚本
 * 用途：验证 SSR 页面修复是否成功
 * 测试目标：https://cf-tracking.suyee88.workers.dev
 */

const WebSocket = require('ws');

const TARGET_URL = 'https://cf-tracking.suyee88.workers.dev';
const CDP_PORT = 9222;

class BrowserTester {
  constructor() {
    this.ws = null;
    this.messageId = 0;
    this.results = {
      homepage: null,
      dashboard: null,
      otherPages: [],
      errors: [],
      screenshots: []
    };
  }

  async connect(pageId) {
    return new Promise((resolve, reject) => {
      const wsUrl = `ws://localhost:${CDP_PORT}/devtools/page/${pageId}`;
      this.ws = new WebSocket(wsUrl);
      
      this.ws.on('open', () => {
        console.log('✅ 已连接到浏览器');
        resolve();
      });
      
      this.ws.on('error', (err) => {
        console.error('❌ 连接失败:', err.message);
        reject(err);
      });
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.messageId;
      const message = JSON.stringify({ id, method, params });
      
      const handler = (data) => {
        const response = JSON.parse(data);
        if (response.id === id) {
          this.ws.removeListener('message', handler);
          if (response.error) {
            reject(new Error(response.error.message));
          } else {
            resolve(response.result);
          }
        }
      };
      
      this.ws.on('message', handler);
      this.ws.send(message);
    });
  }

  async navigate(url) {
    console.log(`📍 导航到: ${url}`);
    await this.send('Page.navigate', { url });
    await this.waitForLoad();
  }

  async waitForLoad(timeout = 10000) {
    return new Promise((resolve) => {
      const handler = (data) => {
        const msg = JSON.parse(data);
        if (msg.method === 'Page.loadEventFired') {
          this.ws.removeListener('message', handler);
          setTimeout(resolve, 2000); // 等待 2 秒确保页面完全加载
        }
      };
      this.ws.on('message', handler);
      
      setTimeout(() => {
        this.ws.removeListener('message', handler);
        resolve();
      }, timeout);
    });
  }

  async evaluate(expression) {
    const result = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true
    });
    return result.result.value;
  }

  async takeScreenshot(name) {
    const result = await this.send('Page.captureScreenshot', {
      format: 'png'
    });
    const screenshot = {
      name,
      data: result.data,
      timestamp: new Date().toISOString()
    };
    this.results.screenshots.push(screenshot);
    console.log(`📸 截图: ${name}`);
    return screenshot;
  }

  async testHomepage() {
    console.log('\n🧪 测试 1: 首页');
    console.log('================');
    
    await this.navigate(TARGET_URL + '/');
    
    // 检查 URL
    const url = await this.evaluate('window.location.href');
    console.log(`当前 URL: ${url}`);
    
    // 检查页面内容
    const pageInfo = await this.evaluate(`
      (() => {
        const bodyText = document.body.innerText.trim();
        const bodyHtml = document.body.innerHTML;
        const antComponents = document.querySelectorAll('[class*="ant-"]').length;
        const hasSSRPlaceholder = document.body.innerText.includes('0') && 
                                   document.querySelectorAll('.grid').length > 0;
        
        return {
          textLength: bodyText.length,
          htmlLength: bodyHtml.length,
          hasAntDesign: antComponents > 0,
          antComponentsCount: antComponents,
          hasSSRPlaceholder: hasSSRPlaceholder,
          title: document.title
        };
      })()
    `);
    
    console.log(`页面标题: ${pageInfo.title}`);
    console.log(`文本长度: ${pageInfo.textLength}`);
    console.log(`HTML 长度: ${pageInfo.htmlLength}`);
    console.log(`Ant Design 组件: ${pageInfo.antComponentsCount}`);
    console.log(`有 SSR 简单界面: ${pageInfo.hasSSRPlaceholder ? '❌' : '✅'}`);
    
    await this.takeScreenshot('homepage');
    
    this.results.homepage = {
      url,
      pageInfo,
      passed: !pageInfo.hasSSRPlaceholder && pageInfo.hasAntDesign
    };
    
    return this.results.homepage;
  }

  async testDashboard() {
    console.log('\n🧪 测试 2: Dashboard 页面');
    console.log('========================');
    
    await this.navigate(TARGET_URL + '/dashboard');
    
    // 检查页面内容
    const dashboardInfo = await this.evaluate(`
      (() => {
        const bodyText = document.body.innerText.trim();
        const antComponents = document.querySelectorAll('[class*="ant-"]').length;
        const antCards = document.querySelectorAll('.ant-card').length;
        const antTables = document.querySelectorAll('.ant-table').length;
        const hasSSRPlaceholder = document.body.innerText.includes('0') && 
                                   document.querySelectorAll('.grid').length > 0;
        
        // 检查数据卡片
        const cards = document.querySelectorAll('.ant-statistic');
        const cardData = [];
        cards.forEach(card => {
          const value = card.querySelector('.ant-statistic-content-value')?.textContent?.trim();
          const title = card.querySelector('.ant-statistic-title')?.textContent?.trim();
          cardData.push({ title, value });
        });
        
        // 检查是否有真实数据
        const hasRealData = cardData.some(card => {
          const numValue = parseFloat(card.value?.replace(/,/g, ''));
          return !isNaN(numValue) && numValue !== 0;
        });
        
        // 检查错误信息
        const hasErrors = document.body.innerText.includes('Failed to fetch') ||
                          document.body.innerText.includes('Error');
        
        return {
          textLength: bodyText.length,
          hasAntDesign: antComponents > 0,
          antComponentsCount: antComponents,
          antCardsCount: antCards,
          antTablesCount: antTables,
          hasSSRPlaceholder: hasSSRPlaceholder,
          hasRealData: hasRealData,
          hasErrors: hasErrors,
          cardData: cardData,
          title: document.title
        };
      })()
    `);
    
    console.log(`页面标题: ${dashboardInfo.title}`);
    console.log(`文本长度: ${dashboardInfo.textLength}`);
    console.log(`Ant Design 组件: ${dashboardInfo.antComponentsCount}`);
    console.log(`Ant Design 卡片: ${dashboardInfo.antCardsCount}`);
    console.log(`Ant Design 表格: ${dashboardInfo.antTablesCount}`);
    console.log(`有 SSR 简单界面: ${dashboardInfo.hasSSRPlaceholder ? '❌' : '✅'}`);
    console.log(`有真实数据: ${dashboardInfo.hasRealData ? '✅' : '❌'}`);
    console.log(`有错误信息: ${dashboardInfo.hasErrors ? '❌' : '✅'}`);
    
    if (dashboardInfo.cardData.length > 0) {
      console.log('\n数据卡片:');
      dashboardInfo.cardData.forEach(card => {
        console.log(`  - ${card.title}: ${card.value}`);
      });
    }
    
    await this.takeScreenshot('dashboard');
    
    this.results.dashboard = {
      dashboardInfo,
      passed: !dashboardInfo.hasSSRPlaceholder && 
              dashboardInfo.hasAntDesign && 
              !dashboardInfo.hasErrors
    };
    
    return this.results.dashboard;
  }

  async testOtherPages() {
    console.log('\n🧪 测试 3: 其他页面');
    console.log('==================');
    
    const pages = [
      { path: '/campaigns', name: 'Campaigns' },
      { path: '/offers', name: 'Offers' },
      { path: '/landings', name: 'Landings' },
      { path: '/traffic-sources', name: 'Traffic Sources' },
      { path: '/audit', name: 'Clicks Log' },
      { path: '/conversions', name: 'Conversions Log' }
    ];
    
    for (const page of pages) {
      console.log(`\n测试页面: ${page.name}`);
      console.log('---');
      
      await this.navigate(TARGET_URL + page.path);
      
      const pageInfo = await this.evaluate(`
        (() => {
          const bodyText = document.body.innerText.trim();
          const antComponents = document.querySelectorAll('[class*="ant-"]').length;
          const hasSSRPlaceholder = document.body.innerText.includes('0') && 
                                     document.querySelectorAll('.grid').length > 0;
          const hasContent = bodyText.length > 100;
          
          return {
            textLength: bodyText.length,
            hasAntDesign: antComponents > 0,
            antComponentsCount: antComponents,
            hasSSRPlaceholder: hasSSRPlaceholder,
            hasContent: hasContent,
            title: document.title
          };
        })()
      `);
      
      console.log(`页面标题: ${pageInfo.title}`);
      console.log(`文本长度: ${pageInfo.textLength}`);
      console.log(`Ant Design 组件: ${pageInfo.antComponentsCount}`);
      console.log(`有 SSR 简单界面: ${pageInfo.hasSSRPlaceholder ? '❌' : '✅'}`);
      console.log(`有内容: ${pageInfo.hasContent ? '✅' : '❌'}`);
      
      await this.takeScreenshot(`page-${page.name.toLowerCase().replace(' ', '-')}`);
      
      this.results.otherPages.push({
        name: page.name,
        path: page.path,
        pageInfo,
        passed: !pageInfo.hasSSRPlaceholder && pageInfo.hasAntDesign && pageInfo.hasContent
      });
    }
    
    return this.results.otherPages;
  }

  generateReport() {
    console.log('\n📊 测试报告');
    console.log('============');
    
    const allTests = [
      { name: '首页', result: this.results.homepage },
      { name: 'Dashboard 页面', result: this.results.dashboard },
      ...this.results.otherPages.map(p => ({ name: p.name, result: p }))
    ];
    
    const passed = allTests.filter(t => t.result?.passed).length;
    const total = allTests.length;
    
    console.log(`\n总测试数: ${total}`);
    console.log(`通过: ${passed}`);
    console.log(`失败: ${total - passed}`);
    console.log(`通过率: ${((passed / total) * 100).toFixed(1)}%`);
    
    console.log('\n详细结果:');
    allTests.forEach(test => {
      const status = test.result?.passed ? '✅ 通过' : '❌ 失败';
      console.log(`  ${status} - ${test.name}`);
    });
    
    console.log(`\n📸 截图数量: ${this.results.screenshots.length}`);
    
    return {
      summary: {
        total,
        passed,
        failed: total - passed,
        passRate: ((passed / total) * 100).toFixed(1) + '%'
      },
      details: allTests,
      screenshots: this.results.screenshots
    };
  }

  async close() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

async function main() {
  const pageId = process.argv[2] || '0A8812CFF29DD2CF5A3CF53BDDE42E8A';
  const tester = new BrowserTester();
  
  try {
    await tester.connect(pageId);
    
    await tester.testHomepage();
    await tester.testDashboard();
    await tester.testOtherPages();
    
    const report = tester.generateReport();
    
    console.log('\n✅ 测试完成！');
    
    // 保存结果到文件
    const fs = require('fs');
    fs.writeFileSync('browser-test-results.json', JSON.stringify(report, null, 2));
    console.log('📄 测试结果已保存到: browser-test-results.json');
    
    return report;
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    throw error;
  } finally {
    await tester.close();
  }
}

main().catch(console.error);
