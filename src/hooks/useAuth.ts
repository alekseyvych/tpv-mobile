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
  const auth = useAuthStore();

  /**
   * Login with email + password
   */
  async function loginWithEmailPassword(email: string, password: string) {
    try {
      const result = await login(email, password);
      await auth.setTokens(result.accessToken, result.refreshToken);
      try {
        const user = await getCurrentUser();
        auth.setUser(user);
      } catch {
        auth.setUser(null);
      }
      await analyticsService.trackEvent('auth.login.success', { method: 'password' });
    } catch (error) {
      await analyticsService.trackEvent('auth.login.failed', { method: 'password' });
      throw error;
    }
  }

  /**
   * Login with PIN (Quick Access, optional second auth)
   */
  async function loginUsingPin(pin: string, tenantId?: string) {
    try {
      const result = await loginWithPin(pin, tenantId);
      await auth.setTokens(result.accessToken, result.refreshToken);
      try {
        const user = await getCurrentUser();
        auth.setUser(user);
      } catch {
        auth.setUser(null);
      }
      await analyticsService.trackEvent('auth.login.success', { method: 'pin' });
    } catch (error) {
      await analyticsService.trackEvent('auth.login.failed', { method: 'pin' });
      throw error;
    }
  }

  /**
   * Load available Quick Access staff profiles
   */
  async function loadQuickAccessProfiles() {
    const result = await getQuickAccessProfilesWithContext();
    return result;
  }

  /**
   * Login with Quick Access: select staff user + PIN
   */
  async function loginUsingQuickAccess(userId: string, pin: string) {
    try {
      const result = await loginWithQuickAccess(userId, pin);
      await auth.setTokens(result.accessToken, result.refreshToken);
      try {
        const user = await getCurrentUser();
        auth.setUser(user);
      } catch {
        auth.setUser(null);
      }
      await analyticsService.trackEvent('auth.login.success', { method: 'quick_access' });
    } catch (error) {
      await analyticsService.trackEvent('auth.login.failed', { method: 'quick_access' });
      throw error;
    }
  }

  async function logout() {
    if (auth.refreshToken) {
      try {
        await logoutRemote(auth.refreshToken);
      } catch {
        // Always clear local session even if remote logout fails.
      }
    }
    await analyticsService.trackEvent('auth.logout');
    await auth.logout();
  }

  async function swapAccountWithQuickAccess(userId: string, pin: string) {
    const previousRefreshToken = auth.refreshToken;

    // Invalid PIN or quick-access auth failures must not replace current session.
    const nextTokens = await loginWithQuickAccess(userId, pin);
    const nextUser = await getCurrentUser();

    // Replace active session with the new user.
    await auth.setTokens(nextTokens.accessToken, nextTokens.refreshToken);
    auth.setUser(nextUser);

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
  }

  return {
    isAuthenticated: auth.isAuthenticated,
    logout,
    loginWithEmailPassword,
    loginUsingPin,
    loginUsingQuickAccess,
    swapAccountWithQuickAccess,
    loadQuickAccessProfiles,
    setTokens: auth.setTokens,
    setUser: auth.setUser
  };
}
