/**
 * @fileoverview 审批工作流服务
 * @description 管理自动化操作的审批流程、超时处理和通知
 * @module services/auto-optimization/approval
 *
 * 核心能力:
 * 1. 创建审批请求并设置超时
 * 2. 处理审批/拒绝决策
 * 3. 自动过期处理
 * 4. WebSocket通知集成
 *
 * 状态机: pending → approved/rejected/expired
 */

import { AutoOptimizationRepository } from '@/handlers/d1/auto-optimization.repo';
import { getD1Connection } from '@/handlers/d1';
import type { Env } from '@/config/env';
import type {
  ApprovalRequest,
  AutoOperation,
} from '@/types/auto-optimization';

export class ApprovalWorkflowService {
  private repo: AutoOptimizationRepository;
  private env: Env;

  constructor(env: Env) {
    this.env = env;
    const db = getD1Connection(env);
    this.repo = new AutoOptimizationRepository(db);
  }

  /**
   * 为需要审批的操作创建审批请求
   */
  async createApprovalForOperation(
    operationId: string,
    options?: {
      expiresInMinutes?: number;
      notificationChannels?: string[];
    }
  ): Promise<ApprovalRequest> {
    const request = await this.repo.createApprovalRequest({
      operationId,
      expiresInMinutes: options?.expiresInMinutes,
      notificationChannels: options?.notificationChannels,
    });

    await this.repo.updateOperationStatus(operationId, {
      approvalStatus: 'pending',
    });

    console.log(`[Approval] Created approval request ${request.id} for operation ${operationId}`);

    return request;
  }

  /**
   * 批准操作
   */
  async approve(requestId: string, reviewerId: string, note?: string): Promise<AutoOperation | null> {
    await this.repo.approveRequest(requestId, reviewerId, note);

    const request = await this.getApprovalRequest(requestId);
    if (!request) return null;

    await this.repo.updateOperationStatus(request.operationId, {
      approvalStatus: 'approved',
    });

    const operation = await this.repo.getOperation(request.operationId);
    console.log(`[Approval] Operation ${request.operationId} approved by ${reviewerId}`);

    return operation;
  }

  /**
   * 拒绝操作
   */
  async reject(requestId: string, reviewerId: string, reason: string): Promise<AutoOperation | null> {
    await this.repo.rejectRequest(requestId, reviewerId, reason);

    const request = await this.getApprovalRequest(requestId);
    if (!request) return null;

    await this.repo.updateOperationStatus(request.operationId, {
      approvalStatus: 'rejected',
    });

    const operation = await this.repo.getOperation(request.operationId);
    console.log(`[Approval] Operation ${request.operationId} rejected by ${reviewerId}: ${reason}`);

    return operation;
  }

  /**
   * 获取待审批的操作列表
   */
  async getPendingApprovals(): Promise<Array<AutoOperation & { requestId: string; expiresAt: string }>> {
    const operations = await this.repo.getPendingApprovals();

    const db = getD1Connection(this.env);
    const results = await Promise.all(
      operations.map(async (op) => {
        const approval = await db.prepare(`
          SELECT id as request_id, expires_at FROM approval_requests
          WHERE operation_id = ? AND status = 'pending'
        `).bind(op.id).first<{ request_id: string; expires_at: string }>();

        return {
          ...op,
          requestId: approval?.request_id || '',
          expiresAt: approval?.expires_at || '',
        };
      })
    );

    return results;
  }

  /**
   * 处理过期的审批请求
   */
  async processExpiredRequests(): Promise<number> {
    const expiredRequests = await this.repo.getExpiredRequests();

    for (const request of expiredRequests) {
      await this.repo.updateOperationStatus(request.operationId, {
        approvalStatus: 'expired',
      });

      console.log(`[Approval] Request ${request.id} expired (operation ${request.operationId})`);
    }

    return expiredRequests.length;
  }

  /**
   * 获取审批统计信息
   */
  async getApprovalStats(days: number = 7): Promise<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    expired: number;
    avgResponseTimeMinutes: number;
  }> {
    const db = getD1Connection(this.env);

    const stats = await db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
        SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END) as expired,
        AVG(CASE
          WHEN reviewed_at IS NOT NULL AND status IN ('approved', 'rejected')
          THEN (julianday(reviewed_at) - julianday(created_at)) * 24 * 60
          ELSE NULL
        END) as avgResponseTimeMinutes
      FROM approval_requests
      WHERE created_at > datetime('now', '-' || ? || ' days')
    `).bind(days).first<{
      total: number;
      pending: number;
      approved: number;
      rejected: number;
      expired: number;
      avgResponseTimeMinutes: number | null;
    }>();

    return stats ? {
      total: stats.total ?? 0,
      pending: stats.pending ?? 0,
      approved: stats.approved ?? 0,
      rejected: stats.rejected ?? 0,
      expired: stats.expired ?? 0,
      avgResponseTimeMinutes: stats.avgResponseTimeMinutes ?? 0,
    } : {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      expired: 0,
      avgResponseTimeMinutes: 0,
    };
  }

  // ============================================
  // 私有辅助方法
  // ============================================

  private async getApprovalRequest(id: string): Promise<ApprovalRequest | null> {
    const db = getD1Connection(this.env);
    const row = await db.prepare(`
      SELECT
        id,
        operation_id as operationId,
        status,
        requested_by as requestedBy,
        reviewed_by as reviewedBy,
        reviewed_at as reviewedAt,
        decision,
        decision_note as decisionNote,
        expires_at as expiresAt,
        notification_sent as notificationSent,
        notification_channels as notificationChannels,
        created_at as createdAt,
        updated_at as updatedAt
      FROM approval_requests
      WHERE id = ?
    `).bind(id).first<{
      id: string;
      operationId: string;
      status: ApprovalRequest['status'];
      requestedBy: string;
      reviewedBy?: string;
      reviewedAt?: string;
      decision?: ApprovalRequest['decision'];
      decisionNote?: string;
      expiresAt: string;
      notificationSent: number | boolean;
      notificationChannels: string | string[];
      createdAt: string;
      updatedAt: string;
    }>();

    if (!row) {
      return null;
    }

    return {
      ...row,
      notificationSent: row.notificationSent === true || Number(row.notificationSent) === 1,
      notificationChannels: Array.isArray(row.notificationChannels)
        ? row.notificationChannels
        : JSON.parse(row.notificationChannels || '[]'),
    };
  }
}
