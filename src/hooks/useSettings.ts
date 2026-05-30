import { useMemo } from 'react';

import { changePassword, logoutAllDevices } from '@/api/auth.api';
import { useAuth } from '@/hooks/useAuth';
import { useLocalContext } from '@/hooks/useLocalContext';
import packageJson from '../../package.json';
import { analyticsService } from '@/services/AnalyticsService';
import { syncService } from '@/services/SyncService';
import { useAuthStore } from '@/store/auth.store';
import { useContextStore } from '@/store/context.store';
import { useLanguageStore } from '@/store/language.store';

const APP_VERSION = packageJson.version;

export function useSettings() {
  const language = useLanguageStore((s) => s.language);
  const setLanguage = useLanguageStore((s) => s.setLanguage);
  const localContext = useContextStore((s) => s.localContext);
  const user = useAuthStore((s) => s.user);
  const roles = useAuthStore((s) => s.roles);
  const { logout } = useAuth();
  const { clearContext, loadContext } = useLocalContext();

  const deviceInfo = useMemo(
    () => ({
      installationId: localContext?.installationId ?? 'unknown',
      tenantId: localContext?.tenantId ?? user?.tenantId ?? 'unknown',
      deviceName: localContext?.deviceName ?? 'mobile-device',
      deviceType: localContext?.deviceType ?? 'PHONE',
      configuredAt: localContext?.configuredAt ?? 'unknown',
    }),
    [localContext, user?.tenantId]
  );

  async function changeLanguage(nextLanguage: 'en' | 'es'): Promise<void> {
    await setLanguage(nextLanguage);
  }

  async function changeOwnPassword(oldPassword: string, newPassword: string): Promise<void> {
    await changePassword({ oldPassword, newPassword });
    await analyticsService.trackEvent('auth.change_password');
  }

  async function refreshDeviceContext(): Promise<void> {
    await loadContext();
  }

  async function logoutThisDevice(): Promise<void> {
    await analyticsService.trackEvent('auth.logout');
    await logout();
  }

  async function logoutEveryDevice(): Promise<void> {
    try {
      await logoutAllDevices();
    } finally {
      await analyticsService.trackEvent('auth.logout_all');
      await logout();
    }
  }

  async function factoryReset(): Promise<void> {
    await syncService.clearQueue();
    analyticsService.shutdown();
    await clearContext();
    await logout();
  }

  return {
    language,
    user,
    roles,
    appVersion: APP_VERSION,
    deviceInfo,
    changeLanguage,
    changeOwnPassword,
    refreshDeviceContext,
    logoutThisDevice,
    logoutEveryDevice,
    factoryReset,
  };
}
