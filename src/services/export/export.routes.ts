/**
 * @fileoverview Export API Routes
 * @description Handles HTTP requests for data export functionality
 * @module services/export/export.routes
 * 
 * Input: HTTP requests with export parameters
 * Output: Export files (CSV, Excel, JSON) as downloadable responses
 * Logic Interaction: Uses ExportService for data processing
 * Frontend-Backend: API endpoints for ExportButton component
 */

import { Hono } from 'hono';
import type { Context } from 'hono';
import type { Env } from '@/config/env';
import { createExportService, type ExportRequest } from './export.service';
import type { ExportFormat } from '@/utils/export.formatter';
import { success, error } from '@/utils/response';
import { HTTP_STATUS, ERROR_CODES } from '@/config/constants';

export function createExportRouter(): Hono<{ Bindings: Env }> {
  const router = new Hono<{ Bindings: Env }>();

  router.get('/campaigns', async (c) => {
    try {
      const request = parseExportRequest(c, 'campaigns');
      const service = createExportService();
      const result = await service.exportCampaigns(request);
      
      return createExportResponse(c, result);
    } catch (err) {
      console.error('Export campaigns error:', err);
      return c.json(
        error(err instanceof Error ? err.message : 'Export failed', ERROR_CODES.UNKNOWN),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  router.get('/landing-pages', async (c) => {
    try {
      const request = parseExportRequest(c, 'landing-pages');
      const service = createExportService();
      const result = await service.exportLandingPages(request);
      
      return createExportResponse(c, result);
    } catch (err) {
      console.error('Export landing pages error:', err);
      return c.json(
        error(err instanceof Error ? err.message : 'Export failed', ERROR_CODES.UNKNOWN),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  router.get('/offers', async (c) => {
    try {
      const request = parseExportRequest(c, 'offers');
      const service = createExportService();
      const result = await service.exportOffers(request);
      
      return createExportResponse(c, result);
    } catch (err) {
      console.error('Export offers error:', err);
      return c.json(
        error(err instanceof Error ? err.message : 'Export failed', ERROR_CODES.UNKNOWN),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  router.get('/traffic-sources', async (c) => {
    try {
      const request = parseExportRequest(c, 'traffic-sources');
      const service = createExportService();
      const result = await service.exportTrafficSources(request);
      
      return createExportResponse(c, result);
    } catch (err) {
      console.error('Export traffic sources error:', err);
      return c.json(
        error(err instanceof Error ? err.message : 'Export failed', ERROR_CODES.UNKNOWN),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  router.get('/affiliate-networks', async (c) => {
    try {
      const request = parseExportRequest(c, 'affiliate-networks');
      const service = createExportService();
      const result = await service.exportAffiliateNetworks(request);
      
      return createExportResponse(c, result);
    } catch (err) {
      console.error('Export affiliate networks error:', err);
      return c.json(
        error(err instanceof Error ? err.message : 'Export failed', ERROR_CODES.UNKNOWN),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  router.get('/clicks', async (c) => {
    try {
      const request = parseExportRequest(c, 'clicks');
      const service = createExportService();
      const result = await service.exportClicks(request);
      
      return createExportResponse(c, result);
    } catch (err) {
      console.error('Export clicks error:', err);
      return c.json(
        error(err instanceof Error ? err.message : 'Export failed', ERROR_CODES.UNKNOWN),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  router.get('/conversions', async (c) => {
    try {
      const request = parseExportRequest(c, 'conversions');
      const service = createExportService();
      const result = await service.exportConversions(request);
      
      return createExportResponse(c, result);
    } catch (err) {
      console.error('Export conversions error:', err);
      return c.json(
        error(err instanceof Error ? err.message : 'Export failed', ERROR_CODES.UNKNOWN),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  router.post('/custom', async (c) => {
    try {
      const body = await c.req.json();
      const service = createExportService();
      
      const request: ExportRequest = {
        entityType: body.entityType,
        format: (body.format || 'csv') as ExportFormat,
        fields: body.fields,
        filters: body.filters,
        dateRange: body.dateRange,
      };
      
      let result;
      switch (request.entityType) {
        case 'campaigns':
          result = await service.exportCampaigns(request);
          break;
        case 'landing-pages':
          result = await service.exportLandingPages(request);
          break;
        case 'offers':
          result = await service.exportOffers(request);
          break;
        case 'traffic-sources':
          result = await service.exportTrafficSources(request);
          break;
        case 'affiliate-networks':
          result = await service.exportAffiliateNetworks(request);
          break;
        case 'clicks':
          result = await service.exportClicks(request);
          break;
        case 'conversions':
          result = await service.exportConversions(request);
          break;
        default:
          return c.json(
            error(`Unsupported entity type: ${request.entityType}`, ERROR_CODES.VALIDATION),
            HTTP_STATUS.BAD_REQUEST
          );
      }
      
      return createExportResponse(c, result);
    } catch (err) {
      console.error('Custom export error:', err);
      return c.json(
        error(err instanceof Error ? err.message : 'Export failed', ERROR_CODES.UNKNOWN),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  router.get('/fields/:entityType', async (c) => {
    try {
      const entityType = c.req.param('entityType');
      const service = createExportService();
      const fields = service.getAvailableFields(entityType);
      
      return c.json(success({ entityType, fields }));
    } catch (err) {
      console.error('Get export fields error:', err);
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to get fields', ERROR_CODES.UNKNOWN),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  return router;
}

function parseExportRequest(c: Context, entityType: ExportRequest['entityType']): ExportRequest {
  const query = c.req.query();
  
  let fields: string[] | undefined;
  if (query.fields) {
    fields = query.fields.split(',').map((f: string) => f.trim());
  }
  
  let dateRange: ExportRequest['dateRange'];
  if (query.startDate || query.endDate) {
    dateRange = {
      startDate: query.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: query.endDate || new Date().toISOString(),
    };
  }
  
  const filters: ExportRequest['filters'] = {};
  if (query.status) filters.status = query.status;
  if (query.search) filters.search = query.search;
  if (query.campaignId) filters.campaignId = query.campaignId;
  if (query.offerId) filters.offerId = query.offerId;
  
  return {
    entityType,
    format: (query.format || 'csv') as ExportFormat,
    fields,
    filters: Object.keys(filters).length > 0 ? filters : undefined,
    dateRange,
  };
}

function createExportResponse(_c: Context, result: { data: string; contentType: string; filename: string }): Response {
  const headers = new Headers();
  headers.set('Content-Type', result.contentType);
  headers.set('Content-Disposition', `attachment; filename="${result.filename}"`);
  
  return new Response(result.data, { headers });
}
