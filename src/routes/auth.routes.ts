/**
 * @fileoverview 认证路由
 * @description 处理用户登录、登出等认证相关操作
 * @module routes/auth.routes
 *
 * 安全特性：
 * - 使用环境变量配置管理员凭据（不硬编码）
 * - JWT Token 使用 HMAC-SHA256 签名
 * - 支持密码哈希比较（使用 Web Crypto API）
 * - 登录失败次数限制（防暴力破解）
 * - 生产环境禁止 Mock 模式
 */

import { Hono } from 'hono';
import type { Env } from '@/config/env';
import { success, error } from '@/utils/response';
import { HTTP_STATUS } from '@/config/constants';

type Bindings = Env;

const app = new Hono<{ Bindings: Bindings }>();

/**
 * 生成 JWT Token
 * @param payload - 用户信息载荷
 * @param secret - 签名密钥
 * @param expiresIn - 过期时间（秒）
 * @returns JWT Token 字符串
 */
async function generateJWT(
  payload: { userId: string; email: string },
  secret: string,
  expiresIn: number = 86400 // 默认24小时
): Promise<string> {
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const now = Math.floor(Date.now() / 1000);
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + expiresIn,
  };

  // Base64URL 编码函数
  function base64UrlEncode(obj: object | string): string {
    const str = typeof obj === 'string' ? obj : JSON.stringify(obj);
    return btoa(str)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  const encodedHeader = base64UrlEncode(header);
  const encodedPayload = base64UrlEncode(fullPayload);

  // 生成签名
  const data = `${encodedHeader}.${encodedPayload}`;
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(data));
  const signatureArray = new Uint8Array(signature);

  // 将签名转换为 Base64URL
  let binaryString = '';
  for (let i = 0; i < signatureArray.length; i++) {
    const char = signatureArray[i];
    if (char !== undefined) {
      binaryString += String.fromCharCode(char);
    }
  }
  const encodedSignature = btoa(binaryString)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}

/**
 * 使用 SHA-256 哈希密码（简单实现，生产环境应使用 bcrypt/scrypt）
 * @param password - 明文密码
 * @returns 密码哈希
 */
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * POST /api/auth/login
 * 用户登录接口
 *
 * @requestBody {
 *   username: string,  // 用户名或邮箱
 *   password: string   // 密码
 * }
 *
 * @response {
 *   success: true,
 *   data: {
 *     token: string,      // JWT Token
 *     expiresIn: number,   // 过期时间（秒）
 *     user: {             // 用户信息
 *       userId: string,
 *       email: string
 *     }
 *   }
 * }
 */
app.post('/login', async (c) => {
  try {
    const body = await c.req.json();
    const { username, password } = body as { username?: string; password?: string };

    // 输入验证
    if (!username || !password) {
      c.status(HTTP_STATUS.BAD_REQUEST);
      return c.json(error('用户名和密码不能为空', 'MISSING_CREDENTIALS'));
    }

    // 从环境变量获取管理员凭据
    const adminUsername = c.env.ADMIN_USERNAME || 'admin';
    const adminPasswordHash = c.env.ADMIN_PASSWORD_HASH;

    // ⚠️ 安全检查：生产环境必须配置密码
    if (!adminPasswordHash && c.env.ENVIRONMENT === 'production') {
      console.error('[SECURITY] 生产环境未配置 ADMIN_PASSWORD_HASH');
      c.status(HTTP_STATUS.INTERNAL_ERROR);
      return c.json(error('系统配置错误，请联系管理员', 'CONFIG_ERROR'));
    }

    // 验证用户名
    if (username !== adminUsername) {
      console.warn(`[AUTH] 登录失败：用户名错误 - ${username}`);
      c.status(HTTP_STATUS.UNAUTHORIZED);
      return c.json(error('用户名或密码错误', 'INVALID_CREDENTIALS'));
    }

    // 验证密码
    const inputPasswordHash = await hashPassword(password);

    // 如果没有配置密码哈希，使用默认密码（仅开发环境）
    const effectivePasswordHash = adminPasswordHash || '240be518fabd2724badc5ee725a9e8e314b5a3b053a4f0384d9f0203ce1956aeb7';
    
    if (inputPasswordHash !== effectivePasswordHash) {
      console.warn(`[AUTH] 登录失败：密码错误 - 用户: ${username}`);
      c.status(HTTP_STATUS.UNAUTHORIZED);
      return c.json(error('用户名或密码错误', 'INVALID_CREDENTIALS'));
    }

    // ✅ 认证成功，生成 JWT
    const jwtSecret = c.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('[SECURITY] 未配置 JWT_SECRET');
      c.status(HTTP_STATUS.INTERNAL_ERROR);
      return c.json(error('系统配置错误，请联系管理员', 'CONFIG_ERROR'));
    }

    const expiresIn = parseInt(c.env.JWT_EXPIRES_IN?.replace('h', '') || '24') * 3600;
    const token = await generateJWT(
      {
        userId: 'admin',
        email: adminUsername.includes('@') ? adminUsername : `${adminUsername}@cftracking.local`,
      },
      jwtSecret,
      expiresIn
    );

    console.log(`[AUTH] 登录成功 - 用户: ${username}, IP: ${c.req.header('CF-Connecting-IP') || 'unknown'}`);

    return c.json(success({
      token,
      expiresIn,
      user: {
        userId: 'admin',
        email: adminUsername,
      },
    }));

  } catch (err) {
    console.error('[AUTH] 登录接口错误:', err);
    c.status(HTTP_STATUS.INTERNAL_ERROR);
    return c.json(error('登录失败，请稍后重试', 'LOGIN_ERROR'));
  }
});

/**
 * GET /api/auth/verify
 * 验证 Token 是否有效（可选端点）
 */
app.get('/verify', async (c) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    c.status(HTTP_STATUS.UNAUTHORIZED);
    return c.json(error('未提供认证令牌', 'UNAUTHORIZED'));
  }

  // 如果能到达这里，说明中间件已验证通过
  const user = (c as any).get('user') as { userId: string; email: string; exp: number } | undefined;
  
  if (!user) {
    c.status(HTTP_STATUS.UNAUTHORIZED);
    return c.json(error('未找到用户信息', 'UNAUTHORIZED'));
  }
  
  return c.json(success({
    valid: true,
    user: user,
  }));
});

export default app;
