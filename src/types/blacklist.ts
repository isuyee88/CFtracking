/**
 * @fileoverview Blacklist 类型定义
 * @description 定义流量平台黑名单相关类型
 * @module types/blacklist
 */

export type BlacklistStatus = 'active' | 'removed';
export type BlacklistType = 'zone' | 'creative' | 'publisher' | 'sub_id' | 'geo' | 'device';

/**
 * 黑名单条目
 */
export interface BlacklistEntry {
  id: string;
  trafficSourceId: string;
  type: BlacklistType;
  value: string; // Zone ID, Creative ID, etc.
  name?: string; // Optional name/description
  reason?: string; // Why it was blacklisted
  status: BlacklistStatus;
  synced: boolean; // Whether synced to traffic source platform
  syncedAt?: string;
  campaignId?: string; // Optional: specific campaign
  createdAt: string;
  updatedAt: string;
}

/**
 * 批量添加黑名单 DTO
 */
export interface BatchBlacklistDTO {
  trafficSourceId: string;
  type: BlacklistType;
  items: Array<{
    value: string;
    name?: string;
    reason?: string;
    campaignId?: string;
  }>;
}

/**
 * 黑名单同步结果
 */
export interface BlacklistSyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: Array<{
    entryId: string;
    value: string;
    error: string;
  }>;
}

/**
 * 黑名单查询参数
 */
export interface BlacklistQueryParams {
  trafficSourceId?: string;
  type?: BlacklistType;
  status?: BlacklistStatus;
  synced?: boolean;
  campaignId?: string;
}

/**
 * 报告中的黑名单候选项目
 */
export interface BlacklistCandidate {
  type: BlacklistType;
  value: string;
  name?: string;
  metrics: {
    impressions: number;
    clicks: number;
    conversions: number;
    spend: number;
    revenue: number;
    roi: number;
  };
  campaignId?: string;
}
