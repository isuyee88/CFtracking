/**
 * @fileoverview Flow Filter 服务
 * @description 处理 Flow 的过滤逻辑，根据请求条件筛选合适的 Flow
 * @module services/tracking/filter.service
 *
 * 输入: Flow 列表和点击请求信息
 * 输出: 过滤后的 Flow 列表或单个 Flow
 * 逻辑交互: 被 click.service.ts 调用
 * 前后端交互: 无直接交互
 */

import type { Flow } from '@/types/flow';
import type { FlowFilter } from '@/types/flow.schema';
import type { ClickRequest } from './click.service';

export interface FilterCheckResult {
  passed: boolean;
  matchedFlow: Flow | null;
  reason?: string;
}

/**
 * Filter 服务类
 */
export class FilterService {
  /**
   * 从 Flow 列表中选择满足条件的 Flow
   * 从 Flow 对象本身获取 filters
   */
  selectMatchingFlow(flows: Flow[], request: ClickRequest): Flow | null {
    const matchingFlows = flows.filter(flow => this.checkFlowByFilters(flow, request));

    if (matchingFlows.length === 0) {
      return null;
    }

    // 按权重选择
    return this.selectByWeight(matchingFlows);
  }

  /**
   * 根据 Flow 自身的 filters 检查是否匹配
   */
  private checkFlowByFilters(flow: Flow, request: ClickRequest): boolean {
    // 如果 Flow 没有 filters 或为空数组，默认通过
    if (!flow.filters || flow.filters.length === 0) {
      return true;
    }

    // 评估所有 filter 条件
    for (const filter of flow.filters) {
      const result = this.evaluateFlowFilter(filter, request);
      if (!result) {
        return false;
      }
    }

    return true;
  }

  /**
   * 评估单个 Flow Filter
   */
  private evaluateFlowFilter(filter: FlowFilter, request: ClickRequest): boolean {
    const fieldValue = this.getFieldValue(filter.target, request);

    // 使用 flow.filters.ts 中的 executeFilter
    const { executeFilter } = require('@/utils/flow.filters');
    return executeFilter(filter.operator, fieldValue, filter.value);
  }

  /**
   * 从请求中获取字段值
   */
  private getFieldValue(field: string, request: ClickRequest): unknown {
    if (!field || typeof field !== 'string') {
      return undefined;
    }
    if (field.startsWith('visitor.')) {
      const visitorField = field.replace('visitor.', '');
      switch (visitorField) {
        case 'ip': return request.ip;
        case 'userAgent': return request.userAgent;
        case 'country': return request.country;
        case 'city': return request.city;
        case 'device': return request.device;
        case 'browser': return request.browser;
        case 'os': return request.os;
        default: return undefined;
      }
    }

    // visit.* 字段映射
    if (field.startsWith('visit.')) {
      const visitField = field.replace('visit.', '');
      switch (visitField) {
        case 'subId': return request.subId1;
        case 'referrer': return request.referer;
        default: return undefined;
      }
    }

    // 从 URL 参数中获取
    if (request.urlParams) {
      return request.urlParams.get(field) || undefined;
    }

    return undefined;
  }

  /**
   * 按权重选择 Flow
   */
  private selectByWeight(flows: Flow[]): Flow | null {
    if (flows.length === 0) {
      return null;
    }

    const totalWeight = flows.reduce((sum, f) => sum + f.weight, 0);
    let random = Math.random() * totalWeight;

    for (const flow of flows) {
      random -= flow.weight;
      if (random <= 0) {
        return flow;
      }
    }

    return flows[flows.length - 1] ?? null;
  }
}
