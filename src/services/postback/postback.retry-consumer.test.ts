import { describe, expect, it, vi } from 'vitest';
import { PostbackService } from './postback.service';
import type { PostbackContext, PostbackTask, PostbackSendConfig } from '@/types/postback';

const context: PostbackContext = {
  conversionId: 'cnv-retry-1',
  clickId: 'clk-retry-1',
  campaignId: 'camp-retry-1',
  offerId: 'offer-retry-1',
  revenue: 12,
  payout: 5,
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
  maxRetries: 3,
  platform: 'generic',
};

function retryTask(): PostbackTask {
  return {
    id: 'task-retry-1',
    conversionId: context.conversionId,
    clickId: context.clickId,
    campaignId: context.campaignId,
    offerId: context.offerId,
    platform: 'generic',
    postbackUrl: 'https://example.test/postback?clickid=clk-retry-1',
    rawUrlTemplate: config.urlTemplate,
    method: 'GET',
    status: 'pending',
    retryCount: 1,
    maxRetries: 3,
    createdAt: context.timestamp,
    updatedAt: context.timestamp,
  };
}

describe('PostbackService due retry consumption', () => {
  it('claims a due retry, rebuilds the task from conversion/config, and marks success', async () => {
    const service = new PostbackService({ DB: {} } as any);
    const calls: string[] = [];
    const repo = {
      listDueRetries: vi.fn(async () => [{ conversion_id: context.conversionId, platform: 'generic', attempt_count: 1 }]),
      markAsSending: vi.fn(async () => { calls.push('sending'); return true; }),
      markAsRetry: vi.fn(async () => { calls.push('retry'); }),
      markDeadLetter: vi.fn(async () => { calls.push('dead_letter'); }),
      markAsSent: vi.fn(async () => { calls.push('sent'); }),
    };
    (service as any).idempotencyRepo = repo;
    (service as any).getConversionForRetry = vi.fn(async () => context);
    (service as any).getPostbackConfigs = vi.fn(async () => [config]);
    (service as any).buildTasks = vi.fn(async () => [retryTask()]);
    (service as any).sender = { send: vi.fn(async () => ({
      success: true,
      taskId: 'task-retry-1',
      platform: 'generic',
      url: retryTask().postbackUrl,
      statusCode: 200,
      latencyMs: 2,
      retryCount: 1,
      willRetry: false,
    })) };
    (service as any).logPostback = vi.fn(async () => undefined);

    const summary = await service.retryDuePostbacks(10);

    expect(repo.listDueRetries).toHaveBeenCalledWith(10);
    expect(repo.markAsSending).toHaveBeenCalledWith('cnv-retry-1', 'generic');
    expect(calls).toEqual(['sending', 'sent']);
    expect(summary).toMatchObject({ inspected: 1, claimed: 1, sent: 1, retried: 0, deadLettered: 0, skipped: 0 });
  });

  it('dead-letters a due retry when its conversion cannot be rebuilt', async () => {
    const service = new PostbackService({ DB: {} } as any);
    const repo = {
      listDueRetries: vi.fn(async () => [{ conversion_id: 'missing-cnv', platform: 'generic', attempt_count: 2 }]),
      markAsSending: vi.fn(async () => true),
      markAsRetry: vi.fn(async () => undefined),
      markDeadLetter: vi.fn(async () => undefined),
      markAsSent: vi.fn(async () => undefined),
    };
    (service as any).idempotencyRepo = repo;
    (service as any).getConversionForRetry = vi.fn(async () => null);

    const summary = await service.retryDuePostbacks();

    expect(repo.markDeadLetter).toHaveBeenCalledWith(
      'missing-cnv',
      'generic',
      'Conversion could not be rebuilt for due postback retry',
      undefined,
      undefined,
    );
    expect(summary).toMatchObject({ inspected: 1, claimed: 1, sent: 0, retried: 0, deadLettered: 1, skipped: 0 });
  });
});
