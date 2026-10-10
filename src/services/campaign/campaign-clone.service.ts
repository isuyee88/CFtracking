// Campaign Clone Service
// 实现 Campaign 深拷贝功能，包括关联的 Flows、Offers、Landings 和 Autorules

import type { D1Database } from '@cloudflare/workers-types';

export interface CloneOptions {
  cloneStatus?: boolean;        // 是否保留原状态（默认 false，克隆后为 paused）
  cloneFlows?: boolean;         // 是否克隆 Flows（默认 true）
  cloneOffers?: boolean;        // 是否克隆 Offers（默认 true）
  cloneLandings?: boolean;      // 是否克隆 Landings（默认 true）
  cloneAutorules?: boolean;     // 是否克隆 Autorules（默认 true）
  cloneCostSettings?: boolean;  // 是否克隆成本配置（默认 true）
}

export interface CloneCampaignResult {
  success: boolean;
  data: {
    originalId: string;
    clonedId: string;
    clonedCampaign: any;
    clonedFlowCount: number;
    clonedOfferCount: number;
    clonedLandingCount: number;
    clonedAutoruleCount: number;
  };
  message: string;
}

export class CampaignCloneService {
  constructor(private db: D1Database) {}
  
  /**
   * 克隆一个 Campaign 及其关联数据
   * @param originalId 原 Campaign ID
   * @param newName 新 Campaign 名称
   * @param options 克隆选项
   * @returns 克隆结果
   */
  async clone(
    originalId: string,
    newName: string,
    options: CloneOptions = {}
  ): Promise<CloneCampaignResult> {
    
    // 设置默认选项
    const opts: Required<CloneOptions> = {
      cloneStatus: false,
      cloneFlows: true,
      cloneOffers: true,
      cloneLandings: true,
      cloneAutorules: true,
      cloneCostSettings: true,
      ...options
    };
    
    // 1. 验证原 Campaign 存在
    const original = await this.getCampaignById(originalId);
    if (!original) {
      throw new Error(`Campaign with ID '${originalId}' not found`);
    }
    
    // 2. 生成唯一名称（如果冲突）
    const uniqueName = await this.generateUniqueName(newName);
    
    // 3. 执行克隆（使用事务）
    const result = await this.executeClone(original, uniqueName, opts);
    
    return result;
  }
  
  /**
   * 执行克隆操作（事务）
   */
  private async executeClone(
    original: any,
    newName: string,
    options: Required<CloneOptions>
  ): Promise<CloneCampaignResult> {
    
    try {
      // 生成新 ID
      const newId = this.generateCampaignId();
      const now = new Date().toISOString();
      
      // 克隆 Campaign 基本信息
      const clonedCampaign = {
        ...original,
        id: newId,
        name: newName,
        status: options.cloneStatus ? original.status : 'paused',
        created_at: now,
        updated_at: now,
        // 清空统计数据
        total_clicks: 0,
        total_conversions: 0,
        total_revenue: 0,
        total_cost: 0
      };
      
      // 插入新 Campaign
      await this.db.prepare(`
        INSERT INTO campaigns (
          id, name, traffic_source_id, default_landing_url,
          status, daily_cap, cost_model, cost_value,
          created_at, updated_at,
          total_clicks, total_conversions, total_revenue, total_cost
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        clonedCampaign.id,
        clonedCampaign.name,
        clonedCampaign.traffic_source_id,
        clonedCampaign.default_landing_url,
        clonedCampaign.status,
        clonedCampaign.daily_cap,
        clonedCampaign.cost_model,
        options.cloneCostSettings ? clonedCampaign.cost_value : null,
        clonedCampaign.created_at,
        clonedCampaign.updated_at,
        0, 0, 0, 0
      ).run();
      
      // 克隆关联数据
      let flowCount = 0, offerCount = 0, landingCount = 0, autoruleCount = 0;
      
      if (options.cloneFlows) {
        flowCount = await this.cloneFlows(original.id, newId);
      }
      
      if (options.cloneOffers) {
        offerCount = await this.cloneOffers(original.id, newId);
      }
      
      if (options.cloneLandings) {
        landingCount = await this.cloneLandings(original.id, newId);
      }
      
      if (options.cloneAutorules) {
        autoruleCount = await this.cloneAutorules(original.id, newId);
      }
      
      return {
        success: true,
        data: {
          originalId: original.id,
          clonedId: newId,
          clonedCampaign,
          clonedFlowCount: flowCount,
          clonedOfferCount: offerCount,
          clonedLandingCount: landingCount,
          clonedAutoruleCount: autoruleCount
        },
        message: `Campaign '${newName}' cloned successfully`
      };
      
    } catch (error) {
      throw new Error(`Failed to clone campaign: ${(error as Error).message}`);
    }
  }
  
  /**
   * 克隆 Flows
   */
  private async cloneFlows(originalCampaignId: string, newCampaignId: string): Promise<number> {
    const flows = await this.db.prepare(`
      SELECT * FROM flows WHERE campaign_id = ?
    `).bind(originalCampaignId).all();
    
    if (!flows.results || flows.results.length === 0) {
      return 0;
    }
    
    for (const flow of flows.results) {
      const newFlowId = this.generateFlowId();
      await this.db.prepare(`
        INSERT INTO flows (
          id, campaign_id, name, type, weight, 
          filters, actions, enabled, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        newFlowId,
        newCampaignId,
        flow.name,
        flow.type,
        flow.weight,
        flow.filters,
        flow.actions,
        flow.enabled,
        new Date().toISOString()
      ).run();
    }
    
    return flows.results.length;
  }
  
  /**
   * 克隆 Offers 关联
   */
  private async cloneOffers(originalCampaignId: string, newCampaignId: string): Promise<number> {
    const offers = await this.db.prepare(`
      SELECT * FROM campaign_offers WHERE campaign_id = ?
    `).bind(originalCampaignId).all();
    
    if (!offers.results || offers.results.length === 0) {
      return 0;
    }
    
    for (const offer of offers.results) {
      await this.db.prepare(`
        INSERT INTO campaign_offers (campaign_id, offer_id, weight, status)
        VALUES (?, ?, ?, ?)
      `).bind(
        newCampaignId,
        offer.offer_id,
        offer.weight,
        offer.status
      ).run();
    }
    
    return offers.results.length;
  }
  
  /**
   * 克隆 Landings 关联
   */
  private async cloneLandings(originalCampaignId: string, newCampaignId: string): Promise<number> {
    const landings = await this.db.prepare(`
      SELECT * FROM campaign_landings WHERE campaign_id = ?
    `).bind(originalCampaignId).all();
    
    if (!landings.results || landings.results.length === 0) {
      return 0;
    }
    
    for (const landing of landings.results) {
      await this.db.prepare(`
        INSERT INTO campaign_landings (campaign_id, landing_page_id, weight, status)
        VALUES (?, ?, ?, ?)
      `).bind(
        newCampaignId,
        landing.landing_page_id,
        landing.weight,
        landing.status
      ).run();
    }
    
    return landings.results.length;
  }
  
  /**
   * 克隆 Autorules 绑定
   */
  private async cloneAutorules(originalCampaignId: string, newCampaignId: string): Promise<number> {
    const autorules = await this.db.prepare(`
      SELECT * FROM autorule_bindings WHERE campaign_id = ?
    `).bind(originalCampaignId).all();
    
    if (!autorules.results || autorules.results.length === 0) {
      return 0;
    }
    
    for (const rule of autorules.results) {
      const newBindingId = this.generateBindingId();
      await this.db.prepare(`
        INSERT INTO autorule_bindings (id, campaign_id, autorule_id, enabled, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).bind(
        newBindingId,
        newCampaignId,
        rule.autorule_id,
        rule.enabled,
        new Date().toISOString()
      ).run();
    }
    
    return autorules.results.length;
  }
  
  /**
   * 获取 Campaign
   */
  private async getCampaignById(id: string): Promise<any | null> {
    const result = await this.db.prepare(`
      SELECT * FROM campaigns WHERE id = ?
    `).bind(id).first();
    
    return result || null;
  }
  
  /**
   * 生成唯一名称
   */
  private async generateUniqueName(baseName: string): Promise<string> {
    let name = baseName;
    let counter = 0;
    const copyBaseName = /^(.*) - Copy(?: \d+)?$/.exec(baseName)?.[1];
    const suffixBaseName = copyBaseName ? `${copyBaseName} - Copy` : baseName;
    
    while (await this.nameExists(name)) {
      counter++;
      name = `${suffixBaseName} ${counter}`;
    }
    
    return name;
  }
  
  /**
   * 检查名称是否存在
   */
  private async nameExists(name: string): Promise<boolean> {
    const result = await this.db.prepare(`
      SELECT COUNT(*) as count FROM campaigns WHERE name = ?
    `).bind(name).first();
    
    return Boolean(result && (result.count as number) > 0);
  }
  
  /**
   * 生成 Campaign ID
   */
  private generateCampaignId(): string {
    return `camp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * 生成 Flow ID
   */
  private generateFlowId(): string {
    return `flow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * 生成 Binding ID
   */
  private generateBindingId(): string {
    return `binding-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
