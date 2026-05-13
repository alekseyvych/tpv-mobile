import { apiClient } from './client';
import type {
  ChangePasswordAuthDto,
  LoginDto,
  LoginPinDto,
  QuickAccessLoginDto,
  QuickAccessProfilesWithContextDto,
  AuthTokenResponse,
  UserProfileDto,
  RefreshTokenDto,
  LogoutDto,
} from '@/types/api';

/**
 * Login with email + password
 * POST /auth/login
 */
export async function login(email: string, password: string): Promise<AuthTokenResponse> {
  const input: LoginDto = { email, password };
  const { data } = await apiClient.post<AuthTokenResponse>('/auth/login', input);
  return data;
}

/**
 * Login with 4-digit PIN
 * POST /auth/login-pin
 * tenantId optional for multi-tenant fallback
 */
export async function loginWithPin(pin: string, tenantId?: string): Promise<AuthTokenResponse> {
  const input: LoginPinDto = { pin, tenantId };
  const { data } = await apiClient.post<AuthTokenResponse>('/auth/login-pin', input);
  return data;
}

/**
 * Get Quick Access profiles available for this device context
 * GET /auth/quick-access/profiles-with-context
 * Returns user list + setup requirement check
 */
export async function getQuickAccessProfilesWithContext(): Promise<QuickAccessProfilesWithContextDto> {
  const { data } = await apiClient.get<{
    users?: Array<{
      id?: string;
      displayName?: string;
      initials?: string;
      role?: string;
      firstName?: string;
      lastName?: string;
    }>;
    setupRequired?: boolean;
    reason?: string;
  }>(
    '/auth/quick-access/profiles-with-context'
  );

  const users = (data.users ?? [])
    .filter((user): user is NonNullable<typeof user> & { id: string } => typeof user?.id === 'string' && user.id.length > 0)
    .map((user) => {
      const firstName = typeof user.firstName === 'string' ? user.firstName.trim() : '';
      const lastName = typeof user.lastName === 'string' ? user.lastName.trim() : '';
      const fallbackDisplayName = `${firstName} ${lastName}`.trim() || 'User';
      const displayName = typeof user.displayName === 'string' && user.displayName.trim().length > 0
        ? user.displayName.trim()
        : fallbackDisplayName;
      const fallbackInitials = `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase() || 'U';
      const initials = typeof user.initials === 'string' && user.initials.trim().length > 0
        ? user.initials.trim().toUpperCase()
        : fallbackInitials;

      return {
        id: user.id,
        displayName,
        initials,
        role: typeof user.role === 'string' && user.role.trim().length > 0 ? user.role.trim() : undefined,
      };
    });

  return {
    users,
    setupRequired: data.setupRequired === true,
    reason: data.reason,
  };
}

/**
 * Login with Quick Access: select user + PIN
 * POST /auth/quick-access/login
 */
export async function loginWithQuickAccess(userId: string, pin: string): Promise<AuthTokenResponse> {
  const input: QuickAccessLoginDto = { userId, pin };
  const { data } = await apiClient.post<AuthTokenResponse>('/auth/quick-access/login', input);
  return data;
}

/**
 * Refresh access token using refresh token
 * POST /auth/refresh
 */
export async function refresh(refreshToken: string): Promise<AuthTokenResponse> {
  const input: RefreshTokenDto = { refreshToken };
  const { data } = await apiClient.post<AuthTokenResponse>('/auth/refresh', input);
  return data;
}

/**
 * Logout: invalidate refresh token (optional on mobile)
 * POST /auth/logout
 */
export async function logout(refreshToken?: string): Promise<void> {
  const input: LogoutDto = { refreshToken };
  await apiClient.post('/auth/logout', input);
}

/**
 * Logout all active sessions for current user.
 * Tries canonical endpoint first and falls back to legacy naming if needed.
 */
export async function logoutAllDevices(): Promise<void> {
  try {
    await apiClient.post('/auth/logout-all');
  } catch {
    await apiClient.post('/auth/logout-all-devices');
  }
}

/**
 * Change password for current authenticated user
 * POST /auth/change-password
 */
export async function changePassword(input: ChangePasswordAuthDto): Promise<void> {
  await apiClient.post('/auth/change-password', input);
}

/**
 * Get current authenticated user profile
 * GET /auth/me
 */
export async function getCurrentUser(): Promise<UserProfileDto> {
  const { data } = await apiClient.get<UserProfileDto>('/auth/me');
  return data;
}
