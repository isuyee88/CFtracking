import { afterEach, describe, expect, it, vi } from 'vitest';
import { simulateFlow } from '../../frontend/src/services/api';

function responseFor(data, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => ({ success: status >= 200 && status < 300, data, error: null }),
  };
}

afterEach(() => vi.restoreAllMocks());

describe('Flow simulation API client', () => {
  it('posts the context, schemas, and rotation to the simulation endpoint', async () => {
    const result = {
      decision: 'flow',
      flowId: 'flow_1',
      trace: [],
      riskScore: null,
      latencyMs: 1,
    };
    const fetchMock = vi.fn().mockResolvedValue(responseFor(result));
    vi.stubGlobal('fetch', fetchMock);

    const input = { context: { visitor: {}, visit: {} }, schemas: [], rotation: 'weight' };
    const response = await simulateFlow(input);

    expect(response).toEqual(result);
    expect(fetchMock).toHaveBeenCalledWith('/api/flows/simulation', expect.objectContaining({ method: 'POST' }));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual(input);
  });
});
