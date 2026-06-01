import { useAuthStore } from '@/store/auth.store';

const mockClearTokens = jest.fn(async () => undefined);
const mockSyncClearQueue = jest.fn(async () => undefined);

jest.mock('@/utils/secure-storage', () => ({
  clearTokens: () => mockClearTokens(),
  setTokens: jest.fn(async () => undefined),
}));

jest.mock('@/services/SyncService', () => ({
  syncService: {
    clearQueue: () => mockSyncClearQueue(),
  },
}));

describe('auth store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({
      accessToken: null,
      refreshToken: null,
      user: null,
      roles: [],
      permissions: [],
      isAuthenticated: false,
      isRefreshing: false,
      authSessionVersion: 0,
    });
  });

  it('starts unauthenticated', () => {
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.accessToken).toBeNull();
  });

  it('logout clears auth state and sync queue', async () => {
    useAuthStore.setState({
      accessToken: 'token-a',
      refreshToken: 'refresh-a',
      user: {
        id: 'user-a',
        email: 'a@example.com',
        tenantId: 'tenant-1',
        roles: ['WAITER'],
        permissions: ['ORDER_VIEW'],
      },
      roles: ['WAITER'],
      permissions: ['ORDER_VIEW'],
      isAuthenticated: true,
      isRefreshing: false,
    });

    await useAuthStore.getState().logout();

    const next = useAuthStore.getState();
    expect(mockSyncClearQueue).toHaveBeenCalledTimes(1);
    expect(mockClearTokens).toHaveBeenCalledTimes(1);
    expect(next.accessToken).toBeNull();
    expect(next.refreshToken).toBeNull();
    expect(next.user).toBeNull();
    expect(next.roles).toEqual([]);
    expect(next.permissions).toEqual([]);
    expect(next.isAuthenticated).toBe(false);
  });
});
