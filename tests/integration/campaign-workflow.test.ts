// Campaign Complete Workflow Integration Test
// Campaign 完整流程集成测试

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

// Mock D1 Database for testing
let testDb: any;
let testCampaignId: string;
let testClonedId: string;

beforeAll(async () => {
  // 初始化测试数据库连接
  console.log('Setting up integration test environment...');
});

afterAll(async () => {
  // 清理测试数据
  console.log('Cleaning up test data...');
});

describe('Campaign Complete Workflow Integration', () => {
  it('should complete full campaign lifecycle: Create → Add Flow → Clone → Bulk Operations', async () => {
    // ============================================
    // Step 1: 创建 Campaign
    // ============================================
    const createResponse = await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Integration Test Campaign',
        status: 'paused',
        trafficSource: 'PropellerAds',
        costModel: 'cpc',
        costValue: 0.5,
        dailyCap: 100,
      }),
    });

    expect(createResponse.status).toBe(201);
    const createData = await createResponse.json();
    expect(createData.success).toBe(true);
    expect(createData.data.id).toBeDefined();
    
    testCampaignId = createData.data.id;
    console.log('✅ Campaign created:', testCampaignId);

    // ============================================
    // Step 2: 验证 Campaign 创建
    // ============================================
    const getResponse = await fetch(`/api/campaigns/${testCampaignId}`);
    expect(getResponse.status).toBe(200);
    const getData = await getResponse.json();
    expect(getData.data.name).toBe('Integration Test Campaign');
    expect(getData.data.status).toBe('paused');
    
    console.log('✅ Campaign verified');

    // ============================================
    // Step 3: 添加 Flow
    // ============================================
    const flowResponse = await fetch('/api/flows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaignId: testCampaignId,
        name: 'Test Flow',
        weight: 100,
        type: 'default',
      }),
    });

    expect(flowResponse.status).toBe(201);
    const flowData = await flowResponse.json();
    expect(flowData.success).toBe(true);
    expect(flowData.data.id).toBeDefined();
    
    console.log('✅ Flow created:', flowData.data.id);

    // ============================================
    // Step 4: 克隆 Campaign
    // ============================================
    const cloneResponse = await fetch(`/api/campaigns/${testCampaignId}/clone`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        newName: 'Cloned Test Campaign',
        options: {
          cloneFlows: true,
          cloneOffers: true,
          cloneLandings: true,
          cloneAutorules: false,
          cloneStatus: false,
          cloneCost: true,
        },
      }),
    });

    expect(cloneResponse.status).toBe(200);
    const cloneData = await cloneResponse.json();
    expect(cloneData.success).toBe(true);
    expect(cloneData.data.clonedCampaign.id).toBeDefined();
    expect(cloneData.data.clonedCampaign.name).toBe('Cloned Test Campaign');
    
    testClonedId = cloneData.data.clonedCampaign.id;
    console.log('✅ Campaign cloned:', testClonedId);

    // ============================================
    // Step 5: 验证克隆的数据完整性
    // ============================================
    const clonedCampaign = await fetch(`/api/campaigns/${testClonedId}`);
    const clonedData = await clonedCampaign.json();
    
    // 验证基本字段
    expect(clonedData.data.name).toBe('Cloned Test Campaign');
    expect(clonedData.data.status).toBe('paused'); // 不克隆状态
    expect(clonedData.data.costModel).toBe('cpc'); // 克隆成本
    expect(clonedData.data.costValue).toBe(0.5);
    
    // 验证统计字段已清零
    expect(clonedData.data.clicks || 0).toBe(0);
    expect(clonedData.data.conversions || 0).toBe(0);
    expect(clonedData.data.revenue || 0).toBe(0);
    
    console.log('✅ Cloned campaign verified');

    // 验证克隆的 Flow
    const clonedFlows = await fetch(`/api/flows?campaignId=${testClonedId}`);
    const clonedFlowsData = await clonedFlows.json();
    expect(clonedFlowsData.data).toHaveLength(1);
    expect(clonedFlowsData.data[0].name).toBe('Test Flow');
    
    console.log('✅ Cloned flows verified');

    // ============================================
    // Step 6: 批量激活
    // ============================================
    const bulkActivateResponse = await fetch('/api/campaigns/bulk-activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaignIds: [testCampaignId, testClonedId],
      }),
    });

    expect(bulkActivateResponse.status).toBe(200);
    const bulkActivateData = await bulkActivateResponse.json();
    expect(bulkActivateData.success).toBe(true);
    expect(bulkActivateData.processed).toBe(2);
    expect(bulkActivateData.failed).toBe(0);
    
    console.log('✅ Bulk activate completed');

    // ============================================
    // Step 7: 验证批量激活结果
    // ============================================
    const campaign1 = await fetch(`/api/campaigns/${testCampaignId}`);
    const campaign2 = await fetch(`/api/campaigns/${testClonedId}`);
    
    const c1Data = await campaign1.json();
    const c2Data = await campaign2.json();
    
    expect(c1Data.data.status).toBe('active');
    expect(c2Data.data.status).toBe('active');
    
    console.log('✅ Campaigns activated');

    // ============================================
    // Step 8: 批量编辑
    // ============================================
    const bulkEditResponse = await fetch('/api/campaigns/bulk-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaignIds: [testCampaignId, testClonedId],
        updates: {
          costValue: 0.75,
          group: 'Test Group',
        },
      }),
    });

    expect(bulkEditResponse.status).toBe(200);
    const bulkEditData = await bulkEditResponse.json();
    expect(bulkEditData.success).toBe(true);
    expect(bulkEditData.processed).toBe(2);
    
    console.log('✅ Bulk edit completed');

    // 验证编辑结果
    const editedCampaign1 = await fetch(`/api/campaigns/${testCampaignId}`);
    const editedData1 = await editedCampaign1.json();
    expect(editedData1.data.costValue).toBe(0.75);
    expect(editedData1.data.group).toBe('Test Group');
    
    console.log('✅ Edit results verified');

    // ============================================
    // Step 9: 批量暂停
    // ============================================
    const bulkPauseResponse = await fetch('/api/campaigns/bulk-pause', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaignIds: [testCampaignId, testClonedId],
      }),
    });

    expect(bulkPauseResponse.status).toBe(200);
    const bulkPauseData = await bulkPauseResponse.json();
    expect(bulkPauseData.success).toBe(true);
    expect(bulkPauseData.processed).toBe(2);
    
    console.log('✅ Bulk pause completed');

    // ============================================
    // Step 10: 批量删除
    // ============================================
    const bulkDeleteResponse = await fetch('/api/campaigns/bulk-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaignIds: [testCampaignId, testClonedId],
        confirm: true,
      }),
    });

    expect(bulkDeleteResponse.status).toBe(200);
    const bulkDeleteData = await bulkDeleteResponse.json();
    expect(bulkDeleteData.success).toBe(true);
    expect(bulkDeleteData.processed).toBe(2);
    
    console.log('✅ Bulk delete completed');

    // ============================================
    // Step 11: 验证删除结果
    // ============================================
    const deletedCampaign = await fetch(`/api/campaigns/${testCampaignId}`);
    expect(deletedCampaign.status).toBe(404);
    
    const deletedCloned = await fetch(`/api/campaigns/${testClonedId}`);
    expect(deletedCloned.status).toBe(404);
    
    console.log('✅ Delete results verified');
    console.log('✅✅✅ Complete workflow test PASSED');
  });

  it('should handle bulk operations with validation errors', async () => {
    // 测试无效的 Campaign IDs
    const response = await fetch('/api/campaigns/bulk-activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaignIds: ['nonexistent-id-1', 'nonexistent-id-2'],
      }),
    });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBeDefined();
    expect(data.invalid).toContain('nonexistent-id-1');
    
    console.log('✅ Validation error handling verified');
  });

  it('should handle concurrent operations', async () => {
    // 创建测试 Campaign
    const campaign1 = await createTestCampaign('Concurrent Test 1');
    const campaign2 = await createTestCampaign('Concurrent Test 2');
    const campaign3 = await createTestCampaign('Concurrent Test 3');

    // 并发批量操作
    const results = await Promise.all([
      fetch('/api/campaigns/bulk-activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignIds: [campaign1.id] }),
      }),
      fetch('/api/campaigns/bulk-pause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignIds: [campaign2.id] }),
      }),
      fetch(`/api/campaigns/${campaign3.id}/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newName: 'Concurrent Clone' }),
      }),
    ]);

    // 验证所有操作成功
    for (const result of results) {
      expect(result.status).toBe(200);
    }
    
    console.log('✅ Concurrent operations verified');
  });
});

// Helper function
async function createTestCampaign(name: string) {
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
