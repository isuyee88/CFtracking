// Bulk Operations Service - Unit Tests
// 批量操作服务的单元测试

import { describe, it, expect, beforeEach } from 'vitest';
import { BulkOperationsService } from './bulk-operations.service';

// Mock D1 Database
const createMockDB = () => {
  const batchResults: any[] = [];
  const db: any = {
    prepare: (sql: string) => ({
      bind: (...params: any[]) => ({
        sql,
        params,
        all: async () => db.all(),
      }),
    }),
    batch: async (statements: any[]) => {
      batchResults.push(...statements);
      return statements.map(() => ({ success: true }));
    },
    all: async () => ({ results: [] }),
  };
  return db;
};

describe('BulkOperationsService', () => {
  let service: BulkOperationsService;
  let mockDB: any;

  beforeEach(() => {
    mockDB = createMockDB();
    service = new BulkOperationsService(mockDB as any);
  });

  describe('bulkActivate', () => {
    it('should activate multiple campaigns', async () => {
      const ids = ['camp1', 'camp2', 'camp3'];
      
      const result = await service.bulkActivate(ids);
      
      expect(result.success).toBe(true);
      expect(result.processed).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should throw error when no IDs provided', async () => {
      await expect(service.bulkActivate([])).rejects.toThrow('Campaign IDs are required');
    });

    it('should handle batch errors', async () => {
      mockDB.batch = async () => {
        throw new Error('Database error');
      };

      const result = await service.bulkActivate(['camp1']);
      
      expect(result.success).toBe(false);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]!.error).toBe('Database error');
    });
  });

  describe('bulkPause', () => {
    it('should pause multiple campaigns', async () => {
      const ids = ['camp1', 'camp2'];
      
      const result = await service.bulkPause(ids);
      
      expect(result.success).toBe(true);
      expect(result.processed).toBe(2);
      expect(result.failed).toBe(0);
    });

    it('should throw error when no IDs provided', async () => {
      await expect(service.bulkPause([])).rejects.toThrow('Campaign IDs are required');
    });
  });

  describe('bulkDelete', () => {
    it('should delete campaigns and related data', async () => {
      const ids = ['camp1'];
      
      const result = await service.bulkDelete(ids);
      
      expect(result.success).toBe(true);
      expect(result.processed).toBe(1);
    });

    it('should delete flow relations, rules, bindings, flows, then the campaign', async () => {
      const batchCalls: any[] = [];
      mockDB.batch = async (statements: any[]) => {
        batchCalls.push(statements);
        return statements.map(() => ({ success: true }));
      };

      await service.bulkDelete(['camp1']);

      const statements = batchCalls[0]!;
      const sqls = statements.map((statement: any) => statement.sql as string);

      // Relations -> flows -> autorule scopes -> campaign bindings -> campaign.
      expect(sqls).toHaveLength(12);
      expect(sqls[0]).toContain('DELETE FROM flowOffers');
      expect(sqls[1]).toContain('DELETE FROM flowLandingPages');
      expect(sqls[2]).toContain('DELETE FROM flowRules');
      expect(sqls[3]).toContain('DELETE FROM flow_rules');
      expect(sqls[4]).toContain('DELETE FROM flow_rule_binding_entries');
      expect(sqls[5]).toContain('DELETE FROM flow_rule_bindings');
      expect(sqls[6]).toContain('DELETE FROM flows');
      expect(sqls[7]).toContain('DELETE FROM autorule_scope_bindings');
      expect(sqls[8]).toContain('DELETE FROM autorule_scope_configs');
      expect(sqls[9]).toContain('DELETE FROM campaign_rule_binding_entries');
      expect(sqls[10]).toContain('DELETE FROM campaign_rule_bindings');
      expect(sqls[11]).toContain('DELETE FROM campaigns');

      // offers/landingPages are global libraries and must never be deleted.
      expect(sqls.join('\n')).not.toContain('DELETE FROM offers');
      expect(sqls.join('\n')).not.toContain('DELETE FROM landingPages');
    });
  });

  describe('bulkUpdate', () => {
    it('should update multiple fields', async () => {
      const ids = ['camp1', 'camp2'];
      const updates = {
        costModel: 'cpc' as const,
        costValue: 0.5,
        status: 'paused' as const,
      };
      
      const result = await service.bulkUpdate(ids, updates);
      
      expect(result.success).toBe(true);
      expect(result.processed).toBe(2);
    });

    it('should throw error when no updates provided', async () => {
      await expect(service.bulkUpdate(['camp1'], {})).rejects.toThrow(
        'At least one update field is required'
      );
    });

    it('should update single field', async () => {
      const result = await service.bulkUpdate(['camp1'], { status: 'active' });
      
      expect(result.success).toBe(true);
    });

    it('should quote the reserved group column and use camelCase updatedAt', async () => {
      const batchCalls: any[] = [];
      mockDB.batch = async (statements: any[]) => {
        batchCalls.push(statements);
        return statements.map(() => ({ success: true }));
      };

      await service.bulkUpdate(['camp1'], { group: 'Test Group', status: 'active' });

      const sql = batchCalls[0]![0]!.sql as string;
      expect(sql).toContain('"group" = ?');
      expect(sql).toContain("updatedAt = datetime('now')");
      expect(sql).not.toContain('updated_at');
    });

    it('should handle group field (SQL reserved word)', async () => {
      const result = await service.bulkUpdate(['camp1'], { group: 'Test Group' });
      
      expect(result.success).toBe(true);
    });
  });

  describe('validateCampaigns', () => {
    it('should return valid and invalid IDs', async () => {
      mockDB.all = async () => ({
        results: [{ id: 'camp1' }, { id: 'camp2' }],
      });

      const result = await service.validateCampaigns(['camp1', 'camp2', 'invalid']);
      
      expect(result.valid).toEqual(['camp1', 'camp2']);
      expect(result.invalid).toEqual(['invalid']);
    });

    it('should handle all invalid IDs', async () => {
      mockDB.all = async () => ({ results: [] });

      const result = await service.validateCampaigns(['invalid1', 'invalid2']);
      
      expect(result.valid).toHaveLength(0);
      expect(result.invalid).toEqual(['invalid1', 'invalid2']);
    });
  });
});
