/**
 * @fileoverview 认证中间件
 * @description 处理 JWT 认证
 * @module middleware/auth
 */

import type { Context, Next } from 'hono';
import { error } from '@/utils/response';
import { HTTP_STATUS, ERROR_CODES } from '@/config/constants';

interface JwtPayload {
  userId: string;
  email: string;
  exp: number;
}

async function verifyJWT(token: string, _secret: string): Promise<JwtPayload | null> {
  try {
    const parts = token.split('.');
  if (parts.length !== 3) return null;
  
  const payload = JSON.parse(atob(parts[1] || ''));
    
    if (payload.exp && payload.exp < Date.now() / 1000) {
      return null;
    }

    return payload;
  } catch {
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

  const payload = await verifyJWT(token, secret);

  if (!payload) {
    c.status(HTTP_STATUS.UNAUTHORIZED);
    c.json(error('Invalid or expired token', ERROR_CODES.UNAUTHORIZED));
    return;
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
