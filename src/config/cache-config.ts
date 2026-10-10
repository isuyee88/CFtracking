/**
 * @fileoverview 统一缓存配置
 * @description 集中管理所有缓存策略、TTL、Cache-Tag等配置
 * @module config/cache-config
 *
 * 输入: 缓存配置参数
 * 输出: 标准化缓存配置对象
 * 逻辑交互: 被cache-middleware和unified-cache-manager引用
 * 前后端交互: 通过HTTP响应头暴露缓存状态
 */

export const CACHE_ALGORITHM = {
  LRU: 'lru',
  LFUDA: 'lfuda',
} as const;

export type CacheAlgorithmType = (typeof CACHE_ALGORITHM)[keyof typeof CACHE_ALGORITHM];

export interface LFUDAConfig {
  algorithm: typeof CACHE_ALGORITHM.LFUDA;
  maxSize: number;
  dynamicAgeBase: number;
  promotionThreshold: number;
}

export interface LRUConfig {
  algorithm: typeof CACHE_ALGORITHM.LRU;
  maxSize: number;
}

export type EvictionConfig = LFUDAConfig | LRUConfig;

export interface CacheTagRule {
  tag: string;
  matchPatterns: RegExp[];
  ttl: {
    edge: number;
    workers: number;
  };
}

export interface WarmupTarget {
  name: string;
  path: string;
  interval: number;
  priority: number;
}

export interface CachePresetConfig {
  eviction: EvictionConfig;
  tags: CacheTagRule[];
  warmup: WarmupTarget[];
  defaultStrategy: CacheStrategy;
  defaultEdgeTTL: number;
  defaultWorkersTTL: number;
}

export enum CacheStrategy {
  CACHE_FIRST = 'cache-first',
  NETWORK_FIRST = 'network-first',
  STALE_WHILE_REVALIDATE = 'swr',
  CACHE_ONLY = 'cache-only',
}

export const CACHE_PRESETS: CachePresetConfig = {
  eviction: {
    algorithm: CACHE_ALGORITHM.LFUDA,
    maxSize: 512,
    dynamicAgeBase: 600,
    promotionThreshold: 2,
  },

  tags: [
    {
      tag: 'dashboard',
      matchPatterns: [/\/api\/dashboard/, /\/api\/analytics/],
      ttl: { edge: 60, workers: 30 },
    },
    {
      tag: 'entity-list',
      matchPatterns: [/\/api\/(campaigns|offers|flows|landings)$/],
      ttl: { edge: 600, workers: 120 },
    },
    {
      tag: 'entity-detail',
      matchPatterns: [/\/api\/(campaigns|offers|flows|landings)\/[\w-]+$/],
      ttl: { edge: 1800, workers: 300 },
    },
    {
      tag: 'stats',
      matchPatterns: [/\/api\/stats/, /\/api\/reports/],
      ttl: { edge: 300, workers: 60 },
    },
    {
      tag: 'clicks',
      matchPatterns: [/\/api\/clicks/],
      ttl: { edge: 120, workers: 30 },
    },
    {
      tag: 'conversions',
      matchPatterns: [/\/api\/conversions/],
      ttl: { edge: 120, workers: 30 },
    },
  ],

  warmup: [
    { name: 'dashboard', path: '/api/dashboard?range=today', interval: 60, priority: 1 },
    { name: 'campaign-list', path: '/api/campaigns?page=1&pageSize=20', interval: 120, priority: 2 },
    { name: 'offer-list', path: '/api/offers?page=1&pageSize=20', interval: 120, priority: 2 },
    { name: 'flow-list', path: '/api/flows?page=1&pageSize=20', interval: 120, priority: 3 },
  ],

  defaultStrategy: CacheStrategy.CACHE_FIRST,
  defaultEdgeTTL: 300,
  defaultWorkersTTL: 60,
};

export function getCacheTagForPath(pathname: string): string | null {
  for (const rule of CACHE_PRESETS.tags) {
    if (rule.matchPatterns.some(pattern => pattern.test(pathname))) {
      return rule.tag;
    }
  }
  return null;
}

export function getCacheTTLForPath(pathname: string): { edge: number; workers: number } {
  for (const rule of CACHE_PRESETS.tags) {
    if (rule.matchPatterns.some(pattern => pattern.test(pathname))) {
      return rule.ttl;
    }
  }
  return { edge: CACHE_PRESETS.defaultEdgeTTL, workers: CACHE_PRESETS.defaultWorkersTTL };
}

export function getWarmupTargets(): WarmupTarget[] {
  return CACHE_PRESETS.warmup.sort((a, b) => a.priority - b.priority);
}
