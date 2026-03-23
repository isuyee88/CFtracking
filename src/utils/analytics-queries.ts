/**
 * @fileoverview Analytics Engine 预设SQL查询
 * @description 常用时间范围的SQL查询模板，对应DateRangePicker中的预设选项
 * @module utils/analytics-queries
 *
 * 数据存储架构:
 *   - AE (Analytics Engine): 主存储，免费3个月，用于时序数据
 *   - D1: 归档存储，3个月前历史数据，用于精确报表
 *
 * 数据读取策略:
 *   ┌─────────────────────────────────────────────────────────────┐
 *   │  时间范围判断                                                │
 *   │                                                              │
 *   │  ├── < 3个月 (90天) ──► AE读取                             │
 *   │  │                   优点: 写入即查、高吞吐                  │
 *   │  │                   缺点: 数分钟延迟                       │
 *   │  │                                                            │
 *   │  └── > 3个月 ──► D1读取                                    │
 *   │                        优点: 完整准确、永久存储              │
 *   │                        缺点: 需要等待每日汇总               │
 *   └─────────────────────────────────────────────────────────────┘
 *
 * AE免费存储期限: 3个月 (90天)
 * - 超过3个月的数据，AE会自动删除
 * - 需要配合D1进行永久归档存储
 *
 * 使用场景:
 *   - Dashboard各模块的统计数据查询
 *   - 报表模块的预设时间范围查询
 *   - 与DateRangePicker PRESETS对应
 *
 * 预设时间选项与SQL对照:
 *   - today: 当天数据 (AE)
 *   - yesterday: 昨天数据 (AE)
 *   - last7days: 最近7天 (AE)
 *   - last30days: 最近30天 (AE)
 *   - last3months: 最近3个月 (AE) ← AE免费存储期限
 *   - thismonth: 本月 (AE)
 *   - lastmonth: 上个月 (AE)
 *   - thisyear: 今年 (AE/D1混合)
 *   - lastyear: 去年 (D1)
 *
 * ⚠️ 重要: 当选择的时间范围超过3个月时，应切换到D1查询
 *
 * AE数据模型:
 *   blobs: [ip, country, city, device, browser, os, subId1-5, utmSource, utmMedium, utmCampaign, referer, userAgent, isp, fingerprint]
 *   doubles: [clickId, flowId, landingPageId, offerId, visitorId, cost, riskScore, cfBotScore, connectionType, isProxy, isBot]
 *   indexes: [campaignId]
 *
 * D1数据模型 (click_logs表):
 *   - id, click_id, campaign_id, flow_id, offer_id, visitor_id
 *   - country, city, device, browser, os, ip, user_agent
 *   - sub_id_1-5, utm_source, utm_medium, utm_campaign
 *   - revenue, cost, is_bot, risk_score, created_at
 *
 * 输入: 时间范围参数 (startDate, endDate)
 * 输出: SQL查询字符串
 */

/**
 * 预设查询类型
 */
export type PresetQueryType =
  | 'today'
  | 'yesterday'
  | 'last7days'
  | 'last30days'
  | 'last3months'
  | 'thismonth'
  | 'lastmonth'
  | 'thisyear'
  | 'lastyear';

/**
 * 查询参数
 */
export interface AnalyticsQueryParams {
  startDate: string;
  endDate: string;
  campaignId?: string;
  flowId?: string;
  offerId?: string;
  country?: string;
  device?: string;
}

/**
 * 聚合统计数据
 */
export interface AggregationResult {
  clicks: number;
  uniqueVisitors: number;
  conversions: number;
  revenue: number;
  cost: number;
  profit: number;
  roi: number;
  cr: number;
  epc: number;
}

/**
 * 时间范围到SQL的映射
 */
export const PRESET_TIME_RANGES: Record<PresetQueryType, { label: string; days: number }> = {
  today: { label: 'Today', days: 0 },
  yesterday: { label: 'Yesterday', days: 1 },
  last7days: { label: 'Last 7 Days', days: 7 },
  last30days: { label: 'Last 30 Days', days: 30 },
  last3months: { label: 'Last 3 Months', days: 90 },
  thismonth: { label: 'This Month', days: 0 },
  lastmonth: { label: 'Last Month', days: 0 },
  thisyear: { label: 'This Year', days: 0 },
  lastyear: { label: 'Last Year', days: 0 },
};

/**
 * 生成基础SELECT语句
 */
export const generateBaseSelect = (): string => {
  return `SELECT
    COUNT() as total_records,
    SUM(double1) as clicks,
    COUNT(DISTINCT double5) as unique_visitors,
    SUM(double2) as conversions,
    SUM(double3) as revenue,
    SUM(double6) as cost`;
};

/**
 * 生成WHERE条件
 */
export const generateWhereClause = (params: AnalyticsQueryParams): string => {
  const conditions: string[] = [];

  conditions.push(`timestamp BETWEEN '${params.startDate}' AND '${params.endDate}'`);

  if (params.campaignId) {
    conditions.push(`blob1 = '${params.campaignId}'`);
  }
  if (params.country) {
    conditions.push(`blob2 = '${params.country}'`);
  }
  if (params.device) {
    conditions.push(`blob4 = '${params.device}'`);
  }

  return conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
};

/**
 * 按Campaign统计
 */
export const queries = {
  /**
   * 基础统计查询
   */
  baseStats: (params: AnalyticsQueryParams): string => {
    return `${generateBaseSelect()}
FROM cftracking_analytics
${generateWhereClause(params)}`;
  },

  /**
   * 按Campaign分组统计
   */
  byCampaign: (params: AnalyticsQueryParams): string => {
    return `${generateBaseSelect()},
    blob1 as campaign_id
FROM cftracking_analytics
${generateWhereClause(params)}
GROUP BY blob1
ORDER BY clicks DESC`;
  },

  /**
   * 按Flow分组统计
   */
  byFlow: (params: AnalyticsQueryParams): string => {
    return `${generateBaseSelect()},
    double2 as flow_id
FROM cftracking_analytics
${generateWhereClause(params)}
GROUP BY double2
ORDER BY clicks DESC`;
  },

  /**
   * 按国家分组统计
   */
  byCountry: (params: AnalyticsQueryParams): string => {
    return `${generateBaseSelect()},
    blob2 as country
FROM cftracking_analytics
${generateWhereClause(params)}
GROUP BY blob2
ORDER BY clicks DESC`;
  },

  /**
   * 按设备分组统计
   */
  byDevice: (params: AnalyticsQueryParams): string => {
    return `${generateBaseSelect()},
    blob4 as device
FROM cftracking_analytics
${generateWhereClause(params)}
GROUP BY blob4
ORDER BY clicks DESC`;
  },

  /**
   * 按浏览器分组统计
   */
  byBrowser: (params: AnalyticsQueryParams): string => {
    return `${generateBaseSelect()},
    blob5 as browser
FROM cftracking_analytics
${generateWhereClause(params)}
GROUP BY blob5
ORDER BY clicks DESC`;
  },

  /**
   * 按操作系统分组统计
   */
  byOS: (params: AnalyticsQueryParams): string => {
    return `${generateBaseSelect()},
    blob6 as os
FROM cftracking_analytics
${generateWhereClause(params)}
GROUP BY blob6
ORDER BY clicks DESC`;
  },

  /**
   * 按小时统计趋势
   */
  byHour: (params: AnalyticsQueryParams): string => {
    return `SELECT
    HOUR(timestamp) as hour,
    COUNT() as records,
    SUM(double1) as clicks,
    COUNT(DISTINCT double5) as unique_visitors,
    SUM(double2) as conversions
FROM cftracking_analytics
${generateWhereClause(params)}
GROUP BY HOUR(timestamp)
ORDER BY hour`;
  },

  /**
   * 按天统计趋势
   */
  byDay: (params: AnalyticsQueryParams): string => {
    return `SELECT
    DATE(timestamp) as date,
    COUNT() as records,
    SUM(double1) as clicks,
    COUNT(DISTINCT double5) as unique_visitors,
    SUM(double2) as conversions,
    SUM(double3) as revenue,
    SUM(double4) as cost
FROM cftracking_analytics
${generateWhereClause(params)}
GROUP BY DATE(timestamp)
ORDER BY date DESC`;
  },

  /**
   * 按周统计趋势
   */
  byWeek: (params: AnalyticsQueryParams): string => {
    return `SELECT
    DATE_TRUNC('week', timestamp) as week,
    COUNT() as records,
    SUM(double1) as clicks,
    COUNT(DISTINCT double5) as unique_visitors,
    SUM(double2) as conversions,
    SUM(double3) as revenue
FROM cftracking_analytics
${generateWhereClause(params)}
GROUP BY DATE_TRUNC('week', timestamp)
ORDER BY week DESC`;
  },

  /**
   * 按月统计趋势
   */
  byMonth: (params: AnalyticsQueryParams): string => {
    return `SELECT
    DATE_TRUNC('month', timestamp) as month,
    COUNT() as records,
    SUM(double1) as clicks,
    COUNT(DISTINCT double5) as unique_visitors,
    SUM(double2) as conversions,
    SUM(double3) as revenue
FROM cftracking_analytics
${generateWhereClause(params)}
GROUP BY DATE_TRUNC('month', timestamp)
ORDER BY month DESC`;
  },

  /**
   * Bot检测统计
   */
  botStats: (params: AnalyticsQueryParams): string => {
    return `SELECT
    SUM(double11) as bot_clicks,
    COUNT() - SUM(double11) as human_clicks,
    ROUND(SUM(double11) * 100.0 / COUNT(), 2) as bot_percentage
FROM cftracking_analytics
${generateWhereClause(params)}`;
  },

  /**
   * 风险评分统计
   */
  riskStats: (params: AnalyticsQueryParams): string => {
    return `SELECT
    AVG(double7) as avg_risk_score,
    MAX(double7) as max_risk_score,
    MIN(double7) as min_risk_score,
    COUNT(CASE WHEN double7 > 70 THEN 1 END) as high_risk_count,
    COUNT(CASE WHEN double7 <= 70 THEN 1 END) as low_risk_count
FROM cftracking_analytics
${generateWhereClause(params)}`;
  },

  /**
   * SubID统计
   */
  bySubId: (params: AnalyticsQueryParams, subIdIndex: 1 | 2 | 3 | 4 | 5 = 1): string => {
    const blobIndex = 6 + subIdIndex;
    return `${generateBaseSelect()},
    blob${blobIndex} as sub_id
FROM cftracking_analytics
${generateWhereClause(params)}
GROUP BY blob${blobIndex}
ORDER BY clicks DESC`;
  },

  /**
   * UTM参数统计
   */
  byUTM: (params: AnalyticsQueryParams): string => {
    return `${generateBaseSelect()},
    blob12 as utm_source,
    blob13 as utm_medium,
    blob14 as utm_campaign
FROM cftracking_analytics
${generateWhereClause(params)}
GROUP BY blob12, blob13, blob14
ORDER BY clicks DESC`;
  },

  /**
   * 转化率统计
   */
  conversionStats: (params: AnalyticsQueryParams): string => {
    return `SELECT
    COUNT() as total_clicks,
    SUM(double2) as total_conversions,
    ROUND(SUM(double2) * 100.0 / COUNT(), 4) as conversion_rate,
    AVG(CASE WHEN double2 > 0 THEN double3 ELSE NULL END) as avg_conversion_value
FROM cftracking_analytics
${generateWhereClause(params)}`;
  },

  /**
   * EPC统计 (Earnings Per Click)
   */
  epcStats: (params: AnalyticsQueryParams): string => {
    return `SELECT
    COUNT() as total_clicks,
    SUM(double3) as total_revenue,
    ROUND(SUM(double3) / COUNT(), 4) as epc
FROM cftracking_analytics
${generateWhereClause(params)}`;
  },

  /**
   * ROI统计
   */
  roiStats: (params: AnalyticsQueryParams): string => {
    return `SELECT
    SUM(double3) as total_revenue,
    SUM(double6) as total_cost,
    SUM(double3) - SUM(double6) as profit,
    CASE WHEN SUM(double6) > 0 THEN ROUND((SUM(double3) - SUM(double6)) * 100.0 / SUM(double6), 2)
         ELSE 0 END as roi_percentage
FROM cftracking_analytics
${generateWhereClause(params)}`;
  },

  /**
   * 最近点击记录
   */
  recentClicks: (params: AnalyticsQueryParams, limit = 100): string => {
    return `SELECT
    blob1 as campaign_id,
    blob2 as country,
    blob4 as device,
    blob5 as browser,
    double1 as click_id,
    double5 as visitor_id,
    timestamp
FROM cftracking_analytics
${generateWhereClause(params)}
ORDER BY timestamp DESC
LIMIT ${limit}`;
  },
};

/**
 * 根据预设类型获取时间范围
 */
export const getPresetTimeRange = (preset: PresetQueryType): { startDate: string; endDate: string } => {
  const now = new Date();
  const endDate = now.toISOString();

  let startDate: string;

  switch (preset) {
    case 'today':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      break;
    case 'yesterday': {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      startDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate()).toISOString();
      break;
    }
    case 'last7days': {
      const last7 = new Date(now);
      last7.setDate(last7.getDate() - 6);
      startDate = new Date(last7.getFullYear(), last7.getMonth(), last7.getDate()).toISOString();
      break;
    }
    case 'last30days': {
      const last30 = new Date(now);
      last30.setDate(last30.getDate() - 29);
      startDate = new Date(last30.getFullYear(), last30.getMonth(), last30.getDate()).toISOString();
      break;
    }
    case 'last3months': {
      const last3m = new Date(now);
      last3m.setMonth(last3m.getMonth() - 3);
      startDate = new Date(last3m.getFullYear(), last3m.getMonth(), last3m.getDate()).toISOString();
      break;
    }
    case 'thismonth':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      break;
    case 'lastmonth': {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      startDate = lastMonth.toISOString();
      break;
    }
    case 'thisyear':
      startDate = new Date(now.getFullYear(), 0, 1).toISOString();
      break;
    case 'lastyear': {
      const lastYear = now.getFullYear() - 1;
      startDate = new Date(lastYear, 0, 1).toISOString();
      break;
    }
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6).toISOString();
  }

  return { startDate, endDate };
};

/**
 * AE免费存储期限常量
 */
const AE_FREE_TIER_DAYS = 90;

/**
 * 判断时间范围应该使用AE还是D1查询
 */
export type DataSource = 'AE' | 'D1';

export const determineDataSource = (startDate: string, endDate: string): DataSource => {
  const now = new Date();
  const start = new Date(startDate);
  const daysDiff = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

  if (daysDiff > AE_FREE_TIER_DAYS) {
    return 'D1';
  }
  return 'AE';
};

export const getDataSourceForPreset = (preset: PresetQueryType): DataSource => {
  const { startDate } = getPresetTimeRange(preset);
  return determineDataSource(startDate, new Date().toISOString());
};

/**
 * 计算聚合指标
 */
export const calculateMetrics = (result: Record<string, number>): AggregationResult => {
  const clicks = result.clicks || 0;
  const conversions = result.conversions || 0;
  const revenue = result.revenue || 0;
  const cost = result.cost || 0;
  const profit = revenue - cost;
  const roi = cost > 0 ? ((revenue - cost) / cost) * 100 : 0;
  const cr = clicks > 0 ? (conversions / clicks) * 100 : 0;
  const epc = clicks > 0 ? revenue / clicks : 0;

  return {
    clicks,
    uniqueVisitors: result.unique_visitors || 0,
    conversions,
    revenue,
    cost,
    profit,
    roi,
    cr,
    epc,
  };
};
