/**
 * @fileoverview PropellerAds 平台适配器
 * @description 实现 PropellerAds REST API 集成
 * @module services/platform/propellerads
 */

import { PlatformAdapter } from './adapter';
import type { PlatformInfo, PlatformActionResult, PropellerAdsConfig } from '@/types/platform';

export class PropellerAdsAdapter extends PlatformAdapter<PropellerAdsConfig> {
  private initialized = false;
  private baseUrl: string;

  constructor(config: PropellerAdsConfig) {
    super(config);
    this.baseUrl = config.apiUrl || 'https://ssp-api.propellerads.com/v5';
  }

  getInfo(): PlatformInfo {
    return {
      id: 'propellerads',
      name: 'PropellerAds',
      type: 'rest',
      version: '1.0.0',
      description: 'PropellerAds REST API integration for traffic management',
      actions: [
        'pause_campaign',
        'start_campaign',
        'adjust_bid',
        'exclude_zone',
        'include_zone',
        'get_campaign_data',
        'get_campaign_stats',
        'get_balance',
      ],
    };
  }

  async initialize(): Promise<void> {
    if (!this.config.apiKey) {
      throw new Error('Missing required configuration: apiKey');
    }
    this.initialized = true;
  }

  async execute(action: string, parameters: Record<string, unknown>): Promise<PlatformActionResult> {
    if (!this.initialized) {
      return {
        success: false,
        message: 'Platform not initialized',
      };
    }

    switch (action) {
      case 'pause_campaign':
        return this.pauseCampaign(parameters.campaignId as string);
      case 'start_campaign':
        return this.startCampaign(parameters.campaignId as string);
      case 'adjust_bid':
        return this.adjustBid(parameters.campaignId as string, parameters.bid as number);
      case 'get_campaign_data':
        return this.getCampaignData(parameters.campaignId as string);
      case 'get_campaign_stats':
        return this.getCampaignStats(parameters.campaignId as string);
      case 'get_balance':
        return this.getBalance();
      case 'exclude_zone':
        return this.excludeZone(
          parameters.campaignId as string,
          parameters.zoneId as string | number
        );
      case 'include_zone':
        return this.includeZone(
          parameters.campaignId as string,
          parameters.zoneId as string | number
        );
      default:
        return {
          success: false,
          message: `Action ${action} not supported`,
        };
    }
  }

  validateConfig(): boolean {
    return !!this.config.apiKey;
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.makeRequest('/info', 'GET');
      return response.ok;
    } catch {
      return false;
    }
  }

  private async pauseCampaign(campaignId: string): Promise<PlatformActionResult> {
    try {
      const response = await this.makeRequest(`/campaigns/${campaignId}`, 'PATCH', {
        status: 3,
      });

      if (response.ok) {
        return {
          success: true,
          message: `Campaign ${campaignId} paused successfully`,
        };
      }

      const error = await response.text();
      return {
        success: false,
        message: `Failed to pause campaign: ${error}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Error pausing campaign: ${error}`,
      };
    }
  }

  private async startCampaign(campaignId: string): Promise<PlatformActionResult> {
    try {
      const response = await this.makeRequest(`/campaigns/${campaignId}`, 'PATCH', {
        status: 1,
      });

      if (response.ok) {
        return {
          success: true,
          message: `Campaign ${campaignId} started successfully`,
        };
      }

      const error = await response.text();
      return {
        success: false,
        message: `Failed to start campaign: ${error}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Error starting campaign: ${error}`,
      };
    }
  }

  private async adjustBid(campaignId: string, bid: number): Promise<PlatformActionResult> {
    try {
      const response = await this.makeRequest(`/campaigns/${campaignId}`, 'PATCH', {
        cpc: bid,
      });

      if (response.ok) {
        return {
          success: true,
          message: `Bid adjusted to ${bid} for campaign ${campaignId}`,
        };
      }

      const error = await response.text();
      return {
        success: false,
        message: `Failed to adjust bid: ${error}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Error adjusting bid: ${error}`,
      };
    }
  }

  private async getCampaignData(campaignId: string): Promise<PlatformActionResult> {
    try {
      const response = await this.makeRequest(`/campaigns/${campaignId}`, 'GET');

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          message: 'Campaign data retrieved',
          data: data as Record<string, unknown>,
        };
      }

      const error = await response.text();
      return {
        success: false,
        message: `Failed to get campaign data: ${error}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Error getting campaign data: ${error}`,
      };
    }
  }

  private async getCampaignStats(campaignId: string): Promise<PlatformActionResult> {
    try {
      const response = await this.makeRequest(`/campaigns/${campaignId}/stats`, 'GET');

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          message: 'Campaign stats retrieved',
          data: data as Record<string, unknown>,
        };
      }

      const error = await response.text();
      return {
        success: false,
        message: `Failed to get campaign stats: ${error}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Error getting campaign stats: ${error}`,
      };
    }
  }

  private async getBalance(): Promise<PlatformActionResult> {
    try {
      const response = await this.makeRequest('/balance', 'GET');

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          message: 'Balance retrieved',
          data: data as Record<string, unknown>,
        };
      }

      const error = await response.text();
      return {
        success: false,
        message: `Failed to get balance: ${error}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Error getting balance: ${error}`,
      };
    }
  }

  /**
   * 排除特定 Zone（根据统计数据自动暂停某个投放位置）
   * API: PUT /adv/campaigns/{campaignId}/targeting/exclude/zone
   */
  private async excludeZone(
    campaignId: string,
    zoneId: string | number
  ): Promise<PlatformActionResult> {
    try {
      const response = await this.makeRequest(
        `/adv/campaigns/${campaignId}/targeting/exclude/zone`,
        'PUT',
        {
          zones: [Number(zoneId)],
        }
      );

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          message: `Zone ${zoneId} excluded from campaign ${campaignId} successfully`,
          data: data as Record<string, unknown>,
        };
      }

      const error = await response.text();
      return {
        success: false,
        message: `Failed to exclude zone ${zoneId}: ${error}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Error excluding zone ${zoneId}: ${error}`,
      };
    }
  }

  /**
   * 恢复特定 Zone（将 Zone 从排除列表中移除）
   * API: PUT /adv/campaigns/{campaignId}/targeting/include/zone
   */
  private async includeZone(
    campaignId: string,
    zoneId: string | number
  ): Promise<PlatformActionResult> {
    try {
      const response = await this.makeRequest(
        `/adv/campaigns/${campaignId}/targeting/include/zone`,
        'PUT',
        {
          zones: [Number(zoneId)],
        }
      );

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          message: `Zone ${zoneId} included in campaign ${campaignId} successfully`,
          data: data as Record<string, unknown>,
        };
      }

      const error = await response.text();
      return {
        success: false,
        message: `Failed to include zone ${zoneId}: ${error}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Error including zone ${zoneId}: ${error}`,
      };
    }
  }

  private async makeRequest(
    path: string,
    method: string,
    body?: unknown
  ): Promise<Response> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.config.apiKey}`,
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    return fetch(url, options);
  }
}
