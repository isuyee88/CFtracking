/**
 * @fileoverview CORS 中间件
 * @description 处理跨域请求
 * @module middleware/cors
 */

import type { Context, Next } from 'hono';

export async function corsMiddleware(c: Context, next: Next): Promise<void> {
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (c.req.method === 'OPTIONS') {
    c.status(204);
    return;
  }

  await next();
}
