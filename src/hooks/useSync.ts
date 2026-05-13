import { useCallback, useEffect } from 'react';

import { analyticsService } from '@/services/AnalyticsService';
import { useSyncStore } from '@/store/sync.store';
import { syncService } from '@/services/SyncService';
import { isOnlineNow, subscribeOnlineStatus } from '@/utils/offline';

export function useSync() {
  const queue = useSyncStore((s) => s.queue);
  const isSyncing = useSyncStore((s) => s.isSyncing);
  const isOnline = useSyncStore((s) => s.isOnline);
  const lastSyncAt = useSyncStore((s) => s.lastSyncAt);
  const failedCount = useSyncStore((s) => s.failedCount);
  const setQueue = useSyncStore((s) => s.setQueue);
  const setSyncing = useSyncStore((s) => s.setSyncing);
  const setOnline = useSyncStore((s) => s.setOnline);
  const setLastSyncAt = useSyncStore((s) => s.setLastSyncAt);

  const syncNow = useCallback(async () => {
    setSyncing(true);
    try {
      const progress = await syncService.syncQueue();
      setQueue(syncService.getQueue());
      setLastSyncAt(new Date().toISOString());
      if (progress.total > 0) {
        await analyticsService.trackEvent('sync.queue.flushed', {
          total: progress.total,
          success: progress.success,
          failed: progress.failed,
        });
      }
    } finally {
      setSyncing(false);
    }
  }, [setLastSyncAt, setQueue, setSyncing]);

  const clearQueue = useCallback(async () => {
    await syncService.clearQueue();
    setQueue([]);
  }, [setQueue]);

  useEffect(() => {
    let mounted = true;

    async function init() {
      const [loadedQueue, online] = await Promise.all([syncService.loadQueue(), isOnlineNow()]);
      if (!mounted) return;
      setQueue(loadedQueue);
      setOnline(online);
      if (online && loadedQueue.length > 0) {
        await syncNow();
      }
    }

    void init();

    const unsubscribe = subscribeOnlineStatus((online) => {
      setOnline(online);
      if (online) {
        void syncNow();
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [setOnline, setQueue, syncNow]);

  return {
    queuedItems: queue,
    queuedCount: queue.length,
    isOnline,
    isSyncing,
    failedCount,
    lastSyncAt,
    syncNow,
    clearQueue,
  };
}
