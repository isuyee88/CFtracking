const { chromium } = require('playwright');

(async () => {
  console.log('=== Playwright + CDP 混合使用测试 ===\n');

  const cdpUrl = 'http://localhost:9223';

  try {
    console.log('Step 1: 通过CDP连接已有浏览器...');
    const browser = await chromium.connectOverCDP(cdpUrl);
    console.log('✅ CDP连接成功!');
    console.log('Browser version:', browser.version());

    console.log('\nStep 2: 获取或创建页面...');
    const contexts = browser.contexts();

    let cfPage = null;
    for (const ctx of contexts) {
      const pages = ctx.pages();
      for (const p of pages) {
        console.log('  已有页面:', p.url());
        if (p.url().includes('cf-tracking')) {
          cfPage = p;
        }
      }
    }

    if (!cfPage) {
      console.log('\n未找到CFTracking页面，创建新页面...');
      const context = await browser.newContext();
      cfPage = await context.newPage();
    }

    console.log('\nStep 3: 导航到CFTracking...');
    await cfPage.goto('https://cf-tracking.suyee88.workers.dev/#/campaigns');
    await cfPage.waitForTimeout(3000);
    console.log('✅ 页面加载完成!');
    console.log('页面标题:', await cfPage.title());
    console.log('当前URL:', cfPage.url());

    console.log('\nStep 4: 使用Playwright高级API截图...');
    await cfPage.screenshot({ path: 'test-mixed-01.png', fullPage: false });
    console.log('📸 截图已保存: test-mixed-01.png');

    console.log('\nStep 5: 测试Campaigns表格...');
    const rows = await cfPage.locator('tbody tr').count();
    console.log('📊 表格行数:', rows);

    console.log('\nStep 6: 获取页面内容...');
    const content = await cfPage.evaluate(() => ({
      title: document.title,
      url: window.location.href,
      h1: document.querySelector('h1')?.innerText || 'N/A',
      tableRows: document.querySelectorAll('tbody tr').length
    }));
    console.log('页面信息:', JSON.stringify(content, null, 2));

    console.log('\nStep 7: 测试双击复制功能...');
    const idElement = await cfPage.locator('text=/ID:/').first();
    if (await idElement.isVisible().catch(() => false)) {
      await idElement.dblclick();
      console.log('✅ 双击ID元素成功');
      await cfPage.waitForTimeout(500);

      const clipboardText = await cfPage.evaluate(() => navigator.clipboard.readText().catch(() => 'N/A'));
      console.log('剪贴板内容:', clipboardText);
    }

    console.log('\nStep 8: 监听网络请求...');
    const apiRequests = [];
    cfPage.on('response', response => {
      if (response.url().includes('/api/')) {
        apiRequests.push({
          url: response.url().replace('https://cf-tracking.suyee88.workers.dev', ''),
          status: response.status()
        });
      }
    });

    await cfPage.reload();
    await cfPage.waitForTimeout(3000);
    console.log('API请求数量:', apiRequests.length);
    apiRequests.forEach(r => console.log(`  ${r.status} ${r.url}`));

    console.log('\nStep 9: 执行性能监控...');
    const perfMetrics = await cfPage.evaluate(() => {
      const timing = performance.getEntriesByType('navigation')[0];
      return {
        domContentLoaded: Math.round(timing.domContentLoadedEventEnd - timing.startTime),
        loadComplete: Math.round(timing.loadEventEnd - timing.startTime),
        domInteractive: Math.round(timing.domInteractive - timing.startTime)
      };
    });
    console.log('性能指标:', perfMetrics);

    console.log('\nStep 10: 截图最终状态...');
    await cfPage.screenshot({ path: 'test-mixed-final.png', fullPage: false });
    console.log('📸 最终截图: test-mixed-final.png');

    console.log('\n=== 混合使用测试完成 ===');
    console.log('\n💡 结论: Playwright + CDP 混合使用成功!');
    console.log('   ✅ 复用已有浏览器会话');
    console.log('   ✅ 使用Playwright高级API操作');
    console.log('   ✅ 结合两者优势进行自动化测试');

    await browser.close();

  } catch (error) {
    console.error('❌ 错误:', error.message);
    console.error(error.stack);
  }
})();
