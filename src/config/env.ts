/**
 * @fileoverview 环境变量类型定义
 * @description 定义 Workers 环境变量和绑定的类型
 * @module config/env
 */

export interface Env {
  ENVIRONMENT: 'development' | 'staging' | 'production';
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  REALTIME_ENABLED: boolean;
  SSE_ENABLED: boolean;
  CACHE_UPDATE_TOKEN: string;
  /**
   * 认证模式开关:
   * - strict: 强制 JWT 认证（默认）
   * - bypass: 开发/测试环境绕过认证
   */
  AUTH_MODE?: 'strict' | 'bypass' | string;
  /** 兼容旧配置，建议使用 AUTH_MODE 代替 */
  BYPASS_AUTH?: string | boolean;
  
  DB: D1Database;
  
  /** 去重专用 KV 存储 */
  UNIQUENESS_KV: KVNamespace;

  /** Postback幂等性检查专用 KV 存储 (可选，已迁移到D1) */
  POSTBACK_KV?: KVNamespace;

  /** Postback IP白名单 (可选，逗号分隔的CIDR格式) */
  POSTBACK_ALLOWED_IPS?: string;

  /** Taboola HMAC签名密钥 (用于Inbound Postback验证) */
  TABOOLA_CLIENT_SECRET?: string;

  /** Facebook App Secret (用于CAPI签名验证) */
  FACEBOOK_APP_SECRET?: string;
  
  /** Cloudflare Turnstile 配置 */
  TURNSTILE_SITE_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
  
  CACHE_REFRESH_QUEUE: Queue;
  
  /** 导出文件存储 R2 */
  EXPORTS_BUCKET?: R2Bucket;
  
  SESSION_DO: DurableObjectNamespace;
  COUNTER_DO: DurableObjectNamespace;
  QUEUE_DO: DurableObjectNamespace;
  UNIQUE_DO: DurableObjectNamespace;
  USER_PREFERENCE_DO: DurableObjectNamespace;
  CACHE_EVENT_DO: DurableObjectNamespace;
  CACHE_DO: DurableObjectNamespace;
  EVENT_DO: DurableObjectNamespace;
  STATS_DO: DurableObjectNamespace;
  TRACKING_STATS_DO: DurableObjectNamespace;
  
  ASSETS: Fetcher;
  
  /** Cloudflare API 配置 */
  CF_ACCOUNT_ID: string;
  CF_API_TOKEN?: string;
  
  /** 管理员凭据 */
  ADMIN_USERNAME?: string;
  ADMIN_PASSWORD_HASH?: string;
  
  /** 版本元数据绑定 */
  CF_VERSION_METADATA?: {
    id: string;
    tag: string | null;
    timestamp: string;
  };
}

export function getEnv(env: Env): Env {
  return env;
}

export function isProduction(env: Env): boolean {
  return env.ENVIRONMENT === 'production';
}

export function isDevelopment(env: Env): boolean {
  return env.ENVIRONMENT === 'development';
}
