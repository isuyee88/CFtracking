// API Endpoints Integration Test
// API 端点集成测试

import { describe, it, expect } from 'vitest';

describe('API Endpoints Integration', () => {
  describe('Health and Deployment', () => {
    it('should return healthy status', async () => {
      const response = await fetch('/health');
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('healthy');
      expect(data.data.timestamp).toBeDefined();
      expect(data.error).toBeNull();
    });

    it('should return deployment info', async () => {
      const response = await fetch('/api/deployment/info');
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.data.version).toBeDefined();
      expect(data.data.environment).toBeDefined();
    });
  });

  describe('Campaign CRUD', () => {
    let campaignId: string;

    it('should create a campaign', async () => {
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'API Test Campaign',
          status: 'paused',
          trafficSource: 'Test Source',
          costModel: 'cpc',
          costValue: 1.0,
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.data.id).toBeDefined();
      expect(data.data.name).toBe('API Test Campaign');
      
      campaignId = data.data.id;
    });

    it('should read a campaign', async () => {
      const response = await fetch(`/api/campaigns/${campaignId}`);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(campaignId);
      expect(data.data.name).toBe('API Test Campaign');
    });

    it('should update a campaign', async () => {
      const response = await fetch(`/api/campaigns/${campaignId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Updated API Test Campaign',
          costValue: 1.5,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('Updated API Test Campaign');
      expect(data.data.costValue).toBe(1.5);
    });

    it('should delete a campaign', async () => {
      const response = await fetch(`/api/campaigns/${campaignId}`, {
        method: 'DELETE',
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);

      // 验证删除
      const getResponse = await fetch(`/api/campaigns/${campaignId}`);
      expect(getResponse.status).toBe(404);
    });
  });

  describe('Clone API', () => {
    it('should clone a campaign with all options', async () => {
      // 创建源 Campaign
      const createResponse = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Source Campaign',
          status: 'active',
          costModel: 'cpc',
          costValue: 0.8,
        }),
      });

      const createData = await createResponse.json();
      const sourceId = createData.data.id;

      // 克隆
      const cloneResponse = await fetch(`/api/campaigns/${sourceId}/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newName: 'Cloned Campaign',
          options: {
            cloneFlows: true,
            cloneOffers: true,
            cloneLandings: true,
          },
        }),
      });

      expect(cloneResponse.status).toBe(200);
      const cloneData = await cloneResponse.json();
      
      expect(cloneData.success).toBe(true);
      expect(cloneData.data.clonedCampaign.name).toBe('Cloned Campaign');
      expect(cloneData.data.clonedCampaign.id).not.toBe(sourceId);
    });

    it('should return 404 for nonexistent campaign', async () => {
      const response = await fetch('/api/campaigns/nonexistent/clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newName: 'Test' }),
      });

      expect(response.status).toBe(404);
    });
  });

  describe('Bulk Operations API', () => {
    let testIds: string[] = [];

    beforeEach(async () => {
      // 创建测试数据
      const campaigns = await Promise.all([
        createCampaign('Bulk Test 1'),
        createCampaign('Bulk Test 2'),
        createCampaign('Bulk Test 3'),
      ]);

      testIds = campaigns.map(c => c.id);
    });

    it('should bulk activate campaigns', async () => {
      const response = await fetch('/api/campaigns/bulk-activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignIds: testIds }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.processed).toBe(3);
      expect(data.failed).toBe(0);
    });

    it('should bulk pause campaigns', async () => {
      const response = await fetch('/api/campaigns/bulk-pause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignIds: testIds }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should bulk update campaigns', async () => {
      const response = await fetch('/api/campaigns/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignIds: testIds,
          updates: {
            costValue: 2.0,
            group: 'Bulk Updated',
          },
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.processed).toBe(3);
    });

    it('should bulk delete campaigns', async () => {
      const response = await fetch('/api/campaigns/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignIds: testIds,
          confirm: true,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.processed).toBe(3);
    });

    it('should validate campaign IDs', async () => {
      const response = await fetch('/api/campaigns/bulk-activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignIds: ['invalid-1', 'invalid-2'],
        }),
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.invalid).toEqual(['invalid-1', 'invalid-2']);
    });
  });
});

// Helper
async function createCampaign(name: string) {
  const response = await fetch('/api/campaigns', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      status: 'paused',
      costModel: 'cpc',
      costValue: 0.5,
    }),
  });

  const data = await response.json();
  return data.data;
}
