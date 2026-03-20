const agentBrowser = require('./agent-browser');

async function extractAIPageContent() {
  try {
    // Connect to existing browser
    const browser = await agentBrowser.connect('http://localhost:9222');
    console.log('Connected to browser successfully');

    // Get all open pages
    const pages = await browser.getPages();
    console.log(`Found ${pages.length} open pages`);

    // Find the AI studio page
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
      // Get page title
      const title = await aiPage.title();
      console.log(`Page title: ${title}`);

      // Get page content
      const content = await aiPage.evaluate(() => {
        return {
          html: document.documentElement.outerHTML,
          text: document.body.innerText,
          forms: Array.from(document.querySelectorAll('form')).map(form => {
            const inputs = Array.from(form.querySelectorAll('input, select, textarea')).map(input => ({
              name: input.name,
              type: input.type,
              placeholder: input.placeholder
            }));
            return { inputs };
          })
        };
      });

      console.log('Page content extracted successfully');
      console.log('Text content preview:', content.text.substring(0, 500) + '...');
      console.log('Forms found:', content.forms.length);

      // Save content to file
      const fs = require('fs');
      fs.writeFileSync('ai-studio-content.json', JSON.stringify(content, null, 2));
      console.log('Content saved to ai-studio-content.json');
    } else {
      console.log('AI studio page not found');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

extractAIPageContent();
