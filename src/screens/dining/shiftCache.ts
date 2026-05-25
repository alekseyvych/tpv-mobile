export const ACTIVE_SHIFT_CACHE_TTL_MS = 60_000;

export function hasFreshActiveShiftCache(
  activeCashShiftId: string | null,
  activeCashShiftCheckedAt: number | null,
  now = Date.now(),
): boolean {
  if (!activeCashShiftId || !activeCashShiftCheckedAt) {
    return false;
  }

  return now - activeCashShiftCheckedAt <= ACTIVE_SHIFT_CACHE_TTL_MS;
}
