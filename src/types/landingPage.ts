/**
 * @fileoverview Landing Page 类型定义
 * @description 定义 Landing Page 实体及其相关 DTO 类型
 * @module types/landingPage
 * 
 * 数据流:
 * 1. LandingPage 关联到 Flow
 * 2. 支持 Preload 和 Action 两种预加载模式
 * 3. 预加载内容存储在 lpPreloadCache 表
 */

export type LandingPageStatus = 'active' | 'paused' | 'deleted';
export type PreloadType = 'none' | 'preload' | 'action';
export type FetchStatus = 'pending' | 'success' | 'failed' | 'expired';

export interface LandingPage {
  id: string;
  displayId?: string;
  name: string;
  url: string;
  status: LandingPageStatus;
  group: string;
  preloadType: PreloadType;
  preloadEnabled: boolean;
  preloadTTL: number;
  lastPreloadedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLandingPageDTO {
  name: string;
  url: string;
  group?: string;
  preloadType?: PreloadType;
  preloadEnabled?: boolean;
  preloadTTL?: number;
}

export interface UpdateLandingPageDTO {
  name?: string;
  url?: string;
  status?: LandingPageStatus;
  group?: string;
  preloadType?: PreloadType;
  preloadEnabled?: boolean;
  preloadTTL?: number;
}

export interface LPPreloadCache {
  id: string;
  landingPageId: string;
  content: string;
  contentType: string;
  contentSize: number;
  fetchStatus: FetchStatus;
  lastFetchedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LPPreloadStats {
  id: string;
  landingPageId: string;
  cacheHits: number;
  cacheMisses: number;
  totalRequests: number;
  avgResponseTime: number;
  lastResetAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PreloadContentResult {
  success: boolean;
  content?: string;
  contentType?: string;
  contentSize?: number;
  cached: boolean;
  fetchTime?: number;
  error?: string;
}

export interface PreloadConfig {
  maxContentSize: number;
  defaultTTL: number;
  maxConcurrent: number;
  timeout: number;
  userAgent: string;
}

export const DEFAULT_PRELOAD_CONFIG: PreloadConfig = {
  maxContentSize: 5 * 1024 * 1024,
  defaultTTL: 3600,
  maxConcurrent: 5,
  timeout: 30000,
  userAgent: 'CFTracking-Preload/1.0',
};
