import { afterEach, describe, expect, it, vi } from 'vitest';
import { PostbackSender } from './postback.sender';
import type { PostbackTask } from '@/types/postback';

describe('PostbackSender response retry policy', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function task(maxRetries = 2): PostbackTask {
    return {
      id: 'task-1',
      conversionId: 'cnv-1',
      clickId: 'clk-1',
      campaignId: 'camp-1',
      offerId: 'offer-1',
      platform: 'generic',
      postbackUrl: 'https://example.test/postback',
      rawUrlTemplate: 'https://example.test/postback',
      method: 'GET',
      status: 'pending',
      retryCount: 0,
      maxRetries,
      createdAt: '2026-10-07T10:00:00.000Z',
      updatedAt: '2026-10-07T10:00:00.000Z',
    };
  }

  function response(status: number): Response {
    return new Response(`status-${status}`, { status });
  }

  function fastSender(): PostbackSender {
    const sender = new PostbackSender();
    vi.spyOn(sender as any, 'sleep').mockResolvedValue(undefined);
    return sender;
  }

  it.each([500, 502, 503, 429])('retries transient HTTP %s and returns success after recovery', async (status) => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(response(status))
      .mockResolvedValueOnce(response(200));

    const result = await fastSender().send(task());

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.success).toBe(true);
    expect(result.statusCode).toBe(200);
    expect(result.retryCount).toBe(1);
  });

  it('does not retry a permanent 4xx response', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(response(400));

    const result = await fastSender().send(task());

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(400);
    expect(result.retryCount).toBe(0);
    expect(result.willRetry).toBe(false);
    expect(result.errorMessage).toContain('HTTP 400');
  });

  it('retries a timeout and exposes the timeout reason when attempts are exhausted', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockRejectedValue(new DOMException('timed out', 'TimeoutError'));

    const result = await fastSender().send(task(1));

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.success).toBe(false);
    expect(result.retryCount).toBe(1);
    expect(result.errorMessage).toContain('Request timeout');
    expect(result.willRetry).toBe(false);
  });
});
