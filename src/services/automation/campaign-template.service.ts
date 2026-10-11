/**
 * @fileoverview Campaign 模板管理服务
 * @description 管理 Campaign 创建模板，支持参数化配置
 */

import type { CampaignTemplate } from '@/types/automationRule';

export interface CampaignTemplateConfig {
  name: string;
  platform: string;
  
  // 基础配置
  bid?: number;
  daily_budget?: number;
  
  // 定向配置
  targeting?: {
    geos?: string[];
    devices?: string[];
    os?: string[];
    browsers?: string[];
    connection_types?: string[];
  };
  
  // 时间配置
  schedule?: {
    start_time?: string;
    end_time?: string;
    timezone?: string;
  };
  
  // 创意配置
  creatives?: {
    title?: string;
    description?: string;
    image_url?: string;
    landing_page_url?: string;
  };
}

export class CampaignTemplateService {
  constructor(private db: D1Database) {}

  /**
   * 创建模板
   */
  async createTemplate(config: CampaignTemplateConfig): Promise<CampaignTemplate> {
    const id = `template-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    await this.db.prepare(`
      INSERT INTO campaign_templates (
        id, name, platform, config, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).bind(
      id,
      config.name,
      config.platform,
      JSON.stringify(config)
    ).run();

    return await this.getTemplate(id) as CampaignTemplate;
  }

  /**
   * 获取模板
   */
  async getTemplate(id: string): Promise<CampaignTemplate | null> {
    const result = await this.db.prepare(
      'SELECT * FROM campaign_templates WHERE id = ? AND status = ?'
    ).bind(id, 'active').first();

    if (!result) return null;

    return {
      id: result.id as string,
      name: result.name as string,
      platform: result.platform as string,
      config: JSON.parse(result.config as string),
      status: result.status as 'active' | 'archived',
      usage_count: result.usage_count as number,
      success_rate: result.success_rate as number,
      created_at: result.created_at as string,
      updated_at: result.updated_at as string
    };
  }

  /**
   * 列出所有模板
   */
  async listTemplates(platform?: string): Promise<CampaignTemplate[]> {
    let query = 'SELECT * FROM campaign_templates WHERE status = ?';
    const params: any[] = ['active'];

    if (platform) {
      query += ' AND platform = ?';
      params.push(platform);
    }

    query += ' ORDER BY usage_count DESC, created_at DESC';

    const { results } = await this.db.prepare(query).bind(...params).all();

    return results.map(row => ({
      id: row.id as string,
      name: row.name as string,
      platform: row.platform as string,
      config: JSON.parse(row.config as string),
      status: row.status as 'active' | 'archived',
      usage_count: row.usage_count as number,
      success_rate: row.success_rate as number,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string
    }));
  }

  /**
   * 根据模板创建 Campaign 配置
   */
  async generateCampaignConfig(
    templateId: string,
    overrides?: Partial<CampaignTemplateConfig>
  ): Promise<any> {
    const template = await this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // 合并模板配置和覆盖值
    const config = {
      ...template.config,
      ...overrides,
      targeting: {
        ...template.config.targeting,
        ...overrides?.targeting
      }
    };

    // 记录使用
    await this.incrementUsage(templateId);

    return config;
  }

  /**
   * 增加使用计数
   */
  private async incrementUsage(templateId: string): Promise<void> {
    await this.db.prepare(`
      UPDATE campaign_templates
      SET usage_count = usage_count + 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(templateId).run();
  }

  /**
   * 更新成功率
   */
  async updateSuccessRate(templateId: string, success: boolean): Promise<void> {
    const template = await this.getTemplate(templateId);
    if (!template) return;

    const totalUsage = template.usage_count;
    const successCount = Math.round(template.success_rate * totalUsage / 100);
    const newSuccessCount = successCount + (success ? 1 : 0);
    const newSuccessRate = (newSuccessCount / totalUsage) * 100;

    await this.db.prepare(`
      UPDATE campaign_templates
      SET success_rate = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(newSuccessRate, templateId).run();
  }

  /**
   * 归档模板
   */
  async archiveTemplate(id: string): Promise<void> {
    await this.db.prepare(`
      UPDATE campaign_templates
      SET status = 'archived',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(id).run();
  }
}
