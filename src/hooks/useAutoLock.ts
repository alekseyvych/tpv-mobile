import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { useAuthStore } from '@/store/auth.store';
import { useSessionPolicyStore } from '@/store/session-policy.store';
import { getLastActivityTimestamp, markActivity } from '@/hooks/auto-lock.activity';

type AutoLockParams = {
  routeName: string;
  onShortLock: () => void;
  onLongInactivity: () => void;
};

const CHECK_INTERVAL_MS = 10000;

function isAuthFlowRoute(routeName: string): boolean {
  return (
    routeName === 'Login' ||
    routeName === 'PinLogin' ||
    routeName === 'Setup' ||
    routeName.startsWith('Pairing') ||
    routeName === 'FirstInit' ||
    routeName === 'ContextCheck'
  );
}

export function useAutoLock({ routeName, onShortLock, onLongInactivity }: AutoLockParams) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const loadPolicy = useSessionPolicyStore((s) => s.load);
  const policy = useSessionPolicyStore((s) => s.config.defaultProfile);
  const isLoaded = useSessionPolicyStore((s) => s.isLoaded);

  const shortLockTriggeredRef = useRef(false);
  const longLockTriggeredRef = useRef(false);

  useEffect(() => {
    if (!isLoaded) {
      void loadPolicy();
    }
  }, [isLoaded, loadPolicy]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        markActivity();
        shortLockTriggeredRef.current = false;
        longLockTriggeredRef.current = false;
      }
    });

    return () => {
      sub.remove();
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated || isAuthFlowRoute(routeName)) {
      shortLockTriggeredRef.current = false;
      longLockTriggeredRef.current = false;
      return;
    }

    const interval = setInterval(() => {
      const idleMs = Date.now() - getLastActivityTimestamp();
      const shortTimeoutMs = policy.shortInactivityMinutes * 60 * 1000;
      const longTimeoutMs = policy.longInactivityMinutes * 60 * 1000;

      if (!longLockTriggeredRef.current && idleMs >= longTimeoutMs) {
        longLockTriggeredRef.current = true;
        shortLockTriggeredRef.current = true;
        onLongInactivity();
        return;
      }

      if (!shortLockTriggeredRef.current && idleMs >= shortTimeoutMs) {
        shortLockTriggeredRef.current = true;
        onShortLock();
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      clearInterval(interval);
    };
  }, [isAuthenticated, onLongInactivity, onShortLock, policy.longInactivityMinutes, policy.shortInactivityMinutes, routeName]);
}
