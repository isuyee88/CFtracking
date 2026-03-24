/**
 * @fileoverview 用户偏好路由
 * @description 提供用户偏好的 API 接口和 Durable Object Stub 获取
 * @module services/user-preferences/user-preferences.routes
 * 
 * 输入输出:
 * - POST /stub - 获取用户 Durable Object Stub URL
 * 
 * 前后端交互:
 * - 前端调用 /stub 获取 DO URL
 * - 然后直接通过 DO URL 访问 Durable Object
 */

import { Hono } from 'hono';
import type { Env } from '@/config/env';
import { getUserPreferenceStub } from '@/handlers/do';

const router = new Hono<{ Bindings: Env }>();

/**
 * 获取用户 DO Stub URL
 * 前端调用此接口获取 Durable Object 的访问地址
 */
router.post('/stub', async (c) => {
  const { userId } = await c.req.json();
  
  if (!userId) {
    return c.json({ error: 'userId is required' }, 400);
  }
  
  // 基于用户 ID 生成唯一 DO ID
  const id = c.env.USER_PREFERENCE_DO.idFromName(`user-prefs-${userId}`);
  const stub = c.env.USER_PREFERENCE_DO.get(id);
  
  // 返回 DO 地址（用于直接访问）
  // 注意：这里返回的是一个特殊的 DO URL，Cloudflare 会自动路由到对应的 DO
  return c.json({
    url: `http://do/user-prefs-${userId}`,
    id: id.toString(),
  });
});

export { router as userPreferenceRoutes };
