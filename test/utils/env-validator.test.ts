/**
 * @fileoverview 环境配置验证器单元测试
 * @description 测试环境配置验证逻辑
 */

import { describe, it, expect } from 'vitest';
import { validateEnvironment, throwOnValidationErrors, generateConfigReport } from '@/utils/env-validator';
import type { Env } from '@/config/env';

describe('Environment Validator', () => {
  describe('validateEnvironment', () => {
    it('should pass validation for properly configured production environment', () => {
      const env = {
        ENVIRONMENT: 'production',
        AUTH_MODE: 'on',
        JWT_SECRET: 'a'.repeat(32),
        ADMIN_PASSWORD_HASH: 'argon2id$somehash',
        CF_ACCOUNT_ID: 'test-account-id',
        DB: {} as any
      } as Env;

      const errors = validateEnvironment(env);
      const criticalErrors = errors.filter(e => e.severity === 'error');

      expect(criticalErrors).toHaveLength(0);
    });

    it('should fail validation when AUTH_MODE is off in production', () => {
      const env = {
        ENVIRONMENT: 'production',
        AUTH_MODE: 'off',
        JWT_SECRET: 'a'.repeat(32),
        ADMIN_PASSWORD_HASH: 'test',
        DB: {} as any
      } as Env;

      const errors = validateEnvironment(env);
      const authError = errors.find(e => e.field === 'AUTH_MODE');

      expect(authError).toBeDefined();
      expect(authError?.severity).toBe('error');
    });

    it('should fail validation when JWT_SECRET is missing in production', () => {
      const env = {
        ENVIRONMENT: 'production',
        AUTH_MODE: 'on',
        ADMIN_PASSWORD_HASH: 'test',
        DB: {} as any
      } as Env;

      const errors = validateEnvironment(env);
      const jwtError = errors.find(e => e.field === 'JWT_SECRET');

      expect(jwtError).toBeDefined();
      expect(jwtError?.severity).toBe('error');
    });

    it('should fail validation when JWT_SECRET is too short', () => {
      const env = {
        ENVIRONMENT: 'production',
        AUTH_MODE: 'on',
        JWT_SECRET: 'short',
        ADMIN_PASSWORD_HASH: 'test',
        DB: {} as any
      } as Env;

      const errors = validateEnvironment(env);
      const jwtError = errors.find(e => e.field === 'JWT_SECRET');

      expect(jwtError).toBeDefined();
      expect(jwtError?.message).toContain('32 characters');
    });

    it('should fail validation when ADMIN_PASSWORD_HASH is missing in production', () => {
      const env = {
        ENVIRONMENT: 'production',
        AUTH_MODE: 'on',
        JWT_SECRET: 'a'.repeat(32),
        DB: {} as any
      } as Env;

      const errors = validateEnvironment(env);
      const passwordError = errors.find(e => e.field === 'ADMIN_PASSWORD_HASH');

      expect(passwordError).toBeDefined();
      expect(passwordError?.severity).toBe('error');
    });

    it('should warn about non-Argon2id password hash', () => {
      const env = {
        ENVIRONMENT: 'production',
        AUTH_MODE: 'on',
        JWT_SECRET: 'a'.repeat(32),
        ADMIN_PASSWORD_HASH: 'sha256$somehash',
        DB: {} as any
      } as Env;

      const errors = validateEnvironment(env);
      const passwordWarning = errors.find(e =>
        e.field === 'ADMIN_PASSWORD_HASH' && e.severity === 'warning'
      );

      expect(passwordWarning).toBeDefined();
      expect(passwordWarning?.message).toContain('Argon2id');
    });

    it('should pass validation for development environment with minimal config', () => {
      const env = {
        ENVIRONMENT: 'development',
        AUTH_MODE: 'off',
        DB: {} as any
      } as Env;

      const errors = validateEnvironment(env);
      const criticalErrors = errors.filter(e => e.severity === 'error');

      expect(criticalErrors).toHaveLength(0);
    });

    it('should fail validation when DB binding is missing', () => {
      const env = {
        ENVIRONMENT: 'production',
        AUTH_MODE: 'on',
        JWT_SECRET: 'a'.repeat(32),
        ADMIN_PASSWORD_HASH: 'test'
      } as Env;

      const errors = validateEnvironment(env);
      const dbError = errors.find(e => e.field === 'DB');

      expect(dbError).toBeDefined();
      expect(dbError?.severity).toBe('error');
    });
  });

  describe('throwOnValidationErrors', () => {
    it('should throw error when critical errors exist', () => {
      const errors = [
        { field: 'JWT_SECRET', message: 'Required', severity: 'error' as const }
      ];

      expect(() => throwOnValidationErrors(errors)).toThrow();
      expect(() => throwOnValidationErrors(errors)).toThrow(/JWT_SECRET/);
    });

    it('should not throw error when only warnings exist', () => {
      const errors = [
        { field: 'CF_ACCOUNT_ID', message: 'Recommended', severity: 'warning' as const }
      ];

      expect(() => throwOnValidationErrors(errors)).not.toThrow();
    });

    it('should not throw error when no errors exist', () => {
      const errors: any[] = [];

      expect(() => throwOnValidationErrors(errors)).not.toThrow();
    });

    it('should include all error fields in thrown message', () => {
      const errors = [
        { field: 'JWT_SECRET', message: 'Required', severity: 'error' as const },
        { field: 'AUTH_MODE', message: 'Must be on', severity: 'error' as const }
      ];

      try {
        throwOnValidationErrors(errors);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        const message = (error as Error).message;
        expect(message).toContain('JWT_SECRET');
        expect(message).toContain('AUTH_MODE');
      }
    });
  });

  describe('generateConfigReport', () => {
    it('should generate report with all key information', () => {
      const env = {
        ENVIRONMENT: 'production',
        AUTH_MODE: 'on',
        JWT_SECRET: 'test-secret',
        ADMIN_PASSWORD_HASH: 'test-hash',
        DB: {} as any
      } as Env;

      const report = generateConfigReport(env);

      expect(report).toContain('production');
      expect(report).toContain('on');
      expect(report).toContain('configured');
    });

    it('should show PASS status for valid configuration', () => {
      const env = {
        ENVIRONMENT: 'production',
        AUTH_MODE: 'on',
        JWT_SECRET: 'a'.repeat(32),
        ADMIN_PASSWORD_HASH: 'argon2id$test',
        DB: {} as any
      } as Env;

      const report = generateConfigReport(env);

      expect(report).toContain('✅ PASS');
      expect(report).toContain('0 errors');
    });

    it('should show FAIL status for invalid configuration', () => {
      const env = {
        ENVIRONMENT: 'production',
        AUTH_MODE: 'off',
        DB: {} as any
      } as Env;

      const report = generateConfigReport(env);

      expect(report).toContain('❌ FAIL');
    });

    it('should show WARN status when only warnings exist', () => {
      const env = {
        ENVIRONMENT: 'production',
        AUTH_MODE: 'on',
        JWT_SECRET: 'a'.repeat(32),
        ADMIN_PASSWORD_HASH: 'sha256$test',
        DB: {} as any
      } as Env;

      const report = generateConfigReport(env);

      expect(report).toContain('⚠️  WARN');
    });

    it('should indicate missing JWT_SECRET', () => {
      const env = {
        ENVIRONMENT: 'production',
        AUTH_MODE: 'on',
        DB: {} as any
      } as Env;

      const report = generateConfigReport(env);

      expect(report).toContain('✗ missing');
    });
  });
});
