import { act, renderHook } from '@testing-library/react-native';

import { getLocalInstallationContext } from '@/api/context.api';
import { useLocalContext } from '@/hooks/useLocalContext';
import { useContextStore } from '@/store/context.store';
import { clearLocalContext, getLocalContext, setLocalContext } from '@/utils/storage';

jest.mock('@/api/context.api', () => ({
  getLocalInstallationContext: jest.fn(),
}));

jest.mock('@/utils/storage', () => ({
  getLocalContext: jest.fn(),
  setLocalContext: jest.fn(),
  clearLocalContext: jest.fn(),
}));

const mockGetLocalInstallationContext = getLocalInstallationContext as jest.MockedFunction<
  typeof getLocalInstallationContext
>;
const mockGetLocalContext = getLocalContext as jest.MockedFunction<typeof getLocalContext>;
const mockSetLocalContext = setLocalContext as jest.MockedFunction<typeof setLocalContext>;
const mockClearLocalContext = clearLocalContext as jest.MockedFunction<typeof clearLocalContext>;

describe('useLocalContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    act(() => {
      useContextStore.setState({
        localContext: null,
        setupRequired: true,
        isCheckingContext: true,
      });
    });

    mockGetLocalContext.mockResolvedValue(null);
    mockSetLocalContext.mockResolvedValue(undefined);
    mockClearLocalContext.mockResolvedValue(undefined);
  });

  afterEach(() => {
    act(() => {
      useContextStore.setState({
        localContext: null,
        setupRequired: true,
        isCheckingContext: true,
      });
    });
  });

  it('uses backend deviceId when loading remote local context', async () => {
    mockGetLocalInstallationContext.mockResolvedValue({
      id: 'ctx-1',
      deviceId: 'device-remote-1',
      tenantId: 'tenant-1',
      locationId: 'location-1',
      terminalId: 'terminal-1',
      installationId: 'install-1',
      deviceName: 'Expo Tablet',
      deviceType: 'POS',
      configuredAt: '2026-05-31T10:00:00.000Z',
    });

    const { result } = renderHook(() => useLocalContext());

    let loaded;
    await act(async () => {
      loaded = await result.current.loadContext();
    });

    expect(loaded).toEqual(
      expect.objectContaining({
        id: 'ctx-1',
        deviceId: 'device-remote-1',
        tenantId: 'tenant-1',
        installationId: 'install-1',
      }),
    );
    expect(mockSetLocalContext).toHaveBeenCalledWith(
      expect.objectContaining({ deviceId: 'device-remote-1' }),
    );
    expect(useContextStore.getState().localContext).toEqual(
      expect.objectContaining({ deviceId: 'device-remote-1' }),
    );
    expect(useContextStore.getState().setupRequired).toBe(false);
  });

  it('falls back to the existing deviceId when backend context omits it', async () => {
    act(() => {
      useContextStore.setState({
        localContext: {
          deviceId: 'device-stored-1',
          tenantId: 'tenant-1',
          installationId: 'install-1',
          deviceType: 'POS',
        },
        setupRequired: false,
        isCheckingContext: false,
      });
    });

    mockGetLocalInstallationContext.mockResolvedValue({
      id: 'ctx-1',
      tenantId: 'tenant-1',
      locationId: 'location-1',
      terminalId: 'terminal-1',
      installationId: 'install-1',
      deviceName: 'Expo Tablet',
      deviceType: 'POS',
      configuredAt: '2026-05-31T10:00:00.000Z',
    });
    mockGetLocalContext.mockResolvedValue(null);

    const { result } = renderHook(() => useLocalContext());

    let loaded;
    await act(async () => {
      loaded = await result.current.loadContext();
    });

    expect(loaded).toEqual(
      expect.objectContaining({
        deviceId: 'device-stored-1',
        tenantId: 'tenant-1',
      }),
    );
    expect(useContextStore.getState().localContext).toEqual(
      expect.objectContaining({ deviceId: 'device-stored-1' }),
    );
  });
});