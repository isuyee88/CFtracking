import { describe, expect, it, vi } from 'vitest';
import { PropellerAdsAdapter } from './propellerads';

describe('PropellerAdsAdapter simulation boundary', () => {
  it('blocks every external write before fetch when simulation mode is enabled', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const adapter = new PropellerAdsAdapter({ apiKey: 'test-key' }, {
      SIMULATION_MODE: true,
    } as never);

    await adapter.initialize();
    await expect(adapter.execute('pause_campaign', { campaignId: 'campaign-1' }))
      .rejects.toThrow('Simulation mode: pauseCampaign blocked on propellerads');
    expect(fetchSpy).not.toHaveBeenCalled();

    log.mockRestore();
    fetchSpy.mockRestore();
  });
});
