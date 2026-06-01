import { useEffect } from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { act } from 'react-test-renderer';
import React from 'react';

import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/auth.store';
import { useContextStore } from '@/store/context.store';
import { useTerminalStore } from '@/store/terminal.store';
import {
  getCurrentUser,
  loginWithQuickAccess,
  logout as logoutRemote,
} from '@/api/auth.api';

const mockSyncClearQueue = jest.fn(async () => undefined);

jest.mock('@/api/auth.api', () => ({
  getCurrentUser: jest.fn(),
  getQuickAccessProfilesWithContext: jest.fn(),
  login: jest.fn(),
  loginWithPin: jest.fn(),
  loginWithQuickAccess: jest.fn(),
  logout: jest.fn(),
}));

jest.mock('@/services/AnalyticsService', () => ({
  analyticsService: {
    trackEvent: jest.fn(async () => undefined),
  },
}));

jest.mock('@/services/SyncService', () => ({
  syncService: {
    clearQueue: () => mockSyncClearQueue(),
  },
}));

describe('useAuth swap account', () => {
  let swapAccountWithQuickAccessFn: ((userId: string, pin: string) => Promise<unknown>) | null = null;

  function HookHarness() {
    const { swapAccountWithQuickAccess } = useAuth();

    useEffect(() => {
      swapAccountWithQuickAccessFn = swapAccountWithQuickAccess;
    }, [swapAccountWithQuickAccess]);

    return null;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    mockSyncClearQueue.mockClear();
    useAuthStore.setState({
      accessToken: 'old-access',
      refreshToken: 'old-refresh',
      user: {
        id: 'old-user',
        email: 'old@example.com',
        tenantId: 'tenant-1',
        roles: ['WAITER'],
        permissions: ['ORDER_VIEW'],
      },
      roles: ['WAITER'],
      permissions: ['ORDER_VIEW'],
      isAuthenticated: true,
      isRefreshing: false,
      authSessionVersion: 1,
    });

    useContextStore.setState({
      localContext: {
        installationId: 'inst-1',
        tenantId: 'tenant-1',
        deviceType: 'tablet',
        deviceName: 'POS-1',
      },
      setupRequired: false,
      isCheckingContext: false,
    });

    useTerminalStore.setState({
      selectedTerminalId: 'terminal-1',
      operatingMode: 'RESTAURANT',
      capabilities: { enableDiningFloorAndTables: true },
      activeCashShiftId: 'shift-1',
    });

    swapAccountWithQuickAccessFn = null;
    render(React.createElement(HookHarness));
  });

  it('replaces current auth session and revokes previous refresh token on successful swap', async () => {
    (loginWithQuickAccess as jest.Mock).mockResolvedValue({
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
    });
    (getCurrentUser as jest.Mock).mockResolvedValue({
      id: 'new-user',
      email: 'new@example.com',
      tenantId: 'tenant-1',
      roles: ['ADMIN'],
      permissions: ['ORDER_VIEW', 'ORDER_REMOVE'],
    });
    (logoutRemote as jest.Mock).mockResolvedValue(undefined);

    await waitFor(() => {
      expect(swapAccountWithQuickAccessFn).toBeTruthy();
    });
    await act(async () => {
      await swapAccountWithQuickAccessFn?.('new-user', '1234');
    });

    const state = useAuthStore.getState();
    expect(state.accessToken).toBe('new-access');
    expect(state.refreshToken).toBe('new-refresh');
    expect(state.user?.id).toBe('new-user');
    expect(state.roles).toEqual(['ADMIN']);
    expect(state.permissions).toEqual(['ORDER_VIEW', 'ORDER_REMOVE']);
    expect(logoutRemote).toHaveBeenCalledWith('old-refresh');
    expect(mockSyncClearQueue).toHaveBeenCalledTimes(1);

    const contextState = useContextStore.getState();
    const terminalState = useTerminalStore.getState();

    expect(contextState.localContext?.installationId).toBe('inst-1');
    expect(contextState.localContext?.tenantId).toBe('tenant-1');
    expect(terminalState.selectedTerminalId).toBe('terminal-1');
    expect(terminalState.operatingMode).toBe('RESTAURANT');
    expect(terminalState.capabilities).toEqual({ enableDiningFloorAndTables: true });
  });

  it('keeps current session unchanged when PIN authentication fails', async () => {
    (loginWithQuickAccess as jest.Mock).mockRejectedValue(new Error('invalid_pin'));

    await waitFor(() => {
      expect(swapAccountWithQuickAccessFn).toBeTruthy();
    });
    let swapError: unknown;
    await act(async () => {
      try {
        await swapAccountWithQuickAccessFn?.('new-user', '0000');
      } catch (error) {
        swapError = error;
      }
    });
    expect(swapError).toBeTruthy();

    const state = useAuthStore.getState();
    expect(state.accessToken).toBe('old-access');
    expect(state.refreshToken).toBe('old-refresh');
    expect(state.user?.id).toBe('old-user');
    expect(logoutRemote).not.toHaveBeenCalled();
    expect(mockSyncClearQueue).not.toHaveBeenCalled();
  });

  it('does not clear sync queue when swap resolves to the same user identity', async () => {
    (loginWithQuickAccess as jest.Mock).mockResolvedValue({
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
    });
    (getCurrentUser as jest.Mock).mockResolvedValue({
      id: 'old-user',
      email: 'old@example.com',
      tenantId: 'tenant-1',
      roles: ['WAITER'],
      permissions: ['ORDER_VIEW'],
    });

    await waitFor(() => {
      expect(swapAccountWithQuickAccessFn).toBeTruthy();
    });
    await act(async () => {
      await swapAccountWithQuickAccessFn?.('old-user', '1234');
    });

    expect(mockSyncClearQueue).not.toHaveBeenCalled();
  });
});
