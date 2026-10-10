import { describe, expect, it, vi } from 'vitest';
import { PartnerBoostAdapter } from './partnerboost';

describe('PartnerBoostAdapter read-only contract', () => {
  it('uses GET for the approved read-only offers action', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: { products: [] } }), { status: 200 })
    );
    const adapter = new PartnerBoostAdapter({ apiToken: 'test-token' }, {
      SIMULATION_MODE: true,
    } as never);

    await adapter.initialize();
    const result = await adapter.execute('get_offers', { page: 1, limit: 1 });

    expect(result.success).toBe(true);
    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(fetchSpy.mock.calls[0]?.[1]).toMatchObject({ method: 'GET' });
    const requestUrl = String(fetchSpy.mock.calls[0]?.[0]);
    expect(requestUrl).toContain('https://app.partnerboost.com/api.php');
    expect(requestUrl).toContain('mod=datafeed');
    expect(requestUrl).toContain('op=list');
    expect(requestUrl).toContain('page=1');
    expect(requestUrl).toContain('limit=1');

    fetchSpy.mockRestore();
  });

  it('uses the documented begin_date/end_date fields for transactions', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ status: { code: 0 }, list: [] }), { status: 200 })
    );
    const adapter = new PartnerBoostAdapter({ apiToken: 'test-token' });

    await adapter.initialize();
    const result = await adapter.execute('get_conversions', {
      startDate: '2026-10-01',
      endDate: '2026-10-10',
    });

    expect(result.success).toBe(true);
    const requestUrl = String(fetchSpy.mock.calls[0]?.[0]);
    expect(requestUrl).toContain('mod=medium');
    expect(requestUrl).toContain('op=transaction');
    expect(requestUrl).toContain('begin_date=2026-10-01');
    expect(requestUrl).toContain('end_date=2026-10-10');
    expect(requestUrl).not.toContain('start_date=');

    fetchSpy.mockRestore();
  });

  it('does not call an undocumented product-detail endpoint', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const adapter = new PartnerBoostAdapter({ apiToken: 'test-token' });
    await adapter.initialize();

    const result = await adapter.execute('get_offer_details', { offerId: 'offer-1' });

    expect(result.success).toBe(false);
    expect(result.message).toContain('not documented');
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
