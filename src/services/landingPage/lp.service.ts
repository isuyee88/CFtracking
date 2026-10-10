/**
 * @fileoverview Landing Page 业务服务
 * @description 处理 Landing Page 相关的业务逻辑
 * @module services/landingPage/lp.service
 */

import { LandingPageRepository } from '@/handlers/d1/landingPage.repo';
import { getD1Connection } from '@/handlers/d1';
import type { Env } from '@/config/env';
import type { LandingPage, CreateLandingPageDTO, UpdateLandingPageDTO } from '@/types/landingPage';
import { NotFoundError, DuplicateError } from '@/middleware/error';
import { FIELD_MAX_LENGTH } from '@/config/field-constraints';
import { normalizeOptionalString, normalizeRequiredString } from '@/utils/fieldLength';
import { importLandingManifest } from './manifest-import';

const LANDING_HOSTING_MODES = new Set(['remote', 'local', 'zip']);

function normalizeHostingMode(value: unknown): 'remote' | 'local' | 'zip' {
  const normalized = String(value ?? 'remote').trim().toLowerCase();
  if (!LANDING_HOSTING_MODES.has(normalized)) {
    throw new Error('landingPage.hostingMode must be remote, local or zip');
  }
  return normalized as 'remote' | 'local' | 'zip';
}

function normalizeManifest(value: unknown): string | null {
  const normalized = normalizeOptionalString(value, {
    field: 'landingPage.manifestJson',
    maxLength: FIELD_MAX_LENGTH.LANDING_MANIFEST,
  });
  if (!normalized) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(normalized);
  } catch {
    throw new Error('landingPage.manifestJson must be valid JSON');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('landingPage.manifestJson must be a JSON object');
  }
  return JSON.stringify(parsed);
}

function normalizeSourceSlug(value: unknown): string | null {
  const normalized = normalizeOptionalString(value, {
    field: 'landingPage.sourceSlug',
    maxLength: FIELD_MAX_LENGTH.CAMPAIGN_ID,
  });
  if (!normalized) return null;
  if (!/^[a-z0-9][a-z0-9-]*$/.test(normalized)) {
    throw new Error('landingPage.sourceSlug must be a lowercase slug');
  }
  return normalized;
}

export class LandingPageService {
  private repo: LandingPageRepository;

  constructor(env: Env) {
    const db = getD1Connection(env);
    this.repo = new LandingPageRepository(db);
  }

  /**
   * 创建 Landing Page
   */
  async create(data: CreateLandingPageDTO): Promise<LandingPage> {
    const normalizedData = this.normalizeCreateInput(data);
    const urlExists = await this.repo.urlExists(normalizedData.url);
    if (urlExists) {
      throw new DuplicateError(`Landing Page with URL "${normalizedData.url}" already exists`);
    }

    return this.repo.create(normalizedData);
  }

  async importManifest(runtimeUrl: string, manifest: unknown): Promise<{ created: boolean; landingPage: LandingPage }> {
    return importLandingManifest(
      {
        findBySourceSlug: (sourceSlug) => this.repo.findBySourceSlug(sourceSlug),
        create: (data) => this.create(data),
        update: async (id, data) => {
          const landingPage = await this.update(id, data);
          if (!landingPage) throw new NotFoundError('Landing Page not found');
          return landingPage;
        },
      },
      { runtimeUrl, manifest },
    );
  }

  /**
   * 获取 Landing Page 详情
   */
  async getById(id: string): Promise<LandingPage> {
    const lp = await this.repo.findById(id);
    if (!lp) {
      throw new NotFoundError('Landing Page not found');
    }
    return lp;
  }

  /**
   * 获取 Landing Page 列表
   */
  async getList(page = 1, pageSize = 20): Promise<{ list: LandingPage[]; total: number }> {
    const offset = (page - 1) * pageSize;
    const [list, total] = await Promise.all([
      this.repo.findAll(pageSize, offset),
      this.repo.count(),
    ]);
    return { list, total };
  }

  /**
   * 获取活跃的 Landing Page 列表
   */
  async getActive(): Promise<LandingPage[]> {
    return this.repo.findByStatus('active');
  }

  /**
   * 更新 Landing Page
   */
  async update(id: string, data: UpdateLandingPageDTO): Promise<LandingPage> {
    const normalizedData = this.normalizeUpdateInput(data);
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundError('Landing Page not found');
    }

    if (normalizedData.url && normalizedData.url !== existing.url) {
      const urlExists = await this.repo.urlExists(normalizedData.url, id);
      if (urlExists) {
        throw new DuplicateError(`Landing Page with URL "${normalizedData.url}" already exists`);
      }
    }

    const updated = await this.repo.update(id, normalizedData);
    return updated!;
  }

  /**
   * 删除 Landing Page（硬删除）
   */
  async delete(id: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundError('Landing Page not found');
    }

    await this.repo.deleteById(id);
  }

  /**
   * 获取 Landing Page 详情（包含统计数据）
   */
  async getDetail(
    id: string,
    startDate?: string,
    endDate?: string
  ): Promise<LandingPage & { campaignCount: number; clicks: number; conversions: number; cr: number }> {
    const lp = await this.getById(id);
    const [campaignCount, stats] = await Promise.all([
      this.repo.getCampaignCount(id),
      this.repo.getStats(id, startDate, endDate),
    ]);

    const cr = stats.clicks > 0 ? (stats.conversions / stats.clicks) * 100 : 0;

    return {
      ...lp,
      campaignCount,
      clicks: stats.clicks,
      conversions: stats.conversions,
      cr: Math.round(cr * 100) / 100,
    };
  }

  /**
   * 获取 Landing Page 列表（包含统计数据）
   */
  async getListWithStats(page = 1, pageSize = 20, startDate?: string, endDate?: string): Promise<{ 
    list: (LandingPage & { campaignCount: number; clicks: number; conversions: number; cr: number })[]; 
    total: number 
  }> {
    const { list, total } = await this.getList(page, pageSize);
    
    const listWithStats = await Promise.all(
      list.map(async (lp) => {
        const [campaignCount, stats] = await Promise.all([
          this.repo.getCampaignCount(lp.id),
          this.repo.getStats(lp.id, startDate, endDate),
        ]);
        const cr = stats.clicks > 0 ? (stats.conversions / stats.clicks) * 100 : 0;
        return {
          ...lp,
          campaignCount,
          clicks: stats.clicks,
          conversions: stats.conversions,
          cr: Math.round(cr * 100) / 100,
        };
      })
    );

    return { list: listWithStats, total };
  }

  private normalizeCreateInput(data: CreateLandingPageDTO): CreateLandingPageDTO {
    const normalizedHostingMode = normalizeHostingMode(data.hostingMode);
    return {
        ...data,
      name: normalizeRequiredString(data.name as unknown, {
        field: 'landingPage.name',
        maxLength: FIELD_MAX_LENGTH.NAME,
      }),
      url: normalizeRequiredString(data.url as unknown, {
        field: 'landingPage.url',
        maxLength: FIELD_MAX_LENGTH.URL,
      }),
      sourceSlug: normalizeSourceSlug(data.sourceSlug),
      group: normalizeOptionalString(data.group as unknown, {
        field: 'landingPage.group',
        maxLength: FIELD_MAX_LENGTH.GROUP,
      }),
      hostingMode: normalizedHostingMode,
      assetId: normalizeOptionalString(data.assetId as unknown, {
        field: 'landingPage.assetId',
        maxLength: FIELD_MAX_LENGTH.CAMPAIGN_ID,
      }) || null,
      manifestJson: normalizeManifest(data.manifestJson),
      notes: normalizeOptionalString(data.notes as unknown, {
        field: 'landingPage.notes',
        maxLength: FIELD_MAX_LENGTH.NOTES,
      }) || null,
    };
  }

  private normalizeUpdateInput(data: UpdateLandingPageDTO): UpdateLandingPageDTO {
    const normalizedData: UpdateLandingPageDTO = { ...data };

    if (data.name !== undefined) {
      normalizedData.name = normalizeRequiredString(data.name as unknown, {
        field: 'landingPage.name',
        maxLength: FIELD_MAX_LENGTH.NAME,
      });
    }

    if (data.url !== undefined) {
      normalizedData.url = normalizeRequiredString(data.url as unknown, {
        field: 'landingPage.url',
        maxLength: FIELD_MAX_LENGTH.URL,
      });
    }

    if (data.sourceSlug !== undefined) {
      normalizedData.sourceSlug = normalizeSourceSlug(data.sourceSlug);
    }

    if (data.group !== undefined) {
      normalizedData.group = normalizeOptionalString(data.group as unknown, {
        field: 'landingPage.group',
        maxLength: FIELD_MAX_LENGTH.GROUP,
      });
    }

    if (data.hostingMode !== undefined) {
      normalizedData.hostingMode = normalizeHostingMode(data.hostingMode);
    }

    if (data.assetId !== undefined) {
      normalizedData.assetId = normalizeOptionalString(data.assetId as unknown, {
        field: 'landingPage.assetId',
        maxLength: FIELD_MAX_LENGTH.CAMPAIGN_ID,
      }) || null;
    }

    if (data.manifestJson !== undefined) {
      normalizedData.manifestJson = normalizeManifest(data.manifestJson);
    }

    if (data.notes !== undefined) {
      normalizedData.notes = normalizeOptionalString(data.notes as unknown, {
        field: 'landingPage.notes',
        maxLength: FIELD_MAX_LENGTH.NOTES,
      }) || null;
    }

    return normalizedData;
  }
}
