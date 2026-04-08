/**
 * @fileoverview Traffic Source 业务服务
 * @description 处理 Traffic Source 相关的业务逻辑
 * @module services/trafficSource/trafficSource.service
 */

import { TrafficSourceRepository } from '@/handlers/d1/trafficSource.repo';
import { getD1Connection } from '@/handlers/d1';
import type { Env } from '@/config/env';
import type {
  TrafficSource,
  CreateTrafficSourceDTO,
  UpdateTrafficSourceDTO,
  ParameterTemplate,
  PostbackConfig,
  TrafficSourceApiConfig,
  ConversionStatus,
} from '@/types/trafficSource';
import { NotFoundError, ValidationError } from '@/middleware/error';
import { FIELD_MAX_LENGTH } from '@/config/field-constraints';
import { normalizeOptionalString, normalizeRequiredString } from '@/utils/fieldLength';

export class TrafficSourceService {
  private repo: TrafficSourceRepository;

  constructor(env: Env) {
    const db = getD1Connection(env);
    this.repo = new TrafficSourceRepository(db);
  }

  /**
   * 创建 Traffic Source
   */
  async create(data: CreateTrafficSourceDTO): Promise<TrafficSource> {
    const normalizedData = this.normalizeCreateInput(data);
    return this.repo.create(normalizedData);
  }

  /**
   * 获取 Traffic Source 详情
   */
  async getById(id: string): Promise<TrafficSource> {
    const ts = await this.repo.findById(id);
    if (!ts) {
      throw new NotFoundError('Traffic Source not found');
    }
    return ts;
  }

  /**
   * 获取 Traffic Source 列表
   */
  async getList(page = 1, pageSize = 20): Promise<{ list: TrafficSource[]; total: number }> {
    return this.repo.findList(page, pageSize);
  }

  /**
   * 获取活跃的 Traffic Source 列表
   */
  async getActive(): Promise<TrafficSource[]> {
    return this.repo.findByStatus('active');
  }

  /**
   * 更新 Traffic Source
   */
  async update(id: string, data: UpdateTrafficSourceDTO): Promise<TrafficSource> {
    const normalizedData = this.normalizeUpdateInput(data);
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundError('Traffic Source not found');
    }

    const updated = await this.repo.update(id, normalizedData);
    return updated!;
  }

  /**
   * 删除 Traffic Source（硬删除）
   */
  async delete(id: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundError('Traffic Source not found');
    }

    await this.repo.deleteById(id);
  }

  /**
   * 获取 Traffic Source 详情（包含统计数据）
   */
  async getDetail(id: string): Promise<TrafficSource & { 
    campaignCount: number; 
    clicks: number; 
    conversions: number; 
    revenue: number; 
    cost: number;
    profit: number;
    roi: number;
  }> {
    const ts = await this.getById(id);
    const [campaignCount, stats] = await Promise.all([
      this.repo.getCampaignCount(id),
      this.repo.getStats(id),
    ]);

    const profit = stats.revenue - stats.cost;
    const roi = stats.cost > 0 ? ((profit / stats.cost) * 100) : 0;

    return {
      ...ts,
      campaignCount,
      clicks: stats.clicks,
      conversions: stats.conversions,
      revenue: stats.revenue,
      cost: stats.cost,
      profit: Math.round(profit * 100) / 100,
      roi: Math.round(roi * 100) / 100,
    };
  }

  /**
   * 获取 Traffic Source 列表（包含统计数据）
   */
  async getListWithStats(page = 1, pageSize = 20): Promise<{ 
    list: (TrafficSource & { 
      campaignCount: number; 
      clicks: number; 
      conversions: number; 
      revenue: number; 
      cost: number;
      profit: number;
      roi: number;
    })[]; 
    total: number 
  }> {
    const { list, total } = await this.getList(page, pageSize);
    
    const listWithStats = await Promise.all(
      list.map(async (ts) => {
        const [campaignCount, stats] = await Promise.all([
          this.repo.getCampaignCount(ts.id),
          this.repo.getStats(ts.id),
        ]);
        const profit = stats.revenue - stats.cost;
        const roi = stats.cost > 0 ? ((profit / stats.cost) * 100) : 0;
        return {
          ...ts,
          campaignCount,
          clicks: stats.clicks,
          conversions: stats.conversions,
          revenue: stats.revenue,
          cost: stats.cost,
          profit: Math.round(profit * 100) / 100,
          roi: Math.round(roi * 100) / 100,
        };
      })
    );

    return { list: listWithStats, total };
  }

  private normalizeCreateInput(data: CreateTrafficSourceDTO): CreateTrafficSourceDTO {
    const normalizedData: CreateTrafficSourceDTO = {
      ...data,
      name: normalizeRequiredString(data.name as unknown, {
        field: 'trafficSource.name',
        maxLength: FIELD_MAX_LENGTH.NAME,
      }),
      postbackUrl: normalizeOptionalString(data.postbackUrl as unknown, {
        field: 'trafficSource.postbackUrl',
        maxLength: FIELD_MAX_LENGTH.URL,
      }),
      templateId: normalizeOptionalString(data.templateId as unknown, {
        field: 'trafficSource.templateId',
        maxLength: FIELD_MAX_LENGTH.CAMPAIGN_ID,
      }),
    };

    if (data.parameters !== undefined) {
      normalizedData.parameters = this.normalizeParameters(data.parameters);
    }

    if (data.postbackConfig !== undefined) {
      normalizedData.postbackConfig = this.normalizePostbackConfig(data.postbackConfig);
    }

    if (data.apiConfig !== undefined) {
      normalizedData.apiConfig = this.normalizeApiConfig(data.apiConfig);
    }

    return normalizedData;
  }

  private normalizeUpdateInput(data: UpdateTrafficSourceDTO): UpdateTrafficSourceDTO {
    const normalizedData: UpdateTrafficSourceDTO = { ...data };

    if (data.name !== undefined) {
      normalizedData.name = normalizeRequiredString(data.name as unknown, {
        field: 'trafficSource.name',
        maxLength: FIELD_MAX_LENGTH.NAME,
      });
    }

    if (data.postbackUrl !== undefined) {
      normalizedData.postbackUrl = normalizeOptionalString(data.postbackUrl as unknown, {
        field: 'trafficSource.postbackUrl',
        maxLength: FIELD_MAX_LENGTH.URL,
      });
    }

    if (data.templateId !== undefined) {
      normalizedData.templateId = normalizeOptionalString(data.templateId as unknown, {
        field: 'trafficSource.templateId',
        maxLength: FIELD_MAX_LENGTH.CAMPAIGN_ID,
      });
    }

    if (data.parameters !== undefined) {
      normalizedData.parameters = this.normalizeParameters(data.parameters);
    }

    if (data.postbackConfig !== undefined) {
      normalizedData.postbackConfig = this.normalizePostbackConfig(data.postbackConfig);
    }

    if (data.apiConfig !== undefined) {
      normalizedData.apiConfig = this.normalizeApiConfig(data.apiConfig);
    }

    return normalizedData;
  }

  private normalizeParameters(raw: CreateTrafficSourceDTO['parameters']): ParameterTemplate[] {
    const parsedValue = this.parseJsonIfNeeded(raw, 'trafficSource.parameters');
    if (!Array.isArray(parsedValue)) {
      throw new ValidationError('trafficSource.parameters must be an array');
    }

    return parsedValue.map((entry, index) => {
      if (!entry || typeof entry !== 'object') {
        throw new ValidationError(`trafficSource.parameters[${index}] must be an object`);
      }

      const candidate = entry as Record<string, unknown>;
      return {
        alias: normalizeRequiredString(candidate.alias, {
          field: `trafficSource.parameters[${index}].alias`,
          maxLength: FIELD_MAX_LENGTH.PARAMETER_ALIAS,
        }),
        paramName: normalizeRequiredString(candidate.paramName, {
          field: `trafficSource.parameters[${index}].paramName`,
          maxLength: FIELD_MAX_LENGTH.PARAMETER_NAME,
        }),
        macro: normalizeRequiredString(candidate.macro, {
          field: `trafficSource.parameters[${index}].macro`,
          maxLength: FIELD_MAX_LENGTH.PARAMETER_VALUE,
        }),
      };
    });
  }

  private normalizePostbackConfig(
    raw: CreateTrafficSourceDTO['postbackConfig']
  ): PostbackConfig {
    const parsedValue = this.parseJsonIfNeeded(raw, 'trafficSource.postbackConfig');
    if (!parsedValue || typeof parsedValue !== 'object' || Array.isArray(parsedValue)) {
      throw new ValidationError('trafficSource.postbackConfig must be an object');
    }

    const candidate = parsedValue as Record<string, unknown>;
    const sendOnlyStatuses = candidate.sendOnlyStatuses;
    if (!Array.isArray(sendOnlyStatuses)) {
      throw new ValidationError('trafficSource.postbackConfig.sendOnlyStatuses must be an array');
    }

    const normalizedStatuses = sendOnlyStatuses.map((status, index) =>
      normalizeRequiredString(status, {
        field: `trafficSource.postbackConfig.sendOnlyStatuses[${index}]`,
        maxLength: 32,
        trim: true,
      })
    ) as ConversionStatus[];

    const normalizedConfig: PostbackConfig = {
      url: normalizeRequiredString(candidate.url, {
        field: 'trafficSource.postbackConfig.url',
        maxLength: FIELD_MAX_LENGTH.URL,
      }),
      sendOnlyStatuses: normalizedStatuses,
    };

    if (candidate.customParams !== undefined) {
      if (!candidate.customParams || typeof candidate.customParams !== 'object' || Array.isArray(candidate.customParams)) {
        throw new ValidationError('trafficSource.postbackConfig.customParams must be an object');
      }

      const customParams: Record<string, string> = {};
      for (const [key, value] of Object.entries(candidate.customParams as Record<string, unknown>)) {
        const normalizedKey = normalizeRequiredString(key, {
          field: 'trafficSource.postbackConfig.customParams.key',
          maxLength: FIELD_MAX_LENGTH.PARAMETER_NAME,
          trim: true,
        });
        const normalizedValue = normalizeRequiredString(value, {
          field: `trafficSource.postbackConfig.customParams.${normalizedKey}`,
          maxLength: FIELD_MAX_LENGTH.PARAMETER_VALUE,
          trim: true,
        });
        customParams[normalizedKey] = normalizedValue;
      }

      normalizedConfig.customParams = customParams;
    }

    if (candidate.taboolaKey !== undefined) {
      normalizedConfig.taboolaKey = normalizeOptionalString(candidate.taboolaKey, {
        field: 'trafficSource.postbackConfig.taboolaKey',
        maxLength: FIELD_MAX_LENGTH.API_KEY,
      });
    }

    return normalizedConfig;
  }

  private normalizeApiConfig(raw: CreateTrafficSourceDTO['apiConfig']): TrafficSourceApiConfig {
    const parsedValue = this.parseJsonIfNeeded(raw, 'trafficSource.apiConfig');
    if (!parsedValue || typeof parsedValue !== 'object' || Array.isArray(parsedValue)) {
      throw new ValidationError('trafficSource.apiConfig must be an object');
    }

    const candidate = parsedValue as Record<string, unknown>;
    const enabledRaw = candidate.enabled;
    if (enabledRaw !== undefined && typeof enabledRaw !== 'boolean') {
      throw new ValidationError('trafficSource.apiConfig.enabled must be a boolean');
    }
    const enabled = enabledRaw === true;

    const baseUrl = normalizeOptionalString(candidate.baseUrl, {
      field: 'trafficSource.apiConfig.baseUrl',
      maxLength: FIELD_MAX_LENGTH.URL,
    });
    const apiKey = normalizeOptionalString(candidate.apiKey, {
      field: 'trafficSource.apiConfig.apiKey',
      maxLength: FIELD_MAX_LENGTH.API_KEY,
    });
    const apiSecret = normalizeOptionalString(candidate.apiSecret, {
      field: 'trafficSource.apiConfig.apiSecret',
      maxLength: FIELD_MAX_LENGTH.API_SECRET,
    });

    if (enabled && (!baseUrl || !apiKey)) {
      throw new ValidationError('trafficSource.apiConfig.baseUrl and apiKey are required when API is enabled');
    }

    const normalizedConfig: TrafficSourceApiConfig = {
      enabled,
      baseUrl: baseUrl || '',
      apiKey: apiKey || '',
    };

    if (apiSecret !== undefined) {
      normalizedConfig.apiSecret = apiSecret;
    }

    return normalizedConfig;
  }

  private parseJsonIfNeeded(value: unknown, field: string): unknown {
    if (typeof value !== 'string') {
      return value;
    }

    try {
      return JSON.parse(value);
    } catch {
      throw new ValidationError(`${field} must be valid JSON`);
    }
  }
}
