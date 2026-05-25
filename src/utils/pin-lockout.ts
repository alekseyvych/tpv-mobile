import * as SecureStore from 'expo-secure-store';

const MAX_ATTEMPTS = 3;
const LOCKOUT_DURATION_MS = 30_000; // 30 seconds

function storageKey(userId: string): string {
  return `pin_lockout_${userId}`;
}

type LockoutData = {
  attempts: number;
  lockUntil: number | null;
};

async function readData(userId: string): Promise<LockoutData> {
  try {
    const raw = await SecureStore.getItemAsync(storageKey(userId));
    if (!raw) return { attempts: 0, lockUntil: null };
    return JSON.parse(raw) as LockoutData;
  } catch {
    return { attempts: 0, lockUntil: null };
  }
}

async function writeData(userId: string, data: LockoutData): Promise<void> {
  try {
    await SecureStore.setItemAsync(storageKey(userId), JSON.stringify(data));
  } catch {
    // Best-effort — lockout state may not persist if SecureStore is unavailable.
  }
}

export type LockoutState = {
  isLocked: boolean;
  remainingSeconds: number;
  attemptsLeft: number;
};

export async function getLockoutState(userId: string): Promise<LockoutState> {
  const data = await readData(userId);
  const now = Date.now();

  if (data.lockUntil !== null && now < data.lockUntil) {
    return {
      isLocked: true,
      remainingSeconds: Math.ceil((data.lockUntil - now) / 1000),
      attemptsLeft: 0,
    };
  }

  // Lock expired — clear it so the next read starts clean.
  if (data.lockUntil !== null && now >= data.lockUntil) {
    await writeData(userId, { attempts: 0, lockUntil: null });
  }

  const currentAttempts = data.lockUntil !== null ? 0 : data.attempts;
  return {
    isLocked: false,
    remainingSeconds: 0,
    attemptsLeft: Math.max(0, MAX_ATTEMPTS - currentAttempts),
  };
}

export async function recordFailedAttempt(userId: string): Promise<LockoutState> {
  const data = await readData(userId);
  // Reset attempts if a previous lockout has already expired.
  const baseAttempts = data.lockUntil !== null && Date.now() >= data.lockUntil ? 0 : data.attempts;
  const nextAttempts = baseAttempts + 1;

  if (nextAttempts >= MAX_ATTEMPTS) {
    const lockUntil = Date.now() + LOCKOUT_DURATION_MS;
    await writeData(userId, { attempts: nextAttempts, lockUntil });
    return {
      isLocked: true,
      remainingSeconds: Math.ceil(LOCKOUT_DURATION_MS / 1000),
      attemptsLeft: 0,
    };
  }

  await writeData(userId, { attempts: nextAttempts, lockUntil: null });
  return {
    isLocked: false,
    remainingSeconds: 0,
    attemptsLeft: MAX_ATTEMPTS - nextAttempts,
  };
}

export async function clearLockout(userId: string): Promise<void> {
  await writeData(userId, { attempts: 0, lockUntil: null });
}
