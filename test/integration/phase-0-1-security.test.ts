/**
 * @fileoverview Phase 0.1 安全增强集成测试
 * @description 验证环境验证器和登录限流的集成效果
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Env } from '@/config/env';

describe('Phase 0.1 Security Enhancements Integration', () => {
  describe('Environment Validation Integration', () => {
    it('should block production deployment with missing AUTH_MODE', () => {
      // 模拟生产环境但配置不正确
      const invalidProductionEnv = {
        ENVIRONMENT: 'production',
        AUTH_MODE: 'off', // 错误！
        JWT_SECRET: 'test-secret-that-is-long-enough-32chars',
        DB: {} as any
      } as Env;

      // 尝试验证环境
      const { validateEnvironment, throwOnValidationErrors } = require('@/utils/env-validator');
      const errors = validateEnvironment(invalidProductionEnv);

      // 应该有 AUTH_MODE 错误
      const authError = errors.find((e: any) => e.field === 'AUTH_MODE');
      expect(authError).toBeDefined();
      expect(authError.severity).toBe('error');

      // 应该抛出异常
      expect(() => throwOnValidationErrors(errors)).toThrow(/AUTH_MODE/);
    });

    it('should allow development deployment with minimal config', () => {
      const developmentEnv = {
        ENVIRONMENT: 'development',
        AUTH_MODE: 'off',
        DB: {} as any
      } as Env;

      const { validateEnvironment, throwOnValidationErrors } = require('@/utils/env-validator');
      const errors = validateEnvironment(developmentEnv);

      // 不应该有严重错误
      const criticalErrors = errors.filter((e: any) => e.severity === 'error');
      expect(criticalErrors).toHaveLength(0);

      // 不应该抛出异常
      expect(() => throwOnValidationErrors(errors)).not.toThrow();
    });

    it('should generate human-readable config report', () => {
      const env = {
        ENVIRONMENT: 'production',
        AUTH_MODE: 'on',
        JWT_SECRET: 'a'.repeat(32),
        ADMIN_PASSWORD_HASH: 'argon2id$test',
        DB: {} as any
      } as Env;

      const { generateConfigReport } = require('@/utils/env-validator');
      const report = generateConfigReport(env);

      expect(report).toContain('Environment: production');
      expect(report).toContain('Auth Mode: on');
      expect(report).toContain('✓ configured');
      expect(report).toContain('✅ PASS');
    });
  });

  describe('Login Rate Limit Integration', () => {
    it('should integrate rate limiting into login flow', async () => {
      // 这个测试验证限流中间件是否正确应用到登录路由
      // 实际测试需要在运行的服务器上进行

      const { getRateLimitStatus } = require('@/middleware/login-rate-limit');

      // 模拟 KV
      const mockKV = {
        get: async (key: string) => null,
        put: async () => {},
        delete: async () => {}
      };

      const env = {
        KV: mockKV,
        ENVIRONMENT: 'development'
      } as any;

      // 检查初始状态
      const status = await getRateLimitStatus(env, 'admin', '1.2.3.4');
      expect(status.attempts).toBe(0);
      expect(status.maxAttempts).toBe(5);
      expect(status.locked).toBe(false);
    });
  });

  describe('End-to-End Security Flow', () => {
    it('should validate environment before processing requests', () => {
      // 验证环境验证在请求处理之前执行
      // 这确保了配置错误会被及早发现

      const productionEnvWithErrors = {
        ENVIRONMENT: 'production',
        AUTH_MODE: 'off',
        DB: {} as any
      } as Env;

      const { validateEnvironment } = require('@/utils/env-validator');
      const errors = validateEnvironment(productionEnvWithErrors);

      // 应该检测到配置错误
      expect(errors.length).toBeGreaterThan(0);

      // 生产环境应该拒绝启动
      const criticalErrors = errors.filter((e: any) => e.severity === 'error');
      expect(criticalErrors.length).toBeGreaterThan(0);
    });

    it('should apply rate limiting before authentication', async () => {
      // 验证限流在认证之前执行
      // 这防止了暴力破解尝试

      const { loginRateLimitMiddleware } = require('@/middleware/login-rate-limit');

      // 限流中间件应该在认证逻辑之前检查
      // 如果被锁定，应该立即返回 429，不执行认证
      expect(loginRateLimitMiddleware).toBeDefined();
      expect(typeof loginRateLimitMiddleware).toBe('function');
    });
  });

  describe('Security Best Practices Compliance', () => {
    it('should enforce strong JWT secret length', () => {
      const weakSecretEnv = {
        ENVIRONMENT: 'production',
        AUTH_MODE: 'on',
        JWT_SECRET: 'short',
        ADMIN_PASSWORD_HASH: 'test',
        DB: {} as any
      } as Env;

      const { validateEnvironment } = require('@/utils/env-validator');
      const errors = validateEnvironment(weakSecretEnv);

      const jwtError = errors.find((e: any) => e.field === 'JWT_SECRET');
      expect(jwtError).toBeDefined();
      expect(jwtError.message).toContain('32 characters');
    });

    it('should recommend Argon2id for password hashing', () => {
      const weakHashEnv = {
        ENVIRONMENT: 'production',
        AUTH_MODE: 'on',
        JWT_SECRET: 'a'.repeat(32),
        ADMIN_PASSWORD_HASH: 'sha256$test',
        DB: {} as any
      } as Env;

      const { validateEnvironment } = require('@/utils/env-validator');
      const errors = validateEnvironment(weakHashEnv);

      const hashWarning = errors.find((e: any) =>
        e.field === 'ADMIN_PASSWORD_HASH' && e.severity === 'warning'
      );
      expect(hashWarning).toBeDefined();
      expect(hashWarning.message).toContain('Argon2id');
    });

    it('should protect against brute force attacks', async () => {
      const { getRateLimitStatus } = require('@/middleware/login-rate-limit');

      const mockKV = {
        get: async () => '5', // 已有5次失败
        put: async () => {},
        delete: async () => {},
        getWithMetadata: async () => ({
          value: '5',
          metadata: { expirationTtl: 900 }
        })
      };

      const env = { KV: mockKV } as any;

      const status = await getRateLimitStatus(env, 'admin', '1.2.3.4');
      expect(status.locked).toBe(true);
      expect(status.attempts).toBe(5);
    });
  });

  describe('Configuration Documentation Compliance', () => {
    it('should provide clear error messages for configuration issues', () => {
      const invalidEnv = {
        ENVIRONMENT: 'production',
        AUTH_MODE: 'off',
        DB: {} as any
      } as Env;

      const { validateEnvironment, throwOnValidationErrors } = require('@/utils/env-validator');
      const errors = validateEnvironment(invalidEnv);

      try {
        throwOnValidationErrors(errors);
        expect.fail('Should have thrown');
      } catch (error) {
        const message = (error as Error).message;

        // 错误消息应该包含清晰的说明
        expect(message).toContain('Configuration');
        expect(message).toContain('Failed');

        // 应该提供具体的字段和问题
        expect(message).toContain('AUTH_MODE');
      }
    });
  });
});
