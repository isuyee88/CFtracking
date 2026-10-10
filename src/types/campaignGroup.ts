/**
 * @fileoverview Campaign Group 类型定义
 * @description 定义 Campaign 分组实体及其相关 DTO 类型
 * @module types/campaignGroup
 */

export interface CampaignGroup {
  id: string;
  name: string;
  description?: string;
  color: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignGroupStats {
  id: string;
  name: string;
  campaignCount: number;
  totalClicks: number;
  totalConversions: number;
  totalRevenue: number;
  totalSpend: number;
  avgROI: number;
}

export interface CreateCampaignGroupDTO {
  name: string;
  description?: string;
  color?: string;
  sortOrder?: number;
}

export interface UpdateCampaignGroupDTO {
  name?: string;
  description?: string;
  color?: string;
  sortOrder?: number;
}

export interface CampaignGroupWithStats extends CampaignGroup {
  stats: CampaignGroupStats;
}
