/**
 * @fileoverview 审批流程API
 * @description 审批列表、批准/拒绝、过期处理
 * @module services/auto-optimization/approval.routes
 */

import { Hono } from 'hono';
import type { Context } from 'hono';
import { ApprovalWorkflowService } from './approval.service';
import { AutoOperationExecutorService } from './operation-executor.service';
import type { Env } from '@/config/env';

const approvalRoutes = new Hono<{ Bindings: Env }>();

approvalRoutes.get('/approvals/pending', async (c: Context<{ Bindings: Env }>) => {
  try {
    const service = new ApprovalWorkflowService(c.env);
    const pending = await service.getPendingApprovals();

    return c.json({ success: true, data: pending, count: pending.length });
  } catch (error) {
    console.error('[Pending Approvals API] Error:', error);
    return c.json({ success: false, error: 'Failed to fetch pending approvals' }, 500);
  }
});

approvalRoutes.post('/approvals/:requestId/approve', async (c: Context<{ Bindings: Env }>) => {
  const requestId = c.req.param('requestId')!;
  const body = await c.req.json<{ reviewerId?: string; note?: string }>();

  try {
    const service = new ApprovalWorkflowService(c.env);
    const operation = await service.approve(requestId, body.reviewerId || 'admin', body.note);

    if (!operation) {
      return c.json({ success: false, error: 'Request not found or already processed' }, 404);
    }

    const executor = new AutoOperationExecutorService(c.env);
    const execution = await executor.executeOperation(operation.id);

    return c.json({
      success: true,
      message: 'Operation approved',
      data: {
        operation,
        execution,
      },
    });
  } catch (error) {
    console.error('[Approve API] Error:', error);
    return c.json({ success: false, error: 'Failed to approve request' }, 500);
  }
});

approvalRoutes.post('/approvals/:requestId/reject', async (c: Context<{ Bindings: Env }>) => {
  const requestId = c.req.param('requestId')!;
  const body = await c.req.json<{ reviewerId?: string; reason: string }>();

  if (!body.reason) {
    return c.json({ success: false, error: 'Rejection reason is required' }, 400);
  }

  try {
    const service = new ApprovalWorkflowService(c.env);
    const operation = await service.reject(requestId, body.reviewerId || 'admin', body.reason);

    if (!operation) {
      return c.json({ success: false, error: 'Request not found or already processed' }, 404);
    }

    return c.json({
      success: true,
      message: 'Operation rejected',
      data: operation,
    });
  } catch (error) {
    console.error('[Reject API] Error:', error);
    return c.json({ success: false, error: 'Failed to reject request' }, 500);
  }
});

approvalRoutes.post('/approvals/process-expired', async (c: Context<{ Bindings: Env }>) => {
  try {
    const service = new ApprovalWorkflowService(c.env);
    const expiredCount = await service.processExpiredRequests();

    return c.json({
      success: true,
      message: `Processed ${expiredCount} expired requests`,
      data: { expiredCount },
    });
  } catch (error) {
    console.error('[Process Expired API] Error:', error);
    return c.json({ success: false, error: 'Failed to process expired requests' }, 500);
  }
});

approvalRoutes.get('/approvals/stats', async (c: Context<{ Bindings: Env }>) => {
  const days = parseInt(c.req.query('days') || '7', 10);

  try {
    const service = new ApprovalWorkflowService(c.env);
    const stats = await service.getApprovalStats(days);

    return c.json({ success: true, data: stats });
  } catch (error) {
    console.error('[Approval Stats API] Error:', error);
    return c.json({ success: false, error: 'Failed to fetch approval stats' }, 500);
  }
});

export default approvalRoutes;
