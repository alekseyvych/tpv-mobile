import { useCallback, useMemo } from 'react';

import {
  getCurrentUser,
  getQuickAccessProfilesWithContext,
  login,
  loginWithQuickAccess,
  loginWithPin,
  logout as logoutRemote,
} from '@/api/auth.api';
import { analyticsService } from '@/services/AnalyticsService';
import { useAuthStore } from '@/store/auth.store';

export function useAuth() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const setTokens = useAuthStore((s) => s.setTokens);
  const setUser = useAuthStore((s) => s.setUser);
  const logoutLocal = useAuthStore((s) => s.logout);

  /**
   * Login with email + password
   */
  const loginWithEmailPassword = useCallback(async (email: string, password: string) => {
    try {
      const result = await login(email, password);
      await setTokens(result.accessToken, result.refreshToken);
      try {
        const user = await getCurrentUser();
        setUser(user);
      } catch {
        setUser(null);
      }
      await analyticsService.trackEvent('auth.login.success', { method: 'password' });
    } catch (error) {
      await analyticsService.trackEvent('auth.login.failed', { method: 'password' });
      throw error;
    }
  }, [setTokens, setUser]);

  /**
   * Login with PIN (Quick Access, optional second auth)
   */
  const loginUsingPin = useCallback(async (pin: string, tenantId?: string) => {
    try {
      const result = await loginWithPin(pin, tenantId);
      await setTokens(result.accessToken, result.refreshToken);
      try {
        const user = await getCurrentUser();
        setUser(user);
      } catch {
        setUser(null);
      }
      await analyticsService.trackEvent('auth.login.success', { method: 'pin' });
    } catch (error) {
      await analyticsService.trackEvent('auth.login.failed', { method: 'pin' });
      throw error;
    }
  }, [setTokens, setUser]);

  /**
   * Load available Quick Access staff profiles
   */
  const loadQuickAccessProfiles = useCallback(async () => {
    const result = await getQuickAccessProfilesWithContext();
    return result;
  }, []);

  /**
   * Login with Quick Access: select staff user + PIN
   */
  const loginUsingQuickAccess = useCallback(async (userId: string, pin: string) => {
    try {
      const result = await loginWithQuickAccess(userId, pin);
      await setTokens(result.accessToken, result.refreshToken);
      try {
        const user = await getCurrentUser();
        setUser(user);
      } catch {
        setUser(null);
      }
      await analyticsService.trackEvent('auth.login.success', { method: 'quick_access' });
    } catch (error) {
      await analyticsService.trackEvent('auth.login.failed', { method: 'quick_access' });
      throw error;
    }
  }, [setTokens, setUser]);

  const logout = useCallback(async () => {
    if (refreshToken) {
      try {
        await logoutRemote(refreshToken);
      } catch {
        // Always clear local session even if remote logout fails.
      }
    }
    await analyticsService.trackEvent('auth.logout');
    await logoutLocal();
  }, [logoutLocal, refreshToken]);

  const swapAccountWithQuickAccess = useCallback(async (userId: string, pin: string) => {
    const previousRefreshToken = refreshToken;

    // Auth failure here is safe — old session is still intact.
    const nextTokens = await loginWithQuickAccess(userId, pin);

    // Set tokens BEFORE calling getCurrentUser() so the API request
    // uses the new user's token and returns the correct profile,
    // roles, and permissions for the swapped-in account.
    await setTokens(nextTokens.accessToken, nextTokens.refreshToken);
    const nextUser = await getCurrentUser();
    setUser(nextUser);

    // Best-effort revoke previous refresh token, if available.
    if (previousRefreshToken && previousRefreshToken !== nextTokens.refreshToken) {
      try {
        await logoutRemote(previousRefreshToken);
      } catch {
        await analyticsService.trackEvent('error.captured', { stage: 'auth.swap.revoke_previous_session' });
      }
    }

    await analyticsService.trackEvent('auth.login.success', { method: 'quick_access_swap' });
    return nextUser;
  }, [refreshToken, setTokens, setUser]);

  return useMemo(() => ({
    isAuthenticated,
    logout,
    loginWithEmailPassword,
    loginUsingPin,
    loginUsingQuickAccess,
    swapAccountWithQuickAccess,
    loadQuickAccessProfiles,
    setTokens,
    setUser
  }), [
    isAuthenticated,
    logout,
    loginWithEmailPassword,
    loginUsingPin,
    loginUsingQuickAccess,
    swapAccountWithQuickAccess,
    loadQuickAccessProfiles,
    setTokens,
    setUser,
  ]);
}
