import { act, render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';

import { useSync } from '@/hooks/useSync';
import { useSyncStore } from '@/store/sync.store';

const mockTrackEvent = jest.fn();
const mockLoadQueue = jest.fn();
const mockSyncQueue = jest.fn();
const mockGetQueue = jest.fn();
const mockClearQueue = jest.fn();
const mockIsOnlineNow = jest.fn();
const mockSubscribeOnlineStatus = jest.fn();

jest.mock('@/services/AnalyticsService', () => ({
  analyticsService: {
    trackEvent: (...args: unknown[]) => mockTrackEvent(...args),
  },
}));

jest.mock('@/services/SyncService', () => ({
  syncService: {
    loadQueue: (...args: unknown[]) => mockLoadQueue(...args),
    syncQueue: (...args: unknown[]) => mockSyncQueue(...args),
    getQueue: (...args: unknown[]) => mockGetQueue(...args),
    clearQueue: (...args: unknown[]) => mockClearQueue(...args),
  },
}));

jest.mock('@/utils/offline', () => ({
  isOnlineNow: (...args: unknown[]) => mockIsOnlineNow(...args),
  subscribeOnlineStatus: (...args: unknown[]) => mockSubscribeOnlineStatus(...args),
}));

function UseSyncProbe({ onReady }: { onReady?: (value: ReturnType<typeof useSync>) => void }) {
  const sync = useSync();
  if (onReady) {
    onReady(sync);
  }

  return <Text testID="use-sync-probe">{String(sync.queuedCount)}</Text>;
}

describe('useSync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSyncStore.setState({
      queue: [],
      isSyncing: false,
      isOnline: true,
      failedCount: 0,
      lastSyncAt: null,
    });

    mockLoadQueue.mockResolvedValue([]);
    mockSyncQueue.mockResolvedValue({ total: 0, processed: 0, success: 0, failed: 0 });
    mockGetQueue.mockReturnValue([]);
    mockClearQueue.mockResolvedValue(undefined);
    mockIsOnlineNow.mockResolvedValue(true);
    mockSubscribeOnlineStatus.mockImplementation(() => () => undefined);
  });

  it('initializes queue, syncs when online, and tracks flush event', async () => {
    const queuedItem = {
      id: 'q1',
      url: '/orders',
      method: 'POST' as const,
      status: 'queued' as const,
      retryCount: 0,
      nextRetryAt: 1,
      createdAt: 1,
      updatedAt: 1,
    };

    mockLoadQueue.mockResolvedValue([queuedItem]);
    mockIsOnlineNow.mockResolvedValue(true);
    mockSyncQueue.mockResolvedValue({ total: 1, processed: 1, success: 1, failed: 0 });
    mockGetQueue.mockReturnValue([]);

    render(<UseSyncProbe />);

    await waitFor(() => {
      expect(mockSyncQueue).toHaveBeenCalledTimes(1);
      expect(mockTrackEvent).toHaveBeenCalledWith('sync.queue.flushed', {
        total: 1,
        success: 1,
        failed: 0,
      });
    });

    expect(useSyncStore.getState().isOnline).toBe(true);
    expect(useSyncStore.getState().queue).toEqual([]);
    expect(useSyncStore.getState().isSyncing).toBe(false);
    expect(useSyncStore.getState().lastSyncAt).not.toBeNull();
  });

  it('subscribes to online changes, triggers sync on reconnect, and unsubscribes on unmount', async () => {
    let onlineListener: ((online: boolean) => void) | null = null;
    const unsubscribe = jest.fn();

    mockSubscribeOnlineStatus.mockImplementation((listener: (online: boolean) => void) => {
      onlineListener = listener;
      return unsubscribe;
    });

    const view = render(<UseSyncProbe />);

    await waitFor(() => {
      expect(mockSubscribeOnlineStatus).toHaveBeenCalledTimes(1);
    });

    expect(onlineListener).not.toBeNull();

    act(() => {
      onlineListener?.(true);
    });

    await waitFor(() => {
      expect(mockSyncQueue).toHaveBeenCalledTimes(1);
    });

    view.unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('clearQueue calls service and resets store queue', async () => {
    const queuedItem = {
      id: 'q1',
      url: '/orders',
      method: 'POST' as const,
      status: 'queued' as const,
      retryCount: 0,
      nextRetryAt: 1,
      createdAt: 1,
      updatedAt: 1,
    };
    let captured: ReturnType<typeof useSync> | null = null;

    mockLoadQueue.mockResolvedValue([queuedItem]);
    mockIsOnlineNow.mockResolvedValue(false);

    render(<UseSyncProbe onReady={(value) => {
      captured = value;
    }} />);

    await waitFor(() => {
      expect(useSyncStore.getState().queue).toHaveLength(1);
    });

    await act(async () => {
      await captured?.clearQueue();
    });

    expect(mockClearQueue).toHaveBeenCalledTimes(1);
    expect(useSyncStore.getState().queue).toEqual([]);
  });
});
