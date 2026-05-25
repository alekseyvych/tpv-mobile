import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { getCurrentUser } from '@/api/auth.api';
import { useAuthStore } from '@/store/auth.store';

/** Minimum interval between foreground permission re-fetches. */
const THROTTLE_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Syncs the current user's roles and permissions from the server whenever
 * the app comes back to the foreground, throttled to at most once per 5 minutes.
 *
 * This is a silent, best-effort operation. Token expiry and network errors
 * are swallowed — the auth interceptors handle token refresh separately.
 */
export function usePermissionSync(): void {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setUser = useAuthStore((s) => s.setUser);

  const lastSyncAtRef = useRef<number>(0);

  useEffect(() => {
    if (!isAuthenticated) return;

    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') return;

      const now = Date.now();
      if (now - lastSyncAtRef.current < THROTTLE_MS) return;

      lastSyncAtRef.current = now;

      void getCurrentUser()
        .then((user) => setUser(user))
        .catch(() => {
          // Silent fail — permission refresh is best-effort.
          // Mid-session role changes will be enforced at next full login.
        });
    });

    return () => {
      sub.remove();
    };
  }, [isAuthenticated, setUser]);
}
