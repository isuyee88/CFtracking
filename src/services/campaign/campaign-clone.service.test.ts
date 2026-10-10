// Campaign Clone Service - Unit Tests

import { describe, it, expect, beforeEach } from 'vitest';
import { CampaignCloneService } from './campaign-clone.service';

// Mock D1 Database
const createMockDB = () => {
  const mockData = {
    campaigns: new Map(),
    flows: new Map(),
    campaign_offers: [],
    campaign_landings: [],
    autorule_bindings: []
  };
  
  return {
    prepare: (sql: string) => ({
      bind: (...params: any[]) => ({
        run: async () => ({ success: true }),
        first: async () => {
          if (sql.includes('SELECT * FROM campaigns WHERE id')) {
            return mockData.campaigns.get(params[0]);
          }
          if (sql.includes('SELECT COUNT')) {
            const count = Array.from(mockData.campaigns.values())
              .filter((c: any) => c.name === params[0]).length;
            return { count };
          }
          return null;
        },
        all: async () => {
          if (sql.includes('FROM flows')) {
            return { results: [] };
          }
          if (sql.includes('FROM campaign_offers')) {
            return { results: [] };
          }
          if (sql.includes('FROM campaign_landings')) {
            return { results: [] };
          }
          if (sql.includes('FROM autorule_bindings')) {
            return { results: [] };
          }
          return { results: [] };
        }
      })
    }),
    mockData
  };
};

describe('CampaignCloneService', () => {
  let service: CampaignCloneService;
  let mockDB: any;
  
  beforeEach(() => {
    mockDB = createMockDB();
    service = new CampaignCloneService(mockDB as any);
  });
  
  describe('clone()', () => {
    it('should clone a campaign with default options', async () => {
      // 准备测试数据
      const originalCampaign = {
        id: 'camp-original',
        name: 'Original Campaign',
        traffic_source_id: 'ts-1',
        default_landing_url: 'https://example.com',
        status: 'active',
        daily_cap: 1000,
        cost_model: 'cpc',
        cost_value: 0.5,
        total_clicks: 1000,
        total_conversions: 50,
        total_revenue: 500,
        total_cost: 250
      };
      
      mockDB.mockData.campaigns.set('camp-original', originalCampaign);
      
      // 执行克隆
      const result = await service.clone('camp-original', 'Cloned Campaign');
      
      // 验证结果
      expect(result.success).toBe(true);
      expect(result.data.clonedCampaign.name).toBe('Cloned Campaign');
      expect(result.data.clonedCampaign.id).not.toBe('camp-original');
      expect(result.data.clonedCampaign.status).toBe('paused'); // 默认 paused
      expect(result.data.clonedCampaign.total_clicks).toBe(0); // 统计清零
      expect(result.data.clonedCampaign.total_conversions).toBe(0);
      expect(result.message).toContain('Cloned Campaign');
    });
    
    it('should preserve status when cloneStatus option is true', async () => {
      const originalCampaign = {
        id: 'camp-1',
        name: 'Test Campaign',
        status: 'active',
        traffic_source_id: 'ts-1',
        default_landing_url: 'https://example.com',
        daily_cap: null,
        cost_model: null,
        cost_value: null,
        total_clicks: 0,
        total_conversions: 0,
        total_revenue: 0,
        total_cost: 0
      };
      
      mockDB.mockData.campaigns.set('camp-1', originalCampaign);
      
      const result = await service.clone('camp-1', 'Clone', {
        cloneStatus: true
      });
      
      expect(result.data.clonedCampaign.status).toBe('active');
    });
    
    it('should generate unique name when conflict exists', async () => {
      const originalCampaign = {
        id: 'camp-1',
        name: 'Test Campaign',
        status: 'active',
        traffic_source_id: 'ts-1',
        default_landing_url: 'https://example.com',
        daily_cap: null,
        cost_model: null,
        cost_value: null,
        total_clicks: 0,
        total_conversions: 0,
        total_revenue: 0,
        total_cost: 0
      };
      
      // 已存在一个同名 Campaign
      mockDB.mockData.campaigns.set('camp-1', originalCampaign);
      mockDB.mockData.campaigns.set('camp-2', {
        ...originalCampaign,
        id: 'camp-2',
        name: 'Test Campaign - Copy'
      });
      
      const result = await service.clone('camp-1', 'Test Campaign - Copy');
      
      // 应该生成 "Test Campaign - Copy 1"
      expect(result.data.clonedCampaign.name).toMatch(/Test Campaign - Copy \d+/);
    });
    
    it('should throw error when original campaign not found', async () => {
      await expect(
        service.clone('non-existent', 'Clone')
      ).rejects.toThrow('Campaign with ID \'non-existent\' not found');
    });
    
    it('should return correct counts when cloning related data', async () => {
      const originalCampaign = {
        id: 'camp-1',
        name: 'Test',
        traffic_source_id: 'ts-1',
        default_landing_url: 'https://example.com',
        status: 'active',
        daily_cap: null,
        cost_model: null,
        cost_value: null,
        total_clicks: 0,
        total_conversions: 0,
        total_revenue: 0,
        total_cost: 0
      };
      
      mockDB.mockData.campaigns.set('camp-1', originalCampaign);
      
      // Mock 有关联数据
      mockDB.prepare = (sql: string) => ({
        bind: (...params: any[]) => ({
          run: async () => ({ success: true }),
          first: async () => {
            if (sql.includes('SELECT * FROM campaigns WHERE id')) {
              return mockDB.mockData.campaigns.get(params[0]);
            }
            if (sql.includes('SELECT COUNT')) {
              return { count: 0 };
            }
            return null;
          },
          all: async () => {
            if (sql.includes('FROM flows')) {
              return { results: [{ id: 'flow-1', name: 'Flow 1' }] };
            }
            if (sql.includes('FROM campaign_offers')) {
              return { results: [{ offer_id: 'offer-1' }] };
            }
            if (sql.includes('FROM campaign_landings')) {
              return { results: [{ landing_page_id: 'lp-1' }] };
            }
            if (sql.includes('FROM autorule_bindings')) {
              return { results: [{ id: 'rule-1' }] };
            }
            return { results: [] };
          }
        })
      });
      
      const result = await service.clone('camp-1', 'Clone');
      
      expect(result.data.clonedFlowCount).toBe(1);
      expect(result.data.clonedOfferCount).toBe(1);
      expect(result.data.clonedLandingCount).toBe(1);
      expect(result.data.clonedAutoruleCount).toBe(1);
    });
    
    it('should skip flows when cloneFlows option is false', async () => {
      const originalCampaign = {
        id: 'camp-1',
        name: 'Test',
        traffic_source_id: 'ts-1',
        default_landing_url: 'https://example.com',
        status: 'active',
        daily_cap: null,
        cost_model: null,
        cost_value: null,
        total_clicks: 0,
        total_conversions: 0,
        total_revenue: 0,
        total_cost: 0
      };
      
      mockDB.mockData.campaigns.set('camp-1', originalCampaign);
      
      const result = await service.clone('camp-1', 'Clone', {
        cloneFlows: false
      });
      
      expect(result.data.clonedFlowCount).toBe(0);
    });
  });
});
