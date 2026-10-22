/**
 * @fileoverview Export Service
 * @description Handles data export business logic for various entity types
 * @module services/export/export.service
 * 
 * Input: Export requests with entity type, format, filters
 * Output: Formatted export data (CSV, Excel, JSON)
 * Logic Interaction: 
 *   - Uses repositories for entity data
 *   - Uses export.formatter for data formatting
 * Frontend-Backend: Provides data for ExportButton component
 */

import type { Env } from '@/config/env';
import { CampaignRepository } from '@/handlers/d1/campaign.repo';
import { LandingPageRepository } from '@/handlers/d1/landingPage.repo';
import { OfferRepository } from '@/handlers/d1/offer.repo';
import { TrafficSourceRepository } from '@/handlers/d1/trafficSource.repo';
import { AffiliateNetworkRepository } from '@/handlers/d1/affiliateNetwork.repo';
import { ClickRepository } from '@/handlers/d1/click.repo';
import type { ClickExportCursor, ClickQueryParams } from '@/handlers/d1/click.repo';
import { ConversionRepository } from '@/handlers/d1/conversion.repo';
import type { ConversionExportCursor, ConversionQueryParams } from '@/handlers/d1/conversion.repo';
import { FlowRepository } from '@/handlers/d1/flow.repo';
import { LIST_COUNT_CAP } from '@/handlers/d1/list-query';
import type { ClickData, ConversionData } from '@/types/tracking';
import { getD1Connection } from '@/handlers/d1';
import {
  convertToCSV,
  convertToJSON,
  getContentType,
  getFileExtension,
  DEFAULT_FIELD_MAPPINGS,
  type ExportFormat,
  type FieldMapping,
} from '@/utils/export.formatter';

export interface ExportRequest {
  entityType: 'campaigns' | 'landing-pages' | 'offers' | 'traffic-sources' | 'affiliate-networks' | 'clicks' | 'conversions' | 'flows';
  format: ExportFormat;
  fields?: string[];
  filters?: ExportFilters;
  dateRange?: {
    startDate: string;
    endDate: string;
  };
}

export interface ExportFilters {
  status?: string;
  search?: string;
  campaignId?: string;
  offerId?: string;
  [key: string]: unknown;
}

export interface ExportResult {
  data: string;
  contentType: string;
  filename: string;
  format: ExportFormat;
  /** 实际写入文件的行数。 */
  rowCount: number;
  /** 本次导出允许的最大行数（日志类为 EXPORT_MAX_ROWS）。 */
  limit: number;
  /** true 表示匹配行数超过 limit，data 只是部分数据；route 必须拒绝静默成功。 */
  truncated: boolean;
}

/**
 * 导出分块大小与硬上限。
 *
 * D1 单查询最多读 7500 行：每批取 LIST_COUNT_CAP(7000) + 1 行探测，仍在预算内。
 * 日志类导出最多 EXPORT_MAX_ROWS 行；超过时返回 truncated=true，由 route 返回 400
 * 要求收窄筛选，而不是静默丢行。
 */
const EXPORT_BATCH_SIZE = LIST_COUNT_CAP;
const EXPORT_MAX_ROWS = 10_000;

export class ExportService {
  async exportCampaigns(request: ExportRequest): Promise<ExportResult> {
    const db = getD1Connection({} as Env);
    const repo = new CampaignRepository(db);
    const campaigns = await repo.findAll();
    return this.formatExportData('campaigns', campaigns as unknown as Record<string, unknown>[], request);
  }

  async exportLandingPages(request: ExportRequest): Promise<ExportResult> {
    const db = getD1Connection({} as Env);
    const repo = new LandingPageRepository(db);
    const pages = await repo.findAll();
    return this.formatExportData('landingPages', pages as unknown as Record<string, unknown>[], request);
  }

  async exportOffers(request: ExportRequest): Promise<ExportResult> {
    const db = getD1Connection({} as Env);
    const repo = new OfferRepository(db);
    const offers = await repo.findAll();
    return this.formatExportData('offers', offers as unknown as Record<string, unknown>[], request);
  }

  async exportTrafficSources(request: ExportRequest): Promise<ExportResult> {
    const db = getD1Connection({} as Env);
    const repo = new TrafficSourceRepository(db);
    const sources = await repo.findAll();
    return this.formatExportData('trafficSources', sources as unknown as Record<string, unknown>[], request);
  }

  async exportAffiliateNetworks(request: ExportRequest): Promise<ExportResult> {
    const db = getD1Connection({} as Env);
    const repo = new AffiliateNetworkRepository(db);
    const networks = await repo.findAll();
    return this.formatExportData('affiliateNetworks', networks as unknown as Record<string, unknown>[], request);
  }

  async exportClicks(request: ExportRequest): Promise<ExportResult> {
    const db = getD1Connection({} as Env);
    const repo = new ClickRepository(db);
    const { rows, truncated } = await this.collectClickRows(repo, request);

    return this.formatExportData('clicks', rows as unknown as Record<string, unknown>[], request, {
      limit: EXPORT_MAX_ROWS,
      truncated,
    });
  }

  async exportConversions(request: ExportRequest): Promise<ExportResult> {
    const db = getD1Connection({} as Env);
    const repo = new ConversionRepository(db);
    const { rows, truncated } = await this.collectConversionRows(repo, request);

    return this.formatExportData('conversions', rows as unknown as Record<string, unknown>[], request, {
      limit: EXPORT_MAX_ROWS,
      truncated,
    });
  }

  /**
   * 按 keyset 分批读取点击，最多 EXPORT_MAX_ROWS 行。
   *
   * 不使用 OFFSET 深翻页：每批只读 batchSize + 1 行（<= 7001），避免 D1 7500 行预算。
   *
   * @returns rows 与 truncated（匹配行数超过上限时为 true，调用方必须拒绝导出）。
   */
  private async collectClickRows(
    repo: ClickRepository,
    request: ExportRequest
  ): Promise<{ rows: ClickData[]; truncated: boolean }> {
    const params: ClickQueryParams = {
      startDate: request.dateRange?.startDate,
      endDate: request.dateRange?.endDate,
      campaignId: request.filters?.campaignId as string,
      offerId: request.filters?.offerId as string,
    };
    const rows: ClickData[] = [];
    let cursor: ClickExportCursor | null = null;
    let hasMore = false;

    do {
      const remaining = EXPORT_MAX_ROWS - rows.length;
      if (remaining <= 0) break;
      const batch = await repo.findClicksForExport(
        params,
        cursor,
        Math.min(EXPORT_BATCH_SIZE, remaining)
      );
      rows.push(...batch.list);
      hasMore = batch.hasMore;
      if (!hasMore) break;
      cursor = batch.nextCursor;
    } while (rows.length < EXPORT_MAX_ROWS);

    return { rows, truncated: hasMore && rows.length >= EXPORT_MAX_ROWS };
  }

  /**
   * 按 keyset 分批读取转化，最多 EXPORT_MAX_ROWS 行；语义同 collectClickRows。
   */
  private async collectConversionRows(
    repo: ConversionRepository,
    request: ExportRequest
  ): Promise<{ rows: ConversionData[]; truncated: boolean }> {
    const params: ConversionQueryParams = {
      startDate: request.dateRange?.startDate,
      endDate: request.dateRange?.endDate,
      campaignId: request.filters?.campaignId as string,
      offerId: request.filters?.offerId as string,
    };
    const rows: ConversionData[] = [];
    let cursor: ConversionExportCursor | null = null;
    let hasMore = false;

    do {
      const remaining = EXPORT_MAX_ROWS - rows.length;
      if (remaining <= 0) break;
      const batch = await repo.findConversionsForExport(
        params,
        cursor,
        Math.min(EXPORT_BATCH_SIZE, remaining)
      );
      rows.push(...batch.list);
      hasMore = batch.hasMore;
      if (!hasMore) break;
      cursor = batch.nextCursor;
    } while (rows.length < EXPORT_MAX_ROWS);

    return { rows, truncated: hasMore && rows.length >= EXPORT_MAX_ROWS };
  }

  
  async exportFlows(request: ExportRequest): Promise<ExportResult> {
    const db = getD1Connection({} as Env);
    const repo = new FlowRepository(db);
    const flows = await repo.findAll();
    
    return this.formatExportData('flows', flows as unknown as Record<string, unknown>[], request);
  }


  private formatExportData(
    entityType: string,
    data: Record<string, unknown>[],
    request: ExportRequest,
    meta?: { limit?: number; truncated?: boolean }
  ): ExportResult {
    const { format, fields } = request;
    
    let fieldMappings: FieldMapping[] | string[] = fields || [];
    if (fieldMappings.length === 0) {
      fieldMappings = DEFAULT_FIELD_MAPPINGS[entityType] || [];
    }
    
    let formattedData: string;
    switch (format) {
      case 'csv':
        formattedData = convertToCSV(data, fieldMappings, { includeHeaders: true });
        break;
      case 'excel':
        formattedData = convertToCSV(data, fieldMappings, { includeHeaders: true });
        break;
      case 'json':
        formattedData = convertToJSON(data, fieldMappings);
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
    
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${entityType}-export-${timestamp}.${getFileExtension(format)}`;
    
    return {
      data: formattedData,
      contentType: getContentType(format),
      filename,
      format,
      rowCount: data.length,
      limit: meta?.limit ?? data.length,
      truncated: meta?.truncated ?? false,
    };
  }

  getAvailableFields(entityType: string): FieldMapping[] {
    return DEFAULT_FIELD_MAPPINGS[entityType] || [];
  }
}

export function createExportService(): ExportService {
  return new ExportService();
}
