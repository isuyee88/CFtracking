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

    fetchSpy.mockRestore();
  });
});
