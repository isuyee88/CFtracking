import { describe, expect, it } from 'vitest';
import { resolvePublicTrackingAlias } from './public-tracking-path';

describe('resolvePublicTrackingAlias', () => {
  it('returns alias for unknown single-segment public paths', () => {
    expect(resolvePublicTrackingAlias('/test-campaign-final')).toBe('test-campaign-final');
  });

  it('ignores reserved SPA routes', () => {
    expect(resolvePublicTrackingAlias('/campaigns')).toBeNull();
    expect(resolvePublicTrackingAlias('/login')).toBeNull();
    expect(resolvePublicTrackingAlias('/blacklist')).toBeNull();
  });

  it('ignores static assets and multi-segment paths', () => {
    expect(resolvePublicTrackingAlias('/assets/app.js')).toBeNull();
    expect(resolvePublicTrackingAlias('/foo/bar')).toBeNull();
    expect(resolvePublicTrackingAlias('/favicon.ico')).toBeNull();
  });
});
