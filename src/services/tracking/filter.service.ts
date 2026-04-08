/**
 * @fileoverview Flow Filter 服务
 * @description 处理 Flow 的过滤逻辑，根据请求条件筛选合适的 Flow
 * @module services/tracking/filter.service.ts
 *
 * 输入: Flow 列表和点击请求信息
 * 输出: 过滤后的 Flow 列表或单个 Flow
 *
 * 逻辑交互: 被 click.service.ts 调用
 *
 * 优先级链 (对标Keitaro标准):
 *   1. Forced Flow (强制流程) - 如果存在且规则匹配, 直接返回 (最高优先级)
 *   2. Regular Flows (常规流程) - 按权重随机选择
 *   3. Default Flow (默认流程) - 兜底返回 (无需规则匹配)
 *
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
 * 实现Keitaro标准的Flow选择优先级链
 */
export class FilterService {
  /**
   * 选择匹配的 Flow (按Keitaro标准优先级)
   *
   * 优先级链:
   *   1. Forced Flow (强制流程) - 如果有且规则匹配, 直接返回
   *   2. Regular Flows (常规流程) - 按权重随机选择
   *   3. Default Flow (默认流程) - 兜底返回
   *
   * @param flows 所有候选Flow列表
   * @param request 点击请求数据
   * @returns 匹配的Flow, 或null (无匹配且无Default)
   */
  selectMatchingFlow(flows: Flow[], request: ClickRequest): Flow | null {
    if (!flows || flows.length === 0) {
      console.log('[FilterService] No flows provided');
      return null;
    }

    // Step 1: 优先检查 Forced Flow (强制流程)
    const forcedFlows = flows.filter(f => f.type === 'forced');
    for (const flow of forcedFlows) {
      if (this.checkFilters(flow, request)) {
        console.log(`[FilterService] ✓ Matched FORCED flow: ${flow.id} (${flow.name})`);
        return flow;
      }
    }

    // 如果有Forced Flow但未匹配, 记录日志
    if (forcedFlows.length > 0) {
      console.log(`[FilterService] ${forcedFlows.length} forced flow(s) checked but none matched`);
    }

    // Step 2: 筛选匹配的 Regular Flows (常规流程)
    const matchedRegularFlows: Flow[] = [];
    for (const flow of flows) {
      if (flow.type === 'regular' && this.checkFilters(flow, request)) {
        matchedRegularFlows.push(flow);
      }
    }

    // 如果有匹配的 Regular Flows, 按权重选择
    if (matchedRegularFlows.length > 0) {
      const selectedFlow = this.selectByWeight(matchedRegularFlows)!; // 非空断言: length>0保证非null
      console.log(`[FilterService] ✓ Matched REGULAR flow: ${selectedFlow.id} (${selectedFlow.name}) [from ${matchedRegularFlows.length} candidates]`);
      return selectedFlow;
    }

    // Step 3: 兜底返回 Default Flow (默认流程, 无需规则匹配)
    const defaultFlow = flows.find(f => f.type === 'default');
    if (defaultFlow) {
      console.log(`[FilterService] Using DEFAULT flow: ${defaultFlow.id} (${defaultFlow.name})`);
      return defaultFlow;
    }

    // 无任何匹配
    console.log('[FilterService] ✗ No matching flow found (no forced/regular matched, no default)');
    return null;
  }

  /**
   * 检查单个Flow是否通过所有过滤器
   * @param flow 待检查的Flow
   * @param request 点击请求数据
   * @returns 是否通过所有过滤器
   */
  checkFilters(flow: Flow, request: ClickRequest): boolean {
    return this.checkFlowByFilters(flow, request);
  }

  /**
   * 根据 Flow 自身的 filters 检查是否匹配
   */
  private checkFlowByFilters(flow: Flow, request: ClickRequest): boolean {
    // 如果 Flow 没有 filters 或为空数组，默认通过
    if (!flow.filters || flow.filters.length === 0) {
      return true;
    }

    // 评估所有 filter 条件 (AND逻辑: 所有条件都必须满足)
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

    // visitor.* 字段映射
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
   * 按权重选择 Flow (加权随机算法)
   * @param flows 候选Flow列表 (必须非空)
   * @returns 选中的Flow
   */
  selectByWeight(flows: Flow[]): Flow | null {
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
