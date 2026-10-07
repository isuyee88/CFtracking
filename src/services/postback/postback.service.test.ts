import { describe, expect, it, vi } from 'vitest';
import { PostbackService } from './postback.service';
import type { PostbackTask, PostbackSendConfig, PostbackContext } from '@/types/postback';

describe('PostbackService delivery state', () => {
  const context: PostbackContext = {
    conversionId: 'cnv-1',
    clickId: 'clk-1',
    campaignId: 'camp-1',
    offerId: 'offer-1',
    revenue: 10,
    payout: 4,
    currency: 'USD',
    conversionType: 'lead',
    status: 'approved',
    timestamp: '2026-10-07T10:00:00.000Z',
  };

  const config: PostbackSendConfig = {
    enabled: true,
    urlTemplate: 'https://example.test/postback?clickid={clickid}',
    method: 'GET',
    sendOnlyStatuses: ['approved'],
    timeoutMs: 1000,
    maxRetries: 2,
    platform: 'generic',
  };

  function task(): PostbackTask {
    return {
      id: 'task-1',
      conversionId: context.conversionId,
      clickId: context.clickId,
      campaignId: context.campaignId,
      offerId: context.offerId,
      platform: config.platform,
      postbackUrl: 'https://example.test/postback?clickid=clk-1',
      rawUrlTemplate: config.urlTemplate,
      method: 'GET',
      status: 'pending',
      retryCount: 0,
      maxRetries: config.maxRetries,
      createdAt: context.timestamp,
      updatedAt: context.timestamp,
    };
  }

  function setup(sendResult: { success: boolean; retryCount: number; errorMessage?: string }) {
    const service = new PostbackService({} as any);
    const calls: string[] = [];
    const idempotencyRepo = {
      isSent: vi.fn(async () => false),
      listDueRetries: vi.fn(async () => [] as Array<Record<string, unknown>>),
      findRetry: vi.fn(async () => null as Record<string, unknown> | null),
      markAsPending: vi.fn(async () => { calls.push('pending'); }),
      markAsSending: vi.fn(async () => { calls.push('sending'); return true; }),
      markAsRetry: vi.fn(async () => { calls.push('retry'); }),
      markDeadLetter: vi.fn(async () => { calls.push('dead_letter'); }),
      markAsSent: vi.fn(async () => { calls.push('sent'); }),
    };
    (service as any).idempotencyRepo = idempotencyRepo;
    (service as any).getPostbackConfigs = vi.fn(async () => [config]);
    (service as any).buildTasks = vi.fn(async () => [task()]);
    (service as any).sender = { send: vi.fn(async () => ({
      success: sendResult.success,
      taskId: 'task-1',
      platform: 'generic',
      url: task().postbackUrl,
      latencyMs: 1,
      retryCount: sendResult.retryCount,
      errorMessage: sendResult.errorMessage,
      willRetry: false,
    })) };
    (service as any).logPostback = vi.fn(async () => undefined);
    return { service, calls, idempotencyRepo };
  }

  it('marks sent only after a successful external response', async () => {
    const { service, calls } = setup({ success: true, retryCount: 0 });
    await service.onConversion(context);
    expect(calls).toEqual(['pending', 'sending', 'sent']);
  });

  it('manually retries a selected failed delivery through the persisted lifecycle', async () => {
    const { service, calls, idempotencyRepo } = setup({ success: true, retryCount: 1 });
    (service as any).env.DB = {};
    idempotencyRepo.listDueRetries.mockResolvedValue([]);
    idempotencyRepo.findRetry.mockResolvedValue({
      conversion_id: context.conversionId,
      platform: config.platform,
      attempt_count: 0,
    });
    (service as any).getConversionForRetry = vi.fn(async () => context);
    (service as any).getPostbackConfigs = vi.fn(async () => [config]);
    (service as any).buildTasks = vi.fn(async () => [task()]);

    const results = await service.retryFailedPostbacks(context.conversionId, config.platform);

    expect(results).toHaveLength(1);
    expect(results[0]?.success).toBe(true);
    expect(calls).toEqual(['sending', 'sent']);
    expect(idempotencyRepo.markAsSending).toHaveBeenCalledWith(context.conversionId, config.platform);
  });
});
