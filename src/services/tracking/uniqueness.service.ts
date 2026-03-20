/**
 * @fileoverview Uniqueness 去重服务
 * @description 核心去重逻辑，支持多种去重方法
 * @module services/tracking/uniqueness.service
 * 
 * 输入: Campaign 配置、请求信息
 * 输出: 去重检查结果
 * 逻辑交互: 被 click.service.ts 调用
 * 前后端交互: 通过 tracking.routes.ts 处理 Cookie
 */

import { UniquenessKV, type UniquenessRecord } from '@/handlers/kv/uniqueness.kv';
import type { Env } from '@/config/env';

/**
 * 去重方法枚举
 */
export type UniquenessMethod = 
  | 'ip'           // IP 地址去重
  | 'cookie'       // Cookie 去重
  | 'fingerprint'  // 浏览器指纹去重
  | 'parameter'    // URL 参数去重
  | 'none';        // 不去重

/**
 * 去重检查请求
 */
export interface UniquenessCheckRequest {
  campaignId: string;
  method: UniquenessMethod;
  uniquenessParameter?: string;  // 参数去重时的参数名
  ttl: number;                   // 去重有效期（秒）
  ip: string;
  userAgent: string;
  visitorId: string;             // Cookie 中的 visitorId 或新生成的
  urlParams: URLSearchParams;    // URL 参数
  fingerprint?: string;          // 浏览器指纹（前端计算后传入）
}

/**
 * 去重检查结果
 */
export interface UniquenessResult {
  isUnique: boolean;
  method: UniquenessMethod;
  firstSeenAt: string | null;
  existingClickId: string | null;
  visitorId: string;             // 用于设置 Cookie
  shouldSetCookie: boolean;      // 是否需要设置 Cookie
}

/**
 * Uniqueness 去重服务类
 */
export class UniquenessService {
  private kv: UniquenessKV;

  constructor(env: Env) {
    this.kv = new UniquenessKV(env.UNIQUENESS_KV);
  }

  /**
   * 执行去重检查
   * @param request - 去重检查请求
   * @param clickId - 当前点击 ID
   * @returns 去重结果
   */
  async check(
    request: UniquenessCheckRequest,
    clickId: string
  ): Promise<UniquenessResult> {
    // 不去重
    if (request.method === 'none') {
      return {
        isUnique: true,
        method: 'none',
        firstSeenAt: null,
        existingClickId: null,
        visitorId: request.visitorId,
        shouldSetCookie: false,
      };
    }

    // 生成去重键
    const key = this.generateKey(request);
    
    // 检查 KV
    const checkResult = await this.kv.check(key);

    if (!checkResult.isUnique) {
      // 已存在，返回重复结果
      return {
        isUnique: false,
        method: request.method,
        firstSeenAt: checkResult.firstSeenAt,
        existingClickId: checkResult.clickId,
        visitorId: request.visitorId,
        shouldSetCookie: false,
      };
    }

    // 首次访问，设置去重记录
    const record: UniquenessRecord = {
      visitorId: request.visitorId,
      clickId,
      firstSeenAt: new Date().toISOString(),
      campaignId: request.campaignId,
      method: request.method,
    };

    await this.kv.set(key, record, request.ttl);

    return {
      isUnique: true,
      method: request.method,
      firstSeenAt: null,
      existingClickId: null,
      visitorId: request.visitorId,
      shouldSetCookie: request.method === 'cookie',
    };
  }

  /**
   * 根据去重方法生成键
   */
  private generateKey(request: UniquenessCheckRequest): string {
    switch (request.method) {
      case 'ip':
        return UniquenessKV.generateIPKey(request.campaignId, request.ip);

      case 'cookie':
        return UniquenessKV.generateCookieKey(request.campaignId, request.visitorId);

      case 'fingerprint':
        // 如果没有指纹，使用 IP + UserAgent 生成简单指纹
        const fp = request.fingerprint || this.generateSimpleFingerprint(request.ip, request.userAgent);
        return UniquenessKV.generateFingerprintKey(request.campaignId, fp);

      case 'parameter':
        if (!request.uniquenessParameter) {
          throw new Error('uniquenessParameter is required for parameter method');
        }
        const paramValue = request.urlParams.get(request.uniquenessParameter);
        if (!paramValue) {
          // 参数不存在时降级为 IP 去重
          return UniquenessKV.generateIPKey(request.campaignId, request.ip);
        }
        return UniquenessKV.generateParamKey(
          request.campaignId,
          request.uniquenessParameter,
          paramValue
        );

      default:
        throw new Error(`Unknown uniqueness method: ${request.method}`);
    }
  }

  /**
   * 生成简单指纹（IP + UserAgent 哈希）
   */
  private generateSimpleFingerprint(ip: string, userAgent: string): string {
    // 使用简单哈希算法
    const str = `${ip}:${userAgent}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * 清除去重记录（用于测试或特殊场景）
   */
  async clear(request: UniquenessCheckRequest): Promise<void> {
    const key = this.generateKey(request);
    await this.kv.delete(key);
  }
}

/**
 * Cookie 名称常量
 */
export const UNIQUENESS_COOKIE_NAME = '_cfu_vid';

/**
 * 生成 Cookie 设置头
 */
export function generateCookieHeader(
  visitorId: string,
  ttlSeconds: number,
  domain?: string
): string {
  const expires = new Date(Date.now() + ttlSeconds * 1000).toUTCString();
  let cookie = `${UNIQUENESS_COOKIE_NAME}=${visitorId}; Path=/; Expires=${expires}; HttpOnly; SameSite=Lax`;
  
  if (domain) {
    cookie += `; Domain=${domain}`;
  }
  
  return cookie;
}

/**
 * 从 Cookie 中解析 visitorId
 */
export function parseVisitorIdFromCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';').map((c) => c.trim());
  for (const cookie of cookies) {
    if (cookie.startsWith(`${UNIQUENESS_COOKIE_NAME}=`)) {
      return cookie.substring(UNIQUENESS_COOKIE_NAME.length + 1);
    }
  }

  return null;
}
