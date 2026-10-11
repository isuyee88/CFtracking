/**
 * @fileoverview 公开访问 Landing Page 路由
 * @description 处理公开访问的着陆页（/lp/:slug）
 */

import { Hono } from 'hono';
import { LandingPageRepository } from '@/handlers/d1/landingPage.repo';
import { renderBettingComparisonTemplate } from '@/templates/landing/render-betting-comparison';
import type { Env } from '@/config/env';

const app = new Hono<{ Bindings: Env }>();

/**
 * GET /lp/:slug - 访问公开的 Landing Page
 */
app.get('/lp/:slug', async (c) => {
  const { slug } = c.req.param();
  const repo = new LandingPageRepository(c.env.DB);
  
  try {
    // 1. 查询 Landing Page
    const lp = await repo.findBySlug(slug);
    
    if (!lp) {
      return c.notFound();
    }
    
    // 2. 获取访问者信息
    const visitor_id = c.req.header('cf-connecting-ip') || crypto.randomUUID();
    const country = c.req.header('cf-ipcountry') || 'UNKNOWN';
    const referrer = c.req.header('referer') || '';
    const session_id = crypto.randomUUID();
    
    // 3. 记录访问（异步，不阻塞响应）
    c.executionCtx.waitUntil(
      repo.recordView({
        landingPageId: lp.id,
        visitor_id: visitor_id.substring(0, 64),
        session_id,
        ip_address: visitor_id,
        country,
        referrer
      })
    );
    
    // 4. 渲染 HTML（使用完整模板）
    const html = renderBettingComparisonTemplate(
      lp.content || { header: {}, offers: [], compliance: {} } as any,
      {
        title: lp.seo_title || lp.name,
        description: lp.seo_description || '',
        country: country,
        landingPageId: lp.id
      }
    );
    
    return c.html(html);
  } catch (error) {
    console.error('Error rendering landing page:', error);
    return c.text('Internal Server Error', 500);
  }
});

/**
 * 简单的 HTML 渲染器（Phase 2 临时实现，已废弃）
 * @deprecated 使用 renderBettingComparisonTemplate 替代
 */
function renderLandingPage(lp: any, country: string): string {
  const content = lp.content || {};
  const header = content.header || {};
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${lp.seo_title || lp.name}</title>
  <meta name="description" content="${lp.seo_description || ''}">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    .hero { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 60px 20px; text-align: center; border-radius: 12px; margin-bottom: 40px; }
    .hero h1 { font-size: 2.5rem; margin-bottom: 1rem; }
    .hero p { font-size: 1.2rem; opacity: 0.9; }
    .badges { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-top: 20px; }
    .badge { background: rgba(255,255,255,0.2); padding: 8px 16px; border-radius: 20px; font-size: 0.9rem; }
    .content { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .info { background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .footer { text-align: center; padding: 40px 20px; color: #666; font-size: 0.9rem; }
  </style>
</head>
<body>
  <div class="container">
    <div class="hero">
      <h1>${header.headline || lp.name}</h1>
      ${header.subheadline ? `<p>${header.subheadline}</p>` : ''}
      ${header.badges ? `
        <div class="badges">
          ${header.badges.map((badge: string) => `<span class="badge">${badge}</span>`).join('')}
        </div>
      ` : ''}
    </div>
    
    <div class="content">
      <div class="info">
        <strong>🎯 Landing Page Ready!</strong><br>
        Viewing from: <strong>${country}</strong><br>
        Template: <strong>${lp.template || 'default'}</strong><br>
        Status: <strong>✅ Active</strong>
      </div>
      
      <p>This is a Phase 2 preview. Full content rendering will be implemented in Phase 3.</p>
      
      ${lp.content ? `
        <details style="margin-top: 20px;">
          <summary style="cursor: pointer; font-weight: bold;">📄 Raw Content Data</summary>
          <pre style="background: #f5f5f5; padding: 15px; border-radius: 6px; overflow-x: auto; margin-top: 10px;">${JSON.stringify(lp.content, null, 2)}</pre>
        </details>
      ` : ''}
    </div>
    
    <div class="footer">
      <p>Powered by cf-tracking | Landing Page ID: ${lp.id}</p>
    </div>
  </div>
</body>
</html>`;
}

export default app;
