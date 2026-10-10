// Bulk Operations Service
// 批量操作 Campaigns 的服务层

import type { D1Database } from '@cloudflare/workers-types';

export interface BulkResult {
  success: boolean;
  processed: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
}

export interface BulkUpdateOptions {
  costModel?: 'cpc' | 'cpm' | 'cpa' | 'flat';
  costValue?: number;
  trafficSource?: string;
  group?: string;
  status?: 'active' | 'paused';
}

export class BulkOperationsService {
  constructor(private db: D1Database) {}

  /**
   * 批量启动 Campaigns
   */
  async bulkActivate(ids: string[]): Promise<BulkResult> {
    if (!ids || ids.length === 0) {
      throw new Error('Campaign IDs are required');
    }

    const result: BulkResult = {
      success: true,
      processed: 0,
      failed: 0,
      errors: [],
    };

    try {
      // 使用事务确保原子性
      await this.db.batch(
        ids.map(id =>
          this.db.prepare(`
            UPDATE campaigns 
            SET status = 'active', updated_at = datetime('now')
            WHERE id = ?
          `).bind(id)
        )
      );

      result.processed = ids.length;
    } catch (error) {
      result.success = false;
      result.failed = ids.length;
      result.errors.push({
        id: 'batch',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    return result;
  }

  /**
   * 批量暂停 Campaigns
   */
  async bulkPause(ids: string[]): Promise<BulkResult> {
    if (!ids || ids.length === 0) {
      throw new Error('Campaign IDs are required');
    }

    const result: BulkResult = {
      success: true,
      processed: 0,
      failed: 0,
      errors: [],
    };

    try {
      await this.db.batch(
        ids.map(id =>
          this.db.prepare(`
            UPDATE campaigns 
            SET status = 'paused', updated_at = datetime('now')
            WHERE id = ?
          `).bind(id)
        )
      );

      result.processed = ids.length;
    } catch (error) {
      result.success = false;
      result.failed = ids.length;
      result.errors.push({
        id: 'batch',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    return result;
  }

  /**
   * 批量删除 Campaigns
   */
  async bulkDelete(ids: string[]): Promise<BulkResult> {
    if (!ids || ids.length === 0) {
      throw new Error('Campaign IDs are required');
    }

    const result: BulkResult = {
      success: true,
      processed: 0,
      failed: 0,
      errors: [],
    };

    try {
      // 删除 Campaign 及其关联数据
      const statements = ids.flatMap(id => [
        // 删除 Flows
        this.db.prepare('DELETE FROM flows WHERE campaign_id = ?').bind(id),
        // 删除 Offers
        this.db.prepare('DELETE FROM offers WHERE flow_id IN (SELECT id FROM flows WHERE campaign_id = ?)').bind(id),
        // 删除 Landings
        this.db.prepare('DELETE FROM landings WHERE flow_id IN (SELECT id FROM flows WHERE campaign_id = ?)').bind(id),
        // 删除 Autorule Bindings
        this.db.prepare('DELETE FROM campaign_autorule_bindings WHERE campaign_id = ?').bind(id),
        // 删除 Campaign
        this.db.prepare('DELETE FROM campaigns WHERE id = ?').bind(id),
      ]);

      await this.db.batch(statements);
      result.processed = ids.length;
    } catch (error) {
      result.success = false;
      result.failed = ids.length;
      result.errors.push({
        id: 'batch',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    return result;
  }

  /**
   * 批量更新 Campaign 字段
   */
  async bulkUpdate(ids: string[], updates: BulkUpdateOptions): Promise<BulkResult> {
    if (!ids || ids.length === 0) {
      throw new Error('Campaign IDs are required');
    }

    if (Object.keys(updates).length === 0) {
      throw new Error('At least one update field is required');
    }

    const result: BulkResult = {
      success: true,
      processed: 0,
      failed: 0,
      errors: [],
    };

    try {
      // 构建 SET 子句
      const setClauses: string[] = [];
      const params: any[] = [];

      if (updates.costModel !== undefined) {
        setClauses.push('cost_model = ?');
        params.push(updates.costModel);
      }
      if (updates.costValue !== undefined) {
        setClauses.push('cost_value = ?');
        params.push(updates.costValue);
      }
      if (updates.trafficSource !== undefined) {
        setClauses.push('traffic_source = ?');
        params.push(updates.trafficSource);
      }
      if (updates.group !== undefined) {
        setClauses.push('\"group\" = ?');
        params.push(updates.group);
      }
      if (updates.status !== undefined) {
        setClauses.push('status = ?');
        params.push(updates.status);
      }

      setClauses.push('updated_at = datetime(\'now\')');

      const setClause = setClauses.join(', ');

      // 批量更新
      await this.db.batch(
        ids.map(id =>
          this.db.prepare(`
            UPDATE campaigns 
            SET ${setClause}
            WHERE id = ?
          `).bind(...params, id)
        )
      );

      result.processed = ids.length;
    } catch (error) {
      result.success = false;
      result.failed = ids.length;
      result.errors.push({
        id: 'batch',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    return result;
  }

  /**
   * 验证 Campaigns 是否存在
   */
  async validateCampaigns(ids: string[]): Promise<{ valid: string[]; invalid: string[] }> {
    const placeholders = ids.map(() => '?').join(',');
    const result = await this.db
      .prepare(`SELECT id FROM campaigns WHERE id IN (${placeholders})`)
      .bind(...ids)
      .all();

    const validIds = result.results.map((row: any) => row.id);
    const invalidIds = ids.filter(id => !validIds.includes(id));

    return { valid: validIds, invalid: invalidIds };
  }
}
