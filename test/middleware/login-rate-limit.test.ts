/**
 * @fileoverview 登录限流中间件单元测试
 * @description 测试登录限流逻辑
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { loginRateLimitMiddleware, getRateLimitStatus, clearRateLimit } from '@/middleware/login-rate-limit';
import type { Env } from '@/config/env';

describe('Login Rate Limit Middleware', () => {
  let app: Hono<{ Bindings: Env }>;
  let mockKV: any;
  let mockEnv: Env;

  beforeEach(() => {
    // 创建 mock KV
    const kvStore = new Map<string, string>();
    mockKV = {
      get: vi.fn(async (key: string) => kvStore.get(key) || null),
      put: vi.fn(async (key: string, value: string, options?: any) => {
        kvStore.set(key, value);
      }),
      delete: vi.fn(async (key: string) => {
        kvStore.delete(key);
      }),
      getWithMetadata: vi.fn(async (key: string) => ({
        value: kvStore.get(key) || null,
        metadata: { expirationTtl: 900 }
      }))
    };

    mockEnv = {
      KV: mockKV,
      ENVIRONMENT: 'development'
    } as any;

    // 创建测试应用
    app = new Hono<{ Bindings: Env }>();
    app.post('/login', loginRateLimitMiddleware, async (c) => {
      const body = c.req.bodyCache || await c.req.json();

      // 模拟登录逻辑
      if (body.password === 'correct') {
        return c.json({ success: true }, 200);
      } else {
        return c.json({ error: 'Invalid credentials' }, 401);
      }
    });
  });

  describe('Rate Limiting', () => {
    it('should allow first login attempt', async () => {
      const req = new Request('http://localhost/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CF-Connecting-IP': '1.2.3.4'
        },
        body: JSON.stringify({ username: 'admin', password: 'wrong' })
      });

      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(401);
      expect(mockKV.get).toHaveBeenCalled();
    });

    it('should increment counter on failed login', async () => {
      const makeRequest = async () => {
        return app.fetch(new Request('http://localhost/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'CF-Connecting-IP': '1.2.3.4'
          },
          body: JSON.stringify({ username: 'admin', password: 'wrong' })
        }), mockEnv);
      };

      // 第一次失败
      await makeRequest();
      expect(mockKV.put).toHaveBeenCalledWith(
        'login-attempts:admin:1.2.3.4',
        '1',
        expect.any(Object)
      );

      // 第二次失败
      await makeRequest();
      expect(mockKV.put).toHaveBeenCalledWith(
        'login-attempts:admin:1.2.3.4',
        '2',
        expect.any(Object)
      );
    });

    it('should block after 5 failed attempts', async () => {
      const kvStore = new Map<string, string>();

      // 模拟已有4次失败
      kvStore.set('login-attempts:admin:1.2.3.4', '4');

      mockKV.get = vi.fn(async (key: string) => kvStore.get(key) || null);
      mockKV.put = vi.fn(async (key: string, value: string) => {
        kvStore.set(key, value);
      });

      const req = new Request('http://localhost/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CF-Connecting-IP': '1.2.3.4'
        },
        body: JSON.stringify({ username: 'admin', password: 'wrong' })
      });

      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(429);
      const data = await res.json();
      expect(data).toHaveProperty('error');
    });

    it('should clear counter on successful login', async () => {
      const kvStore = new Map<string, string>();

      // 模拟已有2次失败
      kvStore.set('login-attempts:admin:1.2.3.4', '2');

      mockKV.get = vi.fn(async (key: string) => kvStore.get(key) || null);
      mockKV.delete = vi.fn(async (key: string) => {
        kvStore.delete(key);
      });

      const req = new Request('http://localhost/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CF-Connecting-IP': '1.2.3.4'
        },
        body: JSON.stringify({ username: 'admin', password: 'correct' })
      });

      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      expect(mockKV.delete).toHaveBeenCalledWith('login-attempts:admin:1.2.3.4');
    });

    it('should use different counters for different IPs', async () => {
      const makeRequest = async (ip: string) => {
        return app.fetch(new Request('http://localhost/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'CF-Connecting-IP': ip
          },
          body: JSON.stringify({ username: 'admin', password: 'wrong' })
        }), mockEnv);
      };

      await makeRequest('1.2.3.4');
      await makeRequest('5.6.7.8');

      // 应该有两个不同的 key
      expect(mockKV.put).toHaveBeenCalledWith(
        'login-attempts:admin:1.2.3.4',
        '1',
        expect.any(Object)
      );
      expect(mockKV.put).toHaveBeenCalledWith(
        'login-attempts:admin:5.6.7.8',
        '1',
        expect.any(Object)
      );
    });

    it('should handle missing KV gracefully', async () => {
      const envWithoutKV = {
        ENVIRONMENT: 'development'
      } as any;

      const req = new Request('http://localhost/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username: 'admin', password: 'wrong' })
      });

      const res = await app.fetch(req, envWithoutKV);

      // 应该继续处理，不崩溃
      expect(res.status).toBe(401);
    });
  });

  describe('Helper Functions', () => {
    describe('getRateLimitStatus', () => {
      it('should return current attempts', async () => {
        const kvStore = new Map<string, string>();
        kvStore.set('login-attempts:admin:1.2.3.4', '3');

        mockKV.get = vi.fn(async (key: string) => kvStore.get(key) || null);

        const status = await getRateLimitStatus(mockEnv, 'admin', '1.2.3.4');

        expect(status.attempts).toBe(3);
        expect(status.maxAttempts).toBe(5);
        expect(status.locked).toBe(false);
      });

      it('should indicate locked status', async () => {
        const kvStore = new Map<string, string>();
        kvStore.set('login-attempts:admin:1.2.3.4', '5');

        mockKV.get = vi.fn(async (key: string) => kvStore.get(key) || null);

        const status = await getRateLimitStatus(mockEnv, 'admin', '1.2.3.4');

        expect(status.locked).toBe(true);
      });

      it('should handle missing KV', async () => {
        const envWithoutKV = { ENVIRONMENT: 'development' } as any;

        const status = await getRateLimitStatus(envWithoutKV, 'admin', '1.2.3.4');

        expect(status.attempts).toBe(0);
        expect(status.locked).toBe(false);
      });
    });

    describe('clearRateLimit', () => {
      it('should delete rate limit key', async () => {
        await clearRateLimit(mockEnv, 'admin', '1.2.3.4');

        expect(mockKV.delete).toHaveBeenCalledWith('login-attempts:admin:1.2.3.4');
      });

      it('should throw error when KV not available', async () => {
        const envWithoutKV = {} as any;

        await expect(clearRateLimit(envWithoutKV, 'admin', '1.2.3.4'))
          .rejects.toThrow('KV not available');
      });
    });
  });
});
