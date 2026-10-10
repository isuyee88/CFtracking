/**
 * @fileoverview Analytics 数据获取 Hook
 * @description 统一管理 Dashboard 分析数据的获取逻辑
 * @module hooks/useAnalytics
 *
 * 数据存储架构:
 *   - DO (Durable Objects): 实时数据存储，最近90天数据
 *   - D1: 归档存储，90天前历史数据，用于精确报表
 *
 * 数据流:
 *   点击请求 → DO(实时存储) → 每天汇总 → D1(归档)
 *
 * Dashboard数据读取逻辑:
 *   - < 90天数据 ──► DO读取
 *   - > 90天数据 ──► D1读取
 *
 * 输入: timeRange, options
 * 输出: { data, loading, error, dataSource, refetch }
 * 逻辑交互: 调用 /api/analytics/* API
 */

import { useState, useCallback, useEffect } from 'react';
import { fetchDashboardStats, fetchRecentClicks, fetchEntityStats } from '../services/api';

export type DataSource = 'DO' | 'D1' | 'MIXED';

export interface DashboardData {
  metrics: Array<{
    key: string;
    label: string;
    value: string;
    isPositive: boolean;
    format: 'number' | 'currency' | 'percentage';
  }>;
  chartData: Array<{
    date: string;
    clicks: number;
    conversions: number;
    spend: number;
    revenue: number;
    impressions: number;
  }>;
  entityStats: Record<string, Array<{
    name: string;
    clicks: number;
    impressions: number;
    conversions: number;
    spend: number;
    revenue: number;
    unique_visitors: number;
  }>>;
}

export interface RecentClicksData {
  list: any[];
  total: number;
}

export interface UseAnalyticsOptions {
  timeRange?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface UseAnalyticsReturn {
  data: DashboardData | null;
  recentClicks: RecentClicksData | null;
  loading: boolean;
  error: string | null;
  dataSource: DataSource;
  queryTime: string | null;
  refetch: () => Promise<void>;
  refetchClicks: () => Promise<void>;
}

const DO_DATA_DAYS = 90;

export function determineDataSource(timeRange: string): DataSource {
  const now = new Date();

  switch (timeRange) {
    case 'today':
    case 'yesterday':
      return 'DO';
    case 'last7days':
      return 'DO';
    case 'last30days':
      return 'DO';
    case 'last3months':
      return 'DO';
    case 'thismonth':
      return 'DO';
    case 'lastmonth':
      return 'DO';
    case 'thisyear':
      return now.getFullYear() - new Date(now.getFullYear(), 0, 1).getTime() > DO_DATA_DAYS * 24 * 60 * 60 * 1000 ? 'D1' : 'DO';
    case 'lastyear':
      return 'D1';
    default:
      return 'DO';
  }
}

export function useAnalytics(options: UseAnalyticsOptions = {}): UseAnalyticsReturn {
  const {
    timeRange = 'today',
    autoRefresh = false,
    refreshInterval = 30000,
  } = options;

  const [data, setData] = useState<DashboardData | null>(null);
  const [recentClicks, setRecentClicks] = useState<RecentClicksData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<DataSource>(determineDataSource(timeRange));
  const [queryTime, setQueryTime] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetchDashboardStats(timeRange);

      if (result) {
        setData({
          metrics: result.metrics || [],
          chartData: result.chartData || [],
          entityStats: result.entityStats || {},
        });
        setDataSource(result.dataSource || determineDataSource(timeRange));
        setQueryTime(result.queryTime || new Date().toISOString());
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch dashboard data';
      setError(errorMessage);
      console.error('[useAnalytics] Dashboard data fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  const fetchClicks = useCallback(async () => {
    try {
      const result = await fetchRecentClicks(50, timeRange);
      setRecentClicks({
        list: result || [],
        total: Array.isArray(result) ? result.length : 0,
      });
    } catch (err) {
      console.error('[useAnalytics] Recent clicks fetch error:', err);
    }
  }, [timeRange]);

  const refetch = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  const refetchClicks = useCallback(async () => {
    await fetchClicks();
  }, [fetchClicks]);

  useEffect(() => {
    fetchData();
    fetchClicks();
  }, [fetchData, fetchClicks]);

  useEffect(() => {
    if (!autoRefresh) return;

    const intervalId = setInterval(() => {
      fetchData();
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [autoRefresh, refreshInterval, fetchData]);

  return {
    data,
    recentClicks,
    loading,
    error,
    dataSource,
    queryTime,
    refetch,
    refetchClicks,
  };
}

export default useAnalytics;
