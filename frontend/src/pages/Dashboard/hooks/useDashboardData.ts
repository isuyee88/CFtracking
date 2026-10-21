/**
 * @fileoverview Dashboard 数据管理 Hook
 * @description 封装 Dashboard 数据获取、状态管理和刷新逻辑，支持 SSR 预加载
 * @module pages/Dashboard/hooks/useDashboardData
 *
 * SSR 注意事项：
 * - 此 Hook 可在服务端渲染期间执行，因为它仅使用 `usePageData`（在 SSR 中会预取数据）。
 * - 所有异步数据获取都包装在 `refreshStatsAndEntities` 与 `refreshRecentClicks` 回调中，
 *   以便在客户端交互时可以安全调用。
 *
 * 请求优化：
 * - 当 SSR 数据可用时，优先使用 SSR 数据，不重新获取 entity stats
 * - 避免重复的 DO RPC 调用，减少 Worker 请求次数
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { fetchDashboardStats, fetchRecentClicks, fetchEntityStats } from '@/services/api';
import { usePageData } from '@/context/DataCacheContext';

export interface DashboardStats {
  metrics: Array<{
    key: string;
    label: string;
    value: string;
    trend?: string;
    isPositive?: boolean;
  }>;
  chartData: Array<Record<string, any>>;
  dataSource?: 'AE' | 'D1' | 'MIXED';
  queryTime?: string;
}

export interface DashboardState {
  stats: DashboardStats['metrics'];
  chartData: DashboardStats['chartData'];
  recentClicks: any[];
  entityData: Record<string, any[]>;
  lastUpdated: Date;
  dataSource: 'AE' | 'D1' | 'MIXED';
  queryTime: string | null;
  loading: {
    stats: boolean;
    recentClicks: boolean;
    entities: boolean;
  };
  errors: {
    stats: string;
    recentClicks: string;
    entities: string;
  };
}

export interface UseDashboardDataOptions {
  metrics: string[];
  entities: string[];
  timeRange: string;
}

export function useDashboardData(options: UseDashboardDataOptions) {
  const { metrics, entities, timeRange } = options;

  const { data: ssrDashboardData, isLoading: ssrLoading } = usePageData(
    'dashboard',
    () => fetchDashboardStats(timeRange)
  );

  const [state, setState] = useState<DashboardState>({
    stats: [],
    chartData: [],
    recentClicks: [],
    entityData: {},
    lastUpdated: new Date(),
    dataSource: 'AE',
    queryTime: null,
    loading: { stats: false, recentClicks: false, entities: false },
    errors: { stats: '', recentClicks: '', entities: '' },
  });

  const ssrInitializedRef = useRef(false);
  const entitiesFetchedRef = useRef(false);

  useEffect(() => {
    if (ssrDashboardData && !ssrInitializedRef.current) {
      ssrInitializedRef.current = true;

      const processedChartData = (ssrDashboardData.chartData || []).map((item: any) => ({
        ...item,
        clicks: parseInt(item.clicks) || 0,
        uniqueVisitors: parseInt(item.uniqueVisitors) || 0,
        conversions: parseInt(item.conversions) || 0,
        cost: parseFloat(item.cost) || 0,
        revenue: parseFloat(item.revenue) || 0,
        profit: parseFloat(item.profit) || 0,
        roi: parseFloat(item.roi) || 0,
      }));

      setState(prev => ({
        ...prev,
        stats: ssrDashboardData.metrics || [],
        chartData: processedChartData,
        dataSource: ssrDashboardData.dataSource || 'AE',
        queryTime: ssrDashboardData.queryTime || new Date().toISOString(),
        loading: { stats: false, entities: false },
        lastUpdated: new Date(),
      }));
    }
  }, [ssrDashboardData]);

  const refreshRecentClicks = useCallback(async () => {
    setState(prev => ({
      ...prev,
      loading: { ...prev.loading, recentClicks: true },
      errors: { ...prev.errors, recentClicks: '' },
    }));

    try {
      const clicksData = await fetchRecentClicks(10);
      setState(prev => ({
        ...prev,
        recentClicks: clicksData || [],
        loading: { ...prev.loading, recentClicks: false },
      }));
    } catch (error) {
      console.error('Error refreshing recent clicks:', error);
      setState(prev => ({
        ...prev,
        loading: { ...prev.loading, recentClicks: false },
        errors: { ...prev.errors, recentClicks: 'Failed to fetch recent clicks' },
      }));
    }
  }, []);

  const refreshStatsAndEntities = useCallback(async () => {
    setState(prev => ({
      ...prev,
      loading: { ...prev.loading, stats: true, entities: true },
      errors: { ...prev.errors, stats: '', entities: '' },
    }));

    try {
      const statsData = await fetchDashboardStats(timeRange);

      if (statsData) {
        const processedChartData = (statsData.chartData || []).map((item: any) => ({
          ...item,
          clicks: parseInt(item.clicks) || 0,
          uniqueVisitors: parseInt(item.uniqueVisitors) || 0,
          conversions: parseInt(item.conversions) || 0,
          cost: parseFloat(item.cost) || 0,
          revenue: parseFloat(item.revenue) || 0,
          profit: parseFloat(item.profit) || 0,
          roi: parseFloat(item.roi) || 0,
        }));

        setState(prev => ({
          ...prev,
          stats: statsData.metrics || [],
          chartData: processedChartData,
          dataSource: statsData.dataSource || 'AE',
          queryTime: statsData.queryTime || new Date().toISOString(),
        }));
      }

      const entityPromises = entities.map(entityKey => fetchEntityStats(entityKey, timeRange));
      const entityResults = await Promise.all(entityPromises);

      const newEntityData: Record<string, any[]> = {};
      entities.forEach((entityKey, index) => {
        newEntityData[entityKey] = entityResults[index] || [];
      });

      setState(prev => ({
        ...prev,
        entityData: newEntityData,
        loading: { ...prev.loading, stats: false, entities: false },
        lastUpdated: new Date(),
      }));

    } catch (error) {
      console.error('Error refreshing stats:', error);
      setState(prev => ({
        ...prev,
        loading: { ...prev.loading, stats: false, entities: false },
        errors: {
          ...prev.errors,
          stats: 'Failed to fetch stats',
          entities: 'Failed to fetch entity data',
        },
      }));
    }
  }, [entities, timeRange]);

  const refreshAll = useCallback(() => {
    refreshStatsAndEntities();
    refreshRecentClicks();
  }, [refreshStatsAndEntities, refreshRecentClicks]);

  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;

      if (ssrDashboardData) {
        refreshRecentClicks();
        return;
      }

      refreshStatsAndEntities();
      refreshRecentClicks();
      return;
    }

    refreshStatsAndEntities();
  }, [timeRange, ssrDashboardData]);

  return {
    ...state,
    refreshStatsAndEntities,
    refreshRecentClicks,
    refreshAll,
  };
}
