// Campaign Clone API Routes - Integration Tests

import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { cloneRouter } from './campaign-clone.routes';

// Mock environment
const createMockEnv = () => {
  const campaigns = new Map();
  campaigns.set('camp-123', {
    id: 'camp-123',
    name: 'Test Campaign',
    traffic_source_id: 'ts-1',
    default_landing_url: 'https://example.com',
    status: 'active',
    daily_cap: 1000,
    cost_model: 'cpc',
    cost_value: 0.5,
    total_clicks: 1000,
    total_conversions: 50,
    total_revenue: 500,
    total_cost: 250,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z'
  });
  
  return {
    DB: {
      prepare: (sql: string) => ({
        bind: (...params: any[]) => ({
          run: async () => ({ success: true }),
          first: async () => {
            if (sql.includes('SELECT * FROM campaigns WHERE id')) {
              return campaigns.get(params[0]);
            }
            if (sql.includes('SELECT COUNT')) {
              return { count: 0 };
            }
            return null;
          },
          all: async () => ({ results: [] })
        })
      })
    }
  };
};

describe('Campaign Clone Routes', () => {
  let app: Hono;
  let mockEnv: any;
  
  beforeEach(() => {
    app = new Hono();
    mockEnv = createMockEnv();
    app.route('/api', cloneRouter);
  });
  
  describe('POST /api/campaigns/:id/clone', () => {
    it('should clone a campaign successfully', async () => {
      const response = await app.request('/api/campaigns/camp-123/clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newName: 'Cloned Campaign'
        })
      }, mockEnv);
      
      expect(response.status).toBe(200);
      const data = await response.json() as {
        success: boolean;
        error?: string;
        data: { clonedCampaign: { name: string } };
      };
      expect(data.success).toBe(true);
      expect(data.data.clonedCampaign.name).toBe('Cloned Campaign');
    });
    
    it('should accept custom options', async () => {
      const response = await app.request('/api/campaigns/camp-123/clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newName: 'Clone with Options',
          options: {
            cloneStatus: true,
            cloneFlows: false
          }
        })
      }, mockEnv);
      
      expect(response.status).toBe(200);
      const data = await response.json() as {
        success: boolean;
        error?: string;
        data: { clonedCampaign: { name: string } };
      };
      expect(data.success).toBe(true);
    });
    
    it('should return 400 for missing newName', async () => {
      const response = await app.request('/api/campaigns/camp-123/clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      }, mockEnv);
      
      expect(response.status).toBe(400);
      const data = await response.json() as {
        success: boolean;
        error?: string;
        data: { clonedCampaign: { name: string } };
      };
      expect(data.success).toBe(false);
      expect(data.error).toBe('Validation error');
    });
    
    it('should return 404 for non-existent campaign', async () => {
      const response = await app.request('/api/campaigns/non-existent/clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newName: 'Clone'
        })
      }, mockEnv);
      
      expect(response.status).toBe(404);
      const data = await response.json() as {
        success: boolean;
        error?: string;
        data: { clonedCampaign: { name: string } };
      };
      expect(data.success).toBe(false);
      expect(data.error).toContain('not found');
    });
    
    it('should return 400 for invalid newName (empty)', async () => {
      const response = await app.request('/api/campaigns/camp-123/clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newName: ''
        })
      }, mockEnv);
      
      expect(response.status).toBe(400);
      const data = await response.json() as {
        success: boolean;
        error?: string;
        data: { clonedCampaign: { name: string } };
      };
      expect(data.success).toBe(false);
    });
    
    it('should use default options when not provided', async () => {
      const response = await app.request('/api/campaigns/camp-123/clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newName: 'Default Options Clone'
        })
      }, mockEnv);
      
      expect(response.status).toBe(200);
      const data = await response.json() as {
        success: boolean;
        error?: string;
        data: { clonedCampaign: { name: string } };
      };
      expect(data.success).toBe(true);
      // 默认 options 应该被应用
    });
  });
});
