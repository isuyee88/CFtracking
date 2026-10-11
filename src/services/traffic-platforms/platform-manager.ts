/**
 * @fileoverview 流量平台 API 管理器
 * @description 统一管理多个流量平台 API 客户端
 */

import type { Env } from '@/config/env';
import { PropellerAdsClient } from './propellerads.client';

export class TrafficPlatformManager {
  private propellerAds?: PropellerAdsClient;

  constructor(private env: Env) {
    this.initializeClients();
  }

  /**
   * 初始化 API 客户端
   */
  private initializeClients(): void {
    // PropellerAds
    const propellerToken = this.env.PROPELLERADS_API_TOKEN;
    if (propellerToken) {
      this.propellerAds = new PropellerAdsClient({
        apiToken: propellerToken
      });
      console.log('[TrafficPlatform] PropellerAds client initialized');
    }

    // TODO: 添加更多平台
    // - MaxConv
    // - Monetizer
    // - etc.
  }

  /**
   * 禁用 Zone
   */
  async disableZone(
    platform: string,
    zoneId: string
  ): Promise<{ success: boolean; error?: string }> {
    switch (platform.toLowerCase()) {
      case 'propellerads':
        if (!this.propellerAds) {
          return { success: false, error: 'PropellerAds client not initialized' };
        }
        return await this.propellerAds.disableZone(zoneId);

      default:
        return { success: false, error: `Unsupported platform: ${platform}` };
    }
  }

  /**
   * 调整出价
   */
  async updateBid(
    platform: string,
    campaignId: string,
    newBid: number
  ): Promise<{ success: boolean; error?: string }> {
    switch (platform.toLowerCase()) {
      case 'propellerads':
        if (!this.propellerAds) {
          return { success: false, error: 'PropellerAds client not initialized' };
        }
        return await this.propellerAds.updateBid(campaignId, newBid);

      default:
        return { success: false, error: `Unsupported platform: ${platform}` };
    }
  }

  /**
   * 调整预算
   */
  async updateBudget(
    platform: string,
    campaignId: string,
    newBudget: number
  ): Promise<{ success: boolean; error?: string }> {
    switch (platform.toLowerCase()) {
      case 'propellerads':
        if (!this.propellerAds) {
          return { success: false, error: 'PropellerAds client not initialized' };
        }
        return await this.propellerAds.updateBudget(campaignId, newBudget);

      default:
        return { success: false, error: `Unsupported platform: ${platform}` };
    }
  }

  /**
   * 添加到黑名单
   */
  async addToBlacklist(
    platform: string,
    campaignId: string,
    entityType: 'zone' | 'subid' | 'ip',
    entityValue: string
  ): Promise<{ success: boolean; error?: string }> {
    switch (platform.toLowerCase()) {
      case 'propellerads':
        if (!this.propellerAds) {
          return { success: false, error: 'PropellerAds client not initialized' };
        }
        return await this.propellerAds.addToBlacklist(campaignId, entityType, entityValue);

      default:
        return { success: false, error: `Unsupported platform: ${platform}` };
    }
  }

  /**
   * 创建 Campaign
   */
  async createCampaign(
    platform: string,
    config: any
  ): Promise<{ success: boolean; campaignId?: string; error?: string }> {
    switch (platform.toLowerCase()) {
      case 'propellerads':
        if (!this.propellerAds) {
          return { success: false, error: 'PropellerAds client not initialized' };
        }
        return await this.propellerAds.createCampaign(config);

      default:
        return { success: false, error: `Unsupported platform: ${platform}` };
    }
  }

  /**
   * 检查平台是否可用
   */
  isPlatformAvailable(platform: string): boolean {
    switch (platform.toLowerCase()) {
      case 'propellerads':
        return !!this.propellerAds;
      default:
        return false;
    }
  }
}
