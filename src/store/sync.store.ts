import { create } from 'zustand';

import type { QueuedSyncOperation } from '@/types/sync';

type SyncState = {
  queue: QueuedSyncOperation[];
  isSyncing: boolean;
  isOnline: boolean;
  failedCount: number;
  lastSyncAt: string | null;
  setQueue: (queue: QueuedSyncOperation[]) => void;
  setSyncing: (syncing: boolean) => void;
  setOnline: (online: boolean) => void;
  setLastSyncAt: (isoDate: string | null) => void;
};

export const useSyncStore = create<SyncState>((set) => ({
  queue: [],
  isSyncing: false,
  isOnline: true,
  failedCount: 0,
  lastSyncAt: null,
  setQueue(queue) {
    set({
      queue,
      failedCount: queue.filter((item) => item.status === 'failed').length,
    });
  },
  setSyncing(isSyncing) {
    set({ isSyncing });
  },
  setOnline(isOnline) {
    set({ isOnline });
  },
  setLastSyncAt(lastSyncAt) {
    set({ lastSyncAt });
  },
}));
