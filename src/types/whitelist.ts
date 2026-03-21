/**
 * @fileoverview Whitelist 类型定义
 * @description 定义流量平台白名单相关类型
 * @module types/whitelist
 */

export type WhitelistStatus = 'active' | 'removed';
export type WhitelistType = 'zone' | 'creative' | 'publisher' | 'sub_id' | 'geo' | 'device' | 'ip' | 'user_agent';

/**
 * IP匹配模式
 */
export type IpMatchMode = 'exact' | 'cidr';

/**
 * UA匹配模式
 */
export type UaMatchMode = 'exact' | 'contains';

/**
 * 白名单条目
 */
export interface WhitelistEntry {
  id: string;
  trafficSourceId: string;
  type: WhitelistType;
  value: string; // Zone ID, Creative ID, IP, UA pattern, etc.
  name?: string; // Optional name/description
  reason?: string; // Why it was whitelisted
  status: WhitelistStatus;
  synced: boolean; // Whether synced to traffic source platform
  syncedAt?: string;
  campaignId?: string; // Optional: specific campaign
  // IP/UA specific fields
  ipMatchMode?: IpMatchMode; // 'exact' or 'cidr' for IP type
  uaMatchMode?: UaMatchMode; // 'exact' or 'contains' for UA type
  syncToPlatform?: boolean; // Whether to sync to traffic platform (for IP/UA)
  createdAt: string;
  updatedAt: string;
}

/**
 * 单个添加白名单 DTO
 */
export interface CreateWhitelistDTO {
  trafficSourceId: string;
  type: WhitelistType;
  value: string;
  name?: string;
  reason?: string;
  campaignId?: string;
  ipMatchMode?: IpMatchMode;
  uaMatchMode?: UaMatchMode;
  syncToPlatform?: boolean;
}

/**
 * 更新白名单 DTO
 */
export interface UpdateWhitelistDTO {
  name?: string;
  reason?: string;
  status?: WhitelistStatus;
  ipMatchMode?: IpMatchMode;
  uaMatchMode?: UaMatchMode;
  syncToPlatform?: boolean;
}

/**
 * 批量添加白名单 DTO
 */
export interface BatchWhitelistDTO {
  trafficSourceId: string;
  type: WhitelistType;
  items: Array<{
    value: string;
    name?: string;
    reason?: string;
    campaignId?: string;
    ipMatchMode?: IpMatchMode;
    uaMatchMode?: UaMatchMode;
    syncToPlatform?: boolean;
  }>;
}

/**
 * 白名单同步结果
 */
export interface WhitelistSyncResult {
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
 * 白名单查询参数
 */
export interface WhitelistQueryParams {
  trafficSourceId?: string;
  type?: WhitelistType;
  status?: WhitelistStatus;
  synced?: boolean;
  campaignId?: string;
}

/**
 * 报告中的白名单候选项目
 */
export interface WhitelistCandidate {
  type: WhitelistType;
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
