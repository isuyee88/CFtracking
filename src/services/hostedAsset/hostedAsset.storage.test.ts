import { describe, expect, it } from 'vitest';
import { buildHostedAssetR2Key } from './hostedAsset.service';

describe('hosted asset R2 storage contract', () => {
  it('builds a tenant-safe immutable object key without user-controlled path traversal', () => {
    expect(buildHostedAssetR2Key('ha_abc123', 'landing', 'offer.html')).toBe('landing/ha_abc123/offer.html');
    expect(buildHostedAssetR2Key('ha_abc123', 'offer', '../unsafe.zip')).toBe('offer/ha_abc123/unsafe.zip');
  });
});
