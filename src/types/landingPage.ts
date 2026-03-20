/**
 * @fileoverview Landing Page 类型定义
 * @description 定义 Landing Page 实体及其相关 DTO 类型
 * @module types/landingPage
 */

export type LandingPageStatus = 'active' | 'paused' | 'deleted';

export interface LandingPage {
  id: string;
  name: string;
  url: string;
  status: LandingPageStatus;
  group: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLandingPageDTO {
  name: string;
  url: string;
  group?: string;
}

export interface UpdateLandingPageDTO {
  name?: string;
  url?: string;
  status?: LandingPageStatus;
  group?: string;
}
