/**
 * @fileoverview Uniqueness 去重服务
 * @description 核心去重逻辑，支持多种去重方法
 * @module services/tracking/uniqueness.service
 *
 * 数据存储架构:
 *   - DO: 唯一性检查和计数器，用于解决KV免费版写入限制
 *   - AE: 主存储，免费3个月，用于时序数据
 *   - D1: 归档存储，永久，用于Dashboard
 *
 * 数据流:
 *   点击请求 → DO(唯一性检查) → AE(主存储) → 每天汇总 → D1(归档)
 *
 * 输入: Campaign 配置、请求信息
 * 输出: 去重检查结果
 * 逻辑交互: 被 click.service.ts 调用
 * 前后端交互: 通过 DO RPC 调用
 */

import { UniquenessDOService, type UniquenessCheckRequest as DOUniquenessCheckRequest, type UniquenessCheckResult as DOUniquenessCheckResult } from '@/handlers/do/uniqueness.do';
import type { Env } from '@/config/env';

/**
 * 去重方法枚举
 */
export type UniquenessMethod =
  | 'ip'           // IP 地址去重
  | 'ip_ua'        // IP + User Agent 组合去重
  | 'cookie'       // Cookie 去重
  | 'fingerprint'   // 浏览器指纹去重
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
  urlParams: URLSearchParams;     // URL 参数
  fingerprint?: string;           // 浏览器指纹（前端计算后传入）
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
 * 使用 Durable Objects 进行唯一性检查，解决 KV 免费版写入限制
 */
export class UniquenessService {
  private doService: UniquenessDOService;

  constructor(env: Env) {
    this.doService = new UniquenessDOService(env);
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

    const doRequest: DOUniquenessCheckRequest = {
      campaignId: request.campaignId,
      method: request.method,
      uniquenessParameter: request.uniquenessParameter,
      ttl: request.ttl,
      ip: request.ip,
      userAgent: request.userAgent,
      visitorId: request.visitorId,
      urlParams: Object.fromEntries(request.urlParams),
      fingerprint: request.fingerprint,
    };

    const doResult: DOUniquenessCheckResult = await this.doService.check(doRequest);

    return {
      isUnique: doResult.isUnique,
      method: doResult.method,
      firstSeenAt: doResult.firstSeenAt,
      existingClickId: doResult.existingClickId,
      visitorId: doResult.visitorId,
      shouldSetCookie: doResult.shouldSetCookie,
    };
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
