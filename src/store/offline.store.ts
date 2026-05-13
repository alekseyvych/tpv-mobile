import { create } from 'zustand';

import { getOfflineMutationQueue, setOfflineMutationQueue } from '@/utils/storage';

type QueuedMutation = {
  id: string;
  endpoint: string;
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  payload: Record<string, unknown>;
  createdAt: number;
};

type OfflineState = {
  online: boolean;
  queue: QueuedMutation[];
  setOnline: (online: boolean) => void;
  enqueueMutation: (mutation: Omit<QueuedMutation, 'id' | 'createdAt'>) => Promise<void>;
  dequeueMutation: (id: string) => Promise<void>;
  loadQueue: () => Promise<void>;
  clearQueue: () => Promise<void>;
};

function nextId() {
  return `offline-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export const useOfflineStore = create<OfflineState>((set, get) => ({
  online: true,
  queue: [],
  setOnline(online) {
    set({ online });
  },
  async enqueueMutation(mutation) {
    const queued: QueuedMutation = {
      ...mutation,
      id: nextId(),
      createdAt: Date.now(),
    };
    const next = [...get().queue, queued];
    set({ queue: next });
    await setOfflineMutationQueue(next);
  },
  async dequeueMutation(id) {
    const next = get().queue.filter((item) => item.id !== id);
    set({ queue: next });
    await setOfflineMutationQueue(next);
  },
  async loadQueue() {
    const raw = await getOfflineMutationQueue<QueuedMutation[]>();
    if (Array.isArray(raw)) {
      set({ queue: raw });
      return;
    }
    set({ queue: [] });
  },
  async clearQueue() {
    set({ queue: [] });
    await setOfflineMutationQueue([]);
  },
}));
