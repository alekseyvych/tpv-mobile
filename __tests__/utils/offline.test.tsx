import { act, render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';

import { isOnlineNow, subscribeOnlineStatus, useOfflineDetection } from '@/utils/offline';

type NetInfoStateLike = {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
};

const mockFetch = jest.fn();
const mockAddEventListener = jest.fn();

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    fetch: (...args: unknown[]) => mockFetch(...args),
    addEventListener: (...args: unknown[]) => mockAddEventListener(...args),
  },
}));

function OfflineProbe({ onReady }: { onReady?: (state: ReturnType<typeof useOfflineDetection>) => void }) {
  const offline = useOfflineDetection();
  onReady?.(offline);
  return <Text testID="offline-state">{offline.isOnline ? 'online' : 'offline'}</Text>;
}

describe('offline utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockResolvedValue({ isConnected: true, isInternetReachable: true });
    mockAddEventListener.mockImplementation(() => () => undefined);
  });

  it('isOnlineNow returns connectivity status based on netinfo flags', async () => {
    mockFetch.mockResolvedValueOnce({ isConnected: true, isInternetReachable: true });
    await expect(isOnlineNow()).resolves.toBe(true);

    mockFetch.mockResolvedValueOnce({ isConnected: true, isInternetReachable: false });
    await expect(isOnlineNow()).resolves.toBe(false);

    mockFetch.mockResolvedValueOnce({ isConnected: false, isInternetReachable: true });
    await expect(isOnlineNow()).resolves.toBe(false);
  });

  it('subscribeOnlineStatus maps netinfo state to online boolean', () => {
    let listener: ((state: NetInfoStateLike) => void) | undefined;
    const unsubscribe = jest.fn();
    const onChange = jest.fn();

    mockAddEventListener.mockImplementation((cb: (state: NetInfoStateLike) => void) => {
      listener = cb;
      return unsubscribe;
    });

    const stop = subscribeOnlineStatus(onChange);

    listener?.({ isConnected: true, isInternetReachable: true });
    listener?.({ isConnected: true, isInternetReachable: false });

    expect(onChange).toHaveBeenNthCalledWith(
      1,
      true,
      expect.objectContaining({ isConnected: true, isInternetReachable: true }),
    );
    expect(onChange).toHaveBeenNthCalledWith(
      2,
      false,
      expect.objectContaining({ isConnected: true, isInternetReachable: false }),
    );

    stop();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('useOfflineDetection reflects initial and event-driven online state', async () => {
    let listener: ((state: NetInfoStateLike) => void) | undefined;
    const unsubscribe = jest.fn();
    let captured: ReturnType<typeof useOfflineDetection> | null = null;

    mockFetch.mockResolvedValue({ isConnected: false, isInternetReachable: false });
    mockAddEventListener.mockImplementation((cb: (state: NetInfoStateLike) => void) => {
      listener = cb;
      return unsubscribe;
    });

    const view = render(<OfflineProbe onReady={(state) => {
      captured = state;
    }} />);

    await waitFor(() => {
      expect(view.getByTestId('offline-state').props.children).toBe('offline');
    });

    const onOnline = jest.fn();
    const onOffline = jest.fn();

    act(() => {
      captured?.onOffline(onOffline);
      captured?.onOnline(onOnline);
    });

    expect(onOffline).toHaveBeenCalledTimes(1);
    expect(onOnline).not.toHaveBeenCalled();

    act(() => {
      listener?.({ isConnected: true, isInternetReachable: true });
    });

    await waitFor(() => {
      expect(view.getByTestId('offline-state').props.children).toBe('online');
    });

    act(() => {
      captured?.onOnline(onOnline);
    });
    expect(onOnline).toHaveBeenCalledTimes(1);

    view.unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
