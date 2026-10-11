/**
 * @fileoverview PropellerAds API 客户端
 * @description 管理 PropellerAds 流量平台的 Zone、出价、黑名单
 */

export interface PropellerAdsConfig {
  apiToken: string;
  baseUrl?: string;
}

export interface PropellerAdsZone {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'archived';
  bid: number;
  daily_budget: number;
}

export class PropellerAdsClient {
  private apiToken: string;
  private baseUrl: string;

  constructor(config: PropellerAdsConfig) {
    this.apiToken = config.apiToken;
    this.baseUrl = config.baseUrl || 'https://api.propellerads.com/v1';
  }

  /**
   * 禁用 Zone
   */
  async disableZone(zoneId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/zones/${zoneId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'paused' })
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error };
      }

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }

  /**
   * 调整出价
   */
  async updateBid(
    campaignId: string, 
    newBid: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/campaigns/${campaignId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ bid: newBid })
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error };
      }

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }

  /**
   * 调整预算
   */
  async updateBudget(
    campaignId: string,
    newBudget: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/campaigns/${campaignId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ daily_budget: newBudget })
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error };
      }

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }

  /**
   * 添加到黑名单
   */
  async addToBlacklist(
    campaignId: string,
    entityType: 'zone' | 'subid' | 'ip',
    entityValue: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/campaigns/${campaignId}/blacklist`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: entityType,
          value: entityValue
        })
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error };
      }

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }

  /**
   * 创建 Campaign
   */
  async createCampaign(config: {
    name: string;
    bid: number;
    daily_budget: number;
    targeting?: any;
  }): Promise<{ success: boolean; campaignId?: string; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/campaigns`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error };
      }

      const data = await response.json() as { id: string };
      return { success: true, campaignId: data.id };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }

  /**
   * 获取 Campaign 详情
   */
  async getCampaign(campaignId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/campaigns/${campaignId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get campaign: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[PropellerAds] Get campaign failed:', error);
      return null;
    }
  }
}
