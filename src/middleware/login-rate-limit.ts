/**
 * @fileoverview 登录限流中间件
 * @description 防止暴力破解登录，限制失败尝试次数
 * @module middleware/login-rate-limit
 */

import type { Context, Next } from 'hono';
import type { Env } from '@/config/env';
import { error } from '@/utils/response';
import { HTTP_STATUS } from '@/config/constants';

/** 限流窗口时间（秒）- 15分钟 */
const RATE_LIMIT_WINDOW = 900;

/** 最大失败尝试次数 */
const MAX_ATTEMPTS = 5;

/** 锁定时间（秒）- 15分钟 */
const LOCKOUT_DURATION = 900;

/**
 * 登录限流中间件
 *
 * 功能:
 * - 跟踪每个 IP + 用户名组合的失败尝试
 * - 5次失败后锁定15分钟
 * - 成功登录后清除计数
 * - 使用 KV 存储限流数据
 *
 * @param c Hono Context
 * @param next 下一个中间件
 */
export async function loginRateLimitMiddleware(
  c: Context<{ Bindings: Env }>,
  next: Next
): Promise<Response | void> {
  // 获取客户端信息
  const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown';

  // 解析请求体获取用户名
  let username = 'anonymous';
  try {
    const body = await c.req.json();
    username = body.username || 'anonymous';
    // 重新设置 body 供后续中间件使用
    c.req.bodyCache = body;
  } catch (e) {
    // 无法解析 body，使用默认值
  }

  // 生成限流 key
  const rateLimitKey = `login-attempts:${username}:${ip}`;

  // 检查 KV 是否可用
  if (!c.env.KV) {
    console.warn('[LoginRateLimit] KV not available, skipping rate limit check');
    return await next();
  }

  // 获取当前尝试次数
  const attemptsData = await c.env.KV.get(rateLimitKey);
  const currentAttempts = parseInt(attemptsData || '0');

  // 检查是否已达到限制
  if (currentAttempts >= MAX_ATTEMPTS) {
    // 获取过期时间
    const metadata = await c.env.KV.getWithMetadata<{ expirationTtl?: number }>(rateLimitKey);
    const expirationTtl = metadata.metadata?.expirationTtl || LOCKOUT_DURATION;
    const resetAt = new Date(Date.now() + expirationTtl * 1000);

    console.warn(
      `[LoginRateLimit] Rate limit exceeded for ${username} from ${ip}. ` +
      `Attempts: ${currentAttempts}/${MAX_ATTEMPTS}. Reset at: ${resetAt.toISOString()}`
    );

    return c.json(
      error(
        `Too many login attempts. Please try again after ${Math.ceil(expirationTtl / 60)} minutes.`,
        'RATE_LIMITED'
      ),
      HTTP_STATUS.TOO_MANY_REQUESTS
    );
  }

  // 记录当前尝试
  if (currentAttempts > 0) {
    console.log(
      `[LoginRateLimit] Login attempt ${currentAttempts + 1}/${MAX_ATTEMPTS} ` +
      `for ${username} from ${ip}`
    );
  }

  // 继续处理登录请求
  await next();

  // 根据登录结果更新限流计数
  const responseStatus = c.res.status;

  if (responseStatus === 401 || responseStatus === 403) {
    // 登录失败，增加计数
    const newAttempts = currentAttempts + 1;
    await c.env.KV.put(
      rateLimitKey,
      newAttempts.toString(),
      { expirationTtl: RATE_LIMIT_WINDOW }
    );

    console.warn(
      `[LoginRateLimit] Failed login attempt ${newAttempts}/${MAX_ATTEMPTS} ` +
      `for ${username} from ${ip}`
    );

    if (newAttempts >= MAX_ATTEMPTS) {
      console.error(
        `[LoginRateLimit] Account locked for ${username} from ${ip}. ` +
        `Lockout duration: ${LOCKOUT_DURATION}s`
      );
    }
  } else if (responseStatus === 200) {
    // 登录成功，清除计数
    if (currentAttempts > 0) {
      await c.env.KV.delete(rateLimitKey);
      console.log(
        `[LoginRateLimit] Successful login for ${username} from ${ip}. ` +
        `Counter reset.`
      );
    }
  }
}

/**
 * 手动清除用户的限流记录（管理员功能）
 *
 * @param env Workers 环境
 * @param username 用户名
 * @param ip IP 地址
 */
export async function clearRateLimit(
  env: Env,
  username: string,
  ip: string
): Promise<void> {
  if (!env.KV) {
    throw new Error('KV not available');
  }

  const key = `login-attempts:${username}:${ip}`;
  await env.KV.delete(key);
  console.log(`[LoginRateLimit] Manually cleared rate limit for ${username} from ${ip}`);
}

/**
 * 获取用户的当前尝试次数
 *
 * @param env Workers 环境
 * @param username 用户名
 * @param ip IP 地址
 * @returns 当前尝试次数
 */
export async function getRateLimitStatus(
  env: Env,
  username: string,
  ip: string
): Promise<{ attempts: number; maxAttempts: number; locked: boolean }> {
  if (!env.KV) {
    return { attempts: 0, maxAttempts: MAX_ATTEMPTS, locked: false };
  }

  const key = `login-attempts:${username}:${ip}`;
  const attemptsData = await env.KV.get(key);
  const attempts = parseInt(attemptsData || '0');

  return {
    attempts,
    maxAttempts: MAX_ATTEMPTS,
    locked: attempts >= MAX_ATTEMPTS
  };
}
