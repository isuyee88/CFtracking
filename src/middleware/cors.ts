/**
 * @fileoverview CORS 中间件（已废弃）
 * @description 此文件已废弃，请勿使用
 * @module middleware/cors
 *
 * ⚠️ 安全警告：
 * - 原实现使用通配符 '*' 允许所有来源，存在安全风险
 * - 正确的 CORS 配置已在 src/index.ts 中使用 hono/cors 实现
 * - 新配置使用白名单模式，仅允许受信任的域名
 *
 * @deprecated 使用 src/index.ts 中的 hono/cors 白名单配置替代
 * @see src/index.ts:348-379 获取正确的 CORS 配置
 */

import type { Context, Next } from 'hono';

/**
 * @deprecated 此函数已废弃，存在安全漏洞
 * @description 原实现允许所有来源访问（Access-Control-Allow-Origin: *）
 *              这会导致 CSRF 攻击和数据窃取风险
 *
 * ✅ 正确做法：使用 hono/cors 的 origin 函数进行白名单验证
 * 示例代码：
 * ```typescript
 * import { cors } from 'hono/cors';
 *
 * app.use('*', cors({
 *   origin: (origin) => {
 *     const ALLOWED_ORIGINS = [
 *       'https://cf-tracking.suyee88.workers.dev',
 *       'http://localhost:5173',
 *     ];
 *     return ALLOWED_ORIGINS.includes(origin) ? origin : null;
 *   },
 *   credentials: true,
 * }));
 * ```
 */
export async function corsMiddleware(c: Context, next: Next): Promise<void> {
  // ⚠️ 不要使用此函数！这只是一个占位符，防止旧代码报错
  // 实际的 CORS 处理已在 src/index.ts 中正确实现

  console.warn('[DEPRECATED] corsMiddleware 已废弃，请使用 hono/cors 白名单配置');

  // 如果意外调用，返回安全的默认值（拒绝未知来源）
  const origin = c.req.header('Origin');
  const allowedOrigins = [
    'https://cf-tracking.suyee88.workers.dev',
    'https://cf-tracking.pages.dev',
    'http://localhost:12342',
    'http://localhost:5173',
    'http://localhost:3000',
  ];

  if (origin && allowedOrigins.includes(origin)) {
    c.header('Access-Control-Allow-Origin', origin);
    c.header('Access-Control-Allow-Credentials', 'true');
  }

  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (c.req.method === 'OPTIONS') {
    c.status(204);
    return;
  }

  await next();
}
