import { useSyncStore } from '@/store/sync.store';

describe('sync.store', () => {
  beforeEach(() => {
    useSyncStore.setState({
      queue: [],
      isSyncing: false,
      isOnline: true,
      failedCount: 0,
      lastSyncAt: null,
    });
  });

  it('tracks failed queue items when queue changes', () => {
    useSyncStore.getState().setQueue([
      {
        id: 'a',
        url: '/orders',
        method: 'POST',
        status: 'queued',
        retryCount: 0,
        nextRetryAt: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'b',
        url: '/orders/1',
        method: 'PATCH',
        status: 'failed',
        retryCount: 2,
        nextRetryAt: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastError: 'offline',
      },
    ]);

    expect(useSyncStore.getState().queue).toHaveLength(2);
    expect(useSyncStore.getState().failedCount).toBe(1);
  });

  it('updates online and syncing flags', () => {
    useSyncStore.getState().setOnline(false);
    useSyncStore.getState().setSyncing(true);

    expect(useSyncStore.getState().isOnline).toBe(false);
    expect(useSyncStore.getState().isSyncing).toBe(true);
  });
});
