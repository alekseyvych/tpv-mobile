/**
 * Tests for pin-lockout utility.
 *
 * Verifies:
 * - getLockoutState returns unlocked on first use
 * - recordFailedAttempt tracks attempts and locks on 3rd failure
 * - getLockoutState returns locked with remaining seconds when locked
 * - clearLockout resets state
 * - Expired lock is cleared automatically on next read
 */
import {
  clearLockout,
  getLockoutState,
  recordFailedAttempt,
} from '@/utils/pin-lockout';

// expo-secure-store is already mocked in setup.ts with in-memory backing.
// Re-wire to a simple in-memory store so tests are isolated.
const store: Record<string, string> = {};
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(async (key: string, value: string) => { store[key] = value; }),
  getItemAsync: jest.fn(async (key: string) => store[key] ?? null),
  deleteItemAsync: jest.fn(async (key: string) => { delete store[key]; }),
}));

const USER = 'user-abc';

function clearStore() {
  Object.keys(store).forEach((k) => { delete store[k]; });
}

describe('pin-lockout', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    clearStore();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns unlocked with 3 attempts left on first use', async () => {
    const state = await getLockoutState(USER);
    expect(state.isLocked).toBe(false);
    expect(state.attemptsLeft).toBe(3);
    expect(state.remainingSeconds).toBe(0);
  });

  it('first two failed attempts decrement attemptsLeft without locking', async () => {
    const s1 = await recordFailedAttempt(USER);
    expect(s1.isLocked).toBe(false);
    expect(s1.attemptsLeft).toBe(2);

    const s2 = await recordFailedAttempt(USER);
    expect(s2.isLocked).toBe(false);
    expect(s2.attemptsLeft).toBe(1);
  });

  it('third failed attempt triggers a 30-second lockout', async () => {
    await recordFailedAttempt(USER);
    await recordFailedAttempt(USER);
    const s3 = await recordFailedAttempt(USER);

    expect(s3.isLocked).toBe(true);
    expect(s3.remainingSeconds).toBe(30);
    expect(s3.attemptsLeft).toBe(0);
  });

  it('getLockoutState reflects active lock', async () => {
    await recordFailedAttempt(USER);
    await recordFailedAttempt(USER);
    await recordFailedAttempt(USER);

    const state = await getLockoutState(USER);
    expect(state.isLocked).toBe(true);
    expect(state.remainingSeconds).toBeGreaterThan(0);
  });

  it('clearLockout resets to unlocked', async () => {
    await recordFailedAttempt(USER);
    await recordFailedAttempt(USER);
    await recordFailedAttempt(USER);

    await clearLockout(USER);
    const state = await getLockoutState(USER);
    expect(state.isLocked).toBe(false);
    expect(state.attemptsLeft).toBe(3);
  });

  it('expired lock is cleared automatically on next getLockoutState call', async () => {
    await recordFailedAttempt(USER);
    await recordFailedAttempt(USER);
    await recordFailedAttempt(USER);

    // Advance time past the 30-second lockout.
    jest.advanceTimersByTime(31_000);

    const state = await getLockoutState(USER);
    expect(state.isLocked).toBe(false);
    expect(state.attemptsLeft).toBe(3);
  });
});
