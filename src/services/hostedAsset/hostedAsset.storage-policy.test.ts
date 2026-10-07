import { describe, expect, it } from 'vitest';
import { resolveHostedAssetStorage } from './hostedAsset.service';

describe('hosted asset storage policy', () => {
  it('selects R2 for new content when the binding is available', () => {
    expect(resolveHostedAssetStorage({ HOSTED_ASSETS_BUCKET: {} } as any)).toBe('r2');
  });

  it('keeps D1 as an explicit migration fallback when R2 is not bound', () => {
    expect(resolveHostedAssetStorage({} as any)).toBe('d1');
  });
});
