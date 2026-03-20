const { chromium } = require('playwright');

async function getAIContent() {
  try {
    // 连接到已打开的Edge浏览器（通过远程调试端口）
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    console.log('Connected to browser successfully');

    // 获取所有页面
    const pages = await browser.pages();
    console.log(`Found ${pages.length} pages`);

    // 查找AI studio页面
    let aiPage = null;
    for (const page of pages) {
      const url = await page.url();
      console.log(`Page URL: ${url}`);
      if (url.includes('ai.studio/apps/4f62b346-c1c2-4989-82fb-f0a633c16b4f')) {
        aiPage = page;
        console.log('Found AI studio page');
        break;
      }
    }

    if (aiPage) {
      // 获取页面标题
      const title = await aiPage.title();
      console.log(`Page title: ${title}`);

      // 获取页面内容
      const content = await aiPage.content();
      console.log('Page content length:', content.length);
      console.log('Page content preview:', content.substring(0, 500) + '...');

      // 获取页面文本内容
      const textContent = await aiPage.textContent('body');
      console.log('Text content length:', textContent.length);
      console.log('Text content preview:', textContent.substring(0, 500) + '...');

      // 保存内容到文件
      const fs = require('fs');
      fs.writeFileSync('ai-studio-content.html', content);
      fs.writeFileSync('ai-studio-text.txt', textContent);
      console.log('Content saved to files');

      console.log('\n=== AI Studio Page Analysis ===');
      console.log('Title:', title);
      console.log('URL:', await aiPage.url());
      console.log('Content saved to: ai-studio-content.html and ai-studio-text.txt');
      
    } else {
      console.log('AI studio page not found');
    }

    // 关闭浏览器连接
    await browser.close();
    
  } catch (error) {
    console.error('Error:', error);
  }
}

getAIContent();
