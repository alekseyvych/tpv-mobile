/**
 * Tests for usePermissionSync hook.
 *
 * Verifies:
 * - getCurrentUser() is called when app comes to foreground while authenticated
 * - setUser() is called with the returned user
 * - Does NOT call getCurrentUser() when not authenticated
 * - Throttles: second foreground event within 5 minutes is skipped
 */
import { act, renderHook } from '@testing-library/react-native';
import { AppState } from 'react-native';
import type { AppStateStatus } from 'react-native';

const mockGetCurrentUser = jest.fn();
const mockSetUser = jest.fn();

let mockIsAuthenticated = true;

jest.mock('@/api/auth.api', () => ({
  getCurrentUser: (...args: unknown[]) => mockGetCurrentUser(...args),
}));

jest.mock('@/store/auth.store', () => ({
  useAuthStore: (selector: (s: { isAuthenticated: boolean; setUser: jest.Mock }) => unknown) =>
    selector({ isAuthenticated: mockIsAuthenticated, setUser: mockSetUser }),
}));

// Capture AppState listeners via spyOn so we do not break the react-native module.
type AppStateListener = (state: AppStateStatus) => void;
const appStateListeners: AppStateListener[] = [];

beforeAll(() => {
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, cb) => {
    appStateListeners.push(cb as AppStateListener);
    return { remove: jest.fn() };
  });
});

afterAll(() => {
  jest.restoreAllMocks();
});

import { usePermissionSync } from '@/hooks/usePermissionSync';

function fireForeground() {
  act(() => {
    appStateListeners.forEach((cb) => cb('active'));
  });
}

describe('usePermissionSync', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockIsAuthenticated = true;
    mockGetCurrentUser.mockReset();
    mockGetCurrentUser.mockResolvedValue({ id: 'u1', roles: ['CASHIER'] });
    mockSetUser.mockReset();
    appStateListeners.length = 0;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('calls getCurrentUser and setUser on foreground when authenticated', async () => {
    renderHook(() => usePermissionSync());
    fireForeground();
    await act(async () => { await Promise.resolve(); });
    expect(mockGetCurrentUser).toHaveBeenCalledTimes(1);
    expect(mockSetUser).toHaveBeenCalledWith({ id: 'u1', roles: ['CASHIER'] });
  });

  it('does not call getCurrentUser when not authenticated', async () => {
    mockIsAuthenticated = false;
    renderHook(() => usePermissionSync());
    fireForeground();
    await act(async () => { await Promise.resolve(); });
    expect(mockGetCurrentUser).not.toHaveBeenCalled();
  });

  it('throttles: skips second foreground event within 5 minutes', async () => {
    renderHook(() => usePermissionSync());

    fireForeground();
    await act(async () => { await Promise.resolve(); });
    expect(mockGetCurrentUser).toHaveBeenCalledTimes(1);

    // Second foreground within the 5-minute window.
    fireForeground();
    await act(async () => { await Promise.resolve(); });
    expect(mockGetCurrentUser).toHaveBeenCalledTimes(1); // still 1
  });

  it('fires again after throttle window elapses', async () => {
    renderHook(() => usePermissionSync());

    fireForeground();
    await act(async () => { await Promise.resolve(); });
    expect(mockGetCurrentUser).toHaveBeenCalledTimes(1);

    // Advance time past the 5-minute throttle.
    act(() => { jest.advanceTimersByTime(5 * 60 * 1000 + 1); });

    fireForeground();
    await act(async () => { await Promise.resolve(); });
    expect(mockGetCurrentUser).toHaveBeenCalledTimes(2);
  });

  it('swallows errors silently', async () => {
    mockGetCurrentUser.mockRejectedValue(new Error('network error'));
    renderHook(() => usePermissionSync());

    await expect(async () => {
      fireForeground();
      await act(async () => { await Promise.resolve(); });
    }).not.toThrow();

    expect(mockSetUser).not.toHaveBeenCalled();
  });
});

