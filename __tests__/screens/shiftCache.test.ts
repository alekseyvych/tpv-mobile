import { ACTIVE_SHIFT_CACHE_TTL_MS, hasFreshActiveShiftCache } from '@/screens/dining/shiftCache';

describe('hasFreshActiveShiftCache', () => {
  it('returns true only when active shift id exists and check timestamp is within ttl', () => {
    const now = 1_000_000;

    expect(hasFreshActiveShiftCache('shift-1', now - (ACTIVE_SHIFT_CACHE_TTL_MS - 1), now)).toBe(true);
    expect(hasFreshActiveShiftCache('shift-1', now - (ACTIVE_SHIFT_CACHE_TTL_MS + 1), now)).toBe(false);
    expect(hasFreshActiveShiftCache(null, now, now)).toBe(false);
    expect(hasFreshActiveShiftCache('shift-1', null, now)).toBe(false);
  });
});
