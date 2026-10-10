// Authentication Service
// 认证服务 - 简单的用户登录和 Token 验证

import { Hono } from 'hono';
import { sign, verify } from 'hono/jwt';
import type { Env } from '@/config/env';
import { success, error } from '@/utils/response';
import { ERROR_CODES } from '@/config/constants';

const app = new Hono<{ Bindings: Env }>();

// 默认用户配置（生产环境应该从环境变量读取）
const DEFAULT_USERS = [
  {
    username: 'admin',
    password: 'admin123', // 生产环境应该使用加密密码
    role: 'admin',
  },
  {
    username: 'demo',
    password: 'demo123',
    role: 'user',
  },
];

// 登录接口
app.post('/login', async (c) => {
  try {
    const { username, password } = await c.req.json();

    if (!username || !password) {
      return c.json(
        error('Username and password are required', ERROR_CODES.VALIDATION_ERROR),
        400
      );
    }

    // 查找用户
    const user = DEFAULT_USERS.find(
      (u) => u.username === username && u.password === password
    );

    if (!user) {
      return c.json(
        error('Invalid username or password', ERROR_CODES.UNAUTHORIZED),
        401
      );
    }

    // 生成 JWT Token
    const jwtSecret = c.env.JWT_SECRET || 'default-secret-key-change-in-production';
    const expiresIn = c.env.JWT_EXPIRES_IN || '24h';

    // 计算过期时间（24小时）
    const expirationTime = Math.floor(Date.now() / 1000) + 24 * 60 * 60;

    const payload = {
      sub: user.username,
      role: user.role,
      exp: expirationTime,
      iat: Math.floor(Date.now() / 1000),
    };

    const token = await sign(payload, jwtSecret);

    return c.json(
      success({
        token,
        user: {
          username: user.username,
          role: user.role,
        },
        expiresIn,
      })
    );
  } catch (err: any) {
    console.error('Login error:', err);
    return c.json(
      error('Login failed', ERROR_CODES.INTERNAL_ERROR),
      500
    );
  }
});

// 验证 Token 接口
app.get('/verify', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json(
        error('No token provided', ERROR_CODES.UNAUTHORIZED),
        401
      );
    }

    const token = authHeader.substring(7);
    const jwtSecret = c.env.JWT_SECRET || 'default-secret-key-change-in-production';

    try {
      const payload = await verify(token, jwtSecret);

      return c.json(
        success({
          valid: true,
          user: {
            username: payload.sub,
            role: payload.role,
          },
        })
      );
    } catch (err) {
      return c.json(
        error('Invalid token', ERROR_CODES.UNAUTHORIZED),
        401
      );
    }
  } catch (err: any) {
    console.error('Token verification error:', err);
    return c.json(
      error('Verification failed', ERROR_CODES.INTERNAL_ERROR),
      500
    );
  }
});

// 登出接口（客户端处理，服务器端可以记录日志）
app.post('/logout', async (c) => {
  return c.json(success({ message: 'Logged out successfully' }));
});

// 获取当前用户信息
app.get('/me', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json(
        error('No token provided', ERROR_CODES.UNAUTHORIZED),
        401
      );
    }

    const token = authHeader.substring(7);
    const jwtSecret = c.env.JWT_SECRET || 'default-secret-key-change-in-production';

    try {
      const payload = await verify(token, jwtSecret);

      return c.json(
        success({
          username: payload.sub,
          role: payload.role,
        })
      );
    } catch (err) {
      return c.json(
        error('Invalid token', ERROR_CODES.UNAUTHORIZED),
        401
      );
    }
  } catch (err: any) {
    console.error('Get user error:', err);
    return c.json(
      error('Failed to get user info', ERROR_CODES.INTERNAL_ERROR),
      500
    );
  }
});

export function createAuthRouter() {
  return app;
}

export default app;
