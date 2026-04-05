/**
 * @fileoverview Blacklist 业务服务
 * @description 处理黑名单相关的业务逻辑，包括批量添加和同步到流量平台
 * @module services/blacklist/blacklist.service
 */

import { BlacklistRepository } from '@/handlers/d1/blacklist.repo';
import { TrafficSourceRepository } from '@/handlers/d1/trafficSource.repo';
import { getD1Connection } from '@/handlers/d1';
import { PropellerAdsAdapter } from '@/services/platform/propellerads';
import type { Env } from '@/config/env';
import type {
  BlacklistEntry,
  BlacklistQueryParams,
  BatchBlacklistDTO,
  BlacklistSyncResult,
  BlacklistCandidate,
  BlacklistType,
  CreateBlacklistDTO,
  UpdateBlacklistDTO,
} from '@/types/blacklist';
import type { TrafficSourceApiConfig } from '@/types/trafficSource';
import { NotFoundError, ValidationError } from '@/middleware/error';

export class BlacklistService {
  private blacklistRepo: BlacklistRepository;
  private trafficSourceRepo: TrafficSourceRepository;
  private env: Env;

  constructor(env: Env) {
    this.env = env;
    const db = getD1Connection(env);
    this.blacklistRepo = new BlacklistRepository(db);
    this.trafficSourceRepo = new TrafficSourceRepository(db);
  }

  private async resolveTrafficSourceOrThrow(trafficSourceId: string) {
    const resolved = await this.trafficSourceRepo.findByIdentifierWithStorageId(trafficSourceId);
    if (!resolved) {
      throw new NotFoundError('Traffic Source not found');
    }

    return resolved;
  }

  /**
   * 创建单个黑名单条目
   */
  async create(data: CreateBlacklistDTO): Promise<BlacklistEntry> {
    const { trafficSourceId, type, value } = data;

    const { storageId } = await this.resolveTrafficSourceOrThrow(trafficSourceId);

    // 验证值格式
    this.validateEntryValue(type, value, data.ipMatchMode, data.uaMatchMode);

    // 检查是否已存在
    const existing = await this.blacklistRepo.findByValue(storageId, type, value);
    if (existing) {
      if (existing.status === 'active') {
        throw new ValidationError(`Entry already exists in blacklist: ${value}`);
      }
      // 如果已存在但已移除，重新激活
      const updated = await this.blacklistRepo.update(existing.id, {
        status: 'active',
        reason: data.reason,
        name: data.name,
        ipMatchMode: data.ipMatchMode,
        uaMatchMode: data.uaMatchMode,
        syncToPlatform: data.syncToPlatform,
      });
      return updated!;
    }

    // 创建新条目
    const entry = await this.blacklistRepo.create({
      trafficSourceId: storageId,
      type,
      value,
      name: data.name,
      reason: data.reason,
      status: 'active',
      synced: false,
      campaignId: data.campaignId,
      ipMatchMode: data.ipMatchMode,
      uaMatchMode: data.uaMatchMode,
      syncToPlatform: data.syncToPlatform,
    });

    return entry;
  }

  /**
   * 更新黑名单条目
   */
  async update(id: string, data: UpdateBlacklistDTO): Promise<BlacklistEntry> {
    const entry = await this.blacklistRepo.findById(id);
    if (!entry) {
      throw new NotFoundError('Blacklist entry not found');
    }

    const updated = await this.blacklistRepo.update(id, data);
    if (!updated) {
      throw new NotFoundError('Blacklist entry not found');
    }

    return updated;
  }

  /**
   * 批量添加黑名单
   */
  async batchAdd(data: BatchBlacklistDTO): Promise<BlacklistEntry[]> {
    const { trafficSourceId, type, items } = data;

    const { storageId } = await this.resolveTrafficSourceOrThrow(trafficSourceId);

    if (!items || items.length === 0) {
      throw new ValidationError('No items to blacklist');
    }

    // 批量创建黑名单条目
    const entries = await this.blacklistRepo.batchCreate(storageId, type, items);

    return entries;
  }

  /**
   * 从报告候选项目中批量添加黑名单
   */
  async batchAddFromCandidates(
    trafficSourceId: string,
    candidates: BlacklistCandidate[],
    reason?: string
  ): Promise<BlacklistEntry[]> {
    const items = candidates.map((candidate) => ({
      value: candidate.value,
      name: candidate.name,
      reason: reason || `ROI: ${candidate.metrics.roi.toFixed(2)}%, Spend: $${candidate.metrics.spend}`,
      campaignId: candidate.campaignId,
    }));

    // 按类型分组处理
    const groupedByType = items.reduce(
      (acc, item, index) => {
        const candidate = candidates[index];
        if (!candidate) return acc;
        const type = candidate.type;
        if (!acc[type]) acc[type] = [];
        acc[type].push(item);
        return acc;
      },
      {} as Record<BlacklistType, typeof items>
    );

    const allEntries: BlacklistEntry[] = [];

    for (const [type, typeItems] of Object.entries(groupedByType)) {
      const entries = await this.batchAdd({
        trafficSourceId,
        type: type as BlacklistType,
        items: typeItems,
      });
      allEntries.push(...entries);
    }

    return allEntries;
  }

  /**
   * 查询黑名单
   */
  async query(params: BlacklistQueryParams): Promise<BlacklistEntry[]> {
    if (!params.trafficSourceId) {
      return this.blacklistRepo.findByParams(params);
    }

    const { storageId } = await this.resolveTrafficSourceOrThrow(params.trafficSourceId);

    return this.blacklistRepo.findByParams({
      ...params,
      trafficSourceId: storageId,
    });
  }

  /**
   * 获取黑名单详情
   */
  async getById(id: string): Promise<BlacklistEntry> {
    const entry = await this.blacklistRepo.findById(id);
    if (!entry) {
      throw new NotFoundError('Blacklist entry not found');
    }
    return entry;
  }

  /**
   * 从黑名单中移除
   */
  async remove(id: string): Promise<BlacklistEntry> {
    const entry = await this.blacklistRepo.remove(id);
    if (!entry) {
      throw new NotFoundError('Blacklist entry not found');
    }

    // 如果已同步到平台，需要从平台移除
    if (entry.synced) {
      await this.removeFromPlatform(entry);
    }

    return entry;
  }

  /**
   * 同步黑名单到流量平台
   */
  async syncToPlatform(trafficSourceId: string): Promise<BlacklistSyncResult> {
    const { trafficSource, storageId } = await this.resolveTrafficSourceOrThrow(trafficSourceId);

    if (!trafficSource.apiConfig) {
      return {
        success: false,
        synced: 0,
        failed: 0,
        errors: [
          {
            entryId: '',
            value: '',
            error: 'API config not set for this traffic source',
          },
        ],
      };
    }

    const apiConfig = JSON.parse(trafficSource.apiConfig) as TrafficSourceApiConfig;
    if (!apiConfig.enabled) {
      return {
        success: false,
        synced: 0,
        failed: 0,
        errors: [
          {
            entryId: '',
            value: '',
            error: 'API is disabled for this traffic source',
          },
        ],
      };
    }

    // 获取未同步的黑名单
    const unsyncedEntries = await this.blacklistRepo.findUnsynced(storageId);

    if (unsyncedEntries.length === 0) {
      return {
        success: true,
        synced: 0,
        failed: 0,
        errors: [],
      };
    }

    // 根据平台类型选择适配器
    const result: BlacklistSyncResult = {
      success: true,
      synced: 0,
      failed: 0,
      errors: [],
    };

    // 目前只支持 PropellerAds
    if (trafficSource.name.toLowerCase().includes('propeller')) {
      const adapter = new PropellerAdsAdapter({
        apiKey: apiConfig.apiKey,
        apiUrl: apiConfig.baseUrl,
      });

      await adapter.initialize();

      for (const entry of unsyncedEntries) {
        try {
          const syncResult = await this.syncEntryToPropellerAds(adapter, entry);

          if (syncResult.success) {
            await this.blacklistRepo.markSynced(entry.id);
            result.synced++;
          } else {
            result.failed++;
            result.errors.push({
              entryId: entry.id,
              value: entry.value,
              error: syncResult.message,
            });
          }
        } catch (error) {
          result.failed++;
          result.errors.push({
            entryId: entry.id,
            value: entry.value,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    } else {
      return {
        success: false,
        synced: 0,
        failed: unsyncedEntries.length,
        errors: [
          {
            entryId: '',
            value: '',
            error: 'Unsupported traffic source platform',
          },
        ],
      };
    }

    result.success = result.failed === 0;
    return result;
  }

  /**
   * 同步单个条目到 PropellerAds
   */
  private async syncEntryToPropellerAds(
    adapter: PropellerAdsAdapter,
    entry: BlacklistEntry
  ): Promise<{ success: boolean; message: string }> {
    // 只支持 Zone 类型的黑名单
    if (entry.type !== 'zone') {
      return {
        success: false,
        message: `Unsupported blacklist type: ${entry.type}`,
      };
    }

    // 需要 campaignId 才能排除 Zone
    if (!entry.campaignId) {
      return {
        success: false,
        message: 'Campaign ID is required to exclude zone',
      };
    }

    const result = await adapter.execute('exclude_zone', {
      campaignId: entry.campaignId,
      zoneId: entry.value,
    });

    return {
      success: result.success,
      message: result.message,
    };
  }

  /**
   * 从平台移除黑名单
   */
  private async removeFromPlatform(entry: BlacklistEntry): Promise<void> {
    const trafficSource = await this.trafficSourceRepo.findById(entry.trafficSourceId);
    if (!trafficSource || !trafficSource.apiConfig) {
      return;
    }

    const apiConfig = JSON.parse(trafficSource.apiConfig) as TrafficSourceApiConfig;
    if (!apiConfig.enabled) {
      return;
    }

    if (trafficSource.name.toLowerCase().includes('propeller') && entry.type === 'zone' && entry.campaignId) {
      const adapter = new PropellerAdsAdapter({
        apiKey: apiConfig.apiKey,
        apiUrl: apiConfig.baseUrl,
      });

      await adapter.initialize();
      await adapter.execute('include_zone', {
        campaignId: entry.campaignId,
        zoneId: entry.value,
      });
    }
  }

  /**
   * 获取黑名单统计
   */
  async getStats(trafficSourceId: string): Promise<{
    total: number;
    active: number;
    synced: number;
    unsynced: number;
  }> {
    const { storageId } = await this.resolveTrafficSourceOrThrow(trafficSourceId);

    return this.blacklistRepo.getStats(storageId);
  }

  /**
   * 验证条目值格式
   */
  private validateEntryValue(
    type: BlacklistType,
    value: string,
    ipMatchMode?: string,
    uaMatchMode?: string
  ): void {
    if (!value || value.trim() === '') {
      throw new ValidationError('Value is required');
    }

    switch (type) {
      case 'ip':
        this.validateIpValue(value, ipMatchMode);
        break;
      case 'user_agent':
        this.validateUaValue(value, uaMatchMode);
        break;
      case 'zone':
      case 'creative':
      case 'publisher':
      case 'sub_id':
      case 'geo':
      case 'device':
        // 这些类型只需要非空值
        break;
      default:
        throw new ValidationError(`Unsupported type: ${type}`);
    }
  }

  /**
   * 验证IP地址格式
   */
  private validateIpValue(value: string, matchMode?: string): void {
    const mode = matchMode || 'exact';

    if (mode === 'cidr') {
      // 验证CIDR格式: x.x.x.x/y
      const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
      if (!cidrRegex.test(value)) {
        throw new ValidationError(`Invalid CIDR format: ${value}. Expected format: x.x.x.x/y`);
      }
      // 验证IP部分
      const [ip] = value.split('/');
      if (ip && !this.isValidIp(ip)) {
        throw new ValidationError(`Invalid IP address in CIDR: ${ip}`);
      }
    } else {
      // 精确匹配模式
      if (!this.isValidIp(value)) {
        throw new ValidationError(`Invalid IP address: ${value}`);
      }
    }
  }

  /**
   * 验证是否是有效的IP地址
   */
  private isValidIp(ip: string): boolean {
    // IPv4验证
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (ipv4Regex.test(ip)) {
      const parts = ip.split('.').map(Number);
      return parts.every(part => part >= 0 && part <= 255);
    }

    // IPv6验证（简化版）
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::$|^::1$|^([0-9a-fA-F]{1,4}:)*[0-9a-fA-F]{1,4}$/;
    if (ipv6Regex.test(ip)) {
      return true;
    }

    return false;
  }

  /**
   * 验证UA值
   */
  private validateUaValue(value: string, matchMode?: string): void {
    if (value.length > 1000) {
      throw new ValidationError('User Agent pattern too long (max 1000 characters)');
    }

    const mode = matchMode || 'exact';
    if (mode !== 'exact' && mode !== 'contains') {
      throw new ValidationError(`Invalid UA match mode: ${mode}. Must be 'exact' or 'contains'`);
    }
  }

  /**
   * 获取报告中的黑名单候选项目
   * 根据统计数据找出表现不佳的 Zone/SubID
   */
  async getBlacklistCandidates(
    trafficSourceId: string,
    options: {
      minSpend?: number;
      maxRoi?: number;
      minClicks?: number;
      dateRange?: string;
    } = {}
  ): Promise<BlacklistCandidate[]> {
    const { minSpend = 10, maxRoi = -50, minClicks = 100 } = options;

    // 从流量统计数据中找出表现不佳的项目
    // 这里简化处理，实际应该查询详细的流量数据
    const db = getD1Connection(this.env);
    const results = await db
      .prepare(
        `
        SELECT
          zone as value,
          SUM(clicks) as clicks,
          SUM(conversions) as conversions,
          SUM(spend) as spend,
          SUM(revenue) as revenue,
          campaignId
        FROM trafficSummary
        WHERE trafficSource = ?
        GROUP BY zone, campaignId
        HAVING spend >= ? AND clicks >= ?
      `
      )
      .bind(trafficSourceId, minSpend, minClicks)
      .all<{
        value: string;
        clicks: number;
        conversions: number;
        spend: number;
        revenue: number;
        campaignId: string;
      }>();

    const candidates: BlacklistCandidate[] = [];

    for (const row of results.results || []) {
      const roi = row.spend > 0 ? ((row.revenue - row.spend) / row.spend) * 100 : 0;

      if (roi <= maxRoi) {
        candidates.push({
          type: 'zone',
          value: row.value,
          name: `Zone ${row.value}`,
          metrics: {
            impressions: 0, // 需要从其他表获取
            clicks: row.clicks,
            conversions: row.conversions,
            spend: row.spend,
            revenue: row.revenue,
            roi,
          },
          campaignId: row.campaignId,
        });
      }
    }

    // 按 ROI 排序
    return candidates.sort((a, b) => a.metrics.roi - b.metrics.roi);
  }
}
