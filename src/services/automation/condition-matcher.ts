/**
 * @fileoverview 规则引擎 - 条件匹配器
 * @description 评估规则条件是否满足
 */

import type { RuleConditions, OptimizationTarget } from '@/types/automationRule';

export class ConditionMatcher {
  /**
   * 检查数据是否匹配所有条件
   */
  match(conditions: RuleConditions, data: OptimizationTarget): boolean {
    // 点击数条件
    if (conditions.min_clicks !== undefined && data.clicks < conditions.min_clicks) {
      return false;
    }
    if (conditions.max_clicks !== undefined && data.clicks > conditions.max_clicks) {
      return false;
    }

    // 转化数条件
    if (conditions.min_conversions !== undefined && data.conversions < conditions.min_conversions) {
      return false;
    }
    if (conditions.max_conversions !== undefined && data.conversions > conditions.max_conversions) {
      return false;
    }

    // 花费条件
    if (conditions.min_spend !== undefined && data.spend < conditions.min_spend) {
      return false;
    }
    if (conditions.max_spend !== undefined && data.spend > conditions.max_spend) {
      return false;
    }

    // 收入条件
    if (conditions.min_revenue !== undefined && data.revenue < conditions.min_revenue) {
      return false;
    }

    // ROI 条件
    if (conditions.min_roi !== undefined && data.roi < conditions.min_roi) {
      return false;
    }
    if (conditions.max_roi !== undefined && data.roi > conditions.max_roi) {
      return false;
    }

    // CR 条件
    if (conditions.min_cr !== undefined && data.cr < conditions.min_cr) {
      return false;
    }
    if (conditions.max_cr !== undefined && data.cr > conditions.max_cr) {
      return false;
    }

    // EPC 条件
    if (conditions.min_epc !== undefined && data.epc < conditions.min_epc) {
      return false;
    }
    if (conditions.max_epc !== undefined && data.epc > conditions.max_epc) {
      return false;
    }

    // 平台筛选
    if (conditions.platforms && conditions.platforms.length > 0) {
      if (!conditions.platforms.includes(data.platform)) {
        return false;
      }
    }

    // 地理位置筛选
    if (conditions.geos && conditions.geos.length > 0 && data.geo) {
      if (!conditions.geos.includes(data.geo)) {
        return false;
      }
    }

    // 设备筛选
    if (conditions.devices && conditions.devices.length > 0 && data.device) {
      if (!conditions.devices.includes(data.device)) {
        return false;
      }
    }

    // 所有条件都满足
    return true;
  }

  /**
   * 检查是否在时间窗口内
   */
  isWithinTimeWindow(
    data: OptimizationTarget,
    windowHours?: number,
    windowDays?: number
  ): boolean {
    if (!windowHours && !windowDays) {
      return true; // 无时间限制
    }

    const now = new Date();
    const windowStart = new Date(data.window_start);
    const windowEnd = new Date(data.window_end);

    // 检查数据窗口是否在指定范围内
    const hours = windowHours || (windowDays || 0) * 24;
    const maxAge = hours * 60 * 60 * 1000; // 转换为毫秒
    
    const dataAge = now.getTime() - windowEnd.getTime();
    
    return dataAge <= maxAge;
  }

  /**
   * 获取匹配原因说明
   */
  getMatchReason(conditions: RuleConditions, data: OptimizationTarget): string {
    const reasons: string[] = [];

    if (conditions.min_clicks && data.clicks >= conditions.min_clicks) {
      reasons.push(`clicks=${data.clicks} >= ${conditions.min_clicks}`);
    }
    if (conditions.max_conversions !== undefined && data.conversions <= conditions.max_conversions) {
      reasons.push(`conversions=${data.conversions} <= ${conditions.max_conversions}`);
    }
    if (conditions.min_roi && data.roi >= conditions.min_roi) {
      reasons.push(`roi=${data.roi.toFixed(2)} >= ${conditions.min_roi}`);
    }
    if (conditions.max_roi !== undefined && data.roi <= conditions.max_roi) {
      reasons.push(`roi=${data.roi.toFixed(2)} <= ${conditions.max_roi}`);
    }

    return reasons.join(', ');
  }
}
