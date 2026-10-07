/**
 * @fileoverview 认证中间件
 * @description 处理 JWT 认证，使用 Web Crypto API 验证签名，带缓存优化
 * @module middleware/auth
 */

import type { Context, Next } from 'hono';
import { error } from '@/utils/response';
import { HTTP_STATUS, ERROR_CODES } from '@/config/constants';
import { JWTCacheManager } from '@/services/cache/jwt-cache';

interface JwtPayload {
  userId: string;
  email: string;
  exp: number;
  iat?: number;
}

// 将 Base64URL 字符串转换为 Uint8Array
function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const base64 = base64Url
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const binaryString = atob(base64 + padding);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// 从密钥字符串生成 CryptoKey
async function getSigningKey(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  
  return await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );
}

// 验证 JWT 签名
async function verifyJWT(token: string, secret: string): Promise<JwtPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;
    
    // 确保 JWT 部分存在
    if (!payloadB64 || !signatureB64 || !headerB64) {
      return null;
    }

    // 解析 payload
    const payloadJson = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
    const payload: JwtPayload = JSON.parse(payloadJson);

    // 检查过期时间
    if (payload.exp && payload.exp < Date.now() / 1000) {
      return null;
    }

    // 验证签名
    const signingKey = await getSigningKey(secret);
    const signature = base64UrlToUint8Array(signatureB64);
    const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);

    const isValid = await crypto.subtle.verify(
      'HMAC',
      signingKey,
      signature,
      data
    );

    if (!isValid) {
      return null;
    }

    return payload;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

export async function authMiddleware(c: Context, next: Next): Promise<void> {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    c.status(HTTP_STATUS.UNAUTHORIZED);
    c.json(error('Unauthorized', ERROR_CODES.UNAUTHORIZED));
    return;
  }

  const token = authHeader.substring(7);
  const secret = c.env.JWT_SECRET;

  // 先尝试从缓存获取
  const cache = JWTCacheManager.getInstance();
  let payload = cache.get(token);

  if (payload) {
    // 缓存命中，直接使用
    c.set('user', payload);
    await next();
    return;
  }

  // 缓存未命中，进行完整验证
  payload = await verifyJWT(token, secret);

  if (!payload) {
    c.status(HTTP_STATUS.UNAUTHORIZED);
    c.json(error('Invalid or expired token', ERROR_CODES.UNAUTHORIZED));
    return;
  }

  // 缓存验证结果
  if (payload.exp) {
    cache.set(token, payload, payload.exp);
  }

  c.set('user', payload);
  await next();
}

export function optionalAuth(c: Context, next: Next): Promise<void> {
  const authHeader = c.req.header('Authorization');

  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authMiddleware(c, next);
  }

  return next();
}

/**
 * Worker 间共享密钥比较（恒定时间，避免逐字符短路泄漏前缀信息）
 */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * S2S 鉴权中间件：校验 X-S2S-Key 与 env.S2S_KEY
 * 为什么不用 JWT：调用方是 affiliate-landing Worker（服务端），无用户会话；
 * 为什么未配置即拒绝：密钥未部署时安全默认关闭，避免裸奔端点
 */
export async function s2sMiddleware(c: Context, next: Next): Promise<void | Response> {
  const expected = c.env.S2S_KEY;
  const provided = c.req.header('X-S2S-Key');

  if (!expected || !provided || !safeEqual(provided, expected)) {
    // 为什么用 c.json(body, status) 显式式：c.status()+c.json() 两段式在 Hono 响应
    // 重建阶段会触发 Workers Response 构造限制（实证 500），返回式为 repo 验证过的模式
    return c.json(error('Invalid S2S key', ERROR_CODES.UNAUTHORIZED), HTTP_STATUS.UNAUTHORIZED);
  }

  await next();
}
