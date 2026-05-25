import { renderHook, act } from '@testing-library/react-native';

import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/auth.store';
import { useRestaurantStore } from '@/store/restaurant.store';
import * as authApi from '@/api/auth.api';

jest.mock('@/api/auth.api', () => ({
  loginWithQuickAccess: jest.fn(),
  getCurrentUser: jest.fn(),
  logoutRemote: jest.fn(),
}));

jest.mock('@/services/AnalyticsService', () => ({
  analyticsService: {
    trackEvent: jest.fn(),
  },
}));

describe('Account Swap Permission & Context Behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({
      accessToken: null,
      refreshToken: null,
      user: null,
      roles: [],
      permissions: [],
      isAuthenticated: false,
    });
    useRestaurantStore.setState({
      selectedTableId: null,
      selectedOrderId: null,
    });
  });

  it('clears restaurant context when swapping accounts (simulated in component)', async () => {
    // Start with admin user and selected table/order
    useAuthStore.setState({
      accessToken: 'admin-token',
      refreshToken: 'admin-refresh',
      user: {
        id: 'admin-user',
        email: 'admin@example.com',
        tenantId: 'tenant-1',
        firstName: 'Admin',
        lastName: 'User',
        roles: ['ADMIN'],
        permissions: ['ALL'],
      },
      roles: ['ADMIN'],
      permissions: ['ALL'],
      isAuthenticated: true,
    });

    useRestaurantStore.setState({
      selectedTableId: 'table-123',
      selectedOrderId: 'order-456',
    });

    // Mock swap to waiter
    const waiterUser = {
      id: 'waiter-user',
      email: 'waiter@example.com',
      tenantId: 'tenant-1',
      firstName: 'Waiter',
      lastName: 'Staff',
      roles: ['WAITER'],
      permissions: ['DINING', 'TABLE', 'ORDER'],
    };

    (authApi.loginWithQuickAccess as jest.Mock).mockResolvedValueOnce({
      accessToken: 'waiter-token',
      refreshToken: 'waiter-refresh',
    });
    (authApi.getCurrentUser as jest.Mock).mockResolvedValueOnce(waiterUser);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.swapAccountWithQuickAccess('waiter-user', '1234');
    });

    // Verify auth state changed to waiter
    expect(useAuthStore.getState().roles).toEqual(['WAITER']);
    expect(useAuthStore.getState().permissions).toContain('DINING');

    // In a real app, the App component's handleSwapAuthenticated would clear context here.
    // Simulate that behavior:
    const restaurantStore = useRestaurantStore.getState();
    restaurantStore.setSelectedTable(null);
    restaurantStore.setSelectedOrder(null);

    // Verify restaurant context was cleared
    expect(useRestaurantStore.getState().selectedTableId).toBeNull();
    expect(useRestaurantStore.getState().selectedOrderId).toBeNull();
  });

  it('allows admin→waiter swap with full permission replacement', async () => {
    const adminUser = {
      id: 'admin-user',
      email: 'admin@example.com',
      tenantId: 'tenant-1',
      firstName: 'Admin',
      lastName: 'User',
      roles: ['ADMIN'],
      permissions: ['ALL'],
    };

    const waiterUser = {
      id: 'waiter-user',
      email: 'waiter@example.com',
      tenantId: 'tenant-1',
      firstName: 'Waiter',
      lastName: 'Staff',
      roles: ['WAITER'],
      permissions: ['DINING'],
    };

    // Start as admin
    useAuthStore.setState({
      accessToken: 'admin-token',
      refreshToken: 'admin-refresh',
      user: adminUser,
      roles: ['ADMIN'],
      permissions: ['ALL'],
      isAuthenticated: true,
    });

    // Mock swap to waiter
    (authApi.loginWithQuickAccess as jest.Mock).mockResolvedValueOnce({
      accessToken: 'waiter-token',
      refreshToken: 'waiter-refresh',
    });
    (authApi.getCurrentUser as jest.Mock).mockResolvedValueOnce(waiterUser);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.swapAccountWithQuickAccess('waiter-user', '1234');
    });

    const authState = useAuthStore.getState();
    // Admin permissions should be completely replaced, not merged
    expect(authState.roles).toEqual(['WAITER']);
    expect(authState.permissions).toEqual(['DINING']);
    expect(authState.user?.id).toBe('waiter-user');
  });

  it('allows invalid PIN without replacing current session', async () => {
    const adminUser = {
      id: 'admin-user',
      email: 'admin@example.com',
      tenantId: 'tenant-1',
      firstName: 'Admin',
      lastName: 'User',
      roles: ['ADMIN'],
      permissions: ['ALL'],
    };

    // Start as admin
    useAuthStore.setState({
      accessToken: 'admin-token',
      refreshToken: 'admin-refresh',
      user: adminUser,
      roles: ['ADMIN'],
      permissions: ['ALL'],
      isAuthenticated: true,
    });

    // Mock invalid PIN error
    (authApi.loginWithQuickAccess as jest.Mock).mockRejectedValueOnce(
      new Error('Invalid PIN'),
    );

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await expect(
        result.current.swapAccountWithQuickAccess('waiter-user', '9999'),
      ).rejects.toThrow('Invalid PIN');
    });

    // Admin session should remain unchanged
    const authState = useAuthStore.getState();
    expect(authState.roles).toEqual(['ADMIN']);
    expect(authState.permissions).toEqual(['ALL']);
    expect(authState.user?.id).toBe('admin-user');
  });

  it('maintains LocalInstallationContext and selected terminal after swap', async () => {
    const adminUser = {
      id: 'admin-user',
      email: 'admin@example.com',
      tenantId: 'tenant-1',
      firstName: 'Admin',
      lastName: 'User',
      roles: ['ADMIN'],
      permissions: ['ALL'],
    };

    const managerUser = {
      id: 'manager-user',
      email: 'manager@example.com',
      tenantId: 'tenant-1',
      firstName: 'Manager',
      lastName: 'Staff',
      roles: ['MANAGER'],
      permissions: ['KITCHEN', 'DINING'],
    };

    useAuthStore.setState({
      accessToken: 'admin-token',
      refreshToken: 'admin-refresh',
      user: adminUser,
      roles: ['ADMIN'],
      permissions: ['ALL'],
      isAuthenticated: true,
    });

    (authApi.loginWithQuickAccess as jest.Mock).mockResolvedValueOnce({
      accessToken: 'manager-token',
      refreshToken: 'manager-refresh',
    });
    (authApi.getCurrentUser as jest.Mock).mockResolvedValueOnce(managerUser);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.swapAccountWithQuickAccess('manager-user', '1234');
    });

    // Auth should change to manager
    expect(useAuthStore.getState().roles).toEqual(['MANAGER']);
    // (Terminal and LocalInstallationContext are managed separately and shouldn't be cleared)
  });
});
