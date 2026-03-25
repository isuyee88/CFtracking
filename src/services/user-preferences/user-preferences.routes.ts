/**
 * @fileoverview 用户偏好路由
 * @description 提供用户偏好的 API 接口，代理访问 Durable Object
 * @module services/user-preferences/user-preferences.routes
 * 
 * 输入输出:
 * - POST /stub - 获取用户 Durable Object 信息
 * - GET /preferences/:userId - 获取用户偏好
 * - POST /preferences/:userId - 更新用户偏好
 * - GET /events/:userId - SSE 事件流
 * 
 * 前后端交互:
 * - 前端调用 /api/user-preferences/* 路由
 * - Worker 代理请求到 Durable Object
 */

import { Hono } from 'hono';
import type { Env } from '@/config/env';

const router = new Hono<{ Bindings: Env }>();

/**
 * 获取用户偏好 - 代理到 DO
 */
router.get('/preferences/:userId', async (c) => {
  const userId = c.req.param('userId');
  const deviceId = c.req.header('X-Device-ID');
  
  const id = c.env.USER_PREFERENCE_DO.idFromName(`user-prefs-${userId}`);
  const stub = c.env.USER_PREFERENCE_DO.get(id);
  
  const response = await stub.fetch(
    new Request(`https://do/preferences`, {
      method: 'GET',
      headers: {
        'X-Device-ID': deviceId || '',
      },
    })
  );
  
  const data = await response.json();
  return c.json(data, response.status as any);
});

/**
 * 更新用户偏好 - 代理到 DO
 */
router.post('/preferences/:userId', async (c) => {
  const userId = c.req.param('userId');
  const deviceId = c.req.header('X-Device-ID');
  const body = await c.req.json();
  
  const id = c.env.USER_PREFERENCE_DO.idFromName(`user-prefs-${userId}`);
  const stub = c.env.USER_PREFERENCE_DO.get(id);
  
  const response = await stub.fetch(
    new Request(`https://do/preferences`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-ID': deviceId || '',
      },
      body: JSON.stringify(body),
    })
  );
  
  const data = await response.json();
  return c.json(data, response.status as any);
});

/**
 * SSE 事件流 - 代理到 DO
 */
router.get('/events/:userId', async (c) => {
  const userId = c.req.param('userId');
  const deviceId = c.req.header('X-Device-ID');
  
  const id = c.env.USER_PREFERENCE_DO.idFromName(`user-prefs-${userId}`);
  const stub = c.env.USER_PREFERENCE_DO.get(id);
  
  const response = await stub.fetch(
    new Request(`https://do/events`, {
      method: 'GET',
      headers: {
        'Accept': 'text/event-stream',
        'X-Device-ID': deviceId || '',
      },
    })
  );
  
  return new Response(response.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
});

export { router as userPreferenceRoutes };
