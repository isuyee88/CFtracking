/**
 * @fileoverview Campaign 类型定义
 * @description 定义 Campaign 实体及其相关 DTO 类型
 * @module types/campaign
 */

export type CampaignStatus = 'active' | 'paused' | 'deleted';
export type FlowRotation = 'position' | 'weight';
export type CostModel = 'cpc' | 'cpm' | 'cpa' | 'cps' | 'revshare';
export type VisitorBinding = 'none' | 'flows' | 'flows_lp' | 'flows_lp_offers';

export interface Campaign {
  id: string;
  name: string;
  alias: string;
  domain: string;
  group: string | null;
  trafficSource: string | null;
  flowRotation: FlowRotation;
  costModel: CostModel;
  trafficLoss: number;
  uniquenessTTL: number;
  visitorBinding: VisitorBinding;
  apiToken: string | null;
  parameters: Record<string, unknown>;
  status: CampaignStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCampaignDTO {
  name: string;
  alias: string;
  domain: string;
  group?: string;
  trafficSource?: string;
  flowRotation?: FlowRotation;
  costModel?: CostModel;
  trafficLoss?: number;
  uniquenessTTL?: number;
  visitorBinding?: VisitorBinding;
  parameters?: Record<string, unknown>;
}

export interface UpdateCampaignDTO {
  name?: string;
  alias?: string;
  domain?: string;
  group?: string;
  trafficSource?: string;
  flowRotation?: FlowRotation;
  costModel?: CostModel;
  trafficLoss?: number;
  uniquenessTTL?: number;
  visitorBinding?: VisitorBinding;
  parameters?: Record<string, unknown>;
  status?: CampaignStatus;
}

export interface CampaignListQuery {
  page?: number;
  pageSize?: number;
  status?: CampaignStatus;
  search?: string;
}
