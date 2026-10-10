/**
 * @fileoverview 自定义指标服务
 * @description 处理自定义指标的 CRUD 和计算
 * @module services/customMetric/customMetric.service
 * 
 * Input: 自定义指标操作请求
 * Output: 自定义指标数据或计算结果
 * Logic Interaction: 
 *   - 使用 CustomMetricRepository 管理指标数据
 *   - 使用 MetricCalculationEngine 执行计算
 * Frontend-Backend: 为 Custom Metrics 页面提供 API
 */

import type { Env } from '@/config/env';
import { CustomMetricRepository } from '@/handlers/d1/customMetric.repo';
import { MetricCalculationEngine } from './metric.engine';
import { getD1Connection } from '@/handlers/d1';
import type {
  CustomMetric,
  CreateCustomMetricDTO,
  UpdateCustomMetricDTO,
  CustomMetricListParams,
  CustomMetricListResult,
  MetricCalculationContext,
  MetricCalculationResult,
} from '@/types/customMetric';

export class CustomMetricService {
  private env: Env;
  private engine: MetricCalculationEngine;

  constructor(env: Env) {
    this.env = env;
    this.engine = new MetricCalculationEngine();
  }

  /**
   * 创建自定义指标
   */
  async createMetric(data: CreateCustomMetricDTO): Promise<CustomMetric> {
    const db = getD1Connection(this.env);
    const repo = new CustomMetricRepository(db);

    // 检查名称是否已存在
    const nameExists = await repo.nameExists(data.name);
    if (nameExists) {
      throw new Error(`Metric with name "${data.name}" already exists`);
    }

    // 验证公式
    const validation = this.engine.validateFormula(data.formula);
    if (!validation.valid) {
      throw new Error(`Invalid formula: ${validation.error}`);
    }

    return repo.create(data);
  }

  /**
   * 更新自定义指标
   */
  async updateMetric(id: string, data: UpdateCustomMetricDTO): Promise<CustomMetric | null> {
    const db = getD1Connection(this.env);
    const repo = new CustomMetricRepository(db);

    // 检查是否存在
    const existing = await repo.findById(id);
    if (!existing) {
      return null;
    }

    // 系统指标不允许修改
    if (existing.isSystem) {
      throw new Error('Cannot modify system metrics');
    }

    // 如果更新公式,验证新公式
    if (data.formula) {
      const validation = this.engine.validateFormula(data.formula);
      if (!validation.valid) {
        throw new Error(`Invalid formula: ${validation.error}`);
      }
    }

    const updated = await repo.update(id, data);
    return updated;
  }

  /**
   * 删除自定义指标
   */
  async deleteMetric(id: string): Promise<boolean> {
    const db = getD1Connection(this.env);
    const repo = new CustomMetricRepository(db);

    // 检查是否存在
    const existing = await repo.findById(id);
    if (!existing) {
      return false;
    }

    // 系统指标不允许删除
    if (existing.isSystem) {
      throw new Error('Cannot delete system metrics');
    }

    // 软删除
    await repo.update(id, { status: 'deleted' });
    return true;
  }

  /**
   * 获取指标详情
   */
  async getMetric(id: string): Promise<CustomMetric | null> {
    const db = getD1Connection(this.env);
    const repo = new CustomMetricRepository(db);
    return repo.findById(id);
  }

  /**
   * 获取指标列表
   */
  async getMetrics(params: CustomMetricListParams): Promise<CustomMetricListResult> {
    const db = getD1Connection(this.env);
    const repo = new CustomMetricRepository(db);
    return repo.findMetrics(params);
  }

  /**
   * 获取所有活跃指标
   */
  async getActiveMetrics(): Promise<CustomMetric[]> {
    const db = getD1Connection(this.env);
    const repo = new CustomMetricRepository(db);
    return repo.getActiveMetrics();
  }

  /**
   * 获取系统指标
   */
  async getSystemMetrics(): Promise<CustomMetric[]> {
    const db = getD1Connection(this.env);
    const repo = new CustomMetricRepository(db);
    return repo.getSystemMetrics();
  }

  /**
   * 计算指标
   */
  async calculateMetric(
    metricId: string,
    context: MetricCalculationContext
  ): Promise<MetricCalculationResult | null> {
    const metrics = await this.getActiveMetrics();
    const metric = metrics.find(m => m.id === metricId);
    
    if (!metric) {
      return null;
    }

    return this.engine.calculate(metric, context);
  }

  /**
   * 批量计算指标
   */
  async calculateMetrics(
    metricIds: string[],
    context: MetricCalculationContext
  ): Promise<Record<string, MetricCalculationResult>> {
    const metrics = await this.getActiveMetrics();
    const filteredMetrics = metrics.filter(m => metricIds.includes(m.id));
    
    return this.engine.calculateBatch(filteredMetrics, context);
  }

  /**
   * 验证公式
   */
  validateFormula(formula: string): { valid: boolean; error?: string; variables?: string[] } {
    const validation = this.engine.validateFormula(formula);
    
    if (!validation.valid) {
      return validation;
    }

    const variables = this.engine.extractVariables(formula);
    return { valid: true, variables };
  }

  /**
   * 预览计算结果
   */
  previewCalculation(
    formula: string,
    context: MetricCalculationContext
  ): MetricCalculationResult {
    const metric = {
      id: 'preview',
      name: 'preview',
      displayName: 'Preview',
      type: 'calculated' as const,
      formula,
      dataType: 'number' as const,
      format: 'number' as const,
      decimals: 2,
      status: 'active' as const,
      isSystem: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return this.engine.calculate(metric, context);
  }
}

export function createCustomMetricService(env: Env): CustomMetricService {
  return new CustomMetricService(env);
}
