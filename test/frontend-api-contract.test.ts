/**
 * @file 前端↔Worker 契约回归：断言前端调用的写接口路径与 Worker 路由一致。
 * @description 重点防「Sync 按钮 404」这类只在运行期才暴露的路径不匹配回归。
 * @owner frontend
 * @see cftracking/src/routes/blacklist.routes.ts
 * @see cftracking/src/routes/whitelist.routes.ts
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { syncBlacklistEntry, syncWhitelistEntry } from '../frontend/src/services/api';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

/** 记录一次 fetch 调用的 URL，并返回空成功响应。 */
function captureFetch() {
  const calls: string[] = [];
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
    calls.push(typeof input === 'string' ? input : input.toString());
    return new Response(JSON.stringify({ success: true, data: {} }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;
  return calls;
}

describe('sync endpoints match worker routes', () => {
  it('uses POST /api/blacklist/sync/:trafficSourceId', async () => {
    const calls = captureFetch();
    await syncBlacklistEntry('ts-1');
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatch(/\/api\/blacklist\/sync\/ts-1$/);
    expect((globalThis.fetch as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls[0][1]?.method).toBe(
      'POST',
    );
  });

  it('uses POST /api/whitelist/sync/:trafficSourceId', async () => {
    const calls = captureFetch();
    await syncWhitelistEntry('ts-2');
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatch(/\/api\/whitelist\/sync\/ts-2$/);
    expect((globalThis.fetch as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls[0][1]?.method).toBe(
      'POST',
    );
  });
});
