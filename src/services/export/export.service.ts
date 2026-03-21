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
import { ConversionRepository } from '@/handlers/d1/conversion.repo';
import { FlowRepository } from '@/handlers/d1/flow.repo';
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
}

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
    const { dateRange, filters } = request;
    
    const result = await repo.findClicks({
      startDate: dateRange?.startDate,
      endDate: dateRange?.endDate,
      campaignId: filters?.campaignId as string,
      offerId: filters?.offerId as string,
      page: 1,
      pageSize: 10000,
    });
    
    return this.formatExportData('clicks', result.list as unknown as Record<string, unknown>[], request);
  }

  async exportConversions(request: ExportRequest): Promise<ExportResult> {
    const db = getD1Connection({} as Env);
    const repo = new ConversionRepository(db);
    const { dateRange, filters } = request;
    
    const result = await repo.findConversions({
      startDate: dateRange?.startDate,
      endDate: dateRange?.endDate,
      campaignId: filters?.campaignId as string,
      offerId: filters?.offerId as string,
      page: 1,
      pageSize: 10000,
    });
    
    return this.formatExportData('conversions', result.list as unknown as Record<string, unknown>[], request);
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
    request: ExportRequest
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
    };
  }

  getAvailableFields(entityType: string): FieldMapping[] {
    return DEFAULT_FIELD_MAPPINGS[entityType] || [];
  }
}

export function createExportService(): ExportService {
  return new ExportService();
}
