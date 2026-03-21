/**
 * @fileoverview Flow 类型定义
 * @description 定义 Flow 实体及其相关 DTO 类型
 * @module types/flow
 */

import type { FlowFilter } from './flow.schema';

export type FlowType = 'regular' | 'forced' | 'default';
export type FlowStatus = 'active' | 'paused' | 'deleted';
export type FlowActionType = 'redirect' | 'show_offer' | 'show_landing' | 'traffic_loss';

export { type FlowFilter };

export interface FlowActionConfig {
  type: FlowActionType;
  redirectUrl?: string;
  offerId?: string;
  landingPageId?: string;
  statusCode?: 302 | 301;
}

export interface Flow {
  id: string;
  displayId?: string;
  campaignId: string;
  name: string;
  type: FlowType;
  weight: number;
  status: FlowStatus;
  filters: FlowFilter[];
  actionType: FlowActionType;
  actionConfig: FlowActionConfig;
  limit?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFlowDTO {
  campaignId: string;
  name: string;
  type?: FlowType;
  weight?: number;
  actionType?: FlowActionType;
  actionConfig?: FlowActionConfig;
}

export interface UpdateFlowDTO {
  name?: string;
  type?: FlowType;
  weight?: number;
  status?: FlowStatus;
  filters?: FlowFilter[];
  actionType?: FlowActionType;
  actionConfig?: FlowActionConfig;
}

export interface FlowLandingPage {
  id: string;
  flowId: string;
  landingPageId: string;
  weight: number;
  createdAt: string;
}

export interface FlowOffer {
  id: string;
  flowId: string;
  offerId: string;
  weight: number;
  createdAt: string;
}

export interface CreateFlowLandingPageDTO {
  flowId: string;
  landingPageId: string;
  weight?: number;
}

export interface CreateFlowOfferDTO {
  flowId: string;
  offerId: string;
  weight?: number;
}

/**
 * Flow statistics data
 */
export interface FlowStats {
  flowId: string;
  flowName: string;
  flowType: FlowType;
  clicks: number;
  uniqueClicks: number;
  bots: number;
  conversions: number;
  revenue: number;
  cost: number;
  profit: number;
  conversionRate: number;
  epc: number;
  ctr: number;
}

/**
 * Flow stats query parameters
 */
export interface FlowStatsQuery {
  startDate?: string;
  endDate?: string;
}

/**
 * Flow traffic log entry
 */
export interface FlowTrafficLog {
  id: string;
  flowId: string;
  campaignId: string;
  visitorId: string;
  clickId: string;
  matchedRule?: string;
  action: string;
  actionTarget?: string;
  executionTimeMs: number;
  timestamp: string;
  ip: string;
  country?: string;
  device?: string;
  browser?: string;
  os?: string;
  isBot: boolean;
  isUnique: boolean;
}
