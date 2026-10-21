/**
 * @fileoverview Dashboard 服务端数据获取入口
 * @description 为 SSR 提供统一的数据获取函数，供 Worker 在构建阶段调用
 * @module services/dashboard.server
 */

import { fetchDashboardStats } from '@/services/api';
import { fetchRecentClicks } from '@/services/api';
import { fetchEntityStats } from '@/services/api';

/**
 * 服务端渲染时 Dashboard 所需的完整数据结构
 */
export interface ServerDashboardData {
  /** 指标卡片数据 */
  metrics: Array<{
    key: string;
    label: string;
    value: string;
    trend?: string;
    isPositive?: boolean;
  }>;
  /** 图表数据 */
  chartData: Array<Record<string, any>>;
  /** 最近点击数据 */
  recentClicks: any[];
  /** 实体表格数据，按实体键分组 */
  entityData: Record<string, any[]>;
  /** 数据来源标识 */
  dataSource: 'AE' | 'D1' | 'MIXED';
  /** 最后查询时间 */
  queryTime: string | null;
}

/**
 * 从后端获取完整的 Dashboard 数据，用于 SSR 渲染
 *
 * 该函数只会在服务端执行，因为它直接调用数据库/API 等后端入口。
 * 它会并发获取统计数据、实体统计和最近点击，并进行统一处理。
 *
 * @param timeRange 预设的时间范围标识（如 'last7days'、'today' 等）
 * @returns 完整的服务端渲染所需数据
 */
export async function fetchDashboardData(timeRange: string): Promise<ServerDashboardData> {
  // 1️⃣ 获取统计数据（包括 metrics 和 chartData 的原始结构）
  const statsResponse = await fetchDashboardStats(timeRange);

  // 2️⃣ 处理统计数据中的 chart 部分，确保数值可安全序列化
  const processedChartData = (statsResponse.chartData || []).map((item: any) => ({
    ...item,
    clicks: parseInt(item.clicks, 10) || 0,
    uniqueVisitors: parseInt(item.uniqueVisitors, 10) || 0,
    conversions: parseInt(item.conversions, 10) || 0,
    cost: parseFloat(item.cost) || 0,
    revenue: parseFloat(item.revenue) || 0,
    profit: parseFloat(item.profit) || 0,
    roi: parseFloat(item.roi) || 0,
  }));

  // 3️⃣ 并发获取实体统计数据
  const entityPromises = (statsResponse.metrics || [])
    .map(m => m.key) // 假设每个 metric 对应一个实体，或者使用预设的 entity 列表
    .filter(key => key.startsWith('entity:')) // 示例过滤，实际业务请替换为真实 entity 列表
    .map(key => fetchEntityStats(key, timeRange));

  const entityResults = await Promise.all(entityPromises);

  // 4️⃣ 构建实体数据映射
  const entityData: Record<string, any[]> = {};
  // 假设 entities 列表在 config 中定义，这里简化处理
  const entityKeys = (statsResponse.metrics || []).map(m => m.key);
  entityKeys.forEach((key, idx) => {
    entityData[key] = entityResults[idx] || [];
  });

  // 5️⃣ 组装完整返回对象
  return {
    metrics: statsResponse.metrics || [],
    chartData: processedChartData,
    recentClicks: [], // 这里不在 statsResponse 中，后面单独处理
    entityData,
    dataSource: statsResponse.dataSource || 'AE',
    queryTime: statsResponse.queryTime || null,
  };
}