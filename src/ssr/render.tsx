/**
 * @fileoverview SSR 渲染函数
 * @description 服务器端渲染 React 组件，支持动态数据注入
 * @module ssr/render
 * 
 * 输入输出:
 * - Input: pathname, env, request
 * - Output: SSR 渲染的 HTML
 * 
 * 前后端交互:
 * - Worker 调用此函数渲染页面
 * - 注入初始数据到 HTML
 * - 客户端 Hydration 恢复交互
 */

import { renderToString } from 'react-dom/server';
import App from './App';

/**
 * 获取页面初始数据
 */
async function fetchInitialData(pathname: string, env: any): Promise<any> {
  try {
    // 根据页面路径获取不同的数据
    if (pathname === '/' || pathname === '/dashboard') {
      // 从 CacheDurableObject 获取实时数据
      const cacheDOId = env.CACHE_DO.idFromName('global-cache');
      const cacheDO = env.CACHE_DO.get(cacheDOId);
      
      const response = await cacheDO.fetch('http://cache/metadata');
      const metadata = await response.json();
      
      return {
        metadata,
        timestamp: Date.now(),
      };
    }
    
    return {};
  } catch (error) {
    console.error('[SSR] Fetch initial data error:', error);
    return {};
  }
}

/**
 * 生成完整的 HTML
 */
function generateHTML(appHtml: string, initialData: any): string {
  return `
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CF Tracking - Affiliate Tracking System</title>
    <meta name="description" content="Cloudflare Workers based affiliate tracking system with real-time analytics" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: #f5f5f5;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }
      #root {
        min-height: 100vh;
      }
      /* 加载动画 */
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      .loading-spinner {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        background: #f5f5f5;
      }
      .loading-spinner::after {
        content: '';
        width: 40px;
        height: 40px;
        border: 3px solid #e0e0e0;
        border-top-color: #1890ff;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }
    </style>
  </head>
  <body>
    <div id="root">${appHtml}</div>
    <!-- 注入初始数据 -->
    <script>
      window.__INITIAL_DATA__ = ${JSON.stringify(initialData)};
    </script>
    <!-- 客户端 hydration 脚本 -->
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
  `;
}

/**
 * SSR 渲染页面
 */
export async function renderSSRPage(pathname: string, env: any, request: Request): Promise<Response> {
  try {
    console.log('[SSR] Rendering page:', pathname);
    
    // 1. 获取初始数据
    const initialData = await fetchInitialData(pathname, env);
    console.log('[SSR] Initial data:', initialData);
    
    // 2. 渲染 React 组件
    const appHtml = renderToString(
      <App initialData={initialData} location={pathname} />
    );
    console.log('[SSR] App rendered successfully');
    
    // 3. 生成完整 HTML
    const html = generateHTML(appHtml, initialData);
    console.log('[SSR] HTML generated successfully');
    
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300', // 缓存 5 分钟
      },
    });
  } catch (error) {
    console.error('[SSR] Render error:', error);
    
    // 降级：返回 SPA 模式
    const fallbackHtml = `
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CF Tracking</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: #f5f5f5;
      }
      #root {
        min-height: 100vh;
      }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
    `;
    
    return new Response(fallbackHtml, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  }
}
