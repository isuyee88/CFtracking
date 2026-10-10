/**
 * @fileoverview Traffic Source 参数映射服务
 * @description 处理流量源参数映射和跟踪 URL 生成
 * @module services/trafficSource/paramMapping.service
 */

import type { Env } from '@/config/env';
import type { D1Database } from '@/handlers/d1/index';
import {
  ParameterMappingRule,
  TrafficSourceTemplate,
  ParameterValidation,
} from '@/types/paramMapping';
import { nanoid } from 'nanoid';

function getD1Connection(env: Env): D1Database {
  return env.DB;
}

export class ParamMappingService {
  private db: D1Database;
  private baseUrl: string;

  constructor(env: Env) {
    this.db = getD1Connection(env);
    this.baseUrl = (env as any).BASE_URL || 'https://cf-tracking.suyee88.workers.dev';
  }

  applyMapping(
    sourceParams: Record<string, string>,
    mapping: ParameterMappingRule[]
  ): Record<string, string> {
    const result: Record<string, string> = {};

    for (const rule of mapping) {
      const sourceValue = sourceParams[rule.sourceParam];
      
      if (sourceValue !== undefined) {
        let value = sourceValue;
        
        switch (rule.transform) {
          case 'lowercase':
            value = value.toLowerCase();
            break;
          case 'uppercase':
            value = value.toUpperCase();
            break;
          case 'trim':
            value = value.trim();
            break;
        }
        
        result[rule.targetParam] = value;
      } else if (rule.defaultValue !== undefined) {
        result[rule.targetParam] = rule.defaultValue;
      }
    }

    return result;
  }

  validateParameters(
    params: Record<string, string>,
    mapping: ParameterMappingRule[]
  ): ParameterValidation {
    const errors: { param: string; message: string }[] = [];
    const warnings: { param: string; message: string }[] = [];

    for (const rule of mapping) {
      if (rule.required && !params[rule.sourceParam]) {
        errors.push({
          param: rule.sourceParam,
          message: `Required parameter '${rule.sourceParam}' is missing`,
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  parseUrlParams(url: string): Record<string, string> {
    try {
      const urlObj = new URL(url);
      const params: Record<string, string> = {};
      
      urlObj.searchParams.forEach((value, key) => {
        params[key] = value;
      });
      
      return params;
    } catch {
      return {};
    }
  }

  generateTrackingUrl(
    campaignId: string,
    trafficSourceId: string,
    mapping: ParameterMappingRule[],
    customParams?: Record<string, string>
  ): string {
    const params = new URLSearchParams();
    
    params.set('campaign_id', campaignId);
    params.set('ts_id', trafficSourceId);
    
    for (const rule of mapping) {
      if (rule.defaultValue) {
        params.set(rule.sourceParam, rule.defaultValue);
      }
    }
    
    if (customParams) {
      for (const [key, value] of Object.entries(customParams)) {
        params.set(key, value);
      }
    }
    
    return `${this.baseUrl}/click?${params.toString()}`;
  }

  async getTemplates(): Promise<TrafficSourceTemplate[]> {
    const results = await this.db
      .prepare('SELECT * FROM traffic_source_templates ORDER BY category, name')
      .all<TrafficSourceTemplate>();
    
    return (results.results || []).map(t => ({
      ...t,
      parameters: JSON.parse(t.parameters as unknown as string),
    }));
  }

  async getTemplateById(id: string): Promise<TrafficSourceTemplate | null> {
    const result = await this.db
      .prepare('SELECT * FROM traffic_source_templates WHERE id = ?')
      .bind(id)
      .first<TrafficSourceTemplate>();
    
    if (!result) return null;
    
    return {
      ...result,
      parameters: JSON.parse(result.parameters as unknown as string),
    };
  }

  async createTemplate(template: Omit<TrafficSourceTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<TrafficSourceTemplate> {
    const id = `tpl-${nanoid(8)}`;
    const now = new Date().toISOString();

    await this.db
      .prepare(`
        INSERT INTO traffic_source_templates (id, name, category, type, parameters, postbackUrl, postbackMacros, isCustom, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      `)
      .bind(
        id,
        template.name,
        template.category || null,
        template.type,
        JSON.stringify(template.parameters),
        template.postbackUrl || null,
        template.postbackMacros ? JSON.stringify(template.postbackMacros) : null,
        now,
        now
      )
      .run();

    return (await this.getTemplateById(id))!;
  }

  async applyTemplateToTrafficSource(trafficSourceId: string, templateId: string): Promise<void> {
    const template = await this.getTemplateById(templateId);
    if (!template) throw new Error('Template not found');

    await this.db
      .prepare('UPDATE traffic_sources SET parameterMapping = ?, templateId = ?, updatedAt = ? WHERE id = ?')
      .bind(JSON.stringify(template.parameters), templateId, new Date().toISOString(), trafficSourceId)
      .run();
  }

  async updateParameterMapping(trafficSourceId: string, mapping: ParameterMappingRule[]): Promise<void> {
    await this.db
      .prepare('UPDATE traffic_sources SET parameterMapping = ?, updatedAt = ? WHERE id = ?')
      .bind(JSON.stringify(mapping), new Date().toISOString(), trafficSourceId)
      .run();
  }
}

export function createParamMappingService(env: Env): ParamMappingService {
  return new ParamMappingService(env);
}
