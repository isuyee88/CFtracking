/**
 * @fileoverview Postback安全中间件
 * @description IP白名单验证 + 请求来源校验，防止伪造Postback请求
 * @module middleware/postback-security
 *
 * 输入:
 *   - HTTP Request对象 (来自Postback接收端点)
 *
 * 输出:
 *   - IP验证结果 (boolean)
 *   - 安全事件日志 (控制台输出)
 *
 * 逻辑交互:
 *   - Postback接收端调用 (未来S2S接收场景)
 *   - 可作为Hono中间件使用
 *   - 支持CIDR范围匹配和精确IP匹配
 *
 * 前后端交互:
 *   - 纯服务端逻辑，无前端交互
 *   - 通过环境变量配置允许的IP列表
 *
 * 安全特性:
 * - 支持IP白名单 (环境变量: POSTBACK_ALLOWED_IPS)
 * - 支持CIDR范围匹配 (如 "192.168.1.0/24")
 * - 自动提取真实IP (CF-Connecting-IP > X-Forwarded-For)
 * - 安全事件审计日志
 */

import type { Env } from '@/config/env';

/**
 * 安全事件接口
 * @description 记录安全相关的事件信息，用于审计和调试
 */
interface SecurityEvent {
  /** 事件时间戳 */
  timestamp: string;
  /** 请求来源IP */
  ip: string;
  /** 事件动作 (BLOCKED/ALLOWED) */
  action: 'BLOCKED' | 'ALLOWED';
  /** 阻止原因 (仅BLOCKED时) */
  reason?: string;
  /** User-Agent头 */
  userAgent?: string;
  /** 请求路径 */
  path?: string;
}

/**
 * Postback安全中间件
 * @description 提供IP白名单验证和安全事件记录功能，
 * 用于保护Postback接收端点免受伪造请求攻击。
 */
export class PostbackSecurityMiddleware {
  /** 解析后的IP白名单 (支持CIDR格式) */
  private allowedIps: Array<{ ip: number; mask: number }>;

  /** Workers环境变量 */
  private env: Env;

  /**
   * 构造函数
   *
   * @param env Workers环境变量 (包含POSTBACK_ALLOWED_IPS配置)
   *
   * @description 初始化时解析环境变量中的IP白名单，
   * 支持格式: "192.168.1.1,10.0.0.0/8,172.16.0.0/12"
   * 空白名单表示允许所有IP访问。
   */
  constructor(env: Env) {
    this.env = env;
    this.allowedIps = this.parseAllowedIps();
  }

  /**
   * 从环境变量解析允许的IP列表
   *
   * @returns 解析后的IP数组 (每个元素包含ip数值和网络掩码)
   *
   * @private 内部方法
   *
   * @description 支持格式:
   * - 精确IP: "192.168.1.1"
   * - CIDR范围: "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"
   * - 多个IP用逗号分隔
   * - 空字符串或未设置表示允许所有IP
   */
  private parseAllowedIps(): Array<{ ip: number; mask: number }> {
    const raw = this.env.POSTBACK_ALLOWED_IPS || '';

    // 空列表表示允许所有IP
    if (!raw.trim()) {
      console.log('[PostbackSecurity] No IP whitelist configured, allowing all IPs');
      return [];
    }

    return raw
      .split(',')
      .map((item: string) => item.trim())
      .filter(Boolean)
      .map((cidr: string) => this.parseCidr(cidr));
  }

  /**
   * 验证IP是否在白名单中
   *
   * @param ip 待验证的IP地址字符串 (IPv4格式)
   * @returns Promise<boolean> true=允许, false=拒绝
   *
   * @example
   * ```typescript
   * const middleware = new PostbackSecurityMiddleware(env);
   * const isAllowed = await middleware.checkIp('192.168.1.100');
   * if (!isAllowed) {
   *   // 拒绝请求
   * }
   * ```
   *
   * PRECONDITIONS:
   * - ip为有效的IPv4地址格式
   *
   * POSTCONDITIONS:
   * - 返回该IP是否在允许范围内
   * - 白名单为空时默认返回true (允许所有)
   *
   * SIDE_EFFECTS:
   * - 可能记录安全事件到控制台
   */
  async checkIp(ip: string): Promise<boolean> {
    // 白名单为空时默认放行
    if (this.allowedIps.length === 0) {
      return true;
    }

    const ipNum = this.ipToNumber(ip);

    for (const entry of this.allowedIps) {
      // 使用位运算检查IP是否在CIDR范围内
      if ((ipNum & entry.mask) === entry.ip) {
        return true;
      }
    }

    return false;
  }

  /**
   * 从请求中提取真实IP
   *
   * @param request HTTP Request对象
   * @returns 提取到的IP地址字符串
   *
   * @description 优先级:
   * 1. CF-Connecting-IP (Cloudflare提供的真实IP，最可信)
   * 2. X-Forwarded-For (代理转发的IP链，取第一个)
   * 3. 返回'unknown' (无法确定时)
   *
   * @example
   * ```typescript
   * const realIp = middleware.extractRealIp(request);
   * // realIp: '203.0.113.50'
   * ```
   */
  extractRealIp(request: Request): string {
    // 优先使用Cloudflare提供的真实IP
    const cfIp = request.headers.get('CF-Connecting-IP');
    if (cfIp) {
      const parts = cfIp.split(',');
      return parts[0]?.trim() ?? 'unknown';
    }

    // 其次使用X-Forwarded-For头
    const xff = request.headers.get('X-Forwarded-For');
    if (xff) {
      const parts = xff.split(',');
      return parts[0]?.trim() ?? 'unknown';
    }

    // 无法确定时返回unknown
    return 'unknown';
  }

  /**
   * 解析CIDR表示法为数值范围
   *
   * @param cidr CIDR字符串 (如 "192.168.1.0/24" 或 "10.0.0.1")
   * @returns { ip: 网络地址数值, mask: 子网掩码数值 }
   *
   * @example
   * ```typescript
   * const result = parseCidr('192.168.1.0/24');
   * // result: { ip: 3232235776, mask: 4294967040 }
   *
   * const result2 = parseCidr('10.0.0.1');
   * // result2: { ip: 167772161, mask: 4294967295 } (32位掩码=精确匹配)
   * ```
   *
   * @private 内部方法
   */
  parseCidr(cidr: string): { ip: number; mask: number } {
    const [ipPart, maskPart] = cidr.split('/');
    if (!ipPart) {
      // 无效的CIDR格式，返回默认值 (允许所有)
      return { ip: 0, mask: 0 };
    }
    const ip = this.ipToNumber(ipPart);

    // 如果没有指定掩码长度，默认32位 (精确匹配)
    const mask =
      maskPart !== undefined
        ? (0xffffffff << (32 - parseInt(maskPart, 10))) >>> 0
        : 0xffffffff;

    return { ip, mask };
  }

  /**
   * 将IPv4字符串转为数字
   *
   * @param ip IPv4地址字符串 (如 "192.168.1.1")
   * @returns 数值表示 (如 3232235777)
   *
   * @private 内部方法
   *
   * @description 使用位运算将四段式IP转为32位整数，
   * 便于后续进行CIDR范围匹配计算。
   */
  private ipToNumber(ip: string): number {
    const parts = ip.split('.').map(Number);
    return (
      ((parts[0] || 0) << 24) |
      ((parts[1] || 0) << 16) |
      ((parts[2] || 0) << 8) |
      (parts[3] || 0)
    );
  }

  /**
   * 记录安全事件到控制台
   *
   * @param event 安全事件对象
   *
   * @description 输出格式化的安全日志，
   * 包含时间戳、IP、动作、原因等信息。
   * BLOCKED事件使用WARN级别，ALLOWED事件使用INFO级别。
   *
   * @example
   * ```typescript
   * middleware.logSecurityEvent({
   *   timestamp: new Date().toISOString(),
   *   ip: '203.0.113.50',
   *   action: 'BLOCKED',
   *   reason: 'IP not in whitelist',
   *   path: '/api/postbacks/receive',
   * });
   * // 控制台输出:
   * // [POSTBACK-SECURITY][WARN] BLOCKED ip=203.0.113.50 reason=IP not in whitelist path=/api/postbacks/receive
   * ```
   */
  logSecurityEvent(event: SecurityEvent): void {
    const level = event.action === 'BLOCKED' ? 'WARN' : 'INFO';

    console.log(
      `[POSTBACK-SECURITY][${level}] ${event.action} ` +
      `ip=${event.ip} ` +
      `reason=${event.reason || 'N/A'} ` +
      `path=${event.path || 'N/A'}`
    );
  }

  /**
   * 验证请求的安全性 (完整流程)
   *
   * @param request HTTP Request对象
   * @returns Promise<{ allowed: boolean; reason?: string }>
   *
   * @description 完整的安全验证流程:
   * 1. 提取真实IP
   * 2. 检查IP白名单
   * 3. 记录安全事件
   * 4. 返回验证结果
   *
   * @example
   * ```typescript
   * // 在Hono路由中使用
   * app.post('/api/postbacks/receive', async (c) => {
   *   const security = new PostbackSecurityMiddleware(c.env);
   *   const { allowed, reason } = await security.validateRequest(c.req.raw);
   *   if (!allowed) {
   *     c.status(403);
   *     return c.json({ error: 'Forbidden', reason });
   *   }
   *   // 继续处理请求...
   * });
   * ```
   */
  async validateRequest(
    request: Request
  ): Promise<{ allowed: boolean; reason?: string }> {
    const ip = this.extractRealIp(request);
    const url = new URL(request.url);
    const path = url.pathname;

    const allowed = await this.checkIp(ip);

    const event: SecurityEvent = {
      timestamp: new Date().toISOString(),
      ip,
      action: allowed ? 'ALLOWED' : 'BLOCKED',
      path,
      userAgent: request.headers.get('User-Agent') || undefined,
    };

    if (!allowed) {
      event.reason = 'IP not in whitelist';
    }

    this.logSecurityEvent(event);

    return {
      allowed,
      reason: event.reason,
    };
  }
}

/**
 * 创建Postback安全中间件实例的工厂函数
 *
 * @param env Workers环境变量
 * @returns PostbackSecurityMiddleware实例
 */
export function createPostbackSecurityMiddleware(
  env: Env
): PostbackSecurityMiddleware {
  return new PostbackSecurityMiddleware(env);
}
