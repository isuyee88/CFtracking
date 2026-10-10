/**
 * @fileoverview 环境配置验证器
 * @description 验证生产环境配置的完整性和安全性，防止误配置导致安全问题
 * @module utils/env-validator
 */

import type { Env } from '@/config/env';

export interface EnvValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

/**
 * 验证环境配置
 * @param env Workers 环境变量
 * @returns 验证错误列表
 */
export function validateEnvironment(env: Env): EnvValidationError[] {
  const errors: EnvValidationError[] = [];

  // ============================================================
  // 生产环境强制检查
  // ============================================================
  if (env.ENVIRONMENT === 'production') {
    // 1. 认证必须启用
    if (env.AUTH_MODE !== 'on') {
      errors.push({
        field: 'AUTH_MODE',
        message: 'Must be "on" in production environment for security',
        severity: 'error'
      });
    }

    // 2. JWT 密钥必须配置且足够长
    if (!env.JWT_SECRET) {
      errors.push({
        field: 'JWT_SECRET',
        message: 'Required in production environment',
        severity: 'error'
      });
    } else if (env.JWT_SECRET.length < 32) {
      errors.push({
        field: 'JWT_SECRET',
        message: 'Must be at least 32 characters for security',
        severity: 'error'
      });
    }

    // 3. 管理员密码哈希必须存在
    if (!env.ADMIN_PASSWORD_HASH) {
      errors.push({
        field: 'ADMIN_PASSWORD_HASH',
        message: 'Required in production environment',
        severity: 'error'
      });
    }

    // 4. 检查密码哈希算法 (建议使用 Argon2id)
    if (env.ADMIN_PASSWORD_HASH && !env.ADMIN_PASSWORD_HASH.startsWith('argon2id$')) {
      errors.push({
        field: 'ADMIN_PASSWORD_HASH',
        message: 'Should use Argon2id algorithm (format: argon2id$...) for better security. Current hash may use weaker SHA-256.',
        severity: 'warning'
      });
    }

    // 5. 确保账户 ID 已配置
    if (!env.CF_ACCOUNT_ID) {
      errors.push({
        field: 'CF_ACCOUNT_ID',
        message: 'Cloudflare Account ID is required',
        severity: 'warning'
      });
    }
  }

  // ============================================================
  // 开发环境建议检查
  // ============================================================
  if (env.ENVIRONMENT === 'development') {
    // 如果开启认证但没有配置密钥
    if (env.AUTH_MODE === 'on' && !env.JWT_SECRET) {
      errors.push({
        field: 'JWT_SECRET',
        message: 'Required when AUTH_MODE is "on", even in development',
        severity: 'warning'
      });
    }
  }

  // ============================================================
  // 通用检查
  // ============================================================

  // 检查必需的数据库绑定
  if (!env.DB) {
    errors.push({
      field: 'DB',
      message: 'D1 database binding is required',
      severity: 'error'
    });
  }

  return errors;
}

/**
 * 如果有严重错误则抛出异常
 * @param errors 验证错误列表
 * @throws Error 如果存在严重错误
 */
export function throwOnValidationErrors(errors: EnvValidationError[]): void {
  const criticalErrors = errors.filter(e => e.severity === 'error');

  if (criticalErrors.length > 0) {
    const errorMessages = criticalErrors.map(e => `  ❌ ${e.field}: ${e.message}`);
    throw new Error(
      `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `  Environment Configuration Validation Failed\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `${errorMessages.join('\n')}\n\n` +
      `Please fix these critical issues before deploying.\n` +
      `Refer to the deployment documentation for details.\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
    );
  }

  // 输出警告信息
  const warnings = errors.filter(e => e.severity === 'warning');
  if (warnings.length > 0) {
    console.warn('\n⚠️  Environment Configuration Warnings:');
    warnings.forEach(w => console.warn(`  - ${w.field}: ${w.message}`));
    console.warn('');
  }
}

/**
 * 生成环境配置报告
 * @param env Workers 环境变量
 * @returns 配置状态报告
 */
export function generateConfigReport(env: Env): string {
  const errors = validateEnvironment(env);
  const criticalCount = errors.filter(e => e.severity === 'error').length;
  const warningCount = errors.filter(e => e.severity === 'warning').length;

  let status = '✅ PASS';
  if (criticalCount > 0) {
    status = '❌ FAIL';
  } else if (warningCount > 0) {
    status = '⚠️  WARN';
  }

  return [
    `Environment: ${env.ENVIRONMENT || 'unknown'}`,
    `Auth Mode: ${env.AUTH_MODE || 'not set'}`,
    `JWT Secret: ${env.JWT_SECRET ? '✓ configured' : '✗ missing'}`,
    `Password Hash: ${env.ADMIN_PASSWORD_HASH ? '✓ configured' : '✗ missing'}`,
    `Status: ${status} (${criticalCount} errors, ${warningCount} warnings)`
  ].join(' | ');
}
