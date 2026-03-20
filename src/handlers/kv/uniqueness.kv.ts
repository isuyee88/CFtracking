/**
 * @fileoverview KV 存储操作 - 去重专用
 * @description 封装 Cloudflare KV 的去重相关操作
 * @module handlers/kv/uniqueness.kv
 * 
 * 输入: campaignId, visitorId, uniquenessKey, TTL
 * 输出: 是否唯一、已存在的时间戳
 * 逻辑交互: 被 uniqueness.service.ts 调用
 */

/**
 * 去重检查结果
 */
export interface UniquenessCheckResult {
  /** 是否唯一（true = 首次访问，false = 重复访问） */
  isUnique: boolean;
  /** 首次访问时间戳（如果已存在） */
  firstSeenAt: string | null;
  /** 关联的 clickId */
  clickId: string | null;
}

/**
 * 去重记录数据
 */
export interface UniquenessRecord {
  visitorId: string;
  clickId: string;
  firstSeenAt: string;
  campaignId: string;
  method: string;
}

/**
 * KV 去重存储操作类
 * 使用 Cloudflare KV 实现高性能去重
 */
export class UniquenessKV {
  constructor(private kv: KVNamespace) {}

  /**
   * 检查是否唯一
   * @param key - 去重键（根据方法不同生成）
   * @returns 检查结果
   */
  async check(key: string): Promise<UniquenessCheckResult> {
    const record = await this.kv.get<UniquenessRecord>(key, 'json');

    if (!record) {
      return {
        isUnique: true,
        firstSeenAt: null,
        clickId: null,
      };
    }

    return {
      isUnique: false,
      firstSeenAt: record.firstSeenAt,
      clickId: record.clickId,
    };
  }

  /**
   * 设置去重记录
   * @param key - 去重键
   * @param record - 去重记录
   * @param ttlSeconds - 过期时间（秒）
   */
  async set(key: string, record: UniquenessRecord, ttlSeconds: number): Promise<void> {
    await this.kv.put(key, JSON.stringify(record), {
      expirationTtl: ttlSeconds,
    });
  }

  /**
   * 删除去重记录
   * @param key - 去重键
   */
  async delete(key: string): Promise<void> {
    await this.kv.delete(key);
  }

  /**
   * 批量检查（用于多种去重方法组合）
   * @param keys - 去重键数组
   * @returns 检查结果数组
   */
  async checkBatch(keys: string[]): Promise<UniquenessCheckResult[]> {
    const promises = keys.map((key) => this.check(key));
    return Promise.all(promises);
  }

  /**
   * 生成 IP 去重键
   */
  static generateIPKey(campaignId: string, ip: string): string {
    return `uniq:${campaignId}:ip:${ip}`;
  }

  /**
   * 生成 Fingerprint 去重键
   */
  static generateFingerprintKey(campaignId: string, fingerprint: string): string {
    return `uniq:${campaignId}:fp:${fingerprint}`;
  }

  /**
   * 生成 Cookie 去重键
   */
  static generateCookieKey(campaignId: string, visitorId: string): string {
    return `uniq:${campaignId}:cookie:${visitorId}`;
  }

  /**
   * 生成参数去重键
   */
  static generateParamKey(campaignId: string, paramName: string, paramValue: string): string {
    return `uniq:${campaignId}:param:${paramName}:${paramValue}`;
  }
}
