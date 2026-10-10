import { describe, expect, it, vi } from 'vitest';
import { simulationGuard } from './simulation-guard';

describe('simulationGuard', () => {
  it('blocks writes when boolean simulation mode is enabled', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    expect(() =>
      simulationGuard({ SIMULATION_MODE: true }, 'createCampaign', 'PropellerAds', 'write')
    ).toThrow('Simulation mode: createCampaign blocked on PropellerAds');
    expect(log).toHaveBeenCalledWith('[SIMULATION] Blocked createCampaign on PropellerAds');

    log.mockRestore();
  });

  it('blocks writes when the setting is omitted or not explicitly false', () => {
    expect(() =>
      simulationGuard({ SIMULATION_MODE: 'true' }, 'pauseCampaign', 'PropellerAds', 'write')
    ).toThrow();
  });

  it('allows reads and explicitly disabled writes', () => {
    expect(() =>
      simulationGuard({ SIMULATION_MODE: true }, 'getCampaignStats', 'PropellerAds', 'read')
    ).not.toThrow();
    expect(() =>
      simulationGuard({ SIMULATION_MODE: 'false' }, 'createCampaign', 'PropellerAds', 'write')
    ).not.toThrow();
  });
});
