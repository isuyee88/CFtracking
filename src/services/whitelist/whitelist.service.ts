/**
 * @fileoverview Whitelist 业务服务
 * @description 处理白名单相关的业务逻辑，包括批量添加和同步到流量平台
 * @module services/whitelist/whitelist.service
 */

import { WhitelistRepository } from '@/handlers/d1/whitelist.repo';
import { TrafficSourceRepository } from '@/handlers/d1/trafficSource.repo';
import { getD1Connection } from '@/handlers/d1';
import { PropellerAdsAdapter } from '@/services/platform/propellerads';
import type { Env } from '@/config/env';
import type {
  WhitelistEntry,
  WhitelistQueryParams,
  BatchWhitelistDTO,
  WhitelistSyncResult,
  WhitelistCandidate,
  WhitelistType,
  CreateWhitelistDTO,
  UpdateWhitelistDTO,
} from '@/types/whitelist';
import type { TrafficSourceApiConfig } from '@/types/trafficSource';
import { NotFoundError, ValidationError } from '@/middleware/error';
import { FIELD_MAX_LENGTH } from '@/config/field-constraints';
import { normalizeOptionalString, normalizeRequiredString } from '@/utils/fieldLength';

export class WhitelistService {
  private whitelistRepo: WhitelistRepository;
  private trafficSourceRepo: TrafficSourceRepository;
  private env: Env;

  constructor(env: Env) {
    this.env = env;
    const db = getD1Connection(env);
    this.whitelistRepo = new WhitelistRepository(db);
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
   * 创建单个白名单条目
   */
  async create(data: CreateWhitelistDTO): Promise<WhitelistEntry> {
    const normalizedData = this.normalizeCreateInput(data);
    const { trafficSourceId, type, value } = normalizedData;

    const { storageId } = await this.resolveTrafficSourceOrThrow(trafficSourceId);

    // 验证值格式
    this.validateEntryValue(type, value, normalizedData.ipMatchMode, normalizedData.uaMatchMode);

    // 检查是否已存在
    const existing = await this.whitelistRepo.findByValue(storageId, type, value);
    if (existing) {
      if (existing.status === 'active') {
        throw new ValidationError(`Entry already exists in whitelist: ${value}`);
      }
      // 如果已存在但已移除，重新激活
      const updated = await this.whitelistRepo.update(existing.id, {
        status: 'active',
        reason: normalizedData.reason,
        name: normalizedData.name,
        ipMatchMode: normalizedData.ipMatchMode,
        uaMatchMode: normalizedData.uaMatchMode,
        syncToPlatform: normalizedData.syncToPlatform,
      });
      return updated!;
    }

    // 创建新条目
    const entry = await this.whitelistRepo.create({
      trafficSourceId: storageId,
      type,
      value,
      name: normalizedData.name,
      reason: normalizedData.reason,
      status: 'active',
      synced: false,
      campaignId: normalizedData.campaignId,
      ipMatchMode: normalizedData.ipMatchMode,
      uaMatchMode: normalizedData.uaMatchMode,
      syncToPlatform: normalizedData.syncToPlatform,
    });

    return entry;
  }

  /**
   * 更新白名单条目
   */
  async update(id: string, data: UpdateWhitelistDTO): Promise<WhitelistEntry> {
    const normalizedData = this.normalizeUpdateInput(data);
    const entry = await this.whitelistRepo.findById(id);
    if (!entry) {
      throw new NotFoundError('Whitelist entry not found');
    }

    const updated = await this.whitelistRepo.update(id, normalizedData);
    if (!updated) {
      throw new NotFoundError('Whitelist entry not found');
    }

    return updated;
  }

  /**
   * 批量添加白名单
   */
  async batchAdd(data: BatchWhitelistDTO): Promise<WhitelistEntry[]> {
    const normalizedData = this.normalizeBatchInput(data);
    const { trafficSourceId, type, items } = normalizedData;

    const { storageId } = await this.resolveTrafficSourceOrThrow(trafficSourceId);

    if (!items || items.length === 0) {
      throw new ValidationError('No items to whitelist');
    }

    // 批量创建白名单条目
    const entries = await this.whitelistRepo.batchCreate(storageId, type, items);

    return entries;
  }

  /**
   * 从报告候选项目中批量添加白名单
   */
  async batchAddFromCandidates(
    trafficSourceId: string,
    candidates: WhitelistCandidate[],
    reason?: string
  ): Promise<WhitelistEntry[]> {
    const normalizedReason = normalizeOptionalString(reason as unknown, {
      field: 'whitelist.reason',
      maxLength: FIELD_MAX_LENGTH.REASON,
    });

    const items = candidates.map((candidate) => ({
      value: candidate.value,
      name: candidate.name,
      reason: normalizedReason || `ROI: ${candidate.metrics.roi.toFixed(2)}%, Revenue: $${candidate.metrics.revenue}`,
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
      {} as Record<WhitelistType, typeof items>
    );

    const allEntries: WhitelistEntry[] = [];

    for (const [type, typeItems] of Object.entries(groupedByType)) {
      const entries = await this.batchAdd({
        trafficSourceId,
        type: type as WhitelistType,
        items: typeItems,
      });
      allEntries.push(...entries);
    }

    return allEntries;
  }

  /**
   * 查询白名单
   */
  async query(params: WhitelistQueryParams): Promise<WhitelistEntry[]> {
    if (!params.trafficSourceId) {
      return this.whitelistRepo.findByParams(params);
    }

    const { storageId } = await this.resolveTrafficSourceOrThrow(params.trafficSourceId);

    return this.whitelistRepo.findByParams({
      ...params,
      trafficSourceId: storageId,
    });
  }

  /**
   * 获取白名单详情
   */
  async getById(id: string): Promise<WhitelistEntry> {
    const entry = await this.whitelistRepo.findById(id);
    if (!entry) {
      throw new NotFoundError('Whitelist entry not found');
    }
    return entry;
  }

  /**
   * 从白名单中移除
   */
  async remove(id: string): Promise<WhitelistEntry> {
    const entry = await this.whitelistRepo.remove(id);
    if (!entry) {
      throw new NotFoundError('Whitelist entry not found');
    }

    // 如果已同步到平台，需要从平台移除
    if (entry.synced) {
      await this.removeFromPlatform(entry);
    }

    return entry;
  }

  /**
   * 同步白名单到流量平台
   */
  async syncToPlatform(trafficSourceId: string): Promise<WhitelistSyncResult> {
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

    const apiConfig = this.parseTrafficSourceApiConfig(trafficSource.apiConfig);
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

    // 获取未同步的白名单
    const unsyncedEntries = await this.whitelistRepo.findUnsynced(storageId);

    if (unsyncedEntries.length === 0) {
      return {
        success: true,
        synced: 0,
        failed: 0,
        errors: [],
      };
    }

    // 根据平台类型选择适配器
    const result: WhitelistSyncResult = {
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
            await this.whitelistRepo.markSynced(entry.id);
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
    entry: WhitelistEntry
  ): Promise<{ success: boolean; message: string }> {
    // 只支持 Zone 类型的白名单
    if (entry.type !== 'zone') {
      return {
        success: false,
        message: `Unsupported whitelist type: ${entry.type}`,
      };
    }

    // 需要 campaignId 才能包含 Zone
    if (!entry.campaignId) {
      return {
        success: false,
        message: 'Campaign ID is required to include zone',
      };
    }

    const result = await adapter.execute('include_zone', {
      campaignId: entry.campaignId,
      zoneId: entry.value,
    });

    return {
      success: result.success,
      message: result.message,
    };
  }

  /**
   * 从平台移除白名单
   */
  private async removeFromPlatform(entry: WhitelistEntry): Promise<void> {
    const trafficSource = await this.trafficSourceRepo.findById(entry.trafficSourceId);
    if (!trafficSource || !trafficSource.apiConfig) {
      return;
    }

    const apiConfig = this.parseTrafficSourceApiConfig(trafficSource.apiConfig);
    if (!apiConfig.enabled) {
      return;
    }

    if (trafficSource.name.toLowerCase().includes('propeller') && entry.type === 'zone' && entry.campaignId) {
      const adapter = new PropellerAdsAdapter({
        apiKey: apiConfig.apiKey,
        apiUrl: apiConfig.baseUrl,
      });

      await adapter.initialize();
      await adapter.execute('exclude_zone', {
        campaignId: entry.campaignId,
        zoneId: entry.value,
      });
    }
  }

  /**
   * 获取白名单统计
   */
  private parseTrafficSourceApiConfig(config: TrafficSourceApiConfig | string): TrafficSourceApiConfig {
    if (typeof config === 'string') {
      return JSON.parse(config) as TrafficSourceApiConfig;
    }
    return config;
  }

  async getStats(trafficSourceId: string): Promise<{
    total: number;
    active: number;
    synced: number;
    unsynced: number;
  }> {
    const { storageId } = await this.resolveTrafficSourceOrThrow(trafficSourceId);

    return this.whitelistRepo.getStats(storageId);
  }

  private normalizeCreateInput(data: CreateWhitelistDTO): CreateWhitelistDTO {
    const type = data.type as WhitelistType;
    const valueMaxLength = this.getWhitelistValueMaxLength(type);

    return {
      ...data,
      trafficSourceId: normalizeRequiredString(data.trafficSourceId as unknown, {
        field: 'whitelist.trafficSourceId',
        maxLength: FIELD_MAX_LENGTH.CAMPAIGN_ID,
      }),
      value: normalizeRequiredString(data.value as unknown, {
        field: 'whitelist.value',
        maxLength: valueMaxLength,
      }),
      name: normalizeOptionalString(data.name as unknown, {
        field: 'whitelist.name',
        maxLength: FIELD_MAX_LENGTH.NAME,
      }),
      reason: normalizeOptionalString(data.reason as unknown, {
        field: 'whitelist.reason',
        maxLength: FIELD_MAX_LENGTH.REASON,
      }),
      campaignId: normalizeOptionalString(data.campaignId as unknown, {
        field: 'whitelist.campaignId',
        maxLength: FIELD_MAX_LENGTH.CAMPAIGN_ID,
      }),
    };
  }

  private normalizeUpdateInput(data: UpdateWhitelistDTO): UpdateWhitelistDTO {
    const normalizedData: UpdateWhitelistDTO = { ...data };

    if (data.name !== undefined) {
      normalizedData.name = normalizeOptionalString(data.name as unknown, {
        field: 'whitelist.name',
        maxLength: FIELD_MAX_LENGTH.NAME,
      });
    }

    if (data.reason !== undefined) {
      normalizedData.reason = normalizeOptionalString(data.reason as unknown, {
        field: 'whitelist.reason',
        maxLength: FIELD_MAX_LENGTH.REASON,
      });
    }

    return normalizedData;
  }

  private normalizeBatchInput(data: BatchWhitelistDTO): BatchWhitelistDTO {
    if (!Array.isArray(data.items)) {
      throw new ValidationError('whitelist.items must be an array');
    }

    const normalizedTrafficSourceId = normalizeRequiredString(data.trafficSourceId as unknown, {
      field: 'whitelist.trafficSourceId',
      maxLength: FIELD_MAX_LENGTH.CAMPAIGN_ID,
    });
    const type = data.type as WhitelistType;
    const valueMaxLength = this.getWhitelistValueMaxLength(type);

    return {
      ...data,
      trafficSourceId: normalizedTrafficSourceId,
      items: data.items.map((item, index) => ({
        ...item,
        value: normalizeRequiredString(item.value as unknown, {
          field: `whitelist.items[${index}].value`,
          maxLength: valueMaxLength,
        }),
        name: normalizeOptionalString(item.name as unknown, {
          field: `whitelist.items[${index}].name`,
          maxLength: FIELD_MAX_LENGTH.NAME,
        }),
        reason: normalizeOptionalString(item.reason as unknown, {
          field: `whitelist.items[${index}].reason`,
          maxLength: FIELD_MAX_LENGTH.REASON,
        }),
        campaignId: normalizeOptionalString(item.campaignId as unknown, {
          field: `whitelist.items[${index}].campaignId`,
          maxLength: FIELD_MAX_LENGTH.CAMPAIGN_ID,
        }),
      })),
    };
  }

  private getWhitelistValueMaxLength(type: WhitelistType): number {
    if (type === 'user_agent') {
      return FIELD_MAX_LENGTH.USER_AGENT_VALUE;
    }
    return FIELD_MAX_LENGTH.TRAFFIC_ENTRY_VALUE;
  }

  /**
   * 验证条目值格式
   */
  private validateEntryValue(
    type: WhitelistType,
    value: string,
    ipMatchMode?: string,
    uaMatchMode?: string
  ): void {
    if (!value || value.trim() === '') {
      throw new ValidationError('Value is required');
    }

    const normalizedValue = value.trim();
    const maxLength = this.getWhitelistValueMaxLength(type);
    if (normalizedValue.length > maxLength) {
      throw new ValidationError(`Whitelist value exceeds max length ${maxLength}`);
    }

    switch (type) {
      case 'ip':
        this.validateIpValue(normalizedValue, ipMatchMode);
        break;
      case 'user_agent':
        this.validateUaValue(normalizedValue, uaMatchMode);
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
   * 获取报告中的白名单候选项目
   * 根据统计数据找出表现优秀的 Zone/SubID
   */
  async getWhitelistCandidates(
    trafficSourceId: string,
    options: {
      minSpend?: number;
      minRoi?: number;
      minClicks?: number;
      dateRange?: string;
    } = {}
  ): Promise<WhitelistCandidate[]> {
    const { minSpend = 10, minRoi = 50, minClicks = 100 } = options;

    // 从流量统计数据中找出表现优秀的项目
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

    const candidates: WhitelistCandidate[] = [];

    for (const row of results.results || []) {
      const roi = row.spend > 0 ? ((row.revenue - row.spend) / row.spend) * 100 : 0;

      if (roi >= minRoi) {
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

    // 按 ROI 降序排序
    return candidates.sort((a, b) => b.metrics.roi - a.metrics.roi);
  }
}
