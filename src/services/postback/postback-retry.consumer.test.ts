import { describe, expect, it, vi } from 'vitest';
import { handlePostbackRetryCron } from './postback-retry.consumer';

describe('postback retry consumer', () => {
  it('delegates due retry processing with a bounded batch size', async () => {
    const retryDuePostbacks = vi.fn(async (limit: number) => ({
      inspected: limit,
      claimed: 1,
      sent: 1,
      retried: 0,
      deadLettered: 0,
      skipped: 0,
    }));
    const service = { retryDuePostbacks };
    const result = await handlePostbackRetryCron({} as any, { service, limit: 600 } as any);

    expect(retryDuePostbacks).toHaveBeenCalledWith(500);
    expect(result).toMatchObject({ inspected: 500, sent: 1 });
  });
});
