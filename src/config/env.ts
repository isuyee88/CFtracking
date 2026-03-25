/**
 * @fileoverview 环境变量类型定义
 * @description 定义 Workers 环境变量和绑定的类型
 * @module config/env
 */

export interface Env {
  ENVIRONMENT: 'development' | 'staging' | 'production';
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  
  DB: D1Database;
  
  /** 去重专用 KV 存储 */
  UNIQUENESS_KV: KVNamespace;
  
  SESSION_DO: DurableObjectNamespace;
  COUNTER_DO: DurableObjectNamespace;
  QUEUE_DO: DurableObjectNamespace;
  UNIQUE_DO: DurableObjectNamespace;
  USER_PREFERENCE_DO: DurableObjectNamespace;
  CACHE_DO: DurableObjectNamespace;
  TRACKING_STATS_DO: DurableObjectNamespace;
  
  ASSETS: Fetcher;
  
  /** SSR 动态渲染开关 */
  SSE_ENABLED: boolean;
  /** Cloudflare API 配置 */
  CF_ACCOUNT_ID: string;
  CF_API_TOKEN: string;
  /** 版本元数据绑定 */
  CF_VERSION_METADATA: {
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
