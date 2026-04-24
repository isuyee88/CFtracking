import { describe, expect, it, vi } from 'vitest';
import type { D1Database } from '@/handlers/d1';
import { AutoruleBindingRepository } from '@/handlers/d1/autoruleBinding.repo';

function createDb(): D1Database {
  return {
    prepare: vi.fn(() => ({
      bind: vi.fn(() => ({
        first: vi.fn(),
        all: vi.fn(),
        run: vi.fn(),
      })),
    })),
  } as unknown as D1Database;
}

describe('AutoruleBindingRepository effective binding resolution', () => {
  it('prefers campaign bindings over flow bindings', async () => {
    const repo = new AutoruleBindingRepository(createDb());

    vi.spyOn(repo, 'getFlowBindings').mockResolvedValue([
      {
        scope: 'flow',
        scopeId: 'f1',
        ruleId: 'rule-flow',
        priority: 10,
        updatedAt: '',
      },
    ]);
    vi.spyOn(repo, 'getCampaignBindings').mockResolvedValue([
      {
        scope: 'campaign',
        scopeId: 'c1',
        ruleId: 'rule-campaign',
        priority: 20,
        updatedAt: '',
      },
    ]);

    const bindings = await repo.getEffectiveBindings('c1', 'f1');

    expect(bindings).toHaveLength(1);
    expect(bindings[0]?.scope).toBe('campaign');
    expect(bindings[0]?.ruleId).toBe('rule-campaign');
  });
});
