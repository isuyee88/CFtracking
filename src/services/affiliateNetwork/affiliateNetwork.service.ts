/**
 * @fileoverview Affiliate Network 业务服务
 * @description 处理 Affiliate Network 相关的业务逻辑
 * @module services/affiliateNetwork/affiliateNetwork.service
 */

import { AffiliateNetworkRepository } from '@/handlers/d1/affiliateNetwork.repo';
import { getD1Connection } from '@/handlers/d1';
import type { Env } from '@/config/env';
import type {
  AffiliateNetwork,
  AffiliateNetworkOfferParameter,
  CreateAffiliateNetworkDTO,
  UpdateAffiliateNetworkDTO,
} from '@/types/affiliateNetwork';
import { NotFoundError, ValidationError } from '@/middleware/error';
import { FIELD_MAX_LENGTH } from '@/config/field-constraints';
import { normalizeOptionalString, normalizeRequiredString } from '@/utils/fieldLength';

export class AffiliateNetworkService {
  private repo: AffiliateNetworkRepository;

  constructor(env: Env) {
    const db = getD1Connection(env);
    this.repo = new AffiliateNetworkRepository(db);
  }

  /**
   * 创建 Affiliate Network
   */
  async create(data: CreateAffiliateNetworkDTO): Promise<AffiliateNetwork> {
    const normalizedData = this.normalizeCreateInput(data);
    return this.repo.create(normalizedData);
  }

  /**
   * 获取 Affiliate Network 详情
   */
  async getById(id: string): Promise<AffiliateNetwork> {
    const network = await this.repo.findById(id);
    if (!network) {
      throw new NotFoundError('Affiliate Network not found');
    }
    return network;
  }

  /**
   * 获取 Affiliate Network 列表
   */
  async getList(page = 1, pageSize = 20): Promise<{ list: AffiliateNetwork[]; total: number }> {
    return this.repo.findList(page, pageSize);
  }

  /**
   * 获取活跃的 Affiliate Network 列表
   */
  async getActive(): Promise<AffiliateNetwork[]> {
    return this.repo.findByStatus('active');
  }

  /**
   * 更新 Affiliate Network
   */
  async update(id: string, data: UpdateAffiliateNetworkDTO): Promise<AffiliateNetwork> {
    const normalizedData = this.normalizeUpdateInput(data);
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundError('Affiliate Network not found');
    }

    const updated = await this.repo.update(id, normalizedData);
    return updated!;
  }

  /**
   * 删除 Affiliate Network（硬删除）
   */
  async delete(id: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundError('Affiliate Network not found');
    }

    await this.repo.deleteById(id);
  }

  /**
   * 获取 Affiliate Network 详情（包含统计数据）
   */
  async getDetail(id: string): Promise<AffiliateNetwork & { 
    offerCount: number; 
    clicks: number; 
    conversions: number; 
    revenue: number; 
    epc: number;
    cr: number;
  }> {
    const network = await this.getById(id);
    const [offerCount, stats] = await Promise.all([
      this.repo.getOfferCount(id),
      this.repo.getStats(id),
    ]);

    const epc = stats.clicks > 0 ? stats.revenue / stats.clicks : 0;
    const cr = stats.clicks > 0 ? (stats.conversions / stats.clicks) * 100 : 0;

    return {
      ...network,
      offerCount,
      clicks: stats.clicks,
      conversions: stats.conversions,
      revenue: stats.revenue,
      epc: Math.round(epc * 100) / 100,
      cr: Math.round(cr * 100) / 100,
    };
  }

  /**
   * 获取 Affiliate Network 列表（包含统计数据）
   */
  async getListWithStats(page = 1, pageSize = 20): Promise<{ 
    list: (AffiliateNetwork & { 
      offerCount: number; 
      clicks: number; 
      conversions: number; 
      revenue: number; 
      epc: number;
      cr: number;
    })[]; 
    total: number 
  }> {
    const { list, total } = await this.getList(page, pageSize);
    
    const listWithStats = await Promise.all(
      list.map(async (network) => {
        const [offerCount, stats] = await Promise.all([
          this.repo.getOfferCount(network.id),
          this.repo.getStats(network.id),
        ]);
        const epc = stats.clicks > 0 ? stats.revenue / stats.clicks : 0;
        const cr = stats.clicks > 0 ? (stats.conversions / stats.clicks) * 100 : 0;
        return {
          ...network,
          offerCount,
          clicks: stats.clicks,
          conversions: stats.conversions,
          revenue: stats.revenue,
          epc: Math.round(epc * 100) / 100,
          cr: Math.round(cr * 100) / 100,
        };
      })
    );

    return { list: listWithStats, total };
  }

  private normalizeCreateInput(data: CreateAffiliateNetworkDTO): CreateAffiliateNetworkDTO {
    const normalizedData: CreateAffiliateNetworkDTO = {
      ...data,
      name: normalizeRequiredString(data.name as unknown, {
        field: 'affiliateNetwork.name',
        maxLength: FIELD_MAX_LENGTH.NAME,
      }),
      apiUrl: normalizeOptionalString(data.apiUrl as unknown, {
        field: 'affiliateNetwork.apiUrl',
        maxLength: FIELD_MAX_LENGTH.URL,
      }),
      apiKey: normalizeOptionalString(data.apiKey as unknown, {
        field: 'affiliateNetwork.apiKey',
        maxLength: FIELD_MAX_LENGTH.API_KEY,
      }),
      apiSecret: normalizeOptionalString(data.apiSecret as unknown, {
        field: 'affiliateNetwork.apiSecret',
        maxLength: FIELD_MAX_LENGTH.API_SECRET,
      }),
      postbackUrl: normalizeOptionalString(data.postbackUrl as unknown, {
        field: 'affiliateNetwork.postbackUrl',
        maxLength: FIELD_MAX_LENGTH.URL,
      }),
      notes: normalizeOptionalString(data.notes as unknown, {
        field: 'affiliateNetwork.notes',
        maxLength: FIELD_MAX_LENGTH.NOTES,
      }),
      templateId: normalizeOptionalString(data.templateId as unknown, {
        field: 'affiliateNetwork.templateId',
        maxLength: FIELD_MAX_LENGTH.CAMPAIGN_ID,
      }),
    };

    if (data.offerParameters !== undefined) {
      normalizedData.offerParameters = this.normalizeOfferParameters(data.offerParameters);
    }

    return normalizedData;
  }

  private normalizeUpdateInput(data: UpdateAffiliateNetworkDTO): UpdateAffiliateNetworkDTO {
    const normalizedData: UpdateAffiliateNetworkDTO = { ...data };

    if (data.name !== undefined) {
      normalizedData.name = normalizeRequiredString(data.name as unknown, {
        field: 'affiliateNetwork.name',
        maxLength: FIELD_MAX_LENGTH.NAME,
      });
    }

    if (data.apiUrl !== undefined) {
      normalizedData.apiUrl = normalizeOptionalString(data.apiUrl as unknown, {
        field: 'affiliateNetwork.apiUrl',
        maxLength: FIELD_MAX_LENGTH.URL,
      });
    }

    if (data.apiKey !== undefined) {
      normalizedData.apiKey = normalizeOptionalString(data.apiKey as unknown, {
        field: 'affiliateNetwork.apiKey',
        maxLength: FIELD_MAX_LENGTH.API_KEY,
      });
    }

    if (data.apiSecret !== undefined) {
      normalizedData.apiSecret = normalizeOptionalString(data.apiSecret as unknown, {
        field: 'affiliateNetwork.apiSecret',
        maxLength: FIELD_MAX_LENGTH.API_SECRET,
      });
    }

    if (data.postbackUrl !== undefined) {
      normalizedData.postbackUrl = normalizeOptionalString(data.postbackUrl as unknown, {
        field: 'affiliateNetwork.postbackUrl',
        maxLength: FIELD_MAX_LENGTH.URL,
      });
    }

    if (data.notes !== undefined) {
      normalizedData.notes = normalizeOptionalString(data.notes as unknown, {
        field: 'affiliateNetwork.notes',
        maxLength: FIELD_MAX_LENGTH.NOTES,
      });
    }

    if (data.templateId !== undefined) {
      normalizedData.templateId = normalizeOptionalString(data.templateId as unknown, {
        field: 'affiliateNetwork.templateId',
        maxLength: FIELD_MAX_LENGTH.CAMPAIGN_ID,
      });
    }

    if (data.offerParameters !== undefined) {
      normalizedData.offerParameters = this.normalizeOfferParameters(data.offerParameters);
    }

    return normalizedData;
  }

  private normalizeOfferParameters(raw: unknown): AffiliateNetworkOfferParameter[] {
    const parsedValue = this.parseJsonIfNeeded(raw, 'affiliateNetwork.offerParameters');
    if (!Array.isArray(parsedValue)) {
      throw new ValidationError('affiliateNetwork.offerParameters must be an array');
    }

    return parsedValue.map((item, index) => {
      if (!item || typeof item !== 'object') {
        throw new ValidationError(`affiliateNetwork.offerParameters[${index}] must be an object`);
      }

      const candidate = item as Record<string, unknown>;
      const normalizedParameter: AffiliateNetworkOfferParameter = {
        name: normalizeRequiredString(candidate.name, {
          field: `affiliateNetwork.offerParameters[${index}].name`,
          maxLength: FIELD_MAX_LENGTH.PARAMETER_NAME,
        }),
        value: normalizeRequiredString(candidate.value, {
          field: `affiliateNetwork.offerParameters[${index}].value`,
          maxLength: FIELD_MAX_LENGTH.PARAMETER_VALUE,
        }),
      };

      if (candidate.description !== undefined) {
        normalizedParameter.description = normalizeOptionalString(candidate.description, {
          field: `affiliateNetwork.offerParameters[${index}].description`,
          maxLength: FIELD_MAX_LENGTH.NOTES,
        });
      }

      return normalizedParameter;
    });
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
