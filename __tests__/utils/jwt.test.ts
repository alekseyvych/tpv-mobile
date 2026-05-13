import { isTokenExpired } from '@/utils/jwt';

describe('jwt helpers', () => {
  it('returns true for malformed token', () => {
    expect(isTokenExpired('bad-token')).toBe(true);
  });
});
