/**
 * @fileoverview Flow 类型定义
 * @description 定义 Flow 实体及其相关 DTO 类型
 * @module types/flow
 */

import type { FlowFilter } from './flow.schema';

export type FlowType = 'regular' | 'forced' | 'default';
export type FlowStatus = 'active' | 'paused' | 'deleted';

export { type FlowFilter };

export interface Flow {
  id: string;
  campaignId: string;
  name: string;
  type: FlowType;
  weight: number;
  status: FlowStatus;
  filters: FlowFilter[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateFlowDTO {
  campaignId: string;
  name: string;
  type?: FlowType;
  weight?: number;
}

export interface UpdateFlowDTO {
  name?: string;
  type?: FlowType;
  weight?: number;
  status?: FlowStatus;
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
