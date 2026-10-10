import { beforeEach, describe, expect, it, vi } from 'vitest';
import postbackRoutes from './postback.routes';

const findRetryableLogs = vi.fn();
const retryFailedPostbacks = vi.fn();
const postbackServiceConstructor = vi.fn();

vi.mock('@/handlers/d1/postback.repo', () => ({
  PostbackLogRepository: class {
    findRetryableLogs = findRetryableLogs;
  },
}));

vi.mock('@/services/postback/postback.service', () => ({
  PostbackService: class {
    constructor(env: unknown) {
      postbackServiceConstructor(env);
    }
    retryFailedPostbacks = retryFailedPostbacks;
  },
}));

describe('manual postback retry route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findRetryableLogs.mockImplementation(async (_limit: number, conversionId?: string, platform?: string) => [
      { id: 'log-1', conversionId: 'cnv-1', platform: 'partner-a' },
      { id: 'log-2', conversionId: 'cnv-2', platform: 'partner-b' },
    ].filter((log) =>
      (!conversionId || log.conversionId === conversionId)
      && (!platform || log.platform === platform),
    ));
    retryFailedPostbacks.mockImplementation(async (conversionId: string) => [{
      success: conversionId === 'cnv-1',
      taskId: `task-${conversionId}`,
      platform: 'partner-a',
      url: 'https://partner.example.test/postback',
      latencyMs: 1,
      retryCount: 1,
      errorMessage: conversionId === 'cnv-1' ? undefined : 'HTTP 503',
      willRetry: conversionId !== 'cnv-1',
    }]);
  });

  it('calls the real retry service for each selected failure and reports actual outcomes', async () => {
    const env = { DB: {} } as any;
    const response = await postbackRoutes.request('/retry', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ platform: 'partner-a' }),
    }, env);

    expect(response.status).toBe(200);
    expect(postbackServiceConstructor).toHaveBeenCalledWith(env);
    expect(retryFailedPostbacks).toHaveBeenCalledTimes(1);
    expect(retryFailedPostbacks).toHaveBeenCalledWith('cnv-1', 'partner-a');
    const body = await response.json() as { data?: { retried?: number; results?: Array<{ logId: string; success: boolean }> } };
    expect(body.data?.retried).toBe(1);
    expect(body.data?.results).toEqual([{ logId: 'log-1', success: true }]);
  });

  it('never reports success when retry service has no matching due delivery', async () => {
    retryFailedPostbacks.mockResolvedValue([]);
    const response = await postbackRoutes.request('/retry', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ conversionId: 'cnv-1', platform: 'partner-a' }),
    }, { DB: {} } as any);

    expect(response.status).toBe(200);
    const body = await response.json() as { data?: { results?: Array<{ success: boolean; error?: string }> } };
    expect(body.data?.results).toEqual([{ logId: 'log-1', success: false }]);
  });
});
