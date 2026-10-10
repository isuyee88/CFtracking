import { describe, expect, it } from 'vitest';
import { HTTP_STATUS } from './constants';

describe('HTTP status constants', () => {
  it('exposes 429 for login rate limiting responses', () => {
    expect(HTTP_STATUS.TOO_MANY_REQUESTS).toBe(429);
  });
});
