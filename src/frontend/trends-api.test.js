import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchTrendsReport } from '../../frontend/src/services/api';

function responseFor(data, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => ({ success: status >= 200 && status < 300, data, error: null }),
  };
}

afterEach(() => vi.restoreAllMocks());

describe('Trends API client', () => {
  it('requests the full trends report contract instead of the legacy analytics summary', async () => {
    const report = {
      filter: { startDate: '2026-10-01', endDate: '2026-10-07', interval: 'day' },
      summary: {
        totalClicks: 3,
        totalUniqueClicks: 2,
        totalConversions: 1,
        totalRevenue: 12,
        totalCost: 4,
        totalProfit: 8,
        avgRoi: 200,
        avgEpc: 4,
        avgCpa: 4,
        avgCtr: 0,
        avgCr: 33.3,
        trend: 'up',
        changePercent: 10,
      },
      data: [],
      breakdowns: { country: [], device: [], browser: [] },
    };
    const fetchMock = vi.fn().mockResolvedValue(responseFor(report));
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchTrendsReport({
      startDate: '2026-10-01',
      endDate: '2026-10-07',
      interval: 'day',
    });

    expect(result).toEqual(report);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/trends/report?startDate=2026-10-01&endDate=2026-10-07&interval=day',
      expect.anything(),
    );
  });
});
