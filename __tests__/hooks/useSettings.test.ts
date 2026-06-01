import { renderHook, act } from '@testing-library/react-native';

import { useSettings } from '@/hooks/useSettings';

const mockLogout = jest.fn(async () => undefined);
const mockClearContext = jest.fn(async () => undefined);
const mockLoadContext = jest.fn(async () => undefined);
const mockTrackEvent = jest.fn(async () => undefined);
const mockSyncClearQueue = jest.fn(async () => undefined);

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    logout: () => mockLogout(),
  }),
}));

jest.mock('@/hooks/useLocalContext', () => ({
  useLocalContext: () => ({
    clearContext: () => mockClearContext(),
    loadContext: () => mockLoadContext(),
  }),
}));

jest.mock('@/services/AnalyticsService', () => ({
  analyticsService: {
    trackEvent: () => mockTrackEvent(),
    shutdown: jest.fn(),
  },
}));

jest.mock('@/services/SyncService', () => ({
  syncService: {
    clearQueue: () => mockSyncClearQueue(),
  },
}));

jest.mock('@/api/auth.api', () => ({
  changePassword: jest.fn(async () => undefined),
  logoutAllDevices: jest.fn(async () => undefined),
}));

describe('useSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('factory reset clears sync queue, clears local context, and logs out', async () => {
    const { result } = renderHook(() => useSettings());

    await act(async () => {
      await result.current.factoryReset();
    });

    expect(mockSyncClearQueue).toHaveBeenCalledTimes(1);
    expect(mockClearContext).toHaveBeenCalledTimes(1);
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});
