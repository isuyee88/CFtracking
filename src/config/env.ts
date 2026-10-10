/**
 * @fileoverview 环境变量类型定义
 * @description 定义 Workers 环境变量和绑定的类型
 * @module config/env
 */

export interface Env {
  ENVIRONMENT: 'development' | 'staging' | 'production';
  JWT_SECRET: string;
  /** S2S 共享密钥：affiliate-landing Worker 服务端拉取统计用（wrangler secret put S2S_KEY） */
  S2S_KEY?: string;
  /** 凭据加密主密钥：secret_store AES-256-GCM 加密用（wrangler secret put CRED_MASTER_KEY，随机 32+ 字节） */
  CRED_MASTER_KEY?: string;
  JWT_EXPIRES_IN: string;
  REALTIME_ENABLED: boolean;
  SSE_ENABLED: boolean;
  AI_OPTIMIZATION_ENABLED?: boolean | string;
  AI_OPTIMIZATION_MODEL?: string;
  AI_OPTIMIZATION_GATEWAY_ID?: string;
  CACHE_UPDATE_TOKEN: string;
  /**
   * 认证开关:
   * - on/strict: 启用认证
   * - off/bypass: 关闭认证（绕过认证模块）
   */
  AUTH_MODE?: 'on' | 'off' | 'strict' | 'bypass' | string;
  /** 兼容旧配置，建议使用 AUTH_MODE 代替 */
  BYPASS_AUTH?: string | boolean;
  
  DB: D1Database;
  
  /** 去重专用 KV 存储 */
  UNIQUENESS_KV: KVNamespace;
  /** Optional login rate-limit KV; middleware fails open when not configured. */
  KV?: KVNamespace;

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
  RECAPTCHA_SITE_KEY?: string;
  RECAPTCHA_SECRET_KEY?: string;
  
  CACHE_REFRESH_QUEUE: Queue;
  AI?: {
    run: (
      model: string,
      input: Record<string, unknown>,
      options?: Record<string, unknown>,
    ) => Promise<unknown>;
  };
  
  /** 导出文件存储 R2 */
  EXPORTS_BUCKET?: R2Bucket;
  /** Hosted landing/offer assets R2；未配置时回退 D1（仅开发/迁移期） */
  HOSTED_ASSETS_BUCKET?: R2Bucket;
  /** Explicit opt-in for one bounded orphan reconciliation page per existing cron run. */
  HOSTED_ASSET_ORPHAN_RECONCILIATION_ENABLED?: boolean | string;
  
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
