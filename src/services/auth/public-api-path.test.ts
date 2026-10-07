import { describe, expect, it } from 'vitest';
import { isPublicApiPath } from './public-api-path';

describe('isPublicApiPath', () => {
  it('allows public tracking and auth endpoints', () => {
    expect(isPublicApiPath('/api/tracking/click/campaign-alias')).toBe(true);
    expect(isPublicApiPath('/api/tracking/click', 'POST')).toBe(false);
    expect(isPublicApiPath('/api/tracking/conversion', 'POST')).toBe(false);
    expect(isPublicApiPath('/api/auth/login')).toBe(true);
  });

  it('allows public challenge endpoints used by live traffic', () => {
    expect(isPublicApiPath('/api/proxy-detection/challenge-html')).toBe(true);
    expect(isPublicApiPath('/api/proxy-detection/verify-challenge')).toBe(true);
  });

  it('keeps admin-only api routes protected', () => {
    expect(isPublicApiPath('/api/campaigns')).toBe(false);
    expect(isPublicApiPath('/api/blacklist')).toBe(false);
  });
});
